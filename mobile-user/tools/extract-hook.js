/*
 * Turns the non-visual half of a large web page component into a hook, so the
 * page's data loading, cart maths and handlers run unchanged and only its JSX
 * is rewritten for React Native.
 *
 *   function Page() { <logic> return ( <jsx> ) }
 *     ->  export function usePage() { <logic> return { every top-level name } }
 *
 * Statements that build JSX are left out and listed, as is everything after
 * the first early `return <jsx>`; those are ported by hand in the screen.
 *
 * usage: node tools/extract-hook.js tools/hook-jobs.json   (the job list is kept in the repo)
 *   jobs: [{ from: "modules/Food/pages/user/X.jsx", to: "food/hooks/pages/useX.js",
 *            component: "X", hook: "useX" }]
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..').replace(/\\/g, '/');
const web = `${root}/Frontend/src`;
const app = `${root}/mobile-user/src`;

const ALIASES = [
  [/^react-router-dom$/, 'lib/webRouter'],
  [/^sonner$/, 'lib/notify'],
  [/^@food\/components\/user\/UserLayout$/, 'food/components/shell'],
  [/^@food\/utils\/razorpay$/, 'lib/razorpay'],
  [/^@food\/api\/config$/, 'api/config'],
  [/^@food\/api\/axios$/, 'api/client'],
  [/^@food\/api$/, 'api/food'],
  [/^@\/services\/api$/, 'api/food'],
  [/^@food\/(utils|context|hooks|constants|components|store)\/(.+?)(\.jsx?)?$/, (m) => `food/${m[1]}/${m[2]}`],
  [/^@\/shared\/(.+?)(\.jsx?)?$/, (m) => `shared/${m[1]}`],
];
const rel = (fromFile, target) => {
  let r = path.relative(path.dirname(fromFile), path.join(app, target)).replace(/\\/g, '/');
  if (!r.startsWith('.')) r = `./${r}`;
  return r;
};
// bundled web assets -> the app's copy (path relative to mobile-user/)
const ASSETS = {
  'dish_fallback.webp': 'assets/food/dish_fallback.webp',
  'profile_avatar.webp': 'assets/food/profile_avatar.webp',
  'fssai.png': 'assets/food/fssai.png',
};
const HAS_JSX = /<\/[A-Za-z.]*>|\/>|<>/;

function transform(text) {
  text = text.replace(/\bwindow\.localStorage\b/g, 'localStorage').replace(/\bwindow\.sessionStorage\b/g, 'sessionStorage');
  text = text.replace(/typeof localStorage\s*(!==|===)\s*["']undefined["']/g, (m, op) => (op === '!==' ? 'true' : 'false'));
  text = text.replace(/\blocalStorage\b/g, 'localStore').replace(/\bsessionStorage\b/g, 'sessionStore');
  text = text.replace(/window\.dispatchEvent\(\s*new\s+(?:Custom)?Event\(\s*([^,)]+?)\s*(?:,\s*\{\s*detail(\s*:\s*([\s\S]*?))?\s*,?\s*\}\s*)?,?\s*\)\s*,?\s*\)/g, (m, name, hasValue, detail) =>
    m.includes('detail') ? `events.emit(${name}, ${hasValue ? detail : 'detail'})` : `events.emit(${name})`,
  );
  text = text.replace(/\bwindow\.(setTimeout|clearTimeout|setInterval|clearInterval)\b/g, '$1');
  text = text.replace(/import\.meta\.env\??\.DEV/g, '__DEV__');
  text = text.replace(/import\.meta\.env\??\.VITE_([A-Z0-9_]+)/g, 'process.env.EXPO_PUBLIC_$1');
  text = text.replace(/typeof (window|document|navigator)\s*(!==|===)\s*["']undefined["']/g, (m, w, op) => (op === '!==' ? 'true' : 'false'));
  text = text.replace(/useState\((Date\.now\(\)|new Date\(\))\)/g, 'useState(() => $1)');
  text = text.replace(/\bnew window\.Image\(/g, 'new Image(');
  text = text.replace(/^[ \t]*if \(false\) return[^\n]*\n/gm, '');
  text = text.replace(/\btrue && /g, '').replace(/ \|\| false\)/g, ')').replace(/\(false \|\| /g, '(');
  return text;
}

/** Names bound by one top-level statement (`const [a, b] =`, `const { a, b: c } =`, `function f(`). */
function namesOf(block) {
  const head = block.trimStart();
  let m = head.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/);
  if (m) return [m[1]];
  m = head.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/);
  if (m) return [m[1]];
  m = head.match(/^(?:const|let|var)\s*([[{])/);
  if (!m) return [];
  const open = m[1];
  const close = open === '[' ? ']' : '}';
  const start = head.indexOf(open);
  let depth = 0;
  let end = -1;
  for (let i = start; i < head.length; i += 1) {
    if (head[i] === open) depth += 1;
    else if (head[i] === close) {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return [];
  const inner = head.slice(start + 1, end);
  // top-level comma split
  const parts = [];
  let d = 0;
  let cur = '';
  for (const ch of inner) {
    if ('[{('.includes(ch)) d += 1;
    if (']})'.includes(ch)) d -= 1;
    if (ch === ',' && d === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts
    .map((p) => p.replace(/\/\/.*$/gm, '').trim())
    .filter(Boolean)
    .map((p) => {
      if (p.startsWith('...')) return p.slice(3).trim();
      const noDefault = p.split('=')[0].trim();
      const alias = noDefault.split(':');
      return (alias[1] || alias[0]).trim();
    })
    .filter((n) => /^[A-Za-z_$][\w$]*$/.test(n));
}

const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^﻿/, ''));
for (const { from, to, component, hook, patches = [] } of jobs) {
  const dest = path.join(app, to);
  const lines = fs.readFileSync(path.join(web, from), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n').split('\n');
  // `function Page(` or `const Page = (...) => {`
  const startRe = new RegExp(`^(?:export\\s+default\\s+|export\\s+)?(?:function\\s+${component}\\s*\\(|const\\s+${component}\\s*=\\s*\\()`);
  const start = lines.findIndex((l) => startRe.test(l));
  if (start < 0) {
    console.log(`${from}: component ${component} not found`);
    continue;
  }
  let end = lines.findIndex((l, i) => i > start && /^\};?$/.test(l));
  if (end < 0) end = lines.length;
  // `function Page({` may spread its props over several lines
  let bodyStart = start;
  while (bodyStart < lines.length - 1 && !/\)\s*(?:=>\s*)?\{\s*$/.test(lines[bodyStart])) bodyStart += 1;
  const args = (lines.slice(start, bodyStart + 1).join('\n').match(/\(([\s\S]*)\)\s*(?:=>\s*)?\{\s*$/) || [, ''])[1];
  const indent = (lines.slice(bodyStart + 1, end).find((l) => l.trim()) || '  ').match(/^\s*/)[0];
  const topRe = new RegExp(`^${indent}[^\\s})\\].?:|&+\\-*/]`);

  // split the body into top-level statements
  const blocks = [];
  for (let i = bodyStart + 1; i < end; i += 1) {
    const line = lines[i];
    if (topRe.test(line) || !blocks.length) blocks.push({ at: i + 1, text: [line] });
    else blocks[blocks.length - 1].text.push(line);
  }

  const kept = [];
  const dropped = [];
  let cut = null;
  const names = [];
  for (const b of blocks) {
    const text = b.text.join('\n');
    const first = text.trimStart();
    if (!text.trim()) {
      kept.push(text);
      continue;
    }
    // `if (!ready) return null` in the middle of a component: the logic goes on after it,
    // so the hook keeps the guard and reports it; the screen renders nothing on `__guard`.
    if (/^if\b/.test(first) && /\breturn null\b/.test(text) && !HAS_JSX.test(text)) {
      kept.push(text.replace(/\breturn null\b;?/g, 'return { __guard: true }'));
      continue;
    }
    const returnsJsx = /^(if\b[\s\S]*?\breturn\b|return\b)/.test(first) && (HAS_JSX.test(text) || /^return\s*\(/.test(first) || /return null/.test(first));
    if (returnsJsx) {
      cut = b.at;
      break;
    }
    if (HAS_JSX.test(text)) {
      dropped.push(`${b.at}-${b.at + b.text.length - 1}: ${first.split('\n')[0].slice(0, 90)}`);
      continue;
    }
    kept.push(text);
    names.push(...namesOf(text));
  }

  // module scope: keep imports and JSX-free helpers that precede the component
  const headBlocks = [];
  for (let i = 0; i < start; i += 1) {
    const line = lines[i];
    if (/^\S/.test(line) && !/^[})\]]/.test(line)) headBlocks.push([line]);
    else if (headBlocks.length) headBlocks[headBlocks.length - 1].push(line);
  }
  const imports = [];
  const helpers = [];
  for (const hb of headBlocks) {
    const text = hb.join('\n');
    if (/^import\s/.test(text)) imports.push(text);
    else if (HAS_JSX.test(text)) dropped.push(`module: ${text.split('\n')[0].slice(0, 90)}`);
    else if (text.trim() && !/^\/\//.test(text.trim())) helpers.push(text.replace(/\n+$/, ''));
  }

  let body = transform(kept.join('\n'));
  const helperText = transform(helpers.join('\n\n'));
  const used = `${helperText}\n${body}`;

  const outImports = [];
  const assetConsts = [];
  for (const imp of imports) {
    const m = imp.match(/^import\s+([\s\S]*?)\s+from\s+(['"])([^'"]+)\2/);
    if (!m) continue;
    let spec = m[3];
    const tx = require('./taxi-map').taxiSpec(spec);
    if (tx) spec = rel(dest, tx);
    else for (const [re, target] of ALIASES) {
      const mm = spec.match(re);
      if (mm) {
        spec = rel(dest, typeof target === 'function' ? target(mm) : target);
        break;
      }
    }
    if (/\.(png|jpe?g|webp|svg|gif|css)(\?.*)?$/.test(spec)) {
      const binding = (m[1].match(/^([A-Za-z_$][\w$]*)$/) || [])[1];
      if (binding && new RegExp(`\\b${binding}\\b`).test(used)) {
        const local = ASSETS[spec.split('/').pop().replace(/\?.*$/, '')] || require('./taxi-map').taxiAsset(m[3]);
        assetConsts.push(local ? `const ${binding} = require('${path.relative(path.dirname(dest), path.join(root, 'mobile-user', local)).replace(/\\/g, '/')}')` : `const ${binding} = null // web asset not bundled: ${spec}`);
        if (!local) dropped.push(`asset: ${binding} <- ${spec}`);
      }
      continue;
    }
    if (spec === 'lucide-react') spec = 'lucide-react-native';
    spec = spec.replace(/\.jsx?$/, '');
    const clause = m[1];
    const def = (clause.match(/^([A-Za-z_$][\w$]*)\s*(,|$)/) || [])[1];
    const named = (clause.match(/\{([\s\S]*)\}/) || [, ''])[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const isUsed = (n) => new RegExp(`(^|[^\\w$.])${n.replace(/\$/g, '\\$')}\\b`).test(used);
    const keepNamed = named.filter((n) => isUsed((n.split(/\s+as\s+/)[1] || n).trim()));
    const keepDef = def && isUsed(def) ? def : null;
    if (!keepDef && !keepNamed.length) continue;
    outImports.push(`import ${[keepDef, keepNamed.length ? `{ ${keepNamed.join(', ')} }` : null].filter(Boolean).join(', ')} from '${spec}'`);
  }
  if (/\blocalStore\b|\bsessionStore\b/.test(used)) {
    outImports.push(`import { ${[/\blocalStore\b/.test(used) && 'localStore', /\bsessionStore\b/.test(used) && 'sessionStore'].filter(Boolean).join(', ')} } from '${rel(dest, 'lib/storage')}'`);
  }
  if (/\bevents\.(on|off|emit)\(/.test(used)) outImports.push(`import { events } from '${rel(dest, 'lib/events')}'`);
  const shim = ['window', 'document', 'navigator'].filter((n) => new RegExp(`(^|[^\\w$.])${n}\\??\\.`, 'm').test(used));
  if (/\bnew (Custom)?Event\(/.test(used)) shim.push('CustomEvent');
  if (/\bnew Event\(/.test(used)) shim.push('CustomEvent as Event');
  if (/\bnew Image\(/.test(used)) shim.push('Image');
  if (/(^|[^\w$.])alert\(/m.test(used)) shim.push('alert');
  if (/\bnew Audio\(/.test(used)) shim.push('Audio');
  if (shim.length) outImports.push(`import { ${shim.join(', ')} } from '${rel(dest, 'lib/webShim')}'`);

  // module-level helpers the JSX uses are handed out with the rest
  const helperNames = helpers.flatMap((h) => namesOf(h)).filter((n) => !/^debug(Log|Warn|Error)$/.test(n));
  const uniq = [...new Set([...names, ...helperNames])];
  const out = [
    `// Generated by tools/extract-hook.js from Frontend/src/${from} (${component}), then edited by hand`,
    '// where the web code touched the DOM. The logic is the web page\'s own.',
    '/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars, no-empty */',
    ...outImports,
    '',
    ...assetConsts,
    helperText,
    '',
    `export function ${hook}(${args}) {`,
    body.replace(/\n+$/, ''),
    '',
    `${indent}return {`,
    ...uniq.map((n) => `${indent}${indent}${n},`),
    `${indent}}`,
    '}',
    '',
  ].join('\n');

  // hand edits that must survive a re-run live in the job file
  let finalOut = out;
  for (const { find, replace } of patches) {
    if (!finalOut.includes(find)) console.log(`  PATCH NOT FOUND: ${find.slice(0, 70).replace(/\n/g, '\\n')}`);
    else finalOut = finalOut.replace(find, () => replace);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, finalOut, 'utf8');

  const outText = finalOut;
  console.log(`\n${to}: ${out.split('\n').length} lines, ${uniq.length} names; web render starts at line ${cut || '?'} (component ${start + 1}-${end + 1})`);
  if (dropped.length) console.log(`  left out (JSX):\n   ${dropped.join('\n   ')}`);
  const left = [];
  outText.split('\n').forEach((line, i) => {
    if (/\b(getBoundingClientRect|scrollIntoView|scrollTo|IntersectionObserver|ResizeObserver|matchMedia|FileReader|createObjectURL|canvas|confetti)\b/.test(line) && !/^\s*(\/\/|\*)/.test(line)) {
      left.push(`   ${i + 1}: ${line.trim().slice(0, 120)}`);
    }
  });
  if (left.length) console.log(`  browser APIs to review (${left.length}):\n${left.join('\n')}`);
}
