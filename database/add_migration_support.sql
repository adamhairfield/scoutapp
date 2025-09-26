-- Add migration support tables and columns

-- Add SportsEngine integration columns to existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sportsengine_profile_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_migrated BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE groups ADD COLUMN IF NOT EXISTS sportsengine_id TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS parent_group_id UUID REFERENCES groups(id);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS sport TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP WITH TIME ZONE;

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_sportsengine_id ON profiles(sportsengine_profile_id);
CREATE INDEX IF NOT EXISTS idx_groups_sportsengine_id ON groups(sportsengine_id);
CREATE INDEX IF NOT EXISTS idx_groups_parent_group ON groups(parent_group_id);
CREATE INDEX IF NOT EXISTS idx_migrations_user_id ON migrations(user_id);
CREATE INDEX IF NOT EXISTS idx_migrations_source ON migrations(source);

-- RLS policies for migrations table
ALTER TABLE migrations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own migrations
CREATE POLICY "Users can view own migrations" ON migrations
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own migrations
CREATE POLICY "Users can insert own migrations" ON migrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own migrations
CREATE POLICY "Users can update own migrations" ON migrations
    FOR UPDATE USING (user_id = auth.uid());

-- Add some helpful comments
COMMENT ON TABLE migrations IS 'Tracks data migrations from external platforms like SportsEngine';
COMMENT ON COLUMN profiles.sportsengine_profile_id IS 'Original SportsEngine profile ID for migrated users';
COMMENT ON COLUMN profiles.is_migrated IS 'Indicates if this profile was created through migration';
COMMENT ON COLUMN groups.sportsengine_id IS 'Original SportsEngine team/organization ID';
COMMENT ON COLUMN groups.parent_group_id IS 'Reference to parent organization for team groups';
COMMENT ON COLUMN group_members.jersey_number IS 'Player jersey number from SportsEngine';
COMMENT ON COLUMN group_members.sportsengine_roster_status IS 'Original roster status from SportsEngine';
