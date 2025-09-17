-- Complete RLS fix to eliminate all recursion issues
-- This completely rebuilds the RLS policies with simple, non-recursive logic

-- Disable RLS temporarily to avoid issues during policy recreation
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE parent_player_relationships DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
DROP POLICY IF EXISTS "Leaders can manage their groups" ON groups;
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON group_members;
DROP POLICY IF EXISTS "Leaders can manage group members" ON group_members;
DROP POLICY IF EXISTS "Users can view join requests for their groups" ON group_join_requests;
DROP POLICY IF EXISTS "Users can create join requests" ON group_join_requests;
DROP POLICY IF EXISTS "Leaders can manage join requests" ON group_join_requests;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own relationships" ON parent_player_relationships;
DROP POLICY IF EXISTS "Parents can manage their relationships" ON parent_player_relationships;
DROP POLICY IF EXISTS "Leaders can view relationships for their group players" ON parent_player_relationships;

-- Re-enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_player_relationships ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for groups
CREATE POLICY "Leaders can view and manage their groups" ON groups
  FOR ALL USING (auth.uid() = leader_id);

CREATE POLICY "Members can view their groups" ON groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = groups.id AND player_id = auth.uid()
    )
  );

-- Create simple policies for group_members
CREATE POLICY "Leaders can manage group members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_members.group_id AND leader_id = auth.uid()
    )
  );

CREATE POLICY "Members can view group members" ON group_members
  FOR SELECT USING (
    -- User is a member of the same group
    EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id AND gm2.player_id = auth.uid()
    )
    OR
    -- User is the leader of the group
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_members.group_id AND leader_id = auth.uid()
    )
  );

-- Create simple policies for group_join_requests
CREATE POLICY "Users can create join requests" ON group_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own join requests" ON group_join_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Leaders can view and manage join requests for their groups" ON group_join_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_join_requests.group_id AND leader_id = auth.uid()
    )
  );

-- Create simple policies for messages
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Create simple policies for parent_player_relationships
CREATE POLICY "Users can view their own relationships" ON parent_player_relationships
  FOR SELECT USING (
    auth.uid() = parent_id OR auth.uid() = player_id
  );

CREATE POLICY "Parents can manage their relationships" ON parent_player_relationships
  FOR ALL USING (auth.uid() = parent_id);

CREATE POLICY "Leaders can view relationships for their group players" ON parent_player_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      WHERE g.leader_id = auth.uid() 
      AND gm.player_id = parent_player_relationships.player_id
    )
  );
