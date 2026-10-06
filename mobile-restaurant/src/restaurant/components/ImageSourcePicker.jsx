import { StyleSheet, Text, View } from 'react-native';
import { Camera, Upload } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { RT } from '../theme';
import { openCamera, openGallery } from '../utils/imageUploadUtils';

/** Port of Food/components/ImageSourcePicker.jsx: "Use Camera" / "Upload from Device". */
export function ImageSourcePicker({ isOpen, onClose, onFileSelect, title = 'Update photo', description = 'Choose how you want to upload your photo.', fileNamePrefix = 'upload' }) {
  const pick = async (open) => {
    onClose();
    // The picker opens once the dialog is gone, as the web closes before opening.
    await open({ onSelectFile: onFileSelect, fileNamePrefix });
  };
  return (
    <Dialog visible={Boolean(isOpen)} onClose={onClose} panelStyle={styles.panel}>
      <View style={{ padding: 20, paddingBottom: 12 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{description}</Text>
      </View>
      <View style={{ gap: 8, paddingHorizontal: 20, paddingBottom: 20 }}>
        <Press scale={0.98} onPress={() => pick(openCamera)} style={styles.option}>
          <Text style={styles.optionText}>Use Camera</Text>
          {/* bg-orange-50 / text-orange-600 are repainted by the restaurant theme */}
          <View style={[styles.optionIcon, { backgroundColor: RT.primarySoft }]}>
            <Camera size={20} color={RT.accent} />
          </View>
        </Press>
        <Press scale={0.98} onPress={() => pick(openGallery)} style={styles.option}>
          <Text style={styles.optionText}>Upload from Device</Text>
          <View style={[styles.optionIcon, { backgroundColor: tw.blue50 }]}>
            <Upload size={20} color={tw.blue600} />
          </View>
        </Press>
      </View>
    </Dialog>
  );
}

export default ImageSourcePicker;

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 384, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...shadow('xl') },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  body: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 2, borderColor: tw.gray200, backgroundColor: '#fff' },
  optionText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  optionIcon: { padding: 8, borderRadius: 8 },
});
