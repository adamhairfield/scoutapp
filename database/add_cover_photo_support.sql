-- Add cover photo support to groups table
-- This enables storing cover photo URLs for groups

-- Add cover_photo_url column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Create a storage bucket for group cover photos (run this in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('group-covers', 'group-covers', true);

-- Create RLS policies for the storage bucket
-- These policies allow authenticated users to upload and view group cover photos

-- Policy to allow authenticated users to upload images
-- CREATE POLICY "Authenticated users can upload group covers" ON storage.objects
--   FOR INSERT WITH CHECK (
--     auth.role() = 'authenticated' AND
--     bucket_id = 'group-covers'
--   );

-- Policy to allow public read access to group cover photos
-- CREATE POLICY "Public access to group covers" ON storage.objects
--   FOR SELECT USING (bucket_id = 'group-covers');

-- Policy to allow group leaders to delete their group cover photos
-- CREATE POLICY "Group leaders can delete their covers" ON storage.objects
--   FOR DELETE USING (
--     auth.role() = 'authenticated' AND
--     bucket_id = 'group-covers'
--   );

-- Add index for better performance when querying by cover photo
CREATE INDEX IF NOT EXISTS idx_groups_cover_photo ON groups(cover_photo_url);

-- Add comment
COMMENT ON COLUMN groups.cover_photo_url IS 'URL to the group cover photo stored in Supabase Storage';
