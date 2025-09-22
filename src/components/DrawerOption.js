import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DrawerOption = ({ 
  icon, 
  iconColor = '#666', 
  title, 
  titleColor = '#333',
  onPress,
  disabled = false,
  destructive = false,
  style = {}
}) => {
  const getColors = () => {
    if (disabled) {
      return {
        iconColor: '#ccc',
        titleColor: '#ccc',
      };
    }
    
    if (destructive) {
      return {
        iconColor: iconColor === '#666' ? '#FF3B30' : iconColor,
        titleColor: titleColor === '#333' ? '#FF3B30' : titleColor,
      };
    }

    return { iconColor, titleColor };
  };

  const colors = getColors();

  return (
    <TouchableOpacity 
      style={[styles.option, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={22} color={colors.iconColor} />
      <Text style={[styles.title, { color: colors.titleColor }]}>
        {title}
      </Text>
      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 16,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default DrawerOption;
