import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Press } from '../ui';
import { display, tw } from '../../theme';

/*
 * The pocket pages' "old style" bar: `bg-white border-b border-gray-200 px-4
 * py-4 flex items-center gap-4`, back button `p-2 rounded-lg` with a 20 px
 * gray-600 arrow, and an h1 (Sora). `size` and `leadingNone` follow each page.
 */
export default function PlainHeader({ title, onBack, size = 18, leadingNone = false }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: 16 + insets.top }]}>
      <Press onPress={onBack} accessibilityLabel="Back" scale={1} style={styles.back}>
        <ArrowLeft size={20} color={tw.gray600} />
      </Press>
      <Text style={[styles.title, { fontSize: size, lineHeight: leadingNone ? size : size === 20 ? 28 : 28 }, display(700, size)]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  back: { padding: 8, borderRadius: 8 },
  title: { color: tw.gray900 },
});
