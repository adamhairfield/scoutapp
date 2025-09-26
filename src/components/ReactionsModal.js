import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const REACTIONS = [
  { emoji: '❤️', name: 'love', color: '#FF3B30' },
  { emoji: '👍', name: 'like', color: '#007AFF' },
  { emoji: '😂', name: 'laugh', color: '#FF9500' },
  { emoji: '😮', name: 'wow', color: '#5856D6' },
  { emoji: '😢', name: 'sad', color: '#34C759' },
  { emoji: '😡', name: 'angry', color: '#FF2D92' },
];

const ReactionsModal = ({ visible, onClose, onReaction, position }) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleReaction = (reaction) => {
    onReaction(reaction);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.reactionsContainer,
            {
              transform: [{ scale: scaleAnim }],
              top: position?.y - 80 || 100,
              left: Math.max(10, Math.min(position?.x - 150 || 50, width - 310)),
            }
          ]}
        >
          <View style={styles.reactions}>
            {REACTIONS.map((reaction) => (
              <TouchableOpacity
                key={reaction.name}
                style={styles.reactionButton}
                onPress={() => handleReaction(reaction)}
                activeOpacity={0.7}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.arrow} />
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  reactionsContainer: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scale: 1 }],
  },
  reactionEmoji: {
    fontSize: 24,
  },
  arrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
});

export default ReactionsModal;
