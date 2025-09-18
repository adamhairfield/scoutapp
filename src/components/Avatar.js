import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Avatar = ({ 
  imageUrl, 
  name, 
  size = 40, 
  style,
  showBorder = false,
  borderColor = '#fff',
  borderWidth = 2
}) => {
  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    const names = fullName.split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: showBorder ? borderWidth : 0,
      borderColor: showBorder ? borderColor : 'transparent',
    },
    style
  ];

  if (imageUrl) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            {
              width: size - (showBorder ? borderWidth * 2 : 0),
              height: size - (showBorder ? borderWidth * 2 : 0),
              borderRadius: (size - (showBorder ? borderWidth * 2 : 0)) / 2,
            }
          ]}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={[containerStyle, styles.placeholder]}>
      {name ? (
        <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
          {getInitials(name)}
        </Text>
      ) : (
        <Ionicons name="person" size={size * 0.5} color="#667eea" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    backgroundColor: '#f0f0f0',
  },
  initials: {
    color: '#667eea',
    fontWeight: 'bold',
  },
});

export default Avatar;
