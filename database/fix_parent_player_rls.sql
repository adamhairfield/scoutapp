-- Fix RLS policies for parent_player_relationships table
-- This allows parents to create relationships with their children

-- Drop existing policies
DROP POLICY IF EXISTS "Parents can manage their own relationships" ON parent_player_relationships;
DROP POLICY IF EXISTS "Parents can view their own relationships" ON parent_player_relationships;
DROP POLICY IF EXISTS "Players can view their parent relationships" ON parent_player_relationships;
DROP POLICY IF EXISTS "Coaches can view relationships for their team members" ON parent_player_relationships;

-- Create new, working policies
CREATE POLICY "Parents can create relationships" ON parent_player_relationships
  FOR INSERT WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can view their relationships" ON parent_player_relationships
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Players can view their parent relationships" ON parent_player_relationships
  FOR SELECT USING (player_id = auth.uid());

CREATE POLICY "Parents can update their relationships" ON parent_player_relationships
  FOR UPDATE USING (parent_id = auth.uid());

CREATE POLICY "Parents can delete their relationships" ON parent_player_relationships
  FOR DELETE USING (parent_id = auth.uid());

CREATE POLICY "Coaches can view relationships for their team members" ON parent_player_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE t.coach_id = auth.uid() 
      AND tm.player_id = parent_player_relationships.player_id
    )
  );
