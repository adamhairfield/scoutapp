-- Fix migration error by adding ALL missing columns for groups table
-- This comprehensive script ensures all required columns exist

-- Core required columns
ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES profiles(id);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Migration-specific columns
ALTER TABLE groups ADD COLUMN IF NOT EXISTS sportsengine_id TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS parent_group_id UUID REFERENCES groups(id);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP WITH TIME ZONE;

-- Additional feature columns
ALTER TABLE groups ADD COLUMN IF NOT EXISTS group_type TEXT DEFAULT 'team';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Mixed';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS season TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
ALTER TABLE groups ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'hidden'));
ALTER TABLE groups ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Ensure timestamps exist
ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_leader_id ON groups(leader_id);
CREATE INDEX IF NOT EXISTS idx_groups_is_public ON groups(is_public);
CREATE INDEX IF NOT EXISTS idx_groups_sportsengine_id ON groups(sportsengine_id);
CREATE INDEX IF NOT EXISTS idx_groups_parent_group ON groups(parent_group_id);
CREATE INDEX IF NOT EXISTS idx_groups_group_type ON groups(group_type);
CREATE INDEX IF NOT EXISTS idx_groups_visibility ON groups(visibility);
CREATE INDEX IF NOT EXISTS idx_groups_cover_photo ON groups(cover_photo_url);

-- Add helpful comments
COMMENT ON COLUMN groups.created_by IS 'User who created this group (for migration tracking)';
COMMENT ON COLUMN groups.leader_id IS 'Primary leader/admin of the group';
COMMENT ON COLUMN groups.is_public IS 'Whether this group is publicly visible (legacy)';
COMMENT ON COLUMN groups.sportsengine_id IS 'Original SportsEngine team/organization ID';
COMMENT ON COLUMN groups.parent_group_id IS 'Reference to parent organization for team groups';
COMMENT ON COLUMN groups.group_type IS 'Type of group: team, organization, etc.';
COMMENT ON COLUMN groups.gender IS 'Gender category: Male, Female, Mixed, etc.';
COMMENT ON COLUMN groups.visibility IS 'Group visibility: public (searchable), private (invite only), hidden (completely private)';
COMMENT ON COLUMN groups.cover_photo_url IS 'URL to the group cover photo stored in Supabase Storage';

-- Add RLS policies to allow users to create and view groups (needed for migration)
-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can create groups" ON groups;
DROP POLICY IF EXISTS "Users can view own created groups" ON groups;

CREATE POLICY "Users can create groups" ON groups
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view own created groups" ON groups
    FOR SELECT USING (created_by = auth.uid());

-- Add migration support columns to group_members table
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS jersey_number TEXT;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS sportsengine_roster_status TEXT;

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'sportsengine',
    status TEXT NOT NULL DEFAULT 'completed',
    organizations_count INTEGER DEFAULT 0,
    teams_count INTEGER DEFAULT 0,
    members_count INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    migration_data JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for migrations table
CREATE INDEX IF NOT EXISTS idx_migrations_user_id ON migrations(user_id);
CREATE INDEX IF NOT EXISTS idx_migrations_source ON migrations(source);

-- RLS policies for migrations table
ALTER TABLE migrations ENABLE ROW LEVEL SECURITY;

-- Drop existing migration policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view own migrations" ON migrations;
DROP POLICY IF EXISTS "Users can insert own migrations" ON migrations;
DROP POLICY IF EXISTS "Users can update own migrations" ON migrations;

-- Users can only see their own migrations
CREATE POLICY "Users can view own migrations" ON migrations
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own migrations
CREATE POLICY "Users can insert own migrations" ON migrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own migrations
CREATE POLICY "Users can update own migrations" ON migrations
    FOR UPDATE USING (user_id = auth.uid());

-- Add comments for migrations table
COMMENT ON TABLE migrations IS 'Tracks data migrations from external platforms like SportsEngine';
COMMENT ON COLUMN migrations.migration_data IS 'JSON data containing details about what was migrated';

-- Ensure proper CASCADE delete constraints for group deletion
-- This ensures when a group is deleted, all related records are also deleted

-- Update foreign key constraints to CASCADE on delete (if not already set)
-- Note: These may already exist, but we're ensuring they have CASCADE behavior

-- Group members should be deleted when group is deleted
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;
ALTER TABLE group_members ADD CONSTRAINT group_members_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Group posts should be deleted when group is deleted  
ALTER TABLE group_posts DROP CONSTRAINT IF EXISTS group_posts_group_id_fkey;
ALTER TABLE group_posts ADD CONSTRAINT group_posts_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Group join requests should be deleted when group is deleted
ALTER TABLE group_join_requests DROP CONSTRAINT IF EXISTS group_join_requests_group_id_fkey;
ALTER TABLE group_join_requests ADD CONSTRAINT group_join_requests_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Group pins should be deleted when group is deleted
ALTER TABLE group_pins DROP CONSTRAINT IF EXISTS group_pins_group_id_fkey;
ALTER TABLE group_pins ADD CONSTRAINT group_pins_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Messages should be deleted when group is deleted
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_group_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Child groups should be deleted when parent group is deleted
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_parent_group_id_fkey;
ALTER TABLE groups ADD CONSTRAINT groups_parent_group_id_fkey 
    FOREIGN KEY (parent_group_id) REFERENCES groups(id) ON DELETE CASCADE;
