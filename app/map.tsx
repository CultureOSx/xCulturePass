import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { CultureTokens } from '@/constants/theme';
import { api } from '@/lib/api';
import { useState, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import NativeMapView from '@/components/NativeMapView';
import type { EventData } from '@/shared/schema';
import { getPostcodesByPlace } from '@shared/location/australian-postcodes';
import { useColors } from '@/hooks/useColors';

const CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  'Sydney': { latitude: -33.8688, longitude: 151.2093 },
  'Melbourne': { latitude: -37.8136, longitude: 144.9631 },
  'Brisbane': { latitude: -27.4698, longitude: 153.0251 },
  'Perth': { latitude: -31.9505, longitude: 115.8605 },
  'Darwin': { latitude: -12.4634, longitude: 130.8456 },
  'Adelaide': { latitude: -34.9285, longitude: 138.6007 },
  'Auckland': { latitude: -36.8485, longitude: 174.7633 },
  'Wellington': { latitude: -41.2865, longitude: 174.7762 },
  'Dubai': { latitude: 25.2048, longitude: 55.2708 },
  'Abu Dhabi': { latitude: 24.4539, longitude: 54.3773 },
  'London': { latitude: 51.5074, longitude: -0.1278 },
  'Manchester': { latitude: 53.4808, longitude: -2.2426 },
  'Toronto': { latitude: 43.6532, longitude: -79.3832 },
  'Vancouver': { latitude: 49.2827, longitude: -123.1207 },
  'Montreal': { latitude: 45.5017, longitude: -73.5673 },
};

function resolveCityCoords(city?: string): { latitude: number; longitude: number } | null {
  if (!city) return null;
  if (CITY_COORDS[city]) return CITY_COORDS[city];

  const postcodeMatch = getPostcodesByPlace(city)[0];
  if (postcodeMatch) {
    return { latitude: postcodeMatch.latitude, longitude: postcodeMatch.longitude };
  }

  return null;
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const monthIndex = parseInt(parts[1], 10) - 1;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[monthIndex] || ''} ${day}`;
}

type CityGroup = {
  coords: { latitude: number; longitude: number };
  events: EventData[];
  count: number;
};

type CityGroupMap = Record<string, CityGroup>;

function WebCityList({ cityGroups, selectedCity, onSelectCity, onEventPress, colors, webStyles, styles }: {
  cityGroups: CityGroupMap;
  selectedCity: string | null;
  onSelectCity: (city: string | null) => void;
  onEventPress: (id: string) => void;
  colors: ReturnType<typeof useColors>;
  webStyles: any;
  styles: any;
}) {
  const selectedEvents = selectedCity ? (cityGroups[selectedCity]?.events || []) : [];
  const totalEvents = Object.values(cityGroups).reduce((sum, group) => sum + group.count, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: selectedCity ? 240 : 40 }} showsVerticalScrollIndicator={false}>
        <View style={webStyles.mapInfo}>
          <View style={webStyles.mapIconWrap}>
            <Ionicons name="map" size={32} color={CultureTokens.indigo} />
          </View>
          <Text style={webStyles.mapInfoTitle}>Events by City</Text>
          <Text style={webStyles.mapInfoSub}>
            {Object.keys(cityGroups).length} cities · {totalEvents} cultural events
          </Text>
        </View>
        
        {Object.entries(cityGroups).map(([city, group]) => (
          <Pressable
            key={city}
            style={[webStyles.cityRow, selectedCity === city && webStyles.cityRowActive, Platform.OS === 'web' && { cursor: 'pointer' as any }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectCity(selectedCity === city ? null : city);
            }}
          >
            <View style={webStyles.cityLeft}>
              <View style={[webStyles.cityDot, selectedCity === city && webStyles.cityDotActive]}>
                <Ionicons name="location" size={20} color={selectedCity === city ? colors.background : CultureTokens.indigo} />
              </View>
              <View>
                <Text style={webStyles.cityName}>{city}</Text>
                <Text style={webStyles.cityCount}>{group.count} event{group.count !== 1 ? 's' : ''}</Text>
              </View>
            </View>
            <Ionicons name={selectedCity === city ? 'chevron-up' : 'chevron-down'} size={20} color={selectedCity === city ? CultureTokens.indigo : colors.textSecondary} />
          </Pressable>
        ))}
      </ScrollView>

      {selectedCity && selectedEvents.length > 0 && (
        <View style={webStyles.bottomPanel}>
          <View style={webStyles.panelHeader}>
            <View>
              <Text style={webStyles.panelCity}>{selectedCity}</Text>
              <Text style={webStyles.panelCount}>{selectedEvents.length} events</Text>
            </View>
            <Pressable onPress={() => onSelectCity(null)} hitSlop={10} style={Platform.OS === 'web' ? { cursor: 'pointer' as any } : undefined}>
              <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
            {selectedEvents.map((event) => (
              <Pressable
                key={event.id}
                style={[styles.eventCard, Platform.OS === 'web' && { cursor: 'pointer' as any }]}
                onPress={() => onEventPress(event.id)}
              >
                {event.imageUrl ? (
                  <Image source={{ uri: event.imageUrl }} style={styles.eventImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.eventImage, { backgroundColor: CultureTokens.indigo + '15', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="calendar-outline" size={32} color={CultureTokens.indigo} />
                  </View>
                )}
                <View style={styles.eventInfo}>
                  <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                  {event.venue && (
                    <View style={styles.eventMeta}>
                      <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                      <Text style={styles.eventVenue} numberOfLines={1}>{event.venue}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = getStyles(colors);
  const webStyles = getWebStyles(colors);
  
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery<EventData[]>({
    queryKey: ['events', 'list', 'map'],
    queryFn: async () => {
      const data = await api.events.list({ pageSize: 300 });
      return Array.isArray(data.events) ? data.events : [];
    },
  });

  const cityGroups = useMemo(() => {
    const groups: CityGroupMap = {};
    events.forEach(event => {
      const city = event.city;
      const coords = resolveCityCoords(city);
      if (!city || !coords) return;
      if (!groups[city]) {
        groups[city] = { coords, events: [], count: 0 };
      }
      groups[city].events.push(event);
      groups[city].count++;
    });
    return groups;
  }, [events]);

  const selectedEvents = selectedCity ? (cityGroups[selectedCity]?.events || []) : [];

  const handleMarkerPress = (city: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCity(city);
  };

  const handleEventPress = (eventId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/event/[id]', params: { id: eventId } });
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Events Map</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={CultureTokens.indigo} />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : Platform.OS === 'web' ? (
        <WebCityList
          cityGroups={cityGroups}
          selectedCity={selectedCity}
          onSelectCity={setSelectedCity}
          onEventPress={handleEventPress}
          colors={colors}
          webStyles={webStyles}
          styles={styles}
        />
      ) : (
        <NativeMapView
          cityGroups={cityGroups}
          selectedCity={selectedCity}
          selectedEvents={selectedEvents}
          onMarkerPress={handleMarkerPress}
          onClearCity={() => setSelectedCity(null)}
          onEventPress={handleEventPress}
          bottomInset={bottomInset}
        />
      )}
    </View>
  );
}

const getWebStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  mapInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  mapIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: CultureTokens.indigo + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mapInfoTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    letterSpacing: -0.3,
  },
  mapInfoSub: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cityRowActive: {
    borderColor: CultureTokens.indigo + '50',
    backgroundColor: CultureTokens.indigo + '15',
  },
  cityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cityDot: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: CultureTokens.indigo + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityDotActive: {
    backgroundColor: CultureTokens.indigo,
  },
  cityName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    marginBottom: 2,
  },
  cityCount: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: colors.borderLight,
    borderRightColor: colors.borderLight,
    paddingTop: 20,
    paddingBottom: 40,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  panelCity: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
    marginBottom: 2,
  },
  panelCount: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
});

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
  },
  eventCard: {
    width: 240,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 120,
  },
  eventInfo: {
    padding: 16,
  },
  eventDate: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: CultureTokens.saffron,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventVenue: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    flex: 1,
  },
});
