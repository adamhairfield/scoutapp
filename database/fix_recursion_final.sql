-- Final fix for RLS recursion - completely eliminate circular references
-- This uses a simple approach that avoids any cross-table policy references

-- Disable RLS temporarily
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE parent_player_relationships DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start completely fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public')
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

-- Create simple, non-recursive policies using functions to avoid circular references

-- Create a function to check if user is group leader (avoids recursion)
CREATE OR REPLACE FUNCTION is_group_leader(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM groups 
    WHERE id = group_uuid AND leader_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is group member (avoids recursion)
CREATE OR REPLACE FUNCTION is_group_member(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = group_uuid AND player_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Groups policies using functions
CREATE POLICY "groups_leader_access" ON groups
  FOR ALL USING (is_group_leader(id, auth.uid()));

CREATE POLICY "groups_member_read" ON groups
  FOR SELECT USING (is_group_member(id, auth.uid()));

-- Group members policies using functions
CREATE POLICY "group_members_leader_access" ON group_members
  FOR ALL USING (is_group_leader(group_id, auth.uid()));

CREATE POLICY "group_members_self_access" ON group_members
  FOR ALL USING (player_id = auth.uid());

-- Join requests policies
CREATE POLICY "join_requests_own" ON group_join_requests
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "join_requests_leader" ON group_join_requests
  FOR ALL USING (is_group_leader(group_id, auth.uid()));

-- Messages policies
CREATE POLICY "messages_own" ON messages
  FOR ALL USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Parent-player relationships policies
CREATE POLICY "relationships_own" ON parent_player_relationships
  FOR ALL USING (parent_id = auth.uid() OR player_id = auth.uid());

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_group_leader(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_group_member(UUID, UUID) TO authenticated;

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
