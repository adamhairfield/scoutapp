import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { feedService, groupService } from '../services/database';
import CommentsModal from '../components/CommentsModal';
import GroupOptionsModal from '../components/GroupOptionsModal';
import PostOptionsModal from '../components/PostOptionsModal';
import PhotoViewer from '../components/PhotoViewer';
import VideoViewer from '../components/VideoViewer';
import Avatar from '../components/Avatar';
import ReactionsModal from '../components/ReactionsModal';
import FeedTab from '../components/FeedTab';
import PhotosTab from '../components/PhotosTab';
import MembersTab from '../components/MembersTab';
import ConfettiAnimation from '../components/ConfettiAnimation';
import { useGroupData } from '../hooks/useGroupData';
import { styles } from './GroupDetailsScreen.styles';

const GroupDetailsScreen = ({ navigation, route }) => {
  const { group } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  
  console.log('GroupDetailsScreen - Group data:', group);
  console.log('GroupDetailsScreen - Cover photo URL:', group.cover_photo_url);
  
  const [activeTab, setActiveTab] = useState('Feed');
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [postOptionsModalVisible, setPostOptionsModalVisible] = useState(false);
  const [selectedPostForOptions, setSelectedPostForOptions] = useState(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [videoViewerVisible, setVideoViewerVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [reactionsModalVisible, setReactionsModalVisible] = useState(false);
  const [selectedPostForReaction, setSelectedPostForReaction] = useState(null);
  const [reactionPosition, setReactionPosition] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [confettiVisible, setConfettiVisible] = useState(false);

  // Use the custom hook for group data management
  const {
    posts,
    members,
    memberCount,
    refreshing,
    onRefresh,
    handleCreatePost,
    handleLikePost,
    handleDeletePost,
    loadGroupPosts
  } = useGroupData(group, user);

  // Handle status bar when screen is focused/unfocused
  useFocusEffect(
    useCallback(() => {
      // Set white status bar when screen is focused
      StatusBar.setBarStyle('light-content');
      
      return () => {
        // Reset to dark status bar when screen is unfocused
        StatusBar.setBarStyle('dark-content');
      };
    }, [])
  );

  const handleOpenPhotoViewer = (photos, initialIndex = 0) => {
    setSelectedPhotos(photos);
    setSelectedPhotoIndex(initialIndex);
    setPhotoViewerVisible(true);
  };

  const handleClosePhotoViewer = () => {
    setPhotoViewerVisible(false);
    setSelectedPhotos([]);
    setSelectedPhotoIndex(0);
  };

  const handleOpenVideoViewer = (video) => {
    setSelectedVideo(video);
    setVideoViewerVisible(true);
  };

  const handleCloseVideoViewer = () => {
    setVideoViewerVisible(false);
    setSelectedVideo(null);
  };

  const handleLongPressHeart = (post, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedPostForReaction(post);
    setReactionPosition({ x: pageX, y: pageY });
    setReactionsModalVisible(true);
  };

  const handleCloseReactions = () => {
    setReactionsModalVisible(false);
    setSelectedPostForReaction(null);
  };

  const handleReaction = async (reactionType) => {
    if (!selectedPostForReaction) return;
    
    try {
      await feedService.addReaction(selectedPostForReaction.id, user.id, reactionType);
      
      // Close the modal first
      handleCloseReactions();
      
      // Trigger confetti if celebrate reaction is used
      if (reactionType === 'celebrate') {
        setConfettiVisible(true);
      }
      
      // Reload posts to get accurate counts
      loadGroupPosts();
    } catch (error) {
      console.error('Error reacting to post:', error);
      Alert.alert('Error', 'Failed to react to post');
    }
  };

  const handleOpenComments = (post) => {
    setSelectedPost(post);
    setCommentsModalVisible(true);
  };

  const handleCloseComments = () => {
    setCommentsModalVisible(false);
    setSelectedPost(null);
  };

  const handleOpenPostOptions = (post) => {
    setSelectedPostForOptions(post);
    setPostOptionsModalVisible(true);
  };

  const handleClosePostOptions = () => {
    setPostOptionsModalVisible(false);
    setSelectedPostForOptions(null);
  };

  const handleEditPost = (postId) => {
    // TODO: Implement edit functionality
    console.log('Edit post:', postId);
    handleClosePostOptions();
  };

  const handleReportPost = (postId) => {
    // TODO: Implement report functionality
    console.log('Report post:', postId);
    handleClosePostOptions();
  };

  const handlePinPost = (postId) => {
    // TODO: Implement pin functionality
    console.log('Pin post:', postId);
    handleClosePostOptions();
  };

  const renderMemberAvatars = () => {
    const maxAvatars = 3;
    
    console.log('🔍 renderMemberAvatars - Debug info:');
    console.log('- Group leader_name:', group.leader_name);
    console.log('- Group leader_profile_picture_url:', group.leader_profile_picture_url);
    console.log('- Group leader_id:', group.leader_id);
    console.log('- Group leader_profile:', group.leader_profile);
    console.log('- Members array:', members);
    console.log('- Member count:', memberCount);
    console.log('- Current user:', user.name, 'ID:', user.id);
    
    // Create array with all group members including leader
    const allMembers = [];
    
    // Simple approach: Add all unique members we can find
    const addedIds = new Set();
    
    // Add current user first
    allMembers.push({
      name: user.name,
      profile_picture_url: user.profile_picture_url,
      isHost: group.leader_id === user.id
    });
    addedIds.add(user.id);
    
    // Add all members from the members array (excluding current user)
    members.forEach(member => {
      const memberId = member.profiles?.id || member.player_id;
      const memberName = member.profiles?.name || member.name;
      const memberProfileUrl = member.profiles?.profile_picture_url || member.profile_picture_url;
      
      if (memberId && !addedIds.has(memberId)) {
        allMembers.push({
          name: memberName,
          profile_picture_url: memberProfileUrl,
          isHost: group.leader_id === memberId
        });
        addedIds.add(memberId);
      }
    });
    
    // If we still don't have enough members and we know there should be more,
    // try to add the leader if we have leader info
    if (allMembers.length < memberCount && group.leader_id && !addedIds.has(group.leader_id)) {
      const leaderName = group.leader_name || group.leader_profile?.name;
      const leaderProfileUrl = group.leader_profile_picture_url || group.leader_profile?.profile_picture_url;
      
      if (leaderName) {
        allMembers.push({
          name: leaderName,
          profile_picture_url: leaderProfileUrl, // Can be null, Avatar component will handle fallback
          isHost: true
        });
      }
    }
    
    const displayMembers = allMembers.slice(0, maxAvatars);
    
    console.log('- Final displayMembers:', displayMembers);
    
    return displayMembers.map((member, index) => (
      <Avatar
        key={`${member.name}-${index}`}
        imageUrl={member.profile_picture_url}
        name={member.name}
        size={32}
        showBorder={true}
        borderColor="#fff"
        borderWidth={2}
        style={[
          styles.memberAvatar,
          { 
            zIndex: maxAvatars - index,
            marginLeft: index === 0 ? 0 : -12
          }
        ]}
      />
    ));
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  const filteredPosts = searchQuery.trim() 
    ? posts.filter(post => 
        post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  const handleInvite = async () => {
    try {
      // Create an invite link
      const result = await groupService.createInviteLink(group.id, user.id);
      
      if (result.success) {
        const inviteToken = result.data.invite_token;
        // Create a web-based invite URL that works for everyone
        const inviteUrl = `https://adamhairfield.github.io/scout-invite/?token=${inviteToken}&group=${encodeURIComponent(group.name)}`;
        const shareText = `Join "${group.name}" on Scout App!\n\nTap this link to join: ${inviteUrl}\n\nThis link will help you download the app if you don't have it yet!`;
        
        // Copy to clipboard
        await Clipboard.setStringAsync(shareText);
        
        Alert.alert(
          'Invite Link Created!',
          'The invite message has been copied to your clipboard. Share it with people you want to invite to this group.',
          [
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to create invite link');
      }
    } catch (error) {
      console.error('Error creating invite link:', error);
      Alert.alert('Error', 'Failed to create invite link');
    }
  };

  const tabs = ['Feed', 'Photos', 'About', 'Members'];

  const renderTabBar = () => (
    <View style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[
            styles.tabText, 
            { color: theme.colors.textSecondary },
            activeTab === tab && [styles.activeTabText, { color: theme.colors.primary }]
          ]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Feed':
        return (
          <FeedTab
            posts={filteredPosts}
            user={user}
            group={group}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onCreatePost={handleCreatePost}
            onLikePost={handleLikePost}
            onOpenComments={handleOpenComments}
            onOpenPostOptions={handleOpenPostOptions}
            onOpenPhotoViewer={handleOpenPhotoViewer}
            onLongPressHeart={handleLongPressHeart}
            styles={styles}
            theme={theme}
          />
        );
      case 'Photos':
        return (
          <PhotosTab
            posts={posts}
            onOpenPhotoViewer={handleOpenPhotoViewer}
            onOpenVideoViewer={handleOpenVideoViewer}
            styles={styles}
            theme={theme}
          />
        );
      case 'Members':
        return (
          <MembersTab
            group={group}
            members={members}
            styles={styles}
            theme={theme}
          />
        );
      default:
        return (
          <View style={styles.comingSoon}>
            <Ionicons name="construct" size={60} color={theme.colors.textTertiary} />
            <Text style={[styles.comingSoonText, { color: theme.colors.textTertiary }]}>{activeTab} Coming Soon</Text>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with cover photo or gradient background */}
      <View style={styles.headerContainer}>
        {group.cover_photo_url ? (
          <>
            <Image 
              source={{ uri: group.cover_photo_url }} 
              style={styles.headerImage}
              resizeMode="cover"
              onError={(error) => {
                console.log('Cover photo failed to load:', error);
              }}
            />
            <View style={styles.headerOverlay} />
          </>
        ) : (
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.headerGradient}
          />
        )}
        
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={16} color="rgba(255, 255, 255, 0.7)" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search posts..."
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={searchQuery}
                onChangeText={handleSearchChange}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.searchCloseButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Ionicons name="close" size={16} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => setOptionsModalVisible(true)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.groupInfo}>
            <View style={styles.groupStats}>
              <View style={styles.memberAvatars}>
                {/* Show actual member avatars */}
                {renderMemberAvatars()}
              </View>
              <View style={styles.statsText}>
                <Text style={styles.memberCount}>
                  {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
                </Text>
                <Text style={styles.groupType}>{group.sport || 'Sports Group'}</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
              <Text style={styles.inviteButtonText}>+ Invite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Tab Content */}
      {renderTabContent()}

      {/* Modals */}
      <CommentsModal
        visible={commentsModalVisible}
        onClose={handleCloseComments}
        post={selectedPost}
        user={user}
      />

      <GroupOptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        group={group}
        user={user}
        navigation={navigation}
      />

      <PostOptionsModal
        visible={postOptionsModalVisible}
        onClose={handleClosePostOptions}
        post={selectedPostForOptions}
        currentUser={user}
        onDeletePost={handleDeletePost}
        onEditPost={handleEditPost}
        onReportPost={handleReportPost}
        onPinPost={handlePinPost}
        isGroupHost={group?.leader_id === user?.id}
      />

      <PhotoViewer
        visible={photoViewerVisible}
        onClose={handleClosePhotoViewer}
        photos={selectedPhotos}
        initialIndex={selectedPhotoIndex}
      />

      <VideoViewer
        visible={videoViewerVisible}
        onClose={handleCloseVideoViewer}
        videoUrl={selectedVideo?.url}
        postContent={selectedVideo?.postContent}
        author={selectedVideo?.author}
        timestamp={selectedVideo?.timestamp}
      />

      <ReactionsModal
        visible={reactionsModalVisible}
        onClose={handleCloseReactions}
        onReaction={handleReaction}
        position={reactionPosition}
      />

      <ConfettiAnimation
        visible={confettiVisible}
        onComplete={() => setConfettiVisible(false)}
      />
    </View>
  );
};

export default GroupDetailsScreen;
