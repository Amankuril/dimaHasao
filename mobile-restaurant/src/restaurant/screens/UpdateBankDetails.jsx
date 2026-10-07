import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, ImageOff, Upload } from 'lucide-react-native';
import Img from '../../components/Img';
import { Button, Card, SectionHeader } from '../../components/ds';
import { color, radii, space, type } from '../../theme';
import ImageSourcePicker from '../components/ImageSourcePicker';
import { PageHeader } from '../components/ui';
import { useUpdateBankDetails } from '../hooks/pages/useUpdateBankDetails';
import { FieldLabel, Input, PinnedBar } from './inventory/partnerKit';

/** Port of Food/pages/restaurant/UpdateBankDetails.jsx (/food/restaurant/update-bank-details). */
export default function UpdateBankDetails() {
  const { goBack, loading, saving, uploadingQr, form, setForm, errors, isQrPickerOpen, setIsQrPickerOpen, formattedUpdatedAt, handleQrUpload, handleQrClick, handleSubmit } = useUpdateBankDetails();

  const field = (key, label, placeholder, clean, props = {}) => (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <Input
        value={form[key]}
        onChangeText={(text) => setForm((p) => ({ ...p, [key]: clean ? clean(text) : text }))}
        placeholder={placeholder}
        accessibilityLabel={label}
        error={Boolean(errors[key])}
        {...props}
      />
      {errors[key] ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <AlertCircle size={14} color={color.danger} />
          <Text style={styles.errorText}>{errors[key]}</Text>
        </View>
      ) : null}
    </View>
  );
  const digits = (text) => text.replace(/[^\d\s-]/g, '');

  return (
    <View style={styles.page}>
      <PageHeader title="Bank & UPI details" onBack={goBack} backLabel="Back" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={color.primary} />
              <Text style={[type.body, { color: color.textMuted }]}>Loading details...</Text>
            </View>
          ) : (
            <View style={{ gap: space.xxl }}>
              <View>
                <SectionHeader title="Account details" style={{ marginBottom: formattedUpdatedAt ? space.xs : space.md }} />
                {formattedUpdatedAt ? <Text style={styles.updated}>Last updated: {formattedUpdatedAt}</Text> : null}
                <Card style={{ gap: space.lg }}>
                  {field('accountHolderName', 'Account holder name', 'Enter account holder name')}
                  {field('accountNumber', 'Account number', 'Enter account number', digits, { keyboardType: 'number-pad' })}
                  {field('confirmAccountNumber', 'Confirm account number', 'Re-enter account number', digits, { keyboardType: 'number-pad' })}
                  {field('ifscCode', 'IFSC code', 'e.g. SBIN0018764', (text) => text.toUpperCase().replace(/[^A-Z0-9]/g, ''), { maxLength: 11, autoCapitalize: 'characters' })}
                </Card>
              </View>

              <View>
                <SectionHeader title="UPI details" />
                <Card style={{ gap: space.lg }}>
                  {field('upiId', 'UPI ID', 'e.g. merchant@okaxis', (text) => text.trim(), { autoCapitalize: 'none', keyboardType: 'email-address' })}

                  <View>
                    <FieldLabel>UPI QR image</FieldLabel>
                    <View style={styles.qrRow}>
                      {form.upiQrImage ? (
                        <Img source={{ uri: form.upiQrImage }} style={styles.qr} resizeMode="contain" accessibilityLabel="UPI QR" />
                      ) : (
                        <View style={[styles.qr, styles.qrEmpty]}>
                          <ImageOff size={22} color={color.textDisabled} />
                          <Text style={styles.qrEmptyText}>No QR uploaded</Text>
                        </View>
                      )}
                      <Button
                        title={uploadingQr ? 'Uploading...' : 'Upload QR image'}
                        icon={Upload}
                        variant="secondary"
                        loading={uploadingQr}
                        disabled={uploadingQr}
                        fullWidth={false}
                        onPress={handleQrClick}
                        style={{ alignSelf: 'center' }}
                      />
                    </View>
                  </View>
                </Card>
              </View>
            </View>
          )}
        </ScrollView>
        {!loading ? (
          <PinnedBar>
            <Button title={saving ? 'Saving...' : 'Submit'} size="lg" loading={saving} disabled={saving || uploadingQr} onPress={() => handleSubmit({ preventDefault() {} })} />
          </PinnedBar>
        ) : null}
      </KeyboardAvoidingView>

      <ImageSourcePicker isOpen={isQrPickerOpen} onClose={() => setIsQrPickerOpen(false)} onFileSelect={handleQrUpload} title="Upload UPI QR" description="Choose how to upload your bank UPI QR image" fileNamePrefix="upi-qr" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  scroll: { padding: space.lg, paddingBottom: space.xxl },
  loading: { paddingVertical: space.xxxl + space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  updated: { ...type.caption, color: color.textMuted, marginBottom: space.md },
  error: { marginTop: space.xs, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  errorText: { flex: 1, ...type.small, color: color.danger },
  qrRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.lg },
  qr: { width: 140, height: 140, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surface },
  qrEmpty: { borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  qrEmptyText: { ...type.caption, color: color.textMuted },
});
