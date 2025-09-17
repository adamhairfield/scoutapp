-- Simple RLS fix - completely eliminate recursion with minimal policies
-- This uses the simplest possible approach to avoid any circular references

-- Temporarily disable RLS to clean up
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE parent_player_relationships DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies completely
DROP POLICY IF EXISTS "group_leaders_full_access" ON groups;
DROP POLICY IF EXISTS "group_members_read_access" ON groups;
DROP POLICY IF EXISTS "group_leaders_manage_members" ON group_members;
DROP POLICY IF EXISTS "group_members_read_members" ON group_members;
DROP POLICY IF EXISTS "users_create_join_requests" ON group_join_requests;
DROP POLICY IF EXISTS "users_read_own_join_requests" ON group_join_requests;
DROP POLICY IF EXISTS "leaders_manage_join_requests" ON group_join_requests;
DROP POLICY IF EXISTS "users_read_own_messages" ON messages;
DROP POLICY IF EXISTS "users_send_messages" ON messages;
DROP POLICY IF EXISTS "users_read_own_relationships" ON parent_player_relationships;
DROP POLICY IF EXISTS "parents_manage_relationships" ON parent_player_relationships;
DROP POLICY IF EXISTS "leaders_read_player_relationships" ON parent_player_relationships;

-- Also drop any other policies that might exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename IN ('groups', 'group_members', 'group_join_requests', 'messages', 'parent_player_relationships') AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename;
    END LOOP;
END
$$;

-- Re-enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_player_relationships ENABLE ROW LEVEL SECURITY;

-- Create VERY simple policies that cannot cause recursion

-- Groups: Only leaders can see/manage their groups
CREATE POLICY "groups_leader_only" ON groups
  FOR ALL USING (auth.uid() = leader_id);

-- Group Members: Only leaders can manage, anyone can read if they're in the group
CREATE POLICY "group_members_leader_manage" ON group_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND leader_id = auth.uid())
  );

CREATE POLICY "group_members_self_read" ON group_members
  FOR SELECT USING (player_id = auth.uid());

-- Join Requests: Simple policies
CREATE POLICY "join_requests_create" ON group_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "join_requests_read_own" ON group_join_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "join_requests_leader_manage" ON group_join_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM groups WHERE id = group_join_requests.group_id AND leader_id = auth.uid())
  );

-- Messages: Simple policies
CREATE POLICY "messages_own_only" ON messages
  FOR ALL USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Parent-Player Relationships: Simple policies
CREATE POLICY "relationships_own_only" ON parent_player_relationships
  FOR ALL USING (auth.uid() = parent_id OR auth.uid() = player_id);

-- Verify what policies were created
SELECT tablename, policyname, cmd, permissive
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('groups', 'group_members', 'group_join_requests', 'messages', 'parent_player_relationships')
ORDER BY tablename, policyname;
