-- ============================================================
-- THE HIDDEN COLLECTIVE • FULL ALPHA REINSTALLATION MASTER
-- ============================================================
-- WARNING: This script DROPS all existing data and tables and performs 
-- a clean, production-ready installation. Use with EXTREME CAUTION.

-- 0. PRE-INSTALL CLEANUP (DROPPING ALL TO ENSURE CLEAN SLATE)
------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all RLS policies
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE FORMAT('DROP POLICY IF EXISTS %I ON %I;', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Drop all triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_owner(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.delete_brand_entirely(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_product_performance_secure(UUID) CASCADE;

-- Drop all public tables (Atomic Reset)
DROP TABLE IF EXISTS public.payouts CASCADE;
DROP TABLE IF EXISTS public.brand_sales CASCADE;
DROP TABLE IF EXISTS public.invoice_line_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.brand_products CASCADE;
DROP TABLE IF EXISTS public.shelf_bookings CASCADE;
DROP TABLE IF EXISTS public.shelf_slots CASCADE;
DROP TABLE IF EXISTS public.shelves CASCADE;
DROP TABLE IF EXISTS public.shelf_sections CASCADE;
DROP TABLE IF EXISTS public.shelf_pricing_tiers CASCADE;
DROP TABLE IF EXISTS public.ppf_tiers CASCADE;
DROP TABLE IF EXISTS public.promotional_offers CASCADE;
DROP TABLE IF EXISTS public.stock_update_requests CASCADE;
DROP TABLE IF EXISTS public.brand_change_requests CASCADE;
DROP TABLE IF EXISTS public.enquiries CASCADE;
DROP TABLE IF EXISTS public.visit_requests CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.approved_users CASCADE;
DROP TABLE IF EXISTS public.admin_sessions CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- 1. CORE TABLE CREATION (Production Schema)
------------------------------------------------------------

-- 1.1 admin_users
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT, -- Optional, Supabase Auth handles it now
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'viewer')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 approved_users (Legacy Compatibility)
CREATE TABLE public.approved_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  business_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 brands
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.approved_users(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  contact_name TEXT,
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

-- 1.4 Infrastructure (Sections, Shelves, Slots)
CREATE TABLE public.shelf_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section_id UUID REFERENCES public.shelf_sections(id) ON DELETE CASCADE,
  is_movable BOOLEAN NOT NULL DEFAULT false,
  size TEXT CHECK (size IN ('small', 'medium', 'large')),
  shelf_type TEXT CHECK (shelf_type IN ('bottom', 'eye_level', 'top_level', 'mixed')),
  total_slots INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.shelf_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id UUID REFERENCES public.shelves(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  slot_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  shelf_type TEXT NOT NULL,
  shelf_name TEXT,
  section TEXT,
  section_id UUID REFERENCES public.shelf_sections(id) ON DELETE SET NULL,
  booking_id UUID,
  rent_amount NUMERIC(10,2),
  occupied_from DATE,
  occupied_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 Commercial Tables (Products, Invoices, Sales)
CREATE TABLE public.brand_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'paid' CHECK (status IN ('draft', 'paid', 'refunded')),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.brand_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.brand_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  gross_sales NUMERIC(10,2) DEFAULT 0,
  invoice_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- PART 6: BUSINESS LOGIC & AUTOMATIONS
------------------------------------------------------------

-- 6.1 Stock Auto-Decrement
CREATE OR REPLACE FUNCTION public.decrement_stock_on_invoice_item()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.brand_products
  SET stock_quantity = GREATEST(stock_quantity - NEW.quantity, 0)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_decrement_stock
AFTER INSERT ON public.invoice_line_items
FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_invoice_item();

-- 6.2 Admin: Monthly Payout Generation
-- Securely aggregates sales for a specific period
CREATE OR REPLACE FUNCTION public.generate_monthly_payouts(p_month INTEGER, p_year INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Security check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Admin authorization required for payout generation.';
  END IF;

  INSERT INTO public.payouts (brand_id, month, year, gross_sales, ppf_amount, net_payout, status)
  SELECT
    brand_id,
    p_month,
    p_year,
    SUM(gross_sales) as gross_sales,
    SUM(ppf_amount) as ppf_amount,
    SUM(gross_sales - COALESCE(ppf_amount, 0)) as net_payout,
    'pending'
  FROM public.brand_sales
  WHERE month = p_month AND year = p_year
  GROUP BY brand_id
  ON CONFLICT (brand_id, month, year) DO UPDATE SET
    gross_sales = EXCLUDED.gross_sales,
    ppf_amount  = EXCLUDED.ppf_amount,
    net_payout  = EXCLUDED.net_payout;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6.3 Admin: Offer Tracking
CREATE OR REPLACE FUNCTION public.increment_offer_uses(offer_id UUID)
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied.';
  END IF;

  UPDATE public.promotional_offers
  SET current_uses = current_uses + 1
  WHERE id = offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- PART 7: SECURE AGGREGATION RPCs
------------------------------------------------------------
-- Centralized Performance Calculator 
CREATE OR REPLACE FUNCTION public.get_product_performance_secure(p_brand_id UUID)
RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    sold BIGINT,
    revenue NUMERIC
) AS $$
BEGIN
    -- Verify Permission: Must be Admin OR the Brand Owner
    IF NOT (public.is_admin() OR public.is_owner(p_brand_id)) THEN
        RAISE EXCEPTION 'Access Denied.';
    END IF;

    RETURN QUERY
    SELECT 
        li.product_id,
        li.product_name,
        SUM(li.quantity)::BIGINT as sold,
        SUM(li.line_total)::NUMERIC as revenue
    FROM public.invoice_line_items li
    JOIN public.invoices i ON i.id = li.invoice_id
    WHERE i.brand_id = p_brand_id AND i.status = 'paid'
    GROUP BY li.product_id, li.product_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 Admin: Nuclear Deletion Tool
-- Bypasses FK restrictions for absolute cleanup
CREATE OR REPLACE FUNCTION public.delete_brand_entirely(p_brand_id UUID)
RETURNS VOID AS $$
DECLARE
    v_auth_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access Denied: Admin authorization required for brand deletion.';
    END IF;

    SELECT auth_user_id INTO v_auth_id FROM public.brands WHERE id = p_brand_id;

    -- Cascading Cleanup (Internal FK handling)
    DELETE FROM public.invoice_line_items WHERE invoice_id IN (SELECT id FROM public.invoices WHERE brand_id = p_brand_id);
    DELETE FROM public.invoices WHERE brand_id = p_brand_id;
    DELETE FROM public.payouts WHERE brand_id = p_brand_id;
    DELETE FROM public.brand_sales WHERE brand_id = p_brand_id;
    DELETE FROM public.shelf_slots WHERE brand_id = p_brand_id;
    DELETE FROM public.shelf_bookings WHERE brand_id = p_brand_id;
    DELETE FROM public.brand_products WHERE brand_id = p_brand_id;
    DELETE FROM public.brands WHERE id = p_brand_id;

    -- Cleanup identities (Note: auth.users deletion usually requires service_role/manual intervention)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. IDENTITY SYNC TRIGGER
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  IF (new.raw_user_meta_data->>'role') IN ('admin', 'super_admin') THEN
    INSERT INTO public.admin_users (email, name, auth_user_id)
    VALUES (new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'THC Admin'), new.id)
    ON CONFLICT (email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id;
  ELSE
    INSERT INTO public.brands (email, business_name, auth_user_id, onboarding_status)
    VALUES (new.email, COALESCE(new.raw_user_meta_data->>'business_name', 'New Brand'), new.id, 'pending')
    ON CONFLICT (email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- 3. SECURITY MEASURES (RLS)
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_owner(p_brand_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.brands WHERE id = p_brand_id AND auth_user_id = auth.uid());
$$ LANGUAGE sql STABLE;

-- Enable RLS and Master Admin Loop
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE FORMAT('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE FORMAT('CREATE POLICY "admin_all" ON public.%I FOR ALL TO authenticated USING (public.is_admin());', t);
  END LOOP;
END $$;

-- Brand RLS
CREATE POLICY "brand_self" ON public.brands FOR ALL TO authenticated USING (auth_user_id = auth.uid());
CREATE POLICY "brand_products" ON public.brand_products FOR ALL TO authenticated USING (public.is_owner(brand_id));

-- 4. SEEDING DATA
------------------------------------------------------------

-- 4.1 Seed shelf_sections
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
