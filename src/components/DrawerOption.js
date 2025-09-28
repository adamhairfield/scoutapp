import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const DrawerOption = ({ 
  icon, 
  iconColor, 
  title, 
  titleColor,
  onPress,
  disabled = false,
  destructive = false,
  style = {},
  theme: propTheme
}) => {
  const contextTheme = useTheme();
  const theme = propTheme || contextTheme.theme;
  const getColors = () => {
    if (disabled) {
      return {
        iconColor: theme.colors.textTertiary,
        titleColor: theme.colors.textTertiary,
      };
    }
    
    if (destructive) {
      return {
        iconColor: iconColor || '#FF3B30',
        titleColor: titleColor || '#FF3B30',
      };
    }

    return { 
      iconColor: iconColor || theme.colors.text, 
      titleColor: titleColor || theme.colors.text 
    };
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
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
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
