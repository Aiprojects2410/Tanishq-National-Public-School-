import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import {
  Activity, Bell, BookOpen, CalendarDays, Camera, CheckCircle2, ChevronRight,
  ClipboardCheck, GraduationCap, LayoutDashboard, LogOut, Menu, QrCode,
  Search, Settings, ShieldCheck, UserRound, Users, X
} from 'lucide-react';
import './styles.css';

const initialPeople = [
  { id: 'TNPS-STU-00001', kind: 'student', name: 'Aaradhya Sharma', className: 'Nursery A', photo: '', qr: 'TNPS-STU-00001' },
  { id: 'TNPS-STU-00002', kind: 'student', name: 'Aarav Singh', className: 'Nursery A', photo: '', qr: 'TNPS-STU-00002' },
  { id: 'TNPS-STU-00003', kind: 'student', name: 'Myra Khan', className: 'KG A', photo: '', qr: 'TNPS-STU-00003' },
  { id: 'TNPS-TCH-00001', kind: 'teacher', name: 'Priya Ma’am', className: 'Nursery A', photo: '', qr: 'TNPS-TCH-00001' },
  { id: 'TNPS-TCH-00002', kind: 'teacher', name: 'Neha Ma’am', className: 'KG A', photo: '', qr: 'TNPS-TCH-00002' }
];

const navByRole = {
  developer: [
    ['dashboard', 'Dashboard', LayoutDashboard], ['users', 'Users', Users], ['qr', 'QR Attendance', QrCode],
    ['attendance', 'Attendance', ClipboardCheck], ['system', 'System Control', ShieldCheck], ['settings', 'Settings', Settings]
  ],
  principal: [
    ['dashboard', 'Dashboard', LayoutDashboard], ['students', 'Students', GraduationCap], ['teachers', 'Teachers & Staff', Users],
    ['qr', 'QR Attendance', QrCode], ['attendance', 'Attendance', ClipboardCheck], ['academics', 'Academics', BookOpen],
    ['timetable', 'Timetable', CalendarDays], ['communication', 'Communication', Bell], ['reports', 'Reports', Activity], ['settings', 'Settings', Settings]
  ],
  teacher: [
    ['dashboard', 'Dashboard', LayoutDashboard], ['students', 'My Students', GraduationCap], ['scan', 'Scan Student', Camera],
    ['attendance', 'Attendance', ClipboardCheck], ['homework', 'Homework', BookOpen], ['timetable', 'My Timetable', CalendarDays]
  ],
  parent: [
    ['dashboard', 'Home', LayoutDashboard], ['child', 'My Child', UserRound], ['attendance', 'Attendance', ClipboardCheck],
    ['homework', 'Homework', BookOpen], ['timetable', 'Timetable', CalendarDays], ['notices', 'Notices', Bell]
  ]
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function App() {
  const [role, setRole] = useState('principal');
  const [page, setPage] = useState('dashboard');
  const [people, setPeople] = useState(initialPeople);
  const [attendance, setAttendance] = useState({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [toast, setToast] = useState('');

  const students = useMemo(() => people.filter(p => p.kind === 'student'), [people]);
  const teachers = useMemo(() => people.filter(p => p.kind === 'teacher'), [people]);

  useEffect(() => {
    const saved = localStorage.getItem('tnps-attendance');
    if (saved) setAttendance(JSON.parse(saved));
  }, []);

  function saveAttendance(next) {
    setAttendance(next);
    localStorage.setItem('tnps-attendance', JSON.stringify(next));
  }

  function scanPerson(id, scannerRole) {
    const person = people.find(p => p.id === id);
    if (!person) return { ok: false, message: 'QR not recognized.' };
    const allowedKind = scannerRole === 'principal' ? 'teacher' : 'student';
    if (person.kind !== allowedKind) return { ok: false, message: scannerRole === 'principal' ? 'Principal scanner accepts teacher QR only.' : 'Teacher scanner accepts student QR only.' };
    const key = `${todayKey()}_${person.id}`;
    if (attendance[key]) return { ok: false, message: `${person.name} is already marked today.` };
    const record = { id: person.id, name: person.name, kind: person.kind, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    saveAttendance({ ...attendance, [key]: record });
    return { ok: true, message: `${person.name} marked present.` };
  }

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  const scannerRole = role === 'principal' ? 'principal' : role === 'teacher' ? 'teacher' : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><span>TN</span></div>
          <div><strong>Tanishq</strong><small>National Public School</small></div>
        </div>
        <div className="role-switcher">
          <span>Preview role</span>
          <select value={role} onChange={e => { setRole(e.target.value); setPage('dashboard'); }}>
            <option value="developer">Developer</option><option value="principal">Principal</option>
            <option value="teacher">Teacher</option><option value="parent">Parent</option>
          </select>
        </div>
        <nav>
          {navByRole[role].map(([key, label, Icon]) => (
            <button key={key} className={page === key ? 'nav-item active' : 'nav-item'} onClick={() => setPage(key)}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom"><button className="nav-item"><LogOut size={18}/><span>Sign out</span></button></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><button className="mobile-menu"><Menu size={20}/></button><div className="eyebrow">{role === 'developer' ? 'Developer Console' : `${role[0].toUpperCase()}${role.slice(1)} Portal`}</div><h1>{pageTitle(page)}</h1></div>
          <div className="top-actions"><button className="icon-btn"><Bell size={18}/></button><div className="profile-chip"><div className="avatar">{role === 'developer' ? 'D' : role === 'principal' ? 'P' : role === 'teacher' ? 'T' : 'A'}</div><div><strong>{role === 'developer' ? 'Developer' : role === 'principal' ? 'Principal' : role === 'teacher' ? 'Teacher' : 'Parent'}</strong><small>TNPS account</small></div></div></div>
        </header>

        <section className="content">
          {page === 'dashboard' && <Dashboard role={role} students={students} teachers={teachers} attendance={attendance} onNavigate={setPage} />}
          {page === 'students' && <PeopleList title={role === 'teacher' ? 'My Students' : 'Students'} people={students} />}
          {page === 'teachers' && <PeopleList title="Teachers & Staff" people={teachers} />}
          {page === 'users' && <PeopleList title="User Control" people={people} />}
          {page === 'qr' && <QrCenter people={people} onScan={() => setScannerOpen(true)} />}
          {page === 'scan' && <ScanPage onScan={() => setScannerOpen(true)} />}
          {page === 'attendance' && <AttendancePage attendance={attendance} people={people} />}
          {!['dashboard','students','teachers','users','qr','scan','attendance'].includes(page) && <ComingSoon title={pageTitle(page)} />}
        </section>
      </main>

      {scannerOpen && scannerRole && <ScannerModal role={scannerRole} onClose={() => setScannerOpen(false)} onResult={(id) => { const result = scanPerson(id, scannerRole); showToast(result.message); if (result.ok) setScannerOpen(false); }} />}
      {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
    </div>
  );
}

function pageTitle(page) {
  return ({ dashboard: 'Good morning 👋', students: 'Students', teachers: 'Teachers & Staff', users: 'User Control', qr: 'QR Attendance', scan: 'Scan Student', attendance: 'Attendance', academics: 'Academics', timetable: 'Timetable', communication: 'Communication', reports: 'Reports', settings: 'Settings', homework: 'Homework', child: 'My Child', notices: 'Notices', system: 'System Control' })[page] || 'Tanishq ERP';
}

function Dashboard({ role, students, teachers, attendance, onNavigate }) {
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const studentPresent = students.filter(s => attendance[`${todayKey()}_${s.id}`]).length;
  const teacherPresent = teachers.filter(t => attendance[`${todayKey()}_${t.id}`]).length;
  return <>
    <div className="welcome"><div><span className="pill">{date}</span><h2>{role === 'developer' ? 'System at a glance' : 'Everything your school needs, in one place.'}</h2><p>Simple controls, clear information and no unnecessary complexity.</p></div><div className="welcome-art"><div className="sun"></div><div className="cloud cloud-one"></div><div className="cloud cloud-two"></div><div className="hill"></div></div></div>
    <div className="stats-grid">
      <Stat label="Students" value={students.length} icon={<GraduationCap/>} />
      <Stat label="Teachers" value={teachers.length} icon={<Users/>} />
      <Stat label="Student attendance" value={`${studentPresent}/${students.length}`} icon={<ClipboardCheck/>} />
      <Stat label="Teacher attendance" value={`${teacherPresent}/${teachers.length}`} icon={<CheckCircle2/>} />
    </div>
    <div className="section-head"><div><h3>Quick actions</h3><p>Common tasks, one tap away.</p></div></div>
    <div className="quick-grid">
      <Quick icon={<QrCode/>} title={role === 'teacher' ? 'Scan student' : 'QR attendance'} text="Keep the camera open and scan continuously." onClick={() => onNavigate(role === 'teacher' ? 'scan' : 'qr')} />
      <Quick icon={<GraduationCap/>} title="Students" text="View student profiles and IDs." onClick={() => onNavigate('students')} />
      <Quick icon={<ClipboardCheck/>} title="Attendance" text="See today's attendance records." onClick={() => onNavigate('attendance')} />
    </div>
  </>;
}

function Stat({ label, value, icon }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>; }
function Quick({ icon, title, text, onClick }) { return <button className="quick-card" onClick={onClick}><div className="quick-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div><ChevronRight className="arrow" size={18}/></button>; }

function PeopleList({ title, people }) {
  const [query, setQuery] = useState('');
  const filtered = people.filter(p => `${p.name} ${p.id} ${p.className || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="panel"><div className="section-head"><div><h2>{title}</h2><p>{people.length} records · IDs and QR codes are generated by the system.</p></div><div className="search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or ID"/></div></div><div className="table-wrap"><table><thead><tr><th>Person</th><th>ID</th><th>Class / role</th><th>QR</th></tr></thead><tbody>{filtered.map(p => <tr key={p.id}><td><div className="person"><div className="mini-avatar">{p.name.slice(0,1)}</div><div><strong>{p.name}</strong><small>{p.kind === 'student' ? 'Student' : 'Teacher'}</small></div></div></td><td><code>{p.id}</code></td><td>{p.className || '—'}</td><td><span className="status"><QrCode size={14}/> Ready</span></td></tr>)}</tbody></table></div></div>;
}

function QrCenter({ people, onScan }) {
  const [type, setType] = useState('student');
  const list = people.filter(p => p.kind === type);
  return <div className="panel"><div className="section-head"><div><h2>QR attendance</h2><p>Every student and teacher gets a QR identity automatically when created.</p></div><button className="primary" onClick={onScan}><Camera size={17}/> Open scanner</button></div><div className="segmented"><button className={type === 'student' ? 'selected' : ''} onClick={() => setType('student')}>Students</button><button className={type === 'teacher' ? 'selected' : ''} onClick={() => setType('teacher')}>Teachers</button></div><div className="qr-grid">{list.map(person => <QrCard key={person.id} person={person}/>)}</div></div>;
}

function QrCard({ person }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(JSON.stringify({ issuer: 'TNPS', id: person.id, kind: person.kind }), { width: 220, margin: 1 }).then(setSrc); }, [person]);
  return <div className="qr-card"><div className="qr-person"><div className="person-avatar">{person.name.slice(0,1)}</div><div><strong>{person.name}</strong><small>{person.id}</small></div></div>{src ? <img src={src} alt={`QR for ${person.name}`}/> : <div className="qr-placeholder">Generating…</div>}<div className="qr-footer"><span>{person.kind === 'student' ? person.className : 'Teacher'}</span><span>1 scan / day</span></div></div>;
}

function ScanPage({ onScan }) { return <div className="scanner-hero"><div className="scanner-icon"><QrCode size={44}/></div><h2>Scan student QR</h2><p>Teacher scanner accepts student QR codes only. Keep the camera open to scan multiple students without reopening it.</p><button className="primary big" onClick={onScan}><Camera size={18}/> Start camera</button><div className="rules"><span>✓ Back camera</span><span>✓ Multiple scans</span><span>✓ Duplicate protection</span></div></div>; }

function ScannerModal({ role, onClose, onResult }) {
  const id = `tnps-reader-${role}`;
  useEffect(() => {
    let scanner;
    let stopped = false;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (stopped) return;
      scanner = new Html5Qrcode(id);
      scanner.start({ facingMode: { exact: 'environment' } }, { fps: 10, qrbox: { width: 250, height: 250 } }, text => {
        try { const payload = JSON.parse(text); if (payload?.issuer === 'TNPS' && payload?.id) onResult(payload.id); else onResult(''); } catch { onResult(''); }
      }, () => {}).catch(() => scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, text => {
        try { const payload = JSON.parse(text); if (payload?.issuer === 'TNPS' && payload?.id) onResult(payload.id); } catch {}
      }).catch(() => {}));
    });
    return () => { stopped = true; if (scanner) scanner.stop().catch(() => {}); };
  }, [id]);
  return <div className="modal-backdrop"><div className="scanner-modal"><div className="modal-head"><div><span className="pill">{role === 'principal' ? 'Teacher attendance' : 'Student attendance'}</span><h2>Scan QR</h2></div><button className="icon-btn" onClick={onClose}><X size={19}/></button></div><div id={id} className="reader"></div><div className="scanner-note"><Camera size={16}/><span>Back camera · Continuous scanning · One successful attendance per QR per day</span></div></div></div>;
}

function AttendancePage({ attendance, people }) {
  const todayRecords = Object.values(attendance).filter(r => attendance[`${todayKey()}_${r.id}`]);
  return <div className="panel"><div className="section-head"><div><h2>Today's attendance</h2><p>QR scans are automatically recorded with date and time. Duplicate scans are rejected.</p></div></div><div className="table-wrap"><table><thead><tr><th>Person</th><th>Role</th><th>Time</th><th>Status</th></tr></thead><tbody>{todayRecords.length ? todayRecords.map(r => <tr key={r.id}><td><strong>{r.name}</strong></td><td>{r.kind}</td><td>{r.at}</td><td><span className="status"><CheckCircle2 size={14}/> Present</span></td></tr>) : <tr><td colSpan="4"><div className="empty"><ClipboardCheck size={26}/><strong>No scans yet today</strong><span>Use the QR scanner to mark attendance.</span></div></td></tr>}</tbody></table></div></div>;
}

function ComingSoon({ title }) { return <div className="panel empty-page"><div className="empty"><Settings size={34}/><strong>{title}</strong><span>This module is planned for the next build phase. No database is connected yet.</span></div></div>; }

createRoot(document.getElementById('root')).render(<App />);
