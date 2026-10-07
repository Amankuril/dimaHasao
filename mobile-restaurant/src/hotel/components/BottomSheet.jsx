import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet as KitBottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { color, elevation, radii, space, type } from '../../theme';

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
          <X size={20} color={color.textSecondary} />
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
    backgroundColor: color.bg,
    width: '100%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: space.md,
    paddingHorizontal: space.xl,
    ...elevation.sheet,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, alignSelf: 'center', marginBottom: space.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.lg, gap: space.md },
  title: { flex: 1, ...type.heading, color: color.text },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

export { BottomSheet };
export default BottomSheet;
