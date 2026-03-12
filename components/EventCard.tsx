import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { CultureTokens } from '@/constants/theme';
import { router } from 'expo-router';
import { useSaved } from '@/contexts/SavedContext';
import * as Haptics from 'expo-haptics';
import type { EventData } from '@/shared/schema';

interface EventCardProps {
  event: EventData;
}

function EventCardInner({ event }: EventCardProps) {
  const { isEventSaved, toggleSaveEvent } = useSaved();
  const isSaved = isEventSaved(event.id);
  const [hovered, setHovered] = useState(false);

  const handleCardPress = useCallback(() => {
    router.push({ pathname: '/event/[id]', params: { id: event.id } });
  }, [event.id]);

  const handleSavePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSaveEvent(event.id);
  }, [event.id, toggleSaveEvent]);

  const priceDisplay = event.priceLabel ?? (
    event.priceCents === 0 ? 'Free' :
    event.priceCents != null ? `$${(event.priceCents / 100).toFixed(2)}` :
    null
  );
  const ageBadge = event.ageSuitability && event.ageSuitability !== 'all'
    ? event.ageSuitability
    : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        Platform.OS === 'web' && hovered && styles.cardHovered,
      ]}
      onPress={handleCardPress}
      onHoverIn={Platform.OS === 'web' ? () => setHovered(true) : undefined}
      onHoverOut={Platform.OS === 'web' ? () => setHovered(false) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Event: ${event.title}, on ${event.date}`}
      accessibilityHint={`Double tap to view details for ${event.title}`}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: event.imageUrl ?? undefined }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        {ageBadge && (
          <View style={styles.ageBadge}>
            <Text style={styles.ageBadgeText}>{ageBadge}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.date}>{event.date}</Text>
        
        {event.venue ? (
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={styles.metaText} numberOfLines={1}>{event.venue}</Text>
          </View>
        ) : null}
        
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {event.category ? (
              <View style={[styles.categoryPill, { backgroundColor: CultureTokens.saffron + '15', borderColor: CultureTokens.saffron + '30' }]}>
                <Text style={[styles.categoryText, { color: CultureTokens.saffron }]}>{event.category}</Text>
              </View>
            ) : null}
            {priceDisplay ? (
              <Text style={styles.price}>{priceDisplay}</Text>
            ) : null}
          </View>
          
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && { opacity: 0.7 }
            ]}
            onPress={handleSavePress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? "Remove from saved events" : "Save event"}
          >
            <View style={[styles.saveIconBg, isSaved && { backgroundColor: CultureTokens.indigo + '20' }]}>
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={isSaved ? CultureTokens.indigo : 'rgba(255,255,255,0.6)'}
              />
            </View>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// Memoize to avoid re-renders when parent re-renders with unchanged event data
const EventCard = React.memo(EventCardInner);
export default EventCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardHovered: {
    transform: [{ scale: 1.01 }],
    borderColor: 'rgba(255,255,255,0.2)',
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.2)',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  ageBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(11,11,20,0.8)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ageBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  info: {
    padding: 14,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 22,
  },
  date: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: CultureTokens.indigo,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  metaText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  price: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  saveButton: {
    padding: 2,
  },
  saveIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
