-- ============================================================
-- THE HIDDEN COLLECTIVE • ADMINISTRATIVE TOOLS
-- ============================================================
-- This migration adds powerful administrative capabilities:
-- 1. DELETE BRAND ENTIRELY (Force Wipe)
-- Use this with CAUTION as it bypasses standard relational safety 
-- to completely remove a brand and all its associated footprint.

CREATE OR REPLACE FUNCTION delete_brand_entirely(p_brand_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 0. Identify the associated user_id for session cleanup
  SELECT user_id INTO v_user_id FROM brands WHERE id = p_brand_id;

  -- 1. Remove recursive dependencies (Line Items first due to RESTRICT FK)
  DELETE FROM invoice_line_items WHERE invoice_id IN (SELECT id FROM invoices WHERE brand_id = p_brand_id);
  
  -- 2. Remove Invoices
  DELETE FROM invoices WHERE brand_id = p_brand_id;
  
  -- 3. Remove Sales Summary
  DELETE FROM brand_sales WHERE brand_id = p_brand_id;
  
  -- 4. Remove Payout History
  DELETE FROM payouts WHERE brand_id = p_brand_id;
  
  -- 5. Remove Booking Applications & Allotments
  DELETE FROM shelf_bookings WHERE brand_id = p_brand_id;
  
  -- 6. Remove Change Requests & Logs
  DELETE FROM brand_change_requests WHERE brand_id = p_brand_id;
  DELETE FROM stock_update_requests WHERE brand_id = p_brand_id;
  
  -- 7. Remove Contracts & Legal Documents
  DELETE FROM brand_contracts WHERE brand_id = p_brand_id;
  
  -- 8. Remove Catalog items (this will now pass since line items are gone)
  DELETE FROM brand_products WHERE brand_id = p_brand_id;
  
  -- 9. Remove Sessions if applicable
  IF v_user_id IS NOT NULL THEN
    DELETE FROM user_sessions WHERE user_id = v_user_id;
  END IF;

  -- 10. Finally Remove the Brand entry
  DELETE FROM brands WHERE id = p_brand_id;

  -- 11. Cleanup approved_users (Optional: strictly removes ghost records)
  IF v_user_id IS NOT NULL THEN
    DELETE FROM approved_users WHERE id = v_user_id;
  END IF;
END;
$$;
