import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TicketScanResult } from './types';
import { getOutcomeConfig } from './utils';
import { CultureTokens } from '@/constants/theme';

export function TicketResultCard({ result, onClose, onScanNext, onPrintBadge }: {
  result: TicketScanResult;
  onClose: () => void;
  onScanNext: () => void;
  onPrintBadge: () => void;
}) {
  const cfg = getOutcomeConfig(result);
  const t = result.ticket;

  return (
    <View style={[rs.card, { borderColor: cfg.color + '40' }]}>
      <LinearGradient colors={[cfg.color + '20', cfg.color + '05']} style={rs.statusHeader}>
        <Ionicons name={cfg.icon as any} size={36} color={cfg.color} />
        <View style={{ flex: 1 }}>
          <Text style={[rs.statusTitle, { color: cfg.color }]}>{cfg.title}</Text>
          <Text style={rs.statusMsg}>{result.message}</Text>
        </View>
        <Pressable onPress={onClose} style={rs.closeBtn}>
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </LinearGradient>

      {t && (
        <View style={rs.details}>
          <Text style={rs.eventTitle} numberOfLines={2}>{t.eventTitle}</Text>
          <View style={rs.metaGrid}>
            {t.eventDate && (
              <View style={rs.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={CultureTokens.indigo} />
                <Text style={rs.metaValue}>{t.eventDate}</Text>
              </View>
            )}
            {t.eventTime && (
              <View style={rs.metaItem}>
                <Ionicons name="time-outline" size={14} color={CultureTokens.saffron} />
                <Text style={rs.metaValue}>{t.eventTime}</Text>
              </View>
            )}
            {t.eventVenue && (
              <View style={[rs.metaItem, { flex: 1, width: '100%' }]}>
                <Ionicons name="location-outline" size={14} color={CultureTokens.coral} />
                <Text style={rs.metaValue} numberOfLines={1}>{t.eventVenue}</Text>
              </View>
            )}
          </View>
          <View style={rs.badgeRow}>
            {t.tierName && (
              <View style={[rs.badge, { backgroundColor: CultureTokens.indigo + '20' }]}>
                <Text style={[rs.badgeText, { color: CultureTokens.indigo }]}>{t.tierName}</Text>
              </View>
            )}
            <View style={[rs.badge, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <Ionicons name="ticket-outline" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={[rs.badgeText, { color: 'rgba(255,255,255,0.6)' }]}>{t.quantity || 1}x</Text>
            </View>
            {t.ticketCode && (
              <View style={[rs.badge, { backgroundColor: cfg.color + '15', marginLeft: 'auto' }]}>
                <Text style={[rs.badgeText, { color: cfg.color, letterSpacing: 1 }]}>{t.ticketCode}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={rs.actions}>
        <Pressable style={rs.actionSecondary} onPress={onClose}>
          <Text style={rs.actionSecondaryText}>Done</Text>
        </Pressable>
        {t?.id ? (
          <Pressable style={rs.actionSecondary} onPress={onPrintBadge}>
            <Ionicons name="print-outline" size={16} color={CultureTokens.warning} />
            <Text style={[rs.actionSecondaryText, { color: CultureTokens.warning }]}>Print Badge</Text>
          </Pressable>
        ) : null}
        <Pressable style={rs.actionPrimary} onPress={onScanNext}>
          <Ionicons name="camera" size={16} color="#0B0B14" />
          <Text style={rs.actionPrimaryText}>Scan Next</Text>
        </Pressable>
      </View>
    </View>
  );
}

const rs = StyleSheet.create({
  card:                { borderRadius: 24, overflow: 'hidden', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)' },
  statusHeader:        { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  statusTitle:         { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  statusMsg:           { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: 2, color: 'rgba(255,255,255,0.6)' },
  closeBtn:            { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  details:             { paddingHorizontal: 20, paddingBottom: 16 },
  eventTitle:          { fontSize: 18, fontFamily: 'Poppins_700Bold', marginBottom: 12, color: '#FFFFFF' },
  metaGrid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  metaItem:            { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaValue:           { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.7)' },
  badgeRow:            { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge:               { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText:           { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  actions:             { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  actionSecondary:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionSecondaryText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: 'rgba(255,255,255,0.7)' },
  actionPrimary:       { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: CultureTokens.indigo },
  actionPrimaryText:   { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#0B0B14' },
});
