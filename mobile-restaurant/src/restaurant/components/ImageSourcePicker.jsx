import { StyleSheet, Text, View } from 'react-native';
import { Camera, ChevronRight, Upload } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { color, radii, space, type } from '../../theme';
import { ShadDialog } from './ShadDialog';
import { openCamera, openGallery } from '../utils/imageUploadUtils';

/** Port of Food/components/ImageSourcePicker.jsx: "Use Camera" / "Upload from Device". */
export function ImageSourcePicker({ isOpen, onClose, onFileSelect, title = 'Update photo', description = 'Choose how you want to upload your photo.', fileNamePrefix = 'upload' }) {
  const pick = async (open) => {
    onClose();
    // The picker opens once the dialog is gone, as the web closes before opening.
    await open({ onSelectFile: onFileSelect, fileNamePrefix });
  };
  return (
    <ShadDialog visible={Boolean(isOpen)} onClose={onClose} style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        <Text style={styles.body}>{description}</Text>
      </View>
      <View style={styles.options}>
        <Press scale={0.98} onPress={() => pick(openCamera)} accessibilityLabel="Use camera" style={styles.option}>
          <View style={styles.optionIcon}>
            <Camera size={20} color={color.primary} />
          </View>
          <Text style={styles.optionText}>Use camera</Text>
          <ChevronRight size={18} color={color.textDisabled} />
        </Press>
        <Press scale={0.98} onPress={() => pick(openGallery)} accessibilityLabel="Upload from device" style={styles.option}>
          <View style={styles.optionIcon}>
            <Upload size={20} color={color.primary} />
          </View>
          <Text style={styles.optionText}>Upload from device</Text>
          <ChevronRight size={18} color={color.textDisabled} />
        </Press>
      </View>
    </ShadDialog>
  );
}

export default ImageSourcePicker;

const styles = StyleSheet.create({
  panel: { width: '92%', maxWidth: 400, padding: 0, overflow: 'hidden' },
  head: { padding: space.xl, paddingRight: 56, paddingBottom: space.md, gap: space.xs },
  title: { ...type.heading, color: color.text },
  body: { ...type.small, color: color.textSecondary },
  options: { gap: space.sm, paddingHorizontal: space.xl, paddingBottom: space.xl },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  optionIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, ...type.bodyStrong, color: color.text },
});
