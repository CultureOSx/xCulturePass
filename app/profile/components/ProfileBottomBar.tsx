import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

interface ProfileBottomBarProps {
  bottomInset: number;
  isLiked: boolean;
  setIsLiked: (val: boolean) => void;
  isFollowing: boolean;
  setIsFollowing: (val: boolean) => void;
  entityColor: string;
}

export function ProfileBottomBar({
  bottomInset,
  isLiked,
  setIsLiked,
  isFollowing,
  setIsFollowing,
  entityColor
}: ProfileBottomBarProps) {
  const colors = useColors();
  return (
    <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12 }]}>
      <Pressable
        style={[styles.likeButton, isLiked && styles.likedButton]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsLiked(!isLiked);
        }}
      >
        <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={22} color={isLiked ? Colors.error : entityColor} />
      </Pressable>
      <Pressable
        style={[
          styles.followButton,
          { backgroundColor: isFollowing ? entityColor + '12' : entityColor },
          isFollowing && { borderWidth: 1, borderColor: entityColor + '30' }
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setIsFollowing(!isFollowing);
        }}
      >
        <Ionicons name={isFollowing ? 'checkmark-circle' : 'add-circle'} size={20} color={isFollowing ? entityColor : colors.textInverse} />
        <Text style={[styles.followText, { color: isFollowing ? entityColor : colors.textInverse }]}>
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  likeButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  likedButton: {
    backgroundColor: Colors.error + '10',
    borderColor: Colors.error + '25',
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  followText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
});
