import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CardTokens } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

interface CommunityCardProps {
  community: {
    id: string;
    name: string;
    description?: string;
    memberCount?: number;
    iconEmoji?: string;
    color?: string;
    slug?: string;
  };
  index?: number;
}

function CommunityCard({ community, index = 0 }: CommunityCardProps) {
  const colors = useColors();
  const accent = community.color || colors.primary;
  const members = community.memberCount || 0;

  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
          pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
          Platform.OS === 'web' && { cursor: 'pointer' as any },
          Colors.shadows.small,
        ]}
        onPress={() =>
          router.push({
            pathname: '/community/[id]',
            params: { id: community.slug || community.id },
          })
        }
      >
        <View style={[styles.iconWrap, { backgroundColor: accent + '15' }]}>
          {community.iconEmoji ? (
            <Text style={{ fontSize: 24 }}>{community.iconEmoji}</Text>
          ) : (
            <Ionicons name="people" size={24} color={accent} />
          )}
        </View>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {community.name}
        </Text>
        <Text style={[styles.members, { color: colors.textSecondary }]}>{members.toLocaleString()} members</Text>
        {community.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {community.description}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 196,
    borderRadius: CardTokens.radius,
    padding: CardTokens.padding,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 4,
  },
  members: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 10,
  },
  description: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
  },
});

// ⚡ Bolt Optimization: Added React.memo() to prevent unnecessary re-renders in lists
export default React.memo(CommunityCard);
