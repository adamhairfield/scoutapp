-- Test script to add sample notifications
-- Replace 'your-user-id' with your actual user ID from the profiles table

-- First, let's see what user IDs we have
SELECT id, display_name, email FROM profiles LIMIT 5;

-- Insert sample notifications (replace the recipient_id with your actual user ID)
-- You can get your user ID by running: SELECT id FROM profiles WHERE email = 'your-email@example.com';

-- Sample message notification
INSERT INTO notifications (recipient_id, sender_id, type, title, body, data) 
VALUES (
    'your-user-id-here', -- Replace with your actual user ID
    'your-user-id-here', -- Replace with a sender ID (can be same for testing)
    'message',
    'New message from John',
    'Hey! Are you ready for practice tomorrow?',
    '{"message_id": "test-123", "team_id": "test-team", "sender_name": "John"}'::jsonb
);

-- Sample friend request notification
INSERT INTO notifications (recipient_id, sender_id, type, title, body, data) 
VALUES (
    'your-user-id-here', -- Replace with your actual user ID
    'your-user-id-here', -- Replace with a sender ID
    'friend_request',
    'New Friend Request',
    'Sarah wants to be your friend',
    '{"request_id": "test-456", "sender_name": "Sarah"}'::jsonb
);

-- Sample team invite notification
INSERT INTO notifications (recipient_id, sender_id, type, title, body, data) 
VALUES (
    'your-user-id-here', -- Replace with your actual user ID
    'your-user-id-here', -- Replace with a sender ID
    'team_invite',
    'Team Invitation',
    'Coach Mike invited you to join Eagles Basketball',
    '{"team_name": "Eagles Basketball", "inviter_name": "Coach Mike"}'::jsonb
);

-- Sample announcement notification (no sender)
INSERT INTO notifications (recipient_id, sender_id, type, title, body, data) 
VALUES (
    'your-user-id-here', -- Replace with your actual user ID
    NULL,
    'announcement',
    'App Update Available',
    'A new version of Scout is available with exciting new features!',
    '{"version": "1.1.0"}'::jsonb
);

-- Check the inserted notifications
SELECT * FROM notifications ORDER BY sent_at DESC;
