import { View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator, RefreshControlProps } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CultureTokens } from '@/constants/theme';
import { useState, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { FilterChipRow, FilterItem } from '@/components/FilterChip';
import { LinearGradient } from 'expo-linear-gradient';

export interface CategoryFilter {
  label: string;
  icon: string;
  color: string;
  count?: number;
}

export interface BrowseItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  rating?: number;
  reviews?: number;
  priceLabel?: string;
  badge?: string;
  isPromoted?: boolean;
  meta?: string;
  [key: string]: any;
}

interface BrowsePageProps {
  title: string;
  accentColor?: string;
  accentIcon?: string;
  apiEndpoint?: string;
  categories: CategoryFilter[];
  categoryKey?: string;
  items: BrowseItem[];
  isLoading: boolean;
  promotedItems?: BrowseItem[];
  promotedTitle?: string;
  onItemPress: (item: BrowseItem) => void;
  renderItemExtra?: (item: BrowseItem) => React.ReactNode;
  emptyMessage?: string;
  emptyIcon?: string;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export default function BrowsePage({
  title,
  accentColor = CultureTokens.indigo,
  accentIcon = 'compass',
  categories,
  categoryKey = 'category',
  items,
  isLoading,
  promotedItems = [],
  promotedTitle = 'Popular',
  onItemPress,
  renderItemExtra,
  emptyMessage = 'Nothing found',
  emptyIcon = 'search-outline',
  refreshControl,
}: BrowsePageProps) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const [selectedCat, setSelectedCat] = useState('All');

  const filtered = useMemo(() => {
    if (selectedCat === 'All') return items;
    return items.filter((item) => {
      const val = item[categoryKey];
      if (Array.isArray(val)) return val.includes(selectedCat);
      return val === selectedCat;
    });
  }, [selectedCat, items, categoryKey]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <LinearGradient colors={['rgba(44,42,114,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
        <Header title={title} accentColor={accentColor} accentIcon={accentIcon} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.loadingText}>Loading {title.toLowerCase()}...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <LinearGradient colors={['rgba(44,42,114,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
      
      {/* Decorative Orbs */}
      <View style={[styles.orb, { top: -100, right: -100, backgroundColor: accentColor, opacity: 0.15, ...Platform.select({ web: { filter: 'blur(80px)' }, default: {} }) } as any]} />
      <View style={[styles.orb, { top: 400, left: -100, backgroundColor: CultureTokens.saffron, opacity: 0.1, ...Platform.select({ web: { filter: 'blur(100px)' }, default: {} }) } as any]} />

      <Header title={title} accentColor={accentColor} accentIcon={accentIcon} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 100 }}
        refreshControl={refreshControl}
      >
        {promotedItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={[styles.sectionDot, { backgroundColor: accentColor }]} />
              <Text style={styles.sectionTitle}>{promotedTitle}</Text>
              <View style={[styles.promotedBadge, { backgroundColor: accentColor + '15' }]}>
                <Ionicons name="star" size={10} color={accentColor} />
                <Text style={[styles.promotedBadgeText, { color: accentColor }]}>Promoted</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
            >
              {promotedItems.map((item, i) => (
                <View key={item.id}>
                  <Pressable style={({ pressed }) => [styles.promoCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]} onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onItemPress(item);
                  }}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.promoImage} contentFit="cover" transition={200} />
                    ) : (
                      <View style={[styles.promoImage, { backgroundColor: accentColor + '15', alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name={accentIcon as any} size={32} color={accentColor} />
                      </View>
                    )}
                    <View style={styles.promoInfo}>
                      <Text style={styles.promoName} numberOfLines={1}>{item.title}</Text>
                      {item.subtitle && <Text style={styles.promoSub} numberOfLines={1}>{item.subtitle}</Text>}
                      <View style={styles.promoBottom}>
                        {item.priceLabel && <Text style={[styles.promoPrice, { color: accentColor }]}>{item.priceLabel}</Text>}
                        {item.rating != null && (
                          <View style={styles.ratingRow}>
                            <Ionicons name="star" size={12} color={CultureTokens.gold} />
                            <Text style={styles.ratingText}>{item.rating}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {categories.length > 0 && (() => {
          const chipItems: FilterItem[] = categories.map((c) => {
            const count = c.label === 'All'
              ? items.length
              : items.filter((item) => {
                  const val = item[categoryKey];
                  if (Array.isArray(val)) return val.includes(c.label);
                  return val === c.label;
                }).length;
            return {
              id: c.label,
              label: c.label,
              icon: c.icon,
              color: c.color,
              count,
            };
          });
          return (
            <FilterChipRow
              items={chipItems}
              selectedId={selectedCat}
              onSelect={setSelectedCat}
            />
          );
        })()}

        <View style={styles.listSection}>
          <Text style={styles.resultCount}>
            {filtered.length} {title.toLowerCase()} found
          </Text>

          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconBg}>
                <Ionicons name={emptyIcon as any} size={48} color="rgba(255,255,255,0.4)" />
              </View>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            filtered.map((item, index) => (
              <View key={item.id}>
                <Pressable style={styles.card} onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onItemPress(item);
                }}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="cover" transition={200} />
                  ) : (
                    <View style={[styles.cardImage, { backgroundColor: accentColor + '15', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name={accentIcon as any} size={28} color={accentColor} />
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardName} numberOfLines={1}>{item.title}</Text>
                      {item.isPromoted && (
                        <View style={[styles.miniPromoBadge, { backgroundColor: accentColor + '15' }]}>
                          <Ionicons name="star" size={10} color={accentColor} />
                        </View>
                      )}
                    </View>
                    {item.subtitle && <Text style={styles.cardSub} numberOfLines={1}>{item.subtitle}</Text>}
                    {item.description && <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>}
                    <View style={styles.cardBottom}>
                      {item.priceLabel && <Text style={[styles.cardPrice, { color: accentColor }]}>{item.priceLabel}</Text>}
                      {item.badge && (
                        <View style={[styles.cardBadge, { backgroundColor: accentColor + '15' }]}>
                          <Text style={[styles.cardBadgeText, { color: accentColor }]}>{item.badge}</Text>
                        </View>
                      )}
                      {item.rating != null && (
                        <View style={styles.ratingRow}>
                          <Ionicons name="star" size={12} color={CultureTokens.gold} />
                          <Text style={styles.ratingText}>{item.rating}{item.reviews ? ` (${item.reviews})` : ''}</Text>
                        </View>
                      )}
                      {item.meta && <Text style={styles.cardMeta}>{item.meta}</Text>}
                    </View>
                    {renderItemExtra?.(item)}
                  </View>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Header({ title, accentColor, accentIcon }: { title: string; accentColor: string; accentIcon: string }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }}
        style={({ pressed }) => [styles.backBtn, pressed && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
        hitSlop={12}
      >
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </Pressable>
      <View style={styles.headerCenter}>
        <View style={[styles.headerIcon, { backgroundColor: accentColor + '15' }]}>
          <Ionicons name={accentIcon as any} size={18} color={accentColor} />
        </View>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
        hitSlop={12}
        onPress={() => router.push('/search')}
      >
        <Ionicons name="search-outline" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B14',
  },
  orb: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255,255,255,0.6)',
  },
  section: {
    marginBottom: 24,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
    paddingTop: 10,
  },
  sectionDot: {
    width: 6,
    height: 20,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    flex: 1,
  },
  promotedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  promotedBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promoCard: {
    width: 240,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  promoImage: {
    width: '100%',
    height: 140,
  },
  promoInfo: {
    padding: 16,
    gap: 4,
  },
  promoName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  promoSub: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.6)',
  },
  promoBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  promoPrice: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255,255,255,0.6)',
  },
  listSection: {
    paddingHorizontal: 20,
  },
  resultCount: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyIconBg: {
    width: 90, height: 90, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255,255,255,0.5)',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 22,
  },
  miniPromoBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSub: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  cardPrice: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  cardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.4)',
  },
});
