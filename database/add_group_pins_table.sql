-- Add group_pins table for pinning groups to the top of the list

-- Create group_pins table
CREATE TABLE IF NOT EXISTS group_pins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE group_pins ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own group pins" ON group_pins
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_pins_user_id ON group_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_group_pins_group_id ON group_pins(group_id);
CREATE INDEX IF NOT EXISTS idx_group_pins_user_group ON group_pins(user_id, group_id);

-- Add comments
COMMENT ON TABLE group_pins IS 'User-specific pins for groups to show at the top of their groups list';
COMMENT ON COLUMN group_pins.group_id IS 'Reference to the pinned group';
COMMENT ON COLUMN group_pins.user_id IS 'Reference to the user who pinned the group';
COMMENT ON COLUMN group_pins.pinned_at IS 'When the group was pinned';

-- Verify the table was created
SELECT 'Group pins table created successfully!' as status;
