import { Image, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Fa from '../../components/Fa';
import { color, elevation, radii, space, type } from '../../theme';

/*
 * Port of shared/components/auth/DimaHasaoAuthShell.jsx as it renders at phone
 * width: the deep-green heritage panel with the woven stripe above and below,
 * the mark and the form. (The identity panel with the blurb and points is desktop-only.)
 */

/**
 * The dark sign-in palette. Kept as-is because the hotel workspace imports it
 * (HotelUnderReview); `muted` passes AA on `card` / `field`, `dim` is decorative only.
 */
export const AUTH = {
  bg: '#04190c',
  card: '#051f11',
  field: '#02130a',
  gold: '#caa83e',
  cream: '#f4efe2',
  muted: '#9fb3a4',
  dim: '#5d7264',
};

const WEAVE = ['#04190c', '#caa83e', '#0d3d20', '#8c1c13'];
const GOLD_EDGE = 'rgba(202,168,62,0.35)';

/** `.dh-weave`: 45° bands of four colours, 7 px each. */
function Weave() {
  return (
    <View style={styles.weave} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Absolute so the 90 bands never widen the card (they did on web, pushing the form off-centre). */}
      <View style={styles.weaveRow}>
        {Array.from({ length: 90 }).map((_, i) => (
          <View key={i} style={[styles.weaveBand, { backgroundColor: WEAVE[i % WEAVE.length] }]} />
        ))}
      </View>
    </View>
  );
}

export default function AuthShell({ logo = require('../../../assets/images/restaurant-logo.webp'), children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.lg, paddingTop: space.xxl + insets.top, paddingBottom: space.xxl + insets.bottom }}
        >
          <View style={styles.card}>
            <Weave />
            <View style={styles.body}>
              <View style={styles.logoRing}>
                <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Dima Hasao Tourism" />
              </View>
              {children}
            </View>
            <Weave />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Field label, field box, input and the gold CTA on the dark panel (48–54 px, sentence case). */
export const authStyles = StyleSheet.create({
  label: { ...type.label, marginBottom: space.sm, color: AUTH.muted },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 54, borderRadius: radii.md, borderWidth: 1.5, borderColor: GOLD_EDGE, backgroundColor: AUTH.field },
  fieldFocused: { borderColor: color.gold },
  fieldError: { borderColor: 'rgba(248,113,113,0.8)' },
  input: { flex: 1, minWidth: 0, height: 54, paddingVertical: 0, ...type.body, fontSize: 16, color: AUTH.cream },
  button: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radii.md,
    backgroundColor: color.goldBright,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { ...type.button, fontSize: 16, color: color.onGold },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: AUTH.bg },
  card: { overflow: 'hidden', borderRadius: radii.xl, borderWidth: 1, borderColor: GOLD_EDGE, backgroundColor: color.primaryDeep, ...elevation.float },
  body: { paddingHorizontal: space.xxl, paddingTop: space.xxl, paddingBottom: space.xxl },
  weave: { height: 8, alignSelf: 'stretch', overflow: 'hidden' },
  weaveRow: { position: 'absolute', left: 0, top: 0, flexDirection: 'row' },
  weaveBand: { width: 9.9, height: 32, marginTop: -12, transform: [{ skewX: '-45deg' }] },
  logoRing: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, borderWidth: 1, borderColor: GOLD_EDGE, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg, backgroundColor: 'rgba(202,168,62,0.08)' },
  logo: { width: 56, height: 56 },
});

/** Cinzel title between gold leaves, a gold overline kicker, then the lead text (children). */
export function AuthTitle({ title, kicker, children }) {
  return (
    <View style={titleStyles.wrap}>
      <View style={titleStyles.titleRow}>
        <Fa name="fa-solid fa-leaf" size={12} color={color.gold} />
        <Text style={titleStyles.title} accessibilityRole="header">
          {String(title).toUpperCase()}
        </Text>
        <Fa name="fa-solid fa-leaf" size={12} color={color.gold} />
      </View>
      <View style={titleStyles.kickerRow}>
        <View style={titleStyles.rule} />
        <Text style={titleStyles.kicker}>{kicker}</Text>
        <View style={titleStyles.rule} />
      </View>
      {children}
    </View>
  );
}

const titleStyles = StyleSheet.create({
  wrap: { marginBottom: space.xxl, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  title: { ...type.heroSerif, flexShrink: 1, fontSize: 22, color: color.goldOnDark, textAlign: 'center' },
  kickerRow: { marginTop: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  rule: { height: 1, width: 24, backgroundColor: color.gold },
  kicker: { ...type.overline, color: color.gold },
});
