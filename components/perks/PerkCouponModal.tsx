import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';

interface PerkCouponModalProps {
  showCoupon: boolean;
  couponCode: string;
  setShowCoupon: (show: boolean) => void;
}

export function PerkCouponModal({ showCoupon, couponCode, setShowCoupon }: PerkCouponModalProps) {
  if (!showCoupon) return null;

  return (
    <View style={styles.couponOverlay}>
      <View style={styles.couponModal}>
        <View style={styles.couponIconWrap}>
          <Ionicons name="checkmark-circle" size={48} color="#34C759" />
        </View>
        <Text style={styles.couponTitle}>Perk Redeemed!</Text>
        <Text style={styles.couponSubtitle}>Here&apos;s your coupon code</Text>
        <View style={styles.couponCodeWrap}>
          <Text style={styles.couponCodeText}>{couponCode}</Text>
        </View>
        <Text style={styles.couponHint}>Show this code at checkout or enter it online</Text>
        <Pressable
          style={styles.couponCopyBtn}
          onPress={async () => {
            if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
              await navigator.clipboard.writeText(couponCode);
              Alert.alert('Copied!', 'Coupon code copied to clipboard.');
            } else {
              Alert.alert('Coupon Code', couponCode);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        >
          <Ionicons name="copy-outline" size={18} color={Colors.textInverse} />
          <Text style={styles.couponCopyText}>Copy Code</Text>
        </Pressable>
        <Pressable style={styles.couponDoneBtn} onPress={() => setShowCoupon(false)}>
          <Text style={styles.couponDoneText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  couponOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: 30,
  },
  couponModal: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%' as any,
    maxWidth: 340,
  },
  couponIconWrap: {
    marginBottom: 12,
  },
  couponTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  couponSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#8E8E93',
    marginBottom: 16,
  },
  couponCodeWrap: {
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  couponCodeText: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#1C1C1E',
    letterSpacing: 2,
    textAlign: 'center' as const,
  },
  couponHint: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  couponCopyBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: '#1A7A6D',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%' as any,
    marginBottom: 10,
  },
  couponCopyText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.textInverse,
  },
  couponDoneBtn: {
    paddingVertical: 10,
  },
  couponDoneText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: '#8E8E93',
  },
});
