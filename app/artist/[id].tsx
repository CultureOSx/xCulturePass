import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, router, useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { CultureTokens } from "@/constants/theme";
import SocialLinksBar from "@/components/SocialLinksBar";
import * as Haptics from "expo-haptics";
import type { Profile } from "@shared/schema";
import { api } from "@/lib/api";
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ArtistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const goBack = () =>
    navigation.canGoBack() ? router.back() : router.replace("/");

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ["/api/profiles", id],
    queryFn: () => api.profiles.get(id),
  });

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const url = `https://culturepass.app/artist/${id}`;
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ title: profile?.name ?? "Artist on CulturePass", url });
        } else if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          Alert.alert("Link Copied", "Link copied to clipboard");
        }
      } else {
        await Share.share({
          title: `${profile?.name ?? 'Artist'} on CulturePass`,
          message: `Check out ${profile?.name} on CulturePass!${profile?.category ? ` ${profile.category}.` : ''}\n\n${url}`,
          url: url,
        });
      }
    } catch {}
  }, [id, profile]);

  if (isLoading) {
    return (
      <ErrorBoundary>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={CultureTokens.coral} />
        </View>
      </ErrorBoundary>
    );
  }

  if (!profile) {
    return (
      <ErrorBoundary>
        <View style={styles.notFound}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color="rgba(255,255,255,0.4)"
          />
          <Text style={styles.notFoundText}>Artist not found</Text>
          <Pressable onPress={goBack} style={styles.backLinkBtn}>
            <Text style={styles.backLink}>Go Back</Text>
          </Pressable>
        </View>
      </ErrorBoundary>
    );
  }

  const heroImage = profile.coverImageUrl || ((profile as any).images && (profile as any).images.length > 0 ? (profile as any).images[0] : null) || profile.avatarUrl;
  const location = [profile.city, profile.country].filter(Boolean).join(", ");

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomInset + 80 }}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO */}
          <View style={styles.heroContainer}>
            {heroImage ? (
              <Image
                source={{ uri: heroImage }}
                style={styles.heroImage}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <LinearGradient
                colors={[CultureTokens.coral, '#0B0B14']}
                style={styles.heroImage}
              />
            )}

            <LinearGradient
              colors={["rgba(11,11,20,0.2)", "transparent", "#0B0B14"]}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
            />

            {/* Top buttons */}
            <View style={[styles.heroTopBar, { top: topInset + 12 }]}>
              <Pressable onPress={goBack} style={styles.iconBtn}>
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </Pressable>

              <Pressable onPress={handleShare} style={styles.iconBtn}>
                <Ionicons name="share-outline" size={22} color="#FFF" />
              </Pressable>
            </View>

            {/* Hero Content */}
            <View style={styles.heroContent}>
              {profile.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={CultureTokens.success} />
                  <Text style={styles.verifiedText}>Verified Artist</Text>
                </View>
              )}

              <Text style={styles.artistName}>{profile.name}</Text>

              {profile.category && (
                <Text style={styles.artistGenre}>{profile.category}</Text>
              )}
            </View>
          </View>

          {/* CONTENT */}
          <View style={styles.content}>
            {/* Stats */}
            <View style={styles.statsRow}>
              <StatCard
                icon="people"
                value={profile.followersCount ?? 0}
                label="Followers"
                color={CultureTokens.coral}
              />
              {location ? (
                <StatCard
                  icon="location"
                  value={profile.city ?? "—"}
                  label={profile.country ?? "Location"}
                  color={CultureTokens.indigo}
                  onPress={() => {
                    const q = encodeURIComponent(location);
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
                  }}
                />
              ) : (
                <StatCard
                  icon="star"
                  value={(profile as any).rating ? (profile as any).rating.toFixed(1) : "—"}
                  label="Rating"
                  color={CultureTokens.gold}
                />
              )}
            </View>

            {/* CulturePass ID Badge */}
            {(profile as any).culturePassId && (
              <View style={styles.cpidChip}>
                <Ionicons name="finger-print" size={16} color={CultureTokens.coral} />
                <Text style={styles.cpidText}>{(profile as any).culturePassId}</Text>
              </View>
            )}

            {/* About */}
            {(profile.bio || profile.description) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.bio}>
                  {profile.bio || profile.description}
                </Text>
              </View>
            )}

            {/* Tags */}
            {(profile.tags?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tags</Text>
                <View style={styles.tagsRow}>
                  {(profile.tags ?? []).map((tag: string, idx: number) => (
                    <View key={idx} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Social */}
            {(profile.socialLinks && Object.values(profile.socialLinks).some(Boolean)) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Follow</Text>
                <SocialLinksBar
                  socialLinks={profile.socialLinks}
                  website={profile.website}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

/* ---------------- Components ---------------- */

function StatCard({
  icon,
  value,
  label,
  color,
  onPress,
}: any) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper style={styles.statCard} onPress={onPress}>
      <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ gap: 2 }}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </Wrapper>
  );
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B14',
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#0B0B14',
  },

  heroContainer: {
    height: 360,
    position: 'relative'
  },

  heroImage: {
    width: "100%",
    height: "100%",
  },

  heroTopBar: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  heroContent: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
  },

  verifiedBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  verifiedText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: CultureTokens.success,
  },

  artistName: {
    fontSize: 32,
    fontFamily: "Poppins_700Bold",
    color: "#FFF",
    letterSpacing: -0.5,
  },

  artistGenre: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },

  content: {
    padding: 20,
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },

  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },

  statValue: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },

  statLabel: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "rgba(255,255,255,0.5)",
  },

  cpidChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: CultureTokens.coral + "15",
    alignSelf: "flex-start",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: CultureTokens.coral + "30",
  },

  cpidText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: CultureTokens.coral,
  },

  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },

  bio: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 24,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)"
  },

  tagText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#FFFFFF",
  },

  notFound: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: '#0B0B14',
  },

  notFoundText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "rgba(255,255,255,0.6)",
  },

  backLinkBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: CultureTokens.coral + '15'
  },

  backLink: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: CultureTokens.coral,
  },
});