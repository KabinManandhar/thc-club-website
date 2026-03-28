SET search_path TO public, extensions;

-- 1. UPGRADE SECTIONS (Add Tiering)
ALTER TABLE public.shelf_sections 
ADD COLUMN IF NOT EXISTS section_tier TEXT DEFAULT 'regular' 
CHECK (section_tier IN ('premium', 'regular'));

-- Assign tiers to your current layout
UPDATE public.shelf_sections SET section_tier = 'premium' WHERE name = 'Cafe Section';
UPDATE public.shelf_sections SET section_tier = 'regular' WHERE name IN ('Room One', 'Room Two', 'Corridor Wall');

-- 2. UPGRADE PRICING (Make Tier-Aware)
ALTER TABLE public.shelf_pricing_tiers 
DROP CONSTRAINT IF EXISTS shelf_pricing_tiers_duration_key;

-- We now define pricing per Duration AND Section Tier
ALTER TABLE public.shelf_pricing_tiers 
ADD COLUMN IF NOT EXISTS section_tier TEXT DEFAULT 'regular';

-- UNIQUE Constraint for the mapping
ALTER TABLE public.shelf_pricing_tiers 
ADD CONSTRAINT uniq_duration_tier UNIQUE (duration, section_tier);

-- 3. SEED PREMIUM PRICING (Slightly higher than Regular)
INSERT INTO public.shelf_pricing_tiers (duration, section_tier, bottom_price, eye_level_price, top_level_price)
VALUES
  ('quarterly',   'premium', 1600, 2200, 1900),
  ('half_yearly', 'premium', 1500, 2000, 1750),
  ('yearly',       'premium', 1350, 1800, 1600)
ON CONFLICT (duration, section_tier) DO UPDATE SET
  bottom_price = EXCLUDED.bottom_price,
  eye_level_price = EXCLUDED.eye_level_price,
  top_level_price = EXCLUDED.top_level_price;

-- 4. THE "SMART PRICE" CALCULATOR
-- Use this in your frontend to get the right price every time
CREATE OR REPLACE FUNCTION get_dynamic_price(p_shelf_id UUID, p_duration TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_tier TEXT;
    v_type TEXT;
    v_price NUMERIC;
BEGIN
    -- 1. Identify Section Tier and Shelf Type
    SELECT s.section_tier, sh.shelf_type INTO v_tier, v_type
    FROM shelves sh 
    JOIN shelf_sections s ON sh.section_id = s.id 
    WHERE sh.id = p_shelf_id;

    -- 2. Fetch the matched price column
    SELECT 
        CASE 
            WHEN v_type = 'bottom' THEN bottom_price
            WHEN v_type = 'eye_level' THEN eye_level_price
            WHEN v_type = 'top_level' THEN top_level_price
            ELSE eye_level_price -- Fallback/Mixed
        END INTO v_price
    FROM shelf_pricing_tiers
    WHERE duration = p_duration AND section_tier = v_tier;

    RETURN v_price;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. THE OFFER REPAIR (Automatic Counter)
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_slot_offer(p_slot_id UUID, p_offer_id UUID)
RETURNS VOID AS $$
BEGIN
    -- A. Update the Slot with the Promo Link
    UPDATE public.shelf_slots 
    SET applied_promo_id = p_offer_id 
    WHERE id = p_slot_id;

    -- B. Increment the Use Counter (THE FIX)
    UPDATE public.promotional_offers
    SET current_uses = current_uses + 1
    WHERE id = p_offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
