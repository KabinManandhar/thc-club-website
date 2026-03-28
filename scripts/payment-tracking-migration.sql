-- =============================================================================
-- THC Club: Payment Tracking & Admin CRM Fixes
-- Run this migration in your Supabase SQL Editor
-- =============================================================================

-- 1. Create table for tracking individual installment/payment transactions
CREATE TABLE IF NOT EXISTS shelf_booking_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES shelf_bookings(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    amount_paid NUMERIC NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT now(),
    payment_method TEXT DEFAULT 'in_person' CHECK (payment_method IN ('in_person', 'bank_transfer', 'qr_scan', 'other')),
    notes TEXT,
    confirmed_by TEXT, -- Admin name who confirmed it
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add summary columns to shelf_bookings
ALTER TABLE shelf_bookings 
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- 3. Create or replace RPC to allow Admins (who use custom auth) to update brand CRM notes.
-- Bypasses RLS utilizing SECURITY DEFINER.
CREATE OR REPLACE FUNCTION admin_update_brand_crm(
    p_brand_id UUID,
    p_admin_notes TEXT DEFAULT NULL,
    p_onboarding_status TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE brands 
  SET 
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    onboarding_status = COALESCE(p_onboarding_status, onboarding_status),
    updated_at = now()
  WHERE id = p_brand_id;
END;
$$;

-- 4. Set clear RLS for the payments table
ALTER TABLE shelf_booking_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands view their own payments" ON shelf_booking_payments;
CREATE POLICY "brands view their own payments"
  ON shelf_booking_payments FOR SELECT
  USING (
    brand_id IN (SELECT id FROM brands WHERE email = auth.email())
  );

DROP POLICY IF EXISTS "public insert payments" ON shelf_booking_payments;
CREATE POLICY "public insert payments" ON shelf_booking_payments FOR ALL USING (true); -- Since admins need to insert/read without formal Supabase Auth.

NOTIFY pgrst, 'reload schema';
