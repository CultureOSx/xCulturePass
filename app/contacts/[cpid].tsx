import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import { useColors } from '@/hooks/useColors';
import { CultureTokens } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { useContacts } from '@/contexts/ContactsContext';
import { useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';

// ─── Tier config ─────────────────────────────────────────────────────────────

const getTierDisplay = (colors: any): Record<string, { label: string; color: string; icon: string }> => ({
  free: { label: 'Standard', color: colors.textSecondary, icon: 'shield-outline' },
  plus: { label: 'Plus', color: CultureTokens.indigo, icon: 'star' },
  premium: { label: 'Premium', color: CultureTokens.gold, icon: 'diamond' },
  elite: { label: 'Elite', color: '#8E44AD', icon: 'trophy' },
  vip: { label: 'VIP', color: CultureTokens.saffron, icon: 'ribbon' },
  pro: { label: 'Pro', color: CultureTokens.teal, icon: 'briefcase' },
});

// ─── vCard builder ────────────────────────────────────────────────────────────

function buildVCard(contact: ReturnType<ReturnType<typeof useContacts>['getContact']>): string {
  if (!contact) return '';

  const nameParts = (contact.name || 'CulturePass User').split(' ');
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ');

  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${contact.name || 'CulturePass User'}`,
    `N:${lastName};${firstName};;;`,
  ];

  if (contact.org) {
    lines.push(`ORG:${contact.org}`);
  }
  if (contact.phone) {
    lines.push(`TEL;TYPE=CELL:${contact.phone}`);
  }
  if (contact.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${contact.email}`);
  }
  if (contact.username) {
    lines.push(`URL;TYPE=WORK:https://culturepass.app/u/${contact.username}`);
    lines.push(`X-SOCIALPROFILE;type=culturepass:${contact.username}`);
  }
  if (contact.city || contact.country) {
    lines.push(`ADR;TYPE=HOME:;;${contact.city || ''};${contact.country || ''};;;`);
  }
  if (contact.avatarUrl) {
    lines.push(`PHOTO;VALUE=URI:${contact.avatarUrl}`);
  }

  const noteLines = [`CulturePass ID: ${contact.cpid}`];
  if (contact.bio) noteLines.push(contact.bio);
  lines.push(`NOTE:${noteLines.join(' | ')}`);

  lines.push('END:VCARD');
  return lines.join('\n');
}

// ─── Save vCard to phone ──────────────────────────────────────────────────────

async function saveVCardToPhone(contact: NonNullable<ReturnType<ReturnType<typeof useContacts>['getContact']>>) {
  const vCardString = buildVCard(contact);
  const displayName = contact.name || contact.cpid;

  if (Platform.OS === 'web') {
    const blob = new Blob([vCardString], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${displayName.replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  try {
    const safeName = displayName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileUri = (FileSystem.cacheDirectory ?? '') + `${safeName}.vcf`;

    await FileSystem.writeAsStringAsync(fileUri, vCardString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Share.share({
      title: `Save ${displayName} to Contacts`,
      message: vCardString,
      url: fileUri,
    });
  } catch {
    await Share.share({
      title: `Save ${displayName} to Contacts`,
      message: vCardString,
    });
  }
}

// ─── Info row component ───────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  color,
  onPress,
  badge,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
  onPress?: () => void;
  badge?: string;
}) {
  const colors = useColors();
  const rowStyles = getRowStyles(colors);
  const finalColor = color || colors.text;

  const content = (
    <View style={rowStyles.container}>
      <View style={[rowStyles.iconWrap, { backgroundColor: finalColor === colors.text ? colors.backgroundSecondary : finalColor + '15' }]}>
        <Ionicons name={icon as any} size={18} color={finalColor} />
      </View>
      <View style={rowStyles.textWrap}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={[rowStyles.value, onPress && { color: finalColor }]} numberOfLines={1}>{value}</Text>
      </View>
      {badge && (
        <View style={rowStyles.badge}>
          <Text style={rowStyles.badgeText}>{badge}</Text>
        </View>
      )}
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
    </View>
  );

  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

const getRowStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  label: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: colors.text,
    marginTop: 2,
  },
  badge: {
    backgroundColor: CultureTokens.indigo + '15',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: CultureTokens.indigo,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ContactDetailScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const { cpid } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const { getContact, removeContact } = useContacts();

  const contact = getContact(cpid as string);

  const handleShare = useCallback(async () => {
    if (!contact) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const profileUrl = contact.username
      ? `https://culturepass.app/u/${contact.username}`
      : '';
    try {
      await Share.share({
        title: `${contact.name} on CulturePass`,
        message: `Check out ${contact.name || contact.cpid} on CulturePass!\nCPID: ${contact.cpid}${profileUrl ? `\n${profileUrl}` : ''}`,
        url: profileUrl || undefined,
      });
    } catch {}
  }, [contact]);

  const handleSaveToPhone = useCallback(async () => {
    if (!contact) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await saveVCardToPhone(contact);
    } catch {
      Alert.alert('Error', 'Could not save contact. Please try again.');
    }
  }, [contact]);

  const handleRemove = useCallback(() => {
    if (!contact) return;
    Alert.alert(
      'Remove Contact',
      `Remove ${contact.name || contact.cpid} from your saved contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            removeContact(contact.cpid);
            goBackOrReplace('/(tabs)');
          },
        },
      ]
    );
  }, [contact, removeContact]);

  const handleViewProfile = useCallback(() => {
    if (!contact?.userId) {
      Alert.alert('Profile', 'Full profile is not available for this contact.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/user/[id]', params: { id: contact.userId } });
  }, [contact]);

  const handleCall = useCallback(() => {
    if (!contact?.phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${contact.phone}`);
  }, [contact]);

  const handleEmail = useCallback(() => {
    if (!contact?.email) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`mailto:${contact.email}`);
  }, [contact]);

  const handleOpenLocation = useCallback(() => {
    if (!contact?.city) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const q = `${contact.city}${contact.country ? `, ${contact.country}` : ''}`;
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(q)}`);
  }, [contact]);

  if (!contact) {
    return (
      <View style={[styles.container, { paddingTop: topInset, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="person-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.notFoundText}>Contact not found</Text>
        <Pressable style={styles.backLink} onPress={() => goBackOrReplace('/(tabs)')}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const TIER_DISPLAY = getTierDisplay(colors);
  const tier = TIER_DISPLAY[contact.tier || 'free'] || TIER_DISPLAY.free;
  const initials = (contact.name || contact.cpid)
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const savedDate = new Date(contact.savedAt).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => goBackOrReplace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Contact Details</Text>
        <Pressable style={styles.headerShareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={CultureTokens.indigo} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 + bottomInset }}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { borderColor: tier.color + '40', backgroundColor: tier.color + '10' }]}>
            <Text style={[styles.avatarText, { color: tier.color }]}>{initials}</Text>
          </View>

          <Text style={styles.name}>{contact.name || 'CulturePass User'}</Text>
          {contact.username && (
            <Text style={styles.username}>@{contact.username}</Text>
          )}
          {contact.org && (
            <Text style={styles.orgName}>{contact.org}</Text>
          )}

          {/* CPID + tier chips */}
          <View style={styles.chipRow}>
            <View style={styles.cpidChip}>
              <Ionicons name="finger-print" size={14} color={CultureTokens.indigo} />
              <Text style={styles.cpidText}>{contact.cpid}</Text>
            </View>
            <View style={[styles.tierChip, { backgroundColor: tier.color + '15', borderColor: tier.color + '30' }]}>
              <Ionicons name={tier.icon as any} size={12} color={tier.color} />
              <Text style={[styles.tierText, { color: tier.color }]}>{tier.label}</Text>
            </View>
          </View>

          {/* Quick-action icons */}
          <View style={styles.quickActions}>
            {contact.phone && (
              <Pressable style={styles.quickActionBtn} onPress={handleCall}>
                <Ionicons name="call" size={22} color={CultureTokens.success} />
                <Text style={[styles.quickActionLabel, { color: CultureTokens.success }]}>Call</Text>
              </Pressable>
            )}
            {contact.email && (
              <Pressable style={styles.quickActionBtn} onPress={handleEmail}>
                <Ionicons name="mail" size={22} color={CultureTokens.indigo} />
                <Text style={[styles.quickActionLabel, { color: CultureTokens.indigo }]}>Email</Text>
              </Pressable>
            )}
            <Pressable style={styles.quickActionBtn} onPress={handleSaveToPhone}>
              <Ionicons name="person-add" size={22} color={CultureTokens.coral} />
              <Text style={[styles.quickActionLabel, { color: CultureTokens.coral }]}>Save</Text>
            </Pressable>
            <Pressable style={styles.quickActionBtn} onPress={handleShare}>
              <Ionicons name="share-social" size={22} color={CultureTokens.saffron} />
              <Text style={[styles.quickActionLabel, { color: CultureTokens.saffron }]}>Share</Text>
            </Pressable>
          </View>
        </View>

        {/* Bio */}
        {contact.bio && (
          <View style={styles.bioCard}>
            <Text style={styles.bioText}>{contact.bio}</Text>
          </View>
        )}

        {/* Contact info */}
        <View style={styles.infoCard}>
          {contact.phone && (
            <InfoRow
              icon="call"
              label="Phone"
              value={contact.phone}
              color={CultureTokens.success}
              onPress={handleCall}
            />
          )}
          {contact.phone && (contact.email || contact.city || contact.org) && (
            <View style={styles.divider} />
          )}
          {contact.email && (
            <InfoRow
              icon="mail"
              label="Email"
              value={contact.email}
              color={CultureTokens.indigo}
              onPress={handleEmail}
            />
          )}
          {contact.email && (contact.city || contact.org) && (
            <View style={styles.divider} />
          )}
          {contact.org && (
            <InfoRow
              icon="business"
              label="Organisation"
              value={contact.org}
              color={colors.textSecondary}
            />
          )}
          {contact.org && contact.city && <View style={styles.divider} />}
          {contact.city && (
            <InfoRow
              icon="location"
              label="Location"
              value={`${contact.city}${contact.country ? `, ${contact.country}` : ''}`}
              color={CultureTokens.indigo}
              onPress={handleOpenLocation}
            />
          )}
          {(contact.phone || contact.email || contact.org || contact.city) && (
            <View style={styles.divider} />
          )}
          <InfoRow
            icon="calendar-outline"
            label="Saved on"
            value={savedDate}
            color={colors.textSecondary}
          />
        </View>

        {/* CulturePass section */}
        <View style={styles.infoCard}>
          {contact.username && (
            <>
              <InfoRow
                icon="globe-outline"
                label="CulturePass Profile"
                value={`culturepass.app/u/${contact.username}`}
                color={CultureTokens.indigo}
                onPress={() =>
                  Linking.openURL(`https://culturepass.app/u/${contact.username}`)
                }
              />
              <View style={styles.divider} />
            </>
          )}
          <InfoRow
            icon="finger-print"
            label="CulturePass ID"
            value={contact.cpid}
            color={CultureTokens.indigo}
          />
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {contact.userId && (
            <Pressable style={styles.actionBtn} onPress={handleViewProfile}>
              <View style={[styles.actionIcon, { backgroundColor: CultureTokens.indigo + '15' }]}>
                <Ionicons name="person-outline" size={20} color={CultureTokens.indigo} />
              </View>
              <Text style={styles.actionBtnText}>View Full Profile</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          )}

          <Pressable style={styles.actionBtn} onPress={handleSaveToPhone}>
            <View style={[styles.actionIcon, { backgroundColor: CultureTokens.coral + '15' }]}>
              <Ionicons name="person-add-outline" size={20} color={CultureTokens.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionBtnText}>Save to Phone Contacts</Text>
              <Text style={styles.actionBtnSub}>Exports as vCard (.vcf)</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleShare}>
            <View style={[styles.actionIcon, { backgroundColor: CultureTokens.saffron + '15' }]}>
              <Ionicons name="share-outline" size={20} color={CultureTokens.saffron} />
            </View>
            <Text style={styles.actionBtnText}>Share Contact</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>

          <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleRemove}>
            <View style={[styles.actionIcon, { backgroundColor: CultureTokens.error + '15' }]}>
              <Ionicons name="trash-outline" size={20} color={CultureTokens.error} />
            </View>
            <Text style={[styles.actionBtnText, { color: CultureTokens.error }]}>Remove Contact</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
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
  headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: colors.text },
  headerShareBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CultureTokens.indigo + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileCard: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: 20,
  },
  avatarText: { fontSize: 32, fontFamily: 'Poppins_700Bold' },
  name: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: colors.text, textAlign: 'center' },
  username: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    marginTop: 4,
  },
  orgName: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: colors.textTertiary,
    marginTop: 4,
  },

  chipRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cpidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CultureTokens.indigo + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cpidText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.indigo },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tierText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  quickActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 28,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    width: '100%',
    justifyContent: 'center',
  },
  quickActionBtn: { alignItems: 'center', gap: 8, minWidth: 60 },
  quickActionLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },

  bioCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: colors.textSecondary,
    lineHeight: 24,
  },

  infoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  divider: { height: 1, backgroundColor: colors.backgroundSecondary, marginLeft: 78 },

  actionsSection: {
    marginHorizontal: 20,
    marginTop: 32,
    gap: 12,
    paddingBottom: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionBtnDanger: {
    borderWidth: 1,
    borderColor: CultureTokens.error + '30',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { flex: 1, fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: colors.text },
  actionBtnSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: colors.textTertiary,
    marginTop: 2,
  },

  notFoundText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: colors.textSecondary,
    marginTop: 16,
  },
  backLink: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: CultureTokens.indigo,
  },
  backLinkText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: colors.background },
});
