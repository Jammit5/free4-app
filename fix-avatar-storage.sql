-- First, drop all existing policies on storage.objects for avatars bucket
DROP POLICY IF EXISTS "Avatar upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete policy" ON storage.objects;

-- Simple policies for avatars bucket
-- Allow authenticated users to upload to avatars bucket
CREATE POLICY "Avatars upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update their uploads in avatars bucket  
CREATE POLICY "Avatars update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow public read access
CREATE POLICY "Avatars public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow authenticated users to delete from avatars bucket
CREATE POLICY "Avatars delete"
ON storage.objects FOR DELETE  
TO authenticated
USING (bucket_id = 'avatars');