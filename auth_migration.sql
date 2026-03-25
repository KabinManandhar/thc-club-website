-- ============================================================
-- THC Club — Auth & Security Migration (FINAL)
-- Run this ENTIRE script in Supabase SQL Editor.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- ============================================================
-- STEP 1: Auth Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS approved_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password TEXT,              -- bcryptjs hash (frontend hashed)
  business_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  first_login TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE approved_users ADD COLUMN IF NOT EXISTS first_login TIMESTAMPTZ;
ALTER TABLE approved_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES approved_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate old UUID column to TEXT if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_sessions' AND column_name = 'session_token'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE user_sessions ALTER COLUMN session_token TYPE TEXT USING session_token::TEXT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,  -- bcryptjs hash (frontend hashed)
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'viewer')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate old UUID column to TEXT if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_sessions' AND column_name = 'session_token'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE admin_sessions ALTER COLUMN session_token TYPE TEXT USING session_token::TEXT;
  END IF;
END $$;

-- ============================================================
-- STEP 2: Enable RLS on all tables
-- ============================================================

DO $$ 
DECLARE t TEXT;
BEGIN
  FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
  LOOP
    EXECUTE FORMAT('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- ============================================================
-- STEP 3: Drop ALL existing policies and recreate cleanly
-- ============================================================

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON %I;', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- STEP 4: RLS Policies
-- STRATEGY:
--   - Operational tables: allow_all (app-level access control)
--   - Session tables: allow_all (frontend needs read/write)
--   - Credential tables: BLOCK all direct access (RPCs only)
-- ============================================================

-- Operational tables
CREATE POLICY "allow_all" ON brands FOR ALL USING (true);
CREATE POLICY "allow_all" ON shelf_bookings FOR ALL USING (true);
CREATE POLICY "allow_all" ON brand_products FOR ALL USING (true);
CREATE POLICY "allow_all" ON invoices FOR ALL USING (true);
CREATE POLICY "allow_all" ON invoice_line_items FOR ALL USING (true);
CREATE POLICY "allow_all" ON brand_sales FOR ALL USING (true);
CREATE POLICY "allow_all" ON payouts FOR ALL USING (true);
CREATE POLICY "allow_all" ON shelf_pricing_tiers FOR ALL USING (true);
CREATE POLICY "allow_all" ON ppf_tiers FOR ALL USING (true);
CREATE POLICY "allow_all" ON promotional_offers FOR ALL USING (true);
CREATE POLICY "allow_all" ON stock_update_requests FOR ALL USING (true);
CREATE POLICY "allow_all" ON brand_change_requests FOR ALL USING (true);
CREATE POLICY "allow_all" ON shelves FOR ALL USING (true);
CREATE POLICY "allow_all" ON shelf_slots FOR ALL USING (true);
CREATE POLICY "allow_all" ON brand_contracts FOR ALL USING (true);
CREATE POLICY "allow_all" ON enquiries FOR ALL USING (true);

-- Session tables (frontend must read/write these)
CREATE POLICY "allow_all" ON user_sessions FOR ALL USING (true);
CREATE POLICY "allow_all" ON admin_sessions FOR ALL USING (true);

-- Credential tables: block ALL direct access — only RPCs can touch these
CREATE POLICY "no_direct_access" ON approved_users FOR ALL USING (false);
CREATE POLICY "no_direct_access" ON admin_users FOR ALL USING (false);

-- ============================================================
-- STEP 5: Promo code column
-- ============================================================
ALTER TABLE promotional_offers ADD COLUMN IF NOT EXISTS promo_code TEXT UNIQUE;

-- ============================================================
-- STEP 6: RPCs — Auth Bridges (SECURITY DEFINER bypasses RLS)
-- ============================================================

-- Brand: verify login credentials
DROP FUNCTION IF EXISTS verify_user_login(TEXT);
CREATE OR REPLACE FUNCTION verify_user_login(p_email TEXT)
RETURNS TABLE (
  id UUID, email TEXT, password TEXT,
  business_name TEXT, is_active BOOLEAN,
  first_login TIMESTAMPTZ, last_login TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.password, u.business_name,
         u.is_active, u.first_login, u.last_login
  FROM approved_users u
  WHERE LOWER(u.email) = LOWER(p_email) AND u.is_active = true;
END;
$$;

-- Brand: register new account + brand profile atomically
DROP FUNCTION IF EXISTS register_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION register_user(
  p_email TEXT,
  p_password_hash TEXT,
  p_business_name TEXT,
  p_phone TEXT,
  p_description TEXT,
  p_social_handle TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM approved_users WHERE LOWER(email) = LOWER(p_email)) THEN
    RETURN jsonb_build_object('error', 'An account with this email already exists');
  END IF;

  INSERT INTO approved_users (email, password, business_name, is_active)
  VALUES (LOWER(p_email), p_password_hash, p_business_name, true)
  RETURNING id INTO v_user_id;

  INSERT INTO brands (user_id, email, business_name, phone, description, instagram_handle, onboarding_status)
  VALUES (v_user_id, LOWER(p_email), p_business_name, p_phone, p_description, p_social_handle, 'pending');

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id::TEXT);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Brand: update login timestamps after successful login
DROP FUNCTION IF EXISTS update_user_login_time(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION update_user_login_time(p_user_id UUID, p_is_first_login BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF p_is_first_login THEN
    UPDATE approved_users SET last_login = NOW(), first_login = NOW() WHERE id = p_user_id;
  ELSE
    UPDATE approved_users SET last_login = NOW() WHERE id = p_user_id;
  END IF;
END;
$$;

-- Admin: verify login credentials
DROP FUNCTION IF EXISTS verify_admin_login(TEXT);
CREATE OR REPLACE FUNCTION verify_admin_login(p_email TEXT)
RETURNS TABLE (
  id UUID, email TEXT, password_hash TEXT,
  name TEXT, role TEXT, is_active BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.email, a.password_hash, a.name, a.role, a.is_active
  FROM admin_users a
  WHERE LOWER(a.email) = LOWER(p_email) AND a.is_active = true;
END;
$$;

-- Admin: update last login
DROP FUNCTION IF EXISTS update_admin_login_time(UUID);
CREATE OR REPLACE FUNCTION update_admin_login_time(p_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_users SET last_login = NOW() WHERE id = p_admin_id;
END;
$$;

-- Offers: increment use count
DROP FUNCTION IF EXISTS increment_offer_uses(UUID);
CREATE OR REPLACE FUNCTION increment_offer_uses(offer_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE promotional_offers SET current_uses = current_uses + 1 WHERE id = offer_id;
END;
$$;

-- ============================================================
-- DONE
-- ============================================================
-- To create your first admin user, generate a bcrypt hash of your
-- password using https://bcrypt.online/ (10 rounds), then run:
--
-- INSERT INTO admin_users (email, password_hash, name, role, is_active)
-- VALUES ('admin@thcclub.com', '$2a$10$YOUR_HASH_HERE', 'Admin', 'super_admin', true)
-- ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
-- ============================================================
