import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { parentPlayerService, profileService } from '../services/database';

const ManageRelationshipsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    loadRelationships();
  }, []);

  const loadRelationships = async () => {
    try {
      setLoading(true);
      let data = [];
      
      if (user.role === 'parent') {
        // Get children for parent
        data = await parentPlayerService.getParentChildren(user.id);
      } else if (user.role === 'player') {
        // Get parents for player
        data = await parentPlayerService.getPlayerParents(user.id);
      }
      
      setRelationships(data);
    } catch (error) {
      console.error('Error loading relationships:', error);
      Alert.alert('Error', 'Failed to load relationships');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      const results = await profileService.searchUsersByEmail(searchEmail.trim());
      
      // Filter results based on user role
      const filteredResults = results.filter(result => {
        if (user.role === 'parent') {
          return result.role === 'player';
        } else if (user.role === 'player') {
          return result.role === 'parent';
        }
        return false;
      });

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    }
  };

  const createRelationship = async (targetUser) => {
    try {
      let result;
      
      if (user.role === 'parent') {
        result = await parentPlayerService.createRelationship(user.id, targetUser.id);
      } else if (user.role === 'player') {
        result = await parentPlayerService.createRelationship(targetUser.id, user.id);
      }

      if (result.success) {
        Alert.alert('Success', 'Relationship created successfully!');
        setModalVisible(false);
        setSearchEmail('');
        setSearchResults([]);
        loadRelationships();
      } else {
        Alert.alert('Error', result.error || 'Failed to create relationship');
      }
    } catch (error) {
      console.error('Error creating relationship:', error);
      Alert.alert('Error', 'Failed to create relationship');
    }
  };

  const removeRelationship = async (targetUser) => {
    Alert.alert(
      'Remove Relationship',
      `Are you sure you want to remove the relationship with ${targetUser.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              let result;
              
              if (user.role === 'parent') {
                result = await parentPlayerService.removeRelationship(user.id, targetUser.id);
              } else if (user.role === 'player') {
                result = await parentPlayerService.removeRelationship(targetUser.id, user.id);
              }

              if (result.success) {
                Alert.alert('Success', 'Relationship removed successfully!');
                loadRelationships();
              } else {
                Alert.alert('Error', result.error || 'Failed to remove relationship');
              }
            } catch (error) {
              console.error('Error removing relationship:', error);
              Alert.alert('Error', 'Failed to remove relationship');
            }
          }
        }
      ]
    );
  };

  const renderRelationship = ({ item }) => (
    <View style={styles.relationshipCard}>
      <View style={styles.relationshipInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userRole}>
            {user.role === 'parent' ? 'Player' : 'Parent'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeRelationship(item)}
      >
        <Ionicons name="trash-outline" size={20} color="#FF6B35" />
      </TouchableOpacity>
    </View>
  );

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.searchResultCard}
      onPress={() => createRelationship(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userRole}>{item.role}</Text>
      </View>
      <Ionicons name="add-circle" size={24} color="#667eea" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {user.role === 'parent' ? 'My Children' : 'My Parents'}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={relationships}
        renderItem={renderRelationship}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {user.role === 'parent' ? 'No Children Added' : 'No Parents Added'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to add a {user.role === 'parent' ? 'child' : 'parent'}
            </Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add {user.role === 'parent' ? 'Child' : 'Parent'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchSection}>
              <TextInput
                style={styles.searchInput}
                value={searchEmail}
                onChangeText={setSearchEmail}
                placeholder="Enter email address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.searchButton} onPress={searchUsers}>
                <Text style={styles.searchButtonText}>Search</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              style={styles.searchResults}
              ListEmptyComponent={
                searchEmail ? (
                  <Text style={styles.noResults}>No users found</Text>
                ) : null
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 5,
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  relationshipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  relationshipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
  },
  removeButton: {
    padding: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  searchSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  searchResults: {
    maxHeight: 300,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  noResults: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    paddingVertical: 20,
  },
});

export default ManageRelationshipsScreen;
