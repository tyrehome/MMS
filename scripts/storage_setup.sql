-- FORCEFUL STORAGE SETUP
-- This script ensures buckets exist AND are public.
-- Run this in the Supabase SQL Editor.

-- 1. Ensure Buckets are PUBLIC
INSERT INTO storage.buckets (id, name, public)
VALUES ('tires', 'tires', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2. Ensure RLS Policies for 'tires'
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'tires');

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'tires' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
CREATE POLICY "Authenticated Update" ON storage.objects
FOR UPDATE USING (bucket_id = 'tires' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete" ON storage.objects
FOR DELETE USING (bucket_id = 'tires' AND auth.role() = 'authenticated');

-- 3. Ensure RLS Policies for 'logos'
DROP POLICY IF EXISTS "Public Logo Access" ON storage.objects;
CREATE POLICY "Public Logo Access" ON storage.objects
FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated Logo Upload" ON storage.objects;
CREATE POLICY "Authenticated Logo Upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Logo Update" ON storage.objects;
CREATE POLICY "Authenticated Logo Update" ON storage.objects
FOR UPDATE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Logo Delete" ON storage.objects;
CREATE POLICY "Authenticated Logo Delete" ON storage.objects
FOR DELETE USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
