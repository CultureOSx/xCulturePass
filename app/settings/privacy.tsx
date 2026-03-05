import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Switch, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';
import { api } from '@/lib/api';

const PRIVACY_SETTINGS = [
  { key: 'profileVisibility', title: 'Profile Visibility', description: 'When enabled, your profile is public and visible to all users. Disable to make it private.',                   icon: 'eye'       as const, colorKey: 'secondary' as const },
  { key: 'dataSharing',       title: 'Data Sharing',       description: 'Allow CulturePass to share anonymized usage data to improve the platform experience',                         icon: 'analytics' as const, colorKey: 'info' as const },
  { key: 'activityStatus',    title: 'Activity Status',    description: 'Show other users when you are online or recently active on the platform',                                     icon: 'pulse'     as const, colorKey: 'success' as const },
  { key: 'showLocation',      title: 'Show Location',      description: 'Display your city and country on your public profile for others to see',                                     icon: 'location'  as const, colorKey: 'accent' as const },
];

interface PrivacySettings {
  profileVisibility: boolean;
  dataSharing: boolean;
  activityStatus: boolean;
  showLocation: boolean;
}

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const webTop = 0;
  const colors = useColors();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const resolveColor = (key: 'secondary' | 'info' | 'success' | 'accent'): string => {
    if (key === 'secondary') return colors.secondary;
    if (key === 'info') return colors.info;
    if (key === 'success') return colors.success;
    return colors.accent;
  };

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/privacy/settings', userId],
    enabled: !!userId,
    queryFn: (): Promise<PrivacySettings> => api.privacy.get(userId!) as Promise<PrivacySettings>,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<PrivacySettings>) => api.privacy.update(userId!, updates),
    onSuccess: (data) => { queryClient.setQueryData(['/api/privacy/settings', userId], data); },
  });

  const deleteMutation = useMutation({
    mutationFn: (_password: string) => api.account.delete(userId!),
    onSuccess: () => { logout(); router.replace('/(onboarding)'); },
    onError: (e: Error) => { setDeleteError(e.message); },
  });

  const toggleSetting = (key: string) => {
    if (!settings) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !settings[key as keyof PrivacySettings];
    updateMutation.mutate({ [key]: newValue });
    queryClient.setQueryData(['/api/privacy/settings', userId], { ...settings, [key]: newValue });
  };

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data, tickets, and wallet balance will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => { setDeletePassword(''); setDeleteError(''); setShowDeleteConfirm(true); } },
      ]
    );
  };

  const handleConfirmDelete = () => {
    if (!deletePassword.trim()) { setDeleteError('Please enter your password to confirm.'); return; }
    deleteMutation.mutate(deletePassword);
  };

  const current: PrivacySettings = settings ?? { profileVisibility: true, dataSharing: false, activityStatus: true, showLocation: true };

  return (
    <View style={[s.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 + (Platform.OS === 'web' ? 34 : insets.bottom) }}>
        {/* Hero */}
        <LinearGradient colors={[colors.secondary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroCard}>
          <View style={s.heroIconWrap}>
            <Ionicons name="shield-checkmark" size={30} color={colors.textInverse} />
          </View>
          <Text style={[s.heroTitle, { color: colors.textInverse }]}>Privacy Settings</Text>
          <Text style={[s.heroSub, { color: colors.textInverse }]}>Control how your data and profile are shared</Text>
        </LinearGradient>

        <View style={s.section}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            PRIVACY_SETTINGS.map((item) => (
              <View key={item.key} style={[s.settingCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}> 
                <View style={s.settingRow}>
                  <View style={[s.settingIcon, { backgroundColor: resolveColor(item.colorKey) + '15' }]}> 
                    <Ionicons name={item.icon} size={20} color={resolveColor(item.colorKey)} />
                  </View>
                  <View style={s.settingInfo}>
                    <Text style={[s.settingTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[s.settingDesc, { color: colors.text }]}>{item.description}</Text>
                  </View>
                  <Switch
                    value={current[item.key as keyof PrivacySettings]}
                    onValueChange={() => toggleSetting(item.key)}
                    trackColor={{ false: colors.border, true: colors.primary + '60' }}
                    thumbColor={current[item.key as keyof PrivacySettings] ? colors.primary : colors.surface}
                  />
                </View>
                {item.key === 'profileVisibility' && (
                  <View style={[s.statusBadge, { backgroundColor: colors.backgroundSecondary }]}>
                    <View style={[s.statusDot, { backgroundColor: current.profileVisibility ? colors.success : colors.textSecondary }]} />
                    <Text style={[s.statusText, { color: colors.text }]}>{current.profileVisibility ? 'Public' : 'Private'}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Danger zone */}
        <View style={s.dangerSection}>
          <Text style={[s.dangerLabel, { color: colors.error }]}>Danger Zone</Text>
          {showDeleteConfirm ? (
            <View style={[s.deleteConfirmCard, { backgroundColor: colors.surface, borderColor: colors.error + '40' }]}>
              <Text style={[s.deleteConfirmTitle, { color: colors.error }]}>Confirm Account Deletion</Text>
              <Text style={[s.deleteConfirmDesc, { color: colors.text }]}> 
                Enter your password to permanently delete your account. This cannot be undone.
              </Text>
              <TextInput
                style={[s.passwordInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={deletePassword}
                onChangeText={(v) => { setDeletePassword(v); setDeleteError(''); }}
                autoCapitalize="none"
              />
              {deleteError ? <Text style={[s.deleteError, { color: colors.error }]}>{deleteError}</Text> : null}
              <View style={s.deleteConfirmRow}>
                <Pressable
                  style={[s.cancelBtn, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  <Text style={[s.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[s.deleteConfirmBtn, deleteMutation.isPending && { opacity: 0.6 }, { backgroundColor: colors.error }]}
                  onPress={handleConfirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending
                    ? <ActivityIndicator color={colors.textInverse} size="small" />
                    : <Text style={[s.deleteConfirmBtnText, { color: colors.textInverse }]}>Delete Forever</Text>
                  }
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={[s.deleteBtn, { backgroundColor: colors.error }]} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
              <Text style={[s.deleteBtnText, { color: colors.textInverse }]}>Delete Account</Text>
            </Pressable>
          )}
          <Text style={[s.dangerNote, { color: colors.textSecondary }]}> 
            This will permanently delete your account and all associated data including tickets, wallet balance, and community memberships.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:      { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle:  { fontSize: 18, fontFamily: 'Poppins_700Bold' },

  heroCard:     { marginHorizontal: 16, marginBottom: 24, borderRadius: 20, padding: 24, alignItems: 'center' },
  heroIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle:    { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 6 },
  heroSub:      { fontSize: 13, fontFamily: 'Poppins_400Regular', textAlign: 'center' },

  section:      { paddingHorizontal: 16, marginBottom: 24, gap: 10 },
  settingCard:  { borderRadius: 16, padding: 16, borderWidth: 1 },
  settingRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingInfo:  { flex: 1 },
  settingTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  settingDesc:  { fontSize: 12, fontFamily: 'Poppins_400Regular', lineHeight: 17 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginLeft: 52, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusDot:    { width: 8, height: 8, borderRadius: 4 },
  statusText:   { fontSize: 12, fontFamily: 'Poppins_500Medium' },

  dangerSection:{ paddingHorizontal: 16, marginTop: 8, marginBottom: 24 },
  dangerLabel:  { fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: 12 },
  deleteBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, padding: 16 },
  deleteBtnText:{ fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  dangerNote:   { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 10, lineHeight: 18 },

  deleteConfirmCard:{ borderRadius: 16, padding: 20, borderWidth: 1 },
  deleteConfirmTitle:{ fontSize: 16, fontFamily: 'Poppins_700Bold', marginBottom: 6 },
  deleteConfirmDesc:{ fontSize: 13, fontFamily: 'Poppins_400Regular', marginBottom: 16, lineHeight: 18 },
  passwordInput:{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Poppins_400Regular', borderWidth: 1, marginBottom: 8 },
  deleteError:  { fontSize: 13, fontFamily: 'Poppins_500Medium', marginBottom: 8 },
  deleteConfirmRow:{ flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn:    { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 12, borderWidth: 1 },
  cancelBtnText:{ fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
  deleteConfirmBtn:{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 12 },
  deleteConfirmBtnText:{ fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
});
