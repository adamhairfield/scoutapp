-- Migration script to rename teams to groups
-- This script should be run in Supabase SQL editor

-- 1. Rename the teams table to groups
ALTER TABLE teams RENAME TO groups;

-- 2. Rename columns that reference teams
ALTER TABLE groups RENAME COLUMN coach_id TO leader_id;

-- 3. Rename team_members table to group_members
ALTER TABLE team_members RENAME TO group_members;

-- 4. Rename columns in group_members table
ALTER TABLE group_members RENAME COLUMN team_id TO group_id;

-- 5. Rename team_join_requests table to group_join_requests
ALTER TABLE team_join_requests RENAME TO group_join_requests;

-- 6. Rename columns in group_join_requests table
ALTER TABLE group_join_requests RENAME COLUMN team_id TO group_id;

-- 7. Update messages table column reference
ALTER TABLE messages RENAME COLUMN team_id TO group_id;

-- 8. Update foreign key constraint names (if needed)
-- Note: Supabase automatically handles constraint renaming in most cases

-- 9. Update RLS policies to reference new table names
-- Drop old policies
DROP POLICY IF EXISTS "Users can view teams they are members of" ON teams;
DROP POLICY IF EXISTS "Coaches can manage their teams" ON teams;
DROP POLICY IF EXISTS "Users can view team members for teams they belong to" ON team_members;
DROP POLICY IF EXISTS "Coaches can manage team members" ON team_members;
DROP POLICY IF EXISTS "Users can view join requests for their teams" ON team_join_requests;
DROP POLICY IF EXISTS "Coaches can manage join requests" ON team_join_requests;

-- Create new policies for groups
CREATE POLICY "Users can view groups they are members of" ON groups
  FOR SELECT USING (
    auth.uid() = leader_id OR 
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = groups.id AND player_id = auth.uid()
    )
  );

CREATE POLICY "Leaders can manage their groups" ON groups
  FOR ALL USING (auth.uid() = leader_id);

CREATE POLICY "Users can view group members for groups they belong to" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_members.group_id 
      AND (leader_id = auth.uid() OR EXISTS (
        SELECT 1 FROM group_members gm2 
        WHERE gm2.group_id = groups.id AND gm2.player_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Leaders can manage group members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_members.group_id AND leader_id = auth.uid()
    )
  );

CREATE POLICY "Users can view join requests for their groups" ON group_join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_join_requests.group_id 
      AND (leader_id = auth.uid() OR EXISTS (
        SELECT 1 FROM group_members 
        WHERE group_id = groups.id AND player_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Leaders can manage join requests" ON group_join_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_join_requests.group_id AND leader_id = auth.uid()
    )
  );

-- 10. Update any existing coach relationship access policies
DROP POLICY IF EXISTS "Coaches can view relationships for their team players" ON parent_player_relationships;

CREATE POLICY "Leaders can view relationships for their group players" ON parent_player_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      WHERE g.leader_id = auth.uid() 
      AND gm.player_id = parent_player_relationships.player_id
    )
  );

-- 11. Update any triggers or functions that reference teams (if any exist)
-- This would need to be customized based on existing triggers

COMMENT ON TABLE groups IS 'Groups (formerly teams) for organizing players';
COMMENT ON TABLE group_members IS 'Members of groups (formerly team members)';
COMMENT ON TABLE group_join_requests IS 'Join requests for groups (formerly team join requests)';
