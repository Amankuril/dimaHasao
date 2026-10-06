import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Landmark, QrCode, Save, Upload } from 'lucide-react-native';
import Img from '../../components/Img';
import { Spinner } from '../../components/Loader';
import { Press } from '../../components/ui';
import { openCamera, openGallery } from '../../lib/images';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, shadow, tw } from '../../theme';
import { getCurrentDriver, updateDriverProfile } from '../services/registrationService';
import { readFileAsDataUrl, uploadService } from '../services/driverUploadService';

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
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={tw.slate400}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[st.input, focused && { borderColor: tw.slate900, backgroundColor: '#fff' }]}
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
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 40 + insets.bottom, gap: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Press onPress={() => navigate(`${routePrefix}/profile`)} style={st.back}>
            <ArrowLeft size={18} color={tw.slate700} />
          </Press>
          <View>
            <Text style={st.eyebrow}>Driver Profile</Text>
            <Text style={st.h1}>Bank Details</Text>
          </View>
        </View>

        <View style={st.dark}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
            <View style={st.darkIcon}>
              <Landmark size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.darkEyebrow}>Payout Setup</Text>
              <Text style={st.darkSummary}>{summary}</Text>
              <Text style={st.darkNote}>These details will be used when you send a withdrawal request.</Text>
            </View>
          </View>
        </View>

        <View style={st.card}>
          {loading ? (
            <Text style={st.loading}>Loading bank details...</Text>
          ) : (
            <View style={{ gap: 20 }}>
              <Field label="Account Holder Name" value={bankForm.accountHolderName} placeholder="Enter account holder name" autoCapitalize="sentences" onChange={(value) => handleFieldChange('accountHolderName', value)} />
              <Field label="UPI ID" value={bankForm.upiId} placeholder="name@upi" keyboardType="email-address" onChange={(value) => handleFieldChange('upiId', value)} />

              <View style={st.qrBox}>
                <View style={{ gap: 16 }}>
                  <View style={st.qrPreview}>
                    {bankForm.qrCodeImage ? <Img source={{ uri: bankForm.qrCodeImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="UPI QR code" /> : <QrCode size={42} color={tw.slate300} />}
                  </View>
                  <View style={{ gap: 12 }}>
                    <View>
                      <Text style={st.qrTitle}>UPI QR Code</Text>
                      <Text style={st.qrSub}>Upload your payout QR image from gallery or camera.</Text>
                    </View>
                    <Press onPress={handleQrUpload} disabled={uploading} scale={0.99} accessibilityLabel="Upload UPI QR code" style={[st.upload, { backgroundColor: uploading ? tw.slate200 : tw.slate950 }]}>
                      <Upload size={15} color={uploading ? tw.slate400 : '#fff'} />
                      <Text style={[st.uploadText, { color: uploading ? tw.slate400 : '#fff' }]}>{uploading ? 'Uploading...' : 'Upload QR'}</Text>
                    </Press>
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
                <Press onPress={() => navigate(`${routePrefix}/profile`)} style={st.backBtn}>
                  <Text style={st.backBtnText}>Back</Text>
                </Press>
                <Press onPress={handleSave} disabled={saving || uploading} style={[st.save, (saving || uploading) && { opacity: 0.6 }]}>
                  {saving ? <Spinner size={16} color="#fff" /> : <Save size={15} color="#fff" />}
                  <Text style={st.saveText}>Save</Text>
                </Press>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  back: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  eyebrow: { fontSize: 11, letterSpacing: 2.64, textTransform: 'uppercase', color: tw.slate400, ...fo(900) },
  h1: { marginTop: 4, fontSize: 24, letterSpacing: -0.6, color: tw.slate950, ...fo(900) },
  dark: { borderRadius: 32, backgroundColor: tw.slate950, padding: 24, ...shadow('xl') },
  darkIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  darkEyebrow: { fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: tw.slate400, ...fo(900) },
  darkSummary: { marginTop: 8, fontSize: 18, letterSpacing: -0.45, color: '#fff', ...fo(900) },
  darkNote: { marginTop: 8, fontSize: 14, color: tw.slate300, ...fo(500) },
  card: { borderRadius: 32, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', padding: 24, ...shadow('sm') },
  loading: { paddingVertical: 64, textAlign: 'center', fontSize: 14, color: tw.slate500, ...fo(600) },
  fieldLabel: { fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: tw.slate500, ...fo(700) },
  input: { height: 48, borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50, paddingHorizontal: 16, paddingVertical: 0, fontSize: 15, color: tw.slate900, ...fo(700) },
  qrBox: { borderRadius: 28, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50, padding: 16 },
  qrPreview: { height: 144, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.slate300, backgroundColor: '#fff' },
  qrTitle: { fontSize: 13, color: tw.slate900, ...fo(700) },
  qrSub: { marginTop: 4, fontSize: 12, color: tw.slate500, ...fo(500) },
  upload: { height: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadText: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', ...fo(700) },
  updated: { fontSize: 12, color: tw.slate400, ...fo(500) },
  error: { borderRadius: 16, backgroundColor: tw.rose50, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: tw.rose600, ...fo(700) },
  success: { borderRadius: 16, backgroundColor: tw.emerald50, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: tw.emerald700, ...fo(700) },
  backBtn: { height: 48, borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 13, color: tw.slate700, ...fo(700) },
  save: { height: 48, borderRadius: 16, backgroundColor: tw.slate950, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { fontSize: 13, color: '#fff', ...fo(700) },
});
