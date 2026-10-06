import { createElement, useMemo } from 'react';
import { htmlCss } from './htmlStyles';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Nunito+Sans:wght@500;600;700;800&family=Sora:wght@600;700&display=swap';
if (typeof document !== 'undefined' && !document.querySelector(`link[href="${FONT_HREF}"]`)) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONT_HREF;
  document.head.appendChild(link);
}

/* Expo web preview: no WebView there, so the HTML goes into a scoped div. */
let seq = 0;
export default function HtmlContent({ html, ...cssOptions }) {
  const scope = useMemo(() => `html-content-${++seq}`, []);
  const css = htmlCss(cssOptions)
    .replace(/html,body\{[^}]*\}/, '')
    .replace(/body\{/, `.${scope}{`)
    .replace(/(^|\})\s*([^{}@]+)\{/g, (m, brace, sel) =>
      sel.trim().startsWith(`.${scope}`) ? m : `${brace}${sel.split(',').map((s) => `.${scope} ${s.trim()}`).join(',')}{`,
    );
  return createElement(
    'div',
    null,
    createElement('style', { dangerouslySetInnerHTML: { __html: css } }),
    createElement('div', { className: scope, dangerouslySetInnerHTML: { __html: html || '' } }),
  );
}
