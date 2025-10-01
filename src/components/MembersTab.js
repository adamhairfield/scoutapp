import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';

const MembersTab = ({ group, members, styles, theme, isTeam = false, tabName = 'Members' }) => {
  const renderMemberItem = ({ item: member }) => (
    <View style={styles.memberItem}>
      <Avatar
        imageUrl={member.profile_picture_url}
        name={member.name}
        size={50}
        style={styles.memberAvatar}
      />
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{member.name}</Text>
          {member.isHost && (
            <View style={styles.hostBadge}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.hostText}>{isTeam ? 'Coach' : 'Host'}</Text>
            </View>
          )}
        </View>
        <Text style={styles.memberRole}>
          {member.isHost ? (isTeam ? 'Coach' : 'Host') : (isTeam ? (member.position || 'Player') : 'Member')}
        </Text>
      </View>
      {member.isHost && (
        <Ionicons name="star" size={20} color="#FFD700" style={styles.hostIcon} />
      )}
    </View>
  );

  const membersData = [
    // Group host (creator) first
    {
      id: 'host',
      name: group.profiles?.name || group.leader_name,
      profile_picture_url: group.profiles?.profile_picture_url || group.leader_profile_picture_url,
      role: 'Host',
      isHost: true
    },
    // Then regular members
    ...members.map(member => ({
      ...member,
      name: member.profiles?.name || member.name,
      profile_picture_url: member.profiles?.profile_picture_url || member.profile_picture_url,
      role: 'Member',
      isHost: false
    }))
  ];

  return (
    <FlatList
      data={membersData}
      renderItem={renderMemberItem}
      keyExtractor={(item) => item.id || item.user_id}
      contentContainerStyle={styles.membersContainer}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={() => (
        <View style={styles.emptyMembers}>
          <Ionicons name="people-outline" size={60} color="#ccc" />
          <Text style={styles.emptyMembersText}>
            {isTeam ? 'No players yet' : 'No members yet'}
          </Text>
          <Text style={styles.emptyMembersSubtext}>
            {isTeam ? 'Invite players to join this team' : 'Invite friends to join this group'}
          </Text>
        </View>
      )}
    />
  );
};

export default MembersTab;
