import { View, Text, Pressable, StyleSheet, FlatList, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { CultureTokens } from '@/constants/theme';
import { api, type WalletTransaction } from '@/lib/api';

function getTypeIcon(type: WalletTransaction['type']): string {
  switch (type) {
    case 'topup':    return 'arrow-down-circle';
    case 'cashback': return 'sparkles';
    case 'refund':   return 'return-up-back';
    case 'payment':  return 'arrow-up-circle';
    default:         return 'swap-horizontal';
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface TxItemProps { item: WalletTransaction }

function TransactionItem({ item }: TxItemProps) {
  const isCredit = item.type === 'topup' || item.type === 'refund' || item.type === 'cashback';
  const amountColor = isCredit ? CultureTokens.success : CultureTokens.coral;

  const statusColor =
    item.status === 'completed' ? CultureTokens.success :
    item.status === 'pending'   ? CultureTokens.gold :
    item.status === 'failed'    ? CultureTokens.coral : 'rgba(255,255,255,0.5)';

  return (
    <View style={s.txCard}>
      <View style={[s.txIcon, { backgroundColor: amountColor + '15' }]}>
        <Ionicons name={getTypeIcon(item.type) as never} size={22} color={amountColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.txDescription} numberOfLines={1}>
          {item.description || (isCredit ? 'Wallet Credit' : 'Payment')}
        </Text>
        <View style={s.txMeta}>
          <Text style={s.txDate}>{formatDate(item.createdAt)}</Text>
          {item.category && (
            <>
              <Text style={s.txDot}>·</Text>
              <Text style={s.txCategory}>{item.category}</Text>
            </>
          )}
        </View>
      </View>
      <View style={s.txRight}>
        <Text style={[s.txAmount, { color: amountColor }]}>
          {item.amount >= 0 ? '+' : '-'}${Math.abs(item.amount).toFixed(2)}
        </Text>
        <View style={[s.statusBadge, { backgroundColor: statusColor + '15' }]}>
          <Text style={[s.statusText, { color: statusColor }]}>{item.status || 'unknown'}</Text>
        </View>
      </View>
    </View>
  );
}

export default function TransactionsScreen() {
  const insets      = useSafeAreaInsets();
  const topInset    = Platform.OS === 'web' ? 0 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;
  const { userId, isAuthenticated } = useAuth();

  const { data: transactions = [], isLoading } = useQuery<WalletTransaction[]>({
    queryKey: ['/api/transactions', userId],
    queryFn: () => api.wallet.transactions(userId!),
    enabled: !!userId,
  });

  if (!isAuthenticated || !userId) {
    return (
      <View style={[s.container, { paddingTop: topInset }]}>
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            style={s.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={s.headerTitle}>Transactions</Text>
          <View style={{ width: 44 }} />
        </View>
        
        <View style={s.scrollContainer}>
          <View style={s.authEmptyIcon}>
            <Ionicons name="globe" size={52} color={CultureTokens.indigo} />
          </View>
          <Text style={s.authEmptyTitle}>Sign In to View Transactions</Text>
          <Text style={s.authEmptySubtitle}> 
            Your wallet and transaction history are available after signing in. Create an account or sign in to manage your payments and cashback rewards.
          </Text>
          <Pressable
            style={s.signInBtn}
            onPress={() => router.push('/(onboarding)/login')}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={s.signInBtnText}>Sign In Now</Text>
          </Pressable>
          <Pressable
            style={s.backHomeBtn}
            onPress={() => router.replace('/')}
          >
            <Text style={s.backHomeBtnText}>Back to Discovery</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const income = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spent  = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <View style={[s.container, { paddingTop: topInset }]}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={s.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={s.headerTitle}>Transaction History</Text>
        <View style={{ width: 44 }} />
      </View>

      {transactions.length > 0 && (
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Ionicons name="arrow-down-circle" size={20} color={CultureTokens.success} />
            <Text style={s.summaryLabel}>Income</Text>
            <Text style={[s.summaryAmount, { color: CultureTokens.success }]}>+${income.toFixed(2)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Ionicons name="arrow-up-circle" size={20} color={CultureTokens.coral} />
            <Text style={s.summaryLabel}>Spent</Text>
            <Text style={[s.summaryAmount, { color: CultureTokens.coral }]}>-${spent.toFixed(2)}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem item={item} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomInset + 20, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={transactions.length > 0}
        ListEmptyComponent={
          isLoading ? (
            <View style={s.emptyState}>
              <ActivityIndicator color={CultureTokens.indigo} />
            </View>
          ) : (
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.4)" />
              </View>
              <Text style={s.emptyTitle}>No Transactions Yet</Text>
              <Text style={s.emptySubtitle}>Your booking and payment history will appear here</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0B0B14' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, zIndex: 10 },
  backBtn:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle:  { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
  scrollContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  summaryRow:   { flexDirection: 'row', paddingHorizontal: 20, gap: 14, marginBottom: 20 },
  summaryCard:  { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  summaryLabel: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.7)' },
  summaryAmount:{ fontSize: 18, fontFamily: 'Poppins_700Bold' },
  txCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' },
  txIcon:       { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDescription:{ fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  txMeta:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  txDate:       { fontSize: 12, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.6)' },
  txDot:        { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  txCategory:   { fontSize: 12, fontFamily: 'Poppins_500Medium', color: 'rgba(255,255,255,0.6)' },
  txRight:      { alignItems: 'flex-end', gap: 6 },
  txAmount:     { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText:   { fontSize: 11, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize' as const },
  emptyState:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 40 },
  emptyIcon:    { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.02)' },
  emptyTitle:   { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 8, color: '#FFFFFF' },
  emptySubtitle:{ fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 22, color: 'rgba(255,255,255,0.6)' },
  
  authEmptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 24, backgroundColor: CultureTokens.indigo + '15' },
  authEmptyTitle:{ fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 8, color: '#FFFFFF', textAlign: 'center' },
  authEmptySubtitle:{ fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 22, color: 'rgba(255,255,255,0.6)', marginBottom: 32 },
  signInBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 14, width: '100%', backgroundColor: CultureTokens.indigo },
  signInBtnText:{ fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  backHomeBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 14, width: '100%', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  backHomeBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
});
