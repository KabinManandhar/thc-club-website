-- =============================================================================
-- THC Club: Contract System & Brand Contract Table Migration
-- Run this on your Supabase SQL editor to add e-signature fields
-- =============================================================================

-- 1. Add new e-signature fields to brand_contracts table
ALTER TABLE brand_contracts
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'signed', 'active', 'expired')),
  ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'partnership_v1',
  ADD COLUMN IF NOT EXISTS signed_by TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stamp_number TEXT,
  ADD COLUMN IF NOT EXISTS ip_note TEXT;

-- 2. Add index for faster brand contract lookups
CREATE INDEX IF NOT EXISTS idx_brand_contracts_brand_id ON brand_contracts(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_contracts_status ON brand_contracts(status);

-- 3. Make file_url nullable (digital contracts don't need a file)
ALTER TABLE brand_contracts ALTER COLUMN file_url DROP NOT NULL;

-- 4. Add signed_by and stamp fields to brand_contracts per brand readable note
COMMENT ON COLUMN brand_contracts.signed_by IS 'Full legal name of the authorized signatory';
COMMENT ON COLUMN brand_contracts.stamp_number IS 'Optional company stamp or registration number';
COMMENT ON COLUMN brand_contracts.ip_note IS 'Audit trail note (e.g. signed via portal)';
COMMENT ON COLUMN brand_contracts.contract_type IS 'Version/type of the contract template used';

-- 5. RLS: Brands can view their own contracts, admins see all
ALTER TABLE brand_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_view_own_contracts" ON brand_contracts;
CREATE POLICY "brands_view_own_contracts"
  ON brand_contracts FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE email = auth.email()
    )
  );

DROP POLICY IF EXISTS "brands_insert_own_contracts" ON brand_contracts;
CREATE POLICY "brands_insert_own_contracts"
  ON brand_contracts FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brands WHERE email = auth.email()
    )
  );

DROP POLICY IF EXISTS "brands_update_own_unsigned_contracts" ON brand_contracts;
CREATE POLICY "brands_update_own_unsigned_contracts"
  ON brand_contracts FOR UPDATE
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE email = auth.email()
    )
    AND status IN ('pending', 'signed')
  );

-- 6. Admin service-role bypass (service_role bypasses RLS automatically)
-- No extra policy needed if using service_role key in admin actions.

SELECT 'Contract system migration complete.' AS result;
