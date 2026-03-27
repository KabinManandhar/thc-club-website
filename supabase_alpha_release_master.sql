-- ============================================================
-- THE HIDDEN COLLECTIVE • ALPHA RELEASE MASTER (INTERNAL AUTH)
-- ============================================================
-- VERSION: 5.0 (No Supabase Auth Dependencies)
-- This script performs a TOTAL FACTORY RESET and rebuilds the 
-- platform as a standalone, internal identity system.
-- ============================================================

-- PART 0: NUCLEAR WIPE (Full Environment Reset)
------------------------------------------------------------
SET search_path TO public, extensions;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_owner(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.verify_admin_password(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.verify_brand_password(UUID, TEXT) CASCADE;

-- Drop all tables (Cascading)
DROP TABLE IF EXISTS public.admin_sessions CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.payouts CASCADE;
DROP TABLE IF EXISTS public.brand_sales CASCADE;
DROP TABLE IF EXISTS public.invoice_line_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.stock_update_requests CASCADE;
DROP TABLE IF EXISTS public.brand_change_requests CASCADE;
DROP TABLE IF EXISTS public.brand_products CASCADE;
DROP TABLE IF EXISTS public.shelf_bookings CASCADE;
DROP TABLE IF EXISTS public.shelf_slots CASCADE;
DROP TABLE IF EXISTS public.shelves CASCADE;
DROP TABLE IF EXISTS public.shelf_sections CASCADE;
DROP TABLE IF EXISTS public.shelf_pricing_tiers CASCADE;
DROP TABLE IF EXISTS public.ppf_tiers CASCADE;
DROP TABLE IF EXISTS public.promotional_offers CASCADE;
DROP TABLE IF EXISTS public.brand_contracts CASCADE;
DROP TABLE IF EXISTS public.enquiries CASCADE;
DROP TABLE IF EXISTS public.visit_requests CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.approved_users CASCADE;

-- PART 1: INTERNAL IDENTITY SCHEMA
------------------------------------------------------------

-- 1.1 Admin Terminal Users
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- 1.2 Brand Collective Users
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  description TEXT,
  logo_url TEXT,
  instagram_handle TEXT,
  onboarding_status TEXT DEFAULT 'pending' 
    CHECK (onboarding_status IN ('pending', 'active', 'rejected')),
  bank_account_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 Session Tracking (Bypasses Supabase Auth)
CREATE TABLE public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.admin_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PART 2: CORE BUSINESS INFRASTRUCTURE
------------------------------------------------------------

CREATE TABLE public.shelf_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE public.shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  section_id UUID REFERENCES public.shelf_sections(id) ON DELETE CASCADE,
  total_slots INTEGER DEFAULT 0,
  shelf_type TEXT
);

CREATE TABLE public.shelf_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id UUID REFERENCES public.shelves(id) ON DELETE CASCADE,
  slot_number INTEGER,
  status TEXT DEFAULT 'available',
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  shelf_type TEXT,
  shelf_name TEXT,
  section TEXT,
  section_id UUID
);

CREATE TABLE public.brand_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  total_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.brand_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  line_total NUMERIC(10,2) NOT NULL
);

CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  gross_sales NUMERIC(10,2) DEFAULT 0,
  ppf_amount NUMERIC(10,2) DEFAULT 0,
  net_payout NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PART 3: AUTHENTICATION RPCs (Security Definers)
------------------------------------------------------------

-- 3.1 Verify Internal Admin Password
CREATE OR REPLACE FUNCTION public.verify_admin_password(o_email TEXT, p_password TEXT)
RETURNS TABLE (id UUID, email TEXT, name TEXT, role TEXT, is_active BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.email, a.name, a.role, a.is_active
  FROM public.admin_users a
  WHERE a.email = LOWER(o_email) 
    AND a.password_hash = extensions.crypt(p_password, a.password_hash)
    AND a.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Verify Internal Brand Password
CREATE OR REPLACE FUNCTION public.verify_brand_password(o_email TEXT, p_password TEXT)
RETURNS TABLE (id UUID, email TEXT, business_name TEXT, onboarding_status TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.email, b.business_name, b.onboarding_status
  FROM public.brands b
  WHERE b.email = LOWER(o_email) 
    AND b.password_hash = extensions.crypt(p_password, b.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.3 Utility: Generate Secure Hash
CREATE OR REPLACE FUNCTION public.generate_password_hash(p_password TEXT)
RETURNS TEXT AS $$
  SELECT extensions.crypt(p_password, extensions.gen_salt('bf', 10));
$$ LANGUAGE sql SECURITY DEFINER;

-- PART 4: ADMIN POWER TOOLS
------------------------------------------------------------

-- 4.1 The Nuclear Deletion tool (Internal Version)
CREATE OR REPLACE FUNCTION public.delete_brand_entirely(p_brand_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.invoice_line_items WHERE invoice_id IN (SELECT id FROM public.invoices WHERE brand_id = p_brand_id);
    DELETE FROM public.invoices WHERE brand_id = p_brand_id;
    DELETE FROM public.payouts WHERE brand_id = p_brand_id;
    DELETE FROM public.shelf_slots WHERE brand_id = p_brand_id;
    DELETE FROM public.brand_products WHERE brand_id = p_brand_id;
    DELETE FROM public.brands WHERE id = p_brand_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PART 5: PHYSICAL SEEDING
------------------------------------------------------------

-- 5.1 Root Admin (Password: qweqweqwe123)
-- Uses 10-round Bcrypt
INSERT INTO public.admin_users (email, password_hash, name, role)
VALUES (
  'admin@thcclub.com',
  extensions.crypt('qweqweqwe123', extensions.gen_salt('bf', 10)),
  'THC Super Admin',
  'super_admin'
);

-- 5.2 Store Infrastructure

INSERT INTO public.shelf_sections (name, description) VALUES
('Cafe Section', 'Main open area with high visibility'),
('Room One', 'First specialized branding zone'),
('Room Two', 'Second specialized branding zone'),
('Corridor Wall', 'High-traffic passage area');

-- 4.2 Seed shelves and link to sections
DO $$
DECLARE
    section_cafe_id UUID;
    section_room1_id UUID;
    section_room2_id UUID;
    section_corridor_id UUID;
    v_shelf_record RECORD;
    i INTEGER;
BEGIN
    -- Cache Section IDs
    SELECT id INTO section_cafe_id FROM shelf_sections WHERE name = 'Cafe Section';
    SELECT id INTO section_room1_id FROM shelf_sections WHERE name = 'Room One';
    SELECT id INTO section_room2_id FROM shelf_sections WHERE name = 'Room Two';
    SELECT id INTO section_corridor_id FROM shelf_sections WHERE name = 'Corridor Wall';

    -- Create Shelves
    INSERT INTO shelves (name, section_id, total_slots, shelf_type) VALUES
    ('Shelf 1', section_cafe_id, 6, 'mixed'),
    ('Shelf 2', section_cafe_id, 6, 'mixed'),
    ('Shelf 3', section_room1_id, 6, 'mixed'),
    ('Shelf 4', section_room2_id, 6, 'mixed'),
    ('Wall Shelf 1', section_corridor_id, 4, 'eye_level');

    -- Auto-generate Slots based on Shelf Capacity
    FOR v_shelf_record IN (SELECT id, total_slots, shelf_type, name FROM shelves) LOOP
        FOR i IN 1..v_shelf_record.total_slots LOOP
            INSERT INTO shelf_slots (
                shelf_id, 
                slot_number, 
                shelf_type, 
                status, 
                shelf_name, 
                section, 
                section_id
            ) 
            SELECT 
                v_shelf_record.id, 
                i, 
                v_shelf_record.shelf_type, 
                'available',
                v_shelf_record.name,
                s.name,
                s.id
            FROM shelves sh 
            JOIN shelf_sections s ON sh.section_id = s.id 
            WHERE sh.id = v_shelf_record.id;
        END LOOP;
    END LOOP;
END $$;


-- PART 6: PERMISSIONS FOR ALPHA
------------------------------------------------------------
-- Temporarily disabling RLS to ensure fast Alpha stability with internal auth
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
