import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Camera, Check, Image as ImageIcon, Upload, X } from 'lucide-react-native';
import { deliveryApi } from '../../../../api/delivery';
import { getAuthToken } from '../../../../api/client';
import { Press } from '../../../../components/ui';
import { Spinner } from '../../../../components/Loader';
import useDeliveryOnboardingExitGuard from '../../../../delivery/hooks/useDeliveryOnboardingExitGuard';
import {
  DELIVERY_SIGNUP_DOC_TYPES,
  clearSignupDocuments,
  deleteSignupDocument,
  getAllSignupDocuments,
  saveSignupDocument,
} from '../../../../delivery/onboardingStorage';
import { collectFcmTokenForSignup, finalizeDeliveryPendingSubmission, prefetchModuleFcmToken } from '../../../../delivery/push';
import { getUserFacingApiError, isAlreadyExistsError, showUserFacingApiError } from '../../../../lib/apiError';
import { openCamera, openGallery, prepareSignupDocumentFile, prepareUploadFile } from '../../../../lib/images';
import { toast } from '../../../../lib/notify';
import { localStore, sessionStore } from '../../../../lib/storage';
import { display, gradients, poppins, shadow, tw } from '../../../../theme';

// Web: pages/auth/SignupStep2.jsx (/food/delivery/signup/documents)

const DOCS = [
  { docType: 'profilePhoto', label: 'Profile Photo' },
  { docType: 'aadharPhoto', label: 'Aadhar Card Photo' },
  { docType: 'panPhoto', label: 'PAN Card Photo' },
  { docType: 'drivingLicensePhoto', label: 'Driving License Photo' },
];

export default function SignupStep2() {
  const insets = useSafeAreaInsets();
  const { handleBack } = useDeliveryOnboardingExitGuard('documents');
  const [previews, setPreviews] = useState(getAllSignupDocuments);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    prefetchModuleFcmToken('delivery');
  }, []);

  const handleFileSelect = async (docType, file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) return;
    if (file.size && file.size > 5 * 1024 * 1024) return;
    setUploading((prev) => ({ ...prev, [docType]: true }));
    let finished = false;
    // Failsafe: never leave the card stuck on "Uploading...".
    const failSafeId = setTimeout(() => {
      if (!finished) setUploading((prev) => ({ ...prev, [docType]: false }));
    }, 12000);
    try {
      const prepared = await prepareSignupDocumentFile(file);
      saveSignupDocument(docType, prepared);
      setPreviews((prev) => ({ ...prev, [docType]: prepared }));
    } catch {
      toast.error('Could not process image. Please try another photo.');
    } finally {
      finished = true;
      clearTimeout(failSafeId);
      setUploading((prev) => ({ ...prev, [docType]: false }));
    }
  };

  const handleRemove = (docType) => {
    deleteSignupDocument(docType);
    setPreviews((prev) => ({ ...prev, [docType]: null }));
  };

  const handleSubmit = async () => {
    const docs = getAllSignupDocuments();
    if (DELIVERY_SIGNUP_DOC_TYPES.find((d) => !docs[d])) return;

    const raw = sessionStore.getItem('deliverySignupDetails');
    let details;
    try {
      details = raw ? JSON.parse(raw) : null;
    } catch {
      details = null;
    }
    if (!details) {
      router.replace('/food/delivery/signup');
      return;
    }

    const { fcmToken, platform } = await collectFcmTokenForSignup('delivery');
    const [profilePhoto, aadharPhoto, panPhoto, drivingLicensePhoto] = await Promise.all([
      prepareUploadFile(docs.profilePhoto, { preset: 'profile' }),
      prepareUploadFile(docs.aadharPhoto),
      prepareUploadFile(docs.panPhoto),
      prepareUploadFile(docs.drivingLicensePhoto),
    ]);
    const part = (f) => ({ uri: f.uri, name: f.name, type: f.type });

    const formData = new FormData();
    formData.append('name', details.name || '');
    formData.append('phone', String(details.phone || '').replace(/\D/g, '').slice(0, 15));
    formData.append('email', String(details.email || '').trim().toLowerCase());
    if (details.ref) formData.append('ref', String(details.ref).trim());
    if (details.countryCode) formData.append('countryCode', details.countryCode);
    if (details.address) formData.append('address', details.address);
    if (details.city) formData.append('city', details.city);
    if (details.state) formData.append('state', details.state);
    if (details.vehicleType) formData.append('vehicleType', details.vehicleType);
    if (details.vehicleName) formData.append('vehicleName', details.vehicleName);
    if (details.vehicleNumber) formData.append('vehicleNumber', details.vehicleNumber);
    if (details.drivingLicenseNumber) {
      formData.append('drivingLicenseNumber', details.drivingLicenseNumber);
      formData.append('documents[drivingLicense][number]', details.drivingLicenseNumber);
    }
    if (details.panNumber) formData.append('panNumber', details.panNumber);
    if (details.aadharNumber) formData.append('aadharNumber', details.aadharNumber);
    formData.append('profilePhoto', part(profilePhoto));
    formData.append('aadharPhoto', part(aadharPhoto));
    formData.append('panPhoto', part(panPhoto));
    formData.append('drivingLicensePhoto', part(drivingLicensePhoto));
    if (fcmToken) {
      formData.append('fcmToken', fcmToken);
      formData.append('platform', platform);
    }

    const hasDeliveryAuth = localStore.getItem('delivery_authenticated') === 'true' && Boolean(getAuthToken());
    const shouldRegister = sessionStore.getItem('deliveryNeedsRegistration') === 'true' || !hasDeliveryAuth;
    const phone = String(details.phone || '').replace(/\D/g, '').slice(-10);

    setIsSubmitting(true);
    try {
      const response = shouldRegister ? await deliveryApi.register(formData) : await deliveryApi.completeProfile(formData);
      if (response?.data?.success) {
        sessionStore.removeItem('deliverySignupDetails');
        sessionStore.removeItem('deliverySignupDocs');
        clearSignupDocuments();
        if (shouldRegister) {
          sessionStore.removeItem('deliveryNeedsRegistration');
          finalizeDeliveryPendingSubmission(phone, { fcmToken, platform });
        } else {
          toast.success('Profile submitted. Waiting for admin approval.');
          setTimeout(() => router.replace('/food/delivery'), 1500);
        }
      }
    } catch (error) {
      const errorMsg = getUserFacingApiError(error, 'Registration failed. Please try again.');
      // Already registered / pending: go to the verification screen instead of the raw error.
      if (isAlreadyExistsError(errorMsg) || isAlreadyExistsError(error)) {
        sessionStore.removeItem('deliveryNeedsRegistration');
        finalizeDeliveryPendingSubmission(phone, { fcmToken, platform });
        return;
      }
      showUserFacingApiError(error, 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allDocumentsUploaded = DELIVERY_SIGNUP_DOC_TYPES.every((d) => Boolean(previews[d]));
  const disabled = isSubmitting || !allDocumentsUploaded;

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Press onPress={handleBack} accessibilityLabel="Back" style={styles.back} scale={1}>
          <ArrowLeft size={20} color="#1F1F24" />
        </Press>
        <Text style={styles.headerTitle}>Upload Documents</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}>
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.h2}>Document Verification</Text>
          <Text style={styles.sub}>Please upload clear photos of your documents</Text>
        </View>

        <View style={{ gap: 16 }}>
          {DOCS.map(({ docType, label }) => {
            const file = previews[docType];
            const isUploading = uploading[docType];
            return (
              <View key={docType} style={styles.card}>
                <Text style={styles.label}>
                  {label} <Text style={{ color: tw.red500 }}>*</Text>
                </Text>
                {file ? (
                  <View>
                    <Image source={{ uri: file.uri }} style={styles.preview} resizeMode="cover" accessibilityLabel={label} />
                    <Press onPress={() => handleRemove(docType)} accessibilityLabel={`Remove ${label}`} style={styles.remove} scale={1}>
                      <X size={16} color="#fff" />
                    </Press>
                    <View style={[styles.badge, shadow('md')]}>
                      <Check size={14} color="#fff" />
                      <Text style={styles.badgeText}>Uploaded</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.drop}>
                    <View style={styles.dropInner}>
                      {isUploading ? (
                        <>
                          {/* border-2 transparent ring with a #00B761 bottom arc, spinning */}
                          <View style={{ marginBottom: 8 }}>
                            <Spinner size={32} color="#00B761" />
                          </View>
                          <Text style={styles.dropText}>Uploading...</Text>
                        </>
                      ) : (
                        <>
                          <Upload size={32} color={tw.gray400} style={{ marginBottom: 8 }} />
                          <Text style={[styles.dropText, { marginBottom: 4 }]}>Upload document</Text>
                          <Text style={styles.dropHint}>PNG, JPG up to 5MB</Text>
                        </>
                      )}
                    </View>
                    {!isUploading ? (
                      <View style={styles.pickRow}>
                        <Press
                          onPress={() => openCamera({ onSelectFile: (f) => handleFileSelect(docType, f), fileNamePrefix: `signup-${docType}` })}
                          accessibilityLabel={`Take photo for ${label}`}
                          style={[styles.pickBtn, { backgroundColor: tw.gray900 }]}
                        >
                          <Camera size={16} color="#fff" />
                          <Text style={styles.pickText}>Take Photo</Text>
                        </Press>
                        <Press
                          onPress={() => openGallery({ onSelectFile: (f) => handleFileSelect(docType, f), fileNamePrefix: `signup-${docType}` })}
                          accessibilityLabel={`Choose ${label} from gallery`}
                          style={[styles.pickBtn, { backgroundColor: tw.primary }]}
                        >
                          <ImageIcon size={16} color="#fff" />
                          <Text style={styles.pickText}>Gallery</Text>
                        </Press>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            );
          })}

          {/* mt-6 inside space-y-4 collapses to 24 */}
          <Press
            onPress={handleSubmit}
            disabled={disabled}
            scale={0.98}
            accessibilityLabel="Complete Signup"
            style={[styles.submit, { marginTop: 8 }, !disabled && shadow('button')]}
          >
            {disabled ? (
              <View style={[styles.submitInner, { backgroundColor: tw.gray400 }]}>
                <Text style={styles.submitText}>{isSubmitting ? 'Submitting...' : 'Complete Signup'}</Text>
              </View>
            ) : (
              <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitInner}>
                <Text style={styles.submitText}>Complete Signup</Text>
              </LinearGradient>
            )}
          </Press>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.gray100 },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: tw.gray200,
  },
  back: { padding: 8, borderRadius: 999 },
  headerTitle: { fontSize: 18, lineHeight: 28, color: '#1F1F24', ...display(500, 18) },
  content: { paddingHorizontal: 16, paddingTop: 24 },
  h2: { fontSize: 20, lineHeight: 28, color: tw.gray900, marginBottom: 8, ...display(700, 20) },
  sub: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: tw.gray200 },
  label: { fontSize: 14, lineHeight: 20, color: tw.gray700, marginBottom: 8, ...poppins(500) },
  preview: { width: '100%', height: 192, borderRadius: 8 },
  remove: { position: 'absolute', top: 8, right: 8, backgroundColor: tw.red500, padding: 8, borderRadius: 999 },
  badge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00B761',
  },
  badgeText: { color: '#fff', fontSize: 12, lineHeight: 16, ...poppins(600) },
  drop: {
    height: 192,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: tw.gray300,
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropInner: { alignItems: 'center', justifyContent: 'center', paddingTop: 20, paddingBottom: 12 },
  dropText: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  dropHint: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(400) },
  pickRow: { width: '100%', flexDirection: 'row', gap: 8, paddingBottom: 16 },
  pickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  pickText: { color: '#fff', fontSize: 12, lineHeight: 16, ...poppins(700) },
  submit: { borderRadius: 8 },
  submitInner: { borderRadius: 8, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontSize: 16, lineHeight: 24, ...poppins(700) },
});
