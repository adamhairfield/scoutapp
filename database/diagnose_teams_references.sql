-- Diagnostic script to find all references to "teams" in your database
-- Run this in Supabase SQL editor to identify what's still referencing teams

-- 1. Check if teams table still exists
SELECT 'TABLES' as type, table_name, table_schema
FROM information_schema.tables 
WHERE table_name LIKE '%team%'
ORDER BY table_name;

-- 2. Check for columns that reference teams
SELECT 'COLUMNS' as type, table_name, column_name, data_type
FROM information_schema.columns 
WHERE column_name LIKE '%team%' OR table_name LIKE '%team%'
ORDER BY table_name, column_name;

-- 3. Check for foreign key constraints that reference teams
SELECT 'FOREIGN_KEYS' as type, 
       tc.table_name, 
       kcu.column_name, 
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (ccu.table_name LIKE '%team%' OR tc.table_name LIKE '%team%');

-- 4. Check for views that might reference teams
SELECT 'VIEWS' as type, table_name, view_definition
FROM information_schema.views 
WHERE view_definition ILIKE '%team%'
ORDER BY table_name;

-- 5. Check for functions that might reference teams
SELECT 'FUNCTIONS' as type, routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%team%'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- 6. Check for policies that reference teams
SELECT 'POLICIES' as type, schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE qual ILIKE '%team%' OR policyname ILIKE '%team%'
ORDER BY tablename, policyname;

-- 7. Check for triggers that might reference teams
SELECT 'TRIGGERS' as type, 
       trigger_name, 
       event_object_table, 
       action_statement
FROM information_schema.triggers 
WHERE action_statement ILIKE '%team%'
ORDER BY trigger_name;
