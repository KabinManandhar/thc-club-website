-- Create user authentication system for approved waitlist members

-- Create approved_users table
CREATE TABLE IF NOT EXISTS approved_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  waitlist_id UUID REFERENCES waitlist(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  login_code TEXT NOT NULL UNIQUE, -- Simple 6-digit code for login
  is_active BOOLEAN DEFAULT true,
  first_login TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES approved_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_approved_users_email ON approved_users(email);
CREATE INDEX IF NOT EXISTS idx_approved_users_login_code ON approved_users(login_code);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Function to generate random 6-digit login code
CREATE OR REPLACE FUNCTION generate_login_code() RETURNS TEXT AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to create approved user when waitlist is approved
CREATE OR REPLACE FUNCTION create_approved_user_from_waitlist() 
RETURNS TRIGGER AS $$
DECLARE
  new_login_code TEXT;
BEGIN
  -- Only create approved user if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Generate unique login code
    LOOP
      new_login_code := generate_login_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM approved_users WHERE login_code = new_login_code);
    END LOOP;
    
    -- Insert into approved_users
    INSERT INTO approved_users (waitlist_id, email, business_name, login_code)
    VALUES (NEW.id, NEW.email, NEW.business_name, new_login_code)
    ON CONFLICT (email) DO UPDATE SET
      login_code = EXCLUDED.login_code,
      is_active = true,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create approved users
DROP TRIGGER IF EXISTS create_approved_user_trigger ON waitlist;
CREATE TRIGGER create_approved_user_trigger
  AFTER UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION create_approved_user_from_waitlist();

-- Add updated_at trigger for approved_users
CREATE TRIGGER update_approved_users_updated_at 
  BEFORE UPDATE ON approved_users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
