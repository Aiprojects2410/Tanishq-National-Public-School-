-- TNPS login enhancement: allow existing TNPS accounts to resolve a
-- Teacher ID or Student ID to the email identity used by Supabase Auth.
-- Parent accounts created for a student also resolve through that student's ID.

create or replace function public.resolve_tnps_login_identifier(p_identifier text)
returns table(email text)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare v text := lower(trim(coalesce(p_identifier,'')));
begin
  if v = '' or position('@' in v) > 0 then
    return;
  end if;

  return query
    select distinct u.email::text
    from auth.users u
    join public.teachers t on t.auth_user_id = u.id
    where t.active = true
      and lower(t.teacher_id) = v
      and u.email is not null

    union

    select distinct u.email::text
    from auth.users u
    join public.students s on s.auth_user_id = u.id
    where s.active = true
      and lower(s.student_id) = v
      and u.email is not null

    union

    select distinct u.email::text
    from auth.users u
    join public.parents p on p.profile_id = u.id
    join public.profiles pr on pr.id = p.profile_id
    join public.students s on s.id = p.student_id
    where pr.role = 'parent'
      and pr.active = true
      and s.active = true
      and lower(s.student_id) = v
      and u.email is not null;
end;
$$;

revoke execute on function public.resolve_tnps_login_identifier(text) from public;
grant execute on function public.resolve_tnps_login_identifier(text) to anon, authenticated;
