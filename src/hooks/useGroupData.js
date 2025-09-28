import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { feedService, groupService } from '../services/database';

export const useGroupData = (group, user) => {
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberCount, setMemberCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadGroupPosts = async () => {
    try {
      const groupPosts = await feedService.getGroupPosts(group.id);
      setPosts(groupPosts);
    } catch (error) {
      console.error('Error loading group posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    }
  };

  const loadGroupMembers = async () => {
    try {
      const result = await groupService.getGroupMembers(group.id);
      if (result.success) {
        console.log('Raw members data:', result.data);
        setMembers(result.data || []);
        // Count includes the host + members
        const totalMembers = (result.data || []).length + 1; // +1 for the host
        setMemberCount(totalMembers);
        console.log('Group members loaded:', result.data?.length || 0, 'Total with host:', totalMembers);
      } else {
        console.error('Failed to load group members:', result.error);
        // If we can't load members, show at least 1 (the host)
        setMemberCount(1);
      }
    } catch (error) {
      console.error('Error loading group members:', error);
      // If we can't load members, show at least 1 (the host)
      setMemberCount(1);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGroupPosts();
    loadGroupMembers();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleCreatePost = useCallback(async (postData) => {
    try {
      // Handle both string content (legacy) and object postData (new photo support)
      const finalPostData = typeof postData === 'string' 
        ? {
            group_id: group.id,
            author_id: user.id,
            content: postData,
            post_type: 'text'
          }
        : {
            group_id: group.id,
            author_id: user.id,
            ...postData
          };

      console.log('Creating post with data:', finalPostData);
      
      const result = await feedService.createPost(finalPostData);
      if (result) {
        loadGroupPosts(); // Reload posts to show the new one
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    }
  }, [group.id, user.id]);

  const handleLikePost = async (postId) => {
    try {
      // Find the current post to check if user has already reacted
      const currentPost = posts.find(p => p.id === postId);
      
      if (currentPost?.userReaction) {
        // User has already reacted, remove the reaction
        await feedService.removeReaction(postId, user.id);
      } else {
        // User hasn't reacted, add a love reaction (heart)
        await feedService.addReaction(postId, user.id, 'love');
      }
      
      loadGroupPosts(); // Reload to get updated reaction count
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await feedService.deletePost(postId, user.id);
      loadGroupPosts(); // Reload posts
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post');
    }
  };

  useEffect(() => {
    console.log('Group object:', group);
    console.log('Group cover_photo_url:', group.cover_photo_url);
    console.log('Group leader_name:', group.leader_name);
    console.log('Group leader_profile_picture_url:', group.leader_profile_picture_url);
    console.log('Group leader_id:', group.leader_id);
    loadGroupPosts();
    loadGroupMembers();
  }, [group.id]);

  return {
    posts,
    members,
    memberCount,
    refreshing,
    onRefresh,
    handleCreatePost,
    handleLikePost,
    handleDeletePost,
    loadGroupPosts
  };
};
