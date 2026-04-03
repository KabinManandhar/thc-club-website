-- 1. Create Shelf Bundles table
CREATE TABLE IF NOT EXISTS shelf_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    original_total NUMERIC,
    discount_percentage NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create linkage table for slots in bundles
CREATE TABLE IF NOT EXISTS shelf_bundle_items (
    bundle_id UUID REFERENCES shelf_bundles(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES shelf_slots(id) ON DELETE CASCADE,
    PRIMARY KEY (bundle_id, slot_id)
);

-- 3. Update shelf_bookings to support bundles
ALTER TABLE shelf_bookings ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES shelf_bundles(id);

-- 4. RLS Implementation
ALTER TABLE shelf_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelf_bundle_items ENABLE ROW LEVEL SECURITY;

-- Select: Anyone authenticated (brands/admins) can see active bundles
CREATE POLICY "Anyone can view active bundles" ON shelf_bundles
    FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email()));

CREATE POLICY "Anyone can view bundle items" ON shelf_bundle_items
    FOR SELECT USING (true);

-- Manage: Only Admins can CRUD bundles
CREATE POLICY "Admins can manage bundles" ON shelf_bundles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email() AND role IN ('super_admin', 'admin', 'manager'))
    );

CREATE POLICY "Admins can manage bundle items" ON shelf_bundle_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE email = auth.email() AND role IN ('super_admin', 'admin', 'manager'))
    );

-- 5. Helper Function for Admin Side (Bulk linking)
CREATE OR REPLACE FUNCTION create_shelf_bundle_with_slots(
    p_name TEXT,
    p_description TEXT,
    p_price NUMERIC,
    p_slot_ids UUID[]
) RETURNS UUID AS $$
DECLARE
    v_bundle_id UUID;
    v_orig_total NUMERIC;
    v_slot_id UUID;
BEGIN
    -- Calculate original total
    SELECT COALESCE(SUM(800), 0) INTO v_orig_total -- Fallback default price logic
    FROM shelf_slots WHERE id = ANY(p_slot_ids);

    -- Insert Bundle
    INSERT INTO shelf_bundles (name, description, price, original_total, discount_percentage)
    VALUES (p_name, p_description, p_price, v_orig_total, 
            CASE WHEN v_orig_total > 0 THEN ((v_orig_total - p_price) / v_orig_total * 100) ELSE 0 END)
    RETURNING id INTO v_bundle_id;

    -- Link Slots
    FOREACH v_slot_id IN ARRAY p_slot_ids LOOP
        INSERT INTO shelf_bundle_items (bundle_id, slot_id) VALUES (v_bundle_id, v_slot_id);
    END LOOP;

    RETURN v_bundle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
