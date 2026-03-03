export type TransactionType = 'charge' | 'refund' | 'debit' | 'cashback' | 'topup' | 'transfer';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amountCents: number;
  currency?: string;
  description: string;
  referenceId?: string;
  referenceType?: 'ticket' | 'perk' | 'membership' | 'topup';
  createdAt: string;
}
