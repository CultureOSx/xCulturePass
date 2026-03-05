import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { CultureTokens } from "@/constants/theme";

export function WebTopBar() {
  const colors = useColors();
  // Tab route mapping
  const tabRoutes = {
    Discover: '/(tabs)',
    Calendar: '/(tabs)/calendar',
    Community: '/(tabs)/communities',
    Perks: '/(tabs)/perks',
    Profile: '/(tabs)/profile',
  };
  return (
    <View style={styles.container}>
      {/* Left: Logo + Name */}
      <Pressable style={styles.left} onPress={() => router.push('/(tabs)')} accessibilityLabel="Home">
        <LinearGradient
          colors={[CultureTokens.indigo, CultureTokens.saffron]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoBg}
        >
          <Ionicons name="globe-outline" size={22} color="#fff" />
        </LinearGradient>
        <Text style={styles.appName}>CulturePass</Text>
      </Pressable>
      {/* Center: Navigation Tabs */}
      <View style={styles.center}>
        {Object.entries(tabRoutes).map(([tab, route]) => (
          <Pressable
            key={tab}
            style={styles.tab}
            onPress={() => router.push(route)}
            accessibilityLabel={tab}
          >
            <Text style={styles.tabText}>{tab}</Text>
          </Pressable>
        ))}
      </View>
      {/* Right: Notification, Map, Sign Up */}
      <View style={styles.right}>
        <Pressable
          style={styles.iconBtn}
          accessibilityLabel="Notifications"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/notifications');
          }}
        >
          <Ionicons name="notifications-outline" size={20} color={CultureTokens.saffron} />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          accessibilityLabel="Map"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/map');
          }}
        >
          <Ionicons name="map-outline" size={20} color={CultureTokens.teal} />
        </Pressable>
        <Pressable style={styles.signUpBtn} accessibilityLabel="Sign Up" onPress={() => router.push('/(onboarding)/signup')}>
          <Text style={styles.signUpText}>Sign Up</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2A72',
    borderBottomWidth: 2,
    borderBottomColor: '#FF8C42',
    paddingVertical: 12,
    paddingHorizontal: 40,
    minHeight: 72,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  appName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'Poppins_700Bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    flex: 1,
    justifyContent: 'center',
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tabText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  signUpBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FF8C42',
  },
  signUpText: {
    color: '#FFC857',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
    textShadowColor: '#22203A',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
