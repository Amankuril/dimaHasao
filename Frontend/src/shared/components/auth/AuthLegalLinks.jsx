/**
 * Privacy · Terms · Support, on every sign-in and OTP screen.
 *
 * All three come from Global Settings rather than from each module, so the
 * district changes its support number or republishes a policy once and every
 * app follows. Before this, only the restaurant sign-in had these links at all,
 * and they pointed at food-module routes that no other app could serve.
 *
 * A link is only rendered when the document behind it actually exists — the
 * settings endpoint says which are published for this module — so nobody is
 * ever sent to a 404. Support falls back to the configured phone or email when
 * no support URL is set, and disappears entirely when the district has
 * configured none of them.
 *
 * Deliberately silent on failure: a sign-in screen must render even if this
 * request does not, so a missing footer is better than a broken page.
 */
import { useEffect, useState } from 'react';

const RAW_API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api/v1';

const apiBase = String(RAW_API_BASE).replace(/\/+$/, '');

/**
 * The in-app viewer, not the API. The endpoint answers JSON; sending someone
 * from a sign-in screen to a wall of JSON is not a privacy policy.
 */
const legalHref = (slug, module) =>
  `/legal/${slug}${module && module !== 'platform' ? `?module=${module}` : ''}`;

/**
 * @param {object}  props
 * @param {string}  props.module     which app is asking — decides whose policy
 *                                   is shown, falling back to the district's
 * @param {string}  [props.className] wrapper classes, so each screen keeps its
 *                                    own palette
 * @param {string}  [props.linkClassName]
 * @param {'text'|'icons'} [props.variant] 'text' (default) renders the
 *                                    Privacy • Terms • Support line; 'icons'
 *                                    renders the same three, gated the same
 *                                    way, as icon buttons for a footer row.
 * @param {string}  [props.iconWrapClassName] icon-variant only: classes for
 *                                    the circle behind each icon
 * @param {string}  [props.iconClassName]     icon-variant only: classes for
 *                                    the <i> icon itself
 * @param {string}  [props.labelClassName]    icon-variant only: classes for
 *                                    the label under each icon
 */
const ICON_BY_KEY = {
  privacy: 'fa-solid fa-lock',
  terms: 'fa-solid fa-file-contract',
  support: 'fa-solid fa-headset',
};

export default function AuthLegalLinks({
  module = 'platform',
  className = '',
  linkClassName = '',
  variant = 'text',
  iconWrapClassName = '',
  iconClassName = '',
  labelClassName = '',
}) {
  const [state, setState] = useState({ legal: { privacy: false, terms: false }, settings: null });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`${apiBase}/platform/settings?module=${encodeURIComponent(module)}`);
        if (!response.ok) return;
        const body = await response.json();
        if (!cancelled && body?.success) {
          setState({ legal: body.legal || {}, settings: body.settings || null });
        }
      } catch {
        // See the note above: never take the sign-in screen down for this.
      }
    })();

    return () => { cancelled = true; };
  }, [module]);

  const { legal, settings } = state;

  const supportHref =
    settings?.supportUrl ||
    (settings?.supportPhone ? `tel:${String(settings.supportPhone).replace(/\s+/g, '')}` : '') ||
    (settings?.supportEmail ? `mailto:${settings.supportEmail}` : '');

  const items = [
    legal?.privacy && { key: 'privacy', label: 'Privacy', href: legalHref('privacy', module) },
    legal?.terms && { key: 'terms', label: 'Terms', href: legalHref('terms', module) },
    supportHref && { key: 'support', label: 'Support', href: supportHref },
  ].filter(Boolean);

  if (!items.length) return null;

  if (variant === 'icons') {
    return (
      <div className={className}>
        {items.map((item) => (
          <a
            key={item.key}
            href={item.href}
            target={item.href.startsWith('/legal/') ? '_blank' : undefined}
            rel="noreferrer"
            className={linkClassName}
          >
            <span className={iconWrapClassName}>
              <i className={`${ICON_BY_KEY[item.key]} ${iconClassName}`}></i>
            </span>
            <span className={labelClassName}>{item.label}</span>
          </a>
        ))}
      </div>
    );
  }

  return (
    <p className={className}>
      {items.map((item, index) => (
        <span key={item.key}>
          {index > 0 && <span aria-hidden className="mx-2 opacity-50">•</span>}
          <a
            href={item.href}
            target={item.href.startsWith('/legal/') ? '_blank' : undefined}
            rel="noreferrer"
            className={linkClassName}
          >
            {item.label}
          </a>
        </span>
      ))}
    </p>
  );
}
