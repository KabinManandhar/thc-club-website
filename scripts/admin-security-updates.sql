-- ============================================================
-- THC Club - Admin Security Terminal Logic
-- ============================================================

-- Function to securely update admin password by verifying their session first
CREATE OR REPLACE FUNCTION public.update_admin_password_securely(
  p_admin_id UUID,
  p_session_token UUID,
  p_new_password_hash TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_session_exists BOOLEAN;
BEGIN
  -- 1. Verify that the session token is valid, matches the admin_id, and has not expired
  SELECT EXISTS (
    SELECT 1 FROM public.admin_sessions 
    WHERE admin_id = p_admin_id 
    AND session_token = p_session_token
    AND expires_at > NOW()
  ) INTO v_session_exists;

  IF NOT v_session_exists THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Authorization failed: Invalid or expired session.');
  END IF;

  -- 2. Update the password hash
  UPDATE public.admin_users
  SET 
    password_hash = p_new_password_hash,
    updated_at = NOW()
  WHERE id = p_admin_id;

  RETURN jsonb_build_object('success', TRUE);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure it is accessible
GRANT EXECUTE ON FUNCTION public.update_admin_password_securely(UUID, UUID, TEXT) TO public, anon, authenticated;
