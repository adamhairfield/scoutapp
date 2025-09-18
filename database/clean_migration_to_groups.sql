-- Clean migration from teams to groups schema
-- This script will safely migrate your existing data or create fresh tables

-- First, check if we have teams table or groups table
-- If teams exists, migrate it. If groups exists, we're good.

-- Step 1: Handle the migration from teams to groups (if teams table exists)
DO $$
BEGIN
  -- Check if teams table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teams') THEN
    -- Migrate teams to groups
    RAISE NOTICE 'Migrating teams table to groups...';
    
    -- Rename teams to groups
    ALTER TABLE teams RENAME TO groups;
    
    -- Rename coach_id to leader_id
    ALTER TABLE groups RENAME COLUMN coach_id TO leader_id;
    
    -- Add join_code if it doesn't exist
    ALTER TABLE groups ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
    
    RAISE NOTICE 'Teams table migrated to groups successfully';
  ELSE
    RAISE NOTICE 'Teams table does not exist, checking for groups table...';
  END IF;
  
  -- Ensure groups table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'groups') THEN
    RAISE NOTICE 'Creating groups table...';
    CREATE TABLE groups (
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
  END IF;
END $$;

-- Step 2: Handle team_members to group_members migration
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'team_members') THEN
    RAISE NOTICE 'Migrating team_members to group_members...';
    ALTER TABLE team_members RENAME TO group_members;
    ALTER TABLE group_members RENAME COLUMN team_id TO group_id;
  ELSE
    -- Create group_members if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'group_members') THEN
      CREATE TABLE group_members (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
        player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
        position TEXT,
        jersey_number TEXT,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(group_id, player_id)
      );
    END IF;
  END IF;
END $$;

-- Step 3: Update other tables that reference teams
DO $$
BEGIN
  -- Update messages table
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'team_id') THEN
    ALTER TABLE messages RENAME COLUMN team_id TO group_id;
  END IF;
  
  -- Update player_stats table
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'player_stats' AND column_name = 'team_id') THEN
    ALTER TABLE player_stats RENAME COLUMN team_id TO group_id;
  END IF;
  
  -- Update games table
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'team_id') THEN
    ALTER TABLE games RENAME COLUMN team_id TO group_id;
  END IF;
  
  -- Update practices table
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'practices' AND column_name = 'team_id') THEN
    ALTER TABLE practices RENAME COLUMN team_id TO group_id;
  END IF;
END $$;

-- Step 4: Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Step 5: Create helper functions to avoid recursion
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_group_leader(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_group_member(UUID, UUID) TO authenticated;

-- Drop old policies and create new ones
DROP POLICY IF EXISTS "Coaches can manage their teams" ON groups;
DROP POLICY IF EXISTS "Team members can view their teams" ON groups;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON groups;
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
DROP POLICY IF EXISTS "authenticated_users_can_create_groups" ON groups;
DROP POLICY IF EXISTS "leaders_can_update_their_groups" ON groups;
DROP POLICY IF EXISTS "leaders_can_delete_their_groups" ON groups;
DROP POLICY IF EXISTS "Leaders can manage their groups" ON groups;

-- Create new group policies using functions
CREATE POLICY "Users can view groups they are members of" ON groups
  FOR SELECT USING (
    auth.uid() = leader_id OR 
    is_group_member(id, auth.uid())
  );

CREATE POLICY "authenticated_users_can_create_groups" ON groups
  FOR INSERT WITH CHECK (
    auth.uid() = leader_id AND 
    auth.uid() IS NOT NULL
  );

CREATE POLICY "leaders_can_update_their_groups" ON groups
  FOR UPDATE USING (auth.uid() = leader_id);

CREATE POLICY "leaders_can_delete_their_groups" ON groups
  FOR DELETE USING (auth.uid() = leader_id);

-- Group members policies
DROP POLICY IF EXISTS "Coaches can manage team members" ON group_members;
DROP POLICY IF EXISTS "Users can view team members for teams they belong to" ON group_members;
DROP POLICY IF EXISTS "Users can view group members for groups they belong to" ON group_members;
DROP POLICY IF EXISTS "Leaders can manage group members" ON group_members;

CREATE POLICY "group_members_select" ON group_members
  FOR SELECT USING (
    is_group_leader(group_id, auth.uid()) OR 
    is_group_member(group_id, auth.uid())
  );

CREATE POLICY "group_members_manage" ON group_members
  FOR ALL USING (is_group_leader(group_id, auth.uid()));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_groups_leader_id ON groups(leader_id);
CREATE INDEX IF NOT EXISTS idx_groups_cover_photo ON groups(cover_photo_url);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_player_id ON group_members(player_id);

-- Add comments
COMMENT ON TABLE groups IS 'Groups for organizing players (formerly teams)';
COMMENT ON TABLE group_members IS 'Members of groups (formerly team members)';
COMMENT ON COLUMN groups.cover_photo_url IS 'URL to the group cover photo stored in Supabase Storage';

-- Final verification
SELECT 'Migration completed successfully!' as status;
