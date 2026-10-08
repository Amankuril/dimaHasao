/*
 * The import graph of the admin web source: which module files each routed page
 * pulls in (kit-replaced files excluded). Used to give every file one owner.
 *
 * usage: node tools/deps.js <entry files under Frontend/src...>   -> JSON { file: [deps...] }
 */
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const WEB = path.resolve(__dirname, '../../Frontend/src');
const ALIASES = [['@food/api/axios', 'services/api/axios'], ['@food/api/config', 'services/api/config'], ['@food/api', 'services/api'], ['@food', 'modules/Food'], ['@delivery', 'modules/DeliveryV2'], ['@/assets', 'modules/Taxi/assets'], ['@/components', 'modules/Taxi/components'], ['@', '']];
const EXTS = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'];
function resolve(spec, fromAbs) {
  let rel = null;
  if (spec.startsWith('.')) rel = path.relative(WEB, path.resolve(path.dirname(fromAbs), spec));
  else for (const [a, b] of ALIASES) if (spec === a || spec.startsWith(`${a}/`)) { rel = (b + spec.slice(a.length)).replace(/^\//, ''); break; }
  if (rel == null) return null;
  for (const e of EXTS) { const abs = path.join(WEB, rel + e); if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return (rel + e).replace(/\\/g, '/'); }
  return null;
}
const SKIP = /^(services\/api\/|modules\/Food\/components\/ui\/|shared\/utils\/(moduleAuth|auth|adminHome|activeModule|imageCompressor|emailValidation|apiError|apiCache)\.js|modules\/Food\/utils\/auth\.js|modules\/Taxi\/modules\/admin\/services\/adminSession\.js|shared\/components\/admin\/AdminModuleSwitcher\.jsx|shared\/constants\/brandLogo\.js|modules\/Food\/utils\/utils\.)/;
const graph = {};
function walk(rel) {
  if (graph[rel]) return;
  graph[rel] = [];
  const abs = path.join(WEB, rel);
  if (!/\.(jsx?|tsx?)$/.test(rel)) return;
  let code = fs.readFileSync(abs, 'utf8');
  let ast;
  try { ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript', 'dynamicImport'] }); } catch { return; }
  const specs = [];
  for (const n of ast.program.body) if (n.type === 'ImportDeclaration') specs.push(n.source.value);
  for (const m of code.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  for (const s of specs) {
    if (/\.(css|scss)$/.test(s)) continue;
    const r = resolve(s, abs);
    if (!r || SKIP.test(r)) continue;
    graph[rel].push(r);
    walk(r);
  }
}
process.argv.slice(2).forEach((f) => walk(f.replace(/^.*Frontend\/src\//, '')));
console.log(JSON.stringify(graph, null, 1));
