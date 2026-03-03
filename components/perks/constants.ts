export const PERK_TYPE_INFO: Record<string, { icon: string; color: string; label: string; gradient: string }> = {
  discount_percent: { icon: 'pricetag', color: '#E85D3A', label: 'Percentage Discount', gradient: '#FF8C6B' },
  discount_fixed: { icon: 'cash', color: '#1A7A6D', label: 'Fixed Discount', gradient: '#2ECC71' },
  free_ticket: { icon: 'ticket', color: '#9B59B6', label: 'Free Ticket', gradient: '#C39BD3' },
  early_access: { icon: 'time', color: '#3498DB', label: 'Early Access', gradient: '#7EC8E3' },
  vip_upgrade: { icon: 'star', color: '#F2A93B', label: 'VIP Upgrade', gradient: '#F7DC6F' },
  cashback: { icon: 'wallet', color: '#34C759', label: 'Cashback Reward', gradient: '#82E0AA' },
};

export const CATEGORY_LABELS: Record<string, string> = {
  tickets: 'Tickets',
  events: 'Events',
  dining: 'Dining',
  shopping: 'Shopping',
  wallet: 'Wallet',
  indigenous: 'First Nations',
};
