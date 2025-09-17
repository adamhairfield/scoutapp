import { supabase } from '../config/supabase';

// Group Management Functions
export const groupService = {
  // Create a new group
  async createGroup(groupData) {
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([{
          name: groupData.name,
          sport: groupData.sport,
          leader_id: groupData.leader_id,
          description: groupData.description,
          season: groupData.season,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get groups for a user (both as leader and member)
  async getUserGroups(userId) {
    try {
      // Get groups where user is leader
      const { data: leaderGroups, error: leaderError } = await supabase
        .from('groups')
        .select(`
          *,
          group_members (
            id
          )
        `)
        .eq('leader_id', userId);

      if (leaderError) throw leaderError;

      // Get groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from('groups')
        .select(`
          *,
          group_members!inner (
            id,
            player_id
          )
        `)
        .eq('group_members.player_id', userId);

      if (memberError) throw memberError;

      // Combine and deduplicate groups
      const allGroups = [...(leaderGroups || []), ...(memberGroups || [])];
      const uniqueGroups = allGroups.filter((group, index, self) => 
        index === self.findIndex(g => g.id === group.id)
      );

      // Add member count to each group
      const groupsWithCount = uniqueGroups.map(group => ({
        ...group,
        member_count: group.group_members?.length || 0,
        user_role: leaderGroups?.some(lg => lg.id === group.id) ? 'leader' : 'member'
      }));

      return groupsWithCount;
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  },

  // Keep the old function for backward compatibility
  async getLeaderGroups(leaderId) {
    return this.getUserGroups(leaderId);
  },

  // Create an invite link for a group
  async createInviteLink(groupId, createdBy, options = {}) {
    try {
      const { data, error } = await supabase
        .from('group_invite_links')
        .insert([{
          group_id: groupId,
          created_by: createdBy,
          max_uses: options.maxUses || null,
          expires_at: options.expiresAt || null
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating invite link:', error);
      return { success: false, error: error.message };
    }
  },

  // Get invite links for a group
  async getGroupInviteLinks(groupId) {
    try {
      const { data, error } = await supabase
        .from('group_invite_links')
        .select(`
          *,
          profiles!group_invite_links_created_by_fkey (
            name
          )
        `)
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting invite links:', error);
      return [];
    }
  },

  // Use an invite link
  async useInviteLink(token) {
    try {
      const { data, error } = await supabase.rpc('use_invite_link', {
        token: token
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error using invite link:', error);
      return { success: false, error: error.message };
    }
  },

  // Deactivate an invite link
  async deactivateInviteLink(linkId) {
    try {
      const { error } = await supabase
        .from('group_invite_links')
        .update({ is_active: false })
        .eq('id', linkId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deactivating invite link:', error);
      return { success: false, error: error.message };
    }
  },


  // Get group members
  async getGroupMembers(groupId) {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profiles (
            id,
            name,
            email,
            role
          )
        `)
        .eq('group_id', groupId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Add player to group
  async addPlayerToGroup(groupId, playerId, position = null) {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          player_id: playerId,
          position: position,
          joined_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Find group by join code
  async findGroupByJoinCode(joinCode) {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          profiles!groups_leader_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('join_code', joinCode.toUpperCase())
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error finding group by join code:', error);
      return null;
    }
  },

  // Create join request
  async createJoinRequest(groupId, userId, requestType, playerId = null, message = '') {
    try {
      const { data, error } = await supabase
        .from('group_join_requests')
        .insert([{
          group_id: groupId,
          user_id: userId,
          request_type: requestType,
          player_id: playerId,
          message: message
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get join requests for a group
  async getGroupJoinRequests(groupId) {
    try {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select(`
          *,
          profiles!group_join_requests_user_id_fkey (
            id,
            name,
            email,
            role
          ),
          player_profile:profiles!group_join_requests_player_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting group join requests:', error);
      return [];
    }
  },

  // Process join request (approve/reject)
  async processJoinRequest(requestId, status, processedBy) {
    try {
      const { data, error } = await supabase
        .from('group_join_requests')
        .update({
          status: status,
          processed_at: new Date().toISOString(),
          processed_by: processedBy
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // If approved, add to group_members
      if (status === 'approved') {
        const playerId = data.request_type === 'player' ? data.user_id : data.player_id;
        if (playerId) {
          await this.addPlayerToGroup(data.group_id, playerId);
        }
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Message Functions
export const messageService = {
  // Send a message
  async sendMessage(messageData) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: messageData.sender_id,
          recipient_id: messageData.recipient_id,
          group_id: messageData.group_id,
          content: messageData.content,
          message_type: messageData.message_type || 'direct',
          sent_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get conversations for a user
  async getUserConversations(userId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            name,
            email,
            role
          ),
          recipient:profiles!messages_recipient_id_fkey (
            id,
            name,
            email,
            role
          )
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      
      // Group messages by conversation partner
      const conversations = {};
      data?.forEach(message => {
        const partnerId = message.sender_id === userId ? message.recipient_id : message.sender_id;
        const partner = message.sender_id === userId ? message.recipient : message.sender;
        
        if (!conversations[partnerId]) {
          conversations[partnerId] = {
            id: partnerId,
            partner: partner,
            lastMessage: message.content,
            timestamp: message.sent_at,
            unread: 0 // TODO: implement unread count
          };
        }
      });

      return Object.values(conversations);
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  },

  // Get messagable contacts based on user role and group relationships
  async getMessagableContacts(userId, userRole) {
    try {
      console.log('Getting messagable contacts for:', userId, userRole);
      if (userRole === 'coach') {
        // Get all parents of players on leader's groups using the new relationship table
        const { data, error } = await supabase
          .from('group_members')
          .select(`
            *,
            groups!inner (
              id,
              name,
              leader_id
            )
          `)
          .eq('groups.leader_id', userId);

        if (error) throw error;
        console.log('Group members for leader:', data);

        // Get parent relationships separately
        const playerIds = data?.map(member => member.player_id) || [];
        console.log('Player IDs:', playerIds);
        if (playerIds.length === 0) return [];

        const { data: relationships, error: relError } = await supabase
          .from('parent_player_relationships')
          .select(`
            parent_id,
            player_id,
            profiles!parent_id (
              id,
              name,
              email,
              role
            )
          `)
          .in('player_id', playerIds);

        if (relError) throw relError;
        console.log('Parent relationships:', relationships);

        // Extract unique parent contacts
        const parents = [];
        const seenParentIds = new Set();

        relationships?.forEach(relationship => {
          const parent = relationship.profiles;
          if (parent && !seenParentIds.has(parent.id)) {
            parents.push(parent);
            seenParentIds.add(parent.id);
          }
        });

        console.log('Final parents list:', parents);
        return parents;
      } else if (userRole === 'parent') {
        // For parents, get leaders of groups their children are on
        const { data: relationships, error: relError } = await supabase
          .from('parent_player_relationships')
          .select(`
            player_id
          `)
          .eq('parent_id', userId);

        if (relError) throw relError;

        const playerIds = relationships?.map(rel => rel.player_id) || [];
        if (playerIds.length === 0) return [];

        const { data, error } = await supabase
          .from('group_members')
          .select(`
            *,
            groups!inner (
              id,
              name,
              leader_id,
              profiles!groups_leader_id_fkey (
                id,
                name,
                email,
                role
              )
            )
          `)
          .in('player_id', playerIds);

        if (error) throw error;

        // Extract unique leaders
        const leaders = [];
        const seenLeaderIds = new Set();

        data?.forEach(membership => {
          const leader = membership.groups.profiles;
          if (leader && !seenLeaderIds.has(leader.id)) {
            leaders.push(leader);
            seenLeaderIds.add(leader.id);
          }
        });

        return leaders;
      } else {
        // For players, get their leaders
        const { data, error } = await supabase
          .from('group_members')
          .select(`
            *,
            groups!inner (
              id,
              name,
              leader_id,
              profiles!groups_leader_id_fkey (
                id,
                name,
                email,
                role
              )
            )
          `)
          .eq('player_id', userId);

        if (error) throw error;

        const leaders = data?.map(member => member.groups.profiles).filter(Boolean) || [];
        return leaders;
      }
    } catch (error) {
      console.error('Error getting messagable contacts:', error);
      return [];
    }
  },

  // Get messages between two users
  async getDirectMessages(userId1, userId2) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            name,
            email
          )
        `)
        .or(`and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Parent-Player Relationship Functions
export const parentPlayerService = {
  // Create a parent-player relationship
  async createRelationship(parentId, playerId, relationshipType = 'parent') {
    try {
      const { data, error } = await supabase
        .from('parent_player_relationships')
        .insert([{
          parent_id: parentId,
          player_id: playerId,
          relationship_type: relationshipType
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get all children for a parent
  async getParentChildren(parentId) {
    try {
      const { data, error } = await supabase
        .from('parent_player_relationships')
        .select(`
          *,
          profiles!parent_player_relationships_player_id_fkey (
            id,
            name,
            email,
            role
          )
        `)
        .eq('parent_id', parentId);

      if (error) throw error;
      return data?.map(rel => rel.profiles) || [];
    } catch (error) {
      console.error('Error getting parent children:', error);
      return [];
    }
  },

  // Get all parents for a player
  async getPlayerParents(playerId) {
    try {
      const { data, error } = await supabase
        .from('parent_player_relationships')
        .select(`
          *,
          profiles!parent_player_relationships_parent_id_fkey (
            id,
            name,
            email,
            role
          )
        `)
        .eq('player_id', playerId);

      if (error) throw error;
      return data?.map(rel => rel.profiles) || [];
    } catch (error) {
      console.error('Error getting player parents:', error);
      return [];
    }
  },

  // Remove a parent-player relationship
  async removeRelationship(parentId, playerId) {
    try {
      const { error } = await supabase
        .from('parent_player_relationships')
        .delete()
        .eq('parent_id', parentId)
        .eq('player_id', playerId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// User Profile Functions
export const profileService = {
  // Search users by email
  async searchUsersByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', `%${email}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  },

  // Update user profile
  async updateProfile(userId, profileData) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get user profile
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Search users by email or name
  async searchUsers(query) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Stats Functions
export const statsService = {
  // Update player stats
  async updatePlayerStats(playerId, stats) {
    try {
      const { data, error } = await supabase
        .from('player_stats')
        .upsert([{
          player_id: playerId,
          goals: stats.goals,
          assists: stats.assists,
          games_played: stats.games_played,
          season: stats.season || new Date().getFullYear().toString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get player stats
  async getPlayerStats(playerId, season = null) {
    try {
      let query = supabase
        .from('player_stats')
        .select('*')
        .eq('player_id', playerId);

      if (season) {
        query = query.eq('season', season);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Feed Service Functions
export const feedService = {
  // Get posts for a group with recent comments
  async getGroupPosts(groupId) {
    try {
      // First get the posts
      const { data: posts, error } = await supabase
        .from('group_posts_with_stats')
        .select('*')
        .eq('group_id', groupId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Then get recent comments for each post (max 5 per post)
      const postsWithComments = await Promise.all(
        (posts || []).map(async (post) => {
          const { data: recentComments } = await supabase
            .from('post_comments')
            .select(`
              *,
              profiles!post_comments_author_id_fkey (
                id,
                name,
                role
              )
            `)
            .eq('post_id', post.id)
            .order('created_at', { ascending: false })
            .limit(5);

          return {
            ...post,
            recent_comments: recentComments || []
          };
        })
      );

      return postsWithComments;
    } catch (error) {
      console.error('Error getting group posts:', error);
      return [];
    }
  },

  // Create a new post
  async createPost(postData) {
    try {
      const { data, error } = await supabase
        .from('group_posts')
        .insert([{
          group_id: postData.group_id,
          author_id: postData.author_id,
          content: postData.content,
          post_type: postData.post_type || 'text',
          image_url: postData.image_url,
          video_url: postData.video_url,
          link_url: postData.link_url,
          link_title: postData.link_title,
          link_description: postData.link_description,
          is_pinned: postData.is_pinned || false
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, error: error.message };
    }
  },

  // Like/unlike a post
  async togglePostLike(postId, userId) {
    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (existingLike) {
        // Unlike the post
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);

        if (error) throw error;
        return { success: true, liked: false };
      } else {
        // Like the post
        const { error } = await supabase
          .from('post_likes')
          .insert([{ post_id: postId, user_id: userId }]);

        if (error) throw error;
        return { success: true, liked: true };
      }
    } catch (error) {
      console.error('Error toggling post like:', error);
      return { success: false, error: error.message };
    }
  },

  // Get comments for a post
  async getPostComments(postId) {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles!post_comments_author_id_fkey (
            id,
            name,
            role
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting post comments:', error);
      return [];
    }
  },

  // Create a comment
  async createComment(commentData) {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert([{
          post_id: commentData.post_id,
          author_id: commentData.author_id,
          content: commentData.content,
          parent_comment_id: commentData.parent_comment_id
        }])
        .select(`
          *,
          profiles!post_comments_author_id_fkey (
            id,
            name,
            role
          )
        `)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating comment:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete a post
  async deletePost(postId, userId) {
    try {
      const { error } = await supabase
        .from('group_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting post:', error);
      return { success: false, error: error.message };
    }
  },

  // Pin/unpin a post (leaders only)
  async togglePostPin(postId, userId) {
    try {
      // First get the current pin status
      const { data: post, error: fetchError } = await supabase
        .from('group_posts')
        .select('is_pinned')
        .eq('id', postId)
        .single();

      if (fetchError) throw fetchError;

      // Toggle the pin status
      const { error } = await supabase
        .from('group_posts')
        .update({ is_pinned: !post.is_pinned })
        .eq('id', postId);

      if (error) throw error;
      return { success: true, pinned: !post.is_pinned };
    } catch (error) {
      console.error('Error toggling post pin:', error);
      return { success: false, error: error.message };
    }
  }
};
