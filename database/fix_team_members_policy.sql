-- Fix infinite recursion in RLS policies
-- Run this to fix the team creation error

-- Drop all existing policies for clean slate
DROP POLICY IF EXISTS "Coaches can manage their teams" ON teams;
DROP POLICY IF EXISTS "Coaches can manage team members" ON team_members;
DROP POLICY IF EXISTS "Players can view team memberships" ON team_members;
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
DROP POLICY IF EXISTS "Players can view teams they belong to" ON teams;
DROP POLICY IF EXISTS "Coaches can manage their own teams" ON teams;

-- Create simple, non-recursive policies for teams
CREATE POLICY "Coaches can insert their own teams" ON teams
  FOR INSERT WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches can update their own teams" ON teams
  FOR UPDATE USING (coach_id = auth.uid());

CREATE POLICY "Coaches can delete their own teams" ON teams
  FOR DELETE USING (coach_id = auth.uid());

CREATE POLICY "Anyone can view teams" ON teams
  FOR SELECT USING (true);

-- Create simple policies for team_members
CREATE POLICY "Coaches can manage team members" ON team_members
  FOR ALL USING (
    team_id IN (
      SELECT id FROM teams WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "Users can view team memberships" ON team_members
  FOR SELECT USING (true);
