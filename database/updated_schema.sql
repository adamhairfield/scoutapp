-- Updated Schema with Groups (formerly Teams)
-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('coach', 'parent', 'player')),
  bio TEXT,
  position TEXT, -- For players
  jersey_number TEXT, -- For players
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create groups table (formerly teams)
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  leader_id UUID REFERENCES profiles(id) NOT NULL, -- formerly coach_id
  description TEXT,
  season TEXT,
  join_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_members table (formerly team_members)
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE, -- formerly team_id
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  position TEXT,
  jersey_number TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, player_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  recipient_id UUID REFERENCES profiles(id),
  group_id UUID REFERENCES groups(id), -- formerly team_id
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'direct' CHECK (message_type IN ('direct', 'group', 'announcement')), -- formerly 'team'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create player_stats table
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES profiles(id) NOT NULL,
  group_id UUID REFERENCES groups(id), -- formerly team_id
  season TEXT NOT NULL,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, group_id, season)
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) NOT NULL, -- formerly team_id
  opponent_name TEXT NOT NULL,
  game_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  home_team BOOLEAN DEFAULT true,
  team_score INTEGER,
  opponent_score INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create practices table
CREATE TABLE IF NOT EXISTS practices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) NOT NULL, -- formerly team_id
  practice_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  duration_minutes INTEGER DEFAULT 90,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parent_player_relationships table
CREATE TABLE IF NOT EXISTS parent_player_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'parent' CHECK (relationship_type IN ('parent', 'guardian', 'family')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parent_id, player_id)
);

-- Create group_join_requests table (formerly team_join_requests)
CREATE TABLE IF NOT EXISTS group_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE, -- formerly team_id
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- For parent requests
  request_type TEXT NOT NULL CHECK (request_type IN ('player', 'parent')),
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES profiles(id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_player_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for groups (formerly teams)
CREATE POLICY "Users can view groups they are members of" ON groups
  FOR SELECT USING (
    auth.uid() = leader_id OR 
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = groups.id AND player_id = auth.uid()
    )
  );

CREATE POLICY "Leaders can manage their groups" ON groups
  FOR ALL USING (auth.uid() = leader_id);

-- RLS Policies for group_members (formerly team_members)
CREATE POLICY "Users can view group members for groups they belong to" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_members.group_id 
      AND (leader_id = auth.uid() OR EXISTS (
        SELECT 1 FROM group_members gm2 
        WHERE gm2.group_id = groups.id AND gm2.player_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Leaders can manage group members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_members.group_id AND leader_id = auth.uid()
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for player_stats
CREATE POLICY "Users can view stats for groups they belong to" ON player_stats
  FOR SELECT USING (
    auth.uid() = player_id OR
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = player_stats.group_id AND leader_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = player_stats.group_id AND player_id = auth.uid()
    )
  );

CREATE POLICY "Leaders can manage player stats" ON player_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = player_stats.group_id AND leader_id = auth.uid()
    )
  );

-- RLS Policies for parent_player_relationships
CREATE POLICY "Users can view their own relationships" ON parent_player_relationships
  FOR SELECT USING (auth.uid() = parent_id OR auth.uid() = player_id);

CREATE POLICY "Parents can manage their relationships" ON parent_player_relationships
  FOR ALL USING (auth.uid() = parent_id);

CREATE POLICY "Leaders can view relationships for their group players" ON parent_player_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      WHERE g.leader_id = auth.uid() 
      AND gm.player_id = parent_player_relationships.player_id
    )
  );

-- RLS Policies for group_join_requests (formerly team_join_requests)
CREATE POLICY "Users can view join requests for their groups" ON group_join_requests
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_join_requests.group_id 
      AND (leader_id = auth.uid() OR EXISTS (
        SELECT 1 FROM group_members 
        WHERE group_id = groups.id AND player_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can create join requests" ON group_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leaders can manage join requests" ON group_join_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_join_requests.group_id AND leader_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_groups_leader_id ON groups(leader_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_player_id ON group_members(player_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_parent_player_relationships_parent_id ON parent_player_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_player_relationships_player_id ON parent_player_relationships(player_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_group_id ON group_join_requests(group_id);

-- Create functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), COALESCE(new.raw_user_meta_data->>'role', 'player'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to generate join codes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
BEGIN
  RETURN UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Add join_code column to groups if it doesn't exist
ALTER TABLE groups ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE DEFAULT generate_join_code();
