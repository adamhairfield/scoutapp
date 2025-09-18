-- Test profile update functionality

-- Check current RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if profiles table exists and has name column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('id', 'name', 'profile_picture_url');

-- Test update (replace 'your-user-id' with actual user ID)
-- UPDATE profiles SET name = 'Test Name Update' WHERE id = 'your-user-id';

-- Verify the update worked
-- SELECT id, name, email FROM profiles WHERE id = 'your-user-id';

SELECT 'Profile update test queries ready!' as status;
