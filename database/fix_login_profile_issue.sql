-- Fix profile access issues during login
-- This addresses the "Profile not found" error when logging in with existing users

-- First, let's check if there are any profiles that exist but can't be accessed due to RLS
-- Temporarily disable RLS to see all profiles (run this manually to debug)
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- SELECT id, email, name, role FROM profiles;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update the profiles RLS policies to be more permissive for authenticated users
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new policies that allow authenticated users to access profiles
CREATE POLICY "authenticated_users_can_view_profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "users_can_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow profile creation during signup or by service role
CREATE POLICY "allow_profile_creation" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'service_role' OR
    auth.uid() IS NULL
  );

-- Create a function to manually create missing profiles for existing users
CREATE OR REPLACE FUNCTION create_missing_profile(user_id UUID, user_email TEXT, user_name TEXT DEFAULT NULL, user_role TEXT DEFAULT 'player')
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Insert or update the profile
  INSERT INTO profiles (id, email, name, role, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
    COALESCE(user_name, split_part(user_email, '@', 1)),
    user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = NOW()
  RETURNING id INTO profile_id;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_missing_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Improve the user creation trigger to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Use the create_missing_profile function for consistency
  PERFORM create_missing_profile(
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'player')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a view to help debug profile issues
CREATE OR REPLACE VIEW user_profile_debug AS
SELECT 
  au.id as auth_user_id,
  au.email as auth_email,
  au.created_at as auth_created_at,
  p.id as profile_id,
  p.email as profile_email,
  p.name as profile_name,
  p.role as profile_role,
  p.created_at as profile_created_at,
  CASE 
    WHEN p.id IS NULL THEN 'MISSING_PROFILE'
    WHEN au.email != p.email THEN 'EMAIL_MISMATCH'
    ELSE 'OK'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- Grant access to the debug view
GRANT SELECT ON user_profile_debug TO authenticated;

-- Add a comment explaining the fix
COMMENT ON FUNCTION create_missing_profile IS 'Creates a profile for existing users who may not have one due to trigger failures';

-- Also fix group creation policies to allow any user to create groups
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Leaders can manage their groups" ON groups;

-- Create separate policies for different operations
-- 1. Allow any authenticated user to create a group (they become the leader)
CREATE POLICY "authenticated_users_can_create_groups" ON groups
  FOR INSERT WITH CHECK (
    auth.uid() = leader_id AND 
    auth.uid() IS NOT NULL
  );

-- 2. Allow leaders to update their own groups
CREATE POLICY "leaders_can_update_their_groups" ON groups
  FOR UPDATE USING (auth.uid() = leader_id);

-- 3. Allow leaders to delete their own groups
CREATE POLICY "leaders_can_delete_their_groups" ON groups
  FOR DELETE USING (auth.uid() = leader_id);
