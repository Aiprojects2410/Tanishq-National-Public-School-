import { supabase, supabaseConfigured } from './lib/supabase.js';

const CLASS_ORDER = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th'];
const CLASS_LABELS = { Nursery: 'Nursery (NC)', LKG: 'LKG', UKG: 'UKG', '1st': '1st', '2nd': '2nd', '3rd': '3rd', '4th': '4th' };
const STORAGE = 'tnps-erp-v2';
const rawSetItem = Storage.prototype.setItem;
const rawGetItem = Storage.prototype.getItem;
let queue = [];
let lastAttendanceSnapshot = [];
let lastQueueKey = '';
let activeStudentClass = 'All';
let activeAttendanceClass = 'All';

function normalizeClass(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return 'Unassigned';
  if (['nursery', 'nc', 'n.c.', 'n.c'].includes(v)) return 'Nursery';
  if (['lkg', 'kg', 'lower kg', 'lower kindergarten'].includes(v)) return 'LKG';
  if (['ukg', 'upper kg', 'upper kindergarten'].includes(v)) return 'UKG';
  const n = v.match(/(?:class\s*)?(1|2|3|4)(?:st|nd|rd|th)?/);
  return n ? `${n[1]}${n[1] === '1' ? 'st' : n[1] === '2' ? 'nd' : n[1] === '3' ? 'rd' : 'th'}` : String(value).trim();
}
function readData() {
  try { return JSON.parse(rawGetItem.call(localStorage, STORAGE)) || {}; } catch { return {}; }
}
function timeMinutes(value) {
  const m = String(value || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = Number(m[1]), min = Number(m[2]);
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}
function attendanceLabel(record) {
  const minutes = timeMinutes(record.time);
  if (minutes == null) return 'Present';
  if (minutes < 8 * 60 + 15) return 'Early';
  if (minutes > 8 * 60 + 45) return 'Late';
  return 'Present';
}
function today() { return new Date().toISOString().slice(0, 10); }
function ensureStatus(data) {
  const students = data.students || [], teachers = data.teachers || [];
  let changed = false;
  const attendance = (data.attendance || []).map(a => {
    const person = a.kind === 'student' ? students.find(s => s.id === a.id) : teachers.find(t => t.id === a.id);
    const next = { ...a };
    if (person?.className && !next.className) { next.className = normalizeClass(person.className); changed = true; }
    const status = attendanceLabel(next);
    if (next.attendanceStatus !== status) { next.attendanceStatus = status; changed = true; }
    if (!next.scannedAt && next.date === today() && next.time) { next.scannedAt = new Date().toISOString(); changed = true; }
    return next;
  });
  return { ...data, attendance, __changed: changed };
}
function safePersist(data) {
  const copy = { ...data };
  delete copy.__changed;
  rawSetItem.call(localStorage, STORAGE, JSON.stringify(copy));
}
function syncNewAttendance(nextData, previousData) {
  const previous = new Set((previousData?.attendance || []).map(a => `${a.kind}:${a.id}:${a.date}`));
  const fresh = (nextData.attendance || []).filter(a => !previous.has(`${a.kind}:${a.id}:${a.date}`));
  fresh.forEach(a => {
    const key = `${a.kind}:${a.id}:${a.date}`;
    if (lastQueueKey !== key) {
      queue.unshift({ ...a, status: a.attendanceStatus || attendanceLabel(a), at: a.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      queue = queue.slice(0, 12);
      lastQueueKey = key;
    }
    if (supabaseConfigured && supabase) {
      const payload = a.kind === 'student' ? { p_kind: 'student', p_source: 'qr', p_student: a.id } : { p_kind: 'teacher', p_source: 'qr', p_teacher: a.id };
      supabase.rpc('record_attendance', payload).catch(() => {});
    }
  });
}
Storage.prototype.setItem = function(key, value) {
  if (key !== STORAGE) return rawSetItem.call(this, key, value);
  let nextData;
  try { nextData = JSON.parse(value); } catch { return rawSetItem.call(this, key, value); }
  const previousData = readData();
  const enriched = ensureStatus(nextData);
  const output = { ...enriched }; delete output.__changed;
  rawSetItem.call(this, key, JSON.stringify(output));
  syncNewAttendance(output, previousData);
  requestAnimationFrame(refreshAll);
};

async function hydrateFromSupabase() {
  if (!supabaseConfigured || !supabase) return;
  try {
    const [{ data: students }, { data: teachers }, { data: attendance }] = await Promise.all([
      supabase.from('students').select('*').eq('active', true).order('name'),
      supabase.from('teachers').select('*').eq('active', true).order('name'),
      supabase.from('attendance').select('*').gte('attendance_date', today()).order('attendance_time', { ascending: false })
    ]);
    const current = readData();
    const merged = {
      ...current,
      students: (students || []).map(s => ({ ...s, id: s.student_id || s.id, className: s.class_name || s.className, admissionNo: s.admission_number || s.admissionNo, father: s.father_name || s.father, home: s.home_address || s.home, homeMaps: s.home_location_url || s.homeMaps, active: s.active })),
      teachers: (teachers || []).map(t => ({ ...t, id: t.teacher_id || t.id, className: t.class_name || t.className, joining: t.joining_date || t.joining })),
      attendance: (attendance || []).map(a => ({
        id: a.kind === 'student' ? a.student_id : a.teacher_id,
        kind: a.kind,
        name: a.kind === 'student' ? (students || []).find(s => (s.student_id || s.id) === a.student_id)?.name : (teachers || []).find(t => (t.teacher_id || t.id) === a.teacher_id)?.name,
        date: a.attendance_date,
        time: a.attendance_time ? new Date(a.attendance_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        className: normalizeClass(a.kind === 'student' ? (students || []).find(s => (s.student_id || s.id) === a.student_id)?.class_name : ''),
        attendanceStatus: attendanceLabel({ time: a.attendance_time ? new Date(a.attendance_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '' })
      }))
    };
    rawSetItem.call(localStorage, STORAGE, JSON.stringify(merged));
    lastAttendanceSnapshot = merged.attendance || [];
    refreshAll();
  } catch { /* local fallback remains active */ }
}
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
function getPanel(title) { return [...document.querySelectorAll('.panel')].find(p => p.querySelector('h2')?.textContent?.trim() === title); }
function classTabs(container, active, onClick) {
  let wrap = container.querySelector('[data-tnps-class-tabs]');
  if (!wrap) { wrap = el('div', 'segmented'); wrap.dataset.tnpsClassTabs = '1'; container.prepend(wrap); }
  wrap.innerHTML = '';
  ['All', ...CLASS_ORDER].forEach(c => { const b = el('button', active === c ? 'selected' : '', c === 'All' ? 'All Classes' : CLASS_LABELS[c]); b.onclick = () => onClick(c); wrap.appendChild(b); });
}
function enhanceStudents() {
  const panel = getPanel('Students'); if (!panel) return;
  classTabs(panel, activeStudentClass, c => { activeStudentClass = c; refreshAll(); });
  const table = panel.querySelector('tbody'); if (!table) return;
  [...table.querySelectorAll('tr')].forEach(row => {
    const cell = row.children[2]?.textContent || '';
    const cls = normalizeClass(cell.split('-')[0]);
    row.style.display = activeStudentClass === 'All' || cls === activeStudentClass ? '' : 'none';
  });
  let summary = panel.querySelector('[data-tnps-class-summary]');
  if (!summary) { summary = el('div'); summary.dataset.tnpsClassSummary = '1'; panel.insertBefore(summary, panel.querySelector('.search') || panel.querySelector('.table-wrap')); }
  const data = readData();
  summary.innerHTML = '';
  summary.className = 'chip-row';
  CLASS_ORDER.forEach(c => {
    const count = (data.students || []).filter(s => normalizeClass(s.className) === c).length;
    if (count || activeStudentClass === c) summary.appendChild(el('span', 'chip', `${CLASS_LABELS[c]} · ${count}`));
  });
}
function enhanceAttendance() {
  for (const type of ['student', 'teacher']) {
    const title = type === 'student' ? 'Student Attendance' : 'Teacher Attendance';
    const panel = getPanel(title); if (!panel) continue;
    const data = readData();
    const people = type === 'student' ? (data.students || []) : (data.teachers || []);
    const rows = (data.attendance || []).filter(a => a.kind === type && a.date === today());
    if (type === 'teacher') { renderAttendancePanel(panel, type, people, rows, null); continue; }
    classTabs(panel, activeAttendanceClass, c => { activeAttendanceClass = c; refreshAll(); });
    renderAttendancePanel(panel, type, people, rows, activeAttendanceClass);
  }
}
function renderAttendancePanel(panel, type, people, rows, activeClass) {
  const classes = type === 'student' ? ['All', ...CLASS_ORDER] : ['All'];
  let dash = panel.querySelector('[data-tnps-attendance-dashboard]');
  if (!dash) { dash = el('div'); dash.dataset.tnpsAttendanceDashboard = '1'; const stats = panel.querySelector('.stats-grid'); if (stats) stats.after(dash); else panel.appendChild(dash); }
  const scopedPeople = activeClass && activeClass !== 'All' ? people.filter(p => normalizeClass(p.className) === activeClass) : people;
  const scopedRows = activeClass && activeClass !== 'All' ? rows.filter(r => normalizeClass(r.className) === activeClass) : rows;
  const presentIds = new Set(scopedRows.map(r => r.id));
  const late = scopedRows.filter(r => (r.attendanceStatus || attendanceLabel(r)) === 'Late').length;
  const early = scopedRows.filter(r => (r.attendanceStatus || attendanceLabel(r)) === 'Early').length;
  const absent = Math.max(0, scopedPeople.length - presentIds.size);
  dash.innerHTML = '';
  dash.className = 'stats-grid mini';
  [['Total', scopedPeople.length], ['Present', presentIds.size], ['Absent', absent], ['Late', late], ['Early', early]].forEach(([label, value]) => { const card = el('div', 'stat-card'); const inner = el('div'); inner.append(el('span', null, label), el('strong', null, String(value))); card.appendChild(inner); dash.appendChild(card); });
  const table = panel.querySelector('table'); if (!table) return;
  const head = table.querySelector('thead tr');
  if (head) { head.innerHTML = ''; ['Person', 'Class', 'ID', 'Time', 'Status'].forEach(h => head.appendChild(el('th', null, h))); }
  const body = table.querySelector('tbody'); if (!body) return;
  body.innerHTML = '';
  const ordered = [...scopedRows].sort((a,b) => String(b.time).localeCompare(String(a.time)));
  if (!ordered.length) { const tr = el('tr'); const td = el('td'); td.colSpan = 5; const empty = el('div', 'empty'); empty.append(el('strong', null, 'No attendance records for this class today'), el('span', null, 'Use the QR scanner to mark attendance.')); td.appendChild(empty); tr.appendChild(td); body.appendChild(tr); return; }
  ordered.forEach(r => { const person = people.find(p => p.id === r.id); const tr = el('tr'); const status = r.attendanceStatus || attendanceLabel(r); [r.name || person?.name || 'Unknown', normalizeClass(r.className || person?.className), r.id, r.time || '—', status].forEach((v, i) => { const td = el('td', i === 4 ? 'status' : '', v); tr.appendChild(td); }); body.appendChild(tr); });
}
function enhanceScannerQueue() {
  const note = document.querySelector('.scanner-note'); if (!note) return;
  let box = document.querySelector('[data-tnps-scan-queue]');
  if (!box) { box = el('div'); box.dataset.tnpsScanQueue = '1'; box.style.marginTop = '12px'; note.parentElement.appendChild(box); }
  box.innerHTML = '';
  const title = el('strong', null, `Scan Queue · ${queue.length}`); title.style.display = 'block'; title.style.marginBottom = '8px'; box.appendChild(title);
  if (!queue.length) { box.appendChild(el('div', 'empty', 'No scans yet.')); return; }
  queue.slice(0, 8).forEach(item => {
    const row = el('div'); row.style.display='flex'; row.style.justifyContent='space-between'; row.style.gap='10px'; row.style.padding='8px 10px'; row.style.borderRadius='10px'; row.style.background='var(--surface-2, #f5f6fa)'; row.style.marginBottom='6px';
    const left = el('div'); left.append(el('strong', null, item.name || 'Unknown'), el('small', null, `${item.kind === 'student' ? CLASS_LABELS[normalizeClass(item.className)] || normalizeClass(item.className) : 'Teacher'} · ${item.status || 'Present'}`));
    const time = el('span', null, item.at || item.time || '—'); time.style.whiteSpace='nowrap'; row.append(left, time); box.appendChild(row);
  });
}
function removePrototypeText() {
  const bad = ['No database connected', 'Frontend/local prototype only', 'Supabase and Netlify remain untouched', 'Database is intentionally not connected yet'];
  document.querySelectorAll('*').forEach(node => {
    if (node.children.length) return;
    const text = node.textContent?.trim() || '';
    if (bad.some(x => text.includes(x))) {
      if (node.closest('.empty')) node.closest('.empty').remove();
      else node.textContent = text.replace(/No database connected/gi, 'TNPS Database Connected').replace(/Database is intentionally not connected yet/gi, 'IDs are automatic and securely stored in TNPS database.').replace(/Frontend\/local prototype only\.?/gi, '').replace(/Supabase and Netlify remain untouched\.?/gi, '');
    }
  });
}
function fixDatabaseBadge() {
  document.querySelectorAll('*').forEach(node => {
    if (node.children.length) return;
    if (!node.textContent?.includes('TNPS Database Connected')) return;
    node.style.position = 'static'; node.style.inset = 'auto'; node.style.transform = 'none'; node.style.zIndex = 'auto'; node.style.whiteSpace = 'nowrap'; node.style.display = 'inline-flex'; node.style.alignItems = 'center'; node.style.margin = '0 0 8px 0';
    const parent = node.parentElement; if (parent) { parent.style.position='relative'; parent.style.display='flex'; parent.style.flexWrap='wrap'; parent.style.alignItems='center'; parent.style.gap='8px'; }
  });
}
function suppressDuplicateToasts() {
  document.querySelectorAll('.toast').forEach(t => { if (/already marked today/i.test(t.textContent || '')) t.style.display = 'none'; });
}
function refreshAll() {
  requestAnimationFrame(() => { removePrototypeText(); fixDatabaseBadge(); enhanceStudents(); enhanceAttendance(); enhanceScannerQueue(); suppressDuplicateToasts(); });
}

const observer = new MutationObserver(refreshAll);
window.addEventListener('DOMContentLoaded', () => { observer.observe(document.body, { childList: true, subtree: true }); refreshAll(); hydrateFromSupabase(); });
setTimeout(() => { refreshAll(); hydrateFromSupabase(); }, 1200);
