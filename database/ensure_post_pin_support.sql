-- Ensure post pinning support is properly configured
-- This script adds the is_pinned column if it doesn't exist

-- Add is_pinned column to group_posts table if it doesn't exist
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Add index for better performance when ordering by pinned status
CREATE INDEX IF NOT EXISTS idx_group_posts_is_pinned ON group_posts(is_pinned);

-- Add comment
COMMENT ON COLUMN group_posts.is_pinned IS 'Whether this post is pinned to the top of the group feed';

SELECT 'Post pinning support ensured!' as status;
