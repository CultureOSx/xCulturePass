import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TicketScanResult } from './types';
import { getOutcomeConfig } from './utils';

export function TicketResultCard({ result, colors, onClose, onScanNext, onPrintBadge }: {
  result: TicketScanResult;
  colors: any; // using any for colors to match the ReturnType<typeof useColors> which is complex to import without context
  onClose: () => void;
  onScanNext: () => void;
  onPrintBadge: () => void;
}) {
  const cfg = getOutcomeConfig(result);
  const t = result.ticket;
  const rs = React.useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={[rs.card, { backgroundColor: colors.surface, borderColor: cfg.color + '40' }]}>
      <LinearGradient colors={[cfg.color + '18', cfg.color + '05']} style={rs.statusHeader}>
        <Ionicons name={cfg.icon as any} size={36} color={cfg.color} />
        <View style={{ flex: 1 }}>
          <Text style={[rs.statusTitle, { color: cfg.color }]}>{cfg.title}</Text>
          <Text style={[rs.statusMsg, { color: colors.textSecondary }]}>{result.message}</Text>
        </View>
        <Pressable onPress={onClose} style={[rs.closeBtn, { backgroundColor: colors.background + 'CC' }]}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </LinearGradient>

      {t && (
        <View style={rs.details}>
          <Text style={[rs.eventTitle, { color: colors.text }]} numberOfLines={2}>{t.eventTitle}</Text>
          <View style={rs.metaGrid}>
            {t.eventDate && (
              <View style={rs.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={[rs.metaValue, { color: colors.textSecondary }]}>{t.eventDate}</Text>
              </View>
            )}
            {t.eventTime && (
              <View style={rs.metaItem}>
                <Ionicons name="time-outline" size={14} color={colors.secondary} />
                <Text style={[rs.metaValue, { color: colors.textSecondary }]}>{t.eventTime}</Text>
              </View>
            )}
            {t.eventVenue && (
              <View style={[rs.metaItem, { flex: 1, width: '100%' }]}>
                <Ionicons name="location-outline" size={14} color={colors.accent} />
                <Text style={[rs.metaValue, { color: colors.textSecondary }]} numberOfLines={1}>{t.eventVenue}</Text>
              </View>
            )}
          </View>
          <View style={rs.badgeRow}>
            {t.tierName && (
              <View style={[rs.badge, { backgroundColor: colors.primaryGlow }]}>
                <Text style={[rs.badgeText, { color: colors.primary }]}>{t.tierName}</Text>
              </View>
            )}
            <View style={[rs.badge, { backgroundColor: colors.textSecondary + '12' }]}>
              <Ionicons name="ticket-outline" size={12} color={colors.textSecondary} />
              <Text style={[rs.badgeText, { color: colors.textSecondary }]}>{t.quantity || 1}x</Text>
            </View>
            {t.ticketCode && (
              <View style={[rs.badge, { backgroundColor: cfg.color + '12', marginLeft: 'auto' }]}>
                <Text style={[rs.badgeText, { color: cfg.color, letterSpacing: 1 }]}>{t.ticketCode}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={[rs.actions, { borderTopColor: colors.borderLight }]}>
        <Pressable style={[rs.actionSecondary, { backgroundColor: colors.background }]} onPress={onClose}>
          <Text style={[rs.actionSecondaryText, { color: colors.textSecondary }]}>Done</Text>
        </Pressable>
        {t?.id ? (
          <Pressable style={[rs.actionSecondary, { backgroundColor: colors.background }]} onPress={onPrintBadge}>
            <Ionicons name="print-outline" size={16} color={colors.warning} />
            <Text style={[rs.actionSecondaryText, { color: colors.warning }]}>Print Badge</Text>
          </Pressable>
        ) : null}
        <Pressable style={[rs.actionPrimary, { backgroundColor: colors.primary }]} onPress={onScanNext}>
          <Ionicons name="camera" size={16} color="#FFF" />
          <Text style={rs.actionPrimaryText}>Scan Next</Text>
        </Pressable>
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  card:                { borderRadius: 20, overflow: 'hidden', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  statusHeader:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  statusTitle:         { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  statusMsg:           { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: 2 },
  closeBtn:            { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  details:             { paddingHorizontal: 16, paddingBottom: 14 },
  eventTitle:          { fontSize: 17, fontFamily: 'Poppins_700Bold', marginBottom: 10 },
  metaGrid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metaItem:            { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaValue:           { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  badgeRow:            { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge:               { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:           { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  actions:             { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1 },
  actionSecondary:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  actionSecondaryText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  actionPrimary:       { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  actionPrimaryText:   { fontSize: 14, fontFamily: 'Poppins_700Bold', color: '#FFF' },
});
