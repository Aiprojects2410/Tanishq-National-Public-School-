-- TNPS attendance uses India local date/time for the daily attendance boundary.
-- Historical rows are never deleted. The portal's Today view naturally moves to the
-- next date after midnight while the history filters continue to show all saved rows.

create or replace function public.record_attendance(person_id uuid, person_type public.attendance_kind, scanned_token text default null) returns uuid language plpgsql set search_path=public as $$
declare
 new_id uuid;
 actor uuid;
 actor_role public.app_role;
 target_exists boolean;
 attendance_status public.attendance_status := 'present';
 cfg_early time;
 cfg_late time;
 local_now timestamptz := now();
 local_date date := (now() at time zone 'Asia/Kolkata')::date;
 now_time time := (now() at time zone 'Asia/Kolkata')::time;
begin
 actor:=auth.uid();
 if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 select p.role into actor_role from public.profiles p where p.id=actor and p.active=true;
 if actor_role is null then raise exception 'PROFILE_INACTIVE'; end if;
 if person_type='student' and actor_role not in ('developer','principal','teacher') then raise exception 'STUDENT_SCAN_NOT_ALLOWED'; end if;
 if person_type='teacher' and actor_role not in ('developer','principal') then raise exception 'TEACHER_SCAN_NOT_ALLOWED'; end if;
 if person_type='student' then
   select exists(select 1 from public.students s where s.id=person_id and s.active=true) into target_exists;
 else
   select exists(select 1 from public.teachers t where t.id=person_id and t.active=true) into target_exists;
 end if;
 if not target_exists then raise exception 'PERSON_NOT_FOUND'; end if;
 select early_before_time,late_after_time into cfg_early,cfg_late from public.school_settings order by updated_at desc limit 1;
 if cfg_early is not null and now_time<cfg_early then attendance_status:='early';
 elsif cfg_late is not null and now_time>cfg_late then attendance_status:='late'; end if;
 if person_type='student' then
   insert into public.attendance(attendance_date,attendance_time,kind,status,student_id,teacher_id,scanned_by,source)
   values(local_date,local_now,'student',attendance_status,person_id,null,actor,'qr')
   on conflict (attendance_date,student_id) where kind='student' and student_id is not null do nothing returning id into new_id;
 else
   insert into public.attendance(attendance_date,attendance_time,kind,status,student_id,teacher_id,scanned_by,source)
   values(local_date,local_now,'teacher',attendance_status,null,person_id,actor,'qr')
   on conflict (attendance_date,teacher_id) where kind='teacher' and teacher_id is not null do nothing returning id into new_id;
 end if;
 if new_id is null then raise exception 'ALREADY_MARKED_TODAY'; end if;
 return new_id;
end; $$;
