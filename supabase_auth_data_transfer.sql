-- ============================================================
-- THE HIDDEN COLLECTIVE • DATA TRANSFER (Custom Auth -> Native Auth)
-- ============================================================
-- IMPORTANT: This script inserts into 'auth.users' which is usually managed
-- by Supabase. Run this with Caution to sync your legacy brands to Native Auth.

-- 1. Create a temporary function to safely migrate users
CREATE OR REPLACE FUNCTION migrate_legacy_users()
RETURNS void AS $$
BEGIN

  -- A. MIGRATE ADMINS
  INSERT INTO auth.users (
    id, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    is_sso_user, created_at, updated_at, role, instance_id
  )
  SELECT 
    a.id, a.email, a.password_hash, 
    NOW(), '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('role', 'admin', 'full_name', a.name), 
    false, a.created_at, NOW(), 'authenticated', '00000000-0000-0000-0000-000000000000'
  FROM public.admin_users a
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = a.email);

  -- B. MIGRATE APPROVED BRANDS
  INSERT INTO auth.users (
    id, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    is_sso_user, created_at, updated_at, role, instance_id
  )
  SELECT 
    au.id, au.email, au.password, 
    NOW(), '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('role', 'brand', 'business_name', au.business_name), 
    false, au.created_at, NOW(), 'authenticated', '00000000-0000-0000-0000-000000000000'
  FROM public.approved_users au
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = au.email);

  -- C. UPDATE CORRESPONDING PUBLIC TABLES WITH AUTH LINKS
  UPDATE public.brands b
  SET auth_user_id = b.user_id -- Since user_id was already the primary ID for current custom auth
  WHERE b.auth_user_id IS NULL;

  UPDATE public.admin_users a
  SET auth_user_id = a.id
  WHERE a.auth_user_id IS NULL;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Execute migration
SELECT migrate_legacy_users();

-- 3. Cleanup
DROP FUNCTION migrate_legacy_users();


-- ============================================================
-- UPDATED SECURITY POLICIES (Alpha Hardening)
-- ============================================================

-- Function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin';
$$ LANGUAGE sql STABLE;

-- Function to check if the current user is a specific brand
CREATE OR REPLACE FUNCTION public.is_brand_owner(target_brand_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brands
    WHERE id = target_brand_id
    AND auth_user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE;

-- Redefine Critical RLS Policies using these secure helpers
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_brand_access" ON brands;
CREATE POLICY "admin_full_brand_access" ON brands
  FOR ALL TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "brand_owner_self_access" ON brands;
CREATE POLICY "brand_owner_self_access" ON brands
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- SALES PROTECTION
ALTER TABLE brand_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_sales_access" ON brand_sales;
CREATE POLICY "admin_sales_access" ON brand_sales
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "brand_sales_access" ON brand_sales;
CREATE POLICY "brand_sales_access" ON brand_sales
  FOR SELECT TO authenticated
  USING (public.is_brand_owner(brand_id));

-- PAYOUT PROTECTION
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_payout_access" ON payouts;
CREATE POLICY "admin_payout_access" ON payouts
  FOR ALL TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "brand_payout_access" ON payouts;
CREATE POLICY "brand_payout_access" ON payouts
  FOR SELECT TO authenticated
  USING (public.is_brand_owner(brand_id));
