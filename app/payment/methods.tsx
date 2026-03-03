import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';

interface PaymentMethod {
  id: string;
  userId: string;
  type: string;
  label: string;
  last4: string | null;
  brand: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean | null;
  createdAt: string | null;
}

function getBrandIcon(brand: string | null): string {
  switch (brand?.toLowerCase()) {
    case 'paypal': return 'logo-paypal';
    default:       return 'card-outline';
  }
}

function getBrandColor(brand: string | null, fallback: string): string {
  switch (brand?.toLowerCase()) {
    case 'visa':       return '#1A1F71';
    case 'mastercard': return '#EB001B';
    case 'amex':       return '#006FCF';
    case 'paypal':     return '#003087';
    default:           return fallback;
  }
}

export default function PaymentMethodsScreen() {
  const insets      = useSafeAreaInsets();
  const topInset    = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const colors      = useColors();
  const { userId }  = useAuth();

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'credit', label: '', last4: '', brand: 'Visa', expiryMonth: '', expiryYear: '',
  });

  const { data: methods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/payment-methods', userId],
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await apiRequest('POST', '/api/payment-methods', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods', userId] });
      setShowAddForm(false);
      setFormData({ type: 'credit', label: '', last4: '', brand: 'Visa', expiryMonth: '', expiryYear: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/payment-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods', userId] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (methodId: string) => {
      await apiRequest('PUT', `/api/payment-methods/${userId}/default/${methodId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payment-methods', userId] });
    },
  });

  const handleAdd = () => {
    if (!formData.label || !formData.last4 || !formData.expiryMonth || !formData.expiryYear) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createMutation.mutate({
      userId,
      type: formData.type,
      label: formData.label,
      last4: formData.last4,
      brand: formData.brand,
      expiryMonth: parseInt(formData.expiryMonth),
      expiryYear: parseInt(formData.expiryYear),
      isDefault: methods.length === 0,
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Card', 'Are you sure you want to remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteMutation.mutate(id);
        },
      },
    ]);
  };

  const brandOptions = ['Visa', 'Mastercard', 'Amex', 'PayPal'];
  const typeOptions  = ['credit', 'debit', 'paypal'];

  return (
    <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Payment Methods</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 20 }}>
        {isLoading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : methods.length === 0 ? (
          <View style={s.emptyState}>
            <View style={[s.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="card-outline" size={48} color={colors.textSecondary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No Payment Methods</Text>
            <Text style={[s.emptySubtitle, { color: colors.text }]}>Add a card or PayPal to make quick payments</Text>
          </View>
        ) : (
          methods.map((method) => {
            const brandColor = getBrandColor(method.brand, colors.primary);
            return (
              <View key={method.id} style={s.cardContainer}>
                <View style={[s.cardWrap, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderLeftColor: brandColor }]}>
                  <View style={s.cardTop}>
                    <View style={[s.brandIcon, { backgroundColor: brandColor + '15' }]}>
                      <Ionicons name={getBrandIcon(method.brand) as never} size={22} color={brandColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cardLabel, { color: colors.text }]}>{method.label}</Text>
                      <Text style={[s.cardBrand, { color: colors.text }]}>{method.brand} · {method.type}</Text>
                    </View>
                    {method.isDefault && (
                      <View style={[s.defaultBadge, { backgroundColor: colors.success + '18' }]}>
                        <Text style={[s.defaultText, { color: colors.success }]}>Default</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.cardBottom}>
                    <Text style={[s.cardNumber, { color: colors.text }]}>•••• •••• •••• {method.last4}</Text>
                    <Text style={[s.cardExpiry, { color: colors.text }]}> 
                      {method.expiryMonth?.toString().padStart(2, '0')}/{method.expiryYear?.toString().slice(-2)}
                    </Text>
                  </View>
                  <View style={[s.cardActions, { borderTopColor: colors.divider }]}>
                    {!method.isDefault && (
                      <Pressable
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDefaultMutation.mutate(method.id); }}
                        style={s.actionBtn}
                      >
                        <Ionicons name="star-outline" size={16} color={colors.primary} />
                        <Text style={[s.actionText, { color: colors.primary }]}>Set Default</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => handleDelete(method.id)} style={[s.actionBtn, s.deleteBtn]}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                      <Text style={[s.actionText, { color: colors.error }]}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <Pressable
          style={[s.addButton, { backgroundColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddForm(true); }}
        >
          <Ionicons name="add-circle" size={22} color={colors.textInverse} />
          <Text style={[s.addButtonText, { color: colors.textInverse }]}>Add Payment Method</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showAddForm} animationType="slide" transparent>
        <View style={[s.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[s.modalContent, { backgroundColor: colors.background, paddingBottom: bottomInset + 20 }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Add Payment Method</Text>
              <Pressable onPress={() => setShowAddForm(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[s.fieldLabel, { color: colors.text }]}>Card Label</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderLight }]}
                placeholder="e.g., My Visa Card"
                placeholderTextColor={colors.textSecondary}
                value={formData.label}
                onChangeText={(v) => setFormData(p => ({ ...p, label: v }))}
              />

              <Text style={[s.fieldLabel, { color: colors.text }]}>Last 4 Digits</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderLight }]}
                placeholder="1234"
                placeholderTextColor={colors.textSecondary}
                value={formData.last4}
                onChangeText={(v) => setFormData(p => ({ ...p, last4: v.replace(/\D/g, '').slice(0, 4) }))}
                keyboardType="number-pad"
                maxLength={4}
              />

              <Text style={[s.fieldLabel, { color: colors.text }]}>Card Brand</Text>
              <View style={s.optionsRow}>
                {brandOptions.map(b => (
                  <Pressable
                    key={b}
                    style={[
                      s.optionChip,
                      { backgroundColor: colors.surface, borderColor: colors.borderLight },
                      formData.brand === b && { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
                    ]}
                    onPress={() => setFormData(p => ({ ...p, brand: b }))}
                  >
                    <Text style={[s.optionChipText, { color: formData.brand === b ? colors.primary : colors.text }]}>{b}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[s.fieldLabel, { color: colors.text }]}>Card Type</Text>
              <View style={s.optionsRow}>
                {typeOptions.map(t => (
                  <Pressable
                    key={t}
                    style={[
                      s.optionChip,
                      { backgroundColor: colors.surface, borderColor: colors.borderLight },
                      formData.type === t && { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
                    ]}
                    onPress={() => setFormData(p => ({ ...p, type: t }))}
                  >
                    <Text style={[s.optionChipText, { color: formData.type === t ? colors.primary : colors.text }]}> 
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={s.expiryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.fieldLabel, { color: colors.text }]}>Expiry Month</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderLight }]}
                    placeholder="MM"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.expiryMonth}
                    onChangeText={(v) => setFormData(p => ({ ...p, expiryMonth: v.replace(/\D/g, '').slice(0, 2) }))}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.fieldLabel, { color: colors.text }]}>Expiry Year</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderLight }]}
                    placeholder="YYYY"
                    placeholderTextColor={colors.textSecondary}
                    value={formData.expiryYear}
                    onChangeText={(v) => setFormData(p => ({ ...p, expiryYear: v.replace(/\D/g, '').slice(0, 4) }))}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>

              <Pressable
                style={[s.submitBtn, { backgroundColor: colors.primary }, createMutation.isPending && { opacity: 0.6 }]}
                onPress={handleAdd}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? <ActivityIndicator color={colors.textInverse} size="small" />
                  : <Text style={[s.submitBtnText, { color: colors.textInverse }]}>Add Card</Text>
                }
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:        { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle:    { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  loadingContainer:{ padding: 60, alignItems: 'center' },
  emptyState:     { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon:      { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle:     { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 8 },
  emptySubtitle:  { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  cardContainer:  { marginHorizontal: 20, marginBottom: 12 },
  cardWrap:       { borderRadius: 16, padding: 16, borderWidth: 1, borderLeftWidth: 4 },
  cardTop:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  brandIcon:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardLabel:      { fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  cardBrand:      { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 2 },
  defaultBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  defaultText:    { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  cardBottom:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardNumber:     { fontSize: 15, fontFamily: 'Poppins_500Medium', letterSpacing: 1 },
  cardExpiry:     { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  cardActions:    { flexDirection: 'row', gap: 12, borderTopWidth: 1, paddingTop: 12 },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  deleteBtn:      { marginLeft: 'auto' as never },
  actionText:     { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  addButton:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginTop: 8, borderRadius: 14, paddingVertical: 16 },
  addButtonText:  { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  modalOverlay:   { flex: 1, justifyContent: 'flex-end' },
  modalContent:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:     { fontSize: 20, fontFamily: 'Poppins_700Bold' },
  fieldLabel:     { fontSize: 13, fontFamily: 'Poppins_600SemiBold', marginBottom: 6, marginTop: 14 },
  input:          { borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'Poppins_400Regular', borderWidth: 1 },
  optionsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  optionChipText: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  expiryRow:      { flexDirection: 'row', gap: 12 },
  submitBtn:      { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText:  { fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
});
