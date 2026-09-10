/**
 * Dima Hasao super-app vertical colours
 * - Food: v1 deep-emerald header with gold accent
 * - Inactive tabs: navy (same on Food & Taxi home)
 */
export const HELLO_PARTH_LOGO_COLORS = {
  food: '#06381E',
  taxi: '#1E4A8C',
};

const INACTIVE_TAB_BG = 'bg-[#050C16]/90';

export const SUPER_APP_VERTICAL_THEME = {
  food: {
    accent: '#E5B33B',
    activeTab: '#0A4D2B',
    theme: '#06381E',
    inactiveTab: '#050C16',
    stickyBackdrop: 'rgba(6, 56, 30, 0.92)',
    accentSoft: '#FAF6ED',
    accentSoftHover: '#F0E9D6',
    themeBg: 'bg-[#06381E]',
    activeTabBg: 'bg-[#0A4D2B]',
    inactiveTabBg: INACTIVE_TAB_BG,
  },
  taxi: {
    accent: '#5B9BD5',
    activeTab: '#2563EB',
    theme: '#0B172A',
    inactiveTab: '#050C16',
    stickyBackdrop: 'rgba(11, 23, 42, 0.96)',
    accentSoft: '#E8EEF7',
    accentSoftHover: '#D4E2F4',
    themeBg: 'bg-[#0B172A]',
    activeTabBg: 'bg-[#2563EB]',
    inactiveTabBg: INACTIVE_TAB_BG,
  },
};

export function getVerticalTheme(verticalId) {
  return SUPER_APP_VERTICAL_THEME[verticalId] || SUPER_APP_VERTICAL_THEME.food;
}
