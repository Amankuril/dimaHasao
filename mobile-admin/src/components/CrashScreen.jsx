import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { display, ff, radius, tw } from '../theme';

/* Expo Router ErrorBoundary for the whole app. */
export default function CrashScreen({ error, retry }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <AlertTriangle size={32} color={tw.red500} />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>{__DEV__ ? String(error?.message || error) : 'Please try again.'}</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}>
        <Text style={styles.btnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, color: tw.gray900, ...display(700, 20) },
  body: { marginTop: 8, fontSize: 14, color: tw.gray500, textAlign: 'center', ...ff(500) },
  btn: { marginTop: 24, height: 48, paddingHorizontal: 32, borderRadius: radius.pill, backgroundColor: tw.primary, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, ...ff(700) },
});
