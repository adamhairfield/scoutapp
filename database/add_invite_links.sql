-- Add invite links system to replace join codes
-- This allows group leaders to create shareable links that automatically add users to groups

-- Create group_invite_links table
CREATE TABLE IF NOT EXISTS group_invite_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invite_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  max_uses INTEGER DEFAULT NULL, -- NULL means unlimited
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_group_invite_links_token ON group_invite_links(invite_token);
CREATE INDEX IF NOT EXISTS idx_group_invite_links_group_id ON group_invite_links(group_id);

-- Create table to track who used which invite links
CREATE TABLE IF NOT EXISTS group_invite_uses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_link_id UUID REFERENCES group_invite_links(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(invite_link_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE group_invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invite_uses ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_invite_links
CREATE POLICY "invite_links_leader_manage" ON group_invite_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_invite_links.group_id AND leader_id = auth.uid()
    )
  );

CREATE POLICY "invite_links_public_read" ON group_invite_links
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- RLS policies for group_invite_uses
CREATE POLICY "invite_uses_own" ON group_invite_uses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "invite_uses_leader_read" ON group_invite_uses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_invite_links gil
      JOIN groups g ON gil.group_id = g.id
      WHERE gil.id = group_invite_uses.invite_link_id 
      AND g.leader_id = auth.uid()
    )
  );

-- Function to use an invite link
CREATE OR REPLACE FUNCTION use_invite_link(token TEXT)
RETURNS JSON AS $$
DECLARE
  invite_record RECORD;
  result JSON;
BEGIN
  -- Get the invite link details
  SELECT gil.*, g.name as group_name, g.leader_id
  INTO invite_record
  FROM group_invite_links gil
  JOIN groups g ON gil.group_id = g.id
  WHERE gil.invite_token = token
    AND gil.is_active = true
    AND (gil.expires_at IS NULL OR gil.expires_at > NOW())
    AND (gil.max_uses IS NULL OR gil.current_uses < gil.max_uses);

  -- Check if invite link exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired invite link'
    );
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = invite_record.group_id AND player_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are already a member of this group',
      'group_name', invite_record.group_name
    );
  END IF;

  -- Check if user already used this invite
  IF EXISTS (
    SELECT 1 FROM group_invite_uses 
    WHERE invite_link_id = invite_record.id AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You have already used this invite link',
      'group_name', invite_record.group_name
    );
  END IF;

  -- Add user to group
  INSERT INTO group_members (group_id, player_id, joined_at)
  VALUES (invite_record.group_id, auth.uid(), NOW());

  -- Record the invite usage
  INSERT INTO group_invite_uses (invite_link_id, user_id)
  VALUES (invite_record.id, auth.uid());

  -- Update usage count
  UPDATE group_invite_links 
  SET current_uses = current_uses + 1
  WHERE id = invite_record.id;

  RETURN json_build_object(
    'success', true,
    'group_id', invite_record.group_id,
    'group_name', invite_record.group_name,
    'message', 'Successfully joined ' || invite_record.group_name
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'An error occurred while processing the invite'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION use_invite_link(TEXT) TO authenticated;

-- Add comments
COMMENT ON TABLE group_invite_links IS 'Shareable invite links for groups';
COMMENT ON TABLE group_invite_uses IS 'Track usage of invite links';
COMMENT ON FUNCTION use_invite_link(TEXT) IS 'Process an invite link and add user to group';
