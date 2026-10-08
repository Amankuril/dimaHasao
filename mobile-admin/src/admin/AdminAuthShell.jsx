import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Div, Img } from '../components/web';
import { FontFamily } from '../components/Text';

/*
 * Port of shared/components/auth/DimaHasaoAuthShell.jsx as it renders at
 * phone width: the dark heritage card with the woven band above and below,
 * the crest, then the form (the identity panel is md:flex, desktop only).
 */

const WEAVE = ['#04190c', '#caa83e', '#0d3d20', '#8c1c13'];

/** `.dh-weave`: 45° bands of four colours, 7 px each, 8 px tall. */
function Weave() {
  return (
    <View style={styles.weave} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.weaveRow}>
        {Array.from({ length: 90 }).map((_, i) => (
          <View key={i} style={[styles.band, { backgroundColor: WEAVE[i % WEAVE.length] }]} />
        ))}
      </View>
    </View>
  );
}

/** Field frame, label, input and button classes, as exported by the web shell. */
export const authFieldClass = (hasError) => `flex items-center rounded-xl border bg-[#02130a] ${hasError ? 'border-red-400/70' : 'border-[#caa83e]/35'}`;
export const authLabelClass = 'mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9fb3a4]';
export const authInputClass = 'h-12 flex-1 bg-transparent text-sm text-[#f4efe2]';
export const authButtonClass = 'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#caa83e] shadow-lg';
export const authButtonTextClass = 'text-sm font-black uppercase tracking-[0.16em] text-[#04190c]';
/** `.dh-montserrat` / `.dh-cinzel` */
export const MONTSERRAT = { fontFamily: 'Montserrat' };
export const CINZEL = { fontFamily: 'Cinzel' };

export default function AdminAuthShell({ children, logo = require('../../assets/images/logo.png') }) {
  const insets = useSafeAreaInsets();
  return (
    <FontFamily family="Poppins">
      <View style={{ flex: 1, backgroundColor: '#04190c' }}>
        <StatusBar style="light" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingTop: 32 + insets.top, paddingBottom: 32 + insets.bottom }}
          >
            {/* Ambient depth (the blurred discs), as soft tinted circles. */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={[styles.glow, { left: -96, top: -128, width: 420, height: 420, backgroundColor: 'rgba(13,107,57,0.18)' }]} />
              <View style={[styles.glow, { right: -80, bottom: -160, width: 460, height: 460, backgroundColor: 'rgba(202,168,62,0.08)' }]} />
            </View>
            <Div className="w-full overflow-hidden rounded-[26px] border border-[#caa83e]/30 bg-[#051f11]/95 shadow-2xl">
              <Weave />
              <Div className="p-7">
                <Img source={logo} alt="Dima Hasao Tourism" className="mx-auto mb-4 h-16 w-16 object-contain" />
                {children}
              </Div>
              <Weave />
            </Div>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </FontFamily>
  );
}

const styles = StyleSheet.create({
  weave: { height: 8, alignSelf: 'stretch', overflow: 'hidden' },
  weaveRow: { position: 'absolute', left: 0, top: 0, flexDirection: 'row' },
  band: { width: 9.9, height: 32, marginTop: -12, transform: [{ skewX: '-45deg' }] },
  glow: { position: 'absolute', borderRadius: 999 },
});
