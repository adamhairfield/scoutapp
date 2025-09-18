-- Ensure profile update policies are working correctly

-- Drop and recreate the profile update policy to make sure it's correct
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create a comprehensive update policy for profiles
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Also ensure users can insert their own profile (for signup)
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON profiles;

CREATE POLICY "Enable insert for authenticated users during signup" ON profiles
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id OR 
    auth.uid() IS NULL OR
    current_setting('role') = 'service_role'
  );

-- Test the update policy by trying to update a profile
-- (This will only work if you replace 'your-user-id' with an actual user ID)
-- UPDATE profiles SET name = 'Test Update' WHERE id = auth.uid();

-- Verify policies are active
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
AND cmd = 'UPDATE';

SELECT 'Profile update policies fixed!' as status;
