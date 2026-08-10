import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
const temporaryPassword = () => `TNPS@${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
const internalLoginEmail = (identifier: string) => `${String(identifier).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') || `login-${crypto.randomUUID().slice(0, 8)}`}@login.tnps.local`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: cors });

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: 'Server configuration error' }, 500);

  const admin = createClient(url, key);
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json({ error: 'Unauthorized' }, 401);

  const { data: actor } = await admin.from('profiles').select('role,active').eq('id', user.id).single();
  if (actor?.role !== 'developer' || actor?.active !== true) return json({ error: 'Developer access required' }, 403);

  const body = await req.json().catch(() => ({}));

  if (body.action === 'list') {
    const { data, error } = await admin.from('profiles').select('id,role,display_name,phone,active,created_at,must_change_password,permissions').order('created_at', { ascending: false });
    return json({ data, error: error?.message });
  }

  if (body.action === 'create') {
    const role = body.role;
    if (!['principal', 'teacher', 'parent', 'developer'].includes(role)) return json({ error: 'Invalid role' }, 400);

    const code = String(role === 'teacher' ? body.teacher_code : role === 'parent' ? body.student_code : '').trim();
    let email = String(body.email || '').trim();

    if (role === 'teacher') {
      if (!code) return json({ error: 'Teacher ID is required' }, 400);
      const { data: teacher, error: teacherError } = await admin.from('teachers').select('id,teacher_id,auth_user_id,active,name').eq('teacher_id', code).single();
      if (teacherError || !teacher) return json({ error: 'Teacher not found' }, 404);
      if (teacher.active === false) return json({ error: 'Teacher is inactive' }, 400);
      if (teacher.auth_user_id) return json({ error: 'A login already exists for this Teacher ID' }, 400);
      email = internalLoginEmail(teacher.teacher_id);
    } else if (role === 'parent') {
      if (!code) return json({ error: 'Student ID is required' }, 400);
      const { data: student, error: studentError } = await admin.from('students').select('id,student_id,active').eq('student_id', code).single();
      if (studentError || !student) return json({ error: 'Student not found' }, 404);
      if (student.active === false) return json({ error: 'Student is inactive' }, 400);
      const { data: existingParent } = await admin.from('parents').select('profile_id').eq('student_id', student.id).maybeSingle();
      if (existingParent?.profile_id) return json({ error: 'A parent login already exists for this Student ID' }, 400);
      email = internalLoginEmail(student.student_id);
    } else if (!email) {
      return json({ error: 'Email is required for this role' }, 400);
    }

    const password = body.password || temporaryPassword();
    if (String(password).length < 8) return json({ error: 'Temporary password must be at least 8 characters' }, 400);

    let createdUser: any = null;
    let createdNew = false;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: body.display_name || null, phone: body.phone || null },
    });

    if (createError) {
      const duplicate = /already been registered|already exists/i.test(createError.message || '');
      if (!duplicate) return json({ error: createError.message }, 400);
      const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find((candidate: any) => String(candidate.email || '').toLowerCase() === email.toLowerCase());
      if (listError || !existing) return json({ error: createError.message }, 400);
      const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: { ...(existing.user_metadata || {}), display_name: body.display_name || existing.user_metadata?.display_name || null, phone: body.phone || existing.user_metadata?.phone || null },
      });
      if (updateError) return json({ error: updateError.message }, 400);
      createdUser = updated.user;
    } else {
      createdUser = created?.user;
      createdNew = true;
    }

    if (!createdUser?.id) return json({ error: 'Login user could not be created' }, 500);

    const { error: profileError } = await admin.from('profiles').upsert({
      id: createdUser.id,
      role,
      display_name: body.display_name || null,
      phone: body.phone || null,
      active: true,
      must_change_password: true,
      permissions: body.permissions || {},
    }, { onConflict: 'id' });
    if (profileError) {
      if (createdNew) await admin.auth.admin.deleteUser(createdUser.id);
      return json({ error: profileError.message }, 400);
    }

    if (role === 'parent') {
      const { data: student } = await admin.from('students').select('id').eq('student_id', code).single();
      if (!student) {
        if (createdNew) await admin.auth.admin.deleteUser(createdUser.id);
        return json({ error: 'Student not found' }, 404);
      }
      const { error: parentError } = await admin.from('parents').upsert({
        profile_id: createdUser.id,
        student_id: student.id,
        relationship: body.relationship || 'Parent',
        must_change_password: true,
      }, { onConflict: 'profile_id' });
      if (parentError) {
        if (createdNew) await admin.auth.admin.deleteUser(createdUser.id);
        return json({ error: parentError.message }, 400);
      }
    }

    if (role === 'teacher') {
      const { error: teacherLinkError } = await admin.from('teachers').update({ auth_user_id: createdUser.id }).eq('teacher_id', code);
      if (teacherLinkError) {
        if (createdNew) await admin.auth.admin.deleteUser(createdUser.id);
        return json({ error: teacherLinkError.message }, 400);
      }
    }

    return json({ data: {
      id: createdUser.id,
      email: role === 'developer' || role === 'principal' ? createdUser.email : null,
      role,
      login_id: role === 'teacher' || role === 'parent' ? code : null,
      temporary_password: password,
    } });
  }

  if (body.action === 'update') {
    const { user_id } = body;
    if (!user_id) return json({ error: 'user_id is required' }, 400);
    if (user_id === user.id && body.active === false) return json({ error: 'The current Developer account cannot be disabled' }, 400);
    if (user_id === user.id && body.role && body.role !== 'developer') return json({ error: 'The current Developer account must remain Developer' }, 400);
    const allowed: any = {};
    if (body.email) allowed.email = String(body.email).trim();
    if (body.password) allowed.password = body.password;
    if (body.active !== undefined) allowed.ban_duration = body.active ? 'none' : '876000h';
    const { data: updatedUser, error } = await admin.auth.admin.updateUserById(user_id, allowed);
    if (error) return json({ error: error.message }, 400);
    const patch: any = {};
    for (const key of ['role', 'display_name', 'phone', 'active', 'permissions']) if (body[key] !== undefined) patch[key] = body[key];
    if (body.password) patch.must_change_password = true;
    if (Object.keys(patch).length) {
      const { error: profileError } = await admin.from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', user_id);
      if (profileError) return json({ error: profileError.message }, 400);
    }
    return json({ data: updatedUser?.user });
  }

  if (body.action === 'reset_password') {
    const { user_id } = body;
    if (!user_id) return json({ error: 'user_id is required' }, 400);
    const password = body.password || temporaryPassword();
    const { data: updatedUser, error } = await admin.auth.admin.updateUserById(user_id, { password });
    if (error) return json({ error: error.message }, 400);
    const { error: profileError } = await admin.from('profiles').update({ must_change_password: true, updated_at: new Date().toISOString() }).eq('id', user_id);
    if (profileError) return json({ error: profileError.message }, 400);
    return json({ data: { id: updatedUser.user.id, must_change_password: true, temporary_password: password } });
  }

  if (body.action === 'delete') {
    if (body.user_id === user.id) return json({ error: 'Cannot disable current Developer' }, 400);
    const { error } = await admin.auth.admin.updateUserById(body.user_id, { ban_duration: '876000h' });
    if (error) return json({ error: error.message }, 400);
    await admin.from('profiles').update({ active: false, updated_at: new Date().toISOString() }).eq('id', body.user_id);
    return json({ ok: true });
  }

  if (body.action === 'delete_person') {
    const type = body.person_type;
    const id = body.person_id;
    if (!['student', 'teacher'].includes(type) || !id) return json({ error: 'person_type and person_id are required' }, 400);
    if (type === 'student') {
      const { data: student, error: studentError } = await admin.from('students').select('id,auth_user_id').eq('student_id', id).single();
      if (studentError || !student) return json({ error: 'Student not found' }, 404);
      const { data: parents } = await admin.from('parents').select('profile_id').eq('student_id', student.id);
      await admin.from('students').update({ active: false }).eq('id', student.id);
      await admin.from('qr_cards').update({ active: false }).eq('student_id', student.id);
      for (const parent of parents || []) {
        await admin.from('profiles').update({ active: false, updated_at: new Date().toISOString() }).eq('id', parent.profile_id);
        await admin.auth.admin.updateUserById(parent.profile_id, { ban_duration: '876000h' });
      }
      if (student.auth_user_id) {
        await admin.from('profiles').update({ active: false, updated_at: new Date().toISOString() }).eq('id', student.auth_user_id);
        await admin.auth.admin.updateUserById(student.auth_user_id, { ban_duration: '876000h' });
      }
    } else {
      const { data: teacher, error: teacherError } = await admin.from('teachers').select('id,auth_user_id').eq('teacher_id', id).single();
      if (teacherError || !teacher) return json({ error: 'Teacher not found' }, 404);
      await admin.from('teachers').update({ active: false }).eq('id', teacher.id);
      await admin.from('qr_cards').update({ active: false }).eq('teacher_id', teacher.id);
      if (teacher.auth_user_id) {
        await admin.from('profiles').update({ active: false, updated_at: new Date().toISOString() }).eq('id', teacher.auth_user_id);
        await admin.auth.admin.updateUserById(teacher.auth_user_id, { ban_duration: '876000h' });
      }
    }
    return json({ ok: true, deactivated: type, id });
  }

  return json({ error: 'Unknown action' }, 400);
});
