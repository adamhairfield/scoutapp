-- Fix RLS policy recursion issues
-- Run this after the migration to fix the infinite recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON group_members;
DROP POLICY IF EXISTS "Leaders can manage group members" ON group_members;

-- Create fixed policies for group_members (avoiding recursion)
CREATE POLICY "Users can view group members for groups they belong to" ON group_members
  FOR SELECT USING (
    -- User is the leader of the group
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_members.group_id AND leader_id = auth.uid()
    )
    OR
    -- User is a member of the group (direct check without recursion)
    player_id = auth.uid()
  );

CREATE POLICY "Leaders can manage group members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_members.group_id AND leader_id = auth.uid()
    )
  );

-- Also fix the groups policy to avoid potential recursion
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;

CREATE POLICY "Users can view groups they are members of" ON groups
  FOR SELECT USING (
    -- User is the leader
    auth.uid() = leader_id 
    OR 
    -- User is a member (simple check)
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = groups.id AND player_id = auth.uid()
    )
  );

-- Fix the join requests policy to avoid recursion
DROP POLICY IF EXISTS "Users can view join requests for their groups" ON group_join_requests;

CREATE POLICY "Users can view join requests for their groups" ON group_join_requests
  FOR SELECT USING (
    -- User created the request
    auth.uid() = user_id 
    OR
    -- User is the leader of the group
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_join_requests.group_id AND leader_id = auth.uid()
    )
  );
