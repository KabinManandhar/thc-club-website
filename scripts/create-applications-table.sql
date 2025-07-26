-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    website VARCHAR(255),
    social_media TEXT,
    business_type VARCHAR(100) NOT NULL,
    business_stage VARCHAR(100) NOT NULL,
    monthly_revenue VARCHAR(100),
    team_size VARCHAR(50),
    product_description TEXT NOT NULL,
    why_join TEXT NOT NULL,
    unique_value TEXT NOT NULL,
    community_contribution TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    notes TEXT,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable insert for all users" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read for authenticated users" ON applications FOR SELECT USING (true);
CREATE POLICY "Enable update for authenticated users" ON applications FOR UPDATE USING (true);
