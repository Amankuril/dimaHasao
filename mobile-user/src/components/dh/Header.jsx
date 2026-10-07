import { StyleSheet, Text, View } from 'react-native';
import Image from '../Img';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../Fa';
import { Press } from '../ui';
import { useBooking } from '../../context/BookingContext';
import { color, elevation, space, type } from '../../theme';

/** Web: navigate(-1). Falls back to the home screen when there is no history. */
export function goBack(fallback = '/app') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/*
 * Port of DimaHasao/components/layout/Header.jsx (and ModuleShell's
 * ModuleHeader, which is the same bar with a fixed back target).
 */
export function Header({
  title = 'TOURIST PLACES',
  subtitle = 'Explore the Beauty of Dima Hasao',
  showBack = true,
  rightAction = 'search', // 'search' | 'favorite' | 'none'
  placeId = null,
  onSearchClick,
  onBack,
  right,
}) {
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite } = useBooking();
  const isFav = placeId ? favorites.includes(placeId) : false;

  return (
    <View style={[styles.header, { paddingTop: insets.top + space.xs }]}>
      <View style={styles.row}>
        {showBack ? (
          <Press scale={0.88} onPress={onBack || (() => goBack())} accessibilityLabel="Go Back" style={styles.iconBtn}>
            <Fa name="fa-solid fa-arrow-left" size={18} color={color.textInverse} />
          </Press>
        ) : (
          <View style={styles.side} />
        )}

        <View style={styles.center}>
          <View style={styles.titleRow}>
            <Fa name="fa-solid fa-leaf" size={11} color={color.gold} />
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
              {String(title).toUpperCase()}
            </Text>
            <Fa name="fa-solid fa-leaf" size={11} color={color.gold} />
          </View>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.side}>
          {right ?? (
            <>
              {rightAction === 'search' ? (
                <Press scale={0.88} onPress={onSearchClick || (() => router.navigate('/app/places'))} accessibilityLabel="Search" style={styles.iconBtn}>
                  <Fa name="fa-solid fa-magnifying-glass" size={18} color={color.textInverse} />
                </Press>
              ) : null}
              {rightAction === 'favorite' && placeId ? (
                <Press scale={0.85} onPress={() => toggleFavorite(placeId)} accessibilityLabel={isFav ? 'Remove from favourites' : 'Add to favourites'} style={styles.iconBtn}>
                  <Fa name={isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} size={18} color={isFav ? '#F87171' : color.textInverse} />
                </Press>
              ) : null}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const PATTERNS = {
  'green-gold':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuATHjeesOsLPQY1ZJsuj1f6xM4T98ifEgybjedMBXnOl5eF9KNavfsCQJnQPrBr9IC3Nw7BUI_kpFCE1MQ_kTv-GsAh72ZTeAtpQ1CWQNNPFbx21vq8fy3cd46J3q_-8GhThIgbqcBnLuIcuxRv7PTAxX0peGxpElyMrkAW1bkN9t2Xk9sHL4Nvm6MjRzb6uhejLnY--d6DDzHxq0gQMAKt9k7p730tgoS5RDOqfWMhU4kE686YXZB-',
  native:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC8IzS0KGsZzD_ZsijD_Vb-LZQpKYgIWw4VohpFMmr933UP-N_Zhpooyqs6qZAdZtoClS1TrtsQyKiEtEwz02mvF9OVsLkZoYmTdDejXyjP3MPItv6cvhDIXboFC6uVubOjFoeXcjnSvL-TQrfbiS9x0SdHlqxY0gDn7Z_YF3u_PcOnSyWqCG7YdQpCPTj-IAkK4JzgzYfttLKrc63d9Lk4R3zd8Z8fi_3NQWZ1QjZ3i-lDnAYQpArL',
};

const STRIPES = ['#000000', '#E53E3E', '#F6E05E'];

/** Port of PatternDivider.jsx: the Dimasa weave strips under headers. */
export function PatternDivider({ variant = 'native', style }) {
  if (variant === 'geometric') return <StripeBorder style={style} />;
  const height = variant === 'green-gold' ? 12 : 14;
  return (
    <Image
      source={{ uri: PATTERNS[variant] || PATTERNS.native }}
      resizeMode="cover"
      style={[{ height, width: '100%', opacity: variant === 'green-gold' ? 0.9 : 1 }, style]}
    />
  );
}

/** `.pattern-border`: 45° black / red / yellow stripes, 6 px tall. */
export function StripeBorder({ height = 6, colors = STRIPES, band = 10, style }) {
  const bands = Array.from({ length: 80 });
  return (
    <View style={[{ height, width: '100%', overflow: 'hidden', flexDirection: 'row' }, style]}>
      {bands.map((_, i) => (
        <View
          key={i}
          style={{ width: band * 1.414, height: height * 4, marginTop: -height * 1.5, backgroundColor: colors[i % colors.length], transform: [{ skewX: '-45deg' }] }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: color.primaryDeep, paddingHorizontal: space.xs, paddingBottom: space.sm, zIndex: 40, ...elevation.card },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  // 44 px targets on both sides keep the title optically centred.
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  side: { minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  center: { flex: 1, paddingHorizontal: space.xs, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, maxWidth: '100%' },
  title: { flexShrink: 1, ...type.titleSerif, color: color.goldOnDark },
  subtitle: { ...type.tagline, marginTop: 1, color: color.textOnDarkMuted, textAlign: 'center' },
});
