-- Update the group_posts_with_stats view to include photo columns
-- This script updates the view to include photo_url and photo_urls columns

-- Drop and recreate the view with photo support
DROP VIEW IF EXISTS group_posts_with_stats;

CREATE OR REPLACE VIEW group_posts_with_stats AS
SELECT 
  gp.*,
  p.name as author_name,
  p.role as author_role,
  p.profile_picture_url as author_profile_picture_url,
  (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = gp.id) as like_count,
  (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = gp.id) as comment_count,
  EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = gp.id AND pl.user_id = auth.uid()) as user_liked
FROM group_posts gp
JOIN profiles p ON gp.author_id = p.id
ORDER BY gp.is_pinned DESC, gp.created_at DESC;

-- Grant access to the view
GRANT SELECT ON group_posts_with_stats TO authenticated;

-- Verify the view was created successfully
SELECT 'Posts view updated with photo support!' as status;
