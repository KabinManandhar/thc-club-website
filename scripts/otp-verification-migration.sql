-- ============================================================
-- THC Club - OTP Verification Migration
-- ============================================================

-- 1. Update approved_users table
ALTER TABLE IF EXISTS public.approved_users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_code TEXT; -- Store a temporary 6-digit code

-- 2. Update brands table to track verification
ALTER TABLE IF EXISTS public.brands
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- 3. Create a table for OTPs if you want them to be short-lived and separate
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT "otp_verifications_email_code_key" UNIQUE ("email", "code")
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_otp_email ON public.otp_verifications(email);

-- 4. Function to generate and store OTP
CREATE OR REPLACE FUNCTION generate_otp(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
BEGIN
  -- Generate 6-digit code
  v_code := LPAD(floor(random() * 1000000)::text, 6, '0');
  
  -- Delete any existing codes for this email
  DELETE FROM public.otp_verifications WHERE email = LOWER(p_email);
  
  -- Insert new code (expires in 10 minutes)
  INSERT INTO public.otp_verifications (email, code, expires_at)
  VALUES (LOWER(p_email), v_code, NOW() + INTERVAL '10 minutes');
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to verify OTP
CREATE OR REPLACE FUNCTION verify_otp(p_email TEXT, p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.otp_verifications
  WHERE email = LOWER(p_email) 
    AND code = p_code 
    AND expires_at > NOW();
    
  IF v_count > 0 THEN
    -- Delete the used code
    DELETE FROM public.otp_verifications WHERE email = LOWER(p_email);
    
    -- Update user/brand status
    UPDATE public.approved_users SET is_verified = TRUE, email_verified_at = NOW() WHERE LOWER(email) = LOWER(p_email);
    UPDATE public.brands SET email_verified = TRUE WHERE LOWER(email) = LOWER(p_email);
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
