-- Setup profile pictures storage bucket and policies

-- Create the profile-pictures bucket (this needs to be done in Supabase Storage UI first)
-- Then run this SQL to set up the policies

-- Create policy to allow users to upload their own profile pictures
CREATE POLICY "Users can upload their own profile pictures" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-pictures' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-pictures' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-pictures' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow public read access to profile pictures
CREATE POLICY "Profile pictures are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pictures');

-- Add profile_picture_url column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_picture_url ON profiles(profile_picture_url);

-- Add comment
COMMENT ON COLUMN profiles.profile_picture_url IS 'URL to user profile picture stored in Supabase Storage';

SELECT 'Profile storage setup completed!' as status;
