-- Allow any authenticated user to create groups
-- This updates the RLS policies to enable group creation for all users

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

-- The SELECT policy remains the same (users can view groups they're members of)
-- This was already defined as "Users can view groups they are members of"

-- Verify the policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'groups'
ORDER BY policyname;
