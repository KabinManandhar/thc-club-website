-- ============================================================
-- THC Club - Supabase Auth Integration with OTP Sync
-- ============================================================

-- 1. Ensure columns exist for verification status
ALTER TABLE IF EXISTS public.approved_users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

ALTER TABLE IF EXISTS public.brands
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- 2. Add Unique Constraints to ensure ON CONFLICT works correctly
DO $$
BEGIN
    -- Ensure brands(email) is unique
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'brands_email_key'
    ) THEN
        ALTER TABLE public.brands ADD CONSTRAINT brands_email_key UNIQUE (email);
    END IF;

    -- Ensure brands(user_id) is unique to map 1:1 with auth.users
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'brands_user_id_key'
    ) THEN
        ALTER TABLE public.brands ADD CONSTRAINT brands_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- 3. Create a trigger function to sync auth.users to public.approved_users and brands
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_brand_id UUID;
BEGIN
  -- 1. Upsert into approved_users
  INSERT INTO public.approved_users (id, auth_user_id, email, password, business_name, is_active, is_verified)
  VALUES (
    NEW.id, -- Use auth.id
    NEW.id,
    NEW.email,
    NULL, -- Passwords managed by Supabase Auth
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'Unnamed Brand'),
    TRUE,
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    is_verified = EXCLUDED.is_verified,
    updated_at = NOW();

  -- 2. Upsert into brands
  -- Try to avoid constraint errors by using user_id if it exists, otherwise email
  INSERT INTO public.brands (user_id, email, business_name, phone, description, instagram_handle, onboarding_status, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'Unnamed Brand'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'description',
    NEW.raw_user_meta_data->>'social_handle',
    'pending',
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    email_verified = EXCLUDED.email_verified,
    business_name = COALESCE(EXCLUDED.business_name, brands.business_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Set up the trigger on auth.users
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
