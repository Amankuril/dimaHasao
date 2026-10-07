import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from './Fa';
import { Press } from './ui';
import { color, elevation, space, type } from '../theme';

/*
 * The heritage screen header shared with the customer app: deep-green bar,
 * gold Cinzel title between leaf ornaments, optional Playfair tagline, 44 px
 * buttons. In normal flow (never absolute) and handles the top safe area.
 * `right` takes extra actions (IconButton variant="inverse").
 */

/** Back with a fallback when there is no history. */
export function goBack(fallback = '/food/restaurant') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

export default function HeritageHeader({ title, subtitle, onBack, showBack = Boolean(onBack), right, style }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.xs }, style]}>
      <View style={styles.row}>
        {showBack ? (
          <Press scale={0.88} onPress={onBack || (() => goBack())} accessibilityLabel="Go back" style={styles.iconBtn}>
            <Fa name="fa-solid fa-arrow-left" size={18} color={color.textInverse} />
          </Press>
        ) : (
          <View style={styles.side} />
        )}
        <View style={styles.center}>
          <View style={styles.titleRow}>
            <Fa name="fa-solid fa-leaf" size={11} color={color.gold} />
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
              {String(title || '').toUpperCase()}
            </Text>
            <Fa name="fa-solid fa-leaf" size={11} color={color.gold} />
          </View>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.side}>{right}</View>
      </View>
    </View>
  );
}

const STRIPES = ['#000000', '#E53E3E', '#F6E05E'];

/** Dimasa weave strip (45° black / red / yellow) used under heritage panels. */
export function StripeBorder({ height = 6, colors = STRIPES, band = 10, style }) {
  const bands = Array.from({ length: 80 });
  return (
    <View style={[{ height, width: '100%', overflow: 'hidden', flexDirection: 'row' }, style]}>
      {bands.map((_, i) => (
        <View key={i} style={{ width: band * 1.414, height: height * 4, marginTop: -height * 1.5, backgroundColor: colors[i % colors.length], transform: [{ skewX: '-45deg' }] }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: color.primaryDeep, paddingHorizontal: space.xs, paddingBottom: space.sm, zIndex: 40, ...elevation.card },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  side: { minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  center: { flex: 1, paddingHorizontal: space.xs, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, maxWidth: '100%' },
  title: { flexShrink: 1, ...type.titleSerif, color: color.goldOnDark },
  subtitle: { ...type.tagline, marginTop: 1, color: color.textOnDarkMuted, textAlign: 'center' },
});
