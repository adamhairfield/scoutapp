# Teams to Groups Migration Summary

## Overview
Successfully migrated the Scout app from "teams" to "groups" terminology across both the UI and database. This comprehensive change affects database tables, service functions, UI screens, and navigation.

## Completed Changes

### 1. Database Migration
- **File**: `database/migrate_teams_to_groups.sql`
- **Changes**:
  - Renamed `teams` table to `groups`
  - Renamed `team_members` table to `group_members`
  - Renamed `team_join_requests` table to `group_join_requests`
  - Updated column names: `coach_id` → `leader_id`, `team_id` → `group_id`
  - Updated all RLS policies to use new table/column names
  - Updated foreign key references in messages and other tables

### 2. Database Service Functions
- **File**: `src/services/database.js`
- **Changes**:
  - Renamed `teamService` to `groupService`
  - Updated all function names: `createTeam` → `createGroup`, `getCoachTeams` → `getLeaderGroups`, etc.
  - Updated all database queries to use new table and column names
  - Updated messaging service to reference groups instead of teams

### 3. UI Screens
- **New Files Created**:
  - `src/screens/GroupsScreen.js` (replaces TeamsScreen.js)
  - `src/screens/CreateGroupScreen.js` (replaces CreateTeamScreen.js)
  - `src/screens/JoinGroupScreen.js` (replaces JoinTeamScreen.js)
  - `src/screens/GroupRequestsScreen.js` (replaces TeamRequestsScreen.js)

- **Updated Files**:
  - `src/screens/HomeScreen.js` - Updated terminology and navigation references
  - All new screens use "groups", "group leader", and related terminology

### 4. Navigation Updates
- **File**: `src/navigation/AppNavigator.js`
- **Changes**:
  - Updated imports to use new group screen files
  - Changed tab name from "Teams" to "Groups"
  - Updated stack screen names: `CreateTeam` → `CreateGroup`, etc.
  - Updated navigation references throughout

### 5. Database Schema
- **File**: `database/updated_schema.sql`
- **Changes**:
  - Complete new schema with groups terminology
  - Updated RLS policies for all tables
  - Added join_code generation for groups
  - Maintained all existing functionality with new naming

## Key Terminology Changes

| Old Term | New Term |
|----------|----------|
| Team | Group |
| Coach | Leader |
| Team Member | Group Member |
| Team Requests | Group Requests |
| Create Team | Create Group |
| Join Team | Join Group |
| My Teams | My Groups |
| Team Feed | Group Feed |

## Database Migration Steps

To apply these changes to your Supabase database:

1. **Run the migration script**:
   ```sql
   -- Execute the contents of database/migrate_teams_to_groups.sql
   -- in your Supabase SQL editor
   ```

2. **Verify the migration**:
   - Check that all tables have been renamed
   - Verify RLS policies are working
   - Test that foreign key relationships are intact

## Files to Remove (Optional)
The following old team screen files can be removed after testing:
- `src/screens/TeamsScreen.js`
- `src/screens/CreateTeamScreen.js`
- `src/screens/JoinTeamScreen.js`
- `src/screens/TeamRequestsScreen.js`

## Testing Checklist

### Database Testing
- [ ] Verify all tables renamed correctly
- [ ] Test RLS policies work with new table names
- [ ] Verify foreign key relationships intact
- [ ] Test join code generation for groups

### UI Testing
- [ ] Test group creation flow
- [ ] Test joining groups with join codes
- [ ] Test group member management
- [ ] Test group join request approval/rejection
- [ ] Test messaging between group members
- [ ] Verify navigation works correctly
- [ ] Test all user roles (coach/leader, parent, player)

### Functionality Testing
- [ ] Create a new group as a coach
- [ ] Join a group as a player/parent
- [ ] Send messages within groups
- [ ] Manage group member relationships
- [ ] Test parent-player relationship management

## Notes
- All existing functionality has been preserved
- User roles remain the same (coach, parent, player)
- The term "coach" is still used in user roles but "leader" is used for group leadership
- Database relationships and constraints are maintained
- RLS policies have been updated to work with new table structure

## Rollback Plan
If needed, the migration can be reversed by:
1. Running the reverse of the migration script
2. Reverting the code changes
3. Updating navigation back to team terminology

The old team screen files are preserved until testing is complete.
