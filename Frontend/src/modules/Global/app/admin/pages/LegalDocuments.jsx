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
import { Loader2, Save, Trash2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

import globalService from '../../../services/globalService';

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

const field =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#0a4d2b]';
const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500';

const blank = { module: 'platform', audience: 'customer', slug: 'privacy', title: '', content: '', isActive: true };

const LegalDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [meta, setMeta] = useState({ modules: [], audiences: [], slugs: [] });
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

  useEffect(() => { load(); }, [load]);

  /** The document the current selection points at, if it exists yet. */
  const existing = useMemo(
    () =>
      documents.find(
        (d) => d.module === draft.module && d.audience === draft.audience && d.slug === draft.slug,
      ),
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
    setDraft((current) => ({ ...current, [key]: value }));
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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Legal &amp; Policies</h1>
        <p className="mt-1 text-sm text-gray-500">
          One copy of each document for every app. A module with nothing of its own shows the
          “All apps” version.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        {/* What exists today, so gaps are visible at a glance. */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-gray-900">Published</h2>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : documents.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Nothing published yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {documents.map((doc) => {
                const active =
                  doc.module === draft.module && doc.audience === draft.audience && doc.slug === draft.slug;
                return (
                  <li key={doc._id}>
                    <button
                      type="button"
                      onClick={() => setDraft({ ...doc })}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                        active ? 'border-[#0a4d2b] bg-[#0a4d2b]/5' : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        {SLUG_LABEL[doc.slug] || doc.slug}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {MODULE_LABEL[doc.module] || doc.module} · {doc.audience}
                        {doc.isActive ? '' : ' · draft'}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form onSubmit={save} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={label}>Applies to</label>
              <select value={draft.module} onChange={set('module')} className={field}>
                {modules.map((m) => <option key={m} value={m}>{MODULE_LABEL[m] || m}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Audience</label>
              <select value={draft.audience} onChange={set('audience')} className={field}>
                {audiences.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Document</label>
              <select value={draft.slug} onChange={set('slug')} className={field}>
                {slugs.map((s) => <option key={s} value={s}>{SLUG_LABEL[s] || s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Title</label>
            <input value={draft.title} onChange={set('title')} className={field} placeholder="Privacy Policy" />
          </div>

          <div>
            <label className={label}>Content</label>
            <textarea
              value={draft.content}
              onChange={set('content')}
              rows={18}
              className={`${field} font-mono text-xs leading-relaxed`}
              placeholder="Plain text or HTML — whatever the apps should render."
            />
            <p className="mt-1 text-[11px] text-gray-400">
              {String(draft.content || '').length.toLocaleString('en-IN')} characters
              {existing ? '' : ' · not published yet'}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={draft.isActive} onChange={set('isActive')} />
            Published — uncheck to keep it as a draft the apps will not show
          </label>

          <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0a4d2b] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#06381e] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>

            {existing && (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            )}

            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-gray-400">
              <FileText className="h-3.5 w-3.5" />
              /v1/legal/{draft.slug}?module={draft.module}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LegalDocuments;
