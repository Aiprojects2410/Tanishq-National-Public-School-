import { supabase } from './supabase';

const TABLES = { students:'students', teachers:'teachers', attendance:'attendance', timetable:'timetable', homework:'homework', exams:'exams', results:'exam_marks', notices:'notices', tickets:'tickets' };

export async function upsertStudent(student) {
  const row = { student_id: student.student_id || student.id, admission_number: student.admission_number || student.admissionNo, name: student.name, father_name: student.father || null, guardian_name: student.guardian_name || null, parent_phone: student.phone || null, dob: student.dob || null, gender: student.gender || null, class_name: student.class_name || student.className, section: student.section, home_address: student.home || null, home_location_url: student.homeMaps || null, photo_url: student.photo_url || null, aadhaar_number: student.aadhaar || null, active: student.active ?? true };
  const query = student.uuid ? supabase.from(TABLES.students).update(row).eq('id', student.uuid) : supabase.from(TABLES.students).insert(row);
  const { data, error } = await query.select().single(); if (error) throw error; return data;
}

export async function upsertTeacher(teacher) {
  const row = { teacher_id: teacher.teacher_id || teacher.id, name: teacher.name, phone: teacher.phone || null, email: teacher.email || null, designation: teacher.designation || null, qualification: teacher.qualification || null, joining_date: teacher.joining_date || teacher.joining || null, class_name: teacher.class_name || teacher.className || null, subjects: teacher.subjects || null, photo_url: teacher.photo_url || null, active: teacher.active ?? true };
  const query = teacher.uuid ? supabase.from(TABLES.teachers).update(row).eq('id', teacher.uuid) : supabase.from(TABLES.teachers).insert(row);
  const { data, error } = await query.select().single(); if (error) throw error; return data;
}

export async function getStudentAttendance({ from, to, className, section } = {}) {
  let q = supabase.from(TABLES.attendance).select('*, students:student_id(student_id,name,class_name,section)').eq('kind','student').order('attendance_date',{ascending:false});
  if (from) q=q.gte('attendance_date',from); if (to) q=q.lte('attendance_date',to); const {data,error}=await q; if(error) throw error;
  return (data||[]).filter(x => !className || x.students?.class_name===className).filter(x => !section || x.students?.section===section);
}

export async function getTeacherAttendance({ from, to } = {}) {
  let q=supabase.from(TABLES.attendance).select('*, teachers:teacher_id(teacher_id,name,designation,class_name)').eq('kind','teacher').order('attendance_date',{ascending:false});
  if(from) q=q.gte('attendance_date',from); if(to) q=q.lte('attendance_date',to); const {data,error}=await q;if(error)throw error;return data||[];
}

export async function getMonthlyAttendanceReport(year, month, kind='student') {
  const start=`${year}-${String(month).padStart(2,'0')}-01`;
  const endDate=new Date(Date.UTC(year,month,0)).getUTCDate();
  const end=`${year}-${String(month).padStart(2,'0')}-${String(endDate).padStart(2,'0')}`;
  return kind==='student' ? getStudentAttendance({from:start,to:end}) : getTeacherAttendance({from:start,to:end});
}

export async function listTickets() { const {data,error}=await supabase.from(TABLES.tickets).select('*').order('created_at',{ascending:false}); if(error)throw error; return data||[]; }
export async function replyToTicket(ticketId,message) { const {data:{user}}=await supabase.auth.getUser(); if(!user)throw new Error('AUTH_REQUIRED'); const {data,error}=await supabase.from('ticket_messages').insert({ticket_id:ticketId,author_id:user.id,message}).select().single(); if(error)throw error; return data; }

export async function resolveTicket(ticketId) {
  const {data:{user}}=await supabase.auth.getUser(); if(!user)throw new Error('AUTH_REQUIRED');
  const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single();
  if(profile?.role!=='developer') throw new Error('DEVELOPER_ONLY');
  const {data,error}=await supabase.from(TABLES.tickets).update({status:'resolved',resolved_by:user.id,resolved_at:new Date().toISOString()}).eq('id',ticketId).select().single(); if(error)throw error; return data;
}

export async function closeTicket(ticketId) {
  const {data:{user}}=await supabase.auth.getUser(); if(!user)throw new Error('AUTH_REQUIRED');
  const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single();
  if(profile?.role!=='developer') throw new Error('DEVELOPER_ONLY');
  const {data,error}=await supabase.from(TABLES.tickets).update({status:'closed',closed_by:user.id,closed_at:new Date().toISOString()}).eq('id',ticketId).select().single(); if(error)throw error; return data;
}
