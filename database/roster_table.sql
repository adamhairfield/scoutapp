-- Roster Table
-- Stores official team roster members with their roles and details
-- Separate from group_members to distinguish between group participants and official roster

CREATE TABLE IF NOT EXISTS roster (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Player Details
  role TEXT DEFAULT 'player' CHECK (role IN ('player', 'coach', 'assistant_coach', 'manager', 'captain', 'trainer')),
  position TEXT,
  jersey_number TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'injured', 'suspended')),
  
  -- Registration Info (if added via registration)
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  
  -- Metadata
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES profiles(id),
  removed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  -- Ensure unique player per group
  UNIQUE(group_id, player_id)
);

-- Indexes for faster lookups
CREATE INDEX idx_roster_group ON roster(group_id);
CREATE INDEX idx_roster_player ON roster(player_id);
CREATE INDEX idx_roster_status ON roster(status);
CREATE INDEX idx_roster_role ON roster(role);
CREATE INDEX idx_roster_group_status ON roster(group_id, status);

-- RLS Policies
ALTER TABLE roster ENABLE ROW LEVEL SECURITY;

-- Anyone in the group can view the roster
CREATE POLICY "Group members can view roster"
  ON roster FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE player_id = auth.uid()
    )
    OR
    group_id IN (
      SELECT id FROM groups WHERE leader_id = auth.uid()
    )
  );

-- Group leaders can add to roster
CREATE POLICY "Group leaders can add to roster"
  ON roster FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id FROM groups WHERE leader_id = auth.uid()
    )
  );

-- Group leaders can update roster
CREATE POLICY "Group leaders can update roster"
  ON roster FOR UPDATE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE leader_id = auth.uid()
    )
  );

-- Group leaders can remove from roster
CREATE POLICY "Group leaders can delete from roster"
  ON roster FOR DELETE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE leader_id = auth.uid()
    )
  );

-- Function to get active roster count
CREATE OR REPLACE FUNCTION get_active_roster_count(group_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM roster
    WHERE group_id = group_uuid AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if player is on roster
CREATE OR REPLACE FUNCTION is_on_roster(player_uuid UUID, group_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM roster
    WHERE player_id = player_uuid 
    AND group_id = group_uuid 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update removed_at when status changes to inactive
CREATE OR REPLACE FUNCTION update_roster_removed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != 'active' AND OLD.status = 'active' THEN
    NEW.removed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roster_status_change
  BEFORE UPDATE ON roster
  FOR EACH ROW
  EXECUTE FUNCTION update_roster_removed_at();

-- View for easy roster display with player info
CREATE OR REPLACE VIEW roster_with_player_info AS
SELECT 
  r.id,
  r.group_id,
  r.player_id,
  r.role,
  r.position,
  r.jersey_number,
  r.status,
  r.added_at,
  r.registration_id,
  r.notes,
  p.name as player_name,
  p.email as player_email,
  p.phone as player_phone,
  p.bio as player_bio,
  g.name as group_name
FROM roster r
JOIN profiles p ON r.player_id = p.id
JOIN groups g ON r.group_id = g.id;
