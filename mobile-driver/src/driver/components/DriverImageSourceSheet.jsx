import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { outfit } from '../../theme';
import { DT } from '../ui/dt';

/*
 * The "Take a photo / Choose from gallery" sheet that stands in for the browser's own file chooser
 * (<input type="file" accept="image/*">), which offers the camera and the gallery in one dialog.
 */
export default function DriverImageSourceSheet({ visible, onClose, onPick }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
        <View style={styles.grab} />
        <Press scale={0.98} onPress={() => onPick('camera')} accessibilityLabel="Take a photo" accessibilityRole="button" style={styles.row}>
          <View style={styles.iconBox}>
            <Camera size={20} color={DT.brandMid} />
          </View>
          <Text style={styles.text}>Take a photo</Text>
        </Press>
        <Press scale={0.98} onPress={() => onPick('gallery')} accessibilityLabel="Choose from gallery" accessibilityRole="button" style={styles.row}>
          <View style={styles.iconBox}>
            <ImageIcon size={20} color={DT.brandMid} />
          </View>
          <Text style={styles.text}>Choose from gallery</Text>
        </Press>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: DT.card, borderTopLeftRadius: DT.radius.xl, borderTopRightRadius: DT.radius.xl, paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: DT.border, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 14, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.bg },
  iconBox: { width: 40, height: 40, borderRadius: 14, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15, lineHeight: 20, color: DT.ink, ...outfit(700) },
});
