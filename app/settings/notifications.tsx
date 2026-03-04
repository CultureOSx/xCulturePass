import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useColors } from '@/hooks/useColors';

const NOTIFICATION_SETTINGS = [
  { key: 'eventReminders',   title: 'Event Reminders',    description: "Get notified about upcoming events you're interested in or have tickets for",          icon: 'calendar' as const, colorKey: 'accent' as const },
  { key: 'communityUpdates', title: 'Community Updates',  description: 'Stay informed about new posts, events, and announcements from your communities',       icon: 'people'   as const, colorKey: 'secondary' as const },
  { key: 'perkAlerts',       title: 'Perk Alerts',        description: 'Be the first to know about new perks, discounts, and exclusive offers',               icon: 'gift'     as const, colorKey: 'warning' as const },
  { key: 'marketingEmails',  title: 'Marketing Emails',   description: 'Receive newsletters, promotions, and personalized recommendations via email',         icon: 'mail'     as const, colorKey: 'info' as const },
];

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const webTop = 0;
  const colors = useColors();
  const [settings, setSettings] = useState<Record<string, boolean>>({
    eventReminders:   true,
    communityUpdates: true,
    perkAlerts:       true,
    marketingEmails:  false,
  });

  const toggle = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resolveColor = (key: 'accent' | 'secondary' | 'warning' | 'info'): string => {
    if (key === 'accent') return colors.accent;
    if (key === 'secondary') return colors.secondary;
    if (key === 'warning') return colors.warning;
    return colors.info;
  };

  return (
    <View style={[s.container, { paddingTop: insets.top + webTop, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 + (Platform.OS === 'web' ? 34 : insets.bottom) }}>
        {/* Hero */}
        <LinearGradient colors={[colors.warning, colors.error]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroCard}>
          <View style={s.heroIconWrap}>
            <Ionicons name="notifications" size={30} color={colors.textInverse} />
          </View>
          <Text style={[s.heroTitle, { color: colors.textInverse }]}>Notification Preferences</Text>
          <Text style={[s.heroSub, { color: colors.textInverse }]}>Choose what updates you want to receive</Text>
        </LinearGradient>

        <View style={s.section}>
          {NOTIFICATION_SETTINGS.map((item) => (
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
                  value={settings[item.key]}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={settings[item.key] ? colors.primary : colors.surface}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={s.note}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={[s.noteText, { color: colors.textSecondary }]}> 
            You can change these preferences at any time. Critical account and security notifications will always be sent.
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

  note:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 24, marginTop: 8 },
  noteText: { flex: 1, fontSize: 12, fontFamily: 'Poppins_400Regular', lineHeight: 18 },
});
