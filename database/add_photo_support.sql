-- Add photo support to group_posts table
-- This script adds columns to support photo attachments in group posts

-- Add photo_url column to group_posts table
ALTER TABLE group_posts 
ADD COLUMN photo_url TEXT,
ADD COLUMN photo_urls TEXT[]; -- For multiple photos

-- Create storage bucket for group photos
-- Note: This needs to be run in Supabase Storage dashboard or via API
-- Bucket name: 'group-photos'
-- Public: false (requires authentication)
-- File size limit: 10MB
-- Allowed file types: image/*

-- Create RLS policies for storage bucket
-- These policies will be applied to the storage.objects table

-- Policy to allow authenticated users to upload photos to their groups
CREATE POLICY "Allow authenticated users to upload group photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'group-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT g.id::text 
    FROM groups g 
    WHERE g.leader_id = auth.uid()
    OR g.id IN (
      SELECT gm.group_id 
      FROM group_members gm 
      WHERE gm.player_id = auth.uid()
    )
  )
);

-- Policy to allow users to view photos from groups they belong to
CREATE POLICY "Allow users to view group photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'group-photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT g.id::text 
    FROM groups g 
    WHERE g.leader_id = auth.uid()
    OR g.id IN (
      SELECT gm.group_id 
      FROM group_members gm 
      WHERE gm.player_id = auth.uid()
    )
  )
);

-- Policy to allow users to delete their own uploaded photos
CREATE POLICY "Allow users to delete their own group photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'group-photos' 
  AND auth.role() = 'authenticated'
  AND owner = auth.uid()
);

-- Update group_posts table to include photo information in queries
-- Add index for better performance when querying posts with photos
CREATE INDEX IF NOT EXISTS idx_group_posts_photo_url ON group_posts(photo_url) WHERE photo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_posts_photo_urls ON group_posts USING GIN(photo_urls) WHERE photo_urls IS NOT NULL;

-- Add comments to document the new columns
COMMENT ON COLUMN group_posts.photo_url IS 'URL for single photo attachment';
COMMENT ON COLUMN group_posts.photo_urls IS 'Array of URLs for multiple photo attachments';
