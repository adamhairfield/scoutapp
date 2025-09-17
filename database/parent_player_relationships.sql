-- Create parent_player_relationships table for many-to-many connections
-- This allows parents to be associated with multiple players and players to have multiple parents

-- Create the parent_player_relationships table
CREATE TABLE IF NOT EXISTS parent_player_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'parent' CHECK (relationship_type IN ('parent', 'guardian', 'emergency_contact')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parent_id, player_id)
);

-- Enable RLS
ALTER TABLE parent_player_relationships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Parents can view their own relationships" ON parent_player_relationships
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Players can view their parent relationships" ON parent_player_relationships
  FOR SELECT USING (player_id = auth.uid());

CREATE POLICY "Coaches can view relationships for their team members" ON parent_player_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE t.coach_id = auth.uid() 
      AND tm.player_id = parent_player_relationships.player_id
    )
  );

CREATE POLICY "Parents can manage their own relationships" ON parent_player_relationships
  FOR ALL USING (parent_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parent_player_relationships_parent_id ON parent_player_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_player_relationships_player_id ON parent_player_relationships(player_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_parent_player_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parent_player_relationships_updated_at
  BEFORE UPDATE ON parent_player_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_player_relationships_updated_at();

-- Remove parent_id column from profiles table (if it exists)
-- This is now handled by the relationships table
ALTER TABLE profiles DROP COLUMN IF EXISTS parent_id;
