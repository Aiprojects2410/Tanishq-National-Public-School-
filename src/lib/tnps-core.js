import { supabase } from './supabase';

export const ROLES = ['developer', 'principal', 'teacher', 'parent'];
export const ROLE_PERMISSIONS = {
  developer: ['*'],
  principal: ['students.read','students.write','teachers.read','teachers.write','attendance.read','attendance.scan.teacher','attendance.scan.student','qr.read','qr.write','academics.read','academics.write','timetable.read','timetable.write','reports.read','notices.write','leave.review','tickets.create','tickets.read','tickets.reply'],
  teacher: ['students.read.assigned','attendance.read.assigned','attendance.scan.student','qr.read.assigned','homework.read','homework.write','exam-results.read.assigned','exam-results.write.assigned','timetable.read.assigned','notices.read','reports.read.assigned','tickets.create','tickets.read.own','tickets.reply.own'],
  parent: ['child.read','attendance.read.child','qr.read.child','homework.read.child','results.read.child','timetable.read.child','notices.read','tickets.create','tickets.read.own','tickets.reply.own']
};

export function can(role, permission) {
  const list = ROLE_PERMISSIONS[role] || [];
  return list.includes('*') || list.includes(permission);
}

export async function getSessionProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { session: null, profile: null };
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  if (error) throw error;
  return { session, profile };
}

export async function signIn(email, password) {
  const result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error) throw result.error;
  return getSessionProfile();
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function listStudents() {
  const { data, error } = await supabase.from('students').select('*').eq('active', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function listTeachers() {
  const { data, error } = await supabase.from('teachers').select('*').eq('active', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function uploadPrivateFile(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function getPrivateFileUrl(bucket, path, expiresIn = 600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function markAttendance({ personId, personType, scannedToken }) {
  if (!personId || !personType) throw new Error('Invalid attendance identity');
  const payload = { person_id: personId, person_type: personType, scanned_token: scannedToken || null };
  const { data, error } = await supabase.rpc('record_attendance', payload);
  if (error) throw error;
  return data;
}

export async function createTicket({ title, description, category, priority = 'medium', pageContext, moduleContext, screenshotPath }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in');
  const { data, error } = await supabase.from('tickets').insert({ created_by: user.id, title, description, category, priority, page_context: pageContext || null, module_context: moduleContext || null, screenshot_path: screenshotPath || null }).select().single();
  if (error) throw error;
  return data;
}
