-- Fix RLS policies to allow group members to see their groups
-- This addresses the issue where only leaders could see groups, not members

-- Temporarily disable RLS to update policies
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "groups_leader_only" ON groups;
DROP POLICY IF EXISTS "group_members_leader_manage" ON group_members;
DROP POLICY IF EXISTS "group_members_self_read" ON group_members;

-- Re-enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Create new policies that allow both leaders AND members to see groups

-- Groups: Leaders can manage, members can view
CREATE POLICY "groups_leader_full_access" ON groups
  FOR ALL USING (auth.uid() = leader_id);

CREATE POLICY "groups_member_read_access" ON groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = groups.id AND player_id = auth.uid()
    )
  );

-- Group Members: Leaders can manage, members can view their own membership
CREATE POLICY "group_members_leader_manage" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_members.group_id AND leader_id = auth.uid()
    )
  );

CREATE POLICY "group_members_self_read" ON group_members
  FOR SELECT USING (player_id = auth.uid());

CREATE POLICY "group_members_view_same_group" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id 
      AND gm2.player_id = auth.uid()
    )
  );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('groups', 'group_members')
ORDER BY tablename, policyname;
