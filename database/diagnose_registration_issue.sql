-- Diagnostic Script for Registration Creation Issues
-- Run this to diagnose why registration creation is failing

-- 1. Check if you're authenticated
SELECT auth.uid() as current_user_id;

-- 2. Check your groups where you are the leader
SELECT id, name, leader_id, created_at
FROM groups
WHERE leader_id = auth.uid();

-- 3. Check if RLS is enabled on registrations table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'registrations';

-- 4. Check existing policies on registrations table
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'registrations';

-- 5. Test if you can insert (this will show the actual error)
-- Replace the values below with your actual data
/*
INSERT INTO registrations (
  group_id,
  created_by,
  registration_type,
  name,
  sport,
  start_date,
  end_date,
  registration_fee,
  status
) VALUES (
  'YOUR_GROUP_ID_HERE',  -- Replace with actual group ID
  auth.uid(),
  'season',
  'Test Registration',
  'Soccer',
  NOW(),
  NOW() + INTERVAL '3 months',
  50.00,
  'active'
);
*/

-- 6. Check if the group exists and you're the leader
-- Replace 'YOUR_GROUP_ID' with the actual group ID you're trying to create a registration for
/*
SELECT 
  g.id,
  g.name,
  g.leader_id,
  g.leader_id = auth.uid() as "am_i_leader",
  auth.uid() as "my_user_id"
FROM groups g
WHERE g.id = 'YOUR_GROUP_ID';
*/
