export const TNPS_PORTAL_ACCESS = {
  developer: {
    label: 'Developer',
    access: 'full-system',
    modules: ['all-modules', 'users', 'system-control', 'audit-logs', 'application-settings']
  },
  principal: {
    label: 'Principal',
    access: 'school-management',
    modules: ['dashboard', 'students', 'teachers', 'qr-attendance', 'attendance', 'academics', 'timetable', 'communication', 'reports', 'settings']
  },
  teacher: {
    label: 'Teacher',
    access: 'assigned-work',
    modules: ['dashboard', 'my-students', 'scan-student', 'attendance', 'homework', 'my-timetable']
  },
  parent: {
    label: 'Parent',
    access: 'child-only',
    modules: ['home', 'my-child', 'child-qr', 'attendance', 'homework', 'timetable', 'notices']
  }
};

export const TNPS_ID_PREFIXES = {
  student: 'TNPS-STU',
  teacher: 'TNPS-TCH',
  parent: 'TNPS-PAR',
  principal: 'TNPS-PRI'
};

export function nextTnpsId(kind, existingPeople = []) {
  const prefix = TNPS_ID_PREFIXES[kind];
  if (!prefix) throw new Error(`Unsupported TNPS ID type: ${kind}`);
  const highest = existingPeople.reduce((max, person) => {
    if (!person.id?.startsWith(`${prefix}-`)) return max;
    const n = Number(person.id.slice(prefix.length + 1));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(5, '0')}`;
}

// QR codes intentionally carry an opaque identity reference, not a child's home
// address, parent phone number, Aadhaar number, or other private data. A future
// server-backed public/emergency lookup can reveal only the minimum information
// allowed by school policy after authorization.
export function makeQrPayload(person) {
  return JSON.stringify({ issuer: 'TNPS', version: 1, id: person.id, kind: person.kind });
}

export function isAllowedScan(payload, scannerRole) {
  const allowedKind = scannerRole === 'principal' ? 'teacher' : scannerRole === 'teacher' ? 'student' : null;
  return Boolean(payload?.issuer === 'TNPS' && payload?.id && payload?.kind === allowedKind);
}
