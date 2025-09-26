import { supabase } from '../config/supabase';
import SportsEngineScrapingService from './SportsEngineScrapingService';

class MigrationService {
  constructor() {
    this.migrationProgress = {
      organizations: 0,
      teams: 0,
      players: 0,
      events: 0,
      total: 0,
      current: 0,
      status: 'idle', // idle, running, completed, error
      errors: []
    };
    this.progressCallback = null;
  }

  /**
   * Set progress callback for UI updates
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  /**
   * Update progress and notify UI
   */
  updateProgress(update) {
    this.migrationProgress = { ...this.migrationProgress, ...update };
    if (this.progressCallback) {
      this.progressCallback(this.migrationProgress);
    }
  }

  /**
   * Start the migration process
   */
  async startMigration(userId, selectedOrganizations = []) {
    try {
      this.updateProgress({ 
        status: 'running', 
        current: 0, 
        errors: [] 
      });

      // Step 1: Get organizations from SportsEngine
      this.updateProgress({ status: 'running', message: 'Fetching organizations...' });
      const organizationsData = await SportsEngineScrapingService.getOrganizations();
      
      let organizationsToMigrate = organizationsData;
      if (selectedOrganizations.length > 0) {
        organizationsToMigrate = organizationsData.filter(
          org => selectedOrganizations.includes(org.id)
        );
      }

      // Calculate total items for progress tracking
      let totalTeams = 0;
      for (const org of organizationsToMigrate) {
        const teamsData = await SportsEngineScrapingService.getTeamsForOrganization(org.id);
        totalTeams += teamsData.length;
      }

      this.updateProgress({ 
        total: organizationsToMigrate.length + totalTeams,
        organizations: organizationsToMigrate.length,
        teams: totalTeams
      });

      // Step 2: Migrate organizations and teams
      const migratedData = {
        groups: [],
        members: [],
        events: []
      };

      for (const organization of organizationsToMigrate) {
        try {
          // Create organization as a group in Scout
          const orgGroup = await this.migrateOrganization(organization, userId);
          migratedData.groups.push(orgGroup);
          
          this.updateProgress({ 
            current: this.migrationProgress.current + 1,
            message: `Migrated organization: ${organization.name}`
          });

          // Get and migrate teams for this organization
          const teamsData = await SportsEngineScrapingService.getTeamsForOrganization(organization.id);
          
          for (const team of teamsData) {
            try {
              const teamGroup = await this.migrateTeam(team, userId, orgGroup.id);
              migratedData.groups.push(teamGroup);

              // Migrate team members
              const members = await this.migrateTeamMembers(team, teamGroup.id, userId);
              migratedData.members.push(...members);

              this.updateProgress({ 
                current: this.migrationProgress.current + 1,
                message: `Migrated team: ${team.name}`
              });

            } catch (teamError) {
              console.error(`Error migrating team ${team.name}:`, teamError);
              this.migrationProgress.errors.push({
                type: 'team',
                name: team.name,
                error: teamError.message
              });
            }
          }

        } catch (orgError) {
          console.error(`Error migrating organization ${organization.name}:`, orgError);
          this.migrationProgress.errors.push({
            type: 'organization',
            name: organization.name,
            error: orgError.message
          });
        }
      }

      // Step 3: Create migration record
      await this.createMigrationRecord(userId, migratedData);

      this.updateProgress({ 
        status: 'completed',
        message: 'Migration completed successfully!'
      });

      return {
        success: true,
        data: migratedData,
        progress: this.migrationProgress
      };

    } catch (error) {
      console.error('Migration failed:', error);
      this.updateProgress({ 
        status: 'error',
        message: `Migration failed: ${error.message}`
      });
      
      return {
        success: false,
        error: error.message,
        progress: this.migrationProgress
      };
    }
  }

  /**
   * Migrate SportsEngine organization to Scout group
   */
  async migrateOrganization(organization, userId) {
    const groupData = {
      name: organization.name,
      description: organization.description || `Migrated from SportsEngine: ${organization.name}`,
      group_type: 'organization',
      created_by: userId,
      leader_id: userId,
      is_public: false,
      sportsengine_id: organization.id,
      sport: organization.sport || 'Multi-Sport',
      gender: organization.gender || 'Mixed',
      migrated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('groups')
      .insert([groupData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create organization group: ${error.message}`);
    }

    // Add creator as admin member
    await supabase
      .from('group_members')
      .insert([{
        group_id: data.id,
        user_id: userId,
        role: 'admin',
        status: 'approved'
      }]);

    return data;
  }

  /**
   * Migrate SportsEngine team to Scout group
   */
  async migrateTeam(team, userId, parentGroupId = null) {
    const groupData = {
      name: team.name,
      description: `${team.sport || 'Sports'} team - ${team.program?.primaryName || 'Season'}`,
      group_type: 'team',
      created_by: userId,
      leader_id: userId,
      is_public: false,
      sportsengine_id: team.id,
      parent_group_id: parentGroupId,
      sport: team.sport || 'General',
      gender: team.gender || 'Mixed',
      migrated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('groups')
      .insert([groupData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create team group: ${error.message}`);
    }

    // Add creator as admin member
    await supabase
      .from('group_members')
      .insert([{
        group_id: data.id,
        user_id: userId,
        role: 'admin',
        status: 'approved'
      }]);

    return data;
  }

  /**
   * Migrate team members (players and staff)
   */
  async migrateTeamMembers(team, groupId, userId) {
    const members = [];

    // Get roster data from SportsEngine
    const rosterData = await SportsEngineScrapingService.getTeamRoster(team.id);

    // Process players
    if (rosterData.players && rosterData.players.length > 0) {
      for (const player of rosterData.players) {
        try {
          const member = await this.createMemberFromSportsEngineProfile(
            player, 
            groupId, 
            'player',
            { jerseyNumber: player.jerseyNumber }
          );
          members.push(member);
        } catch (error) {
          console.error(`Error creating player ${player.firstName} ${player.lastName}:`, error);
          this.migrationProgress.errors.push({
            type: 'player',
            name: `${player.firstName} ${player.lastName}`,
            error: error.message
          });
        }
      }
    }

    // Process staff
    if (rosterData.staff && rosterData.staff.length > 0) {
      for (const staffMember of rosterData.staff) {
        try {
          const member = await this.createMemberFromSportsEngineProfile(
            staffMember, 
            groupId, 
            this.mapStaffRoleToScoutRole(staffMember.title),
            { title: staffMember.title }
          );
          members.push(member);
        } catch (error) {
          console.error(`Error creating staff ${staffMember.firstName} ${staffMember.lastName}:`, error);
          this.migrationProgress.errors.push({
            type: 'staff',
            name: `${staffMember.firstName} ${staffMember.lastName}`,
            error: error.message
          });
        }
      }
    }

    return members;
  }

  /**
   * Create a Scout user profile from SportsEngine profile data
   */
  async createMemberFromSportsEngineProfile(seProfile, groupId, role, metadata = {}) {
    // Check if user already exists by SportsEngine profile ID
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('sportsengine_profile_id', seProfile.profileId)
      .single();

    let userId;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create a placeholder user profile
      // In a real implementation, you'd want to send invitations instead
      const email = `${seProfile.firstName.toLowerCase()}.${seProfile.lastName.toLowerCase()}@migrated.scout.app`;
      
      const { data: newUser, error: userError } = await supabase
        .from('profiles')
        .insert([{
          first_name: seProfile.firstName,
          last_name: seProfile.lastName,
          email: email,
          sportsengine_profile_id: seProfile.profileId,
          is_migrated: true,
          migrated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (userError) {
        throw new Error(`Failed to create user profile: ${userError.message}`);
      }

      userId = newUser.id;
    }

    // Add user to group
    const { data: membership, error: memberError } = await supabase
      .from('group_members')
      .insert([{
        group_id: groupId,
        user_id: userId,
        role: role,
        status: 'approved',
        jersey_number: metadata.jerseyNumber,
        position: metadata.title,
        sportsengine_roster_status: seProfile.rosterStatus
      }])
      .select()
      .single();

    if (memberError) {
      throw new Error(`Failed to add member to group: ${memberError.message}`);
    }

    return membership;
  }

  /**
   * Map SportsEngine staff titles to Scout roles
   */
  mapStaffRoleToScoutRole(title) {
    if (!title) return 'member';
    
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('head coach') || titleLower.includes('coach')) {
      return 'coach';
    } else if (titleLower.includes('assistant')) {
      return 'assistant_coach';
    } else if (titleLower.includes('manager')) {
      return 'manager';
    } else if (titleLower.includes('admin')) {
      return 'admin';
    }
    
    return 'staff';
  }

  /**
   * Create a migration record for tracking
   */
  async createMigrationRecord(userId, migratedData) {
    const migrationRecord = {
      user_id: userId,
      source: 'sportsengine',
      status: this.migrationProgress.status,
      organizations_count: this.migrationProgress.organizations,
      teams_count: this.migrationProgress.teams,
      members_count: migratedData.members.length,
      errors_count: this.migrationProgress.errors.length,
      migration_data: {
        groups: migratedData.groups.map(g => ({ id: g.id, name: g.name, type: g.group_type })),
        errors: this.migrationProgress.errors
      },
      completed_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('migrations')
      .insert([migrationRecord]);

    if (error) {
      console.error('Failed to create migration record:', error);
    }
  }

  /**
   * Get migration history for a user
   */
  async getMigrationHistory(userId) {
    const { data, error } = await supabase
      .from('migrations')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get migration history: ${error.message}`);
    }

    return data;
  }

  /**
   * Preview what would be migrated without actually migrating
   */
  async previewMigration() {
    try {
      // The scraping service already provides a complete migration preview
      return await SportsEngineScrapingService.getMigrationPreview();
    } catch (error) {
      console.error('Error generating migration preview:', error);
      throw error;
    }
  }
}

export default new MigrationService();
