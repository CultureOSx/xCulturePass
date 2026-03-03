import { View, Text, Pressable, StyleSheet, FlatList, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/hooks/useColors';
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

interface TxItemProps { item: WalletTransaction; colors: ReturnType<typeof useColors> }

function TransactionItem({ item, colors }: TxItemProps) {
  const isCredit = item.type === 'topup' || item.type === 'refund' || item.type === 'cashback';
  const amountColor = isCredit ? colors.success : colors.error;

  const statusColor =
    item.status === 'completed' ? colors.success :
    item.status === 'pending'   ? colors.warning :
    item.status === 'failed'    ? colors.error   : colors.textSecondary;

  return (
    <View style={[s.txCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={[s.txIcon, { backgroundColor: amountColor + '12' }]}>
        <Ionicons name={getTypeIcon(item.type) as never} size={22} color={amountColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.txDescription, { color: colors.text }]} numberOfLines={1}>
          {item.description || (isCredit ? 'Wallet Credit' : 'Payment')}
        </Text>
        <View style={s.txMeta}>
          <Text style={[s.txDate, { color: colors.text }]}>{formatDate(item.createdAt)}</Text>
          {item.category && (
            <>
              <Text style={[s.txDot, { color: colors.textSecondary }]}>·</Text>
              <Text style={[s.txCategory, { color: colors.textSecondary }]}>{item.category}</Text>
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
  const colors      = useColors();
  const { userId, isAuthenticated } = useAuth();

  const { data: transactions = [], isLoading } = useQuery<WalletTransaction[]>({
    queryKey: ['/api/transactions', userId],
    queryFn: () => api.wallet.transactions(userId!),
    enabled: !!userId,
  });

  if (!isAuthenticated || !userId) {
    return (
      <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[s.headerTitle, { color: colors.text }]}>Transactions</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={s.scrollContainer}>
          <View style={[s.emptyIcon, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="globe" size={52} color={colors.primary} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text, fontSize: 20 }]}>Sign In to View Transactions</Text>
          <Text style={[s.emptySubtitle, { color: colors.text, marginTop: 8 }]}> 
            Your wallet and transaction history are available after signing in. Create an account or sign in to manage your payments and cashback rewards.
          </Text>
          <Pressable
            style={[s.signInBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
            onPress={() => router.push('/(onboarding)/login')}
          >
            <Ionicons name="arrow-forward" size={18} color={colors.textInverse} style={{ marginRight: 8 }} />
            <Text style={[s.signInBtnText, { color: colors.textInverse }]}>Sign In Now</Text>
          </Pressable>
          <Pressable
            style={[s.backHomeBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight, borderWidth: 1, marginTop: 12 }]}
            onPress={() => router.replace('/')}
          >
            <Text style={[s.backHomeBtnText, { color: colors.text }]}>Back to Discovery</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const income = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spent  = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <View style={[s.container, { paddingTop: topInset, backgroundColor: colors.background }]}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={[s.backBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>Transaction History</Text>
        <View style={{ width: 40 }} />
      </View>

      {transactions.length > 0 && (
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Ionicons name="arrow-down-circle" size={18} color={colors.success} />
            <Text style={[s.summaryLabel, { color: colors.text }]}>Income</Text>
            <Text style={[s.summaryAmount, { color: colors.success }]}>+${income.toFixed(2)}</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Ionicons name="arrow-up-circle" size={18} color={colors.error} />
            <Text style={[s.summaryLabel, { color: colors.text }]}>Spent</Text>
            <Text style={[s.summaryAmount, { color: colors.error }]}>-${spent.toFixed(2)}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem item={item} colors={colors} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomInset + 20, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={transactions.length > 0}
        ListEmptyComponent={
          isLoading ? (
            <View style={s.emptyState}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={s.emptyState}>
              <View style={[s.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
                <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.text }]}>No Transactions Yet</Text>
              <Text style={[s.emptySubtitle, { color: colors.text }]}>Your booking and payment history will appear here</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:      { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle:  { fontSize: 18, fontFamily: 'Poppins_700Bold' },
  scrollContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  summaryRow:   { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  summaryCard:  { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1 },
  summaryLabel: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  summaryAmount:{ fontSize: 16, fontFamily: 'Poppins_700Bold' },
  txCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  txIcon:       { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDescription:{ fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  txMeta:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  txDate:       { fontSize: 12, fontFamily: 'Poppins_400Regular' },
  txDot:        { fontSize: 12 },
  txCategory:   { fontSize: 12, fontFamily: 'Poppins_500Medium' },
  txRight:      { alignItems: 'flex-end', gap: 4 },
  txAmount:     { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  statusBadge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText:   { fontSize: 10, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize' as const },
  emptyState:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 20 },
  emptyIcon:    { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle:   { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 8 },
  emptySubtitle:{ fontSize: 14, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 21 },
  signInBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, width: '100%', marginHorizontal: 20 },
  signInBtnText:{ fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
  backHomeBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, width: '100%', marginHorizontal: 20 },
  backHomeBtnText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
});
