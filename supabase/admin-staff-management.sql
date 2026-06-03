-- Admin read access to staff roster (for Staff Accounts UI via authenticated admin session)
-- Staff creation uses the API route with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where lower(a.email) = lower(auth.jwt() ->> 'email')
      and a.is_active = true
      and a.role in ('super_admin', 'admin')
  );
$$;

grant execute on function public.is_active_admin() to authenticated;

drop policy if exists "admin_select_staff_users" on public.staff_users;
create policy "admin_select_staff_users"
  on public.staff_users
  for select
  to authenticated
  using (public.is_active_admin());
