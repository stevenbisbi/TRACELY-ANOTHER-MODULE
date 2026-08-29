export const Colors = {
  bg: '#F4F5FB',
  bg3: '#EEF0F9',
  card: '#FFFFFF',
  white: '#FFFFFF',

  text: '#1E1B3A',
  text2: '#6B6888',
  text3: '#9B98B5',

  border: '#E4E2F1',
  border2: '#D6D3EA',

  accent: '#1C3992',
  accentLight: '#2C4FB8',
  primaryAction: '#F59E0B',
  red: '#DC2626',
  green: '#059669',
  orange: '#D97706',
  purple: '#7C3AED',

  gradientStart: '#1C3992',
  gradientEnd: '#2C4FB8',
};

export const Font = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 17,
  lg: 18,
  xl: 21,
  xxl: 24,
};

export const Space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
};

export const BadgeVariant: Record<string, { bg: string; text: string }> = {
  active: { bg: '#DCFCE7', text: '#166534' },
  low: { bg: '#DCFCE7', text: '#166534' },
  pending: { bg: '#FEF3C7', text: '#92400E' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  medium: { bg: '#FEF3C7', text: '#92400E' },
  inactive: { bg: '#FEE2E2', text: '#991B1B' },
  alert: { bg: '#FEE2E2', text: '#991B1B' },
  risk: { bg: '#FEE2E2', text: '#991B1B' },
  high: { bg: '#FEE2E2', text: '#991B1B' },
  critical: { bg: '#FEE2E2', text: '#991B1B' },
};

export const TipoColor: Record<string, { bg: string; text: string }> = {
  low: { bg: '#DCFCE7', text: '#166534' },
  medium: { bg: '#FEF3C7', text: '#92400E' },
  high: { bg: '#FEE2E2', text: '#991B1B' },
};
