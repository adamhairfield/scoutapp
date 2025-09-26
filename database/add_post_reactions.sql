-- Add post reactions system
-- This allows users to react to posts with different emotions

-- Create post_reactions table
CREATE TABLE IF NOT EXISTS post_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('love', 'like', 'laugh', 'wow', 'sad', 'angry')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id) -- One reaction per user per post
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_type ON post_reactions(reaction_type);

-- Enable RLS
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_reactions
-- Users can view all reactions
CREATE POLICY "Users can view reactions" ON post_reactions
    FOR SELECT USING (true);

-- Users can insert their own reactions
CREATE POLICY "Users can insert own reactions" ON post_reactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own reactions
CREATE POLICY "Users can update own reactions" ON post_reactions
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions" ON post_reactions
    FOR DELETE USING (user_id = auth.uid());

-- Drop the existing view first, then recreate it with reaction support
DROP VIEW IF EXISTS group_posts_with_stats;

-- Create the posts view to include reaction counts
CREATE VIEW group_posts_with_stats AS
SELECT 
  gp.*,
  p.name as author_name,
  p.profile_picture_url as author_profile_picture_url,
  COALESCE(like_count.count, 0) as like_count,
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
) like_count ON gp.id = like_count.post_id
LEFT JOIN (
  SELECT post_id, COUNT(*) as count 
  FROM post_comments 
  GROUP BY post_id
) comment_count ON gp.id = comment_count.post_id
ORDER BY gp.is_pinned DESC, gp.created_at DESC;

-- Grant access to the view
GRANT SELECT ON group_posts_with_stats TO authenticated;

-- Add helpful comments
COMMENT ON TABLE post_reactions IS 'Stores user reactions to posts (love, like, laugh, wow, sad, angry)';
COMMENT ON COLUMN post_reactions.reaction_type IS 'Type of reaction: love, like, laugh, wow, sad, angry';

SELECT 'Post reactions system added successfully!' as status;
