import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import LoginScreen from '../screens/LoginScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupsScreen from '../screens/GroupsScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';
import GroupRequestsScreen from '../screens/GroupRequestsScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';
import InviteScreen from '../screens/InviteScreen';
import JoinByInviteScreen from '../screens/JoinByInviteScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NewMessageScreen from '../screens/NewMessageScreen';
import ManageRelationshipsScreen from '../screens/ManageRelationshipsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import UserSearchScreen from '../screens/UserSearchScreen';
import FriendRequestsScreen from '../screens/FriendRequestsScreen';
import SearchScreen from '../screens/SearchScreen';
import NotificationTestScreen from '../screens/NotificationTestScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SportsEngineMigrationScreen from '../screens/SportsEngineMigrationScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme } = useTheme();

  // Add null check for user
  if (!user) {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Groups') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarBadge: route.name === 'Notifications' && unreadCount > 0 ? unreadCount : undefined,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: 25,
          paddingTop: 8,
          height: 85,
        },
      })}
    >
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // You could add a loading screen here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="JoinGroup" component={JoinGroupScreen} />
            <Stack.Screen name="GroupRequests" component={GroupRequestsScreen} />
            <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
            <Stack.Screen name="Invite" component={InviteScreen} />
            <Stack.Screen name="JoinByInvite" component={JoinByInviteScreen} />
            <Stack.Screen name="Messages" component={MessagesScreen} />
            <Stack.Screen name="NewMessage" component={NewMessageScreen} />
            <Stack.Screen name="ManageRelationships" component={ManageRelationshipsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="UserSearch" component={UserSearchScreen} />
            <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="NotificationTest" component={NotificationTestScreen} />
            <Stack.Screen name="SportsEngineMigration" component={SportsEngineMigrationScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
