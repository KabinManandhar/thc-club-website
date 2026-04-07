-- admin-crm-rpcs.sql
-- Run this script in the Supabase SQL Editor to enable admin actions directly.

-- 1. admin_delete_product
DROP FUNCTION IF EXISTS admin_delete_product(UUID);
CREATE OR REPLACE FUNCTION admin_delete_product(
    p_product_id UUID
) RETURNS void AS $$
BEGIN
    DELETE FROM brand_products WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. admin_delete_contract
DROP FUNCTION IF EXISTS admin_delete_contract(UUID);
CREATE OR REPLACE FUNCTION admin_delete_contract(
    p_contract_id UUID
) RETURNS void AS $$
BEGIN
    DELETE FROM brand_contracts WHERE id = p_contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. admin_update_brand_crm
DROP FUNCTION IF EXISTS admin_update_brand_crm(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION admin_update_brand_crm(
    p_brand_id UUID,
    p_admin_notes TEXT,
    p_onboarding_status TEXT
) RETURNS void AS $$
BEGIN
    UPDATE brands
    SET admin_notes = COALESCE(p_admin_notes, admin_notes),
        onboarding_status = COALESCE(p_onboarding_status, onboarding_status),
        updated_at = NOW()
    WHERE id = p_brand_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. admin_update_visit_request
DROP FUNCTION IF EXISTS admin_update_visit_request(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION admin_update_visit_request(
    p_request_id UUID,
    p_status TEXT,
    p_notes TEXT
) RETURNS void AS $$
BEGIN
    UPDATE visit_requests
    SET status = COALESCE(p_status, status),
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. admin_update_enquiry
DROP FUNCTION IF EXISTS admin_update_enquiry(UUID, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION admin_update_enquiry(
    p_enquiry_id UUID,
    p_status TEXT,
    p_priority TEXT,
    p_assigned_to TEXT
) RETURNS void AS $$
BEGIN
    UPDATE enquiries
    SET status = COALESCE(p_status, status),
        priority = COALESCE(p_priority, priority),
        assigned_to = COALESCE(p_assigned_to, assigned_to),
        updated_at = NOW()
    WHERE id = p_enquiry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. admin_process_change_request
DROP FUNCTION IF EXISTS admin_process_change_request_atomic(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION admin_process_change_request_atomic(
    p_request_id UUID,
    p_action TEXT,
    p_sku_if_missing TEXT
) RETURNS void AS $$
DECLARE
    v_req RECORD;
    v_prod_id UUID;
    v_old_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    SELECT * INTO v_req FROM brand_change_requests WHERE id = p_request_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found';
    END IF;

    IF p_action = 'approve' THEN
        IF v_req.request_type = 'product_add' THEN
            -- Insert product
            INSERT INTO brand_products (
                brand_id, name, sku, description, category, price, stock_quantity, low_stock_threshold, image_url
            ) VALUES (
                v_req.brand_id,
                v_req.new_data->>'name',
                COALESCE(v_req.new_data->>'sku', p_sku_if_missing),
                v_req.new_data->>'description',
                v_req.new_data->>'category',
                (v_req.new_data->>'price')::NUMERIC,
                COALESCE((v_req.new_data->>'stock_quantity')::INTEGER, 0),
                COALESCE((v_req.new_data->>'low_stock_threshold')::INTEGER, 5),
                v_req.new_data->>'image_url'
            ) RETURNING id INTO v_prod_id;

            -- Insert stock log if > 0
            v_new_stock := COALESCE((v_req.new_data->>'stock_quantity')::INTEGER, 0);
            IF v_new_stock > 0 THEN
                INSERT INTO product_stock_logs (
                    product_id, brand_id, previous_stock, new_stock, change_amount, change_type, notes
                ) VALUES (
                    v_prod_id, v_req.brand_id, 0, v_new_stock, v_new_stock, 'admin_approval', 'Initial stock added via admin approval'
                );
            END IF;

        ELSIF v_req.request_type = 'product_update' THEN
            -- Get old stock
            SELECT stock_quantity INTO v_old_stock FROM brand_products WHERE id = v_req.target_id;
            
            -- Update product
            UPDATE brand_products SET 
                name = COALESCE(v_req.new_data->>'name', name),
                sku = COALESCE(v_req.new_data->>'sku', sku),
                description = COALESCE(v_req.new_data->>'description', description),
                category = COALESCE(v_req.new_data->>'category', category),
                price = COALESCE((v_req.new_data->>'price')::NUMERIC, price),
                stock_quantity = COALESCE((v_req.new_data->>'stock_quantity')::INTEGER, stock_quantity),
                low_stock_threshold = COALESCE((v_req.new_data->>'low_stock_threshold')::INTEGER, low_stock_threshold),
                image_url = COALESCE(v_req.new_data->>'image_url', image_url)
            WHERE id = v_req.target_id;

            -- Insert stock log if changed
            v_new_stock := COALESCE((v_req.new_data->>'stock_quantity')::INTEGER, v_old_stock);
            IF v_new_stock != v_old_stock THEN
                INSERT INTO product_stock_logs (
                    product_id, brand_id, previous_stock, new_stock, change_amount, change_type, notes
                ) VALUES (
                    v_req.target_id, v_req.brand_id, v_old_stock, v_new_stock, v_new_stock - v_old_stock, 'admin_approval', 'Stock updated via admin approval'
                );
            END IF;

        ELSIF v_req.request_type = 'brand_update' OR v_req.request_type = 'profile_update' THEN
            -- Update brand profile
            UPDATE brands SET
                business_name = COALESCE(v_req.new_data->>'business_name', business_name),
                description = COALESCE(v_req.new_data->>'description', description),
                phone = COALESCE(v_req.new_data->>'phone', phone),
                instagram_handle = COALESCE(v_req.new_data->>'instagram_handle', instagram_handle),
                website_url = COALESCE(v_req.new_data->>'website_url', website_url),
                logo_url = COALESCE(v_req.new_data->>'logo_url', logo_url),
                brand_story = COALESCE(v_req.new_data->>'brand_story', brand_story),
                updated_at = NOW()
            WHERE id = v_req.brand_id;
        END IF;
        
        UPDATE brand_change_requests SET status = 'approved', updated_at = NOW() WHERE id = p_request_id;
    ELSE
        UPDATE brand_change_requests SET status = 'rejected', updated_at = NOW() WHERE id = p_request_id;
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
