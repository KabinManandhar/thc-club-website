-- ============================================================
-- THE HIDDEN COLLECTIVE • NATIVE AUTH INTEGRATION (ALPHA)
-- ============================================================
-- This migration transitions the app from custom session management 
-- to native Supabase Authentication (GoTrue).
-- 
-- Roles supported:
-- 1. admin (Can access everything)
-- 2. brand (Can access their own data)
-- 3. pending_brand (Waiting for slot selection/approval)

-- 1. EXTEND Brands Table to link to Auth
-- We add 'auth_user_id' to link the public record to the private auth record.
ALTER TABLE brands ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 1.1 Relax legacy constraints (Supabase Auth now handles profiles)
ALTER TABLE admin_users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE brands ALTER COLUMN user_id DROP NOT NULL;

-- 2. CREATE FUNCTION: Sync Auth to Public Profile
-- This function runs when a user confirms their email or signs up.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  -- If the user signed up with 'admin' metadata, link to admin_users
  IF (new.raw_user_meta_data->>'role') IN ('admin', 'super_admin') THEN
    INSERT INTO public.admin_users (email, name, auth_user_id)
    VALUES (
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', 'THC Admin'), 
      new.id
    )
    ON CONFLICT (email) DO UPDATE SET 
      auth_user_id = EXCLUDED.auth_user_id,
      name = COALESCE(EXCLUDED.name, public.admin_users.name);
    
  -- If the user is a brand
  ELSIF (new.raw_user_meta_data->>'role') IN ('brand', 'pending_brand') OR (new.raw_user_meta_data->>'role') IS NULL THEN
    INSERT INTO public.brands (email, business_name, auth_user_id, onboarding_status)
    VALUES (
      new.email, 
      COALESCE(new.raw_user_meta_data->>'business_name', 'New THC Brand'), 
      new.id,
      COALESCE(new.raw_user_meta_data->>'role', 'pending_brand')
    )
    ON CONFLICT (email) DO UPDATE SET 
      auth_user_id = EXCLUDED.auth_user_id,
      business_name = COALESCE(EXCLUDED.business_name, public.brands.business_name);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER for sync
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. NEW SECURE RLS (Using auth.uid())
-- These replace the session-based RPCs for simpler direct querying.

-- Helper: Get user role from JWT metadata
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::text;
$$ LANGUAGE sql STABLE;

-- Redefine RLS Policies
-- First, reset RLS for a clean start
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON %I;', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ADMIN OVERRIDE: Admins can do everything
CREATE POLICY "admin_all_access" ON brands                FOR ALL USING (public.get_auth_role() = 'admin');
CREATE POLICY "admin_all_access" ON brand_products        FOR ALL USING (public.get_auth_role() = 'admin');
CREATE POLICY "admin_all_access" ON shelf_bookings        FOR ALL USING (public.get_auth_role() = 'admin');
CREATE POLICY "admin_all_access" ON invoices              FOR ALL USING (public.get_auth_role() = 'admin');
CREATE POLICY "admin_all_access" ON payouts               FOR ALL USING (public.get_auth_role() = 'admin');

-- BRAND OWNER ACCESS: Restricted by auth.uid()
CREATE POLICY "brand_owner_access" ON brands 
  FOR ALL USING (auth_user_id = auth.uid());

CREATE POLICY "brand_product_access" ON brand_products
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE auth_user_id = auth.uid()));

CREATE POLICY "brand_booking_access" ON shelf_bookings
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE auth_user_id = auth.uid()));

CREATE POLICY "brand_payout_access" ON payouts
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE auth_user_id = auth.uid()));

CREATE POLICY "brand_invoice_access" ON invoices
  FOR ALL USING (brand_id IN (SELECT id FROM brands WHERE auth_user_id = auth.uid()));

-- PENDING BRAND ACCESS: (Limited visibility)
-- They can see their own brand record to check status, but nothing else.
CREATE POLICY "pending_brand_status" ON brands
  FOR SELECT USING (auth_user_id = auth.uid());
