-- Fix Registration RLS Policies
-- Run this if you're getting RLS policy violations

-- First, let's check if the user is actually a group leader
-- Replace 'YOUR_USER_ID' and 'YOUR_GROUP_ID' with actual values to test
-- SELECT * FROM groups WHERE id = 'YOUR_GROUP_ID' AND leader_id = 'YOUR_USER_ID';

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Group leaders can create registrations" ON registrations;
DROP POLICY IF EXISTS "Group leaders can update their registrations" ON registrations;
DROP POLICY IF EXISTS "Group leaders can delete their registrations" ON registrations;
DROP POLICY IF EXISTS "Users can view registrations for their groups" ON registrations;

-- Recreate policies with better error handling
CREATE POLICY "Group leaders can create registrations"
  ON registrations FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_id 
      AND leader_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can update their registrations"
  ON registrations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_id 
      AND leader_id = auth.uid()
    )
  );

CREATE POLICY "Group leaders can delete their registrations"
  ON registrations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_id 
      AND leader_id = auth.uid()
    )
  );

CREATE POLICY "Users can view registrations for their groups"
  ON registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = registrations.group_id 
      AND player_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = registrations.group_id 
      AND leader_id = auth.uid()
    )
  );

-- Fix RLS policies for related tables
DROP POLICY IF EXISTS "Group leaders can manage registration forms" ON registration_forms;
DROP POLICY IF EXISTS "Group leaders can manage form fields" ON registration_form_fields;
DROP POLICY IF EXISTS "Group leaders can manage participant fields" ON registration_participant_fields;
DROP POLICY IF EXISTS "Group leaders can manage waivers" ON registration_waivers;
DROP POLICY IF EXISTS "Group leaders can manage attachments" ON registration_attachments;
DROP POLICY IF EXISTS "Group leaders can manage optional items" ON registration_optional_items;
DROP POLICY IF EXISTS "Group leaders can manage custom fields" ON registration_custom_fields;

-- Create simpler policies that allow INSERT
-- Allow group members to VIEW forms
CREATE POLICY "Group members can view registration forms"
  ON registration_forms FOR SELECT
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      WHERE r.group_id IN (
        SELECT group_id FROM group_members WHERE player_id = auth.uid()
      )
    )
  );

CREATE POLICY "Group leaders can manage registration forms"
  ON registration_forms FOR ALL
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  )
  WITH CHECK (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

-- Allow group members to VIEW form fields
CREATE POLICY "Group members can view form fields"
  ON registration_form_fields FOR SELECT
  USING (
    form_id IN (
      SELECT rf.id FROM registration_forms rf
      JOIN registrations r ON rf.registration_id = r.id
      WHERE r.group_id IN (
        SELECT group_id FROM group_members WHERE player_id = auth.uid()
      )
    )
  );

-- Allow group members to VIEW participant fields (for registration)
CREATE POLICY "Group members can view participant fields"
  ON registration_participant_fields FOR SELECT
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      WHERE r.group_id IN (
        SELECT group_id FROM group_members WHERE player_id = auth.uid()
      )
    )
  );

-- Allow group leaders to manage (insert/update/delete) participant fields
CREATE POLICY "Group leaders can manage participant fields"
  ON registration_participant_fields FOR ALL
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  )
  WITH CHECK (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

-- Allow group members to VIEW waivers
CREATE POLICY "Group members can view waivers"
  ON registration_waivers FOR SELECT
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      WHERE r.group_id IN (
        SELECT group_id FROM group_members WHERE player_id = auth.uid()
      )
    )
  );

CREATE POLICY "Group leaders can manage waivers"
  ON registration_waivers FOR ALL
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  )
  WITH CHECK (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

-- Allow group members to VIEW optional items
CREATE POLICY "Group members can view optional items"
  ON registration_optional_items FOR SELECT
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      WHERE r.group_id IN (
        SELECT group_id FROM group_members WHERE player_id = auth.uid()
      )
    )
  );

CREATE POLICY "Group leaders can manage optional items"
  ON registration_optional_items FOR ALL
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  )
  WITH CHECK (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

-- Allow group members to VIEW custom fields
CREATE POLICY "Group members can view custom fields"
  ON registration_custom_fields FOR SELECT
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      WHERE r.group_id IN (
        SELECT group_id FROM group_members WHERE player_id = auth.uid()
      )
    )
  );

CREATE POLICY "Group leaders can manage custom fields"
  ON registration_custom_fields FOR ALL
  USING (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  )
  WITH CHECK (
    registration_id IN (
      SELECT r.id FROM registrations r
      JOIN groups g ON r.group_id = g.id
      WHERE g.leader_id = auth.uid()
    )
  );

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('registrations', 'registration_participant_fields', 'registration_forms', 'registration_waivers', 'registration_optional_items', 'registration_custom_fields');
