-- =============================================================================
-- Fix: Admin Store Image Upload RPC
-- Bypass RLS for admin gallery management
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_upload_store_image(
    p_url text,
    p_section text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.store_images (url, section)
    VALUES (p_url, p_section);
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Ensure store_images table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.store_images (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    url text NOT NULL,
    section text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Grant access to Anon for common operations if not already there
GRANT ALL ON public.store_images TO anon;
GRANT ALL ON public.store_images TO authenticated;
GRANT ALL ON public.store_images TO service_role;

