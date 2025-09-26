-- Add group deletion support with proper CASCADE constraints
-- This ensures when a group is deleted, all related records are also deleted safely

-- Ensure proper CASCADE delete constraints for group deletion
-- This ensures when a group is deleted, all related records are also deleted

-- Update foreign key constraints to CASCADE on delete (if not already set)
-- Note: These may already exist, but we're ensuring they have CASCADE behavior

-- Group members should be deleted when group is deleted
ALTER TABLE group_members DROP CONSTRAINT IF EXISTS group_members_group_id_fkey;
ALTER TABLE group_members ADD CONSTRAINT group_members_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Group posts should be deleted when group is deleted  
ALTER TABLE group_posts DROP CONSTRAINT IF EXISTS group_posts_group_id_fkey;
ALTER TABLE group_posts ADD CONSTRAINT group_posts_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Group join requests should be deleted when group is deleted
ALTER TABLE group_join_requests DROP CONSTRAINT IF EXISTS group_join_requests_group_id_fkey;
ALTER TABLE group_join_requests ADD CONSTRAINT group_join_requests_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Group pins should be deleted when group is deleted
ALTER TABLE group_pins DROP CONSTRAINT IF EXISTS group_pins_group_id_fkey;
ALTER TABLE group_pins ADD CONSTRAINT group_pins_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Messages should be deleted when group is deleted
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_group_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Child groups should be deleted when parent group is deleted
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_parent_group_id_fkey;
ALTER TABLE groups ADD CONSTRAINT groups_parent_group_id_fkey 
    FOREIGN KEY (parent_group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Group invite links should be deleted when group is deleted
ALTER TABLE group_invite_links DROP CONSTRAINT IF EXISTS group_invite_links_group_id_fkey;
ALTER TABLE group_invite_links ADD CONSTRAINT group_invite_links_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Post likes should be deleted when group post is deleted
ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey;
ALTER TABLE post_likes ADD CONSTRAINT post_likes_post_id_fkey 
    FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE;

-- Post reports should be deleted when group post is deleted
ALTER TABLE post_reports DROP CONSTRAINT IF EXISTS post_reports_post_id_fkey;
ALTER TABLE post_reports ADD CONSTRAINT post_reports_post_id_fkey 
    FOREIGN KEY (post_id) REFERENCES group_posts(id) ON DELETE CASCADE;

-- Add helpful comments
COMMENT ON CONSTRAINT group_members_group_id_fkey ON group_members IS 'CASCADE delete: group members are deleted when group is deleted';
COMMENT ON CONSTRAINT group_posts_group_id_fkey ON group_posts IS 'CASCADE delete: group posts are deleted when group is deleted';
COMMENT ON CONSTRAINT group_join_requests_group_id_fkey ON group_join_requests IS 'CASCADE delete: join requests are deleted when group is deleted';
COMMENT ON CONSTRAINT group_pins_group_id_fkey ON group_pins IS 'CASCADE delete: group pins are deleted when group is deleted';
COMMENT ON CONSTRAINT messages_group_id_fkey ON messages IS 'CASCADE delete: group messages are deleted when group is deleted';
COMMENT ON CONSTRAINT groups_parent_group_id_fkey ON groups IS 'CASCADE delete: child groups are deleted when parent group is deleted';

SELECT 'Group deletion CASCADE constraints added successfully!' as status;
