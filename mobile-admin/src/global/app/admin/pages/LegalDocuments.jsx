/* Ported from Frontend/src/modules/Global/app/admin/pages/LegalDocuments.jsx (tools/port.js first pass). */
/**
 * Privacy, terms and the rest — written once, for every app.
 *
 * These used to live in three places: Food's page-content editor, Hotel's own
 * info-pages screen, and two .txt files compiled into the Taxi bundle. Tours,
 * festivals and the customer app had nowhere to publish them at all.
 *
 * A document is identified by module + audience + slug, and an app that has no
 * copy of its own falls back to the platform-wide one. So the common case is a
 * single document edited in a single place, while a module that genuinely needs
 * different words — a partner agreement is not a traveller's privacy notice —
 * can still have them.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Trash2, FileText } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import globalService from '../../../services/globalService';
import {
  AdminPage,
  BTN_PRIMARY,
  BTN_TEXT_PRIMARY,
  Card,
  EmptyState,
  Field,
  INPUT,
  LoadingState,
  PageHeader,
  SectionTitle,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Form, Input, Option, P, Select, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
const SLUG_LABEL = {
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
  refund: 'Refund Policy',
  about: 'About Us',
  contact: 'Contact Us',
};
const MODULE_LABEL = {
  platform: 'All apps (default)',
  food: 'Food',
  taxi: 'Taxi',
  hotel: 'Hotels',
  tours: 'Tours',
  festivals: 'Festivals',
};
const blank = {
  module: 'platform',
  audience: 'customer',
  slug: 'privacy',
  title: '',
  content: '',
  isActive: true,
};
const LegalDocuments = () => {
  const { tablet } = useLayoutWidth();
  const [documents, setDocuments] = useState([]);
  const [meta, setMeta] = useState({
    modules: [],
    audiences: [],
    slugs: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(blank);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await globalService.getLegalDocuments();
      setDocuments(data.documents || []);
      if (data.meta) setMeta(data.meta);
    } catch (error) {
      toast.error(error.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  /** The document the current selection points at, if it exists yet. */
  const existing = useMemo(
    () => documents.find((d) => d.module === draft.module && d.audience === draft.audience && d.slug === draft.slug),
    [documents, draft.module, draft.audience, draft.slug],
  );

  // Moving the selector loads that document, so the editor always shows what
  // is actually published for the combination on screen.
  useEffect(() => {
    setDraft((current) => ({
      ...current,
      title: existing?.title ?? SLUG_LABEL[current.slug] ?? '',
      content: existing?.content ?? '',
      isActive: existing?.isActive ?? true,
    }));
  }, [existing]);
  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };
  const save = async (event) => {
    event.preventDefault();
    if (!String(draft.title).trim()) return toast.error('Give the document a title');
    try {
      setSaving(true);
      await globalService.saveLegalDocument(draft);
      toast.success('Document saved');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not save this document');
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!existing) return;
    try {
      setSaving(true);
      await globalService.deleteLegalDocument(existing._id);
      toast.success('Document removed');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not remove this document');
    } finally {
      setSaving(false);
    }
  };
  const modules = meta.modules?.length ? meta.modules : Object.keys(MODULE_LABEL);
  const slugs = meta.slugs?.length ? meta.slugs : Object.keys(SLUG_LABEL);
  const audiences = meta.audiences?.length ? meta.audiences : ['customer', 'partner'];
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        title="Legal & Policies"
        subtitle="One copy of each document for every app. A module with nothing of its own shows the “All apps” version."
        icon={FileText}
      />

      {/* What exists today, so gaps are visible at a glance. */}
      <Card className="mb-4 gap-2">
        <SectionTitle>Published</SectionTitle>

        {loading ? (
          <LoadingState label="Loading documents…" />
        ) : documents.length === 0 ? (
          <EmptyState title="Nothing published yet" message="Fill in the editor below to publish the first document." />
        ) : (
          documents.map((doc) => {
            const active = doc.module === draft.module && doc.audience === draft.audience && doc.slug === draft.slug;
            return (
              <Button
                key={doc._id}
                type="button"
                onClick={() =>
                  setDraft({
                    ...doc,
                  })
                }
                className={`rounded-lg border px-3 py-3 ${active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}
              >
                <P className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                  {SLUG_LABEL[doc.slug] || doc.slug}
                </P>
                <P className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                  {MODULE_LABEL[doc.module] || doc.module} · {doc.audience}
                  {doc.isActive ? '' : ' · draft'}
                </P>
              </Button>
            );
          })
        )}
      </Card>

      <Form onSubmit={save}>
        <Card className="mb-4 gap-4">
          <SectionTitle>Editor</SectionTitle>
          <Div className={`grid grid-cols-${tablet ? 3 : 1} gap-3`}>
            <Field label="Applies to">
              <Select value={draft.module} onChange={set('module')} className={INPUT}>
                {modules.map((m) => (
                  <Option key={m} value={m}>
                    {MODULE_LABEL[m] || m}
                  </Option>
                ))}
              </Select>
            </Field>
            <Field label="Audience">
              <Select value={draft.audience} onChange={set('audience')} className={INPUT}>
                {audiences.map((a) => (
                  <Option key={a} value={a}>
                    {a}
                  </Option>
                ))}
              </Select>
            </Field>
            <Field label="Document">
              <Select value={draft.slug} onChange={set('slug')} className={INPUT}>
                {slugs.map((s) => (
                  <Option key={s} value={s}>
                    {SLUG_LABEL[s] || s}
                  </Option>
                ))}
              </Select>
            </Field>
          </Div>

          <Field label="Title" required>
            <Input value={draft.title} onChange={set('title')} className={INPUT} placeholder="Privacy Policy" />
          </Field>

          <Field
            label="Content"
            hint={`${String(draft.content || '').length.toLocaleString('en-IN')} characters${existing ? '' : ' · not published yet'}`}
          >
            <Textarea
              value={draft.content}
              onChange={set('content')}
              rows={18}
              className={`${INPUT} h-auto py-2.5`}
              placeholder="Plain text or HTML — whatever the apps should render."
            />
          </Field>

          <Div className="flex-row items-start gap-3">
            <Input type="checkbox" className="w-5 h-5" checked={draft.isActive} onChange={set('isActive')} />
            <P className="text-sm text-slate-700 flex-1">Published — uncheck to keep it as a draft the apps will not show</P>
          </Div>

          <Div className="flex-row flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <Button type="submit" disabled={saving} className={BTN_PRIMARY}>
              {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Save} size={16} className="text-white" />}
              <Span className={BTN_TEXT_PRIMARY}>Save</Span>
            </Button>

            {existing && (
              <Button
                type="button"
                onClick={remove}
                disabled={saving}
                className="flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg border border-red-200 bg-white"
              >
                <UiIcon as={Trash2} size={16} className="text-red-600" />
                <Span className="text-sm font-semibold text-red-600">Remove</Span>
              </Button>
            )}
          </Div>

          <Div className="flex-row items-center gap-1.5">
            <UiIcon as={FileText} size={14} className="text-slate-400" />
            <Span className="text-xs text-slate-500 flex-1" numberOfLines={1}>
              /v1/legal/{draft.slug}?module={draft.module}
            </Span>
          </Div>
        </Card>
      </Form>
    </AdminPage>
  );
};
export default LegalDocuments;
