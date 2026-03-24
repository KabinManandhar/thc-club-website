-- ============================================================
-- THC Club - Authentication & Session Tables Fix
-- ============================================================

-- Table: approved_users
-- Stores credentials for brands to login
-- NOTE: We are removing login_code in favor of email/password
ALTER TABLE IF EXISTS approved_users DROP COLUMN IF EXISTS login_code;

CREATE TABLE IF NOT EXISTS approved_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  business_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  first_login TIMESTAMPTZ,
  last_login TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure password column exists if table existed without it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='approved_users' AND column_name='password'
    ) THEN
        ALTER TABLE approved_users ADD COLUMN password TEXT;
    END IF;
END $$;

-- Table: user_sessions
-- Manages member login sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES approved_users(id) ON DELETE CASCADE,
  session_token UUID NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure brands table user_id references approved_users correctly
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='brands' AND column_name='user_id'
    ) THEN
        ALTER TABLE brands ADD COLUMN user_id UUID REFERENCES approved_users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE approved_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow all for now (service role bypasses anyway)
DROP POLICY IF EXISTS "allow_all_approved_users" ON approved_users;
CREATE POLICY "allow_all_approved_users" ON approved_users FOR ALL USING (true);

DROP POLICY IF EXISTS "allow_all_user_sessions" ON user_sessions;
CREATE POLICY "allow_all_user_sessions" ON user_sessions FOR ALL USING (true);
