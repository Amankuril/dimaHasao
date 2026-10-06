import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { outfit, tw } from '../../theme';

/*
 * The "Take a photo / Choose from gallery" sheet that stands in for the browser's own file chooser
 * (<input type="file" accept="image/*">), which offers the camera and the gallery in one dialog.
 */
export default function DriverImageSourceSheet({ visible, onClose, onPick }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
        <Press scale={1} onPress={() => onPick('camera')} accessibilityLabel="Take a photo" style={styles.row}>
          <Camera size={18} color={tw.slate900} />
          <Text style={styles.text}>Take a photo</Text>
        </Press>
        <Press scale={1} onPress={() => onPick('gallery')} accessibilityLabel="Choose from gallery" style={styles.row}>
          <ImageIcon size={18} color={tw.slate900} />
          <Text style={styles.text}>Choose from gallery</Text>
        </Press>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  text: { fontSize: 15, color: tw.slate900, ...outfit(700) },
});
