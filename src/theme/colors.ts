export interface ThemeColors {
  isDark: boolean;
  bg: string;
  bgSubtle: string;
  card: string;
  cardMuted: string;
  cardBorder: string;
  cardBorderSubtle: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryLight: string;
  primaryBorder: string;
  secondary: string;
  secondaryLight: string;
  secondaryBorder: string;
  warning: string;
  warningLight: string;
  warningBorder: string;
  danger: string;
  dangerLight: string;
  dangerBorder: string;
  info: string;
  infoLight: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  headerBg: string;
  headerBorder: string;
  shadowColor: string;
}

export const lightTheme: ThemeColors = {
  isDark: false,
  bg: '#F8FAFC',            // Slate-50 sạch sẽ, sáng sủa
  bgSubtle: '#F1F5F9',      // Slate-100
  card: '#FFFFFF',          // Trắng tinh tế
  cardMuted: '#F8FAFC',
  cardBorder: '#E2E8F0',    // Slate-200 sắc nét
  cardBorderSubtle: '#EDF2F7',
  text: '#0F172A',          // Slate-900 đen than đậm nét, cực rõ
  textMuted: '#475569',     // Slate-600
  textSubtle: '#94A3B8',    // Slate-400
  primary: '#059669',       // Emerald-600 năng động
  primaryLight: '#ECFDF5',  // Emerald-50
  primaryBorder: '#A7F3D0',
  secondary: '#7C3AED',     // Violet-600 tập trung
  secondaryLight: '#F5F3FF',// Violet-50
  secondaryBorder: '#DDD6FE',
  warning: '#D97706',       // Amber-600
  warningLight: '#FFFBEB',  // Amber-50
  warningBorder: '#FDE68A',
  danger: '#DC2626',        // Red-600
  dangerLight: '#FEF2F2',   // Red-50
  dangerBorder: '#FECACA',
  info: '#0284C7',          // Sky-600
  infoLight: '#F0F9FF',     // Sky-50
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabBarActive: '#059669',
  tabBarInactive: '#64748B',
  headerBg: '#FFFFFF',
  headerBorder: '#E2E8F0',
  shadowColor: '#0F172A',
};

export const darkTheme: ThemeColors = {
  isDark: true,
  bg: '#0F172A',
  bgSubtle: '#1E293B',
  card: '#1E293B',
  cardMuted: '#0F172A',
  cardBorder: '#334155',
  cardBorderSubtle: '#1E293B',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
  primary: '#10B981',
  primaryLight: 'rgba(16, 185, 129, 0.12)',
  primaryBorder: 'rgba(16, 185, 129, 0.3)',
  secondary: '#8B5CF6',
  secondaryLight: 'rgba(139, 92, 246, 0.12)',
  secondaryBorder: 'rgba(139, 92, 246, 0.3)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.12)',
  dangerBorder: 'rgba(239, 68, 68, 0.3)',
  info: '#38BDF8',
  infoLight: 'rgba(56, 189, 248, 0.12)',
  tabBarBg: '#0F172A',
  tabBarBorder: '#1E293B',
  tabBarActive: '#10B981',
  tabBarInactive: '#64748B',
  headerBg: '#0F172A',
  headerBorder: '#1E293B',
  shadowColor: '#000000',
};

