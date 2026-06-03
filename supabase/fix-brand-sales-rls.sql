-- Run this in your Supabase SQL Editor to fix the RLS issue for brand_sales

-- Enable RLS on brand_sales if not already enabled
alter table public.brand_sales enable row level security;

-- Drop existing policies if any to prevent conflicts
drop policy if exists "staff_pos_select_brand_sales" on public.brand_sales;
drop policy if exists "staff_pos_insert_brand_sales" on public.brand_sales;
drop policy if exists "staff_pos_update_brand_sales" on public.brand_sales;

-- Allow active staff and admins to select from brand_sales
create policy "staff_pos_select_brand_sales"
  on public.brand_sales for select to authenticated
  using (public.is_active_staff() OR public.is_active_admin());

-- Allow active staff and admins to insert into brand_sales
create policy "staff_pos_insert_brand_sales"
  on public.brand_sales for insert to authenticated
  with check (public.is_active_staff() OR public.is_active_admin());

-- Allow active staff and admins to update brand_sales
create policy "staff_pos_update_brand_sales"
  on public.brand_sales for update to authenticated
  using (public.is_active_staff() OR public.is_active_admin())
  with check (public.is_active_staff() OR public.is_active_admin());

-- (Optional) If you have a trigger on invoices or invoice_line_items that inserts into brand_sales,
-- you can also alter that trigger function to run with SECURITY DEFINER so it bypasses RLS:
-- alter function public.your_trigger_function_name() security definer;
