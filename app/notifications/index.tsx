import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useAuth } from '@/lib/auth';
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

const NOTIF_TYPE_INFO: Record<string, { icon: string; colorKey: 'info' | 'accent' | 'secondary' | 'success' | 'warning' | 'primary' }> = {
  system:    { icon: 'settings',    colorKey: 'info' },
  event:     { icon: 'calendar',    colorKey: 'accent' },
  perk:      { icon: 'gift',        colorKey: 'secondary' },
  community: { icon: 'people',      colorKey: 'success' },
  payment:   { icon: 'wallet',      colorKey: 'success' },
  follow:    { icon: 'person-add',  colorKey: 'warning' },
  review:    { icon: 'star',        colorKey: 'primary' },
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
  const colors = useColors();
  const { userId } = useAuth();

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

  const resolveTypeColor = (colorKey: 'info' | 'accent' | 'secondary' | 'success' | 'warning' | 'primary'): string => {
    if (colorKey === 'info') return colors.info;
    if (colorKey === 'accent') return colors.accent;
    if (colorKey === 'secondary') return colors.secondary;
    if (colorKey === 'success') return colors.success;
    if (colorKey === 'warning') return colors.warning;
    return colors.primary;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Fallback for web navigation: show a simple message if no notifications
  if (Platform.OS === 'web' && notifications.length === 0 && !isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2C2A72' }}>Notifications</Text>
        <Text style={{ marginTop: 12, color: '#636366' }}>Your notifications will appear here.</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable
            style={[s.markAllBtn, { backgroundColor: colors.primaryGlow }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); markAllReadMutation.mutate(); }}
          >
            <Text style={[s.markAllText, { color: colors.primary }]}>Read All</Text>
          </Pressable>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      {/* Unread banner */}
      {unreadCount > 0 && (
        <View style={[s.unreadBanner, { backgroundColor: colors.primaryGlow }]}>
          <Ionicons name="notifications" size={15} color={colors.primary} />
          <Text style={[s.unreadText, { color: colors.primary }]}>
            {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <ScrollView
        style={s.list}
        contentContainerStyle={{ paddingBottom: 40 + (Platform.OS === 'web' ? 34 : insets.bottom) }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={s.empty}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={52} color={colors.textSecondary} />
            <Text style={[s.emptyText, { color: colors.text }]}>No notifications yet</Text>
            <Text style={[s.emptySub, { color: colors.text }]}>We&apos;ll let you know when something happens</Text>
          </View>
        ) : (
          notifications.map((notif) => {
            const typeInfo = NOTIF_TYPE_INFO[notif.type] ?? NOTIF_TYPE_INFO.system;
            const typeColor = resolveTypeColor(typeInfo.colorKey);
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
                  { backgroundColor: colors.surface, borderColor: colors.borderLight },
                  !notif.isRead && { borderColor: colors.primary + '35', backgroundColor: colors.primaryGlow },
                ]}
              >
                <View style={[s.notifIcon, { backgroundColor: typeColor + '15' }]}> 
                  <Ionicons name={typeInfo.icon as never} size={20} color={typeColor} />
                </View>
                <View style={s.notifContent}>
                  <View style={s.notifHeader}>
                    <Text
                      style={[s.notifTitle, { color: colors.text }, !notif.isRead && { fontFamily: 'Poppins_600SemiBold' }]}
                      numberOfLines={1}
                    >
                      {notif.title}
                    </Text>
                    {!notif.isRead && <View style={[s.unreadDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[s.notifMessage, { color: colors.text }]} numberOfLines={2}>{notif.message}</Text>
                  {notif.createdAt && <Text style={[s.notifTime, { color: colors.textSecondary }]}>{timeAgo(notif.createdAt)}</Text>}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  markAllBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  markAllText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },

  unreadBanner:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, marginHorizontal: 16, marginBottom: 8, borderRadius: 12 },
  unreadText:  { fontSize: 13, fontFamily: 'Poppins_500Medium' },

  list:        { flex: 1, paddingHorizontal: 16 },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText:   { fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  emptySub:    { fontSize: 13, fontFamily: 'Poppins_400Regular' },

  notifCard:    { flexDirection: 'row', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 8 },
  notifIcon:    { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1 },
  notifHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  notifTitle:   { fontSize: 14, fontFamily: 'Poppins_500Medium', flex: 1 },
  unreadDot:    { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  notifMessage: { fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 18, marginBottom: 4 },
  notifTime:    { fontSize: 11, fontFamily: 'Poppins_400Regular' },
});
