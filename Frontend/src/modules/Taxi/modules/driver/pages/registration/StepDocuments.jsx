/**
 * Step 5 — papers, and the end of the walk.
 *
 * The verification panels are gone. A driver photographs each document the
 * admin has asked for, and an admin checks them against the vehicle details on
 * the previous step — which is how this district actually approves drivers, and
 * what the provider integration was standing in front of.
 *
 * Documents upload as they are picked rather than in one batch at the end, so a
 * driver on a slow connection is never left watching a single long spinner with
 * no idea which file is the slow one.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, FileText, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

import {
  clearDriverRegistrationSession,
  completeDriverOnboarding,
  getDriverDocumentTemplates,
  getStoredDriverRegistrationSession,
  persistDriverAuthSession,
  saveDriverDocuments,
  saveDriverRegistrationSession,
} from '../../services/registrationService';
import { flattenDriverDocumentFields, getDocumentPreviewUrl } from '../../utils/documentTemplates';
import OnboardingShell from './OnboardingShell';
import { Field } from './OnboardingFields';

const unwrap = (response) => response?.data?.data || response?.data || response;
const listOf = (payload) =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];

const MAX_FILE_BYTES = 8 * 1024 * 1024;

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });

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
  const inputRefs = useRef({});

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

  const handlePick = async (field, file) => {
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setError('That image is larger than 8 MB. Please take a smaller photo.');
      return;
    }

    setError('');
    setUploadingKey(field.key);

    try {
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

  if (templatesLoading) {
    return (
      <div className="dh-onboarding flex min-h-dvh items-center justify-center">
        <Loader2 size={26} className="animate-spin text-[var(--dh-primary)]" />
      </div>
    );
  }

  return (
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
        <p className="flex items-start gap-2 px-1 text-[12px] font-medium leading-relaxed text-[var(--dh-muted)]">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--dh-primary)]" />
          Your documents are reviewed by the district team. You will be notified once your
          application is approved.
        </p>
      }
    >
      {fields.map((field) => {
        const uploaded = isUploaded(field);
        const preview = getDocumentPreviewUrl(docs[field.key]);
        const busy = uploadingKey === field.key;

        return (
          <div key={field.key} className="dh-card space-y-3 p-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: uploaded ? 'var(--dh-primary)' : 'var(--dh-primary-soft)',
                  color: uploaded ? '#fff' : 'var(--dh-primary)',
                }}
              >
                {busy ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : uploaded ? (
                  <Check size={17} strokeWidth={3} />
                ) : (
                  <FileText size={17} strokeWidth={2.2} />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-[var(--dh-text)]">
                  {field.label || field.templateName || field.key}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--dh-muted)]">
                  {field.isRequired ? 'Required' : 'Optional'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => inputRefs.current[field.key]?.click()}
                disabled={busy}
                className="dh-ghost flex items-center gap-1.5 text-[12px] disabled:opacity-50"
              >
                {uploaded ? <RefreshCw size={14} /> : <Camera size={15} />}
                {uploaded ? 'Replace' : 'Upload'}
              </button>

              <input
                ref={(element) => {
                  inputRefs.current[field.key] = element;
                }}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(event) => {
                  handlePick(field, event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>

            {preview && (
              <img
                src={preview}
                alt=""
                className="h-36 w-full rounded-xl border border-[var(--dh-border)] object-cover"
              />
            )}

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
              <Field
                label="Valid until"
                type="date"
                value={meta[field.key]?.expiryDate || ''}
                onChange={setMetaValue(field.key, 'expiryDate')}
                valid={Boolean(String(meta[field.key]?.expiryDate || '').trim())}
              />
            )}
          </div>
        );
      })}

      {fields.length === 0 && (
        <div className="dh-card flex items-center gap-3 p-5">
          <ShieldCheck size={20} className="shrink-0 text-[var(--dh-primary)]" />
          <p className="text-[13px] font-medium text-[var(--dh-muted)]">
            The district has not asked for any documents yet. An admin will contact you if
            anything else is needed.
          </p>
        </div>
      )}
    </OnboardingShell>
  );
}
