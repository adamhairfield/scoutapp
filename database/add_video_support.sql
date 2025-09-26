-- Add video support to group posts
-- This allows users to post videos in addition to photos and text

-- Add video_url column to group_posts table
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add video metadata columns
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS video_duration INTEGER; -- in seconds
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS video_width INTEGER;
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS video_height INTEGER;

-- Update the post_type check constraint to include 'video'
ALTER TABLE group_posts DROP CONSTRAINT IF EXISTS group_posts_post_type_check;
ALTER TABLE group_posts ADD CONSTRAINT group_posts_post_type_check 
    CHECK (post_type IN ('text', 'image', 'video', 'link'));

-- Update the posts view to include video data
DROP VIEW IF EXISTS group_posts_with_stats;

CREATE VIEW group_posts_with_stats AS
SELECT 
  gp.*,
  p.name as author_name,
  p.profile_picture_url as author_profile_picture_url,
  COALESCE(reaction_count.count, 0) as like_count,
  COALESCE(comment_count.count, 0) as comment_count,
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
  -- Total reaction count
  COALESCE((SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = gp.id), 0) as total_reactions
FROM group_posts gp
JOIN profiles p ON gp.author_id = p.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as count 
  FROM post_reactions 
  GROUP BY post_id
) reaction_count ON gp.id = reaction_count.post_id
LEFT JOIN (
  SELECT post_id, COUNT(*) as count 
  FROM post_comments 
  GROUP BY post_id
) comment_count ON gp.id = comment_count.post_id
ORDER BY gp.is_pinned DESC, gp.created_at DESC;

-- Grant access to the view
GRANT SELECT ON group_posts_with_stats TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN group_posts.video_url IS 'URL of uploaded video file';
COMMENT ON COLUMN group_posts.video_duration IS 'Video duration in seconds';
COMMENT ON COLUMN group_posts.video_width IS 'Video width in pixels';
COMMENT ON COLUMN group_posts.video_height IS 'Video height in pixels';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_posts_video_url ON group_posts(video_url) WHERE video_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_posts_post_type ON group_posts(post_type);

SELECT 'Video support added successfully!' as status;
