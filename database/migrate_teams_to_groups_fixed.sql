-- Fixed Migration script to rename teams to groups
-- This handles foreign key constraints properly

-- Step 1: Add join_code column to teams table if it doesn't exist
ALTER TABLE teams ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

-- Step 2: Rename columns first (this is safer than renaming tables with FK constraints)
ALTER TABLE teams RENAME COLUMN coach_id TO leader_id;

-- Step 3: Rename the teams table to groups
ALTER TABLE teams RENAME TO groups;

-- Step 4: Rename team_members table to group_members
ALTER TABLE team_members RENAME TO group_members;

-- Step 5: Rename columns in group_members table
ALTER TABLE group_members RENAME COLUMN team_id TO group_id;

-- Step 6: Rename team_join_requests table to group_join_requests
ALTER TABLE team_join_requests RENAME TO group_join_requests;

-- Step 7: Rename columns in group_join_requests table
ALTER TABLE group_join_requests RENAME COLUMN team_id TO group_id;

-- Step 8: Update messages table column reference
ALTER TABLE messages RENAME COLUMN team_id TO group_id;

-- Step 9: Update player_stats table column reference
ALTER TABLE player_stats RENAME COLUMN team_id TO group_id;

-- Step 10: Update games table column reference
ALTER TABLE games RENAME COLUMN team_id TO group_id;

-- Step 11: Update practices table column reference
ALTER TABLE practices RENAME COLUMN team_id TO group_id;

-- Step 12: Update RLS policies to reference new table names
-- Drop old policies for teams
DROP POLICY IF EXISTS "Users can view teams they are members of" ON groups;
DROP POLICY IF EXISTS "Coaches can manage their teams" ON groups;

-- Drop old policies for team_members
DROP POLICY IF EXISTS "Users can view team members for teams they belong to" ON group_members;
DROP POLICY IF EXISTS "Coaches can manage team members" ON group_members;

-- Drop old policies for team_join_requests
DROP POLICY IF EXISTS "Users can view join requests for their teams" ON group_join_requests;
DROP POLICY IF EXISTS "Coaches can manage join requests" ON group_join_requests;

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

-- Create new policies for group_members
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

-- Create new policies for group_join_requests
CREATE POLICY "Users can view join requests for their groups" ON group_join_requests
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_join_requests.group_id 
      AND (leader_id = auth.uid() OR EXISTS (
        SELECT 1 FROM group_members 
        WHERE group_id = groups.id AND player_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can create join requests" ON group_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leaders can manage join requests" ON group_join_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_join_requests.group_id AND leader_id = auth.uid()
    )
  );

-- Step 13: Update any existing coach relationship access policies
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

-- Step 14: Update message type check constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
  CHECK (message_type IN ('direct', 'group', 'announcement'));

COMMENT ON TABLE groups IS 'Groups (formerly teams) for organizing players';
COMMENT ON TABLE group_members IS 'Members of groups (formerly team members)';
COMMENT ON TABLE group_join_requests IS 'Join requests for groups (formerly team join requests)';
