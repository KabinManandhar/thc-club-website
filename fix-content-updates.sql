-- Create RPC for updating platform content to bypass RLS for custom admin system
CREATE OR REPLACE FUNCTION update_platform_content(
    p_id INT,
    p_contract_template TEXT DEFAULT NULL,
    p_terms_conditions TEXT DEFAULT NULL,
    p_faqs JSONB DEFAULT NULL,
    p_protocols JSONB DEFAULT NULL,
    p_origins TEXT DEFAULT NULL,
    p_updated_by TEXT DEFAULT 'Admin'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_id != 1 THEN
    RAISE EXCEPTION 'Only ID 1 is allowed for platform content';
  END IF;

  UPDATE platform_content
  SET
    contract_template = COALESCE(p_contract_template, contract_template),
    terms_conditions = COALESCE(p_terms_conditions, terms_conditions),
    faqs = COALESCE(p_faqs, faqs),
    protocols = COALESCE(p_protocols, protocols),
    origins = COALESCE(p_origins, origins),
    updated_by = COALESCE(p_updated_by, updated_by),
    updated_at = now()
  WHERE id = p_id;
  
  -- If row doesn't exist, insert it (though it should already exist due to seed)
  IF NOT FOUND THEN
    INSERT INTO platform_content (id, contract_template, terms_conditions, faqs, protocols, origins, updated_by)
    VALUES (p_id, p_contract_template, p_terms_conditions, p_faqs, p_protocols, p_origins, p_updated_by);
  END IF;
END;
$$;

-- Also fix the RLS policy for READ to allow anyone (anon and authenticated)
ALTER TABLE platform_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read content" ON platform_content;
CREATE POLICY "Anyone can read content" ON platform_content FOR SELECT USING (true);

-- Ensure postgrest reloads the schema
NOTIFY pgrst, 'reload schema';
