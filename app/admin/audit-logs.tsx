import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useColors } from '@/hooks/useColors';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api, type AdminAuditLog } from '@/lib/api';

const ACTION_OPTIONS = [
  'notifications.targeted.dry_run',
  'notifications.targeted.send',
] as const;

export default function AdminAuditLogsScreen() {
  const insets = useSafeAreaInsets();
  const webTop = Platform.OS === 'web' ? 0 : 0;
  const colors = useColors();
  const { user } = useAuth();
  const { hasMinRole, isLoading: roleLoading } = useRole();
  const canAccess = hasMinRole('cityAdmin');
  const isCityAdmin = user?.role === 'cityAdmin';

  const [action, setAction] = useState('');
  const [limitText, setLimitText] = useState('50');

  useEffect(() => {
    if (!roleLoading && !canAccess) {
      router.replace('/(tabs)');
    }
  }, [canAccess, roleLoading]);

  const limit = useMemo(() => {
    const parsed = Number(limitText);
    if (!Number.isFinite(parsed) || parsed < 1) return 50;
    return Math.min(parsed, 200);
  }, [limitText]);

  const logsQuery = useQuery({
    queryKey: ['admin-audit-logs', action, limit, user?.id, isCityAdmin],
    queryFn: () => api.admin.auditLogs({
      action: action || undefined,
      limit,
      actorId: isCityAdmin ? user?.id : undefined,
    }),
    enabled: canAccess,
  });

  if (roleLoading || (!canAccess && !roleLoading)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const logs = logsQuery.data?.logs ?? [];

  const handleExportCsv = async () => {
    try {
      const csv = await api.admin.auditLogsCsv({
        action: action || undefined,
        limit,
        actorId: isCityAdmin ? user?.id : undefined,
      });
      await Share.share({
        title: 'CulturePass Admin Audit Logs',
        message: csv,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export CSV';
      Alert.alert('Export failed', message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + webTop }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Audit Logs</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Campaign dry-runs and sends</Text>
        </View>
      </View>

      <View style={[styles.filtersCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
        <Input
          label="Action Filter"
          placeholder="notifications.targeted.send"
          value={action}
          onChangeText={setAction}
          leftIcon="funnel-outline"
          hint={`Options: ${ACTION_OPTIONS.join(', ')}`}
        />
        <Input
          label="Limit"
          keyboardType="numeric"
          value={limitText}
          onChangeText={setLimitText}
          leftIcon="list-outline"
          hint="1 to 200"
        />
        <Button variant="outline" onPress={() => logsQuery.refetch()} loading={logsQuery.isFetching}>
          Refresh
        </Button>
        <Button variant="ghost" onPress={handleExportCsv} loading={logsQuery.isFetching}>
          Export CSV
        </Button>
      </View>

      {logsQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 + insets.bottom, gap: 10 }}
          renderItem={({ item }) => (
            <AuditLogRow item={item} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={42} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No audit logs found</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function AuditLogRow({ item }: { item: AdminAuditLog }) {
  const colors = useColors();

  return (
    <View style={[styles.logCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.logHeader}>
        <Text style={[styles.logAction, { color: colors.text }]}>{item.action}</Text>
        <Text style={[styles.logDate, { color: colors.textTertiary }]}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
      <Text style={[styles.logMeta, { color: colors.textSecondary }]}>Actor: {item.actorId} ({item.actorRole})</Text>
      <Text style={[styles.logMeta, { color: colors.textSecondary }]}>Endpoint: {item.endpoint}</Text>
      <Text style={[styles.logMeta, { color: colors.textSecondary }]}>Targeted users: {item.targetedCount}</Text>
      <Text style={[styles.logMeta, { color: colors.textSecondary }]}>Mode: {item.dryRun ? 'Dry Run' : 'Sent'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
  },
  headerSub: {
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },
  filtersCard: {
    margin: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  logCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  logAction: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    flex: 1,
  },
  logDate: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
  },
  logMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 40,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
  },
});
