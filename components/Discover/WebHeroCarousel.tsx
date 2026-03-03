import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Platform, Dimensions } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { EventData } from '@shared/schema';

interface WebHeroCarouselProps {
  events: EventData[];
}

function WebHeroCarousel({ events }: WebHeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenW = Dimensions.get('window').width;
  const isDesktopW = Platform.OS === 'web' && screenW >= 1024;
  const heroHeight = isDesktopW ? 380 : 240;

  const goTo = (index: number) => {
    setCurrent(index);
    if (timerRef.current) clearInterval(timerRef.current);
    if (events.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrent((prev) => (prev + 1) % events.length);
      }, 4500);
    }
  };

  useEffect(() => {
    if (events.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % events.length);
    }, 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [events.length]);

  const colors = useColors();
  if (events.length === 0) {
    return (
      <View style={[styles.webHeroCarousel, { height: heroHeight, backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={[colors.primary, colors.secondary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.webHeroCarouselMeta}>
          <Text style={styles.webHeroCarouselTitle}>Explore Cultural Events</Text>
          <Text style={styles.webHeroCarouselSub}>Discover events near you</Text>
        </View>
      </View>
    );
  }

  const event = events[current];
  return (
    <View style={[styles.webHeroCarousel, { height: heroHeight, backgroundColor: colors.surface }]}>
      <Image source={{ uri: event.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.webHeroCatBadge}>
        <Text style={[styles.webHeroCatBadgeText, { color: colors.text }]}>{event.communityTag || event.category || 'Featured'}</Text>
      </View>
      {isDesktopW && events.length > 1 && (
        <View style={[StyleSheet.absoluteFillObject, styles.webHeroArrowContainer]}>
          <Pressable style={styles.webHeroArrow} onPress={() => goTo((current - 1 + events.length) % events.length)}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Pressable style={styles.webHeroArrow} onPress={() => goTo((current + 1) % events.length)}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        </View>
      )}
      <View style={styles.webHeroCarouselMeta}>
        <Text style={[styles.webHeroCarouselTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.webHeroCarouselSub, { color: colors.textSecondary }]} numberOfLines={1}>{event.venue || event.city} · {event.date}</Text>
        <Pressable
          style={[styles.webHeroCarouselCta, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
        >
          <Text style={[styles.webHeroCarouselCtaText, { color: colors.text }]}>Get Tickets →</Text>
        </Pressable>
      </View>
      {events.length > 1 && (
        <View style={styles.webHeroDots}>
          {events.map((_, i) => (
            <Pressable key={i} onPress={() => goTo(i)} style={[styles.webHeroDot, { backgroundColor: colors.textSecondary + '58' }, i === current && { backgroundColor: colors.text }]} />
          ))}
        </View>
      )}
    </View>
  );
}

// ⚡ Bolt Optimization: Added React.memo() to prevent unnecessary re-renders of the hero carousel
// Impact: Eliminates ~O(n) re-renders when the parent view (e.g. Discover screen) state changes
// but the underlying memoized events array remains identical. Measurement: React Profiler.
export default React.memo(WebHeroCarousel);

const styles = StyleSheet.create({
  webHeroCarousel: {
    borderRadius: 20,
    overflow: 'hidden',
    // backgroundColor set inline
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  webHeroCatBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',  // kept dark overlay
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  webHeroCatBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  webHeroArrowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  webHeroArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  webHeroCarouselMeta: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 48,
  },
  webHeroCarouselTitle: {
    fontSize: 32,
    lineHeight: 40,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  webHeroCarouselSub: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 16,
  },
  webHeroCarouselCta: {
    alignSelf: 'flex-start',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  webHeroCarouselCtaText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  webHeroDots: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  webHeroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  webHeroDotActive: {
    width: 20,
    // active background provided inline
  },
});
