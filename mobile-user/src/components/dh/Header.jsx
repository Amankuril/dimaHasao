import { StyleSheet, Text, View } from 'react-native';
import Image from '../Img';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../Fa';
import { Press } from '../ui';
import { useBooking } from '../../context/BookingContext';
import { cinzel, dh, playfair, shadow, tw } from '../../theme';

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
}) {
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite } = useBooking();
  const isFav = placeId ? favorites.includes(placeId) : false;

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.row}>
        {showBack ? (
          <Press scale={0.88} onPress={onBack || (() => goBack())} accessibilityLabel="Go Back" style={styles.iconBtn} hitSlop={10}>
            <Fa name="fa-solid fa-arrow-left" size={16} color="#fff" />
          </Press>
        ) : (
          <View style={{ width: 24 }} />
        )}

        <View style={styles.center}>
          <View style={styles.titleRow}>
            <Fa name="fa-solid fa-leaf" size={10} color={tw.amber400} />
            <Text style={styles.title} numberOfLines={1}>
              {String(title).toUpperCase()}
            </Text>
            <Fa name="fa-solid fa-leaf" size={10} color={tw.amber400} />
          </View>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          {rightAction === 'search' ? (
            <Press scale={0.88} onPress={onSearchClick || (() => router.navigate('/app/places'))} accessibilityLabel="Search" style={styles.iconBtn} hitSlop={10}>
              <Fa name="fa-solid fa-magnifying-glass" size={16} color="#fff" />
            </Press>
          ) : null}
          {rightAction === 'favorite' && placeId ? (
            <Press scale={0.85} onPress={() => toggleFavorite(placeId)} accessibilityLabel="Toggle Favorite" style={styles.iconBtn} hitSlop={10}>
              <Fa name={isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} size={16} color={isFav ? tw.red500 : '#fff'} />
            </Press>
          ) : null}
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
  header: { backgroundColor: dh.header, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,79,59,0.5)', zIndex: 40, ...shadow('md') },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  iconBtn: { padding: 4, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, paddingHorizontal: 8, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, maxWidth: '100%' },
  title: { flexShrink: 1, fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: tw.amber300, ...cinzel() },
  subtitle: { fontSize: 10, lineHeight: 15, marginTop: 2, color: 'rgba(254,243,198,0.9)', ...playfair(400, true) },
  right: { width: 24, alignItems: 'flex-end' },
});
