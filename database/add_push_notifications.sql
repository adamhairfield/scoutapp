-- Add push notification support to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"messages": true, "friend_requests": true, "team_invites": true, "announcements": true}';

-- Create notifications table to track sent notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'message', 'friend_request', 'team_invite', 'announcement'
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Allow system to insert notifications (you might want to restrict this further)
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET read = TRUE, read_at = NOW()
    WHERE id = notification_id AND recipient_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM notifications
        WHERE recipient_id = auth.uid() AND read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE sent_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically send notifications for new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification for new message
    INSERT INTO notifications (recipient_id, sender_id, type, title, body, data)
    SELECT 
        tm.user_id,
        NEW.sender_id,
        'message',
        'New message from ' || p.display_name,
        CASE 
            WHEN LENGTH(NEW.content) > 50 
            THEN LEFT(NEW.content, 50) || '...'
            ELSE NEW.content
        END,
        jsonb_build_object(
            'message_id', NEW.id,
            'team_id', NEW.team_id,
            'sender_name', p.display_name
        )
    FROM team_members tm
    JOIN profiles p ON p.id = NEW.sender_id
    WHERE tm.team_id = NEW.team_id 
    AND tm.user_id != NEW.sender_id; -- Don't notify the sender
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();

-- Function to send friend request notification
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification for friend request
    INSERT INTO notifications (recipient_id, sender_id, type, title, body, data)
    SELECT 
        NEW.friend_id,
        NEW.user_id,
        'friend_request',
        'New Friend Request',
        p.display_name || ' wants to be your friend',
        jsonb_build_object(
            'request_id', NEW.id,
            'sender_name', p.display_name
        )
    FROM profiles p
    WHERE p.id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for friend requests (assuming you have a friends/friend_requests table)
-- You may need to adjust this based on your actual friends table structure
-- DROP TRIGGER IF EXISTS trigger_notify_friend_request ON friend_requests;
-- CREATE TRIGGER trigger_notify_friend_request
--     AFTER INSERT ON friend_requests
--     FOR EACH ROW
--     EXECUTE FUNCTION notify_friend_request();

COMMENT ON TABLE notifications IS 'Stores push notifications sent to users';
COMMENT ON COLUMN profiles.push_token IS 'Expo push notification token for the user';
COMMENT ON COLUMN profiles.notification_preferences IS 'User preferences for different types of notifications';
