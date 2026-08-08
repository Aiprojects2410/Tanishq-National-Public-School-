import { supabase } from './supabase';

export const listStudents = async () => supabase.from('students').select('*').eq('active', true).order('name');
export const listTeachers = async () => supabase.from('teachers').select('*').eq('active', true).order('name');
export const listStudentAttendance = async (from, to) => supabase.from('attendance').select('*').eq('kind', 'student').gte('attendance_date', from).lte('attendance_date', to).order('attendance_date', { ascending: false });
export const listTeacherAttendance = async (from, to) => supabase.from('attendance').select('*').eq('kind', 'teacher').gte('attendance_date', from).lte('attendance_date', to).order('attendance_date', { ascending: false });
export const recordAttendance = async ({ id, kind, source = 'qr' }) => {
  const payload = kind === 'student' ? { student_id: id } : { teacher_id: id };
  return supabase.rpc('record_attendance', { p_kind: kind, p_source: source, ...payload });
};
export const publicQrProfile = async token => supabase.rpc('get_public_qr_profile', { p_token: token });
export const examSummary = async (examId, studentId) => supabase.rpc('calculate_exam_summary', { p_exam: examId, p_student: studentId });
export const setTicketStatus = async (ticketId, status) => supabase.rpc('set_ticket_status', { p_ticket: ticketId, p_status: status });
export const listNotifications = async userId => supabase.from('notifications').select('*').eq('recipient_id', userId).order('created_at', { ascending: false });
export const markNotificationRead = async id => supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
export const listLeaveRequests = async () => supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
export const createLeaveRequest = async values => supabase.from('leave_requests').insert(values).select().single();
export const reviewLeaveRequest = async (id, status, reviewer) => supabase.from('leave_requests').update({ status, reviewed_by: reviewer, reviewed_at: new Date().toISOString() }).eq('id', id).select().single();
