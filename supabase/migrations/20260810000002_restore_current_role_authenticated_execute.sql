-- Restore the EXECUTE privilege required by authenticated RLS policies.
-- public.current_role() is SECURITY DEFINER and intentionally safe for use in RLS.
-- The previous production-hardening migration revoked EXECUTE from authenticated,
-- which caused profile/authenticated queries to fail with:
-- "permission denied for function current_role".
grant execute on function public.current_role() to authenticated;
revoke execute on function public.current_role() from anon;
