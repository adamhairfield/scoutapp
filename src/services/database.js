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
          cover_photo_url: groupData.cover_photo_url || null,
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
      // Get groups where user is leader (simpler query)
      const { data: leaderGroups, error: leaderError } = await supabase
        .from('groups')
        .select('*')
        .eq('leader_id', userId);

      if (leaderError) throw leaderError;

      // Get groups where user is a member (using a separate query to avoid join issues)
      const { data: membershipData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('player_id', userId);

      if (memberError) throw memberError;

      // Get the actual group data for member groups
      let memberGroups = [];
      if (membershipData && membershipData.length > 0) {
        const memberGroupIds = membershipData.map(m => m.group_id);
        const { data: memberGroupsData, error: memberGroupsError } = await supabase
          .from('groups')
          .select('*')
          .in('id', memberGroupIds);

        if (memberGroupsError) throw memberGroupsError;
        memberGroups = memberGroupsData || [];
      }

      // Combine and deduplicate groups
      const allGroups = [...(leaderGroups || []), ...memberGroups];
      const uniqueGroups = allGroups.filter((group, index, self) => 
        index === self.findIndex(g => g.id === group.id)
      );

      // Build a lookup of leader profiles for all groups we fetched
      const leaderIds = [...new Set(uniqueGroups.map((group) => group.leader_id).filter(Boolean))];
      let leaderProfileMap = new Map();
      if (leaderIds.length > 0) {
        const { data: leaderProfiles, error: leaderProfilesError } = await supabase
          .from('profiles')
          .select('id, name, email, profile_picture_url')
          .in('id', leaderIds);

        if (leaderProfilesError) throw leaderProfilesError;

        leaderProfileMap = new Map(leaderProfiles.map((profile) => [profile.id, profile]));
      }

      // Get member counts and pin status for each group
      const groupsWithCount = await Promise.all(
        uniqueGroups.map(async (group) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          // Check if user has pinned this group
          const { data: pinData } = await supabase
            .from('group_pins')
            .select('id')
            .eq('group_id', group.id)
            .eq('user_id', userId)
            .single();

          return {
            ...group,
            leader_profile: leaderProfileMap.get(group.leader_id) || null,
            member_count: (memberCount || 0) + 1, // +1 for the leader
            user_role: leaderGroups?.some(lg => lg.id === group.id) ? 'leader' : 'member',
            is_pinned: !!pinData
          };
        })
      );

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
            role,
            profile_picture_url
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
        .select('*')
        .eq('join_code', joinCode.toUpperCase())
        .single();

      if (error) throw error;
      if (!data) return null;

      // Fetch leader profile information
      let leaderProfile = null;
      if (data.leader_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, email, profile_picture_url')
          .eq('id', data.leader_id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        leaderProfile = profileData || null;
      }

      return {
        ...data,
        leader_profile: leaderProfile,
      };
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
  },

  // Update group pin status for a user
  async updateGroupPin(groupId, userId, isPinned) {
    try {
      // First check if a pin record exists
      const { data: existingPin, error: checkError } = await supabase
        .from('group_pins')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (isPinned) {
        if (!existingPin) {
          // Create new pin record
          const { error } = await supabase
            .from('group_pins')
            .insert([{
              group_id: groupId,
              user_id: userId,
              pinned_at: new Date().toISOString()
            }]);

          if (error) throw error;
        }
      } else {
        if (existingPin) {
          // Remove pin record
          const { error } = await supabase
            .from('group_pins')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);

          if (error) throw error;
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating group pin:', error);
      return { success: false, error: error.message };
    }
  },

  // Search for public groups
  async searchPublicGroups(query) {
    try {
      const { data, error } = await supabase
        .from('public_groups')
        .select('*')
        .or(`name.ilike.%${query}%,sport.ilike.%${query}%,description.ilike.%${query}%`)
        .order('name')
        .limit(20);

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error searching public groups:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Update group visibility
  async updateGroupVisibility(groupId, visibility, userId) {
    try {
      // Check if user is the group leader
      const { data: group, error: checkError } = await supabase
        .from('groups')
        .select('leader_id')
        .eq('id', groupId)
        .single();

      if (checkError) throw checkError;

      if (group.leader_id !== userId) {
        return {
          success: false,
          error: 'Only group leaders can change visibility settings'
        };
      }

      // Update visibility
      const { error } = await supabase
        .from('groups')
        .update({ visibility })
        .eq('id', groupId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error updating group visibility:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Request to join a group
  async requestToJoinGroup(groupId, userId) {
    try {
      const { data, error } = await supabase
        .from('group_join_requests')
        .insert([{
          group_id: groupId,
          user_id: userId,
          request_type: 'player',
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error requesting to join group:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Join a group (handles both public and private groups)
  async joinGroup(groupId, userId) {
    try {
      // First, get the group to check its visibility
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('visibility')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      // If group is public, add user directly to group_members
      if (group.visibility === 'public') {
        const { data, error } = await supabase
          .from('group_members')
          .insert([{
            group_id: groupId,
            player_id: userId,
            joined_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        return { 
          success: true, 
          data, 
          joined: true,
          message: 'Successfully joined the group!' 
        };
      } else {
        // If group is private, create a join request
        return await this.requestToJoinGroup(groupId, userId);
      }
    } catch (error) {
      console.error('Error joining group:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Delete a group (only by leader)
  async deleteGroup(groupId, userId) {
    try {
      // First verify the user is the group leader
      const { data: group, error: fetchError } = await supabase
        .from('groups')
        .select('leader_id, name')
        .eq('id', groupId)
        .single();

      if (fetchError) throw fetchError;

      if (group.leader_id !== userId) {
        return { success: false, error: 'Only group leaders can delete the group' };
      }

      // Delete the group (CASCADE will handle related records)
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      return { success: true, message: `Group "${group.name}" has been deleted successfully` };
    } catch (error) {
      console.error('Error deleting group:', error);
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
            role,
            profile_picture_url
          ),
          recipient:profiles!messages_recipient_id_fkey (
            id,
            name,
            email,
            role,
            profile_picture_url
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
  // Helper function to format timestamps
  formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown time';
    
    const now = new Date();
    const postTime = new Date(timestamp);
    
    if (isNaN(postTime.getTime())) return 'Invalid date';
    
    const diffInMinutes = Math.floor((now - postTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  },

  // Get posts for a group with recent comments
  async getGroupPosts(groupId) {
    console.log('🚀 getGroupPosts called with groupId:', groupId);
    
    try {
      console.log('📡 Querying group_posts_with_stats...');
      
      // First get the posts from the updated view
      const { data: posts, error } = await supabase
        .from('group_posts_with_stats')
        .select('*')
        .eq('group_id', groupId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      console.log('✅ Query completed. Posts:', posts?.length || 0);
      console.log('❌ Query error:', error);

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
                role,
                profile_picture_url
              )
            `)
            .eq('post_id', post.id)
            .order('created_at', { ascending: false })
            .limit(5);

          // Keep all the original post data and just add comments
          post.recent_comments = recentComments || [];
          return post;
        })
      );

      // Transform the data to match our component structure
      const transformedPosts = postsWithComments.map(post => ({
        id: post.id,
        author: {
          id: post.author_id,
          name: post.author_name,
          role: post.author_role,
          profile_picture_url: post.author_profile_picture_url
        },
        content: post.content,
        created_at: post.created_at,
        likes: post.total_reactions || post.like_count,
        comments: post.recent_comments || [],
        commentCount: post.comment_count,
        liked: post.user_liked,
        userReaction: post.user_reaction,
        type: post.post_type,
        pinned: post.is_pinned,
        photo_url: post.photo_url,
        photo_urls: post.photo_urls,
        video_url: post.video_url,
        video_duration: post.video_duration,
        video_width: post.video_width,
        video_height: post.video_height
      }));
      
      return transformedPosts;
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
          photo_url: postData.photo_url, // Single photo support
          photo_urls: postData.photo_urls, // Multiple photos support
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

  // Delete a post
  async deletePost(postId, userId) {
    try {
      // First verify the user owns the post
      const { data: post, error: fetchError } = await supabase
        .from('group_posts')
        .select('author_id')
        .eq('id', postId)
        .single();

      if (fetchError) throw fetchError;

      if (post.author_id !== userId) {
        return { success: false, error: 'You can only delete your own posts' };
      }

      // Delete the post
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

  // Update a post
  async updatePost(postId, userId, updateData) {
    try {
      // First verify the user owns the post
      const { data: post, error: fetchError } = await supabase
        .from('group_posts')
        .select('author_id')
        .eq('id', postId)
        .single();

      if (fetchError) throw fetchError;

      if (post.author_id !== userId) {
        return { success: false, error: 'You can only edit your own posts' };
      }

      // Update the post
      const { data, error } = await supabase
        .from('group_posts')
        .update({
          content: updateData.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error updating post:', error);
      return { success: false, error: error.message };
    }
  },

  // Report a post
  async reportPost(postId, userId, reason = 'inappropriate_content') {
    try {
      // Check if user already reported this post
      const { data: existingReport } = await supabase
        .from('post_reports')
        .select('id')
        .eq('post_id', postId)
        .eq('reporter_id', userId)
        .single();

      if (existingReport) {
        return { success: false, error: 'You have already reported this post' };
      }

      // Create the report
      const { data, error } = await supabase
        .from('post_reports')
        .insert([{
          post_id: postId,
          reporter_id: userId,
          reason: reason,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error reporting post:', error);
      return { success: false, error: error.message };
    }
  },

  // Create a photo post with single or multiple photos
  async createPhotoPost(postData) {
    try {
      const photoPostData = {
        ...postData,
        post_type: 'image',
        content: postData.content || '', // Allow empty content for photo-only posts
      };

      return await this.createPost(photoPostData);
    } catch (error) {
      console.error('Error creating photo post:', error);
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
            role,
            profile_picture_url
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
  },

  // Add or update a reaction to a post
  async reactToPost(postId, userId, reactionType) {
    try {
      // Use upsert to insert or update the reaction
      const { data, error } = await supabase
        .from('post_reactions')
        .upsert([{
          post_id: postId,
          user_id: userId,
          reaction_type: reactionType,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'post_id,user_id'
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error reacting to post:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove a reaction from a post
  async removeReaction(postId, userId) {
    try {
      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error removing reaction:', error);
      return { success: false, error: error.message };
    }
  },

  // Get reactions for a post
  async getPostReactions(postId) {
    try {
      const { data, error } = await supabase
        .from('post_reactions')
        .select(`
          *,
          profiles (
            id,
            name,
            profile_picture_url
          )
        `)
        .eq('post_id', postId);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error getting post reactions:', error);
      return { success: false, error: error.message };
    }
  },

  // Alias for reactToPost for backward compatibility
  async addReaction(postId, userId, reactionType) {
    return this.reactToPost(postId, userId, reactionType);
  },

  // Alias for togglePostLike for backward compatibility
  async toggleLike(postId, userId) {
    return this.togglePostLike(postId, userId);
  }
};
