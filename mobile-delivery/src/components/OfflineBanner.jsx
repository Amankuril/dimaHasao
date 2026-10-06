import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { useOffline } from '../lib/useNetwork';
import { ff, tw } from '../theme';

/* The web has no offline UI; this is the kit default in the web's tokens. */
export default function OfflineBanner() {
  const offline = useOffline();
  const insets = useSafeAreaInsets();
  if (!offline) return null;
  return (
    <View pointerEvents="none" style={[styles.bar, { paddingTop: insets.top + 6 }]} accessibilityRole="alert">
      <WifiOff size={14} color="#fff" />
      <Text style={styles.text}>You are offline. Showing saved data.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9000,
    backgroundColor: tw.gray900,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: { color: '#fff', fontSize: 12, ...ff(700) },
});
