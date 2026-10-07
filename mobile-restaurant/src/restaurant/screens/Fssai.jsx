import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Download, Info, Upload } from 'lucide-react-native';
import { Button, Card } from '../../components/ds';
import { Press } from '../../components/ui';
import { color, radii, space, type } from '../../theme';
import ImageSourcePicker from '../components/ImageSourcePicker';
import { useFssaiDetails } from '../hooks/pages/useFssaiDetails';
import { useFssaiUpdate } from '../hooks/pages/useFssaiUpdate';
import { Field, Input, Notice, PinnedBar, ScreenHeader } from './inventory/partnerKit';

/** Port of Food/pages/restaurant/FssaiDetails.jsx (/food/restaurant/fssai). The web page shows no live licence data either. */
export function FssaiDetails() {
  const { navigate, goBack } = useFssaiDetails();
  const toUpdate = () => navigate('/food/restaurant/fssai/update');
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader title="FSSAI details" subtitle="No live licence data available" onBack={goBack} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxxl }}>
        <Notice tone="warning" icon={Info} title="FSSAI details are not available">
          Upload or sync your licence information to manage compliance here.
        </Notice>

        <Card padded={false} style={{ overflow: 'hidden' }}>
          <View style={[styles.row, styles.divider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>FSSAI registration number</Text>
              <Text style={styles.value}>Not available</Text>
            </View>
          </View>
          <View style={[styles.row, styles.divider]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Document</Text>
              <Text style={styles.value}>No document uploaded</Text>
            </View>
            {/* The web button has no action: there is no document to download. */}
            <View style={styles.download} accessibilityLabel="Download unavailable">
              <Download size={18} color={color.textDisabled} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Valid up to</Text>
              <Text style={styles.value}>Not available</Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      <PinnedBar style={{ gap: space.sm }}>
        <Button title="Update FSSAI licence" size="lg" onPress={toUpdate} />
        <Text style={[type.small, { color: color.textSecondary, textAlign: 'center' }]}>
          Haven&apos;t renewed your FSSAI?{' '}
          <Text onPress={toUpdate} accessibilityRole="link" style={{ color: color.primary, fontFamily: 'Poppins_600SemiBold', textDecorationLine: 'underline' }}>
            Apply now
          </Text>
        </Text>
      </PinnedBar>
    </View>
  );
}

/** Port of Food/pages/restaurant/FssaiUpdate.jsx (/food/restaurant/fssai/update). */
export function FssaiUpdate() {
  const { goBack, uploadedFile, isPhotoPickerOpen, setIsPhotoPickerOpen, handleFileSelect, handleFileClick, handleSubmit } = useFssaiUpdate();
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader title="Update FSSAI" onBack={goBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl }}>
        {/* As on the web, these two fields are not bound to anything: only the upload is checked. */}
        <Card style={{ gap: space.lg }}>
          <Field label="FSSAI registration number">
            <Input placeholder="e.g. 19138110019201" keyboardType="number-pad" accessibilityLabel="FSSAI registration number" />
          </Field>
          <Field label="Valid up to">
            <Input placeholder="DD-MM-YYYY" accessibilityLabel="Valid up to" />
          </Field>
          <Field label="FSSAI licence" hint="View upload guidelines">
            <Press scale={0.99} onPress={handleFileClick} accessibilityLabel={uploadedFile ? `Change file ${uploadedFile.name}` : 'Upload your FSSAI license'} style={[styles.drop, uploadedFile && styles.dropDone]}>
              <View style={[styles.dropIcon, uploadedFile && { backgroundColor: color.successSoft }]}>
                {uploadedFile ? <CheckCircle2 size={24} color={color.success} /> : <Upload size={24} color={color.primary} />}
              </View>
              <Text style={[type.bodyStrong, { color: color.text, textAlign: 'center' }]} numberOfLines={2}>{uploadedFile ? uploadedFile.name : 'Upload your FSSAI licence'}</Text>
              <Text style={[type.caption, { color: color.textMuted }]}>{uploadedFile ? 'Tap to change' : 'JPEG, PNG or PDF, up to 5 MB'}</Text>
            </Press>
          </Field>
        </Card>
      </ScrollView>

      <PinnedBar>
        <Button title="Confirm" size="lg" disabled={!uploadedFile} onPress={() => handleSubmit({ preventDefault() {} })} />
      </PinnedBar>

      <ImageSourcePicker
        isOpen={isPhotoPickerOpen}
        onClose={() => setIsPhotoPickerOpen(false)}
        onFileSelect={handleFileSelect}
        title="Upload FSSAI License"
        description="Choose how to upload your FSSAI license"
        fileNamePrefix="fssai-license"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  label: { ...type.caption, color: color.textMuted, marginBottom: 2 },
  value: { ...type.bodyStrong, color: color.text },
  download: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center' },
  drop: { borderRadius: radii.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.surfaceMuted, paddingHorizontal: space.lg, paddingVertical: space.xxl, alignItems: 'center', gap: space.xs },
  dropDone: { borderColor: color.success, backgroundColor: color.surface },
  dropIcon: { width: 52, height: 52, borderRadius: radii.lg, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
});
