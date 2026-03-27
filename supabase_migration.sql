-- ============================================================
-- THC Club Platform — Complete Production Migration
-- Generated: 2026-03-27
-- 
-- Run this ENTIRE script in the Supabase SQL Editor on your
-- new production project. It is idempotent and safe to re-run.
-- ============================================================

-- ============================================================
-- STEP 0: Required Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- STEP 1: Core Tables (in dependency order)
-- ============================================================

-- 1.1 approved_users (must be first — brands FK depends on it)
CREATE TABLE IF NOT EXISTS approved_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password TEXT,                       -- bcryptjs hash
  business_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  first_login TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 brands
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES approved_users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  description TEXT,
  logo_url TEXT,
  instagram_handle TEXT,
  onboarding_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (onboarding_status IN ('pending', 'slot_selected', 'confirmed', 'active', 'rejected')),
  admin_notes TEXT,
  last_interaction_at TIMESTAMPTZ,
  bank_account_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 shelf_bookings
CREATE TABLE IF NOT EXISTS shelf_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  slot_id UUID, -- Updated later after shelf_slots is created
  shelf_type TEXT NOT NULL CHECK (shelf_type IN ('bottom', 'eye_level', 'top_level')),
  duration TEXT NOT NULL CHECK (duration IN ('quarterly', 'half_yearly', 'yearly')),
  slot_number INTEGER,
  monthly_rent NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'expired')),
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'qr_payment', 'cash', 'card', 'fonepay', 'khalti')),
  admin_notes TEXT,
  brand_agreement_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 brand_products
CREATE TABLE IF NOT EXISTS brand_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  category TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,
  brand_id UUID REFERENCES brands(id) ON DELETE RESTRICT,
  created_by TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ppf_rate NUMERIC(5,2),
  ppf_amount NUMERIC(10,2),
  payment_method TEXT DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'card', 'qr', 'transfer')),
  status TEXT NOT NULL DEFAULT 'paid'
    CHECK (status IN ('draft', 'paid', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 invoice_line_items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES brand_products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.7 brand_sales (monthly aggregated)
CREATE TABLE IF NOT EXISTS brand_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  gross_sales NUMERIC(10,2) NOT NULL DEFAULT 0,
  invoice_count INTEGER NOT NULL DEFAULT 0,
  ppf_rate NUMERIC(5,2),
  ppf_amount NUMERIC(10,2) DEFAULT 0,
  rent_waiver_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_id, month, year)
);

-- 1.8 payouts
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  month INTEGER,
  year INTEGER,
  gross_sales NUMERIC(10,2),
  ppf_amount NUMERIC(10,2),
  net_payout NUMERIC(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  admin_notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT u_brand_period UNIQUE (brand_id, month, year)
);

-- 1.9 brand_contracts
CREATE TABLE IF NOT EXISTS brand_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  file_url TEXT NOT NULL,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.10 enquiries
CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'new', 'in_progress', 'rejected', 'on_hold')),
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.11 stock_update_requests
CREATE TABLE IF NOT EXISTS stock_update_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  product_id UUID REFERENCES brand_products(id) ON DELETE CASCADE,
  current_stock INTEGER NOT NULL,
  requested_stock INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.12 brand_change_requests
CREATE TABLE IF NOT EXISTS brand_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('product_add', 'product_update', 'brand_update')),
  target_id UUID,
  new_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'on_hold')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.13 Physical Infrastructure (Forced Reset for target schema)
DROP TABLE IF EXISTS shelf_slots CASCADE;
DROP TABLE IF EXISTS shelves CASCADE;
DROP TABLE IF EXISTS shelf_sections CASCADE;

-- 1.13 shelf_sections (Logical areas of the club)
CREATE TABLE shelf_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.14 shelves (physical shelf units)
CREATE TABLE shelves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  section_id UUID REFERENCES shelf_sections(id) ON DELETE CASCADE,
  is_movable BOOLEAN NOT NULL DEFAULT false,
  size TEXT CHECK (size IN ('small', 'medium', 'large')),
  shelf_type TEXT CHECK (shelf_type IN ('bottom', 'eye_level', 'top_level', 'mixed')),
  total_slots INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.15 shelf_slots (individual slots within shelves)
CREATE TABLE shelf_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shelf_id UUID REFERENCES shelves(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  slot_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'maintenance')),
  shelf_type TEXT NOT NULL,
  shelf_name TEXT, -- Cached for performance
  section TEXT,    -- Cached for performance
  section_id UUID REFERENCES shelf_sections(id) ON DELETE SET NULL,
  occupied_by TEXT,
  booking_id UUID,
  rent_amount NUMERIC(10,2),
  occupied_from DATE,
  occupied_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing column + FK back to shelf_bookings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shelf_bookings' AND column_name = 'slot_id') THEN
        ALTER TABLE shelf_bookings ADD COLUMN slot_id UUID;
    END IF;
END $$;

ALTER TABLE shelf_bookings DROP CONSTRAINT IF EXISTS fk_shelf_bookings_slot;
ALTER TABLE shelf_bookings 
ADD CONSTRAINT fk_shelf_bookings_slot 
FOREIGN KEY (slot_id) REFERENCES shelf_slots(id) ON DELETE SET NULL;

-- 1.15 visit_requests
CREATE TABLE IF NOT EXISTS visit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT,
  visit_purpose TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  number_of_visitors INTEGER NOT NULL DEFAULT 1,
  special_requirements TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 2: Pricing & Configuration Tables
-- ============================================================

-- 2.1 shelf_pricing_tiers
CREATE TABLE IF NOT EXISTS shelf_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duration TEXT NOT NULL UNIQUE CHECK (duration IN ('quarterly', 'half_yearly', 'yearly')),
  bottom_price NUMERIC(10,2) NOT NULL,
  eye_level_price NUMERIC(10,2) NOT NULL,
  top_level_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default pricing
INSERT INTO shelf_pricing_tiers (duration, bottom_price, eye_level_price, top_level_price)
VALUES
  ('quarterly',   1100, 1500, 1350),
  ('half_yearly', 1000, 1350, 1100),
  ('yearly',       900, 1200, 1000)
ON CONFLICT (duration) DO NOTHING;

-- 2.2 ppf_tiers (Platform Partnership Fee tiers)
CREATE TABLE IF NOT EXISTS ppf_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_name TEXT NOT NULL,
  min_sales_amount NUMERIC(10,2) NOT NULL UNIQUE,
  ppf_rate NUMERIC(5,2) NOT NULL,
  rent_waiver_percent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default PPF tiers
INSERT INTO ppf_tiers (tier_name, min_sales_amount, ppf_rate, rent_waiver_percent)
VALUES
  ('Starter',    0,      3,   0),
  ('Silver',     10000,  5,   0),
  ('Gold',       50000,  7,  50),
  ('Platinum',   100000, 10, 100)
ON CONFLICT (min_sales_amount) DO NOTHING;

-- 2.3 promotional_offers
CREATE TABLE IF NOT EXISTS promotional_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  target_limit INTEGER,               -- null = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  promo_code TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 3: Auth & Session Tables
-- ============================================================

-- 3.1 user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES approved_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,         -- bcryptjs hash
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'viewer')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 admin_sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- STEP 4: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_brand_products_brand_id ON brand_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_shelf_bookings_status   ON shelf_bookings(status);
CREATE INDEX IF NOT EXISTS idx_shelf_slots_brand_id    ON shelf_slots(brand_id);
CREATE INDEX IF NOT EXISTS idx_shelf_slots_shelf_id    ON shelf_slots(shelf_id);


-- ============================================================
-- STEP 5: Utility Functions
-- ============================================================

-- 5.1 Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at trigger to ALL relevant tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'brands',
    'shelf_bookings',
    'brand_products',
    'invoices',
    'brand_sales',
    'payouts',
    'brand_contracts',
    'enquiries',
    'stock_update_requests',
    'brand_change_requests',
    'shelf_slots',
    'shelves',
    'shelf_pricing_tiers',
    'ppf_tiers',
    'promotional_offers',
    'visit_requests',
    'approved_users',
    'admin_users'
  ]
  LOOP
    EXECUTE FORMAT(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I;
       CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;


-- ============================================================
-- STEP 6: Business Logic Functions & Triggers
-- ============================================================

-- 6.1 Generate Invoice Number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  seq INTEGER;
  invoice_no TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 2) AS INTEGER)), 0) + 1
  INTO seq
  FROM invoices
  WHERE invoice_number LIKE 'INV-%';

  invoice_no := 'INV-' || LPAD(seq::TEXT, 5, '0');
  RETURN invoice_no;
END;
$$ LANGUAGE plpgsql;

-- 6.2 Update brand_sales on invoice insert
CREATE OR REPLACE FUNCTION update_brand_sales_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
  sale_month INTEGER;
  sale_year INTEGER;
  new_gross NUMERIC(10,2);
  commission NUMERIC(5,2);
  waiver INTEGER;
BEGIN
  sale_month := EXTRACT(MONTH FROM NEW.created_at);
  sale_year  := EXTRACT(YEAR FROM NEW.created_at);

  -- Upsert into brand_sales
  INSERT INTO brand_sales (brand_id, month, year, gross_sales, invoice_count)
  VALUES (NEW.brand_id, sale_month, sale_year, NEW.total_amount, 1)
  ON CONFLICT (brand_id, month, year)
  DO UPDATE SET
    gross_sales   = brand_sales.gross_sales + NEW.total_amount,
    invoice_count = brand_sales.invoice_count + 1,
    updated_at    = NOW();

  -- Recalculate PPF and waiver dynamically
  SELECT gross_sales INTO new_gross
  FROM brand_sales
  WHERE brand_id = NEW.brand_id AND month = sale_month AND year = sale_year;

  -- Default to Starter tier
  commission := 3; waiver := 0;

  -- Find matching PPF tier based on sales volume
  BEGIN
    SELECT ppf_rate, rent_waiver_percent INTO commission, waiver
    FROM ppf_tiers
    WHERE min_sales_amount <= new_gross
    ORDER BY min_sales_amount DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- fallback if ppf_tiers isn't populated yet
  END;

  UPDATE brand_sales
  SET
    ppf_rate            = commission,
    ppf_amount          = ROUND(new_gross * commission / 100, 2),
    rent_waiver_percent = waiver
  WHERE brand_id = NEW.brand_id AND month = sale_month AND year = sale_year;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_brand_sales ON invoices;
CREATE TRIGGER trg_update_brand_sales
AFTER INSERT ON invoices
FOR EACH ROW EXECUTE FUNCTION update_brand_sales_on_invoice();

-- 6.3 Decrement stock on invoice line item insert
CREATE OR REPLACE FUNCTION decrement_stock_on_invoice_item()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE brand_products
  SET
    stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0),
    updated_at = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrement_stock ON invoice_line_items;
CREATE TRIGGER trg_decrement_stock
AFTER INSERT ON invoice_line_items
FOR EACH ROW EXECUTE FUNCTION decrement_stock_on_invoice_item();

-- 6.4 Generate Monthly Payouts
CREATE OR REPLACE FUNCTION generate_monthly_payouts(p_month INTEGER, p_year INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO payouts (brand_id, month, year, gross_sales, ppf_amount, net_payout, status)
  SELECT
    brand_id,
    p_month,
    p_year,
    SUM(gross_sales) as gross_sales,
    SUM(ppf_amount) as ppf_amount,
    SUM(gross_sales - COALESCE(ppf_amount, 0)) as net_payout,
    'pending'
  FROM brand_sales
  WHERE month = p_month AND year = p_year
  GROUP BY brand_id
  ON CONFLICT (brand_id, month, year) DO UPDATE SET
    gross_sales = EXCLUDED.gross_sales,
    ppf_amount  = EXCLUDED.ppf_amount,
    net_payout  = EXCLUDED.net_payout,
    updated_at  = NOW()
  WHERE payouts.status = 'pending';  -- Only update if not already paid
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.5 Increment Offer Uses
CREATE OR REPLACE FUNCTION increment_offer_uses(offer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE promotional_offers
  SET current_uses = current_uses + 1
  WHERE id = offer_id;
END;
$$;


-- ============================================================
-- STEP 7: Auth RPC Functions (SECURITY DEFINER — bypass RLS)
-- ============================================================

-- 7.1 Brand: verify login credentials
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

-- 7.2 Brand: register new account + brand profile atomically
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

-- 7.3 Brand: update login timestamps
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

-- 7.4 Admin: verify login credentials
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

-- 7.5 Admin: update last login
DROP FUNCTION IF EXISTS update_admin_login_time(UUID);
CREATE OR REPLACE FUNCTION update_admin_login_time(p_admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_users SET last_login = NOW() WHERE id = p_admin_id;
END;
$$;


-- ============================================================
-- STEP 8: Row Level Security
-- ============================================================

-- 8.1 Enable RLS on ALL public tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
  LOOP
    EXECUTE FORMAT('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- 8.2 Drop ALL existing policies for a clean slate
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON %I;', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 8.3 Operational tables — allow_all
-- (App-level access control; service_role automatically bypasses RLS)
CREATE POLICY "allow_all" ON brands                FOR ALL USING (true);
CREATE POLICY "allow_all" ON shelf_bookings        FOR ALL USING (true);
CREATE POLICY "allow_all" ON brand_products        FOR ALL USING (true);
CREATE POLICY "allow_all" ON invoices              FOR ALL USING (true);
CREATE POLICY "allow_all" ON invoice_line_items    FOR ALL USING (true);
CREATE POLICY "allow_all" ON brand_sales           FOR ALL USING (true);
CREATE POLICY "allow_all" ON payouts               FOR ALL USING (true);
CREATE POLICY "allow_all" ON shelf_pricing_tiers   FOR ALL USING (true);
CREATE POLICY "allow_all" ON ppf_tiers             FOR ALL USING (true);
CREATE POLICY "allow_all" ON promotional_offers    FOR ALL USING (true);
CREATE POLICY "allow_all" ON stock_update_requests FOR ALL USING (true);
CREATE POLICY "allow_all" ON brand_change_requests FOR ALL USING (true);
CREATE POLICY "allow_all" ON shelves               FOR ALL USING (true);
CREATE POLICY "allow_all" ON shelf_slots           FOR ALL USING (true);
CREATE POLICY "allow_all" ON shelf_sections        FOR ALL USING (true); -- Added missing policy
CREATE POLICY "allow_all" ON brand_contracts       FOR ALL USING (true);
CREATE POLICY "allow_all" ON enquiries             FOR ALL USING (true);
CREATE POLICY "allow_all" ON visit_requests        FOR ALL USING (true);

-- 8.4 Session tables — frontend must read/write these
CREATE POLICY "allow_all" ON user_sessions  FOR ALL USING (true);
CREATE POLICY "allow_all" ON admin_sessions FOR ALL USING (true);

-- 8.5 Credential tables — block ALL direct access (RPCs only)
CREATE POLICY "no_direct_access" ON approved_users FOR ALL USING (false);
CREATE POLICY "no_direct_access" ON admin_users    FOR ALL USING (false);


-- ============================================================
-- STEP 9: Create Your First Admin User
-- ============================================================
-- Generate a bcrypt hash (10 rounds) at https://bcrypt.online/
-- then uncomment and run:
--
-- INSERT INTO admin_users (email, password_hash, name, role, is_active)
-- VALUES (
--   'admin@thcclub.com',
--   '$2a$10$YOUR_BCRYPT_HASH_HERE',
--   'Admin',
--   'super_admin',
--   true
-- )
-- ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;


-- ============================================================
-- DONE ✓
-- ============================================================
