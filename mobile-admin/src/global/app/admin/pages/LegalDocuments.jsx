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
  Button,
  Div,
  Form,
  H1,
  H2,
  Input,
  Label,
  Li,
  Option,
  P,
  ScrollDiv,
  Section,
  Select,
  Span,
  Textarea,
  Ul,
  Icon as UiIcon,
} from '../../../../components/web';
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
const field = 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#0a4d2b]';
const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500';
const blank = {
  module: 'platform',
  audience: 'customer',
  slug: 'privacy',
  title: '',
  content: '',
  isActive: true,
};
const LegalDocuments = () => {
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
    <ScrollDiv className="p-4 pb-20 space-y-5">
      <Div>
        <H1 className="text-xl font-bold text-gray-900">Legal &amp; Policies</H1>
        <P className="mt-1 text-sm text-gray-500">One copy of each document for every app. A module with nothing of its own shows the “All apps” version.</P>
      </Div>

      <Div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        {/* What exists today, so gaps are visible at a glance. */}
        <Section className="rounded-2xl border border-gray-200 bg-white p-4">
          <H2 className="mb-3 text-sm font-bold text-gray-900">Published</H2>

          {loading ? (
            <Div className="flex justify-center py-8">
              <UiIcon as={Loader2} className="h-5 w-5 animate-spin text-gray-400" />
            </Div>
          ) : documents.length === 0 ? (
            <P className="py-8 text-center text-sm text-gray-400">Nothing published yet.</P>
          ) : (
            <Ul className="space-y-1.5">
              {documents.map((doc) => {
                const active = doc.module === draft.module && doc.audience === draft.audience && doc.slug === draft.slug;
                return (
                  <Li key={doc._id}>
                    <Button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...doc,
                        })
                      }
                      className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${active ? 'border-[#0a4d2b] bg-[#0a4d2b]/5' : 'border-gray-100 hover:bg-gray-50'}`}
                    >
                      <P className="text-sm font-semibold text-gray-900">{SLUG_LABEL[doc.slug] || doc.slug}</P>
                      <P className="text-[11px] text-gray-500">
                        {MODULE_LABEL[doc.module] || doc.module} · {doc.audience}
                        {doc.isActive ? '' : ' · draft'}
                      </P>
                    </Button>
                  </Li>
                );
              })}
            </Ul>
          )}
        </Section>

        <Form onSubmit={save} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <Div className="grid gap-3 sm:grid-cols-3">
            <Div>
              <Label className={label}>Applies to</Label>
              <Select value={draft.module} onChange={set('module')} className={field}>
                {modules.map((m) => (
                  <Option key={m} value={m}>
                    {MODULE_LABEL[m] || m}
                  </Option>
                ))}
              </Select>
            </Div>
            <Div>
              <Label className={label}>Audience</Label>
              <Select value={draft.audience} onChange={set('audience')} className={field}>
                {audiences.map((a) => (
                  <Option key={a} value={a}>
                    {a}
                  </Option>
                ))}
              </Select>
            </Div>
            <Div>
              <Label className={label}>Document</Label>
              <Select value={draft.slug} onChange={set('slug')} className={field}>
                {slugs.map((s) => (
                  <Option key={s} value={s}>
                    {SLUG_LABEL[s] || s}
                  </Option>
                ))}
              </Select>
            </Div>
          </Div>

          <Div>
            <Label className={label}>Title</Label>
            <Input value={draft.title} onChange={set('title')} className={field} placeholder="Privacy Policy" />
          </Div>

          <Div>
            <Label className={label}>Content</Label>
            <Textarea
              value={draft.content}
              onChange={set('content')}
              rows={18}
              className={`${field} font-mono text-xs leading-relaxed`}
              placeholder="Plain text or HTML — whatever the apps should render."
            />
            <P className="mt-1 text-[11px] text-gray-400">
              {String(draft.content || '').length.toLocaleString('en-IN')} characters
              {existing ? '' : ' · not published yet'}
            </P>
          </Div>

          <Div className="flex items-center gap-2 text-sm text-gray-700">
            <Input type="checkbox" checked={draft.isActive} onChange={set('isActive')} />
            Published — uncheck to keep it as a draft the apps will not show
          </Div>

          <Div className="flex items-center gap-3 border-t border-gray-100 pt-4">
            <Button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0a4d2b] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#06381e] disabled:opacity-60"
            >
              {saving ? <UiIcon as={Loader2} className="h-4 w-4 animate-spin" /> : <UiIcon as={Save} className="h-4 w-4" />}
              Save
            </Button>

            {existing && (
              <Button
                type="button"
                onClick={remove}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                <UiIcon as={Trash2} className="h-4 w-4" />
                Remove
              </Button>
            )}

            <Span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-gray-400">
              <UiIcon as={FileText} className="h-3.5 w-3.5" />
              /v1/legal/{draft.slug}?module={draft.module}
            </Span>
          </Div>
        </Form>
      </Div>
    </ScrollDiv>
  );
};
export default LegalDocuments;
