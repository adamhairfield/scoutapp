-- Fix RLS policy to allow coaches to see parent-player relationships for their team members
-- This is needed for messaging functionality

-- Add policy for coaches to view relationships of players on their teams
CREATE POLICY "Coaches can view relationships for their team players" ON parent_player_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE t.coach_id = auth.uid() 
      AND tm.player_id = parent_player_relationships.player_id
    )
  );
