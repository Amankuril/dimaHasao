import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeCheck, CalendarDays, Camera, CheckCircle2, FileText, ShieldCheck, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { openCamera, openGallery } from '../../lib/images';
import { useKeyboardHeight } from '../../lib/useKeyboard';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { outfit, playfair, shadow } from '../../theme';
import DriverDateField from '../components/DriverDateField';
import DriverImageSourceSheet from '../components/DriverImageSourceSheet';
import { useDriverImageUpload } from '../hooks/useDriverImageUpload';
import { getCurrentDriver, getDriverDocumentTemplates, updateDriverDocument } from '../services/registrationService';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';
import { Card, Chip, CtaButton, SectionLabel } from '../ui/Surface';
import {
  flattenDriverDocumentFields,
  getDocumentPreviewUrl,
  normalizeDriverDocumentTemplates,
} from '../utils/documentTemplates';

const formatDate = (value) => {
  if (!value) return 'Uploaded';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const getDocumentReviewStatus = (document = {}) =>
  String(
    document?.approvalStatus ||
    document?.reviewStatus ||
    document?.status ||
    '',
  ).trim().toLowerCase();

const getDocumentReason = (document = {}) =>
  String(
    document?.comment ||
    document?.remarks ||
    document?.reason ||
    document?.admin_comment ||
    document?.rejection_reason ||
    '',
  ).trim();

const getDocumentExpiryValue = (document = {}) =>
  document?.expiryDate ||
  document?.expiry_date ||
  document?.expiry ||
  document?.expiresAt ||
  null;

const getDocumentIdentifyValue = (document = {}) =>
  String(
    document?.identifyNumber ||
    document?.identify_number ||
    document?.documentNumber ||
    document?.document_number ||
    '',
  ).trim();

const getDocumentBirthDateValue = (document = {}) =>
  String(document?.birthDate || document?.birth_date || '').trim();

const getDocumentRequestNumberValue = (document = {}) =>
  String(document?.requestNumber || document?.request_no || '').trim();

const getDocumentIfscValue = (document = {}) =>
  String(document?.ifsc || document?.ifscCode || document?.ifsc_code || '').trim().toUpperCase();

const getDocumentAccountHolderNameValue = (document = {}) =>
  String(
    document?.accountHolderName ||
    document?.account_holder_name ||
    document?.beneficiaryName ||
    document?.benificiary_name ||
    '',
  ).trim();

const isDrivingLicenseDocument = (doc = {}) =>
  String(doc?.verificationType || '').trim() === 'driving_license' ||
  String(doc?.id || '').trim() === 'drivingLicense';

const isPanDocument = (doc = {}) =>
  String(doc?.verificationType || '').trim() === 'pan' ||
  /\bpan\b/i.test(String(doc?.id || '')) ||
  /\bpan\b/i.test(String(doc?.name || '')) ||
  /\bpancard\b/i.test(String(doc?.id || '')) ||
  /\bpancard\b/i.test(String(doc?.name || ''));

const isGstDocument = (doc = {}) =>
  String(doc?.verificationType || '').trim() === 'gstin' ||
  /\bgst\b/i.test(String(doc?.id || '')) ||
  /\bgstin\b/i.test(String(doc?.id || '')) ||
  /\bgst\b/i.test(String(doc?.name || '')) ||
  /\bgstin\b/i.test(String(doc?.name || ''));

const isRcDocument = (doc = {}) =>
  String(doc?.verificationType || '').trim() === 'rc' ||
  /\brc\b/i.test(String(doc?.id || '')) ||
  /\bvehicle rc\b/i.test(String(doc?.name || '')) ||
  /\bregistration certificate\b/i.test(String(doc?.name || ''));

const isBankDocument = (doc = {}) =>
  String(doc?.verificationType || '').trim() === 'bank_account' ||
  /\bbank\b/i.test(String(doc?.id || '')) ||
  /\bbank\b/i.test(String(doc?.name || ''));

const isDocumentExpired = (document = {}) => {
  const value = getDocumentExpiryValue(document);
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
};

const formatExpiryDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toDateInputValue = (value) => {
  if (!value) return '';
  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const unwrapDriver = (response) => response?.data?.data || response?.data || response || null;
const toTimestamp = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

function FocusInput({ style, ...rest }) {
  const [focused, setFocused] = useState(false);
  return <TextInput {...rest} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[style, focused ? { borderColor: DT.brand } : null]} />;
}

/** Port of Taxi/modules/driver/pages/settings/DriverDocuments.jsx (/taxi/driver/documents). */
export default function DriverDocuments() {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = '/taxi/driver';
  const focusDocumentKey = String(location.state?.focusDocumentKey || '').trim();
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [driver, setDriver] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingDocumentKey, setUploadingDocumentKey] = useState('');
  const [sourceFor, setSourceFor] = useState(null);
  const [expiryModal, setExpiryModal] = useState({ isOpen: false, docId: '', name: '', value: '', isSubmitting: false });
  const [metaModal, setMetaModal] = useState({
    isOpen: false,
    mode: 'license',
    docId: '',
    name: '',
    identifyNumber: '',
    birthDate: '',
    requestNumber: '',
    ifsc: '',
    accountHolderName: '',
    isSubmitting: false,
  });
  const uploadingDocumentKeyRef = useRef('');
  const autoOpenedDocumentRef = useRef('');

  const {
    uploading: imageUploading,
    handleFile: onDocumentImageSelected,
  } = useDriverImageUpload({
    folder: 'driver-documents',
    onSuccess: async (url) => {
      const activeDocumentKey = uploadingDocumentKeyRef.current;

      if (!activeDocumentKey) {
        return;
      }

      const updatedDocument = {
        key: activeDocumentKey,
        fileName: activeDocumentKey,
        previewUrl: url,
        secureUrl: url,
        uploaded: true,
        uploadedAt: new Date().toISOString(),
      };

      try {
        const response = await updateDriverDocument(activeDocumentKey, updatedDocument);
        const documents = response?.data?.documents || {
          ...(driver?.documents || {}),
          [activeDocumentKey]: updatedDocument,
        };
        setDriver((prev) => ({ ...(prev || {}), documents }));
      } catch (requestError) {
        setError(requestError?.message || 'Unable to update document image');
      } finally {
        uploadingDocumentKeyRef.current = '';
        setUploadingDocumentKey('');
      }
    },
    onError: () => {
      uploadingDocumentKeyRef.current = '';
      setUploadingDocumentKey('');
    },
  });

  const loadDriver = async () => {
    setIsSyncing(true);
    setError('');

    try {
      const [driverResponse, templateResponse] = await Promise.all([
        getCurrentDriver(),
        getDriverDocumentTemplates(),
      ]);

      setDriver(unwrapDriver(driverResponse));
      setTemplates(normalizeDriverDocumentTemplates(templateResponse?.data?.data?.results || templateResponse?.data?.results || []));
    } catch (err) {
      setError(err?.message || 'Unable to load driver documents');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadDriver();
  }, []);

  const docs = useMemo(() => {
    const documents = driver?.documents || {};

    return flattenDriverDocumentFields(templates).map((field, index) => {
      const doc = documents[field.key] || null;
      const previewUrl = getDocumentPreviewUrl(doc);
      const uploadedAt = doc?.uploadedAt || doc?.createdAt || doc?.updatedAt || '';
      const hasDoc = Boolean(previewUrl || doc);
      const expiryDate = getDocumentExpiryValue(doc);
      const identifyNumber = getDocumentIdentifyValue(doc);
      const birthDate = getDocumentBirthDateValue(doc);
      const requestNumber = getDocumentRequestNumberValue(doc);
      const ifsc = getDocumentIfscValue(doc);
      const accountHolderName = getDocumentAccountHolderNameValue(doc);
      const expired = isDocumentExpired(doc);
      const rejected = ['rejected', 'declined'].includes(getDocumentReviewStatus(doc));
      const verified = ['verified', 'approved'].includes(getDocumentReviewStatus(doc));
      const reason = getDocumentReason(doc);
      const reverificationPending =
        getDocumentReviewStatus(doc) === 'pending' &&
        Math.max(
          toTimestamp(doc?.reverificationRequestedAt),
          toTimestamp(doc?.uploadedAt),
          toTimestamp(doc?.updatedAt),
        ) > toTimestamp(doc?.reviewedAt);

      return {
        id: field.key,
        name: field.label,
        templateName: field.templateName,
        verificationType: field.verificationType,
        hasExpiryDate: field.hasExpiryDate,
        rawDocument: doc,
        reviewStatus: getDocumentReviewStatus(doc),
        hasDocument: hasDoc,
        status: verified
          ? 'Verified'
          : rejected
            ? 'Rejected'
            : reverificationPending
              ? 'Pending Reverification'
              : expired
                ? 'Expired'
                : hasDoc
                  ? 'Uploaded'
                  : 'Missing',
        date: hasDoc ? formatDate(uploadedAt) : 'Not uploaded',
        previewUrl,
        fileName: doc?.fileName || field.label,
        uploadedAt,
        expiryDate,
        identifyNumber,
        birthDate,
        requestNumber,
        ifsc,
        accountHolderName,
        hasIdentifyNumber: field.hasIdentifyNumber,
        expired,
        rejected,
        reverificationPending,
        reason,
        verified,
        order: index,
      };
    });
  }, [driver?.documents, templates]);

  const uploadedCount = docs.filter((doc) => doc.hasDocument).length;
  const actionRequiredCount = docs.filter((doc) => !doc.verified).length;

  // The web clicks the focused document's hidden file input; here the source sheet opens for it.
  useEffect(() => {
    if (!focusDocumentKey || isLoading || imageUploading) {
      return undefined;
    }

    if (autoOpenedDocumentRef.current === focusDocumentKey) {
      return undefined;
    }

    const targetDoc = docs.find((doc) => doc.id === focusDocumentKey);

    if (!targetDoc) {
      return undefined;
    }

    autoOpenedDocumentRef.current = focusDocumentKey;
    const timer = setTimeout(() => {
      setSourceFor(targetDoc);
    }, 0);
    return () => clearTimeout(timer);
  }, [docs, focusDocumentKey, imageUploading, isLoading]);

  const chooseSource = async (source) => {
    const doc = sourceFor;
    setSourceFor(null);
    if (!doc) return;
    const picker = source === 'camera' ? openCamera : openGallery;
    await picker({
      fileNamePrefix: doc.id,
      onSelectFile: (file) => {
        uploadingDocumentKeyRef.current = doc.id;
        setUploadingDocumentKey(doc.id);
        onDocumentImageSelected(file);
      },
    });
  };

  const closeExpiryModal = () => {
    setExpiryModal({ isOpen: false, docId: '', name: '', value: '', isSubmitting: false });
  };

  const closeMetaModal = () => {
    setMetaModal({
      isOpen: false,
      mode: 'license',
      docId: '',
      name: '',
      identifyNumber: '',
      birthDate: '',
      requestNumber: '',
      ifsc: '',
      accountHolderName: '',
      isSubmitting: false,
    });
  };

  const handleExpirySave = async () => {
    if (!expiryModal.docId || !expiryModal.value) {
      return;
    }

    const currentDocument = driver?.documents?.[expiryModal.docId] || {};
    const nextExpiryDate = String(expiryModal.value).trim();

    try {
      setExpiryModal((prev) => ({ ...prev, isSubmitting: true }));
      setError('');

      const response = await updateDriverDocument(expiryModal.docId, {
        ...currentDocument,
        key: expiryModal.docId,
        expiryDate: nextExpiryDate,
        expiry_date: nextExpiryDate,
        expiresAt: nextExpiryDate,
        uploaded: currentDocument?.uploaded ?? true,
      });

      const documents = response?.data?.documents || {
        ...(driver?.documents || {}),
        [expiryModal.docId]: {
          ...currentDocument,
          key: expiryModal.docId,
          expiryDate: nextExpiryDate,
          expiry_date: nextExpiryDate,
          expiresAt: nextExpiryDate,
        },
      };

      setDriver((prev) => ({ ...(prev || {}), documents }));
      closeExpiryModal();
    } catch (requestError) {
      setError(requestError?.message || 'Unable to update document expiry date');
      setExpiryModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleMetaSave = async () => {
    if (!metaModal.docId) {
      return;
    }

    const currentDocument = driver?.documents?.[metaModal.docId] || {};
    const identifyNumber = String(metaModal.identifyNumber || '').trim().toUpperCase();
    const birthDate = String(metaModal.birthDate || '').trim();
    const requestNumber = String(metaModal.requestNumber || '').trim();
    const ifsc = String(metaModal.ifsc || '').trim().toUpperCase();
    const accountHolderName = String(metaModal.accountHolderName || '').trim();

    try {
      setMetaModal((prev) => ({
        ...prev,
        isSubmitting: true,
      }));
      setError('');

      const saveResponse = await updateDriverDocument(metaModal.docId, {
        ...currentDocument,
        key: metaModal.docId,
        identifyNumber,
        identify_number: identifyNumber,
        documentNumber: identifyNumber,
        document_number: identifyNumber,
        birthDate,
        birth_date: birthDate,
        requestNumber,
        request_no: requestNumber,
        ifsc,
        ifscCode: ifsc,
        ifsc_code: ifsc,
        accountHolderName,
        account_holder_name: accountHolderName,
        beneficiaryName: accountHolderName,
        benificiary_name: accountHolderName,
        uploaded: currentDocument?.uploaded ?? true,
      });

      const documents = saveResponse?.data?.documents || {
        ...(driver?.documents || {}),
        [metaModal.docId]: {
          ...currentDocument,
          key: metaModal.docId,
          identifyNumber,
          identify_number: identifyNumber,
          documentNumber: identifyNumber,
          document_number: identifyNumber,
          birthDate,
          birth_date: birthDate,
          requestNumber,
          request_no: requestNumber,
        },
      };

      setDriver((prev) => ({ ...(prev || {}), documents }));
      closeMetaModal();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to update document details');
      setMetaModal((prev) => ({
        ...prev,
        isSubmitting: false,
      }));
    }
  };

  const metaLabel = metaModal.mode === 'pan'
    ? 'PAN Number'
    : metaModal.mode === 'gst'
      ? 'GSTIN'
      : metaModal.mode === 'rc'
        ? 'RC Number'
        : metaModal.mode === 'bank'
          ? 'Bank Account Number'
          : 'License Number';
  const metaPlaceholder = metaModal.mode === 'pan'
    ? 'Enter PAN number'
    : metaModal.mode === 'gst'
      ? 'Enter GSTIN'
      : metaModal.mode === 'rc'
        ? 'Enter RC number'
        : metaModal.mode === 'bank'
          ? 'Enter bank account number'
          : 'Enter DL number';
  const metaSaveDisabled =
    metaModal.isSubmitting ||
    !metaModal.identifyNumber ||
    (metaModal.mode === 'license' && !metaModal.birthDate) ||
    (metaModal.mode === 'bank' && (!metaModal.ifsc || !metaModal.accountHolderName));
  const expirySaveDisabled = expiryModal.isSubmitting || !expiryModal.value;

  const openMeta = (doc) => {
    setMetaModal({
      isOpen: true,
      mode: isPanDocument(doc)
        ? 'pan'
        : isGstDocument(doc)
          ? 'gst'
          : isRcDocument(doc)
            ? 'rc'
            : isBankDocument(doc)
              ? 'bank'
              : 'license',
      docId: doc.id,
      name: doc.name,
      identifyNumber: doc.identifyNumber || '',
      birthDate: toDateInputValue(doc.birthDate),
      requestNumber: doc.requestNumber || '',
      ifsc: doc.ifsc || '',
      accountHolderName: doc.accountHolderName || '',
      isSubmitting: false,
    });
  };

  const metaButtonLabel = (doc) => (isPanDocument(doc)
    ? doc.verified ? 'View PAN' : 'Verify PAN'
    : isGstDocument(doc)
      ? doc.verified ? 'View GST' : 'Verify GST'
      : isRcDocument(doc)
        ? doc.verified ? 'View RC' : 'Verify RC'
        : isBankDocument(doc)
          ? doc.verified ? 'View Bank' : 'Verify Bank'
          : doc.verified ? 'View DL' : 'Verify DL');

  const badgeTone = (doc) => (doc.verified
    ? 'success'
    : doc.reverificationPending
      ? 'info'
      : doc.rejected || doc.expired
        ? 'danger'
        : doc.status === 'Uploaded'
          ? 'info'
          : 'danger');

  const barColor = { success: DT.success, info: DT.info, danger: DT.danger };

  return (
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
      <ScreenHeader title="Documents" subtitle="Keep your papers up to date" onBack={() => navigate(`${routePrefix}/profile`)} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 32 + insets.bottom }}>
        <View style={{ gap: 20 }}>
          <Card tone="dark" style={styles.summary}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', flexShrink: 1 }}>
              <View style={styles.summaryIcon}>
                <CheckCircle2 size={24} color={DT.success} strokeWidth={2.5} />
              </View>
              <View style={{ gap: 2, flexShrink: 1 }}>
                <Text style={styles.summaryTitle}>{isLoading ? 'LOADING DOCUMENTS' : `${uploadedCount} UPLOADED`}</Text>
                <Text style={styles.summarySub}>{actionRequiredCount} Action Required</Text>
              </View>
            </View>
            <Press scale={isSyncing ? 1 : 0.95} onPress={loadDriver} disabled={isSyncing} accessibilityLabel="Refresh" style={[styles.refresh, isSyncing ? { backgroundColor: DT.darkSoft } : { backgroundColor: DT.cta }]}>
              {isSyncing ? <ActivityIndicator size="small" color={DT.onBrandMuted} /> : <Text style={styles.refreshText}>REFRESH</Text>}
            </Press>
          </Card>

          <View style={{ gap: 12 }}>
            <SectionLabel style={{ paddingHorizontal: 4 }}>Uploaded documents</SectionLabel>

            <View style={{ gap: 12 }}>
              {error ? (
                <View style={styles.error}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {!error && docs.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No documents uploaded yet.</Text>
                </View>
              ) : (
                docs.map((doc) => {
                  const tone = badgeTone(doc);
                  const uploadingThis = imageUploading && uploadingDocumentKey === doc.id;
                  const hasMeta = isDrivingLicenseDocument(doc) || isPanDocument(doc) || isGstDocument(doc) || isRcDocument(doc) || isBankDocument(doc);
                  return (
                    <Press key={doc.id} scale={0.99} onPress={() => setSelectedDoc(doc)} accessibilityLabel={doc.name} style={styles.card}>
                      <View style={[styles.bar, { backgroundColor: barColor[tone] }]} />

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={styles.docIcon}>
                          <FileText size={20} color={DT.brand} strokeWidth={2.2} />
                        </View>
                        <View style={{ minWidth: 0, flex: 1 }}>
                          <Text style={styles.docName} numberOfLines={2}>{String(doc.name).toUpperCase()}</Text>
                          <Text style={styles.docDate} numberOfLines={1}>{String(doc.date).toUpperCase()}</Text>
                        </View>
                        <Chip label={doc.status === 'Pending Reverification' ? 'Pending' : doc.status} tone={tone} style={{ alignSelf: 'center' }} />
                      </View>

                      {doc.expiryDate || doc.identifyNumber || doc.requestNumber ? (
                        <View style={styles.metaRow}>
                          {doc.expiryDate ? (
                            <Text style={[styles.chip, doc.expired ? { color: DT.dangerInk, backgroundColor: DT.dangerSoft } : null]}>
                              {doc.expired ? 'Expired' : 'Exp'} {formatExpiryDate(doc.expiryDate)}
                            </Text>
                          ) : null}
                          {doc.identifyNumber ? <Text style={styles.chip}>{doc.identifyNumber}</Text> : null}
                          {doc.requestNumber ? <Text style={styles.chip}>Req {doc.requestNumber.slice(0, 8)}</Text> : null}
                        </View>
                      ) : null}

                      {doc.reverificationPending ? (
                        <Text style={[styles.note, { color: DT.info }]}>Waiting for admin verification</Text>
                      ) : null}
                      {doc.reason && !doc.reverificationPending ? (
                        <Text style={[styles.note, { color: DT.dangerInk }]} numberOfLines={2}>{doc.reason}</Text>
                      ) : null}
                      {doc.rawDocument?.verificationMessage && doc.verified ? (
                        <Text style={[styles.note, { color: DT.successInk }]} numberOfLines={2}>{doc.rawDocument.verificationMessage}</Text>
                      ) : null}

                      <View style={styles.actions}>
                        {hasMeta ? (
                          <CtaButton
                            variant="soft"
                            title={metaButtonLabel(doc)}
                            onPress={() => openMeta(doc)}
                            icon={<ShieldCheck size={15} color={DT.brand} strokeWidth={2.5} />}
                            style={styles.action}
                            textStyle={styles.actionText}
                          />
                        ) : null}
                        {doc.hasExpiryDate ? (
                          <CtaButton
                            variant="outline"
                            title={doc.expiryDate ? 'Edit date' : 'Add date'}
                            onPress={() => setExpiryModal({ isOpen: true, docId: doc.id, name: doc.name, value: toDateInputValue(doc.expiryDate), isSubmitting: false })}
                            icon={<CalendarDays size={15} color={DT.warnInk} strokeWidth={2.5} />}
                            style={styles.action}
                            textStyle={styles.actionText}
                          />
                        ) : null}
                        <CtaButton
                          variant="brand"
                          title={doc.hasDocument ? 'Re-upload' : 'Upload'}
                          disabled={imageUploading}
                          onPress={() => setSourceFor(doc)}
                          icon={uploadingThis ? <ActivityIndicator size="small" color={DT.onBrand} /> : <Camera size={15} color={DT.onBrand} strokeWidth={2.5} />}
                          style={styles.action}
                          textStyle={styles.actionText}
                        />
                      </View>
                    </Press>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <Dialog visible={Boolean(selectedDoc)} onClose={() => setSelectedDoc(null)} blur={8} panelStyle={[styles.dialog, { maxWidth: 320 }]}>
        {selectedDoc ? (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={styles.viewerIcon}>
                <FileText size={20} color={DT.brand} strokeWidth={2.5} />
              </View>
              <Press scale={1} onPress={() => setSelectedDoc(null)} accessibilityLabel="Close" style={styles.close}>
                <X size={18} color={DT.muted} strokeWidth={2.5} />
              </Press>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={styles.viewerName}>{String(selectedDoc.name).toUpperCase()}</Text>
              <Text style={styles.viewerTemplate}>{String(selectedDoc.templateName || '').toUpperCase()}</Text>
            </View>
            <View style={styles.viewerImage}>
              {selectedDoc.previewUrl ? (
                <Img source={{ uri: selectedDoc.previewUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={selectedDoc.name} />
              ) : (
                <Text style={styles.noPreview}>NO PREVIEW AVAILABLE</Text>
              )}
            </View>
            {selectedDoc.reason ? (
              <View style={styles.feedback}>
                <Text style={styles.feedbackTitle}>ADMIN FEEDBACK</Text>
                <Text style={styles.feedbackBody}>{selectedDoc.reason}</Text>
              </View>
            ) : null}
            <CtaButton variant="brand" title="CLOSE VIEWER" onPress={() => setSelectedDoc(null)} accessibilityLabel="Close Viewer" style={styles.viewerBtn} />
          </View>
        ) : null}
      </Dialog>

      <Dialog visible={expiryModal.isOpen} onClose={closeExpiryModal} blur={8} panelStyle={[styles.dialog, { maxWidth: 360, marginBottom: keyboard }]}>
        <View style={{ gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>UPDATE EXPIRY DATE</Text>
              <Text style={styles.modalSub}>{String(expiryModal.name).toUpperCase()}</Text>
            </View>
            <Press scale={1} onPress={closeExpiryModal} accessibilityLabel="Close" style={styles.close}>
              <X size={18} color={DT.muted} strokeWidth={2.5} />
            </Press>
          </View>

          <View>
            <View style={styles.fieldLabel}>
              <CalendarDays size={13} color={DT.muted} />
              <Text style={styles.fieldLabelText}>EXPIRY DATE</Text>
            </View>
            <DriverDateField value={expiryModal.value} onChange={(value) => setExpiryModal((prev) => ({ ...prev, value }))} accessibilityLabel="Expiry date" />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <CtaButton variant="outline" title="CANCEL" onPress={closeExpiryModal} style={styles.modalBtn} />
            <CtaButton
              variant="brand"
              title={expiryModal.isSubmitting ? 'SAVING...' : 'SAVE DATE'}
              onPress={handleExpirySave}
              disabled={expirySaveDisabled}
              accessibilityLabel="Save Date"
              style={styles.modalBtn}
            />
          </View>
        </View>
      </Dialog>

      <Dialog visible={metaModal.isOpen} onClose={closeMetaModal} blur={8} panelStyle={[styles.dialog, { maxWidth: 360, marginBottom: keyboard }]}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ gap: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>DOCUMENT DETAILS</Text>
                <Text style={styles.modalSub}>{String(metaModal.name).toUpperCase()}</Text>
              </View>
              <Press scale={1} onPress={closeMetaModal} accessibilityLabel="Close" style={styles.close}>
                <X size={18} color={DT.muted} strokeWidth={2.5} />
              </Press>
            </View>

            <View>
              <View style={styles.fieldLabel}>
                <BadgeCheck size={13} color={DT.muted} />
                <Text style={styles.fieldLabelText}>{metaLabel.toUpperCase()}</Text>
              </View>
              <FocusInput
                value={metaModal.identifyNumber}
                onChangeText={(text) => setMetaModal((prev) => ({ ...prev, identifyNumber: text.toUpperCase() }))}
                placeholder={metaPlaceholder}
                placeholderTextColor="rgba(15,23,43,0.5)"
                autoCapitalize="characters"
                accessibilityLabel={metaLabel}
                style={styles.input}
              />
            </View>

            {metaModal.mode === 'bank' ? (
              <View>
                <View style={styles.fieldLabel}>
                  <BadgeCheck size={13} color={DT.muted} />
                  <Text style={styles.fieldLabelText}>IFSC CODE</Text>
                </View>
                <FocusInput
                  value={metaModal.ifsc}
                  onChangeText={(text) => setMetaModal((prev) => ({ ...prev, ifsc: text.toUpperCase() }))}
                  placeholder="Enter IFSC code"
                  placeholderTextColor="rgba(15,23,43,0.5)"
                  autoCapitalize="characters"
                  accessibilityLabel="IFSC code"
                  style={styles.input}
                />
              </View>
            ) : null}

            {metaModal.mode === 'bank' ? (
              <View>
                <View style={styles.fieldLabel}>
                  <BadgeCheck size={13} color={DT.muted} />
                  <Text style={styles.fieldLabelText}>ACCOUNT HOLDER NAME</Text>
                </View>
                <FocusInput
                  value={metaModal.accountHolderName}
                  onChangeText={(text) => setMetaModal((prev) => ({ ...prev, accountHolderName: text }))}
                  placeholder="Enter account holder name"
                  placeholderTextColor="rgba(15,23,43,0.5)"
                  accessibilityLabel="Account holder name"
                  style={styles.input}
                />
              </View>
            ) : null}

            {metaModal.mode === 'license' ? (
              <View>
                <View style={styles.fieldLabel}>
                  <CalendarDays size={13} color={DT.muted} />
                  <Text style={styles.fieldLabelText}>BIRTH DATE</Text>
                </View>
                <DriverDateField value={metaModal.birthDate} onChange={(value) => setMetaModal((prev) => ({ ...prev, birthDate: value }))} accessibilityLabel="Birth date" />
              </View>
            ) : null}

            {metaModal.mode === 'license' ? (
              <View>
                <View style={styles.fieldLabel}>
                  <BadgeCheck size={13} color={DT.muted} />
                  <Text style={styles.fieldLabelText}>REQUEST NO</Text>
                </View>
                <FocusInput
                  value={metaModal.requestNumber}
                  onChangeText={(text) => setMetaModal((prev) => ({ ...prev, requestNumber: text }))}
                  placeholder="Optional override, otherwise generated automatically"
                  placeholderTextColor="rgba(15,23,43,0.5)"
                  accessibilityLabel="Request number"
                  style={styles.input}
                />
              </View>
            ) : null}

            <View style={{ flexDirection: 'row' }}>
              <CtaButton
                variant="brand"
                title={metaModal.isSubmitting ? 'SAVING...' : 'SAVE'}
                onPress={() => handleMetaSave()}
                disabled={metaSaveDisabled}
                accessibilityLabel="Save"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </ScrollView>
      </Dialog>

      <DriverImageSourceSheet visible={Boolean(sourceFor)} onClose={() => setSourceFor(null)} onPick={chooseSource} />
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: DT.radius.xl },
  summaryIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: DT.darkSoft, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 15, lineHeight: 20, color: DT.onBrand, ...outfit(800) },
  summarySub: { fontSize: 12, lineHeight: 16, color: DT.onBrandMuted, ...outfit(600) },
  refresh: { paddingHorizontal: 16, minHeight: 44, borderRadius: DT.radius.md, minWidth: 90, alignItems: 'center', justifyContent: 'center' },
  refreshText: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, minWidth: 60, textAlign: 'center', color: DT.ctaInk, ...outfit(800) },
  error: { backgroundColor: DT.dangerSoft, borderWidth: 1, borderColor: DT.dangerSoft, paddingHorizontal: 16, paddingVertical: 12, borderRadius: DT.radius.md },
  errorText: { fontSize: 12, lineHeight: 17, color: DT.dangerInk, ...outfit(700) },
  empty: { backgroundColor: DT.card, padding: 24, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, ...shadow('sm') },
  emptyText: { textAlign: 'center', fontSize: 13, lineHeight: 18, color: DT.muted, ...outfit(600) },
  card: { backgroundColor: DT.card, padding: 16, paddingLeft: 20, borderRadius: DT.radius.xl, borderWidth: 1, borderColor: DT.borderSoft, gap: 12, overflow: 'hidden', ...shadow('sm') },
  bar: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 5 },
  docIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docName: { fontSize: 13, lineHeight: 18, color: DT.ink, ...outfit(800) },
  docDate: { marginTop: 2, fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: DT.muted, ...outfit(600) },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { fontSize: 11, lineHeight: 16, paddingHorizontal: 10, paddingVertical: 3, borderRadius: DT.radius.pill, color: DT.inkSoft, backgroundColor: DT.bgSoft, overflow: 'hidden', ...outfit(600) },
  note: { fontSize: 11, lineHeight: 16, ...outfit(600) },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { minHeight: 44, flexGrow: 1, paddingHorizontal: 12, borderRadius: DT.radius.md },
  actionText: { fontSize: 12, lineHeight: 16 },
  dialog: { width: '100%', marginHorizontal: 8, backgroundColor: DT.card, padding: 24, borderRadius: DT.radius.xl, maxHeight: '90%', ...shadow('2xl') },
  viewerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: DT.bgSoft, alignItems: 'center', justifyContent: 'center' },
  viewerName: { fontSize: 16, lineHeight: 22, color: DT.brand, ...playfair(700) },
  viewerTemplate: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: DT.muted, ...outfit(700) },
  viewerImage: { aspectRatio: 4 / 3, backgroundColor: DT.bg, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.borderSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  noPreview: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: DT.faint, ...outfit(800) },
  feedback: { borderRadius: DT.radius.sm, backgroundColor: DT.dangerSoft, paddingHorizontal: 16, paddingVertical: 12 },
  feedbackTitle: { fontSize: 10, lineHeight: 14, letterSpacing: 0.9, color: DT.danger, ...outfit(800) },
  feedbackBody: { marginTop: 4, fontSize: 12, lineHeight: 18, color: DT.dangerInk, ...outfit(600) },
  viewerBtn: { width: '100%' },
  modalTitle: { fontSize: 18, lineHeight: 26, color: DT.brand, ...playfair(700) },
  modalSub: { marginTop: 4, fontSize: 10, lineHeight: 15, letterSpacing: 1, color: DT.muted, ...outfit(700) },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldLabelText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, minWidth: 60, color: DT.muted, ...outfit(800) },
  input: { minHeight: 48, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.card, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: DT.ink, ...outfit(700) },
  modalBtn: { flex: 1 },
});
