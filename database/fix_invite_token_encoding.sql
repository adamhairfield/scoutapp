-- Fix the invite token encoding issue
-- This updates the existing group_invite_links table to use hex encoding instead of base64url

-- First, drop the existing default constraint that uses base64url
ALTER TABLE group_invite_links ALTER COLUMN invite_token DROP DEFAULT;

-- Add a new default that uses hex encoding (which PostgreSQL supports)
ALTER TABLE group_invite_links ALTER COLUMN invite_token SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- Update any existing records that might have invalid tokens (if any exist)
-- This will regenerate tokens for any existing invite links
UPDATE group_invite_links 
SET invite_token = encode(gen_random_bytes(32), 'hex')
WHERE invite_token IS NULL OR invite_token = '';

-- Verify the change worked
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'group_invite_links' 
AND column_name = 'invite_token';
