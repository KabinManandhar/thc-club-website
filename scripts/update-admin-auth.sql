-- Update admin users table to include authentication
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Insert the admin user with hashed password
-- Note: In production, passwords should be properly hashed with bcrypt
INSERT INTO admin_users (email, name, role, password_hash, is_active) 
VALUES (
  'thehiddencollectiveclub@gmail.com', 
  'THC Club Super Admin', 
  'super_admin',
  '$2b$10$rQJ5qVJ5qVJ5qVJ5qVJ5qOJ5qVJ5qVJ5qVJ5qVJ5qVJ5qVJ5qVJ5q', -- This would be the hashed version of I@mgod@666
  true
) 
ON CONFLICT (email) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Create sessions table for admin authentication
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
