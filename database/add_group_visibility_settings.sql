-- Add group visibility settings to groups table

-- Add visibility column to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' 
CHECK (visibility IN ('public', 'private', 'hidden'));

-- Add index for better performance on visibility searches
CREATE INDEX IF NOT EXISTS idx_groups_visibility ON groups(visibility);

-- Add comments
COMMENT ON COLUMN groups.visibility IS 'Group visibility: public (searchable), private (invite only), hidden (completely private)';

-- Update existing groups to have default visibility
UPDATE groups SET visibility = 'private' WHERE visibility IS NULL;

-- Create a view for public groups (searchable groups)
CREATE OR REPLACE VIEW public_groups AS
SELECT 
  g.id,
  g.name,
  g.sport,
  g.description,
  g.leader_id,
  g.visibility,
  g.cover_photo_url,
  g.created_at,
  g.updated_at,
  p.name as leader_name,
  p.profile_picture_url as leader_profile_picture_url,
  (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) + 1 as member_count
FROM groups g
JOIN profiles p ON g.leader_id = p.id
WHERE g.visibility = 'public'
ORDER BY g.created_at DESC;

-- Grant access to the view
GRANT SELECT ON public_groups TO authenticated;

-- Add RLS policy for group visibility
DROP POLICY IF EXISTS "Groups visibility policy" ON groups;

CREATE POLICY "Groups visibility policy" ON groups
  FOR SELECT USING (
    visibility = 'public' OR 
    leader_id = auth.uid() OR 
    id IN (
      SELECT group_id FROM group_members WHERE player_id = auth.uid()
    )
  );

SELECT 'Group visibility settings added successfully!' as status;
