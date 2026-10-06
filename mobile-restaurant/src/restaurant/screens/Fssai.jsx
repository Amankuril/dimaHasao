import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Download } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import ImageSourcePicker from '../components/ImageSourcePicker';
import { PageHeader } from '../components/ui';
import { useFssaiDetails } from '../hooks/pages/useFssaiDetails';
import { useFssaiUpdate } from '../hooks/pages/useFssaiUpdate';
import { RT, RT_GRADIENT } from '../theme';

/** Port of Food/pages/restaurant/FssaiDetails.jsx (/food/restaurant/fssai). The web page shows no live licence data either. */
export function FssaiDetails() {
  const insets = useSafeAreaInsets();
  const { navigate, goBack } = useFssaiDetails();
  const toUpdate = () => navigate('/food/restaurant/fssai/update');
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageHeader title="FSSAI Details" subtitle="No live restaurant license data available." large={false} onBack={goBack} backLabel="Back" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 112, gap: 16 }}>
        <View style={styles.notice}>
          <View style={styles.i}>
            <Text style={{ fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(600) }}>i</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.value}>FSSAI details are not available</Text>
            <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray700, marginTop: 4, ...poppins(400) }}>Upload or sync your license information to manage compliance here.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View>
            <Text style={styles.label}>FSSAI registration number</Text>
            <Text style={styles.value}>Not available</Text>
          </View>
          <View style={styles.dash} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.label}>Document</Text>
              <Text style={styles.value}>No document uploaded</Text>
            </View>
            {/* The web button has no action: there is no document to download. */}
            <View style={styles.download}>
              <Download size={16} color={tw.gray800} />
            </View>
          </View>
          <View style={styles.dash} />
          <View>
            <Text style={styles.label}>Valid up to</Text>
            <Text style={styles.value}>Not available</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingTop: 12, paddingBottom: 24 + insets.bottom }]}>
        <Press scale={0.98} onPress={toUpdate} style={{ marginBottom: 8 }}>
          <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
            <Text style={styles.pillText}>Update FSSAI license</Text>
          </LinearGradient>
        </Press>
        <Text style={styles.renew}>
          Haven&apos;t renewed your FSSAI?{' '}
          <Text onPress={toUpdate} accessibilityRole="link" style={{ color: RT.primary, textDecorationLine: 'underline' }}>Apply Now</Text>
        </Text>
      </View>
    </View>
  );
}

/** Port of Food/pages/restaurant/FssaiUpdate.jsx (/food/restaurant/fssai/update). */
export function FssaiUpdate() {
  const insets = useSafeAreaInsets();
  const { goBack, uploadedFile, isPhotoPickerOpen, setIsPhotoPickerOpen, handleFileSelect, handleFileClick, handleSubmit } = useFssaiUpdate();
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageHeader title="Update FSSAI" large={false} onBack={goBack} backLabel="Back" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 112, gap: 16 }}>
        {/* As on the web, these two fields are not bound to anything: only the upload is checked. */}
        <View>
          <Text style={styles.fieldLabel}>FSSAI registration number</Text>
          <TextInput placeholder="eg. 19138110019201" placeholderTextColor={tw.gray400} keyboardType="number-pad" accessibilityLabel="FSSAI registration number" style={styles.input} />
        </View>
        <View>
          <Text style={styles.fieldLabel}>Valid up to</Text>
          <TextInput placeholder="DD-MM-YYYY" placeholderTextColor={tw.gray400} accessibilityLabel="Valid up to" style={styles.input} />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Upload your FSSAI license</Text>
          <Press scale={0.99} onPress={handleFileClick} style={styles.drop}>
            <Text style={{ fontSize: 24, lineHeight: 32, marginBottom: 8 }}>{uploadedFile ? '✅' : '⬆️'}</Text>
            <Text style={[styles.value, { ...poppins(500), textAlign: 'center' }]}>{uploadedFile ? uploadedFile.name : 'Upload your FSSAI license'}</Text>
            <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(400) }}>{uploadedFile ? 'Click to change' : 'jpeg, png, or pdf (up to 5MB)'}</Text>
          </Press>
          <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray700, textDecorationLine: 'underline', ...poppins(400) }}>View upload guidelines</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingTop: 8, paddingBottom: 24 + insets.bottom }]}>
        <Press scale={0.98} disabled={!uploadedFile} onPress={() => handleSubmit({ preventDefault() {} })} accessibilityState={{ disabled: !uploadedFile }}>
          <LinearGradient colors={uploadedFile ? RT_GRADIENT : [tw.gray200, tw.gray200]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
            <Text style={[styles.pillText, uploadedFile ? null : { color: tw.gray500 }]}>Confirm</Text>
          </LinearGradient>
        </Press>
      </View>

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
  notice: { borderRadius: 16, backgroundColor: '#ffe9b3', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  i: { marginTop: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: RT.primary, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray100, padding: 16, gap: 12, ...shadow('sm') },
  label: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginBottom: 4, ...poppins(400) },
  value: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  dash: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200 },
  download: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: tw.gray300, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: tw.gray200, backgroundColor: '#fff' },
  pill: { paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  pillText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) },
  renew: { fontSize: 12, lineHeight: 16, color: tw.gray600, textAlign: 'center', ...poppins(400) },
  fieldLabel: { fontSize: 12, lineHeight: 16, color: tw.gray700, marginBottom: 4, ...poppins(500) },
  input: { borderWidth: 1, borderColor: tw.gray300, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: tw.gray900, ...poppins(400) },
  drop: { borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray300, backgroundColor: tw.gray50, paddingHorizontal: 16, paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
});
