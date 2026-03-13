import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CultureTokens } from '@/constants/theme';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useContacts, SavedContact } from '@/contexts/ContactsContext';
import { useCallback } from 'react';
import { AuthGuard } from '@/components/AuthGuard';

const TIER_COLORS: Record<string, string> = {
  free: 'rgba(255,255,255,0.6)',
  plus: CultureTokens.indigo,
  premium: CultureTokens.gold,
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}

function ContactItem({ contact, onPress, onRemove }: { contact: SavedContact; onPress: () => void; onRemove: () => void }) {
  const colors = useColors();
  const styles = getStyles(colors);

  const initials = (contact.name || contact.cpid)
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const tierColor = TIER_COLORS[contact.tier || 'free'] || colors.textSecondary;

  return (
    <Pressable style={styles.contactItem} onPress={onPress}>
      <View style={[styles.contactAvatar, { borderColor: tierColor + '40', backgroundColor: tierColor + '10' }]}>
        <Text style={[styles.contactInitials, { color: tierColor }]}>{initials}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName} numberOfLines={1}>{contact.name || 'CulturePass User'}</Text>
        <View style={styles.contactMeta}>
          <View style={styles.cpidMini}>
            <Ionicons name="finger-print" size={10} color={CultureTokens.indigo} />
            <Text style={styles.cpidMiniText}>{contact.cpid}</Text>
          </View>
          {contact.city && (
            <Text style={styles.contactLocation} numberOfLines={1}>
              {contact.city}{contact.country ? `, ${contact.country}` : ''}
            </Text>
          )}
        </View>
        <Text style={styles.contactSavedAt}>Saved {timeAgo(contact.savedAt)}</Text>
      </View>
      <Pressable
        style={styles.removeBtn}
        onPress={(e) => {
          e.stopPropagation?.();
          onRemove();
        }}
      >
        <Ionicons name="trash-outline" size={16} color={CultureTokens.coral} />
      </Pressable>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

export default function ContactsScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const { contacts, removeContact, clearContacts } = useContacts();

  const handleRemove = useCallback((contact: SavedContact) => {
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
          },
        },
      ]
    );
  }, [removeContact]);

  const handleClearAll = useCallback(() => {
    if (contacts.length === 0) return;
    Alert.alert(
      'Clear All Contacts',
      `Remove all ${contacts.length} saved contacts? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); clearContacts(); } },
      ]
    );
  }, [contacts.length, clearContacts]);

  const handleContactPress = useCallback((contact: SavedContact) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/contacts/[cpid]' as any, params: { cpid: contact.cpid } });
  }, []);

  const renderItem = useCallback(({ item }: { item: SavedContact }) => (
    <ContactItem
      contact={item}
      onPress={() => handleContactPress(item)}
      onRemove={() => handleRemove(item)}
    />
  ), [handleContactPress, handleRemove]);

  return (
    <AuthGuard icon="people-outline" title="Cultural Contacts" message="Sign in to connect with your cultural community.">
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Contacts</Text>
          <View style={styles.headerRight}>
            <Pressable
              style={styles.headerAction}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/scanner'); }}
            >
              <Ionicons name="scan-outline" size={20} color={CultureTokens.indigo} />
            </Pressable>
            {contacts.length > 0 && (
              <Pressable style={styles.headerAction} onPress={handleClearAll}>
                <Ionicons name="trash-outline" size={18} color={CultureTokens.coral} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{contacts.length}</Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </View>
          <View style={styles.statDivider} />
          <Pressable
            style={styles.scanCta}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/scanner'); }}
          >
            <Ionicons name="camera-outline" size={18} color={colors.background} />
            <Text style={styles.scanCtaText}>Scan Card</Text>
          </Pressable>
        </View>

        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No saved contacts</Text>
            <Text style={styles.emptySub}>Scan CulturePass QR codes to save contacts and keep a copy of their CPID.</Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/scanner'); }}
            >
              <Ionicons name="scan-outline" size={18} color={colors.background} />
              <Text style={styles.emptyBtnText}>Open Scanner</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={item => item.cpid}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40 + bottomInset, paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!!contacts.length}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </AuthGuard>
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
  headerRight: { flexDirection: 'row', gap: 10 },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CultureTokens.indigo + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 20,
    padding: 16,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 28, fontFamily: 'Poppins_700Bold', color: colors.text },
  statLabel: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: colors.textSecondary },
  statDivider: { width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20 },
  scanCta: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CultureTokens.indigo,
    borderRadius: 14,
    paddingVertical: 14,
  },
  scanCtaText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: colors.background },

  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  contactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  contactInitials: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: colors.text },
  contactMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  cpidMini: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cpidMiniText: { fontSize: 12, fontFamily: 'Poppins_500Medium', color: CultureTokens.indigo },
  contactLocation: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: colors.textSecondary },
  contactSavedAt: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: CultureTokens.coral + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  separator: { height: 1, backgroundColor: colors.backgroundSecondary },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', color: colors.text },
  emptySub: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CultureTokens.indigo,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  emptyBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: colors.background },
});
