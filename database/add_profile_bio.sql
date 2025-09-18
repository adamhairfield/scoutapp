-- Add bio field to profiles table

-- Add bio column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.bio IS 'User profile bio/description text';

-- Update RLS policies to allow users to update their own bio
DROP POLICY IF EXISTS "Users can update own profile bio" ON profiles;

CREATE POLICY "Users can update own profile bio" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create index for better performance if needed for bio searches
CREATE INDEX IF NOT EXISTS idx_profiles_bio ON profiles USING gin(to_tsvector('english', bio));

SELECT 'Profile bio field added successfully!' as status;
