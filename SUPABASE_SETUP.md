# Scout App - Supabase Setup Guide

## Step 1: Get Your Supabase Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `ezphoibukccydcryllvv`
3. Navigate to **Settings** → **API**
4. Copy the following keys:
   - **Project URL**: `https://ezphoibukccydcryllvv.supabase.co`
   - **anon public key**: (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 2: Update Configuration

Replace the placeholder in `src/config/supabase.js`:

```javascript
const SUPABASE_ANON_KEY = 'YOUR_ACTUAL_ANON_KEY_HERE';
```

With your real anon key from the dashboard.

## Step 3: Create Database Tables

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `database/schema.sql`
4. Paste into the SQL editor
5. Click **Run** to execute

This will create:
- `profiles` - User profiles with roles (coach/parent/player)
- `teams` - Team information and management
- `team_members` - Junction table for team memberships
- `messages` - Direct and team messaging
- `player_stats` - Player statistics tracking
- `games` - Game scheduling and results
- `practices` - Practice scheduling
- Row Level Security policies for data protection

## Step 4: Test the Setup

1. Start your app: `npx expo start`
2. Try registering a new user
3. Check the Supabase dashboard **Authentication** tab to see new users
4. Check **Table Editor** to see profile data

## Features Now Available

### Authentication
- ✅ Real user registration with email/password
- ✅ Secure login/logout
- ✅ Automatic profile creation
- ✅ Role-based access (coach/parent/player)

### Team Management
- ✅ Coaches can create teams
- ✅ Add/remove players from teams
- ✅ Team roster management
- ✅ Position assignments

### Messaging
- ✅ Direct messages between users
- ✅ Team group messaging
- ✅ Message history and threading

### Statistics
- ✅ Player performance tracking
- ✅ Goals, assists, games played
- ✅ Season-based statistics
- ✅ Team statistics overview

### Security
- ✅ Row Level Security (RLS) enabled
- ✅ Users can only access their own data
- ✅ Coaches can manage their teams
- ✅ Players can view team information

## Database Schema Overview

```
auth.users (Supabase managed)
├── profiles (extends user data)
├── teams (coach-owned teams)
│   ├── team_members (player memberships)
│   ├── games (scheduled games)
│   └── practices (practice sessions)
├── messages (user communications)
└── player_stats (performance data)
```

## Environment Variables

Your `.env` file contains database credentials but is now properly gitignored for security.

## Troubleshooting

### Common Issues:

1. **"Invalid API key"** - Check that you copied the anon key correctly
2. **"Table doesn't exist"** - Run the schema.sql in Supabase SQL editor
3. **"Permission denied"** - RLS policies are working, users can only see their data
4. **"User not found"** - Profile creation trigger should handle this automatically

### Checking Data:

1. **Users**: Supabase Dashboard → Authentication → Users
2. **Profiles**: Supabase Dashboard → Table Editor → profiles
3. **Teams**: Supabase Dashboard → Table Editor → teams
4. **Messages**: Supabase Dashboard → Table Editor → messages

## Next Steps

After setup is complete, you can:

1. Create test accounts with different roles
2. Test team creation and member management
3. Send messages between users
4. Track player statistics
5. Schedule games and practices

Your Scout app is now connected to a production-ready PostgreSQL database with enterprise-grade security and scalability!
