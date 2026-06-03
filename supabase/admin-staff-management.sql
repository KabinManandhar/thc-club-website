-- Admin read access to staff roster (for Staff Accounts UI via authenticated admin session)
-- Staff creation uses the API route with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

-- Verifies the caller JWT is an active admin (used by /api/admin/staff)
create or replace function public.verify_admin_manager()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  r record;
begin
  if v_email is null or v_email = '' then
    return json_build_object('ok', false, 'reason', 'no_jwt_email');
  end if;

  select id, email, role, is_active
  into r
  from public.admin_users
  where lower(email) = v_email
  limit 1;

  if not found then
    return json_build_object('ok', false, 'reason', 'not_in_admin_users', 'email', v_email);
  end if;

  if not r.is_active then
    return json_build_object('ok', false, 'reason', 'inactive');
  end if;

  if r.role = 'viewer' then
    return json_build_object('ok', false, 'reason', 'viewer');
  end if;

  return json_build_object(
    'ok', true,
    'admin', json_build_object(
      'id', r.id,
      'email', r.email,
      'role', r.role,
      'is_active', r.is_active
    )
  );
end;
$$;

grant execute on function public.verify_admin_manager() to authenticated;

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

-- Allow admins to read their own row (used by client-side admin login check)
drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own"
  on public.admin_users
  for select
  to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "admin_select_staff_users" on public.staff_users;
create policy "admin_select_staff_users"
  on public.staff_users
  for select
  to authenticated
  using (public.is_active_admin());
