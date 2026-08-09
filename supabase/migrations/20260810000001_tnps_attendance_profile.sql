-- TNPS profile-photo storage and scanner attendance rules.
alter table public.profiles add column if not exists photo_url text;
alter table public.school_settings add column if not exists school_start_time time default '08:30';
alter table public.school_settings add column if not exists early_before_time time default '08:15';
alter table public.school_settings add column if not exists late_after_time time default '08:45';
update public.school_settings set school_start_time=coalesce(school_start_time,'08:30'),early_before_time=coalesce(early_before_time,'08:15'),late_after_time=coalesce(late_after_time,'08:45');
alter type public.attendance_status add value if not exists 'early';
drop index if exists public.attendance_student_once_per_day;
drop index if exists public.attendance_teacher_once_per_day;
create index if not exists attendance_scanned_by_idx on public.attendance(scanned_by);
create index if not exists attendance_student_id_idx on public.attendance(student_id);
create index if not exists attendance_teacher_id_idx on public.attendance(teacher_id);
create index if not exists notifications_recipient_id_idx on public.notifications(recipient_id);
create index if not exists parents_student_id_idx on public.parents(student_id);
create index if not exists qr_cards_student_id_idx on public.qr_cards(student_id);
create index if not exists qr_cards_teacher_id_idx on public.qr_cards(teacher_id);

create or replace function public.record_attendance(person_id uuid, person_type public.attendance_kind, scanned_token text default null) returns uuid language plpgsql set search_path=public as $$
declare new_id uuid; actor uuid; actor_role public.app_role; target_exists boolean; attendance_status public.attendance_status := 'present'; cfg_early time; cfg_late time; now_time time := localtime;
begin
 actor:=auth.uid(); if actor is null then raise exception 'AUTH_REQUIRED'; end if;
 select p.role into actor_role from public.profiles p where p.id=actor and p.active=true;
 if actor_role is null then raise exception 'PROFILE_INACTIVE'; end if;
 if person_type='student' and actor_role not in ('developer','principal','teacher') then raise exception 'STUDENT_SCAN_NOT_ALLOWED'; end if;
 if person_type='teacher' and actor_role not in ('developer','principal') then raise exception 'TEACHER_SCAN_NOT_ALLOWED'; end if;
 if person_type='student' then select exists(select 1 from public.students s where s.id=person_id and s.active=true) into target_exists; else select exists(select 1 from public.teachers t where t.id=person_id and t.active=true) into target_exists; end if;
 if not target_exists then raise exception 'PERSON_NOT_FOUND'; end if;
 select early_before_time,late_after_time into cfg_early,cfg_late from public.school_settings order by updated_at desc limit 1;
 if cfg_early is not null and now_time<cfg_early then attendance_status:='early'; elsif cfg_late is not null and now_time>cfg_late then attendance_status:='late'; end if;
 if person_type='student' then insert into public.attendance(attendance_date,attendance_time,kind,status,student_id,teacher_id,scanned_by,source) values(current_date,now(),'student',attendance_status,person_id,null,actor,'qr') on conflict (attendance_date,student_id) where kind='student' and student_id is not null do nothing returning id into new_id;
 else insert into public.attendance(attendance_date,attendance_time,kind,status,student_id,teacher_id,scanned_by,source) values(current_date,now(),'teacher',attendance_status,null,person_id,actor,'qr') on conflict (attendance_date,teacher_id) where kind='teacher' and teacher_id is not null do nothing returning id into new_id; end if;
 if new_id is null then raise exception 'ALREADY_MARKED_TODAY'; end if; return new_id;
end; $$;

drop policy if exists qr_cards_staff_read on public.qr_cards;
drop policy if exists qr_cards_manage on public.qr_cards;
create policy qr_cards_staff_read on public.qr_cards for select to authenticated using ((select public."current_role"()) in ('developer','principal','teacher','parent'));
create policy qr_cards_manage on public.qr_cards for all to authenticated using ((select public."current_role"()) in ('developer','principal')) with check ((select public."current_role"()) in ('developer','principal'));

drop policy if exists tnps_photos_read_own on storage.objects;
drop policy if exists tnps_photos_insert_own on storage.objects;
drop policy if exists tnps_photos_update_own on storage.objects;
drop policy if exists tnps_photos_delete_own on storage.objects;
create policy tnps_photos_read_own on storage.objects for select to authenticated using (bucket_id='tnps-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy tnps_photos_insert_own on storage.objects for insert to authenticated with check (bucket_id='tnps-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy tnps_photos_update_own on storage.objects for update to authenticated using (bucket_id='tnps-photos' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='tnps-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy tnps_photos_delete_own on storage.objects for delete to authenticated using (bucket_id='tnps-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
