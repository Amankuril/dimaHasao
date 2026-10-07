import { forwardRef, useState } from 'react';
import { Image as RNImage, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import Skeleton from '../../../components/Skeleton';
import { Press } from '../../../components/ui';
import { color, elevation, radii, space, type } from '../../../theme';

/*
 * Shared pieces of the food discovery pages (Categories, Offers, Gourmet,
 * Search, Under 250 ...). The heritage header comes from FoodShell; these
 * pages add a light in-page bar under it.
 */

/** In-page bar: back button, title (+ optional subtitle) and a right slot. */
export function PageBar({ title, subtitle, onBack, right, style }) {
  return (
    <View style={[styles.bar, { paddingLeft: onBack ? space.xs : space.lg }, style]}>
      {onBack ? (
        <Press scale={0.92} onPress={onBack} accessibilityLabel="Back" style={styles.barBack}>
          <ArrowLeft size={22} color={color.text} />
        </Press>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.barTitle} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.barSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/**
 * Heritage hero for a discovery page: an optional photo under a dark scrim,
 * or the deep-green surface, with a gold Cinzel title and a Playfair tagline.
 */
export function DiscoveryHero({ title, tagline, kicker, image, onBack, height = 200, children }) {
  return (
    <View style={[styles.hero, { minHeight: height }]}>
      {image ? (
        <>
          <RNImage source={image} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient pointerEvents="none" colors={['rgba(6,28,14,0.92)', 'rgba(6,28,14,0.55)', 'rgba(6,28,14,0.15)']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        </>
      ) : (
        <View pointerEvents="none" style={styles.heroRing} />
      )}
      {onBack ? (
        <Press scale={0.92} onPress={onBack} accessibilityLabel="Back" style={styles.heroBack}>
          <ArrowLeft size={20} color={color.textInverse} />
        </Press>
      ) : null}
      <View style={styles.heroText}>
        {kicker ? (
          <View style={styles.heroKickerRow}>
            <View style={styles.heroRule} />
            <Text style={styles.heroKicker}>{kicker}</Text>
          </View>
        ) : null}
        <Text style={styles.heroTitle} accessibilityRole="header">
          {String(title).toUpperCase()}
        </Text>
        {tagline ? <Text style={styles.heroTagline}>{tagline}</Text> : null}
        {children}
      </View>
    </View>
  );
}

/** 48 px search input with a leading icon and an optional clear button. */
export const SearchField = forwardRef(function SearchField({ value, onChangeText, onClear, placeholder, style, inputStyle, accessibilityLabel, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused ? styles.searchFocused : null, style]}>
      <Search size={18} color={focused ? color.primary : color.textMuted} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.textMuted}
        accessibilityLabel={accessibilityLabel || placeholder}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[styles.searchInput, inputStyle]}
      />
      {value && onClear ? (
        <Press scale={0.9} onPress={onClear} accessibilityLabel="Clear search" style={styles.searchClear}>
          <X size={16} color={color.textSecondary} />
        </Press>
      ) : null}
    </View>
  );
});

/** Stand-in for the web's RestaurantGridSkeleton: stacked card placeholders. */
export function RestaurantGridSkeleton({ count = 4, compact = false }) {
  return (
    <View style={{ gap: space.md }} accessibilityRole="progressbar" accessibilityLabel="Loading restaurants">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton style={{ height: compact ? 128 : 160, borderRadius: 0, backgroundColor: color.surfaceMuted }} />
          <View style={{ padding: space.lg, gap: space.md }}>
            <Skeleton style={[styles.line, { height: 18, width: '75%' }]} />
            <Skeleton style={[styles.line, { width: '55%' }]} />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Skeleton style={[styles.line, { width: 64 }]} />
              <Skeleton style={[styles.line, { width: 96 }]} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: color.primaryDeep, overflow: 'hidden', justifyContent: 'flex-end', borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl },
  heroRing: { position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: 90, borderWidth: 18, borderColor: 'rgba(202,168,62,0.18)' },
  heroBack: { position: 'absolute', top: space.md, left: space.md, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  heroText: { paddingHorizontal: space.xl, paddingTop: 72, paddingBottom: space.xxl, gap: space.xs },
  heroKickerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  heroRule: { width: 28, height: 2, backgroundColor: color.gold },
  heroKicker: { ...type.overline, color: color.textOnDarkMuted },
  heroTitle: { ...type.heroSerif, color: color.goldOnDark },
  heroTagline: { ...type.tagline, fontSize: 14, lineHeight: 20, color: color.textOnDarkMuted },
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 60, paddingLeft: space.xs, paddingRight: space.lg, paddingVertical: space.sm, backgroundColor: color.bg, borderBottomWidth: 1, borderBottomColor: color.border },
  barBack: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  barTitle: { ...type.heading, color: color.text },
  barSub: { ...type.small, color: color.textMuted },
  search: { height: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md + 2, paddingRight: space.xs, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  searchFocused: { borderColor: color.primary },
  searchInput: { flex: 1, minWidth: 0, height: '100%', paddingVertical: 0, ...type.body, color: color.text, outlineWidth: 0 },
  searchClear: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.card },
  line: { height: 14, borderRadius: radii.sm, backgroundColor: color.surfaceMuted },
});
