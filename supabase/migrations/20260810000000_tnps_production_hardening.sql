-- TNPS production hardening. This migration mirrors the security fixes applied to the dedicated TNPS Supabase project.

drop policy if exists "leave_requests_self_read" on public.leave_requests;
drop policy if exists "leave_requests_self_create" on public.leave_requests;
drop policy if exists "leave_requests_self_update" on public.leave_requests;
drop policy if exists "leave_requests_principal_manage" on public.leave_requests;
drop policy if exists "notifications_self_read" on public.notifications;
drop policy if exists "notifications_self_update" on public.notifications;
drop policy if exists "classes_staff_read" on public.classes;
drop policy if exists "classes_manage" on public.classes;
drop policy if exists "documents_staff_read" on public.documents;
drop policy if exists "documents_manage" on public.documents;
drop policy if exists "qr_cards_staff_read" on public.qr_cards;
drop policy if exists "qr_cards_manage" on public.qr_cards;

alter table public.leave_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.classes enable row level security;
alter table public.documents enable row level security;
alter table public.qr_cards enable row level security;

create policy "leave_requests_self_read" on public.leave_requests for select to authenticated using (requester_id = auth.uid() or (select "current_role"()) in ('developer','principal'));
create policy "leave_requests_self_create" on public.leave_requests for insert to authenticated with check (requester_id = auth.uid() and (select "current_role"()) in ('teacher','developer','principal'));
create policy "leave_requests_self_update" on public.leave_requests for update to authenticated using (requester_id = auth.uid() and status = 'pending') with check (requester_id = auth.uid() and status = 'pending');
create policy "leave_requests_principal_manage" on public.leave_requests for all to authenticated using ((select "current_role"()) in ('developer','principal')) with check ((select "current_role"()) in ('developer','principal'));
create policy "notifications_self_read" on public.notifications for select to authenticated using (recipient_id = auth.uid() or (select "current_role"()) = 'developer');
create policy "notifications_self_update" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "classes_staff_read" on public.classes for select to authenticated using ((select "current_role"()) in ('developer','principal','teacher','parent'));
create policy "classes_manage" on public.classes for all to authenticated using ((select "current_role"()) in ('developer','principal')) with check ((select "current_role"()) in ('developer','principal'));
create policy "documents_staff_read" on public.documents for select to authenticated using ((select "current_role"()) in ('developer','principal','teacher'));
create policy "documents_manage" on public.documents for all to authenticated using ((select "current_role"()) in ('developer','principal')) with check ((select "current_role"()) in ('developer','principal'));
create policy "qr_cards_staff_read" on public.qr_cards for select to authenticated using ((select "current_role"()) in ('developer','principal','teacher','parent'));
create policy "qr_cards_manage" on public.qr_cards for all to authenticated using ((select "current_role"()) in ('developer','principal')) with check ((select "current_role"()) in ('developer','principal'));

alter function public.calculate_exam_summary(uuid, uuid) security invoker;
alter function public.generate_ticket_number() set search_path = public;
revoke execute on function public.current_role() from anon, authenticated;
revoke execute on function public.can_manage_users() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.set_ticket_status(uuid, text) from anon, authenticated;
