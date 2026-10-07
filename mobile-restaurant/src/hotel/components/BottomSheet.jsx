import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet as KitBottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { HT } from '../theme';

/**
 * Port of Frontend/src/modules/Hotel/app/partner/components/BottomSheet.jsx.
 * The web slides the sheet up with gsap over a black/50 overlay; this is the
 * app's Modal sheet with the same panel (rounded-t-3xl, p-6, drag handle,
 * title + close button, max 90% of the screen).
 */
const BottomSheet = ({ isOpen, onClose, title, children }) => {
  const insets = useSafeAreaInsets();
  return (
    <KitBottomSheet
      visible={Boolean(isOpen)}
      onClose={onClose}
      backdrop="rgba(0,0,0,0.5)"
      panelStyle={[styles.panel, { maxHeight: '90%', paddingBottom: 24 + insets.bottom }]}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Press onPress={onClose} accessibilityLabel="Close" style={styles.close}>
          <X size={20} color={tw.gray500} />
        </Press>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </KitBottomSheet>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#fff',
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    ...shadow('2xl'),
  },
  handle: { width: 48, height: 6, borderRadius: 3, backgroundColor: tw.gray200, alignSelf: 'center', marginBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12 },
  title: { flex: 1, fontSize: 20, lineHeight: 28, color: HT.headline, ...poppins(700) },
  close: { padding: 8, borderRadius: 999 },
});

export { BottomSheet };
export default BottomSheet;
