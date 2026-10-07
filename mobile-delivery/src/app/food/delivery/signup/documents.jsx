import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Check, Image as ImageIcon, Upload, X } from 'lucide-react-native';
import { deliveryApi } from '../../../../api/delivery';
import { getAuthToken } from '../../../../api/client';
import { Button, Card, IconButton, ScreenHeader, StatusBadge } from '../../../../components/ds';
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
import { color, elevation, radii, space, type } from '../../../../theme';

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

  const uploadedCount = DOCS.filter(({ docType }) => Boolean(previews[docType])).length;

  return (
    <View style={styles.page}>
      <ScreenHeader title="Upload documents" subtitle="Step 2 of 2 · Document verification" onBack={handleBack} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.h2} accessibilityRole="header">
            Document verification
          </Text>
          <Text style={styles.sub}>Please upload clear photos of your documents</Text>
          <View style={styles.progressRow}>
            <StatusBadge
              label={`${uploadedCount} of ${DOCS.length} uploaded`}
              tone={uploadedCount === DOCS.length ? 'success' : 'neutral'}
              icon={uploadedCount === DOCS.length ? Check : undefined}
            />
          </View>
        </View>

        <View style={{ gap: space.md }}>
          {DOCS.map(({ docType, label }) => {
            const file = previews[docType];
            const isUploading = uploading[docType];
            return (
              <Card key={docType} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.label} numberOfLines={2}>
                    {label}
                    <Text style={styles.star} accessibilityLabel="required">
                      {' *'}
                    </Text>
                  </Text>
                  {file ? <StatusBadge label="Uploaded" tone="success" icon={Check} /> : null}
                </View>
                {file ? (
                  <View>
                    <Image source={{ uri: file.uri }} style={styles.preview} resizeMode="cover" accessibilityLabel={label} />
                    <IconButton
                      icon={X}
                      label={`Remove ${label}`}
                      variant="danger"
                      iconSize={20}
                      onPress={() => handleRemove(docType)}
                      style={[styles.remove, elevation.float]}
                    />
                  </View>
                ) : (
                  <View style={styles.drop}>
                    {isUploading ? (
                      <View style={styles.dropInner} accessibilityLiveRegion="polite">
                        <Spinner size={32} color={color.primary} />
                        <Text style={styles.dropText}>Uploading...</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.dropInner}>
                          <View style={styles.dropIcon}>
                            <Upload size={24} color={color.textMuted} strokeWidth={2} />
                          </View>
                          <Text style={styles.dropText}>Upload document</Text>
                          <Text style={styles.dropHint}>PNG, JPG up to 5MB</Text>
                        </View>
                        <View style={styles.pickRow}>
                          <Button
                            title="Take photo"
                            icon={Camera}
                            variant="outline"
                            fullWidth={false}
                            onPress={() => openCamera({ onSelectFile: (f) => handleFileSelect(docType, f), fileNamePrefix: `signup-${docType}` })}
                            accessibilityLabel={`Take photo for ${label}`}
                            style={styles.pickBtn}
                          />
                          <Button
                            title="Gallery"
                            icon={ImageIcon}
                            variant="secondary"
                            fullWidth={false}
                            onPress={() => openGallery({ onSelectFile: (f) => handleFileSelect(docType, f), fileNamePrefix: `signup-${docType}` })}
                            accessibilityLabel={`Choose ${label} from gallery`}
                            style={styles.pickBtn}
                          />
                        </View>
                      </>
                    )}
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
        <Button
          title={isSubmitting ? 'Submitting...' : 'Complete signup'}
          size="lg"
          onPress={handleSubmit}
          disabled={disabled}
          loading={isSubmitting}
          accessibilityLabel="Complete Signup"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, paddingBottom: space.xxxl },
  intro: { marginBottom: space.xl, paddingHorizontal: space.xs },
  h2: { ...type.title, color: color.text },
  sub: { ...type.body, color: color.textSecondary, marginTop: space.xs },
  progressRow: { marginTop: space.md, flexDirection: 'row' },
  card: { gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, minHeight: 26 },
  label: { ...type.subheading, color: color.text, flex: 1, minWidth: 0 },
  star: { color: color.danger },
  preview: { width: '100%', height: 192, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  remove: { position: 'absolute', top: space.sm, right: space.sm, backgroundColor: color.surface },
  drop: {
    minHeight: 192,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
    borderRadius: radii.md,
    backgroundColor: color.surfaceMuted,
    padding: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  dropInner: { alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingTop: space.sm },
  dropIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  dropText: { ...type.bodyStrong, color: color.textSecondary },
  dropHint: { ...type.caption, color: color.textMuted },
  pickRow: { alignSelf: 'stretch', flexDirection: 'row', gap: space.sm },
  pickBtn: { flex: 1, paddingHorizontal: space.sm },
  footer: {
    backgroundColor: color.surface,
    padding: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.borderStrong,
  },
});
