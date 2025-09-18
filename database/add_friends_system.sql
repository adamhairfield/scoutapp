-- Create friends and friend requests system

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  message TEXT, -- Optional message with friend request
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id) -- Prevent duplicate requests
);

-- Create friendships table (for accepted friend requests)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure friendship is bidirectional and unique
  CONSTRAINT friendship_unique CHECK (user1_id < user2_id),
  UNIQUE(user1_id, user2_id)
);

-- Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_requests
CREATE POLICY "Users can view their own friend requests" ON friend_requests
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Users can send friend requests" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received friend requests" ON friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id);

-- RLS Policies for friendships
CREATE POLICY "Users can view their friendships" ON friendships
  FOR SELECT USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

CREATE POLICY "System can create friendships" ON friendships
  FOR INSERT WITH CHECK (true); -- Will be handled by function

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);

-- Create function to handle friend request acceptance
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record friend_requests%ROWTYPE;
  smaller_id UUID;
  larger_id UUID;
BEGIN
  -- Get the friend request
  SELECT * INTO request_record
  FROM friend_requests
  WHERE id = request_id
    AND receiver_id = auth.uid()
    AND status = 'pending';

  -- Check if request exists and user is authorized
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update request status
  UPDATE friend_requests
  SET status = 'accepted', responded_at = NOW(), updated_at = NOW()
  WHERE id = request_id;

  -- Create friendship (ensure user1_id < user2_id for uniqueness)
  IF request_record.sender_id < request_record.receiver_id THEN
    smaller_id := request_record.sender_id;
    larger_id := request_record.receiver_id;
  ELSE
    smaller_id := request_record.receiver_id;
    larger_id := request_record.sender_id;
  END IF;

  -- Insert friendship
  INSERT INTO friendships (user1_id, user2_id)
  VALUES (smaller_id, larger_id)
  ON CONFLICT (user1_id, user2_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

-- Create function to check if users are friends
CREATE OR REPLACE FUNCTION are_friends(user1 UUID, user2 UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  smaller_id UUID;
  larger_id UUID;
BEGIN
  -- Determine order for lookup
  IF user1 < user2 THEN
    smaller_id := user1;
    larger_id := user2;
  ELSE
    smaller_id := user2;
    larger_id := user1;
  END IF;

  -- Check if friendship exists
  RETURN EXISTS(
    SELECT 1 FROM friendships
    WHERE user1_id = smaller_id AND user2_id = larger_id
  );
END;
$$;

-- Create view for user's friends
CREATE OR REPLACE VIEW user_friends AS
SELECT 
  CASE 
    WHEN f.user1_id = auth.uid() THEN f.user2_id
    ELSE f.user1_id
  END as friend_id,
  CASE 
    WHEN f.user1_id = auth.uid() THEN p2.name
    ELSE p1.name
  END as friend_name,
  CASE 
    WHEN f.user1_id = auth.uid() THEN p2.profile_picture_url
    ELSE p1.profile_picture_url
  END as friend_profile_picture_url,
  CASE 
    WHEN f.user1_id = auth.uid() THEN p2.role
    ELSE p1.role
  END as friend_role,
  f.created_at as friends_since
FROM friendships f
JOIN profiles p1 ON f.user1_id = p1.id
JOIN profiles p2 ON f.user2_id = p2.id
WHERE f.user1_id = auth.uid() OR f.user2_id = auth.uid();

-- Grant permissions
GRANT SELECT ON user_friends TO authenticated;
GRANT EXECUTE ON FUNCTION accept_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION are_friends(UUID, UUID) TO authenticated;

-- Add comments
COMMENT ON TABLE friend_requests IS 'Friend requests between users';
COMMENT ON TABLE friendships IS 'Accepted friendships between users';
COMMENT ON FUNCTION accept_friend_request(UUID) IS 'Accept a friend request and create friendship';
COMMENT ON FUNCTION are_friends(UUID, UUID) IS 'Check if two users are friends';

SELECT 'Friends system created successfully!' as status;
