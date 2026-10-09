-- Run in Supabase SQL Editor (after admin-staff-management.sql and staff-pos-setup.sql).
-- Idempotent. Only ADDS permissive policies, so it can only widen access, never remove it:
--   * active admins (super_admin/admin) can read/write the tables the admin panel uses directly
--   * brand owners can read their own sales data
--     (fix-brand-sales-rls.sql enabled RLS on brand_sales with staff/admin-only policies,
--      which hid sales/payout numbers from the brand portal)
-- POS invoice writes now go through /api/pos/invoices with the service role and don't need these.

-- Ownership = the caller's *confirmed* auth email matches brands.email.
-- Read from auth.users (not the JWT claim) and require email_confirmed_at, so an
-- unverified signup using someone else's address can't claim their brand.
-- ponytail: email-based link (the app keys brands by email); upgrade to a brands.owner_user_id = auth.uid() column.
create or replace function public.owns_brand(p_brand_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.brands b
    join auth.users u on u.id = auth.uid()
    where b.id = p_brand_id
      and u.email_confirmed_at is not null
      and lower(b.email) = lower(u.email)
  );
$$;

grant execute on function public.owns_brand(uuid) to authenticated;

-- Ownership hangs on brands.email, so non-admins must not be able to point a brand at
-- another address: on insert it must be their own login email, and it can't be changed after.
-- Invoker (not definer) so current_user is the real caller: only browser/API roles are
-- constrained; service_role, auth triggers and the SQL editor pass through.
create or replace function public.guard_brand_email()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if current_user = 'anon' then
    raise exception 'sign in required';
  end if;
  if public.is_active_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    -- JWT email is signed by Supabase Auth; owns_brand() additionally requires it to be confirmed.
    if lower(new.email) is distinct from lower(auth.jwt() ->> 'email') then
      raise exception 'brand email must match your login email';
    end if;
  elsif lower(new.email) is distinct from lower(old.email) then
    raise exception 'brand email can only be changed by an admin';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_brand_email on public.brands;
create trigger guard_brand_email
  before insert or update of email on public.brands
  for each row execute function public.guard_brand_email();

-- Admin full access ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'brands', 'brand_products', 'invoices', 'invoice_line_items',
    'product_stock_logs', 'brand_sales', 'brand_settlements', 'shelf_bookings',
    'promotional_offers', 'shelf_pricing_tiers', 'ppf_tiers'
  ] loop
    execute format('drop policy if exists "admin_all_%1$s" on public.%1$I', t);
    execute format(
      'create policy "admin_all_%1$s" on public.%1$I for all to authenticated
         using (public.is_active_admin()) with check (public.is_active_admin())', t);
  end loop;
end $$;

-- Brand owner read access to their own sales data --------------------------------
drop policy if exists "owner_select_brand_sales" on public.brand_sales;
create policy "owner_select_brand_sales"
  on public.brand_sales for select to authenticated
  using (public.owns_brand(brand_id));

drop policy if exists "owner_select_invoices" on public.invoices;
create policy "owner_select_invoices"
  on public.invoices for select to authenticated
  using (public.owns_brand(brand_id));

drop policy if exists "owner_select_invoice_line_items" on public.invoice_line_items;
create policy "owner_select_invoice_line_items"
  on public.invoice_line_items for select to authenticated
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_line_items.invoice_id and public.owns_brand(i.brand_id)
  ));

-- Sanity check: should list the new policies.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and (policyname like 'admin_all_%' or policyname like 'owner_select_%')
order by tablename, policyname;
