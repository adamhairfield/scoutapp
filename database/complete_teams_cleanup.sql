-- Complete cleanup of teams references
-- This will remove all traces of the old teams schema

-- Step 1: Drop any views that might reference teams
DROP VIEW IF EXISTS team_stats CASCADE;
DROP VIEW IF EXISTS team_roster CASCADE;
DROP VIEW IF EXISTS team_schedule CASCADE;

-- Step 2: Drop any functions that might reference teams
DROP FUNCTION IF EXISTS get_team_members(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_teams(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_team(TEXT, TEXT, UUID) CASCADE;

-- Step 3: Check and drop the teams table if it still exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teams') THEN
    RAISE NOTICE 'Dropping teams table...';
    DROP TABLE teams CASCADE;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'team_members') THEN
    RAISE NOTICE 'Dropping team_members table...';
    DROP TABLE team_members CASCADE;
  END IF;
END $$;

-- Step 4: Ensure groups table exists with correct structure
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  leader_id UUID REFERENCES profiles(id) NOT NULL,
  description TEXT,
  season TEXT,
  cover_photo_url TEXT,
  join_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Ensure group_members table exists
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  position TEXT,
  jersey_number TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, player_id)
);

-- Step 6: Update other tables to use group_id instead of team_id
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);
ALTER TABLE games ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);
ALTER TABLE practices ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

-- Step 7: Drop old team_id columns if they exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'team_id') THEN
    -- Copy data from team_id to group_id if needed
    UPDATE messages SET group_id = team_id WHERE group_id IS NULL AND team_id IS NOT NULL;
    ALTER TABLE messages DROP COLUMN team_id;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'player_stats' AND column_name = 'team_id') THEN
    UPDATE player_stats SET group_id = team_id WHERE group_id IS NULL AND team_id IS NOT NULL;
    ALTER TABLE player_stats DROP COLUMN team_id;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'team_id') THEN
    UPDATE games SET group_id = team_id WHERE group_id IS NULL AND team_id IS NOT NULL;
    ALTER TABLE games DROP COLUMN team_id;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'practices' AND column_name = 'team_id') THEN
    UPDATE practices SET group_id = team_id WHERE group_id IS NULL AND team_id IS NOT NULL;
    ALTER TABLE practices DROP COLUMN team_id;
  END IF;
END $$;

-- Step 8: Enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Step 9: Create helper functions
CREATE OR REPLACE FUNCTION is_group_leader(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM groups 
    WHERE id = group_uuid AND leader_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_group_member(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = group_uuid AND player_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_group_leader(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_group_member(UUID, UUID) TO authenticated;

-- Step 10: Drop ALL old policies (comprehensive cleanup)
DROP POLICY IF EXISTS "Coaches can manage their teams" ON groups;
DROP POLICY IF EXISTS "Team members can view their teams" ON groups;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
DROP POLICY IF EXISTS "authenticated_users_can_create_groups" ON groups;
DROP POLICY IF EXISTS "leaders_can_update_their_groups" ON groups;
DROP POLICY IF EXISTS "leaders_can_delete_their_groups" ON groups;
DROP POLICY IF EXISTS "Leaders can manage their groups" ON groups;

DROP POLICY IF EXISTS "Coaches can manage team members" ON group_members;
DROP POLICY IF EXISTS "Users can view team members for teams they belong to" ON group_members;
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON group_members;
DROP POLICY IF EXISTS "Leaders can manage group members" ON group_members;
DROP POLICY IF EXISTS "group_members_select" ON group_members;
DROP POLICY IF EXISTS "group_members_manage" ON group_members;

-- Step 11: Create clean, simple policies
CREATE POLICY "groups_select" ON groups
  FOR SELECT USING (
    auth.uid() = leader_id OR 
    is_group_member(id, auth.uid())
  );

CREATE POLICY "groups_insert" ON groups
  FOR INSERT WITH CHECK (
    auth.uid() = leader_id AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "groups_update" ON groups
  FOR UPDATE USING (auth.uid() = leader_id);

CREATE POLICY "groups_delete" ON groups
  FOR DELETE USING (auth.uid() = leader_id);

CREATE POLICY "group_members_select" ON group_members
  FOR SELECT USING (
    is_group_leader(group_id, auth.uid()) OR 
    is_group_member(group_id, auth.uid())
  );

CREATE POLICY "group_members_insert" ON group_members
  FOR INSERT WITH CHECK (is_group_leader(group_id, auth.uid()));

CREATE POLICY "group_members_update" ON group_members
  FOR UPDATE USING (is_group_leader(group_id, auth.uid()));

CREATE POLICY "group_members_delete" ON group_members
  FOR DELETE USING (is_group_leader(group_id, auth.uid()));

-- Step 12: Create indexes
CREATE INDEX IF NOT EXISTS idx_groups_leader_id ON groups(leader_id);
CREATE INDEX IF NOT EXISTS idx_groups_cover_photo ON groups(cover_photo_url);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_player_id ON group_members(player_id);

-- Step 13: Add comments
COMMENT ON TABLE groups IS 'Groups for organizing players';
COMMENT ON TABLE group_members IS 'Members of groups';
COMMENT ON COLUMN groups.cover_photo_url IS 'URL to the group cover photo stored in Supabase Storage';

-- Final verification
SELECT 'Complete teams cleanup finished successfully!' as status;

-- Show current tables to verify
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('groups', 'group_members', 'teams', 'team_members')
ORDER BY table_name;
