import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CreatePostInput = memo(({ user, onCreatePost }) => {
  const [postText, setPostText] = useState('');

  const handlePost = () => {
    if (postText.trim()) {
      onCreatePost(postText.trim());
      setPostText('');
    }
  };

  return (
    <View style={styles.createPostContainer}>
      <View style={styles.createPostHeader}>
        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <TextInput
          style={styles.postInput}
          placeholder="Say something..."
          placeholderTextColor="#999"
          value={postText}
          onChangeText={setPostText}
          multiline
          blurOnSubmit={false}
          returnKeyType="default"
          textAlignVertical="top"
          autoCorrect={true}
          spellCheck={true}
        />
      </View>
      
      <View style={styles.createPostActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="camera" size={20} color="#4CAF50" />
          <Text style={styles.actionText}>Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="videocam" size={20} color="#2196F3" />
          <Text style={styles.actionText}>Video</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="link" size={20} color="#FF9800" />
          <Text style={styles.actionText}>Link</Text>
        </TouchableOpacity>
        
        {postText.trim() && (
          <TouchableOpacity 
            style={styles.postButton} 
            onPress={handlePost}
          >
            <Text style={styles.postButtonText}>Post</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  createPostContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createPostHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    minHeight: 40,
    textAlignVertical: 'top',
  },
  createPostActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  postButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default CreatePostInput;
