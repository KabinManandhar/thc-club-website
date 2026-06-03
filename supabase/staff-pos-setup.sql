-- Run in Supabase SQL Editor to enable Staff POS (/pos)
-- 1) Create staff_users table (mirror of admin_users pattern)
-- 2) Relax invoices.created_by FK if it only references admin_users
-- 3) Add RLS policies so authenticated staff can run POS reads/writes

-- ---------------------------------------------------------------------------
-- staff_users
-- ---------------------------------------------------------------------------
create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_users enable row level security;

-- Staff can read their own row; service role / migrations manage inserts
drop policy if exists "staff_users_select_own" on public.staff_users;
create policy "staff_users_select_own"
  on public.staff_users
  for select
  to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- ---------------------------------------------------------------------------
-- Optional: track last login (called from app)
-- ---------------------------------------------------------------------------
create or replace function public.update_staff_login_time(p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.staff_users
  set last_login_at = now(), updated_at = now()
  where id = p_staff_id and is_active = true;
end;
$$;

grant execute on function public.update_staff_login_time(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- invoices.created_by: allow staff UUIDs (drop admin-only FK if present)
-- ---------------------------------------------------------------------------
do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'invoices'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'created_by';

  if fk_name is not null then
    execute format('alter table public.invoices drop constraint %I', fk_name);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: POS read/write for authenticated staff (email in staff_users)
-- ---------------------------------------------------------------------------
create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_users s
    where lower(s.email) = lower(auth.jwt() ->> 'email')
      and s.is_active = true
  );
$$;

grant execute on function public.is_active_staff() to authenticated;

-- invoice number RPC (if not already granted to authenticated)
grant execute on function public.generate_invoice_number() to authenticated;

-- brands (active catalog)
drop policy if exists "staff_pos_select_brands" on public.brands;
create policy "staff_pos_select_brands"
  on public.brands for select to authenticated
  using (public.is_active_staff());

-- products
drop policy if exists "staff_pos_select_products" on public.brand_products;
create policy "staff_pos_select_products"
  on public.brand_products for select to authenticated
  using (public.is_active_staff());

drop policy if exists "staff_pos_update_products" on public.brand_products;
create policy "staff_pos_update_products"
  on public.brand_products for update to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- ppf tiers
drop policy if exists "staff_pos_select_ppf" on public.ppf_tiers;
create policy "staff_pos_select_ppf"
  on public.ppf_tiers for select to authenticated
  using (public.is_active_staff());

-- invoices + line items + stock logs
drop policy if exists "staff_pos_insert_invoices" on public.invoices;
create policy "staff_pos_insert_invoices"
  on public.invoices for insert to authenticated
  with check (public.is_active_staff());

drop policy if exists "staff_pos_insert_line_items" on public.invoice_line_items;
create policy "staff_pos_insert_line_items"
  on public.invoice_line_items for insert to authenticated
  with check (public.is_active_staff());

drop policy if exists "staff_pos_insert_stock_logs" on public.product_stock_logs;
create policy "staff_pos_insert_stock_logs"
  on public.product_stock_logs for insert to authenticated
  with check (public.is_active_staff());

-- read today's sales (all store invoices for active staff)
drop policy if exists "staff_pos_select_invoices" on public.invoices;
create policy "staff_pos_select_invoices"
  on public.invoices for select to authenticated
  using (public.is_active_staff());

drop policy if exists "staff_pos_select_line_items" on public.invoice_line_items;
create policy "staff_pos_select_line_items"
  on public.invoice_line_items for select to authenticated
  using (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- Seed example staff row (replace email; create matching Supabase Auth user)
-- ---------------------------------------------------------------------------
-- insert into public.staff_users (email, name, is_active)
-- values ('pos@thcclub.com', 'Store Staff', true)
-- on conflict (email) do nothing;
