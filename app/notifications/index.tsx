import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useAuth } from '@/lib/auth';
import { CultureTokens } from '@/constants/theme';
import { useColors } from '@/hooks/useColors';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

const NOTIF_TYPE_INFO: Record<string, { icon: string; color: string }> = {
  system:    { icon: 'settings',    color: CultureTokens.teal },
  event:     { icon: 'calendar',    color: CultureTokens.coral },
  perk:      { icon: 'gift',        color: CultureTokens.saffron },
  community: { icon: 'people',      color: CultureTokens.success },
  payment:   { icon: 'wallet',      color: CultureTokens.success },
  follow:    { icon: 'person-add',  color: CultureTokens.gold },
  review:    { icon: 'star',        color: CultureTokens.indigo },
};

function timeAgo(date: string): string {
  const diff  = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days  = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const webTop = 0;
  const { userId } = useAuth();
  const colors = useColors();
  const s = getStyles(colors);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', userId],
    enabled: !!userId,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notifId: string) => { await apiRequest('PUT', `/api/notifications/${notifId}/read`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications', userId] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => { await apiRequest('PUT', `/api/notifications/${userId}/read-all`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications', userId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (notifId: string) => { await apiRequest('DELETE', `/api/notifications/${notifId}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications', userId] }),
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (Platform.OS === 'web' && notifications.length === 0 && !isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>Notifications</Text>
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Your notifications will appear here.</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + webTop }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable
            style={s.markAllBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); markAllReadMutation.mutate(); }}
          >
            <Text style={s.markAllText}>Read All</Text>
          </Pressable>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {/* Unread banner */}
      {unreadCount > 0 && (
        <View style={s.unreadBanner}>
          <Ionicons name="notifications" size={16} color={CultureTokens.indigo} />
          <Text style={s.unreadText}>
            {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={s.empty}>
          <ActivityIndicator size="large" color={CultureTokens.indigo} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconBg}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.textSecondary} />
          </View>
          <Text style={s.emptyText}>No notifications yet</Text>
          <Text style={s.emptySub}>We&apos;ll let you know when something happens</Text>
        </View>
      ) : (
        <ScrollView
          style={s.list}
          contentContainerStyle={{ paddingBottom: 40 + (Platform.OS === 'web' ? 34 : insets.bottom), paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((notif) => {
            const typeInfo = NOTIF_TYPE_INFO[notif.type] ?? NOTIF_TYPE_INFO.system;
            return (
              <Pressable
                key={notif.id}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (!notif.isRead) markReadMutation.mutate(notif.id); }}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert('Delete Notification', 'Remove this notification?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(notif.id) },
                  ]);
                }}
                style={[
                  s.notifCard,
                  !notif.isRead && s.notifCardUnread,
                ]}
              >
                <View style={[s.notifIcon, { backgroundColor: typeInfo.color + '15' }]}> 
                  <Ionicons name={typeInfo.icon as never} size={22} color={typeInfo.color} />
                </View>
                <View style={s.notifContent}>
                  <View style={s.notifHeader}>
                    <Text
                      style={[s.notifTitle, !notif.isRead && s.notifTitleUnread]}
                      numberOfLines={1}
                    >
                      {notif.title}
                    </Text>
                    {!notif.isRead && <View style={s.unreadDot} />}
                  </View>
                  <Text style={[s.notifMessage, !notif.isRead && { color: colors.textSecondary }]} numberOfLines={2}>{notif.message}</Text>
                  {notif.createdAt && <Text style={s.notifTime}>{timeAgo(notif.createdAt)}</Text>}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.borderLight },
  headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: colors.text },
  markAllBtn:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: CultureTokens.indigo + '20' },
  markAllText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.indigo },

  unreadBanner:{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22, paddingVertical: 14, marginHorizontal: 20, marginBottom: 12, borderRadius: 16, backgroundColor: CultureTokens.indigo + '15', borderWidth: 1, borderColor: CultureTokens.indigo + '30' },
  unreadText:  { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.indigo },

  list:        { flex: 1, paddingHorizontal: 20 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptyIconBg: { width: 100, height: 100, borderRadius: 30, backgroundColor: colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyText:   { fontSize: 18, fontFamily: 'Poppins_700Bold', color: colors.text, marginBottom: 6 },
  emptySub:    { fontSize: 14, fontFamily: 'Poppins_400Regular', color: colors.textSecondary, textAlign: 'center' },

  notifCard:       { flexDirection: 'row', gap: 14, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface, marginBottom: 10 },
  notifCardUnread: { borderColor: CultureTokens.indigo + '40', backgroundColor: CultureTokens.indigo + '10' },
  notifIcon:       { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notifContent:    { flex: 1 },
  notifHeader:     { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle:      { fontSize: 15, fontFamily: 'Poppins_500Medium', color: colors.text, flex: 1 },
  notifTitleUnread:{ fontFamily: 'Poppins_700Bold' },
  unreadDot:       { width: 10, height: 10, borderRadius: 5, marginLeft: 10, backgroundColor: CultureTokens.indigo, marginTop: 4 },
  notifMessage:    { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 20, color: colors.textSecondary, marginBottom: 8 },
  notifTime:       { fontSize: 12, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },
});
