-- ============================================================
-- delete_brand_entirely(p_brand_id UUID)
-- 
-- SECURITY DEFINER RPC to fully wipe a brand and all its data.
-- Run this in Supabase SQL Editor → will replace the old version.
--
-- Deletion Order (respecting FK constraints):
--   invoice_line_items → invoices → brand_contracts → payouts
--   → shelf_booking_payments → shelf_bookings → shelf_slots (NULL)
--   → stock_update_requests → brand_products → brand_change_requests
--   → brand_sales → brand_settlements → enquiries → visit_requests
--   → brands → user_sessions → approved_users
-- ============================================================

CREATE OR REPLACE FUNCTION delete_brand_entirely(p_brand_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email   TEXT;
BEGIN
  -- Grab associated approved_user id + email before anything is deleted
  SELECT b.user_id, b.email
    INTO v_user_id, v_email
    FROM brands b
   WHERE b.id = p_brand_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brand % not found', p_brand_id;
  END IF;

  -- ── Step 1: Invoice line items (FK: invoice_line_items.product_id → brand_products RESTRICT,
  --            and invoice_line_items.invoice_id → invoices CASCADE)
  --           Must delete line items before products and before invoices.
  DELETE FROM invoice_line_items
   WHERE invoice_id IN (
     SELECT id FROM invoices WHERE brand_id = p_brand_id
   );

  -- ── Step 2: Invoices (FK: invoices.brand_id → brands RESTRICT)
  DELETE FROM invoices WHERE brand_id = p_brand_id;

  -- ── Step 3: Brand contracts (FK: brand_contracts.brand_id → brands, no cascade)
  DELETE FROM brand_contracts WHERE brand_id = p_brand_id;

  -- ── Step 4: Payouts (FK: payouts.brand_id → brands, no cascade)
  DELETE FROM payouts WHERE brand_id = p_brand_id;

  -- ── Step 5: Shelf booking payments (FK: CASCADE, but let's be explicit)
  DELETE FROM shelf_booking_payments WHERE brand_id = p_brand_id;

  -- ── Step 6: Nullify shelf_slots that reference this brand (FK: SET NULL already, but do it manually first)
  UPDATE shelf_slots
     SET brand_id       = NULL,
         booking_id     = NULL,
         status         = 'available',
         occupied_by    = NULL,
         occupied_from  = NULL,
         occupied_until = NULL,
         rent_amount    = NULL
   WHERE brand_id = p_brand_id;

  -- ── Step 7: Shelf bookings (FK: CASCADE)
  DELETE FROM shelf_bookings WHERE brand_id = p_brand_id;

  -- ── Step 8: Stock update requests + brand products
  --   Must delete stock_update_requests before brand_products because:
  --   stock_update_requests.product_id → brand_products CASCADE (fine)
  --   stock_update_requests.brand_id   → brands CASCADE (fine)
  DELETE FROM stock_update_requests WHERE brand_id = p_brand_id;
  DELETE FROM brand_products WHERE brand_id = p_brand_id;

  -- ── Step 9: Brand change requests (FK: CASCADE)
  DELETE FROM brand_change_requests WHERE brand_id = p_brand_id;

  -- ── Step 10: Brand sales & settlements (FK: CASCADE — explicit for safety)
  DELETE FROM brand_sales        WHERE brand_id = p_brand_id;
  DELETE FROM brand_settlements  WHERE brand_id = p_brand_id;

  -- ── Step 11: Enquiries & visit requests tied to brand or its email
  DELETE FROM enquiries WHERE brand_id = p_brand_id;
  IF v_email IS NOT NULL THEN
    DELETE FROM enquiries      WHERE email = v_email;
    DELETE FROM visit_requests WHERE email = v_email;
  END IF;

  -- ── Step 12: Delete the brand record itself
  DELETE FROM brands WHERE id = p_brand_id;

  -- ── Step 13: Wipe the approved_user login access
  IF v_user_id IS NOT NULL THEN
    DELETE FROM user_sessions  WHERE user_id = v_user_id;
    DELETE FROM approved_users WHERE id      = v_user_id;
  END IF;

  -- Note: Supabase auth.users is not touched here (no direct SQL access).
  -- Removing from approved_users is sufficient to block portal access.

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant execution to all roles (admins use anon/custom auth)
GRANT EXECUTE ON FUNCTION delete_brand_entirely(UUID) TO anon;
GRANT EXECUTE ON FUNCTION delete_brand_entirely(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_brand_entirely(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
