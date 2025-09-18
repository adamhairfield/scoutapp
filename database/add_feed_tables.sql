-- Add tables for group feed functionality (posts, comments, likes)

-- Create group_posts table
CREATE TABLE IF NOT EXISTS group_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'video', 'link', 'announcement')),
  image_url TEXT,
  video_url TEXT,
  link_url TEXT,
  link_title TEXT,
  link_description TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES group_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES group_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- For nested replies
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_posts_group_id ON group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_author_id ON group_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_created_at ON group_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_author_id ON post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);

-- Enable RLS on new tables
ALTER TABLE group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_posts
CREATE POLICY "group_posts_read_members" ON group_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.id = group_posts.group_id 
      AND (g.leader_id = auth.uid() OR gm.player_id = auth.uid())
    )
  );

CREATE POLICY "group_posts_create_members" ON group_posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id 
    AND EXISTS (
      SELECT 1 FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE g.id = group_posts.group_id 
      AND (g.leader_id = auth.uid() OR gm.player_id = auth.uid())
    )
  );

CREATE POLICY "group_posts_update_author" ON group_posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "group_posts_delete_author_or_leader" ON group_posts
  FOR DELETE USING (
    auth.uid() = author_id 
    OR EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_posts.group_id AND leader_id = auth.uid()
    )
  );

-- RLS Policies for post_likes
CREATE POLICY "post_likes_read_all" ON post_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_posts gp
      JOIN groups g ON gp.group_id = g.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE gp.id = post_likes.post_id 
      AND (g.leader_id = auth.uid() OR gm.player_id = auth.uid())
    )
  );

CREATE POLICY "post_likes_manage_own" ON post_likes
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for post_comments
CREATE POLICY "post_comments_read_members" ON post_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_posts gp
      JOIN groups g ON gp.group_id = g.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE gp.id = post_comments.post_id 
      AND (g.leader_id = auth.uid() OR gm.player_id = auth.uid())
    )
  );

CREATE POLICY "post_comments_create_members" ON post_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id 
    AND EXISTS (
      SELECT 1 FROM group_posts gp
      JOIN groups g ON gp.group_id = g.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE gp.id = post_comments.post_id 
      AND (g.leader_id = auth.uid() OR gm.player_id = auth.uid())
    )
  );

CREATE POLICY "post_comments_update_author" ON post_comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "post_comments_delete_author_or_leader" ON post_comments
  FOR DELETE USING (
    auth.uid() = author_id 
    OR EXISTS (
      SELECT 1 FROM group_posts gp
      JOIN groups g ON gp.group_id = g.id
      WHERE gp.id = post_comments.post_id AND g.leader_id = auth.uid()
    )
  );

-- RLS Policies for comment_likes
CREATE POLICY "comment_likes_read_all" ON comment_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM post_comments pc
      JOIN group_posts gp ON pc.post_id = gp.id
      JOIN groups g ON gp.group_id = g.id
      LEFT JOIN group_members gm ON g.id = gm.group_id
      WHERE pc.id = comment_likes.comment_id 
      AND (g.leader_id = auth.uid() OR gm.player_id = auth.uid())
    )
  );

CREATE POLICY "comment_likes_manage_own" ON comment_likes
  FOR ALL USING (auth.uid() = user_id);

-- Create a view for posts with aggregated data
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

-- Add comments about the tables
COMMENT ON TABLE group_posts IS 'Posts in group feeds';
COMMENT ON TABLE post_likes IS 'Likes on group posts';
COMMENT ON TABLE post_comments IS 'Comments on group posts';
COMMENT ON TABLE comment_likes IS 'Likes on post comments';
