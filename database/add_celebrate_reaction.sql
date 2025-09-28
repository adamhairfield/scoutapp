-- Add celebrate reaction to the allowed reaction types
-- This updates the check constraint to include the new 'celebrate' reaction

-- Drop the existing constraint
ALTER TABLE post_reactions DROP CONSTRAINT IF EXISTS post_reactions_reaction_type_check;

-- Add the new constraint with 'celebrate' included
ALTER TABLE post_reactions ADD CONSTRAINT post_reactions_reaction_type_check 
CHECK (reaction_type IN ('love', 'like', 'laugh', 'wow', 'sad', 'angry', 'celebrate'));

-- Update the view to include celebrate count
DROP VIEW IF EXISTS group_posts_with_stats;

CREATE VIEW group_posts_with_stats AS
SELECT 
  gp.*,
  -- Author information
  p.name as author_name,
  p.role as author_role,
  p.profile_picture_url as author_profile_picture_url,
  -- Comment count
  COALESCE((SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = gp.id), 0) as comment_count,
  -- Check if current user has reacted (for backward compatibility with likes)
  EXISTS(SELECT 1 FROM post_reactions pr WHERE pr.post_id = gp.id AND pr.user_id = auth.uid()) as user_liked,
  -- Get user's reaction type
  (SELECT reaction_type FROM post_reactions pr WHERE pr.post_id = gp.id AND pr.user_id = auth.uid()) as user_reaction,
  -- Get reaction counts by type
  COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = gp.id AND pr.reaction_type = 'love'), 0) as love_count,
  COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = gp.id AND pr.reaction_type = 'like'), 0) as like_count_specific,
  COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = gp.id AND pr.reaction_type = 'laugh'), 0) as laugh_count,
  COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = gp.id AND pr.reaction_type = 'wow'), 0) as wow_count,
  COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = gp.id AND pr.reaction_type = 'sad'), 0) as sad_count,
  COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = gp.id AND pr.reaction_type = 'angry'), 0) as angry_count,
  COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = gp.id AND pr.reaction_type = 'celebrate'), 0) as celebrate_count,
  -- Total reaction count
  COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = gp.id), 0) as total_reactions
FROM group_posts gp
LEFT JOIN profiles p ON gp.author_id = p.id;

-- Grant permissions
GRANT SELECT ON group_posts_with_stats TO authenticated;

-- Add helpful comment
COMMENT ON COLUMN post_reactions.reaction_type IS 'Type of reaction: love, like, laugh, wow, sad, angry, celebrate';

SELECT 'Celebrate reaction added successfully!' as status;
