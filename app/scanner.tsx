import {
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  Alert,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  Vibration,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { goBackOrReplace } from '@/lib/navigation';
import * as Haptics from 'expo-haptics';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useContacts } from '@/contexts/ContactsContext';
import { api } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthGuard } from '@/components/AuthGuard';
import { useColors } from '@/hooks/useColors';
import { CultureTokens } from '@/constants/theme';

import { getStyles } from '@/components/scanner/Scanner.styles';
import {
  ScanMode,
  TicketScanResult,
  CulturePassContact,
  SessionStats,
} from '@/components/scanner/types';
import {
  INITIAL_STATS,
  getOutcomeConfig,
  parseCulturePassInput,
} from '@/components/scanner/utils';
import { TicketResultCard } from '@/components/scanner/TicketResultCard';

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  
  const { isOrganizer } = useRole();
  const canUseStaffScanner = isOrganizer;

  // Render static glass styles since we migrated out of theme
  const colors = useColors();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [mode, setMode] = useState<ScanMode>('culturepass');

  useEffect(() => {
    if (!canUseStaffScanner && mode === 'tickets') {
      setMode('culturepass');
    }
  }, [canUseStaffScanner, mode]);

  const [ticketCode, setTicketCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [ticketResult, setTicketResult] = useState<TicketScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<TicketScanResult[]>([]);
  const [ticketCameraActive, setTicketCameraActive] = useState(false);
  const [session, setSession] = useState<SessionStats>({ ...INITIAL_STATS, startedAt: new Date() });
  const ticketLastScanned = useRef('');

  const [cpInput, setCpInput] = useState('');
  const [cpContact, setCpContact] = useState<CulturePassContact | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [cpCameraActive, setCpCameraActive] = useState(false);
  const cpLastScanned = useRef('');

  const [permission, requestPermission] = useCameraPermissions();
  const { addContact, isContactSaved } = useContacts();

  const TIER_DISPLAY = useMemo((): Record<string, { label: string; color: string; icon: string }> => ({
    free:    { label: 'Free',    color: colors.textSecondary, icon: 'shield-outline' },
    plus:    { label: 'Plus',    color: CultureTokens.indigo,     icon: 'star' },
    premium: { label: 'Premium', color: CultureTokens.gold,       icon: 'diamond' },
    vip:     { label: 'VIP',     color: CultureTokens.saffron,    icon: 'diamond' },
  }), []);

  useEffect(() => {
    if (!ticketResult) ticketLastScanned.current = '';
  }, [ticketResult]);

  const ensureCameraPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      Alert.alert('Camera', 'Camera scanning works best on a physical device. Use manual input on web.');
      return false;
    }
    if (permission?.granted) return true;
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert('Camera Permission', 'Camera access is required to scan QR codes. Please enable it in your device settings.');
      return false;
    }
    return true;
  }, [permission, requestPermission]);

  const doTicketScan = useCallback(async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setIsScanning(true);
    Keyboard.dismiss();

    try {
      const data = await api.tickets.scan({ ticketCode: trimmed, scannedBy: 'staff' });
      const valid = data.valid !== false;

      const result: TicketScanResult = {
        valid,
        message: data.message || (valid ? 'Ticket accepted' : 'Invalid ticket'),
        outcome: (data.outcome as TicketScanResult['outcome']) ?? (valid ? 'accepted' : 'rejected'),
        ticket: (data.ticket as unknown as TicketScanResult['ticket']) ?? undefined,
      };

      setTicketResult(result);
      setScanHistory(prev => [result, ...prev.slice(0, 49)]);
      setSession(prev => ({
        ...prev,
        accepted:   prev.accepted   + (valid ? 1 : 0),
        duplicates: prev.duplicates + (!valid && result.outcome === 'duplicate' ? 1 : 0),
        rejected:   prev.rejected   + (!valid && result.outcome !== 'duplicate' ? 1 : 0),
      }));

      if (valid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result.outcome === 'duplicate') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        if (Platform.OS !== 'web') Vibration.vibrate([0, 100, 50, 100]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (Platform.OS !== 'web') Vibration.vibrate([0, 300]);
      }

      setTicketCode('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      const result: TicketScanResult = { valid: false, outcome: 'rejected', message: msg };
      setTicketResult(result);
      setScanHistory(prev => [result, ...prev.slice(0, 49)]);
      setSession(prev => ({ ...prev, rejected: prev.rejected + 1 }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsScanning(false);
      setTicketCameraActive(false);
    }
  }, []);

  const handleTicketBarcodeScanned = useCallback(({ data }: { data: string }) => {
    if (ticketLastScanned.current === data) return;
    ticketLastScanned.current = data;
    setTicketCameraActive(false);
    doTicketScan(data);
  }, [doTicketScan]);

  const handleManualTicketScan = useCallback(() => {
    if (!ticketCode.trim()) { Alert.alert('Enter Code', 'Please enter a ticket code.'); return; }
    doTicketScan(ticketCode);
  }, [ticketCode, doTicketScan]);

  const startTicketCamera = useCallback(async () => {
    const ok = await ensureCameraPermission();
    if (!ok) return;
    setTicketResult(null);
    ticketLastScanned.current = '';
    setTicketCameraActive(true);
  }, [ensureCameraPermission]);

  const resetSession = useCallback(() => {
    Alert.alert('Reset Session', 'Clear all scan history and reset stats?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => {
        setSession({ ...INITIAL_STATS, startedAt: new Date() });
        setScanHistory([]);
        setTicketResult(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }},
    ]);
  }, []);

  const lookupCpid = useCallback(async (cpid: string): Promise<CulturePassContact | null> => {
    try {
      const data = await api.cpid.lookup(cpid);
      if (data.userId || data.targetId) {
        const userId = data.userId || data.targetId!;
        const u = await api.users.get(userId) as unknown as Record<string, unknown>;
        return {
          cpid,
          name: String(u.displayName || u.username || ''),
          username: String(u.username || ''),
          tier: 'free',
          avatarUrl: String(u.avatarUrl || ''),
          city: String(u.city || ''),
          country: String(u.country || ''),
          bio: String(u.bio || ''),
          userId: String(u.id || ''),
        };
      }
      return data.name ? {
        cpid: data.cpid, name: data.name, username: data.username, tier: data.tier,
        org: data.org, avatarUrl: data.avatarUrl, city: data.city, country: data.country, bio: data.bio,
      } : null;
    } catch {
      return null;
    }
  }, []);

  const processScannedCpData = useCallback(async (input: string) => {
    if (cpLastScanned.current === input) return;
    cpLastScanned.current = input;
    const contact = parseCulturePassInput(input);
    if (!contact) return;

    setCpCameraActive(false);
    setIsLookingUp(true);
    if (contact.cpid && contact.cpid !== 'Unknown') {
      const full = await lookupCpid(contact.cpid);
      setCpContact(full ?? contact);
    } else {
      setCpContact(contact);
    }
    setIsLookingUp(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [lookupCpid]);

  const handleCpBarcodeScanned = useCallback(({ data }: { data: string }) => {
    processScannedCpData(data);
  }, [processScannedCpData]);

  const handleCpManualScan = useCallback(async () => {
    const input = cpInput.trim();
    if (!input) { Alert.alert('Enter Data', 'Enter a CulturePass ID or paste QR data.'); return; }
    Keyboard.dismiss();
    setIsLookingUp(true);
    const contact = parseCulturePassInput(input);
    if (contact) {
      if (contact.cpid && contact.cpid !== 'Unknown') {
        const full = await lookupCpid(contact.cpid);
        setCpContact(full ?? contact);
      } else {
        setCpContact(contact);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCpInput('');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid Data', 'Enter a CulturePass ID (CP-XXXXXX), JSON, or vCard data.');
    }
    setIsLookingUp(false);
  }, [cpInput, lookupCpid]);

  const startCpCamera = useCallback(async () => {
    const ok = await ensureCameraPermission();
    if (!ok) return;
    cpLastScanned.current = '';
    setCpCameraActive(true);
  }, [ensureCameraPermission]);

  const handleSaveContact = useCallback(() => {
    if (!cpContact) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addContact({ cpid: cpContact.cpid, name: cpContact.name, username: cpContact.username, tier: cpContact.tier, org: cpContact.org, avatarUrl: cpContact.avatarUrl, city: cpContact.city, country: cpContact.country, bio: cpContact.bio, userId: cpContact.userId });
    Alert.alert('Contact Saved', `${cpContact.name || cpContact.cpid} added to your CulturePass contacts.`);
  }, [cpContact, addContact]);

  const contactAlreadySaved = cpContact ? isContactSaved(cpContact.cpid) : false;

  const handleViewProfile = useCallback(() => {
    if (!cpContact) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!contactAlreadySaved) handleSaveContact();
    router.push({ pathname: '/contacts/[cpid]' as never, params: { cpid: cpContact.cpid } });
  }, [cpContact, contactAlreadySaved, handleSaveContact]);

  const sessionDuration = () => {
    const mins = Math.floor((Date.now() - session.startedAt.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const hintItems = useMemo(() => [
    { icon: 'finger-print',          color: CultureTokens.indigo,  label: 'CulturePass ID',  example: 'CP-123456' },
    { icon: 'code-slash',             color: CultureTokens.saffron, label: 'JSON QR Data',    example: '{"type":"culturepass_id","cpid":"CP-..."}' },
    { icon: 'document-text-outline',  color: CultureTokens.coral,   label: 'vCard Data',      example: 'BEGIN:VCARD...' },
  ], []);

  return (
    <AuthGuard icon="scan-outline" title="Scanner" message="Sign in to scan CulturePass QR cards and manage contacts.">
    <View style={[s.container, { paddingTop: topInset }]}>
      <LinearGradient colors={[CultureTokens.indigo + '40', colors.background]} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
      <View style={{ position: 'absolute', top: -50, right: -100, width: 350, height: 350, borderRadius: 175, backgroundColor: CultureTokens.indigo, opacity: 0.15, ...Platform.select({ web: { filter: 'blur(80px)' }, default: {} }) } as any} />
      <View style={{ position: 'absolute', top: 400, left: -100, width: 350, height: 350, borderRadius: 175, backgroundColor: CultureTokens.saffron, opacity: 0.1, ...Platform.select({ web: { filter: 'blur(100px)' }, default: {} }) } as any} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => goBackOrReplace('/(tabs)')} style={s.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>
          {mode === 'tickets' ? 'Staff Scanner' : 'Scanner'}
        </Text>
        <View style={s.headerRight}>
          {mode === 'tickets' ? (
            <Pressable style={s.headerBtn} onPress={resetSession}>
              <Ionicons name="refresh-outline" size={20} color={CultureTokens.error} />
            </Pressable>
          ) : (
            <Pressable style={[s.headerBtn, { backgroundColor: CultureTokens.indigo + '20', borderColor: CultureTokens.indigo + '40' }]} onPress={() => router.push('/contacts' as never)}>
              <Ionicons name="people-outline" size={20} color={CultureTokens.indigo} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Mode toggle */}
      <View style={s.toggleContainer}>
        <Pressable
          style={[s.toggleTab, mode === 'culturepass' && { backgroundColor: colors.surfaceElevated }]}
          onPress={() => { setMode('culturepass'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Ionicons name="card-outline" size={16} color={mode === 'culturepass' ? colors.text : colors.textTertiary} />
          <Text style={[s.toggleText, mode === 'culturepass' && { color: colors.text }]}>CulturePass</Text>
        </Pressable>
        {canUseStaffScanner && (
          <Pressable
            style={[s.toggleTab, mode === 'tickets' && { backgroundColor: colors.surfaceElevated }]}
            onPress={() => { setMode('tickets'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Ionicons name="ticket-outline" size={16} color={mode === 'tickets' ? colors.text : colors.textTertiary} />
            <Text style={[s.toggleText, mode === 'tickets' && { color: colors.text }]}>Staff Check-In</Text>
          </Pressable>
        )}
      </View>

      {/* Loading overlay */}
      {isLookingUp && (
        <View style={s.lookupOverlay}>
          <ActivityIndicator size="large" color={CultureTokens.indigo} />
          <Text style={s.lookupText}>Looking up profile…</Text>
        </View>
      )}

      {/* ═══════════ STAFF TICKET MODE ═══════════ */}
      {mode === 'tickets' && (
        <>
          <View style={s.statsBar}>
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: CultureTokens.success }]}>{session.accepted}</Text>
              <Text style={s.statLabel}>Accepted</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: CultureTokens.warning }]}>{session.duplicates}</Text>
              <Text style={s.statLabel}>Duplicate</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: CultureTokens.error }]}>{session.rejected}</Text>
              <Text style={s.statLabel}>Invalid</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: colors.textSecondary }]}>{sessionDuration()}</Text>
              <Text style={s.statLabel}>Session</Text>
            </View>
          </View>

          {ticketCameraActive && (
            <View style={s.cameraContainer}>
              <CameraView
                style={s.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] }}
                onBarcodeScanned={handleTicketBarcodeScanned}
              />
              <View style={s.cameraOverlay}>
                <View style={s.cameraFrame}>
                  <View style={[s.cCorner, s.cTL]} />
                  <View style={[s.cCorner, s.cTR]} />
                  <View style={[s.cCorner, s.cBL]} />
                  <View style={[s.cCorner, s.cBR]} />
                </View>
                <Text style={s.cameraHint}>Point at a ticket QR code</Text>
              </View>
              <Pressable style={s.closeCameraBtn} onPress={() => setTicketCameraActive(false)}>
                <Ionicons name="close-circle" size={38} color={colors.text} />
              </Pressable>
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 + bottomInset }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!ticketCameraActive && (
              <View style={s.scanInputSection}>
                <Pressable style={s.camScanBtn} onPress={startTicketCamera}>
                  <LinearGradient
                    colors={[CultureTokens.indigo, CultureTokens.saffron]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.camScanGradient}
                  >
                    <Ionicons name="camera" size={28} color={colors.background} />
                    <View>
                      <Text style={[s.camScanTitle, { color: colors.background }]}>Scan QR Code</Text>
                      <Text style={[s.camScanSub, { color: colors.textTertiary }]}>Camera · QR · Barcode</Text>
                    </View>
                  </LinearGradient>
                </Pressable>

                <View style={s.orRow}>
                  <View style={s.orLine} />
                  <Text style={s.orText}>or enter manually</Text>
                  <View style={s.orLine} />
                </View>

                <View style={s.inputRow}>
                  <TextInput
                    style={s.codeInput}
                    placeholder="Enter ticket code…"
                    placeholderTextColor={colors.textTertiary}
                    value={ticketCode}
                    onChangeText={v => setTicketCode(v.toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleManualTicketScan}
                  />
                  <Pressable
                    style={[s.scanBtn, { backgroundColor: CultureTokens.indigo }, isScanning && s.scanBtnDisabled]}
                    onPress={handleManualTicketScan}
                    disabled={isScanning}
                  >
                    {isScanning
                      ? <ActivityIndicator size="small" color={colors.background} />
                      : <Ionicons name="checkmark-circle" size={24} color={colors.background} />
                    }
                  </Pressable>
                </View>
              </View>
            )}

            {ticketResult && !ticketCameraActive && (
              <View style={s.resultWrapper}>
                <TicketResultCard
                  result={ticketResult}
                  onClose={() => setTicketResult(null)}
                  onScanNext={() => { setTicketResult(null); startTicketCamera(); }}
                  onPrintBadge={() => {
                    if (!ticketResult.ticket?.id) return;
                    router.push({ pathname: '/tickets/print/[id]', params: { id: ticketResult.ticket.id, layout: 'badge', autoPrint: '1' } });
                  }}
                />
              </View>
            )}

            {scanHistory.length > 0 && !ticketCameraActive && (
              <View style={s.historySection}>
                <View style={s.historySectionHeader}>
                  <Text style={s.historyTitle}>Scan Log ({scanHistory.length})</Text>
                </View>
                {scanHistory.map((item, idx) => {
                  const cfg = getOutcomeConfig(item);
                  return (
                    <View key={idx} style={[s.historyItem, { borderLeftColor: cfg.color }]}>
                      <View style={[s.historyIconWrap, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.historyEventTitle} numberOfLines={1}>
                          {item.ticket?.eventTitle || 'Unknown Event'}
                        </Text>
                        <Text style={[s.historyStatus, { color: cfg.color }]} numberOfLines={1}>
                          {cfg.title} · {item.message}
                        </Text>
                      </View>
                      {item.ticket?.tierName && (
                        <View style={[s.historyTierChip, { backgroundColor: CultureTokens.indigo + '15' }]}>
                          <Text style={[s.historyTierText, { color: CultureTokens.indigo }]}>{item.ticket.tierName}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {scanHistory.length === 0 && !ticketResult && !ticketCameraActive && (
              <View style={s.emptyState}>
                <View style={s.emptyIconBg}>
                  <Ionicons name="scan" size={44} color={CultureTokens.indigo} />
                </View>
                <Text style={s.emptyTitle}>Ready to Check In</Text>
                <Text style={s.emptyDesc}>Scan a QR code or enter a ticket code above to verify and mark attendance.</Text>
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* ═══════════ CULTUREPASS CONTACT MODE ═══════════ */}
      {mode === 'culturepass' && (
        <>
          {cpCameraActive && (
            <View style={s.cameraContainer}>
              <CameraView
                style={s.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleCpBarcodeScanned}
              />
              <View style={s.cameraOverlay}>
                <View style={s.cameraFrame}>
                  <View style={[s.cCorner, s.cTL]} />
                  <View style={[s.cCorner, s.cTR]} />
                  <View style={[s.cCorner, s.cBL]} />
                  <View style={[s.cCorner, s.cBR]} />
                </View>
                <Text style={s.cameraHint}>Point at a CulturePass QR code</Text>
              </View>
              <Pressable style={s.closeCameraBtn} onPress={() => setCpCameraActive(false)}>
                <Ionicons name="close-circle" size={38} color={colors.text} />
              </Pressable>
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 + bottomInset }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!cpCameraActive && !cpContact && (
              <View style={s.scanInputSection}>
                <Pressable style={s.cameraStartBtn} onPress={startCpCamera}>
                  <View style={[s.cameraIconCircle, { backgroundColor: CultureTokens.indigo }]}>
                    <Ionicons name="camera" size={34} color={colors.background} />
                  </View>
                  <Text style={s.cameraStartTitle}>Scan QR Code</Text>
                  <Text style={s.cameraStartSub}>
                    {Platform.OS === 'web' ? 'Use manual input on web' : 'Tap to open camera'}
                  </Text>
                </Pressable>

                <View style={s.orRow}>
                  <View style={s.orLine} />
                  <Text style={s.orText}>or enter manually</Text>
                  <View style={s.orLine} />
                </View>

                <View style={s.inputRow}>
                  <TextInput
                    style={s.codeInput}
                    placeholder="CP-123456 or paste QR data…"
                    placeholderTextColor={colors.textTertiary}
                    value={cpInput}
                    onChangeText={setCpInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleCpManualScan}
                  />
                  <Pressable
                    style={[s.scanBtn, { backgroundColor: CultureTokens.indigo }]}
                    onPress={handleCpManualScan}
                    disabled={isLookingUp}
                  >
                    <Ionicons name="search" size={24} color={colors.background} />
                  </Pressable>
                </View>
              </View>
            )}

            {cpContact && (
              <View style={s.cpCard}>
                <View style={s.cpCardHeader}>
                  <View style={[s.cpAvatar, { backgroundColor: CultureTokens.indigo + '20' }]}>
                    <Text style={[s.cpAvatarText, { color: CultureTokens.indigo }]}>
                      {(cpContact.name || cpContact.cpid).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => { setCpContact(null); setCpInput(''); cpLastScanned.current = ''; }}
                    style={s.closeBtn}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <Text style={s.cpName}>{cpContact.name || 'CulturePass User'}</Text>
                {cpContact.username && <Text style={s.cpUsername}>@{cpContact.username}</Text>}

                <View style={s.cpChipRow}>
                  <View style={[s.cpIdChip, { backgroundColor: CultureTokens.indigo + '20' }]}>
                    <Ionicons name="finger-print" size={14} color={CultureTokens.indigo} />
                    <Text style={[s.cpIdText, { color: CultureTokens.indigo }]}>{cpContact.cpid}</Text>
                  </View>
                  {cpContact.tier && (
                    <View style={[s.cpTierChip, { backgroundColor: (TIER_DISPLAY[cpContact.tier]?.color ?? colors.textSecondary) + '15' }]}>
                      <Ionicons name={(TIER_DISPLAY[cpContact.tier]?.icon ?? 'shield-outline') as never} size={13} color={TIER_DISPLAY[cpContact.tier]?.color ?? colors.textSecondary} />
                      <Text style={[s.cpTierText, { color: TIER_DISPLAY[cpContact.tier]?.color ?? colors.textSecondary }]}>
                        {TIER_DISPLAY[cpContact.tier]?.label ?? 'Free'}
                      </Text>
                    </View>
                  )}
                </View>

                {cpContact.city && (
                  <View style={s.cpLocationRow}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={s.cpLocationText}>{cpContact.city}{cpContact.country ? `, ${cpContact.country}` : ''}</Text>
                  </View>
                )}
                {cpContact.bio && <Text style={s.cpBio} numberOfLines={2}>{cpContact.bio}</Text>}
                {cpContact.org && (
                  <View style={s.cpLocationRow}>
                    <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
                    <Text style={s.cpLocationText}>{cpContact.org}</Text>
                  </View>
                )}

                <View style={s.cpActions}>
                  <Pressable style={s.cpActionBtn} onPress={handleViewProfile}>
                    <Ionicons name="person-outline" size={18} color={CultureTokens.indigo} />
                    <Text style={[s.cpActionText, { color: CultureTokens.indigo }]}>View Profile</Text>
                  </Pressable>
                  <Pressable
                    style={[s.cpActionBtn, contactAlreadySaved && { backgroundColor: CultureTokens.success + '15', borderColor: CultureTokens.success + '30' }]}
                    onPress={handleSaveContact}
                    disabled={contactAlreadySaved}
                  >
                    <Ionicons
                      name={contactAlreadySaved ? 'checkmark-circle' : 'bookmark-outline'}
                      size={18}
                      color={contactAlreadySaved ? CultureTokens.success : CultureTokens.saffron}
                    />
                    <Text style={[s.cpActionText, { color: contactAlreadySaved ? CultureTokens.success : CultureTokens.saffron }]}>
                      {contactAlreadySaved ? 'Saved' : 'Save Contact'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {!cpContact && !cpCameraActive && (
              <View style={s.hintSection}>
                <Text style={s.hintTitle}>Supported Formats</Text>
                {hintItems.map(item => (
                  <View key={item.label} style={s.hintItem}>
                    <Ionicons name={item.icon as never} size={18} color={item.color} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.hintLabel}>{item.label}</Text>
                      <Text style={s.hintExample} numberOfLines={1}>{item.example}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
    </AuthGuard>
  );
}
