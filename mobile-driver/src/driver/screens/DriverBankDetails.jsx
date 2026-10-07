import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Landmark, QrCode, Save, Upload } from 'lucide-react-native';
import Img from '../../components/Img';
import { openCamera, openGallery } from '../../lib/images';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, shadow } from '../../theme';
import { getCurrentDriver, updateDriverProfile } from '../services/registrationService';
import { readFileAsDataUrl, uploadService } from '../services/driverUploadService';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';
import { Card, CtaButton } from '../ui/Surface';

// Web: Taxi/modules/driver/pages/DriverBankDetailsPage.jsx (/taxi/driver/profile/bank-details)

const unwrapDriver = (response) => response?.data?.data || response?.data || response || null;

const normalizeBankDetails = (bankDetails = {}) => ({
  accountHolderName: String(bankDetails?.accountHolderName || '').trim(),
  upiId: String(bankDetails?.upiId || '').trim(),
  qrCodeImage: String(bankDetails?.qrCodeImage || '').trim(),
  accountNumber: String(bankDetails?.accountNumber || '').trim(),
  ifsc: String(bankDetails?.ifsc || '').trim().toUpperCase(),
  branchName: String(bankDetails?.branchName || '').trim(),
  updatedAt: bankDetails?.updatedAt || null,
});

const extractUploadUrl = (payload) => payload?.data?.url || payload?.data?.secureUrl || payload?.url || payload?.secureUrl || '';

function Field({ label, value, onChange, placeholder, keyboardType, maxLength, autoCapitalize = 'none' }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={st.fieldLabel}>{String(label).toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={DT.faint}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[st.input, focused && { borderColor: DT.brand, backgroundColor: DT.card }]}
      />
    </View>
  );
}

export default function DriverBankDetails() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const routePrefix = '/taxi/driver';

  const [driver, setDriver] = useState(null);
  const [bankForm, setBankForm] = useState(() => normalizeBankDetails());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    const loadDriver = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getCurrentDriver();
        if (!active) return;
        const nextDriver = unwrapDriver(response);
        setDriver(nextDriver);
        setBankForm(normalizeBankDetails(nextDriver?.bankDetails));
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Unable to load bank details');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDriver();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    if (bankForm.upiId) return bankForm.upiId;
    if (bankForm.accountNumber) return `A/C ${bankForm.accountNumber.slice(-4).padStart(bankForm.accountNumber.length, '*')}`;
    return 'Add your payout details for withdrawals';
  }, [bankForm.accountNumber, bankForm.upiId]);

  const handleFieldChange = (field, value) => {
    setSuccess('');
    setBankForm((current) => ({
      ...current,
      [field]: field === 'ifsc' ? String(value || '').toUpperCase() : value,
    }));
  };

  const uploadPicked = async (file) => {
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl.startsWith('data:image/')) {
        throw new Error('Please choose an image file');
      }

      const uploadPayload = await uploadService.uploadImage(dataUrl, 'driver-bank-qr');
      const qrCodeImage = extractUploadUrl(uploadPayload);

      if (!qrCodeImage) {
        throw new Error('QR upload failed');
      }

      setBankForm((current) => ({ ...current, qrCodeImage }));
    } catch (err) {
      setError(err?.message || 'QR upload failed');
    } finally {
      setUploading(false);
    }
  };

  // The web's <input type="file" accept="image/*"> offers camera or gallery.
  const handleQrUpload = () => {
    if (uploading) return;
    Alert.alert('Upload QR', undefined, [
      { text: 'Camera', onPress: () => openCamera({ fileNamePrefix: 'driver-bank-qr', onSelectFile: uploadPicked }) },
      { text: 'Gallery', onPress: () => openGallery({ fileNamePrefix: 'driver-bank-qr', onSelectFile: uploadPicked }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (saving || uploading) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await updateDriverProfile({
        bankDetails: {
          accountHolderName: bankForm.accountHolderName,
          upiId: bankForm.upiId,
          qrCodeImage: bankForm.qrCodeImage,
          accountNumber: bankForm.accountNumber,
          ifsc: bankForm.ifsc,
          branchName: bankForm.branchName,
        },
      });
      const updated = unwrapDriver(response);
      const nextBankDetails = normalizeBankDetails(updated?.bankDetails || bankForm);
      setDriver((current) => ({ ...(current || {}), bankDetails: nextBankDetails }));
      setBankForm(nextBankDetails);
      setSuccess('Bank details saved successfully.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save bank details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.root}>
      <ScreenHeader title="Bank Details" subtitle="Driver profile" onBack={() => navigate(`${routePrefix}/profile`)} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 + insets.bottom, gap: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card tone="dark" style={st.dark}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
            <View style={st.darkIcon}>
              <Landmark size={24} color={DT.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.darkEyebrow}>PAYOUT SETUP</Text>
              <Text style={st.darkSummary}>{summary}</Text>
              <Text style={st.darkNote}>These details will be used when you send a withdrawal request.</Text>
            </View>
          </View>
        </Card>

        <Card style={st.card}>
          {loading ? (
            <Text style={st.loading}>Loading bank details...</Text>
          ) : (
            <View style={{ gap: 20 }}>
              <Field label="Account Holder Name" value={bankForm.accountHolderName} placeholder="Enter account holder name" autoCapitalize="sentences" onChange={(value) => handleFieldChange('accountHolderName', value)} />
              <Field label="UPI ID" value={bankForm.upiId} placeholder="name@upi" keyboardType="email-address" onChange={(value) => handleFieldChange('upiId', value)} />

              <View style={st.qrBox}>
                <View style={{ gap: 16 }}>
                  <View style={st.qrPreview}>
                    {bankForm.qrCodeImage ? <Img source={{ uri: bankForm.qrCodeImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="UPI QR code" /> : <QrCode size={42} color={DT.faint} />}
                  </View>
                  <View style={{ gap: 12 }}>
                    <View>
                      <Text style={st.qrTitle}>UPI QR Code</Text>
                      <Text style={st.qrSub}>Upload your payout QR image from gallery or camera.</Text>
                    </View>
<CtaButton
                      title={uploading ? 'UPLOADING...' : 'UPLOAD QR'}
                      variant="brand"
                      onPress={handleQrUpload}
                      disabled={uploading}
                      accessibilityLabel="Upload UPI QR code"
                      icon={<Upload size={15} color={DT.onBrand} />}
                    />
                  </View>
                </View>
              </View>

              <Field label="Account Number" value={bankForm.accountNumber} placeholder="Enter account number" keyboardType="numeric" onChange={(value) => handleFieldChange('accountNumber', value.replace(/\D/g, ''))} />
              <Field label="IFSC" value={bankForm.ifsc} placeholder="ABCD0123456" maxLength={11} autoCapitalize="characters" onChange={(value) => handleFieldChange('ifsc', value)} />
              <Field label="Branch Name" value={bankForm.branchName} placeholder="Enter branch name" autoCapitalize="sentences" onChange={(value) => handleFieldChange('branchName', value)} />

              {driver?.bankDetails?.updatedAt ? <Text style={st.updated}>Last updated: {new Date(driver.bankDetails.updatedAt).toLocaleString('en-IN')}</Text> : null}

              {error ? <Text style={st.error}>{error}</Text> : null}
              {success ? <Text style={st.success}>{success}</Text> : null}

              <View style={{ gap: 12, paddingTop: 8 }}>
<CtaButton title="Save" onPress={handleSave} disabled={uploading} loading={saving} icon={<Save size={16} color={DT.ctaInk} />} />
                <CtaButton title="Back" variant="outline" onPress={() => navigate(`${routePrefix}/profile`)} />
              </View>
            </View>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: DT.bg },
  dark: { borderRadius: DT.radius.xl, padding: 22, ...shadow('lg') },
  darkIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(202,168,62,0.14)', borderWidth: 1, borderColor: 'rgba(202,168,62,0.35)', alignItems: 'center', justifyContent: 'center' },
  darkEyebrow: { fontSize: 11, letterSpacing: 1.4, minWidth: 100, color: DT.gold, ...fo(800) },
  darkSummary: { marginTop: 8, fontSize: 18, color: DT.onBrand, ...fo(800) },
  darkNote: { marginTop: 8, fontSize: 13, lineHeight: 19, color: DT.onBrandMuted, ...fo(500) },
  card: { borderRadius: DT.radius.xl, padding: 22 },
  loading: { paddingVertical: 64, textAlign: 'center', fontSize: 14, color: DT.muted, ...fo(600) },
  fieldLabel: { fontSize: 11, letterSpacing: 0.8, minWidth: 60, color: DT.muted, ...fo(800) },
  input: { height: 52, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.bg, paddingHorizontal: 16, paddingVertical: 0, fontSize: 15, color: DT.ink, ...fo(600) },
  qrBox: { borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.bgSoft, padding: 16 },
  qrPreview: { height: 144, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: DT.radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: DT.brandBorder, backgroundColor: DT.card },
  qrTitle: { fontSize: 14, color: DT.ink, ...fo(800) },
  qrSub: { marginTop: 4, fontSize: 12, color: DT.inkSoft, ...fo(500) },
  updated: { fontSize: 12, color: DT.muted, ...fo(500) },
  error: { borderRadius: DT.radius.md, backgroundColor: DT.dangerSoft, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: DT.dangerInk, ...fo(600) },
  success: { borderRadius: DT.radius.md, backgroundColor: DT.successSoft, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: DT.successInk, ...fo(600) },
});
