import { Image, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { montserrat, poppins, shadow } from '../../theme';

/*
 * Port of shared/components/auth/DimaHasaoAuthShell.jsx as it renders at phone
 * width: the dark green card with the woven stripe above and below, the mark
 * and the form. (The identity panel with the blurb and points is desktop-only.)
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

/** `.dh-weave`: 45° bands of four colours, 7 px each. */
function Weave() {
  return (
    <View style={styles.weave}>
      {Array.from({ length: 90 }).map((_, i) => (
        <View key={i} style={[styles.weaveBand, { backgroundColor: WEAVE[i % WEAVE.length] }]} />
      ))}
    </View>
  );
}

export default function AuthShell({ logo = require('../../../assets/images/restaurant-logo.png'), children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingTop: 32 + insets.top, paddingBottom: 32 + insets.bottom }}
        >
          <View style={styles.card}>
            <Weave />
            <View style={{ padding: 28 }}>
              <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Dima Hasao Tourism" />
              {children}
            </View>
            <Weave />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** authLabelClass / authFieldClass / authInputClass / authButtonClass */
export const authStyles = StyleSheet.create({
  label: { marginBottom: 6, fontSize: 11, lineHeight: 16, letterSpacing: 1.54, color: AUTH.muted, textTransform: 'uppercase', ...montserrat(700) },
  field: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(202,168,62,0.35)', backgroundColor: AUTH.field },
  fieldFocused: { borderColor: AUTH.gold },
  fieldError: { borderColor: 'rgba(248,113,113,0.7)' },
  input: { flex: 1, height: 48, paddingVertical: 0, fontSize: 14, color: AUTH.cream, ...poppins(400) },
  button: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: AUTH.gold,
    ...shadow('0 10px 24px rgba(202,168,62,0.25)'),
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 14, letterSpacing: 2.24, color: AUTH.bg, textTransform: 'uppercase', ...montserrat(900) },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: AUTH.bg },
  card: {
    overflow: 'hidden',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(202,168,62,0.3)',
    backgroundColor: 'rgba(5,31,17,0.95)',
    ...shadow('0 28px 80px rgba(0,0,0,0.65)'),
  },
  weave: { height: 8, width: '100%', overflow: 'hidden', flexDirection: 'row' },
  weaveBand: { width: 9.9, height: 32, marginTop: -12, transform: [{ skewX: '-45deg' }] },
  logo: { width: 64, height: 64, alignSelf: 'center', marginBottom: 16 },
});

export function AuthTitle({ title, kicker, children }) {
  return (
    <View style={{ marginBottom: 28, alignItems: 'center' }}>
      <Text style={titleStyles.title} accessibilityRole="header">{title}</Text>
      <View style={titleStyles.kickerRow}>
        <View style={titleStyles.rule} />
        <Text style={titleStyles.kicker}>{kicker}</Text>
      </View>
      {children}
    </View>
  );
}

const titleStyles = StyleSheet.create({
  title: { fontSize: 26, lineHeight: 32, letterSpacing: 0.65, color: AUTH.cream, fontFamily: 'PlayfairDisplay_700Bold', textAlign: 'center' },
  kickerRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  rule: { height: 1, width: 24, backgroundColor: AUTH.gold },
  kicker: { fontSize: 9, lineHeight: 14, letterSpacing: 2.7, color: AUTH.gold, textTransform: 'uppercase', ...montserrat(900) },
});
