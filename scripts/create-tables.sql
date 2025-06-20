-- Create tables for THC Club admin system

-- Waitlist table
CREATE TABLE waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enquiries table
CREATE TABLE enquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visit requests table
CREATE TABLE visit_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT,
  visit_purpose TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  number_of_visitors INTEGER DEFAULT 1,
  special_requirements TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking requests table (for shelf slots)
CREATE TABLE booking_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  business_name TEXT NOT NULL,
  shelf_type TEXT NOT NULL CHECK (shelf_type IN ('bottom', 'eye_level', 'top_level')),
  duration TEXT NOT NULL CHECK (duration IN ('quarterly', 'half_yearly', 'yearly')),
  bundle_type TEXT CHECK (bundle_type IN ('starter', 'full_shelf')),
  monthly_rent DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'payment_pending', 'active')),
  notes TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shelf slots inventory table
CREATE TABLE shelf_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_number INTEGER NOT NULL UNIQUE,
  shelf_type TEXT NOT NULL CHECK (shelf_type IN ('bottom', 'eye_level', 'top_level')),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  occupied_by TEXT,
  booking_id UUID REFERENCES booking_requests(id),
  rent_amount DECIMAL(10,2),
  occupied_from DATE,
  occupied_until DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users table
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Activity logs table
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_waitlist_status ON waitlist(status);
CREATE INDEX idx_waitlist_created_at ON waitlist(created_at);
CREATE INDEX idx_enquiries_status ON enquiries(status);
CREATE INDEX idx_visit_requests_status ON visit_requests(status);
CREATE INDEX idx_booking_requests_status ON booking_requests(status);
CREATE INDEX idx_shelf_slots_status ON shelf_slots(status);
CREATE INDEX idx_shelf_slots_type ON shelf_slots(shelf_type);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_waitlist_updated_at BEFORE UPDATE ON waitlist FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enquiries_updated_at BEFORE UPDATE ON enquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visit_requests_updated_at BEFORE UPDATE ON visit_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_booking_requests_updated_at BEFORE UPDATE ON booking_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shelf_slots_updated_at BEFORE UPDATE ON shelf_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
