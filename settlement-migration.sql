-- =============================================================================
-- THC Club: Monthly Settlements & Payouts Architecture
-- =============================================================================

CREATE TABLE IF NOT EXISTS brand_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    period_year INT NOT NULL,
    period_month INT NOT NULL, -- 1-12
    total_sales NUMERIC DEFAULT 0,
    ppf_deduction NUMERIC DEFAULT 0,
    net_payout NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid')),
    paid_at TIMESTAMPTZ,
    bank_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(brand_id, period_year, period_month)
);

ALTER TABLE brand_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands view own settlements" ON brand_settlements;
CREATE POLICY "brands view own settlements"
  ON brand_settlements FOR SELECT
  USING (brand_id IN (SELECT id FROM brands WHERE email = auth.email()));

-- Admin read/write policies (accessible via custom unauthed route for admins or via anon if open, 
-- but we usually enforce true for internal tools relying on Next.js/RPC checks).
DROP POLICY IF EXISTS "public read/write settlements" ON brand_settlements;
CREATE POLICY "public read/write settlements" ON brand_settlements FOR ALL USING (true);


-- Helper RPC function to automatically sync or upsert a settlement record from invoices
CREATE OR REPLACE FUNCTION generate_monthly_settlement(p_brand_id UUID, p_year INT, p_month INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gross NUMERIC;
  v_ppf NUMERIC;
BEGIN
  -- Sum up paid invoices for that month
  SELECT COALESCE(SUM(total_amount), 0), COALESCE(SUM(ppf_amount), 0)
  INTO v_gross, v_ppf
  FROM invoices
  WHERE brand_id = p_brand_id
    AND status = 'paid'
    AND EXTRACT(YEAR FROM created_at) = p_year
    AND EXTRACT(MONTH FROM created_at) = p_month;

  -- Upsert
  INSERT INTO brand_settlements (brand_id, period_year, period_month, total_sales, ppf_deduction, net_payout, status)
  VALUES (p_brand_id, p_year, p_month, v_gross, v_ppf, (v_gross - v_ppf), 'pending')
  ON CONFLICT (brand_id, period_year, period_month)
  DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    ppf_deduction = EXCLUDED.ppf_deduction,
    net_payout = EXCLUDED.net_payout,
    updated_at = now()
  WHERE brand_settlements.status = 'pending'; -- do not recalculate if already paid/processing
END;
$$;

NOTIFY pgrst, 'reload schema';
