import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useColors } from '@/hooks/useColors';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { interestCategories } from '@/constants/onboardingInterests';
import type { NotificationType } from '@/shared/schema';

type CampaignNotificationType = Extract<NotificationType, 'recommendation' | 'system' | 'event' | 'perk' | 'community'>;

interface CampaignFormState {
  title: string;
  message: string;
  type: CampaignNotificationType;
  city: string;
  country: string;
  interestsAny: string;
  communitiesAny: string;
  languagesAny: string;
  categoryIdsAny: string;
  ethnicityContains: string;
  limit: string;
}

interface TargetedResult {
  dryRun: boolean;
  targetedCount: number;
  audiencePreview: Array<{ userId: string; city: string; country: string }>;
  idempotentReplay?: boolean;
  approvalToken?: string;
  approvalExpiresAt?: string;
}

const TYPE_OPTIONS: CampaignNotificationType[] = ['recommendation', 'event', 'perk', 'community', 'system'];

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item, index, arr) => item.length > 0 && item.length <= 80 && arr.indexOf(item) === index)
    .slice(0, 25);
}

export default function AdminNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const webTop = Platform.OS === 'web' ? 0 : 0;
  const colors = useColors();
  const { user } = useAuth();
  const { hasMinRole, isLoading: roleLoading } = useRole();
  const canAccess = hasMinRole('cityAdmin');
  const isCityAdmin = user?.role === 'cityAdmin';

  const [form, setForm] = useState<CampaignFormState>({
    title: '',
    message: '',
    type: 'recommendation',
    city: '',
    country: 'Australia',
    interestsAny: '',
    communitiesAny: '',
    languagesAny: '',
    categoryIdsAny: '',
    ethnicityContains: '',
    limit: '200',
  });
  const [result, setResult] = useState<TargetedResult | null>(null);
  const [approval, setApproval] = useState<{ token: string; expiresAt: string } | null>(null);
  const [localApprovalRemainingMs, setLocalApprovalRemainingMs] = useState(0);

  useEffect(() => {
    if (!isCityAdmin) return;
    setForm((prev) => ({
      ...prev,
      city: user?.city ?? prev.city,
      country: user?.country ?? prev.country,
    }));
  }, [isCityAdmin, user?.city, user?.country]);

  useEffect(() => {
    setApproval(null);
  }, [
    form.title,
    form.message,
    form.type,
    form.city,
    form.country,
    form.interestsAny,
    form.communitiesAny,
    form.languagesAny,
    form.categoryIdsAny,
    form.ethnicityContains,
    form.limit,
  ]);

  useEffect(() => {
    if (!approval) {
      setLocalApprovalRemainingMs(0);
      return;
    }

    const tick = () => {
      const remaining = new Date(approval.expiresAt).getTime() - Date.now();
      setLocalApprovalRemainingMs(Math.max(0, remaining));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [approval]);

  const approvalStatusQuery = useQuery({
    queryKey: ['campaign-approval-status', approval?.token],
    queryFn: () => api.notifications.approvalStatus({ approvalToken: approval!.token }),
    enabled: Boolean(approval?.token),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!approval) return;
    if (!approvalStatusQuery.data) return;
    if (!approvalStatusQuery.data.valid) {
      setApproval(null);
    }
  }, [approval, approvalStatusQuery.data]);

  useEffect(() => {
    if (!roleLoading && !canAccess) {
      router.replace('/(tabs)');
    }
  }, [canAccess, roleLoading]);

  const categoryHint = useMemo(
    () => interestCategories.map((category) => category.id).join(', '),
    []
  );

  const runCampaign = useMutation({
    mutationFn: async ({ dryRun, idempotencyKey, approvalToken }: { dryRun: boolean; idempotencyKey?: string; approvalToken?: string }) => {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        idempotencyKey,
        approvalToken,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
        interestsAny: parseCsv(form.interestsAny),
        communitiesAny: parseCsv(form.communitiesAny),
        languagesAny: parseCsv(form.languagesAny),
        categoryIdsAny: parseCsv(form.categoryIdsAny),
        ethnicityContains: form.ethnicityContains.trim() || undefined,
        dryRun,
        limit: Number.isFinite(Number(form.limit)) ? Number(form.limit) : 200,
      };

      return api.notifications.targeted(payload);
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.dryRun && data.approvalToken && data.approvalExpiresAt) {
        setApproval({ token: data.approvalToken, expiresAt: data.approvalExpiresAt });
      }
      if (!data.dryRun) {
        setApproval(null);
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to process campaign';
      Alert.alert('Campaign Error', message);
    },
  });

  const validateAndRun = (dryRun: boolean) => {
    if (!form.title.trim() || !form.message.trim()) {
      Alert.alert('Missing fields', 'Title and message are required.');
      return;
    }

    const parsedLimit = Number(form.limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) {
      Alert.alert('Invalid limit', 'Audience limit must be between 1 and 500.');
      return;
    }

    if (!dryRun) {
      if (!approval?.token) {
        Alert.alert('Approval required', 'Run a dry run first to generate an approval token.');
        return;
      }

      if (approvalStatusQuery.data && !approvalStatusQuery.data.valid) {
        Alert.alert('Approval expired', 'The approval token is no longer valid. Run dry run again.');
        return;
      }

      if (new Date(approval.expiresAt).getTime() <= Date.now()) {
        Alert.alert('Approval expired', 'The dry-run approval token expired. Run dry run again before send.');
        return;
      }
    }

    const idempotencyKey = dryRun
      ? undefined
      : `cp-campaign-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    runCampaign.mutate({ dryRun, idempotencyKey, approvalToken: dryRun ? undefined : approval?.token });
  };

  if (roleLoading || (!canAccess && !roleLoading)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}> 
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const serverRemainingMs = approvalStatusQuery.data?.remainingMs;
  const remainingMs = typeof serverRemainingMs === 'number' ? serverRemainingMs : localApprovalRemainingMs;
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const countdownLabel = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = remainingSeconds <= 0;
  const isWarning = !isExpired && remainingSeconds <= 60;
  const approvalBadgeBackground = isExpired ? colors.error : isWarning ? colors.warning : colors.primaryGlow;
  const approvalBadgeTextColor = isExpired ? '#FFFFFF' : isWarning ? '#1A1A1A' : colors.primary;

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Campaign Targeting</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Dry run and send notifications</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          style={[styles.toolsLink, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/admin/users' as never)}
        >
          <View style={[styles.toolsIconWrap, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="people-outline" size={18} color={colors.error} />
          </View>
          <View style={styles.toolsTextWrap}>
            <Text style={[styles.toolsTitle, { color: colors.text }]}>Manage User Roles</Text>
            <Text style={[styles.toolsSub, { color: colors.textSecondary }]}>Open admin panel for role assignment</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </Pressable>

        <Pressable
          style={[styles.toolsLink, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/admin/audit-logs' as never)}
        >
          <View style={[styles.toolsIconWrap, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="document-text-outline" size={18} color={colors.info} />
          </View>
          <View style={styles.toolsTextWrap}>
            <Text style={[styles.toolsTitle, { color: colors.text }]}>Campaign Audit Logs</Text>
            <Text style={[styles.toolsSub, { color: colors.textSecondary }]}>Review send and dry-run history</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </Pressable>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.cardTitle, { color: colors.text }]}>Notification Content</Text>

          <Input
            label="Title"
            placeholder="e.g. New Diwali events this weekend"
            value={form.title}
            onChangeText={(value) => setForm((prev) => ({ ...prev, title: value }))}
            leftIcon="notifications-outline"
          />
          <Input
            label="Message"
            placeholder="Write the push body"
            value={form.message}
            onChangeText={(value) => setForm((prev) => ({ ...prev, message: value }))}
            leftIcon="chatbubble-outline"
          />
          <Input
            label="Type"
            value={form.type}
            editable={false}
            hint={`Options: ${TYPE_OPTIONS.join(', ')}`}
            leftIcon="pricetag-outline"
          />
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((option) => {
              const active = form.type === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setForm((prev) => ({ ...prev, type: option }))}
                  style={[
                    styles.typeChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primaryGlow : colors.surfaceElevated,
                    },
                  ]}
                >
                  <Text style={[styles.typeChipLabel, { color: active ? colors.primary : colors.textSecondary }]}> 
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.cardTitle, { color: colors.text }]}>Audience Filters</Text>

          <Input
            label="City"
            placeholder="Sydney"
            value={form.city}
            onChangeText={(value) => setForm((prev) => ({ ...prev, city: value }))}
            editable={!isCityAdmin}
            hint={isCityAdmin ? 'City scope is fixed from your admin role.' : undefined}
            leftIcon="location-outline"
          />
          <Input
            label="Country"
            placeholder="Australia"
            value={form.country}
            onChangeText={(value) => setForm((prev) => ({ ...prev, country: value }))}
            editable={!isCityAdmin}
            leftIcon="flag-outline"
          />
          <Input
            label="Interests (comma separated)"
            placeholder="Business Networking, Food Festivals"
            value={form.interestsAny}
            onChangeText={(value) => setForm((prev) => ({ ...prev, interestsAny: value }))}
            leftIcon="heart-outline"
          />
          <Input
            label="Communities (comma separated)"
            placeholder="Indian, Chinese"
            value={form.communitiesAny}
            onChangeText={(value) => setForm((prev) => ({ ...prev, communitiesAny: value }))}
            leftIcon="people-outline"
          />
          <Input
            label="Languages (comma separated)"
            placeholder="Hindi, Mandarin"
            value={form.languagesAny}
            onChangeText={(value) => setForm((prev) => ({ ...prev, languagesAny: value }))}
            leftIcon="language-outline"
          />
          <Input
            label="Interest Category IDs"
            placeholder="cultural, food"
            value={form.categoryIdsAny}
            onChangeText={(value) => setForm((prev) => ({ ...prev, categoryIdsAny: value }))}
            hint={`Available: ${categoryHint}`}
            leftIcon="list-outline"
          />
          <Input
            label="Ethnicity contains"
            placeholder="South Asian"
            value={form.ethnicityContains}
            onChangeText={(value) => setForm((prev) => ({ ...prev, ethnicityContains: value }))}
            leftIcon="person-outline"
          />
          <Input
            label="Audience limit"
            placeholder="200"
            keyboardType="numeric"
            value={form.limit}
            onChangeText={(value) => setForm((prev) => ({ ...prev, limit: value }))}
            leftIcon="options-outline"
          />
        </View>

        <View style={styles.actionsRow}>
          {approval ? (
            <View style={[styles.approvalBadge, { backgroundColor: approvalBadgeBackground }]}> 
              <Ionicons name="time-outline" size={14} color={approvalBadgeTextColor} />
              <Text style={[styles.approvalBadgeText, { color: approvalBadgeTextColor }]}>
                {isExpired ? 'Approval expired' : isWarning ? `Approval expiring ${countdownLabel}` : `Approval ${countdownLabel}`}
              </Text>
            </View>
          ) : (
            <Text style={[styles.resultText, { color: colors.textTertiary }]}>Run dry run to generate signed approval before send.</Text>
          )}
          <Button
            variant="outline"
            fullWidth
            loading={runCampaign.isPending}
            onPress={() => validateAndRun(true)}
          >
            Dry Run
          </Button>
          <Button
            variant="primary"
            fullWidth
            loading={runCampaign.isPending}
            onPress={() =>
              Alert.alert(
                'Send Campaign',
                'This sends notifications to the targeted audience now. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Send', style: 'destructive', onPress: () => validateAndRun(false) },
                ]
              )
            }
          >
            Send Now
          </Button>
        </View>

        {result ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.cardTitle, { color: colors.text }]}>Result</Text>
            <Text style={[styles.resultText, { color: colors.textSecondary }]}>Mode: {result.dryRun ? 'Dry Run' : 'Sent'}</Text>
            <Text style={[styles.resultText, { color: colors.textSecondary }]}>Targeted users: {result.targetedCount}</Text>
            {result.idempotentReplay ? (
              <Text style={[styles.resultText, { color: colors.warning }]}>Replay detected: duplicate send prevented by idempotency.</Text>
            ) : null}

            {result.audiencePreview.length > 0 ? (
              <View style={styles.previewWrap}>
                <Text style={[styles.previewTitle, { color: colors.text }]}>Audience preview</Text>
                {result.audiencePreview.map((item) => (
                  <View key={item.userId} style={[styles.previewRow, { borderBottomColor: colors.borderLight }]}> 
                    <Text style={[styles.previewUser, { color: colors.text }]} numberOfLines={1}>{item.userId}</Text>
                    <Text style={[styles.previewMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                      {item.city || '—'} · {item.country || '—'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.resultText, { color: colors.textTertiary }]}>No users matched this filter.</Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  content: {
    padding: 14,
    paddingBottom: 28,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  toolsLink: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toolsIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsTextWrap: {
    flex: 1,
  },
  toolsTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  toolsSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  actionsRow: {
    gap: 10,
  },
  approvalBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  approvalBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typeChipLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  resultText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
  },
  previewWrap: {
    marginTop: 8,
    gap: 8,
  },
  previewTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  previewRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewUser: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
  previewMeta: {
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },
});