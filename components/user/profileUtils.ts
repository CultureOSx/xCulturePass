import { Ionicons } from '@expo/vector-icons';

export const CP = {
  teal:       '#00D4AA',
  tealDark:   '#00A882',
  purple:     '#7C3AED',
  purpleDark: '#5B21B6',
  ember:      '#FF6B35',
  gold:       '#FFB347',
  dark:       '#1C1C1E',
  darkMid:    '#F2F2F7',
  muted:      '#94A3B8',
  border:     '#E5E5EA',
  bg:         '#F2F2F7',
  surface:    '#FFFFFF',
  text:       '#1C1C1E',
  success:    '#10B981',
  info:       '#3B82F6',
} as const;

export const SOCIAL_ICONS = [
  { key: 'instagram', icon: 'logo-instagram' as const, label: 'Instagram', color: CP.ember },
  { key: 'twitter',   icon: 'logo-twitter'   as const, label: 'Twitter',   color: CP.info  },
  { key: 'linkedin',  icon: 'logo-linkedin'  as const, label: 'LinkedIn',  color: CP.purple },
  { key: 'facebook',  icon: 'logo-facebook'  as const, label: 'Facebook',  color: CP.info  },
] as const;

export const TIER_CONFIG: Record<string, {
  color: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = {
  free:    { color: CP.muted,  label: 'Standard', icon: 'shield-outline' },
  plus:    { color: CP.teal,   label: 'Plus',     icon: 'star'           },
  pro:     { color: CP.purple, label: 'Pro',      icon: 'star'           },
  premium: { color: CP.ember,  label: 'Premium',  icon: 'diamond'        },
  vip:     { color: CP.gold,   label: 'VIP',      icon: 'diamond'        },
};

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return n.toString();
}

export function formatMemberDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}
