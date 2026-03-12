import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Share, ActivityIndicator, Linking } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CultureTokens } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  
  const { data: movie, isLoading } = useQuery({
    queryKey: ['/api/movies', id],
    queryFn: () => api.movies.get(id),
    enabled: !!id,
  });

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const shareUrl = `https://culturepass.app/movies/${id}`;
      await Share.share({
        title: movie?.title ?? '',
        message: movie ? `Check out ${movie.title} on CulturePass! ${movie.genre?.join(', ')} - ${movie.duration}. Rating: ${movie.imdbScore}/10. Book tickets now!\n\n${shareUrl}` : shareUrl,
        url: shareUrl,
      });
    } catch {}
  };

  if (isLoading) return (
    <ErrorBoundary>
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator size="large" color={CultureTokens.gold} />
      </View>
    </ErrorBoundary>
  );
  
  if (!movie) return (
    <ErrorBoundary>
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_500Medium' }}>Movie not found</Text>
      </View>
    </ErrorBoundary>
  );

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: topInset }]}> 
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{movie.title}</Text>
          <Pressable style={styles.headerBtn} hitSlop={10} onPress={handleShare} accessibilityRole="button" accessibilityLabel={`Share ${movie.title}`}>
            <Ionicons name="share-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 120 }}>
          <View style={styles.posterArea}>
            <Image source={{ uri: movie.imageUrl }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            <View style={styles.posterBadge}>
              <Ionicons name="star" size={14} color={CultureTokens.gold} />
              <Text style={styles.posterScore}>{movie.imdbScore}</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.movieTitle}>{movie.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaPill}><Text style={styles.metaPillText}>{movie.language}</Text></View>
              <View style={styles.metaPill}><Text style={styles.metaPillText}>{movie.duration}</Text></View>
              <View style={styles.metaPill}><Text style={styles.metaPillText}>{movie.rating}</Text></View>
            </View>
            <View style={styles.genreRow}>
              {(movie.genre ?? []).map((g: string) => (
                <View key={g} style={[styles.genrePill, { backgroundColor: (movie.posterColor || CultureTokens.gold) + '15' }]}> 
                  <Text style={[styles.genrePillText, { color: movie.posterColor || CultureTokens.gold }]}>{g}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.description}>{movie.description}</Text>
            <View style={styles.crewSection}>
              <Text style={styles.crewLabel}>Director</Text>
              <Text style={styles.crewValue}>{movie.director}</Text>
            </View>
            <View style={styles.crewSection}>
              <Text style={styles.crewLabel}>Cast</Text>
              <Text style={styles.crewValue}>{movie.cast?.join(', ')}</Text>
            </View>
          </View>

          {movie.showtimes && movie.showtimes.length > 0 && (
            <View style={styles.showtimeSection}>
              <Text style={styles.showtimeTitle}>Where to Watch</Text>
              {movie.showtimes.map((st: any, ci: number) => (
                <View key={ci} style={styles.cinemaBlock}>
                  <View style={styles.cinemaHeader}>
                    <View style={styles.cinemaIconBox}>
                      <Ionicons name="location" size={16} color={CultureTokens.gold} />
                    </View>
                    <Text style={styles.cinemaName}>{st.cinema}</Text>
                    <Text style={styles.cinemaPrice}>From ${st.price}</Text>
                  </View>
                  <View style={styles.timesRow}>
                    {st.times.map((time: string) => (
                      <View key={time} style={styles.timeChip}>
                        <Text style={styles.timeText}>{time}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              <View style={styles.externalLinksSection}>
                <Text style={styles.externalLinksTitle}>Buy Tickets Online</Text>
                <Pressable style={[styles.externalBtn, { backgroundColor: '#D90429' }]} onPress={() => Linking.openURL('https://www.hoyts.com.au/movies')} accessibilityRole="button"> 
                  <Ionicons name="open-outline" size={18} color="#FFF" />
                  <Text style={styles.externalBtnText}>Hoyts Cinemas</Text>
                </Pressable>
                <Pressable style={[styles.externalBtn, { backgroundColor: '#0055A5' }]} onPress={() => Linking.openURL('https://www.eventcinemas.com.au/Movies')} accessibilityRole="button"> 
                  <Ionicons name="open-outline" size={18} color="#FFF" />
                  <Text style={styles.externalBtnText}>Event Cinemas</Text>
                </Pressable>
                <Pressable style={[styles.externalBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]} onPress={() => Linking.openURL('https://www.dendy.com.au/movies')} accessibilityRole="button"> 
                  <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                  <Text style={[styles.externalBtnText, { color: '#FFFFFF' }]}>Dendy Cinemas</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12 }]}> 
          <View>
            <Text style={styles.bottomPrice}>From ${movie.showtimes?.[0]?.price || '—'}</Text>
            <Text style={styles.bottomLabel}>at nearby cinemas</Text>
          </View>
          <Pressable
            style={styles.bookButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const query = encodeURIComponent(`${movie.title} movie tickets ${movie.city || ''}`);
              Linking.openURL(`https://www.google.com/search?q=${query}`);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Book tickets for ${movie.title}`}
          >
            <Ionicons name="ticket" size={18} color="#0B0B14" />
            <Text style={styles.bookButtonText}>Find Tickets</Text>
          </Pressable>
        </View>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B14' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { 
    fontSize: 18, 
    fontFamily: 'Poppins_700Bold', 
    color: '#FFFFFF', 
    flex: 1, 
    textAlign: 'center', 
    marginHorizontal: 12,
  },
  posterArea: { height: 280, position: 'relative', overflow: 'hidden' },
  posterBadge: { 
    position: 'absolute', 
    bottom: 16, 
    right: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(11,11,20,0.8)', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  posterScore: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: 0.5 },
  infoSection: { padding: 20, gap: 14 },
  movieTitle: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaPill: { 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  metaPillText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.8)' },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genrePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  genrePillText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  description: { fontSize: 15, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)', lineHeight: 24 },
  crewSection: { flexDirection: 'row', gap: 12 },
  crewLabel: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', width: 80 },
  crewValue: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)', flex: 1, lineHeight: 22 },
  
  showtimeSection: { paddingHorizontal: 20, gap: 16, paddingTop: 10 },
  showtimeTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  cinemaBlock: { gap: 12 },
  cinemaHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  cinemaIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: CultureTokens.gold + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cinemaName: { flex: 1, fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  cinemaPrice: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: CultureTokens.gold },
  timesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingLeft: 4 },
  timeChip: { 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 14, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  timeText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  
  externalLinksSection: { marginTop: 24, gap: 12 },
  externalLinksTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', marginBottom: 4 },
  externalBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderRadius: 16 
  },
  externalBtnText: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#FFF' },
  
  bottomBar: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 16, 
    backgroundColor: 'rgba(11,11,20,0.95)', 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255,255,255,0.1)' 
  },
  bottomPrice: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: '#FFFFFF', letterSpacing: -0.5 },
  bottomLabel: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.5)' },
  bookButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: CultureTokens.gold, 
    paddingHorizontal: 28, 
    paddingVertical: 16, 
    borderRadius: 16 
  },
  bookButtonText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: '#0B0B14' },
});
