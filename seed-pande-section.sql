-- ============================================================
-- THC CLUB • ECONOMICS & PRICING SEED (V2 TIERED)
-- ============================================================

-- 1. INITIALIZE SECTION TIERS
------------------------------------------------------------
-- Premium: High visibility, high footfall (Cafe)
-- Regular: Specialized zones, rooms, and corridors
UPDATE public.shelf_sections SET section_tier = 'premium' WHERE name = 'Cafe Section';
UPDATE public.shelf_sections SET section_tier = 'regular' WHERE name IN ('Room One', 'Room Two', 'Corridor Wall');

-- 2. LAYERED SHELF PRICING (NPR/mo)
------------------------------------------------------------
-- REGULAR ZONES (Standard pricing)
INSERT INTO public.shelf_pricing_tiers (duration, section_tier, bottom_price, eye_level_price, top_level_price)
VALUES
  ('quarterly',   'regular', 1100, 1500, 1350),
  ('half_yearly', 'regular', 1000, 1350, 1100),
  ('yearly',       'regular', 900, 1200, 1000)
ON CONFLICT (duration, section_tier) DO UPDATE SET
  bottom_price = EXCLUDED.bottom_price,
  eye_level_price = EXCLUDED.eye_level_price,
  top_level_price = EXCLUDED.top_level_price;

-- PREMIUM ZONES (Higher visibility, ~30-40% premium)
INSERT INTO public.shelf_pricing_tiers (duration, section_tier, bottom_price, eye_level_price, top_level_price)
VALUES
  ('quarterly',   'premium', 1600, 2200, 1900),
  ('half_yearly', 'premium', 1500, 2000, 1750),
  ('yearly',       'premium', 1350, 1800, 1600)
ON CONFLICT (duration, section_tier) DO UPDATE SET
  bottom_price = EXCLUDED.bottom_price,
  eye_level_price = EXCLUDED.eye_level_price,
  top_level_price = EXCLUDED.top_level_price;

-- 3. PLATFORM PARTNERSHIP FEES (PPF)
------------------------------------------------------------
INSERT INTO public.ppf_tiers (tier_name, min_sales_amount, ppf_rate, rent_waiver_percent)
VALUES
  ('Starter',    0,      3,   0),   -- 0-10k: 3% Fee, No Waiver
  ('Silver',     10000,  5,   0),   -- 10-50k: 5% Fee, No Waiver
  ('Gold',       50000,  7,   50),  -- 50-100k: 7% Fee, 50% Rent Waiver
  ('Platinum',   100000, 10,  100)  -- 100k+: 10% Fee, 100% Rent Waiver
ON CONFLICT (min_sales_amount) DO NOTHING;

-- 4. INITIAL PROMOTIONS
------------------------------------------------------------
INSERT INTO public.promotional_offers (name, promo_code, discount_type, discount_value, target_limit, current_uses, is_active)
VALUES
  ('Welcome Collective', 'THC2026', 'percentage', 10, 50, 0, true),
  ('Founder Special',    'MARCH15', 'fixed', 1500, 20, 0, true)
ON CONFLICT (promo_code) DO NOTHING;

-- REFRESH
NOTIFY pgrst, 'reload schema';
