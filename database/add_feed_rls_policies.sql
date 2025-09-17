-- Add RLS policies for feed tables using the same function-based approach
-- This ensures feed functionality works with the existing RLS setup

-- First, make sure our helper functions exist
CREATE OR REPLACE FUNCTION is_group_leader(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM groups 
    WHERE id = group_uuid AND leader_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_group_member(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = group_uuid AND player_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access a group (leader OR member)
CREATE OR REPLACE FUNCTION can_access_group(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_group_leader(group_uuid, user_uuid) OR is_group_member(group_uuid, user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing feed table policies if they exist
DROP POLICY IF EXISTS "group_posts_read_members" ON group_posts;
DROP POLICY IF EXISTS "group_posts_create_members" ON group_posts;
DROP POLICY IF EXISTS "group_posts_update_author" ON group_posts;
DROP POLICY IF EXISTS "group_posts_delete_author_or_leader" ON group_posts;

DROP POLICY IF EXISTS "post_likes_read_all" ON post_likes;
DROP POLICY IF EXISTS "post_likes_manage_own" ON post_likes;

DROP POLICY IF EXISTS "post_comments_read_members" ON post_comments;
DROP POLICY IF EXISTS "post_comments_create_members" ON post_comments;
DROP POLICY IF EXISTS "post_comments_update_author" ON post_comments;
DROP POLICY IF EXISTS "post_comments_delete_author_or_leader" ON post_comments;

DROP POLICY IF EXISTS "comment_likes_read_all" ON comment_likes;
DROP POLICY IF EXISTS "comment_likes_manage_own" ON comment_likes;

-- Create new policies using functions to avoid recursion

-- Group Posts policies
CREATE POLICY "group_posts_access" ON group_posts
  FOR SELECT USING (can_access_group(group_id, auth.uid()));

CREATE POLICY "group_posts_create" ON group_posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id 
    AND can_access_group(group_id, auth.uid())
  );

CREATE POLICY "group_posts_update_own" ON group_posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "group_posts_delete_own_or_leader" ON group_posts
  FOR DELETE USING (
    auth.uid() = author_id 
    OR is_group_leader(group_id, auth.uid())
  );

-- Post Likes policies
CREATE POLICY "post_likes_read" ON post_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_posts gp 
      WHERE gp.id = post_likes.post_id 
      AND can_access_group(gp.group_id, auth.uid())
    )
  );

CREATE POLICY "post_likes_manage" ON post_likes
  FOR ALL USING (auth.uid() = user_id);

-- Post Comments policies
CREATE POLICY "post_comments_read" ON post_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_posts gp 
      WHERE gp.id = post_comments.post_id 
      AND can_access_group(gp.group_id, auth.uid())
    )
  );

CREATE POLICY "post_comments_create" ON post_comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id 
    AND EXISTS (
      SELECT 1 FROM group_posts gp 
      WHERE gp.id = post_comments.post_id 
      AND can_access_group(gp.group_id, auth.uid())
    )
  );

CREATE POLICY "post_comments_update_own" ON post_comments
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "post_comments_delete_own_or_leader" ON post_comments
  FOR DELETE USING (
    auth.uid() = author_id 
    OR EXISTS (
      SELECT 1 FROM group_posts gp 
      WHERE gp.id = post_comments.post_id 
      AND is_group_leader(gp.group_id, auth.uid())
    )
  );

-- Comment Likes policies
CREATE POLICY "comment_likes_read" ON comment_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM post_comments pc
      JOIN group_posts gp ON pc.post_id = gp.id
      WHERE pc.id = comment_likes.comment_id 
      AND can_access_group(gp.group_id, auth.uid())
    )
  );

CREATE POLICY "comment_likes_manage" ON comment_likes
  FOR ALL USING (auth.uid() = user_id);

-- Grant execute permissions on new function
GRANT EXECUTE ON FUNCTION can_access_group(UUID, UUID) TO authenticated;

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('group_posts', 'post_likes', 'post_comments', 'comment_likes')
ORDER BY tablename, policyname;
