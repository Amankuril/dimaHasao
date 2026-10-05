import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';

/*
 * The shadcn Card / Button / Badge the help screens are written with, at the
 * app's theme values (global.css: --border oklch(.9 .02 85), --muted-foreground
 * oklch(.5 .05 50), --primary oklch(.7 .15 85)).
 */
export const HELP = {
  fg: '#2a1c10',
  muted: '#78665a',
  border: '#e6e1d3',
  mutedBg: '#f5f3ec',
  primary: '#cda022',
  green: '#0a4d2b',
};

export function HelpPage({ children }) {
  return (
    <LinearGradient colors={['rgba(254,252,232,0.3)', '#ffffff', 'rgba(255,247,237,0.2)']} style={{ flex: 1 }}>
      {children}
    </LinearGradient>
  );
}

export function Card({ children, style, gold }) {
  return <View style={[styles.card, gold ? styles.gold : null, style]}>{children}</View>;
}

export function HelpButton({ children, onPress, variant = 'outline', style }) {
  return (
    <Press onPress={onPress} style={[styles.btn, variant === 'default' ? { backgroundColor: HELP.green, borderColor: HELP.green } : null, style]}>
      {children}
    </Press>
  );
}

export const helpText = StyleSheet.create({
  h1: { fontSize: 30, color: HELP.fg, ...poppins(700) },
  muted: { color: HELP.muted, ...poppins(400) },
  title: { color: HELP.fg, ...poppins(600) },
  btn: { fontSize: 14, color: HELP.fg, ...poppins(500) },
});

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: HELP.border, ...shadow('lg') },
  gold: { backgroundColor: '#FFFBEB', borderColor: tw.yellow200 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 36, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: HELP.border, backgroundColor: '#fff', ...shadow('xs') },
});
