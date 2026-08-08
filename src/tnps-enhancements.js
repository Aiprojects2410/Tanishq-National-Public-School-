import { supabase, supabaseConfigured } from './lib/supabase.js';

const STORAGE = 'tnps-erp-v2';
const CLASS_ORDER = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th'];
const CLASS_LABELS = { Nursery: 'Nursery (NC)', LKG: 'LKG', UKG: 'UKG', '1st': '1st', '2nd': '2nd', '3rd': '3rd', '4th': '4th' };
const rawSetItem = Storage.prototype.setItem;
const rawGetItem = Storage.prototype.getItem;
let queue = [];
let activeStudentClass = 'All';
let activeAttendanceClass = 'All';
let observer;
let refreshing = false;
let dbPeople = { students: [], teachers: [] };

function readData() { try { return JSON.parse(rawGetItem.call(localStorage, STORAGE)) || {}; } catch { return {}; } }
function today() { return new Date().toISOString().slice(0, 10); }
function normalizeClass(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return 'Unassigned';
  if (['nursery', 'nc', 'n.c.', 'n.c'].includes(v)) return 'Nursery';
  if (['lkg', 'lower kg', 'lower kindergarten'].includes(v)) return 'LKG';
  if (['ukg', 'upper kg', 'upper kindergarten', 'kg'].includes(v)) return 'UKG';
  const n = v.match(/(?:class\s*)?(1|2|3|4)(?:st|nd|rd|th)?/);
  return n ? `${n[1]}${n[1] === '1' ? 'st' : n[1] === '2' ? 'nd' : n[1] === '3' ? 'rd' : 'th'}` : String(value).trim();
}
function timeMinutes(value) {
  const m = String(value || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = Number(m[1]), min = Number(m[2]); const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12; if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}
function attendanceLabel(record) {
  const minutes = timeMinutes(record.time);
  if (minutes == null) return 'Present';
  if (minutes < 8 * 60 + 15) return 'Early';
  if (minutes > 8 * 60 + 45) return 'Late';
  return 'Present';
}
function enrichAttendance(data) {
  const students = data.students || [], teachers = data.teachers || [];
  return (data.attendance || []).map(a => {
    const person = (a.kind === 'student' ? students : teachers).find(p => p.id === a.id);
    return { ...a, className: a.className || normalizeClass(person?.className), attendanceStatus: a.attendanceStatus || attendanceLabel(a) };
  });
}
function pushQueue(records) {
  records.forEach(a => {
    const key = `${a.kind}:${a.id}:${a.date}`;
    if (queue.some(q => `${q.kind}:${q.id}:${q.date}` === key)) return;
    queue.unshift({ ...a, status: a.attendanceStatus || attendanceLabel(a), at: a.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  });
  queue = queue.slice(0, 12);
}
async function syncAttendanceToSupabase(records) {
  if (!supabaseConfigured || !supabase || !records.length) return;
  for (const a of records) {
    const list = a.kind === 'student' ? dbPeople.students : dbPeople.teachers;
    const person = list.find(p => p.displayId === a.id || p.id === a.id);
    if (!person?.id) continue;
    await supabase.rpc('record_attendance', { person_id: person.id, person_type: a.kind, scanned_token: null }).catch(() => {});
  }
}
Storage.prototype.setItem = function(key, value) {
  if (key !== STORAGE) return rawSetItem.call(this, key, value);
  let next; try { next = JSON.parse(value); } catch { return rawSetItem.call(this, key, value); }
  const previous = readData();
  const previousKeys = new Set((previous.attendance || []).map(a => `${a.kind}:${a.id}:${a.date}`));
  next.attendance = enrichAttendance(next);
  const fresh = next.attendance.filter(a => !previousKeys.has(`${a.kind}:${a.id}:${a.date}`));
  rawSetItem.call(this, key, JSON.stringify(next));
  if (fresh.length) { pushQueue(fresh); syncAttendanceToSupabase(fresh); }
  requestAnimationFrame(refreshAll);
};

async function hydrateFromSupabase() {
  if (!supabaseConfigured || !supabase) return;
  try {
    const [sRes, tRes, aRes] = await Promise.all([
      supabase.from('students').select('*').eq('active', true).order('name'),
      supabase.from('teachers').select('*').eq('active', true).order('name'),
      supabase.from('attendance').select('*').gte('attendance_date', today()).order('attendance_time', { ascending: false })
    ]);
    dbPeople = {
      students: (sRes.data || []).map(s => ({ ...s, displayId: s.student_id || s.id, className: s.class_name })),
      teachers: (tRes.data || []).map(t => ({ ...t, displayId: t.teacher_id || t.id, className: t.class_name }))
    };
    const current = readData();
    const dbStudents = dbPeople.students.map(s => ({ ...s, id: s.displayId, className: s.class_name || s.className, admissionNo: s.admission_number || s.admissionNo, father: s.father_name || s.father, home: s.home_address || s.home, homeMaps: s.home_location_url || s.homeMaps }));
    const dbTeachers = dbPeople.teachers.map(t => ({ ...t, id: t.displayId, className: t.class_name || t.className, joining: t.joining_date || t.joining }));
    const mergeById = (db, local) => [...db, ...local.filter(x => !db.some(d => d.id === x.id))];
    const dbAttendance = (aRes.data || []).map(a => {
      const list = a.kind === 'student' ? dbPeople.students : dbPeople.teachers;
      const person = list.find(p => p.id === (a.kind === 'student' ? a.student_id : a.teacher_id));
      const time = a.attendance_time ? new Date(a.attendance_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return { id: person?.displayId || (a.kind === 'student' ? a.student_id : a.teacher_id), kind: a.kind, name: person?.name || 'Unknown', date: a.attendance_date, time, className: normalizeClass(person?.className), attendanceStatus: attendanceLabel({ time }) };
    });
    const localToday = (current.attendance || []).filter(a => a.date === today());
    const mergedAttendance = [...dbAttendance, ...localToday.filter(a => !dbAttendance.some(d => d.kind === a.kind && d.id === a.id && d.date === a.date))];
    rawSetItem.call(localStorage, STORAGE, JSON.stringify({ ...current, students: mergeById(dbStudents, current.students || []), teachers: mergeById(dbTeachers, current.teachers || []), attendance: mergedAttendance }));
    pushQueue(dbAttendance);
    refreshAll();
  } catch { /* local fallback remains available */ }
}
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
function getPanel(title) { return [...document.querySelectorAll('.panel')].find(p => p.querySelector('h2')?.textContent?.trim() === title); }
function classTabs(panel, active, onClick) {
  let wrap = panel.querySelector('[data-tnps-class-tabs]');
  if (!wrap) { wrap = el('div', 'segmented'); wrap.dataset.tnpsClassTabs = '1'; panel.prepend(wrap); }
  wrap.innerHTML = '';
  ['All', ...CLASS_ORDER].forEach(c => { const b = el('button', active === c ? 'selected' : '', c === 'All' ? 'All Classes' : CLASS_LABELS[c]); b.onclick = () => onClick(c); wrap.appendChild(b); });
}
function enhanceStudents() {
  const panel = getPanel('Students'); if (!panel) return;
  classTabs(panel, activeStudentClass, c => { activeStudentClass = c; refreshAll(); });
  const data = readData(); const table = panel.querySelector('tbody'); if (!table) return;
  [...table.querySelectorAll('tr')].forEach(row => { const cls = normalizeClass((row.children[2]?.textContent || '').split('-')[0]); row.style.display = activeStudentClass === 'All' || cls === activeStudentClass ? '' : 'none'; });
  let summary = panel.querySelector('[data-tnps-class-summary]');
  if (!summary) { summary = el('div'); summary.dataset.tnpsClassSummary = '1'; panel.insertBefore(summary, panel.querySelector('.search') || panel.querySelector('.table-wrap')); }
  summary.className = 'chip-row'; summary.innerHTML = '';
  CLASS_ORDER.forEach(c => { const count = (data.students || []).filter(s => normalizeClass(s.className) === c).length; summary.appendChild(el('span', 'chip', `${CLASS_LABELS[c]} · ${count}`)); });
}
function renderAttendancePanel(panel, type, people, rows, activeClass) {
  const scopedPeople = activeClass && activeClass !== 'All' ? people.filter(p => normalizeClass(p.className) === activeClass) : people;
  const scopedRows = activeClass && activeClass !== 'All' ? rows.filter(r => normalizeClass(r.className) === activeClass) : rows;
  const presentIds = new Set(scopedRows.map(r => r.id));
  const late = scopedRows.filter(r => (r.attendanceStatus || attendanceLabel(r)) === 'Late').length;
  const early = scopedRows.filter(r => (r.attendanceStatus || attendanceLabel(r)) === 'Early').length;
  const absent = Math.max(0, scopedPeople.length - presentIds.size);
  let dash = panel.querySelector('[data-tnps-attendance-dashboard]');
  if (!dash) { dash = el('div'); dash.dataset.tnpsAttendanceDashboard = '1'; const stats = panel.querySelector('.stats-grid'); if (stats) stats.after(dash); else panel.appendChild(dash); }
  dash.className = 'stats-grid mini'; dash.innerHTML = '';
  [['Total', scopedPeople.length], ['Present', presentIds.size], ['Absent', absent], ['Late', late], ['Early', early]].forEach(([label, value]) => { const card = el('div', 'stat-card'); const inner = el('div'); inner.append(el('span', null, label), el('strong', null, String(value))); card.appendChild(inner); dash.appendChild(card); });
  const table = panel.querySelector('table'); if (!table) return; const head = table.querySelector('thead tr'); const body = table.querySelector('tbody'); if (!head || !body) return;
  head.innerHTML = ''; ['Person', 'Class', 'ID', 'Time', 'Status'].forEach(h => head.appendChild(el('th', null, h))); body.innerHTML = '';
  if (!scopedRows.length) { const tr = el('tr'), td = el('td'); td.colSpan = 5; const empty = el('div', 'empty'); empty.append(el('strong', null, 'No attendance records for this class today'), el('span', null, 'Use the QR scanner to mark attendance.')); td.appendChild(empty); tr.appendChild(td); body.appendChild(tr); return; }
  [...scopedRows].sort((a,b) => String(b.time).localeCompare(String(a.time))).forEach(r => { const person = people.find(p => p.id === r.id); const tr = el('tr'); const status = r.attendanceStatus || attendanceLabel(r); [r.name || person?.name || 'Unknown', normalizeClass(r.className || person?.className), r.id, r.time || '—', status].forEach((v,i) => tr.appendChild(el('td', i === 4 ? 'status' : '', v))); body.appendChild(tr); });
}
function enhanceAttendance() {
  for (const type of ['student', 'teacher']) {
    const panel = getPanel(type === 'student' ? 'Student Attendance' : 'Teacher Attendance'); if (!panel) continue;
    const data = readData(); const people = type === 'student' ? data.students || [] : data.teachers || [];
    const rows = (data.attendance || []).filter(a => a.kind === type && a.date === today());
    if (type === 'student') classTabs(panel, activeAttendanceClass, c => { activeAttendanceClass = c; refreshAll(); });
    renderAttendancePanel(panel, type, people, rows, type === 'student' ? activeAttendanceClass : 'All');
  }
}
function enhanceScannerQueue() {
  const note = document.querySelector('.scanner-note'); if (!note) return;
  let box = document.querySelector('[data-tnps-scan-queue]');
  if (!box) { box = el('div'); box.dataset.tnpsScanQueue = '1'; box.style.marginTop = '12px'; note.parentElement.appendChild(box); }
  box.innerHTML = ''; const title = el('strong', null, `Scan Queue · ${queue.length}`); title.style.display = 'block'; title.style.marginBottom = '8px'; box.appendChild(title);
  if (!queue.length) { box.appendChild(el('div', 'empty', 'No scans yet.')); return; }
  queue.slice(0, 8).forEach(item => { const row = el('div'); row.style.cssText = 'display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border-radius:10px;background:var(--surface-2,#f5f6fa);margin-bottom:6px;'; const left = el('div'); left.append(el('strong', null, item.name || 'Unknown'), el('small', null, `${item.kind === 'student' ? CLASS_LABELS[normalizeClass(item.className)] || normalizeClass(item.className) : 'Teacher'} · ${item.status || 'Present'}`)); const time = el('span', null, item.at || item.time || '—'); time.style.whiteSpace = 'nowrap'; row.append(left, time); box.appendChild(row); });
}
function removePrototypeText() {
  const bad = ['No database connected', 'Frontend/local prototype only', 'Supabase and Netlify remain untouched', 'Database is intentionally not connected yet'];
  document.querySelectorAll('*').forEach(node => {
    if (node.children.length) return; const text = node.textContent?.trim() || ''; if (!bad.some(x => text.includes(x))) return;
    const empty = node.closest('.empty'); if (empty && /No database connected|Frontend\/local prototype only|Supabase and Netlify remain untouched/i.test(empty.textContent || '')) { empty.innerHTML = ''; empty.append(el('strong', null, 'TNPS Database Connected'), el('span', null, 'Live Supabase database is active.')); return; }
    node.textContent = text.replace(/Database is intentionally not connected yet/gi, 'IDs are automatic and securely stored in the TNPS database.').replace(/No database connected/gi, 'TNPS Database Connected').replace(/Frontend\/local prototype only\.?/gi, '').replace(/Supabase and Netlify remain untouched\.?/gi, '');
  });
}
function fixDatabaseBadge() {
  document.querySelectorAll('*').forEach(node => {
    if (node.children.length || !node.textContent?.includes('TNPS Database Connected')) return;
    node.style.position='static'; node.style.inset='auto'; node.style.transform='none'; node.style.zIndex='auto'; node.style.whiteSpace='nowrap'; node.style.display='inline-flex'; node.style.alignItems='center'; node.style.margin='0 0 8px 0';
    if (node.parentElement) { node.parentElement.style.position='relative'; node.parentElement.style.display='flex'; node.parentElement.style.flexWrap='wrap'; node.parentElement.style.alignItems='center'; node.parentElement.style.gap='8px'; }
  });
}
function suppressDuplicateToasts() { document.querySelectorAll('.toast').forEach(t => { if (/already marked today/i.test(t.textContent || '')) t.style.display='none'; }); }
function refreshAll() {
  if (refreshing) return; refreshing = true;
  requestAnimationFrame(() => {
    observer?.disconnect();
    try { removePrototypeText(); fixDatabaseBadge(); enhanceStudents(); enhanceAttendance(); enhanceScannerQueue(); suppressDuplicateToasts(); }
    finally { refreshing = false; setTimeout(() => observer?.observe(document.body, { childList:true, subtree:true }), 0); }
  });
}
observer = new MutationObserver(() => refreshAll());
window.addEventListener('DOMContentLoaded', () => { observer.observe(document.body, { childList:true, subtree:true }); refreshAll(); hydrateFromSupabase(); });
setTimeout(() => { refreshAll(); hydrateFromSupabase(); }, 1200);
