/**
 * Renders a policy published in Global Settings.
 *
 * One route for every app: `/legal/privacy`, `/legal/terms`, and so on, with
 * `?module=` choosing whose copy to show and falling back to the district's.
 * Each module used to carry its own privacy and terms screens — food had four,
 * hotel two, taxi one reading a bundled text file — and tours, festivals and
 * the customer app had none.
 *
 * Deliberately plain and self-contained: it is linked from sign-in screens, so
 * it must render for somebody who has no session and may be seeing the app for
 * the first time.
 */
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const RAW_API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api/v1';
const apiBase = String(RAW_API_BASE).replace(/\/+$/, '');

/** The stored content may be HTML from an editor or plain text from a file. */
const looksLikeHtml = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value || ''));

export default function LegalDocumentPage() {
  const { slug = 'privacy' } = useParams();
  const [params] = useSearchParams();
  const module = params.get('module') || 'platform';

  const [state, setState] = useState({ status: 'loading', document: null, message: '' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', document: null, message: '' });

    (async () => {
      try {
        const url = `${apiBase}/legal/${encodeURIComponent(slug)}?module=${encodeURIComponent(module)}`;
        const response = await fetch(url);
        const body = await response.json().catch(() => null);

        if (cancelled) return;

        if (response.ok && body?.document) {
          setState({ status: 'ready', document: body.document, message: '' });
        } else {
          setState({
            status: 'empty',
            document: null,
            message: body?.message || 'This document has not been published yet.',
          });
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'empty', document: null, message: 'Could not load this document.' });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [slug, module]);

  const { status, document: doc, message } = state;

  return (
    <div className="min-h-dvh bg-[#faf6ed] px-4 py-10">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[#e5ddc3] bg-white p-6 shadow-sm sm:p-10">
        <header className="mb-6 border-b border-[#e5ddc3] pb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0a4d2b]">
            Dima Hasao Tourism
          </p>
          <h1 className="mt-1.5 text-2xl font-black text-gray-900">
            {doc?.title || (status === 'loading' ? 'Loading…' : 'Not available')}
          </h1>
          {doc?.updatedAt && (
            <p className="mt-1 text-xs text-gray-500">
              Last updated {new Date(doc.updatedAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </header>

        {status === 'loading' && (
          <div className="space-y-3" aria-hidden>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-3 animate-pulse rounded bg-gray-100" style={{ width: `${90 - i * 7}%` }} />
            ))}
          </div>
        )}

        {status === 'empty' && <p className="py-8 text-sm text-gray-500">{message}</p>}

        {status === 'ready' && (
          looksLikeHtml(doc.content) ? (
            // The content is written by an admin in Global Settings, not by a
            // visitor, so this is first-party copy rather than user input.
            <div
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: doc.content }}
            />
          ) : (
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-gray-700">
              {doc.content}
            </pre>
          )
        )}
      </div>
    </div>
  );
}
