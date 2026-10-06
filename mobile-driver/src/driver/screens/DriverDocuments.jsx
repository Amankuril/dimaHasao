import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BadgeCheck, CalendarDays, Camera, CheckCircle2, Eye, FileText, ShieldCheck, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { openCamera, openGallery } from '../../lib/images';
import { useKeyboardHeight } from '../../lib/useKeyboard';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { outfit, shadow, tw } from '../../theme';
import DriverDateField from '../components/DriverDateField';
import DriverImageSourceSheet from '../components/DriverImageSourceSheet';
import { useDriverImageUpload } from '../hooks/useDriverImageUpload';
import { getCurrentDriver, getDriverDocumentTemplates, updateDriverDocument } from '../services/registrationService';
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
    ? { bg: tw.emerald50, fg: tw.emerald600, border: tw.emerald100 }
    : doc.reverificationPending
      ? { bg: tw.blue50, fg: tw.blue600, border: tw.blue100 }
      : doc.rejected || doc.expired
        ? { bg: tw.rose50, fg: tw.rose600, border: tw.rose100 }
        : doc.status === 'Uploaded'
          ? { bg: tw.blue50, fg: tw.blue600, border: tw.blue100 }
          : { bg: tw.rose50, fg: tw.rose600, border: tw.rose100 });

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fb' }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: 40 + insets.top, paddingBottom: 128 + insets.bottom }}>
        <View style={styles.header}>
          <Press onPress={() => navigate(`${routePrefix}/profile`)} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={18} color={tw.slate600} strokeWidth={2.5} />
          </Press>
          <View>
            <Text style={styles.title} accessibilityRole="header">DOCUMENTS</Text>
            <View style={styles.underline} />
          </View>
        </View>

        <View style={{ gap: 24 }}>
          <View style={styles.summary}>
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', flexShrink: 1 }}>
              <View style={styles.summaryIcon}>
                <CheckCircle2 size={24} color={tw.emerald500} strokeWidth={2.5} />
              </View>
              <View style={{ gap: 2, flexShrink: 1 }}>
                <Text style={styles.summaryTitle}>{isLoading ? 'LOADING DOCUMENTS' : `${uploadedCount} UPLOADED`}</Text>
                <Text style={styles.summarySub}>{actionRequiredCount} Action Required</Text>
              </View>
            </View>
            <Press scale={isSyncing ? 1 : 0.95} onPress={loadDriver} disabled={isSyncing} accessibilityLabel="Refresh" style={[styles.refresh, isSyncing ? { backgroundColor: tw.slate100 } : { backgroundColor: tw.slate900 }]}>
              {isSyncing ? <ActivityIndicator size="small" color={tw.slate300} /> : <Text style={styles.refreshText}>REFRESH</Text>}
            </Press>
          </View>

          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
              <Text style={styles.section}>UPLOADED DOCUMENTS</Text>
              <View style={{ borderBottomWidth: 1, borderBottomColor: tw.slate200, paddingBottom: 2 }}>
                <Text style={styles.audit}>AUDIT FEED</Text>
              </View>
            </View>

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
                  return (
                    <Press key={doc.id} scale={0.99} onPress={() => setSelectedDoc(doc)} accessibilityLabel={doc.name} style={styles.card}>
                      <View style={[styles.bar, { backgroundColor: doc.verified ? tw.emerald500 : doc.status === 'Uploaded' ? tw.blue500 : tw.rose500 }]} />

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1, minWidth: 0, overflow: 'hidden' }}>
                        <View style={styles.docIcon}>
                          <FileText size={18} color={tw.slate400} strokeWidth={2.5} />
                        </View>
                        <View style={{ minWidth: 0, flexShrink: 1 }}>
                          <Text style={styles.docName} numberOfLines={1}>{String(doc.name).toUpperCase()}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            <Text style={styles.docDate} numberOfLines={1}>{String(doc.date).toUpperCase()}</Text>
                            {doc.expiryDate ? (
                              <Text style={[styles.chip, { color: doc.expired ? tw.rose500 : tw.slate500 }]}>
                                {doc.expired ? 'Expired' : 'Exp'} {formatExpiryDate(doc.expiryDate)}
                              </Text>
                            ) : null}
                            {doc.identifyNumber ? <Text style={[styles.chip, { color: tw.slate500 }]}>{doc.identifyNumber}</Text> : null}
                            {doc.requestNumber ? <Text style={[styles.chip, { color: tw.slate500 }]}>Req {doc.requestNumber.slice(0, 8)}</Text> : null}
                          </View>

                          {doc.reverificationPending ? (
                            <Text style={[styles.note, { color: tw.blue500 }]}>Waiting for admin verification</Text>
                          ) : null}
                          {doc.reason && !doc.reverificationPending ? (
                            <Text style={[styles.note, { color: tw.rose500 }]} numberOfLines={1}>{doc.reason}</Text>
                          ) : null}
                          {doc.rawDocument?.verificationMessage && doc.verified ? (
                            <Text style={[styles.note, { color: tw.emerald600 }]} numberOfLines={1}>{doc.rawDocument.verificationMessage}</Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                        <Text style={[styles.badge, { backgroundColor: tone.bg, color: tone.fg, borderColor: tone.border }]}>
                          {(doc.status === 'Pending Reverification' ? 'Pending' : doc.status).toUpperCase()}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                          {isDrivingLicenseDocument(doc) || isPanDocument(doc) || isGstDocument(doc) || isRcDocument(doc) || isBankDocument(doc) ? (
                            <Press scale={0.9} onPress={() => openMeta(doc)} accessibilityLabel={metaButtonLabel(doc)} style={[styles.action, { backgroundColor: tw.emerald50 }]}>
                              <ShieldCheck size={13} color={tw.emerald600} strokeWidth={2.5} />
                              <Text style={[styles.actionText, { color: tw.emerald600 }]}>{metaButtonLabel(doc).toUpperCase()}</Text>
                            </Press>
                          ) : null}
                          {doc.hasExpiryDate ? (
                            <Press
                              scale={0.9}
                              onPress={() => setExpiryModal({ isOpen: true, docId: doc.id, name: doc.name, value: toDateInputValue(doc.expiryDate), isSubmitting: false })}
                              accessibilityLabel={doc.expiryDate ? 'Edit Date' : 'Add Date'}
                              style={[styles.action, { backgroundColor: tw.amber50 }]}
                            >
                              <CalendarDays size={13} color={tw.amber600} strokeWidth={2.5} />
                              <Text style={[styles.actionText, { color: tw.amber600 }]}>{doc.expiryDate ? 'EDIT DATE' : 'ADD DATE'}</Text>
                            </Press>
                          ) : null}
                          <Press
                            scale={imageUploading ? 1 : 0.9}
                            disabled={imageUploading}
                            onPress={() => setSourceFor(doc)}
                            accessibilityLabel={doc.hasDocument ? 'Re-upload' : 'Upload'}
                            style={[styles.action, { backgroundColor: uploadingThis ? tw.slate100 : tw.blue50 }]}
                          >
                            {uploadingThis ? <ActivityIndicator size="small" color={tw.slate400} style={{ transform: [{ scale: 0.6 }] }} /> : <Camera size={13} color={tw.blue600} strokeWidth={2.5} />}
                            <Text style={[styles.actionText, { color: uploadingThis ? tw.slate400 : tw.blue600 }]}>{doc.hasDocument ? 'RE-UPLOAD' : 'UPLOAD'}</Text>
                          </Press>
                          <View style={styles.eye}>
                            <Eye size={14} color={tw.slate300} strokeWidth={2.5} />
                          </View>
                        </View>
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
                <FileText size={20} color={tw.slate900} strokeWidth={2.5} />
              </View>
              <Press scale={1} onPress={() => setSelectedDoc(null)} accessibilityLabel="Close" style={styles.close}>
                <X size={18} color={tw.slate400} strokeWidth={2.5} />
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
            <Press onPress={() => setSelectedDoc(null)} accessibilityLabel="Close Viewer" style={styles.viewerBtn}>
              <Text style={styles.viewerBtnText}>CLOSE VIEWER</Text>
            </Press>
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
              <X size={18} color={tw.slate400} strokeWidth={2.5} />
            </Press>
          </View>

          <View>
            <View style={styles.fieldLabel}>
              <CalendarDays size={13} color={tw.slate500} />
              <Text style={styles.fieldLabelText}>EXPIRY DATE</Text>
            </View>
            <DriverDateField value={expiryModal.value} onChange={(value) => setExpiryModal((prev) => ({ ...prev, value }))} accessibilityLabel="Expiry date" />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Press onPress={closeExpiryModal} accessibilityLabel="Cancel" style={[styles.modalBtn, { backgroundColor: tw.slate100 }]}>
              <Text style={[styles.modalBtnText, { color: tw.slate600 }]}>CANCEL</Text>
            </Press>
            <Press
              scale={expirySaveDisabled ? 1 : 0.95}
              onPress={handleExpirySave}
              disabled={expirySaveDisabled}
              accessibilityLabel="Save Date"
              style={[styles.modalBtn, { backgroundColor: expirySaveDisabled ? tw.slate300 : tw.emerald600 }]}
            >
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>{expiryModal.isSubmitting ? 'SAVING...' : 'SAVE DATE'}</Text>
            </Press>
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
                <X size={18} color={tw.slate400} strokeWidth={2.5} />
              </Press>
            </View>

            <View>
              <View style={styles.fieldLabel}>
                <BadgeCheck size={13} color={tw.slate500} />
                <Text style={styles.fieldLabelText}>{metaLabel.toUpperCase()}</Text>
              </View>
              <TextInput
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
                  <BadgeCheck size={13} color={tw.slate500} />
                  <Text style={styles.fieldLabelText}>IFSC CODE</Text>
                </View>
                <TextInput
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
                  <BadgeCheck size={13} color={tw.slate500} />
                  <Text style={styles.fieldLabelText}>ACCOUNT HOLDER NAME</Text>
                </View>
                <TextInput
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
                  <CalendarDays size={13} color={tw.slate500} />
                  <Text style={styles.fieldLabelText}>BIRTH DATE</Text>
                </View>
                <DriverDateField value={metaModal.birthDate} onChange={(value) => setMetaModal((prev) => ({ ...prev, birthDate: value }))} accessibilityLabel="Birth date" />
              </View>
            ) : null}

            {metaModal.mode === 'license' ? (
              <View>
                <View style={styles.fieldLabel}>
                  <BadgeCheck size={13} color={tw.slate500} />
                  <Text style={styles.fieldLabelText}>REQUEST NO</Text>
                </View>
                <TextInput
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
              <Press
                onPress={() => handleMetaSave()}
                disabled={metaSaveDisabled}
                accessibilityLabel="Save"
                style={[styles.metaSave, metaSaveDisabled ? { opacity: 0.5 } : null]}
              >
                <Text style={styles.metaSaveText}>{metaModal.isSubmitting ? 'SAVING...' : 'SAVE'}</Text>
              </Press>
            </View>
          </View>
        </ScrollView>
      </Dialog>

      <DriverImageSourceSheet visible={Boolean(sourceFor)} onClose={() => setSourceFor(null)} onPick={chooseSource} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  back: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  title: { fontSize: 18, lineHeight: 28, letterSpacing: -0.45, color: tw.slate900, ...outfit(900) },
  underline: { height: 2, width: 32, borderRadius: 1, backgroundColor: tw.emerald500, marginTop: 2 },
  summary: { backgroundColor: '#fff', padding: 18, borderRadius: 28.8, borderWidth: 1, borderColor: tw.slate100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow('0 10px 30px rgba(0,0,0,0.03)') },
  summaryIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: tw.emerald50, borderWidth: 1, borderColor: tw.emerald100, alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  summaryTitle: { fontSize: 14, lineHeight: 14, letterSpacing: -0.35, color: tw.slate900, ...outfit(900) },
  summarySub: { fontSize: 10, lineHeight: 12.5, letterSpacing: 1, color: tw.slate400, opacity: 0.6, ...outfit(700) },
  refresh: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, minWidth: 66, alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  refreshText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: '#fff', ...outfit(900) },
  section: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate400, opacity: 0.6, marginLeft: 8, ...outfit(900) },
  audit: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate600, ...outfit(900) },
  error: { backgroundColor: tw.rose50, borderWidth: 1, borderColor: tw.rose100, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  errorText: { fontSize: 11, lineHeight: 16.5, color: tw.rose600, ...outfit(700) },
  empty: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, ...shadow('sm') },
  emptyText: { textAlign: 'center', fontSize: 11, lineHeight: 16.5, color: tw.slate400, ...outfit(700) },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow('0 2px 15px rgba(0,0,0,0.02)') },
  bar: { position: 'absolute', top: 12, bottom: 12, left: 0, width: 4, borderTopRightRadius: 999, borderBottomRightRadius: 999 },
  docIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  docName: { fontSize: 13, lineHeight: 16.25, color: tw.slate900, ...outfit(900) },
  docDate: { flexShrink: 1, fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: tw.slate400, ...outfit(700) },
  chip: { fontSize: 9, lineHeight: 13.5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: tw.slate100, overflow: 'hidden', ...outfit(700) },
  note: { fontSize: 9, lineHeight: 11.25, marginTop: 4, maxWidth: 180, ...outfit(700) },
  badge: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.9, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, overflow: 'hidden', ...outfit(900) },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 32, paddingHorizontal: 10, borderRadius: 8 },
  actionText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, ...outfit(900) },
  eye: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', marginHorizontal: 8, backgroundColor: '#fff', padding: 24, borderRadius: 28.8, maxHeight: '90%', ...shadow('2xl') },
  viewerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: tw.slate50, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  viewerName: { fontSize: 16, lineHeight: 20, letterSpacing: -0.4, color: tw.slate900, ...outfit(900) },
  viewerTemplate: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate400, ...outfit(700) },
  viewerImage: { aspectRatio: 4 / 3, backgroundColor: tw.slate50, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  noPreview: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate300, ...outfit(900) },
  feedback: { borderRadius: 12, borderWidth: 1, borderColor: tw.rose100, backgroundColor: tw.rose50, paddingHorizontal: 16, paddingVertical: 12 },
  feedbackTitle: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.9, color: tw.rose500, ...outfit(900) },
  feedbackBody: { marginTop: 4, fontSize: 11, lineHeight: 17.9, color: tw.rose700, ...outfit(600) },
  viewerBtn: { width: '100%', height: 44, backgroundColor: tw.slate900, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  viewerBtnText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: '#fff', ...outfit(900) },
  modalTitle: { fontSize: 16, lineHeight: 24, letterSpacing: -0.4, color: tw.slate900, ...outfit(900) },
  modalSub: { marginTop: 4, fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate400, ...outfit(700) },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldLabelText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate500, ...outfit(900) },
  input: { borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: tw.slate900, ...outfit(700) },
  modalBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, ...outfit(900) },
  metaSave: { height: 44, borderRadius: 12, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  metaSaveText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: tw.slate700, ...outfit(900) },
});
