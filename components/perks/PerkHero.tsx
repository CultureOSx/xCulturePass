import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Perk } from './types';
import { formatValue } from './utils';

interface PerkHeroProps {
  perk: Perk;
  topInset: number;
  typeInfo: { icon: string; color: string; label: string; gradient: string };
  isIndigenous: boolean;
  onShare: () => void;
}

export function PerkHero({ perk, topInset, typeInfo, isIndigenous, onShare }: PerkHeroProps) {
  return (
    <LinearGradient
      colors={isIndigenous ? ['#8B4513', '#A0522D'] : [typeInfo.color, typeInfo.gradient]}
      style={[styles.hero, { paddingTop: topInset + 12 }]}
    >
      <View style={styles.heroNav}>
        <Pressable style={styles.navButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </Pressable>
        <Pressable style={styles.navButton} onPress={onShare}>
          <Ionicons name="share-outline" size={22} color="#FFF" />
        </Pressable>
      </View>

      <View style={styles.heroContent}>
        <View style={styles.heroIconWrap}>
          <Ionicons name={isIndigenous ? 'earth' : typeInfo.icon as any} size={36} color="#FFF" />
        </View>
        <Text style={styles.heroValue}>{formatValue(perk)}</Text>
        <Text style={styles.heroLabel}>{typeInfo.label}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: { alignItems: 'center' },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroValue: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: '#FFF',
    textAlign: 'center',
  },
  heroLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
});
