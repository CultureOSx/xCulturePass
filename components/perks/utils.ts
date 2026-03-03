import { Perk } from './types';

export function formatValue(perk: Perk) {
  if (perk.perkType === 'discount_percent') return `${perk.discountPercent}% Off`;
  if (perk.perkType === 'discount_fixed') return `$${(perk.discountFixedCents || 0) / 100} Off`;
  if (perk.perkType === 'free_ticket') return 'Free';
  if (perk.perkType === 'early_access') return '48h Early';
  if (perk.perkType === 'vip_upgrade') return 'VIP';
  if (perk.perkType === 'cashback') return perk.discountPercent ? `${perk.discountPercent}% Cashback` : `$${(perk.discountFixedCents || 0) / 100} Cashback`;
  return '';
}
