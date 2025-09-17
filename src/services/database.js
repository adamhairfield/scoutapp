import { supabase } from '../config/supabase';

// Team Management Functions
export const teamService = {
  // Create a new team
  async createTeam(teamData) {
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          name: teamData.name,
          sport: teamData.sport,
          coach_id: teamData.coach_id,
          description: teamData.description,
          season: teamData.season,
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

  // Get teams for a coach
  async getCoachTeams(coachId) {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (
            id
          )
        `)
        .eq('coach_id', coachId);

      if (error) throw error;
      
      // Add member count to each team
      const teamsWithCount = data?.map(team => ({
        ...team,
        member_count: team.team_members?.length || 0
      })) || [];

      return teamsWithCount;
    } catch (error) {
      console.error('Error getting coach teams:', error);
      return [];
    }
  },

  // Get teams for a user (as a member)
  async getUserTeams(userId) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          teams (
            *,
            team_members (
              id
            )
          )
        `)
        .eq('player_id', userId);

      if (error) throw error;
      
      // Extract teams and add member count
      const teams = data?.map(membership => ({
        ...membership.teams,
        member_count: membership.teams.team_members?.length || 0
      })) || [];

      return teams;
    } catch (error) {
      console.error('Error getting user teams:', error);
      return [];
    }
  },

  // Get team members
  async getTeamMembers(teamId) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles (
            id,
            name,
            email,
            role
          )
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Add player to team
  async addPlayerToTeam(teamId, playerId, position = null) {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert([{
          team_id: teamId,
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

  // Find team by join code
  async findTeamByJoinCode(joinCode) {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          profiles!teams_coach_id_fkey (
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
      console.error('Error finding team by join code:', error);
      return null;
    }
  },

  // Create join request
  async createJoinRequest(teamId, userId, requestType, playerId = null, message = '') {
    try {
      const { data, error } = await supabase
        .from('team_join_requests')
        .insert([{
          team_id: teamId,
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

  // Get join requests for a team
  async getTeamJoinRequests(teamId) {
    try {
      const { data, error } = await supabase
        .from('team_join_requests')
        .select(`
          *,
          profiles!team_join_requests_user_id_fkey (
            id,
            name,
            email,
            role
          ),
          player_profile:profiles!team_join_requests_player_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting team join requests:', error);
      return [];
    }
  },

  // Process join request (approve/reject)
  async processJoinRequest(requestId, status, processedBy) {
    try {
      const { data, error } = await supabase
        .from('team_join_requests')
        .update({
          status: status,
          processed_at: new Date().toISOString(),
          processed_by: processedBy
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // If approved, add to team_members
      if (status === 'approved') {
        const playerId = data.request_type === 'player' ? data.user_id : data.player_id;
        if (playerId) {
          await this.addPlayerToTeam(data.team_id, playerId);
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
          team_id: messageData.team_id,
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

  // Get messagable contacts based on user role and team relationships
  async getMessagableContacts(userId, userRole) {
    try {
      console.log('Getting messagable contacts for:', userId, userRole);
      if (userRole === 'coach') {
        // Get all parents of players on coach's teams using the new relationship table
        const { data, error } = await supabase
          .from('team_members')
          .select(`
            *,
            teams!inner (
              id,
              name,
              coach_id
            )
          `)
          .eq('teams.coach_id', userId);

        if (error) throw error;
        console.log('Team members for coach:', data);

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
        // For parents, get coaches of teams their children are on
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
          .from('team_members')
          .select(`
            *,
            teams!inner (
              id,
              name,
              coach_id,
              profiles!teams_coach_id_fkey (
                id,
                name,
                email,
                role
              )
            )
          `)
          .in('player_id', playerIds);

        if (error) throw error;

        // Extract unique coaches
        const coaches = [];
        const seenCoachIds = new Set();

        data?.forEach(membership => {
          const coach = membership.teams.profiles;
          if (coach && !seenCoachIds.has(coach.id)) {
            coaches.push(coach);
            seenCoachIds.add(coach.id);
          }
        });

        return coaches;
      } else {
        // For players, get their coaches
        const { data, error } = await supabase
          .from('team_members')
          .select(`
            *,
            teams!inner (
              id,
              name,
              coach_id,
              profiles!teams_coach_id_fkey (
                id,
                name,
                email,
                role
              )
            )
          `)
          .eq('player_id', userId);

        if (error) throw error;

        const coaches = data?.map(member => member.teams.profiles).filter(Boolean) || [];
        return coaches;
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
