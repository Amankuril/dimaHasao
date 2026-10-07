import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Upload } from 'lucide-react-native';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { poppins, tw } from '../../theme';
import ImageSourcePicker from '../components/ImageSourcePicker';
import { PageHeader } from '../components/ui';
import { useUpdateBankDetails } from '../hooks/pages/useUpdateBankDetails';
import { RT, RT_GRADIENT } from '../theme';

/** Port of Food/pages/restaurant/UpdateBankDetails.jsx (/food/restaurant/update-bank-details). */
export default function UpdateBankDetails() {
  const insets = useSafeAreaInsets();
  const { goBack, loading, saving, uploadingQr, form, setForm, errors, isQrPickerOpen, setIsQrPickerOpen, formattedUpdatedAt, handleQrUpload, handleQrClick, handleSubmit } = useUpdateBankDetails();

  const field = (key, label, placeholder, clean, props = {}) => (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={form[key]}
        onChangeText={(text) => setForm((p) => ({ ...p, [key]: clean ? clean(text) : text }))}
        placeholder={placeholder}
        placeholderTextColor={tw.gray400}
        accessibilityLabel={label}
        style={[styles.input, errors[key] ? { borderColor: tw.red500 } : null]}
        {...props}
      />
      {errors[key] ? (
        <View style={styles.error}>
          <AlertCircle size={12} color={RT.primary} />
          <Text style={styles.errorText}>{errors[key]}</Text>
        </View>
      ) : null}
    </View>
  );
  const digits = (text) => text.replace(/[^\d\s-]/g, '');

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageHeader title="Bank & UPI Details" onBack={goBack} backLabel="Back" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 + insets.bottom }}>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={tw.gray600} />
              <Text style={{ fontSize: 16, color: tw.gray600, ...poppins(400) }}>Loading details...</Text>
            </View>
          ) : (
            <View style={{ gap: 20 }}>
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.h2}>Account details</Text>
                {formattedUpdatedAt ? <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 4, ...poppins(400) }}>Last updated: {formattedUpdatedAt}</Text> : null}
              </View>

              {field('accountHolderName', 'Account holder name', 'Enter account holder name')}
              {field('accountNumber', 'Account number', 'Enter account number', digits, { keyboardType: 'number-pad' })}
              {field('confirmAccountNumber', 'Confirm account number', 'Re-enter account number', digits, { keyboardType: 'number-pad' })}
              {field('ifscCode', 'IFSC code', 'e.g. SBIN0018764', (text) => text.toUpperCase().replace(/[^A-Z0-9]/g, ''), { maxLength: 11, autoCapitalize: 'characters' })}

              <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray200 }}>
                <Text style={[styles.h2, { marginBottom: 12 }]}>UPI details</Text>
                {field('upiId', 'UPI ID', 'e.g. merchant@okaxis', (text) => text.trim(), { autoCapitalize: 'none', keyboardType: 'email-address' })}

                <View style={{ marginTop: 16 }}>
                  <Text style={styles.label}>UPI QR image</Text>
                  {form.upiQrImage ? (
                    <Img source={{ uri: form.upiQrImage }} style={styles.qr} resizeMode="contain" accessibilityLabel="UPI QR" />
                  ) : (
                    <View style={[styles.qr, { borderStyle: 'dashed', borderColor: tw.gray300, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) }}>No QR uploaded</Text>
                    </View>
                  )}
                  <Press scale={0.98} onPress={handleQrClick} disabled={uploadingQr} style={styles.upload}>
                    {uploadingQr ? <ActivityIndicator size="small" color={tw.gray900} /> : <Upload size={16} color={tw.gray900} />}
                    <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) }}>{uploadingQr ? 'Uploading...' : 'Upload QR Image'}</Text>
                  </Press>
                </View>
              </View>

              <Press scale={0.98} onPress={() => handleSubmit({ preventDefault() {} })} disabled={saving || uploadingQr} accessibilityRole="button" accessibilityState={{ disabled: saving || uploadingQr }} style={saving || uploadingQr ? { opacity: 0.6 } : null}>
                <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 16, borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) }}>{saving ? 'Saving...' : 'Submit'}</Text>
                </LinearGradient>
              </Press>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ImageSourcePicker isOpen={isQrPickerOpen} onClose={() => setIsQrPickerOpen(false)} onFileSelect={handleQrUpload} title="Upload UPI QR" description="Choose how to upload your bank UPI QR image" fileNamePrefix="upi-qr" />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  h2: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  label: { fontSize: 14, lineHeight: 20, color: tw.gray700, marginBottom: 8, ...poppins(500) },
  input: { borderWidth: 1, borderColor: tw.gray300, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: tw.gray900, ...poppins(400) },
  error: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 16, color: RT.primary, ...poppins(400) },
  qr: { width: 160, height: 160, borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, backgroundColor: '#fff' },
  upload: { alignSelf: 'flex-start', marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: tw.gray300 },
});
