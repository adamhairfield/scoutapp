import React from 'react';
import { View, StyleSheet } from 'react-native';
import NotificationTester from '../components/NotificationTester';

const NotificationTestScreen = () => {
  return (
    <View style={styles.container}>
      <NotificationTester />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default NotificationTestScreen;
