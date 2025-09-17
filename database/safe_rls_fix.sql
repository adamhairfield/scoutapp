-- Safe RLS fix that handles existing policies properly
-- This version drops all policies more comprehensively and recreates them

-- Disable RLS temporarily
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE parent_player_relationships DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies using a more comprehensive approach
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on groups table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'groups' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON groups';
    END LOOP;
    
    -- Drop all policies on group_members table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_members' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON group_members';
    END LOOP;
    
    -- Drop all policies on group_join_requests table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_join_requests' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON group_join_requests';
    END LOOP;
    
    -- Drop all policies on messages table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON messages';
    END LOOP;
    
    -- Drop all policies on parent_player_relationships table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'parent_player_relationships' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON parent_player_relationships';
    END LOOP;
END
$$;

-- Re-enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_player_relationships ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for groups
CREATE POLICY "group_leaders_full_access" ON groups
  FOR ALL USING (auth.uid() = leader_id);

CREATE POLICY "group_members_read_access" ON groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = groups.id AND player_id = auth.uid()
    )
  );

-- Create simple policies for group_members
CREATE POLICY "group_leaders_manage_members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_members.group_id AND leader_id = auth.uid()
    )
  );

CREATE POLICY "group_members_read_members" ON group_members
  FOR SELECT USING (
    -- User is a member of the same group OR is the leader
    group_members.player_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_members.group_id AND leader_id = auth.uid()
    )
  );

-- Create simple policies for group_join_requests
CREATE POLICY "users_create_join_requests" ON group_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_read_own_join_requests" ON group_join_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "leaders_manage_join_requests" ON group_join_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_join_requests.group_id AND leader_id = auth.uid()
    )
  );

-- Create simple policies for messages
CREATE POLICY "users_read_own_messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

CREATE POLICY "users_send_messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Create simple policies for parent_player_relationships
CREATE POLICY "users_read_own_relationships" ON parent_player_relationships
  FOR SELECT USING (
    auth.uid() = parent_id OR auth.uid() = player_id
  );

CREATE POLICY "parents_manage_relationships" ON parent_player_relationships
  FOR ALL USING (auth.uid() = parent_id);

CREATE POLICY "leaders_read_player_relationships" ON parent_player_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      WHERE g.leader_id = auth.uid() 
      AND gm.player_id = parent_player_relationships.player_id
    )
  );

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('groups', 'group_members', 'group_join_requests', 'messages', 'parent_player_relationships')
ORDER BY tablename, policyname;
