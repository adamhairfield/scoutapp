import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AppHeader = ({ 
  navigation, 
  title = "Scout.", 
  rightIcon = "menu",
  onRightPress,
  backgroundColor = "transparent",
  textColor = "#fff"
}) => {

  const handleRightPress = () => {
    if (onRightPress) {
      onRightPress();
    } else {
      navigation.navigate('Settings');
    }
  };

  return (
    <View style={[styles.header, { backgroundColor }]}>
      <Text style={[styles.headerTitle, { color: textColor }]}>{title}</Text>
      
      <TouchableOpacity
        style={styles.headerIcon}
        onPress={handleRightPress}
      >
        <Ionicons name={rightIcon} size={24} color={textColor} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    fontStyle: 'italic',
    textAlign: 'left',
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppHeader;
