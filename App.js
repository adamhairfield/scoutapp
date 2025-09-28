import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { testSupabaseConnection } from './src/utils/testConnection';
import NotificationService from './src/services/NotificationService';

export default function App() {
  useEffect(() => {
    // Test Supabase connection on app start
    testSupabaseConnection();
    
    // Initialize notification service
    NotificationService.initialize();
    
    // Cleanup on unmount
    return () => {
      NotificationService.cleanup();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
