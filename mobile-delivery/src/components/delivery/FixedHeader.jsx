import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Press } from '../ui';
import { display, shadow, tw } from '../../theme';

/*
 * The support pages' bar: `bg-white px-4 py-5 fixed top-0 w-full z-50
 * shadow-sm border-b border-gray-50`, back arrow (24, gray-950) and an
 * h1 `text-xl font-black` (Sora). Content below starts at pt-24 (96 px).
 */
export const FIXED_HEADER_CONTENT_TOP = 96;

export default function FixedHeader({ title, onBack, uppercase = false }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, shadow('sm'), { paddingTop: 20 + insets.top }]}>
      <Press onPress={onBack} accessibilityLabel="Back" hitSlop={8} style={styles.back}>
        <ArrowLeft size={24} color={tw.gray950} />
      </Press>
      <Text style={[styles.title, uppercase && { textTransform: 'uppercase' }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: tw.gray50,
  },
  back: { padding: 4, borderRadius: 999 },
  title: { fontSize: 20, lineHeight: 28, color: tw.gray950, ...display(900, 20) },
});
