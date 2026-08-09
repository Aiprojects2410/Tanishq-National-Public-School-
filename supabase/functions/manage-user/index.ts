import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const json=(body:unknown,status=200)=>Response.json(body,{status});
const temporaryPassword=()=>`TNPS@${crypto.randomUUID().replace(/-/g,'').slice(0,8).toUpperCase()}${Math.floor(1000+Math.random()*9000)}`;
const internalStudentEmail=(studentId:string)=>`${String(studentId).trim().toLowerCase().replace(/[^a-z0-9._-]/g,'') || `student-${crypto.randomUUID().slice(0,8)}`}@login.tnps.local`;
Deno.serve(async(req:Request)=>{
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return json({error:'Server configuration error'},500);
 const admin=createClient(url,key),token=req.headers.get('Authorization')?.replace('Bearer ','');if(!token)return json({error:'Unauthorized'},401);
 const{data:{user},error:ue}=await admin.auth.getUser(token);if(ue||!user)return json({error:'Unauthorized'},401);
 const{data:actor}=await admin.from('profiles').select('role,active').eq('id',user.id).single();if(actor?.role!=='developer'||actor?.active!==true)return json({error:'Developer access required'},403);
 const body=await req.json().catch(()=>({}));
 if(body.action==='list'){const{data,error}=await admin.from('profiles').select('id,role,display_name,phone,active,created_at,must_change_password,permissions').order('created_at',{ascending:false});return json({data,error:error?.message});}
 if(body.action==='create'){
  const role=body.role;if(!['principal','teacher','parent','developer'].includes(role))return json({error:'Invalid role'},400);
  const code=String(role==='teacher'?body.teacher_code:role==='parent'?body.student_code:'').trim();
  let email=String(body.email||'').trim();
  if(role==='teacher'){
   if(!code)return json({error:'Teacher ID is required'},400);
   const{data:t,error:te}=await admin.from('teachers').select('id,teacher_id,email,auth_user_id,active,name').eq('teacher_id',code).single();
   if(te||!t)return json({error:'Teacher not found'},404);
   if(t.active===false)return json({error:'Teacher is inactive'},400);
   if(t.auth_user_id)return json({error:'A login already exists for this Teacher ID'},400);
   if(!t.email)return json({error:'No email is saved for this teacher. Add the teacher email in Teacher details first.'},400);
   email=String(t.email).trim();
  } else if(role==='parent'){
   if(!code)return json({error:'Student ID is required'},400);
   const{data:s,error:se}=await admin.from('students').select('id,student_id,active').eq('student_id',code).single();
   if(se||!s)return json({error:'Student not found'},404);
   if(s.active===false)return json({error:'Student is inactive'},400);
   const{data:existingParent}=await admin.from('parents').select('profile_id').eq('student_id',s.id).maybeSingle();
   if(existingParent?.profile_id)return json({error:'A parent login already exists for this Student ID'},400);
   email=internalStudentEmail(s.student_id);
  } else if(!email){return json({error:'Email is required for this role'},400);}
  const password=body.password||temporaryPassword();if(String(password).length<8)return json({error:'Temporary password must be at least 8 characters'},400);
  const{data:c,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:body.display_name||null,phone:body.phone||null}});if(error)return json({error:error.message},400);
  const{error:profileError}=await admin.from('profiles').update({role,display_name:body.display_name||null,phone:body.phone||null,must_change_password:true,permissions:body.permissions||{}}).eq('id',c.user.id);
  if(profileError){await admin.auth.admin.deleteUser(c.user.id);return json({error:profileError.message},400)}
  if(role==='parent'){
   const{data:s}=await admin.from('students').select('id').eq('student_id',code).single();
   if(!s){await admin.auth.admin.deleteUser(c.user.id);return json({error:'Student not found'},404)}
   const{error:pe}=await admin.from('parents').upsert({profile_id:c.user.id,student_id:s.id,relationship:body.relationship||'Parent',must_change_password:true},{onConflict:'profile_id'});
   if(pe){await admin.auth.admin.deleteUser(c.user.id);return json({error:pe.message},400)}
  }
  if(role==='teacher'){
   const{error:te}=await admin.from('teachers').update({auth_user_id:c.user.id}).eq('teacher_id',code);if(te){await admin.auth.admin.deleteUser(c.user.id);return json({error:te.message},400)}
  }
  return json({data:{id:c.user.id,email:role==='parent'?null:c.user.email,role,login_id:role==='teacher'||role==='parent'?code:null,temporary_password:password}});
 }
 if(body.action==='update'){const{user_id}=body;if(!user_id)return json({error:'user_id is required'},400);if(user_id===user.id&&body.active===false)return json({error:'The current Developer account cannot be disabled'},400);if(user_id===user.id&&body.role&&body.role!=='developer')return json({error:'The current Developer account must remain Developer'},400);const allowed:any={};if(body.email)allowed.email=String(body.email).trim();if(body.password)allowed.password=body.password;if(body.active!==undefined)allowed.ban_duration=body.active?'none':'876000h';const{data:u,error}=await admin.auth.admin.updateUserById(user_id,allowed);if(error)return json({error:error.message},400);const patch:any={};for(const k of ['role','display_name','phone','active','permissions'])if(body[k]!==undefined)patch[k]=body[k];if(body.password)patch.must_change_password=true;if(Object.keys(patch).length){const{error:pe}=await admin.from('profiles').update({...patch,updated_at:new Date().toISOString()}).eq('id',user_id);if(pe)return json({error:pe.message},400)}return json({data:u?.user});}
 if(body.action==='reset_password'){const{user_id}=body;if(!user_id)return json({error:'user_id is required'},400);const password=body.password||temporaryPassword();const{data:u,error}=await admin.auth.admin.updateUserById(user_id,{password});if(error)return json({error:error.message},400);const{error:pe}=await admin.from('profiles').update({must_change_password:true,updated_at:new Date().toISOString()}).eq('id',user_id);if(pe)return json({error:pe.message},400);return json({data:{id:u.user.id,must_change_password:true,temporary_password:password}});}
 if(body.action==='delete'){if(body.user_id===user.id)return json({error:'Cannot disable current Developer'},400);const{error}=await admin.auth.admin.updateUserById(body.user_id,{ban_duration:'876000h'});if(error)return json({error:error.message},400);await admin.from('profiles').update({active:false,updated_at:new Date().toISOString()}).eq('id',body.user_id);return json({ok:true});}
 if(body.action==='delete_person'){const type=body.person_type,id=body.person_id;if(!['student','teacher'].includes(type)||!id)return json({error:'person_type and person_id are required'},400);if(type==='student'){const{s,error:se}=await admin.from('students').select('id,auth_user_id').eq('student_id',id).single();if(se||!s)return json({error:'Student not found'},404);const{data:parents}=await admin.from('parents').select('profile_id').eq('student_id',s.id);await admin.from('students').update({active:false}).eq('id',s.id);await admin.from('qr_cards').update({active:false}).eq('student_id',s.id);for(const p of parents||[]){await admin.from('profiles').update({active:false,updated_at:new Date().toISOString()}).eq('id',p.profile_id);await admin.auth.admin.updateUserById(p.profile_id,{ban_duration:'876000h'});}if(s.auth_user_id){await admin.from('profiles').update({active:false,updated_at:new Date().toISOString()}).eq('id',s.auth_user_id);await admin.auth.admin.updateUserById(s.auth_user_id,{ban_duration:'876000h'});}}else{const{data:t,error:te}=await admin.from('teachers').select('id,auth_user_id').eq('teacher_id',id).single();if(te||!t)return json({error:'Teacher not found'},404);await admin.from('teachers').update({active:false}).eq('id',t.id);await admin.from('qr_cards').update({active:false}).eq('teacher_id',t.id);if(t.auth_user_id){await admin.from('profiles').update({active:false,updated_at:new Date().toISOString()}).eq('id',t.auth_user_id);await admin.auth.admin.updateUserById(t.auth_user_id,{ban_duration:'876000h'});}}return json({ok:true,deactivated:type,id});}
 return json({error:'Unknown action'},400);
});
