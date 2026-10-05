/*
 * Ports platform-agnostic web modules (contexts, hooks, utils) into the app:
 * rewrites path aliases, swaps localStorage/sessionStorage/window events for
 * the app's shims, and reports whatever browser API is left for manual work.
 *
 * usage: node port-logic.js <jobs.json>
 *   jobs: [{ from: "modules/Food/utils/x.js", to: "food/utils/x.js" }, ...]
 */
const fs = require('fs');
const path = require('path');
const root = require('path').resolve(__dirname, '../..').replace(/\\/g, '/');
const web = `${root}/Frontend/src`;
const app = `${root}/mobile-user/src`;

// web import specifier -> app path (relative to src), or a function
const ALIASES = [
  [/^@food\/api\/config$/, 'api/config'],
  [/^@food\/api\/axios$/, 'api/client'],
  [/^@food\/api$/, 'api/food'],
  [/^@\/services\/api$/, 'api/food'],
  [/^@food\/(utils|context|hooks|constants|components|store)\/(.+)$/, (m) => `food/${m[1]}/${m[2]}`],
  [/^@\/shared\/(.+?)(\.jsx?)?$/, (m) => `shared/${m[1]}`],
];

const rel = (fromFile, target) => {
  let r = path.relative(path.dirname(fromFile), path.join(app, target)).replace(/\\/g, '/');
  if (!r.startsWith('.')) r = `./${r}`;
  return r;
};

const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^﻿/, ''));
for (const { from, to } of jobs) {
  const dest = path.join(app, to);
  let text = fs.readFileSync(path.join(web, from), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

  // imports
  text = text.replace(/(from\s+|import\s*\(\s*)(['"])([^'"]+)\2/g, (all, lead, q, spec) => {
    const tx = require('./taxi-map').taxiSpec(spec);
    if (tx) return `${lead}'${rel(dest, tx)}'`;
    for (const [re, target] of ALIASES) {
      const m = spec.match(re);
      if (m) return `${lead}'${rel(dest, typeof target === 'function' ? target(m) : target)}'`;
    }
    if (spec === 'sonner') return `${lead}'${rel(dest, 'lib/notify')}'`;
    return `${lead}${q}${spec.replace(/\.jsx?$/, '')}${q}`;
  });

  // storage + events
  text = text.replace(/\bwindow\.localStorage\b/g, 'localStorage').replace(/\bwindow\.sessionStorage\b/g, 'sessionStorage');
  const usesLocal = /\blocalStorage\b/.test(text);
  const usesSession = /\bsessionStorage\b/.test(text);
  text = text.replace(/typeof localStorage\s*(!==|===)\s*["']undefined["']/g, (m, op) => (op === '!==' ? 'true' : 'false'));
  text = text.replace(/\blocalStorage\b/g, 'localStore').replace(/\bsessionStorage\b/g, 'sessionStore');
  text = text.replace(/window\.dispatchEvent\(\s*new\s+(?:Custom)?Event\(\s*([^,)]+?)\s*(?:,\s*\{\s*detail(\s*:\s*([\s\S]*?))?\s*,?\s*\}\s*)?,?\s*\)\s*,?\s*\)/g, (m, name, hasValue, detail) =>
    m.includes('detail') ? `events.emit(${name}, ${hasValue ? detail : 'detail'})` : `events.emit(${name})`,
  );
  text = text.replace(/\bwindow\.(setTimeout|clearTimeout|setInterval|clearInterval|requestAnimationFrame|cancelAnimationFrame)\b/g, '$1');
  text = text.replace(/window\.addEventListener\(/g, 'events.on(').replace(/window\.removeEventListener\(/g, 'events.off(');
  const usesEvents = /\bevents\.(on|off|emit)\(/.test(text);

  // env
  text = text.replace(/import\.meta\.env\??\.DEV/g, '__DEV__');
  text = text.replace(/import\.meta\.env\??\.VITE_([A-Z0-9_]+)/g, 'process.env.EXPO_PUBLIC_$1');
  text = text.replace(/typeof import\.meta\s*!==\s*["']undefined["']\s*&&\s*/g, '');
  text = text.replace(/typeof window\s*(!==|===)\s*["']undefined["']/g, (m, op) => (op === '!==' ? 'true' : 'false'));

  // dead branches left by the typeof checks above
  text = text.replace(/^[ \t]*if \(false\) return[^\n]*\n/gm, '');
  text = text.replace(/\btrue && /g, '').replace(/ \|\| false\)/g, ')').replace(/\(false \|\| /g, '(');

  const inject = [];
  if (usesLocal || usesSession) inject.push(`import { ${[usesLocal && 'localStore', usesSession && 'sessionStore'].filter(Boolean).join(', ')} } from '${rel(dest, 'lib/storage')}';`);
  if (usesEvents) inject.push(`import { events } from '${rel(dest, 'lib/events')}';`);
  if (inject.length) {
    // after the last top-level import statement (single- or multi-line)
    const re = /^import[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$|^import\s+['"][^'"]+['"];?[ \t]*$/gm;
    let last = 0;
    let m;
    while ((m = re.exec(text))) last = m.index + m[0].length;
    text = last ? `${text.slice(0, last)}\n${inject.join('\n')}${text.slice(last)}` : `${inject.join('\n')}\n${text}`;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, text, 'utf8');

  const left = [];
  text.split('\n').forEach((line, i) => {
    if (/\b(window|document|navigator|import\.meta|location\.(href|pathname|search|reload)|alert\(|confirm\(|FileReader|Blob\b|URL\.createObjectURL|HTMLElement|matchMedia|requestAnimationFrame|IntersectionObserver)\b/.test(line) && !/^\s*(\/\/|\*)/.test(line)) {
      left.push(`   ${i + 1}: ${line.trim().slice(0, 130)}`);
    }
  });
  console.log(`${to}  (${text.split('\n').length} lines)${left.length ? `  -- ${left.length} to review` : ''}`);
  left.slice(0, 12).forEach((l) => console.log(l));
  if (left.length > 12) console.log(`   ... ${left.length - 12} more`);
}
