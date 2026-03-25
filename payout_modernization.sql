-- ============================================================
-- THC Club - Payout Schema Modernization (Idempotent)
-- ============================================================

-- 1. Add admin_notes and ensure proper columns exist in payouts
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Add bank_account_details to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS bank_account_details JSONB DEFAULT '{}'::jsonb;

-- 3. Ensure RLS is correctly configured for payouts
-- To maintain consistency with the current "operational tables" strategy 
-- defined in auth_migration.sql, we use the "allow_all" policy.

DROP POLICY IF EXISTS "allow_all" ON payouts;
DROP POLICY IF EXISTS "payouts_restricted" ON payouts;
DROP POLICY IF EXISTS "brands_view_own_payouts" ON payouts;

CREATE POLICY "allow_all" ON payouts FOR ALL USING (true);

-- 4. Update generate_monthly_payouts to be more robust
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
    ppf_amount = EXCLUDED.ppf_amount,
    net_payout = EXCLUDED.net_payout,
    updated_at = NOW()
  WHERE payouts.status = 'pending'; -- Only update if not paid
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
