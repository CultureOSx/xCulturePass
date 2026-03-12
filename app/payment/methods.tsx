import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/query-client';
import { useAuth } from '@/lib/auth';
import { CultureTokens } from '@/constants/theme';

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
    <View style={[s.container, { paddingTop: topInset }]}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={s.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={s.headerTitle}>Payment Methods</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset + 20 }}>
        {isLoading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator color={CultureTokens.indigo} />
          </View>
        ) : methods.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Ionicons name="card-outline" size={48} color="rgba(255,255,255,0.4)" />
            </View>
            <Text style={s.emptyTitle}>No Payment Methods</Text>
            <Text style={s.emptySubtitle}>Add a card or PayPal to make quick payments</Text>
          </View>
        ) : (
          methods.map((method) => {
            const brandColor = getBrandColor(method.brand, CultureTokens.indigo);
            return (
              <View key={method.id} style={s.cardContainer}>
                <View style={[s.cardWrap, { borderLeftColor: brandColor }]}>
                  <View style={s.cardTop}>
                    <View style={[s.brandIcon, { backgroundColor: brandColor + '15' }]}>
                      <Ionicons name={getBrandIcon(method.brand) as never} size={22} color={brandColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardLabel}>{method.label}</Text>
                      <Text style={s.cardBrand}>{method.brand} · {method.type}</Text>
                    </View>
                    {method.isDefault && (
                      <View style={s.defaultBadge}>
                        <Text style={s.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.cardBottom}>
                    <Text style={s.cardNumber}>•••• •••• •••• {method.last4}</Text>
                    <Text style={s.cardExpiry}> 
                      {method.expiryMonth?.toString().padStart(2, '0')}/{method.expiryYear?.toString().slice(-2)}
                    </Text>
                  </View>
                  <View style={s.cardActions}>
                    {!method.isDefault && (
                      <Pressable
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDefaultMutation.mutate(method.id); }}
                        style={s.actionBtn}
                      >
                        <Ionicons name="star-outline" size={16} color={CultureTokens.indigo} />
                        <Text style={[s.actionText, { color: CultureTokens.indigo }]}>Set Default</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={() => handleDelete(method.id)} style={[s.actionBtn, s.deleteBtn]}>
                      <Ionicons name="trash-outline" size={16} color={CultureTokens.coral} />
                      <Text style={[s.actionText, { color: CultureTokens.coral }]}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <Pressable
          style={s.addButton}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddForm(true); }}
        >
          <Ionicons name="add-circle" size={22} color="#0B0B14" />
          <Text style={s.addButtonText}>Add Payment Method</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showAddForm} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { paddingBottom: bottomInset + 30 }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Payment Method</Text>
              <Pressable onPress={() => setShowAddForm(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.fieldLabel}>Card Label</Text>
              <TextInput
                style={s.input}
                placeholder="e.g., My Visa Card"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={formData.label}
                onChangeText={(v) => setFormData(p => ({ ...p, label: v }))}
              />

              <Text style={s.fieldLabel}>Last 4 Digits</Text>
              <TextInput
                style={s.input}
                placeholder="1234"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={formData.last4}
                onChangeText={(v) => setFormData(p => ({ ...p, last4: v.replace(/\D/g, '').slice(0, 4) }))}
                keyboardType="number-pad"
                maxLength={4}
              />

              <Text style={s.fieldLabel}>Card Brand</Text>
              <View style={s.optionsRow}>
                {brandOptions.map(b => (
                  <Pressable
                    key={b}
                    style={[
                      s.optionChip,
                      formData.brand === b && s.optionChipActive,
                    ]}
                    onPress={() => setFormData(p => ({ ...p, brand: b }))}
                  >
                    <Text style={[s.optionChipText, formData.brand === b && s.optionChipTextActive]}>{b}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.fieldLabel}>Card Type</Text>
              <View style={s.optionsRow}>
                {typeOptions.map(t => (
                  <Pressable
                    key={t}
                    style={[
                      s.optionChip,
                      formData.type === t && s.optionChipActive,
                    ]}
                    onPress={() => setFormData(p => ({ ...p, type: t }))}
                  >
                    <Text style={[s.optionChipText, formData.type === t && s.optionChipTextActive]}> 
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={s.expiryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Expiry Month</Text>
                  <TextInput
                    style={s.input}
                    placeholder="MM"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={formData.expiryMonth}
                    onChangeText={(v) => setFormData(p => ({ ...p, expiryMonth: v.replace(/\D/g, '').slice(0, 2) }))}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Expiry Year</Text>
                  <TextInput
                    style={s.input}
                    placeholder="YYYY"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={formData.expiryYear}
                    onChangeText={(v) => setFormData(p => ({ ...p, expiryYear: v.replace(/\D/g, '').slice(0, 4) }))}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>

              <Pressable
                style={[s.submitBtn, createMutation.isPending && { opacity: 0.7 }]}
                onPress={handleAdd}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? <ActivityIndicator color="#0B0B14" size="small" />
                  : <Text style={s.submitBtnText}>Add Card</Text>
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
  container:      { flex: 1, backgroundColor: '#0B0B14' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, zIndex: 10 },
  backBtn:        { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle:    { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  loadingContainer:{ padding: 60, alignItems: 'center' },
  emptyState:     { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon:      { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.02)' },
  emptyTitle:     { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 8, color: '#FFFFFF' },
  emptySubtitle:  { fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', color: 'rgba(255,255,255,0.6)' },
  cardContainer:  { marginHorizontal: 20, marginBottom: 14 },
  cardWrap:       { borderRadius: 20, padding: 18, borderWidth: 1, borderLeftWidth: 4, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  cardTop:        { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  brandIcon:      { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardLabel:      { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  cardBrand:      { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: 2, color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' },
  defaultBadge:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: CultureTokens.success + '15' },
  defaultText:    { fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: CultureTokens.success },
  cardBottom:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardNumber:     { fontSize: 15, fontFamily: 'Poppins_500Medium', letterSpacing: 1, color: '#FFFFFF' },
  cardExpiry:     { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.7)' },
  cardActions:    { flexDirection: 'row', gap: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 14 },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 2 },
  deleteBtn:      { marginLeft: 'auto' as never },
  actionText:     { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  addButton:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 20, marginTop: 12, borderRadius: 16, paddingVertical: 18, backgroundColor: CultureTokens.indigo },
  addButtonText:  { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#0B0B14' },
  modalOverlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(11,11,20,0.85)' },
  modalContent:   { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%', backgroundColor: '#161622', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle:     { fontSize: 20, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  modalCloseBtn:  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  fieldLabel:     { fontSize: 13, fontFamily: 'Poppins_600SemiBold', marginBottom: 8, marginTop: 16, color: 'rgba(255,255,255,0.8)' },
  input:          { borderRadius: 16, padding: 16, fontSize: 15, fontFamily: 'Poppins_400Regular', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF' },
  optionsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip:     { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  optionChipActive: { backgroundColor: CultureTokens.indigo + '20', borderColor: CultureTokens.indigo },
  optionChipText: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  optionChipTextActive: { color: CultureTokens.indigo },
  expiryRow:      { flexDirection: 'row', gap: 14 },
  submitBtn:      { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 32, backgroundColor: CultureTokens.indigo },
  submitBtnText:  { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#0B0B14' },
});
