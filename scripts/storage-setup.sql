-- ============================================================
-- THC Club - Storage Infrastructure Setup
-- ============================================================

-- 1. Create the 'media' bucket for logos, product images, and assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public Access - Allow anyone to read files in the media bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'media');

-- 4. Policy: Brand Upload Access - Allow brands to upload to their specific folder
-- Path format: brand_[brand_id]/...
CREATE POLICY "Brand Upload Access" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'media' AND 
  (storage.foldername(name))[1] = 'brand_' || (
    SELECT id::text FROM public.brands WHERE user_id = auth.uid() LIMIT 1
  )
);

-- 5. Policy: Brand Update/Delete Access - Allow brands to manage their own files
CREATE POLICY "Brand Management Access" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'media' AND 
  (storage.foldername(name))[1] = 'brand_' || (
    SELECT id::text FROM public.brands WHERE user_id = auth.uid() LIMIT 1
  )
)
WITH CHECK (
  bucket_id = 'media' AND 
  (storage.foldername(name))[1] = 'brand_' || (
    SELECT id::text FROM public.brands WHERE user_id = auth.uid() LIMIT 1
  )
);

-- 6. Policy: Admin Full Access - Allow admins to manage everything
-- Assuming admins are NOT using Supabase Auth native (they use custom sessions), 
-- you may need to add a service_role policy or similar.
CREATE POLICY "Admin Full Access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');
