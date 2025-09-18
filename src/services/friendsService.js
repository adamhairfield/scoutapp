import { supabase } from '../config/supabase';

export const friendsService = {
  // Search for users by name or email
  async searchUsers(query, currentUserId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, profile_picture_url')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', currentUserId) // Exclude current user
        .limit(20);

      if (error) throw error;

      // Check friendship status for each user
      const usersWithStatus = await Promise.all(
        (data || []).map(async (user) => {
          const friendshipStatus = await this.getFriendshipStatus(currentUserId, user.id);
          return {
            ...user,
            friendshipStatus
          };
        })
      );

      return {
        success: true,
        data: usersWithStatus
      };
    } catch (error) {
      console.error('Error searching users:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get friendship status between two users
  async getFriendshipStatus(userId1, userId2) {
    try {
      // Check if they are friends
      const { data: friendship } = await supabase.rpc('are_friends', {
        user1: userId1,
        user2: userId2
      });

      if (friendship) {
        return 'friends';
      }

      // Check for pending friend requests
      const { data: sentRequest } = await supabase
        .from('friend_requests')
        .select('status')
        .eq('sender_id', userId1)
        .eq('receiver_id', userId2)
        .eq('status', 'pending')
        .single();

      if (sentRequest) {
        return 'request_sent';
      }

      const { data: receivedRequest } = await supabase
        .from('friend_requests')
        .select('status')
        .eq('sender_id', userId2)
        .eq('receiver_id', userId1)
        .eq('status', 'pending')
        .single();

      if (receivedRequest) {
        return 'request_received';
      }

      return 'none';
    } catch (error) {
      console.error('Error getting friendship status:', error);
      return 'none';
    }
  },

  // Send friend request
  async sendFriendRequest(senderId, receiverId, message = null) {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .insert([{
          sender_id: senderId,
          receiver_id: receiverId,
          message: message,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get received friend requests
  async getReceivedFriendRequests(userId) {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey (
            id,
            name,
            profile_picture_url,
            role
          )
        `)
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting friend requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get sent friend requests
  async getSentFriendRequests(userId) {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          receiver:profiles!friend_requests_receiver_id_fkey (
            id,
            name,
            profile_picture_url,
            role
          )
        `)
        .eq('sender_id', userId)
        .eq('status', 'pending')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting sent requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Accept friend request
  async acceptFriendRequest(requestId) {
    try {
      const { data, error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      });

      if (error) throw error;

      return {
        success: data,
        data
      };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Decline friend request
  async declineFriendRequest(requestId) {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ 
          status: 'declined', 
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error declining friend request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Cancel sent friend request
  async cancelFriendRequest(requestId) {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error canceling friend request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get user's friends list
  async getFriends(userId) {
    try {
      const { data, error } = await supabase
        .from('user_friends')
        .select('*')
        .order('friend_name');

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error getting friends:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Remove friend
  async removeFriend(userId1, userId2) {
    try {
      // Determine the correct order for deletion
      const smallerId = userId1 < userId2 ? userId1 : userId2;
      const largerId = userId1 < userId2 ? userId2 : userId1;

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user1_id', smallerId)
        .eq('user2_id', largerId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error removing friend:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Check if users can message each other (are friends)
  async canMessage(userId1, userId2) {
    try {
      const { data } = await supabase.rpc('are_friends', {
        user1: userId1,
        user2: userId2
      });

      return data === true;
    } catch (error) {
      console.error('Error checking message permission:', error);
      return false;
    }
  }
};
