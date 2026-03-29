CREATE OR REPLACE FUNCTION delete_brand_entirely(p_brand_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  -- Get the associated approved_user ID and email before wiping
  SELECT user_id, email INTO v_user_id, v_email FROM brands WHERE id = p_brand_id;

  -- 1. Wipe Invoice Line Items first (child of invoices)
  -- invoice_line_items has no direct brand_id, must delete via invoice_id
  DELETE FROM invoice_line_items 
  WHERE invoice_id IN (SELECT id FROM invoices WHERE brand_id = p_brand_id);

  -- 2. Wipe Invoices
  DELETE FROM invoices WHERE brand_id = p_brand_id;

  -- 3. Wipe brand change requests
  DELETE FROM brand_change_requests WHERE brand_id = p_brand_id;

  -- 4. Wipe brand contracts
  DELETE FROM brand_contracts WHERE brand_id = p_brand_id;

  -- 5. Wipe brand products & stock requests
  DELETE FROM stock_update_requests WHERE brand_id = p_brand_id;
  DELETE FROM brand_products WHERE brand_id = p_brand_id;

  -- 6. Wipe shelf bookings (update slots first to remove association)
  UPDATE shelf_slots 
  SET brand_id = NULL, booking_id = NULL, status = 'available', occupied_by = NULL, occupied_from = NULL, occupied_until = NULL, rent_amount = NULL 
  WHERE brand_id = p_brand_id;
  
  DELETE FROM shelf_bookings WHERE brand_id = p_brand_id;

  -- 7. Wipe payouts & sales
  DELETE FROM payouts WHERE brand_id = p_brand_id;
  DELETE FROM brand_sales WHERE brand_id = p_brand_id;
  
  -- 8. Wipe enquiries & visit requests associated with this brand email
  IF v_email IS NOT NULL THEN
    DELETE FROM enquiries WHERE email = v_email OR brand_id = p_brand_id;
    DELETE FROM visit_requests WHERE email = v_email;
  END IF;

  -- 9. Finally, delete the brand record itself
  DELETE FROM brands WHERE id = p_brand_id;

  -- 10. Also delete from approved_users ecosystem to completely sever access
  IF v_user_id IS NOT NULL THEN
     DELETE FROM user_sessions WHERE user_id = v_user_id;
     DELETE FROM approved_users WHERE id = v_user_id;
  END IF;
  
  -- Note: We don't delete from supabase auth.users directly via SQL due to external constraints,
  -- but removing from approved_users and brands prevents them from logging into the portal anyway.

END;
$$;
