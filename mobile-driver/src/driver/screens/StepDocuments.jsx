import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, Check, FileText, Loader2, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { File } from 'expo-file-system';
import { useNavigate } from '../../lib/webRouter';
import { Press } from '../../components/ui';
import Img from '../../components/Img';
import { openCamera, openGallery, prepareUploadFile } from '../../lib/images';
import {
  clearDriverRegistrationSession,
  completeDriverOnboarding,
  getDriverDocumentTemplates,
  getStoredDriverRegistrationSession,
  persistDriverAuthSession,
  saveDriverDocuments,
  saveDriverRegistrationSession,
} from '../services/registrationService';
import { flattenDriverDocumentFields, getDocumentPreviewUrl } from '../utils/documentTemplates';
import OnboardingShell from '../components/OnboardingShell';
import DriverImageSourceSheet from '../components/DriverImageSourceSheet';
import { DateField, Field, OnboardingLoading, Spin } from '../components/OnboardingFields';
import { OB, jk, obCard } from '../components/onboardingTheme';

/*
 * Port of driver/pages/registration/StepDocuments.jsx (/taxi/driver/step-documents).
 * The web's <input type="file" accept="image/*" capture> becomes the camera / gallery
 * choice below; the file is posted as the same data URL the web's FileReader produces.
 */

const unwrap = (response) => response?.data?.data || response?.data || response;
const listOf = (payload) =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];

const MAX_FILE_BYTES = 8 * 1024 * 1024;

const readAsDataUrl = async (file) => {
  try {
    const base64 = await new File(file.uri).base64();
    return `data:${file.type || 'image/jpeg'};base64,${base64}`;
  } catch {
    throw new Error('Could not read that file.');
  }
};

export default function StepDocuments() {
  const navigate = useNavigate();
  const session = getStoredDriverRegistrationSession();
  const phone = String(session.phone || '').replace(/\D/g, '').slice(-10);
  const registrationId = String(session.registrationId || '').trim();

  const [fields, setFields] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [docs, setDocs] = useState(session.documents || {});
  const [meta, setMeta] = useState(session.documentMeta || {});
  const [uploadingKey, setUploadingKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sourceFor, setSourceFor] = useState(null);

  useEffect(() => {
    if (!phone || !registrationId) {
      navigate('/taxi/driver/login', { replace: true });
    }
  }, [navigate, phone, registrationId]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await getDriverDocumentTemplates('driver');
        if (active) setFields(flattenDriverDocumentFields(listOf(unwrap(response))));
      } catch {
        if (active) setFields([]);
      } finally {
        if (active) setTemplatesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    saveDriverRegistrationSession({
      ...getStoredDriverRegistrationSession(),
      documents: docs,
      documentMeta: meta,
    });
  }, [docs, meta]);

  const handlePick = async (field, pickedFile) => {
    if (!pickedFile) return;

    setError('');
    setUploadingKey(field.key);

    try {
      const file = await prepareUploadFile(pickedFile);

      if (file.size != null && file.size > MAX_FILE_BYTES) {
        setError('That image is larger than 8 MB. Please take a smaller photo.');
        setUploadingKey('');
        return;
      }

      const dataUrl = await readAsDataUrl(file);
      const response = await saveDriverDocuments({
        registrationId,
        phone,
        documents: {
          [field.key]: {
            dataUrl,
            fileName: file.name || field.key,
            mimeType: file.type || 'image/jpeg',
            identifyNumber: meta[field.key]?.identifyNumber || '',
            expiryDate: meta[field.key]?.expiryDate || '',
          },
        },
      });

      const payload = unwrap(response);
      const uploaded = payload?.documents?.[field.key] || payload?.session?.documents?.[field.key];

      setDocs((current) => ({
        ...current,
        [field.key]: uploaded || { previewUrl: dataUrl, fileName: file.name, uploaded: true },
      }));
    } catch (uploadError) {
      setError(uploadError?.message || 'That upload did not go through. Please try again.');
    } finally {
      setUploadingKey('');
    }
  };

  const chooseSource = async (source) => {
    const field = sourceFor;
    setSourceFor(null);
    if (!field) return;
    const picker = source === 'camera' ? openCamera : openGallery;
    const file = await picker({ fileNamePrefix: field.key });
    if (file) await handlePick(field, file);
  };

  const setMetaValue = (key, property) => (value) =>
    setMeta((current) => ({ ...current, [key]: { ...(current[key] || {}), [property]: value } }));

  const isUploaded = (field) => Boolean(docs[field.key]?.uploaded || docs[field.key]?.secureUrl || docs[field.key]?.previewUrl);

  const missing = useMemo(
    () =>
      fields.filter((field) => {
        if (!field.isRequired) return false;
        if (!isUploaded(field)) return true;
        if (field.hasIdentifyNumber && !String(meta[field.key]?.identifyNumber || '').trim()) return true;
        if (field.hasExpiryDate && !String(meta[field.key]?.expiryDate || '').trim()) return true;
        return false;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, docs, meta],
  );

  const ready = missing.length === 0 && !uploadingKey && !templatesLoading;

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const submitted = Object.fromEntries(
        Object.entries(docs)
          .filter(([, value]) => Boolean(value?.uploaded || value?.secureUrl || value?.previewUrl))
          .map(([key, value]) => [
            key,
            {
              ...value,
              identifyNumber: meta[key]?.identifyNumber || '',
              expiryDate: meta[key]?.expiryDate || '',
            },
          ]),
      );

      const response = await completeDriverOnboarding({ registrationId, phone, documents: submitted });
      const payload = unwrap(response);

      if (payload?.token) {
        persistDriverAuthSession({ token: payload.token, role: 'driver' });
      }

      clearDriverRegistrationSession();
      navigate('/taxi/driver/registration-status', {
        replace: true,
        state: { role: 'driver', completedRegistration: payload || null },
      });
    } catch (submitError) {
      setError(submitError?.message || 'Could not submit your application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (templatesLoading) return <OnboardingLoading />;

  return (
    <>
      <OnboardingShell
        step="documents"
        eyebrow="Your papers"
        title={fields.length ? 'Upload your documents' : 'Almost there'}
        subtitle={
          fields.length
            ? 'Photograph each one in good light, with all four corners visible.'
            : 'No documents are required right now. Submit your application to finish.'
        }
        error={error}
        onBack={() => navigate('/taxi/driver/step-vehicle')}
        primaryLabel="Submit application"
        primaryDisabled={!ready}
        primaryLoading={loading}
        onPrimary={handleSubmit}
        footer={
          <View style={styles.footer}>
            <View style={{ marginTop: 2 }}>
              <ShieldCheck size={15} color={OB.primary} />
            </View>
            <Text style={styles.footerText}>
              Your documents are reviewed by the district team. You will be notified once your
              application is approved.
            </Text>
          </View>
        }
      >
        {fields.map((field) => {
          const uploaded = isUploaded(field);
          const preview = getDocumentPreviewUrl(docs[field.key]);
          const busy = uploadingKey === field.key;

          return (
            <View key={field.key} style={[obCard, { padding: 16, gap: 12 }]}>
              <View style={styles.head}>
                <View style={[styles.iconBox, { backgroundColor: uploaded ? OB.primary : OB.primarySoft }]}>
                  {busy ? (
                    <Spin>
                      <Loader2 size={17} color={uploaded ? '#fff' : OB.primary} />
                    </Spin>
                  ) : uploaded ? (
                    <Check size={17} strokeWidth={3} color="#fff" />
                  ) : (
                    <FileText size={17} strokeWidth={2.2} color={OB.primary} />
                  )}
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={styles.docName}>
                    {field.label || field.templateName || field.key}
                  </Text>
                  <Text style={styles.docReq}>{field.isRequired ? 'REQUIRED' : 'OPTIONAL'}</Text>
                </View>

                <Press scale={1} onPress={() => setSourceFor(field)} disabled={busy} style={[styles.upload, busy && { opacity: 0.5 }]}>
                  {uploaded ? <RefreshCw size={14} color={OB.primary} /> : <Camera size={15} color={OB.primary} />}
                  <Text style={styles.uploadText}>{uploaded ? 'Replace' : 'Upload'}</Text>
                </Press>
              </View>

              {preview ? <Img source={{ uri: preview }} style={styles.preview} resizeMode="cover" /> : null}

              {field.hasIdentifyNumber && (
                <Field
                  label="Document number"
                  value={meta[field.key]?.identifyNumber || ''}
                  onChange={setMetaValue(field.key, 'identifyNumber')}
                  placeholder="As printed on the document"
                  valid={Boolean(String(meta[field.key]?.identifyNumber || '').trim())}
                />
              )}

              {field.hasExpiryDate && (
                <DateField
                  label="Valid until"
                  value={meta[field.key]?.expiryDate || ''}
                  onChange={setMetaValue(field.key, 'expiryDate')}
                  valid={Boolean(String(meta[field.key]?.expiryDate || '').trim())}
                />
              )}
            </View>
          );
        })}

        {fields.length === 0 && (
          <View style={[obCard, styles.empty]}>
            <ShieldCheck size={20} color={OB.primary} />
            <Text style={styles.emptyText}>
              The district has not asked for any documents yet. An admin will contact you if
              anything else is needed.
            </Text>
          </View>
        )}
      </OnboardingShell>

      <DriverImageSourceSheet visible={Boolean(sourceFor)} onClose={() => setSourceFor(null)} onPick={chooseSource} />
    </>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
  footerText: { ...jk(500), flex: 1, fontSize: 12, lineHeight: 19.5, color: OB.muted },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  docName: { ...jk(700), fontSize: 14, color: OB.text },
  docReq: { ...jk(600), fontSize: 11, letterSpacing: 0.55, color: OB.muted },
  upload: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  uploadText: { ...jk(700), fontSize: 12, color: OB.primary },
  preview: { height: 144, width: '100%', borderRadius: 12, borderWidth: 1, borderColor: OB.border },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  emptyText: { ...jk(500), flex: 1, fontSize: 13, lineHeight: 21, color: OB.muted },
});
