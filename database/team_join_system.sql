-- Create team join system for parents and players
-- This allows teams to have join codes and manage join requests

-- Add join_code column to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS join_code VARCHAR(8) UNIQUE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS allow_join_requests BOOLEAN DEFAULT true;

-- Create function to generate random join codes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result VARCHAR(8) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate join codes for new teams
CREATE OR REPLACE FUNCTION set_team_join_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := generate_join_code();
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM teams WHERE join_code = NEW.join_code AND id != NEW.id) LOOP
      NEW.join_code := generate_join_code();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_team_join_code
  BEFORE INSERT OR UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION set_team_join_code();

-- Create team_join_requests table
CREATE TABLE IF NOT EXISTS team_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('player', 'parent')),
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- For parent requests, which player they're joining for
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id, player_id)
);

-- Enable RLS on team_join_requests
ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_join_requests
CREATE POLICY "Users can view their own join requests" ON team_join_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Coaches can view requests for their teams" ON team_join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_join_requests.team_id 
      AND teams.coach_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own join requests" ON team_join_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coaches can update requests for their teams" ON team_join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_join_requests.team_id 
      AND teams.coach_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team_id ON team_join_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_user_id ON team_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_status ON team_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_teams_join_code ON teams(join_code);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_join_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_join_requests_updated_at
  BEFORE UPDATE ON team_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_team_join_requests_updated_at();

-- Update existing teams to have join codes
UPDATE teams SET join_code = generate_join_code() WHERE join_code IS NULL;
