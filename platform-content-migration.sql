-- =============================================================================
-- THC Club: Editable Content Management
-- Table to store terms & conditions, FAQs, and contract templates
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_content (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  contract_template TEXT,
  terms_conditions TEXT,
  faqs JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Insert default row
INSERT INTO platform_content (id, contract_template, terms_conditions, faqs)
VALUES (
  1,
  'BRAND PARTNERSHIP AGREEMENT
The Hidden Collective Club (THC Club)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THIS PARTNERSHIP AGREEMENT ("Agreement") is entered into as of the date of digital acceptance between:
THE HIDDEN COLLECTIVE CLUB
Kathmandu, Nepal
(hereinafter "THC Club")
AND
{{BRAND_NAME}}
Email: {{BRAND_EMAIL}}
Phone: {{BRAND_PHONE}}
(hereinafter "Brand Partner")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SHELF ALLOTMENT & PLACEMENT
   The Brand Partner acknowledges that specific shelf slot assignment is determined exclusively by THC Club.

2. FINANCIAL TERMS
   2.1 One-Time Registration Fee: NPR 800.
   2.2 Monthly Shelf Rent: As per the selected zone tier.
   2.3 Platform Partnership Fee (PPF): Performance-based fee of 3%-10%.
   2.4 Payments are settled in-person.

3. PERFORMANCE & CONDUCT
   Brand Partners must maintain minimum stock levels and submit products for approval.

4. EXCLUSIVITY & BRAND STANDARDS
   Products must be original. Counterfeit goods are strictly prohibited.

5. TERMINATION
   30 days written notice for termination.

6. GOVERNING LAW
   This Agreement shall be governed by the laws of Nepal.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BY DIGITALLY SIGNING THIS AGREEMENT, BOTH PARTIES CONFIRM THEY HAVE READ, UNDERSTOOD, AND AGREE TO THE TERMS AND CONDITIONS ABOVE.',
  '# The Hidden Collective terms and conditions
Welcome to THC Club. By registering as a Brand Partner you agree to our policies.',
  '[]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Policies
ALTER TABLE platform_content ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read it
DROP POLICY IF EXISTS "Anyone can read content" ON platform_content;
CREATE POLICY "Anyone can read content" ON platform_content
  FOR SELECT USING (true);

-- Only admins can update
DROP POLICY IF EXISTS "Admins can update content" ON platform_content;
CREATE POLICY "Admins can update content" ON platform_content
  FOR UPDATE USING (
    (SELECT role FROM admin_users WHERE email = auth.email()) IN ('super_admin', 'manager')
  );

NOTIFY pgrst, 'reload schema';
