-- Fix triggers that still reference teams functions
-- This will remove the problematic triggers and functions

-- Step 1: Drop the problematic triggers
DROP TRIGGER IF EXISTS trigger_set_team_join_code ON groups;
DROP TRIGGER IF EXISTS update_team_join_requests_updated_at ON group_join_requests;

-- Step 2: Drop the old functions that reference teams
DROP FUNCTION IF EXISTS set_team_join_code() CASCADE;
DROP FUNCTION IF EXISTS update_team_join_requests_updated_at() CASCADE;

-- Step 3: Create new functions for groups (if needed)
CREATE OR REPLACE FUNCTION set_group_join_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set join_code if it's null
  IF NEW.join_code IS NULL THEN
    NEW.join_code := UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create new function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create new triggers with correct names
CREATE TRIGGER trigger_set_group_join_code
  BEFORE INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION set_group_join_code();

CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Add updated_at trigger for group_join_requests if the table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'group_join_requests') THEN
    CREATE TRIGGER update_group_join_requests_updated_at
      BEFORE UPDATE ON group_join_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Step 7: Verify no more teams references in triggers
SELECT 'REMAINING TRIGGERS' as status, trigger_name, event_object_table, action_statement
FROM information_schema.triggers 
WHERE action_statement ILIKE '%team%'
ORDER BY trigger_name;

-- If the above query returns no rows, the fix is complete
SELECT 'Teams triggers cleanup completed successfully!' as final_status;
