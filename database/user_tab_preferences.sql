-- User Tab Preferences Table
-- Stores user's custom tab order for each group

CREATE TABLE IF NOT EXISTS user_tab_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  tab_order JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, group_id)
);

-- Index for faster lookups
CREATE INDEX idx_user_tab_preferences_user_group ON user_tab_preferences(user_id, group_id);

-- RLS Policies
ALTER TABLE user_tab_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only read their own preferences
CREATE POLICY "Users can view their own tab preferences"
  ON user_tab_preferences FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own tab preferences"
  ON user_tab_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update their own tab preferences"
  ON user_tab_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own tab preferences"
  ON user_tab_preferences FOR DELETE
  USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_tab_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_tab_preferences_updated_at
  BEFORE UPDATE ON user_tab_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tab_preferences_updated_at();
