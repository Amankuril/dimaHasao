/*
 * Lists relative imports under src/ that point at a file that does not exist.
 * Metro stops at the first one; this prints them all.
 *
 * usage: node tools/check-imports.js
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const exts = ['', '.js', '.jsx', '.json', '/index.js', '/index.jsx'];
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e.name)) out.push(p);
  }
  return out;
};
const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();
const missing = {};
for (const file of walk(path.join(root, 'src'))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/(?:from\s+|require\(\s*|import\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const target = path.resolve(path.dirname(file), m[1]);
    if (exts.some((e) => isFile(target + e))) continue;
    const key = path.relative(root, target).replace(/\\/g, '/');
    (missing[key] = missing[key] || []).push(path.relative(path.join(root, 'src'), file).replace(/\\/g, '/'));
  }
}
for (const [k, v] of Object.entries(missing)) console.log(`${k}  <-  ${v.slice(0, 3).join(', ')}${v.length > 3 ? ` (+${v.length - 3})` : ''}`);
console.log(`missing targets: ${Object.keys(missing).length}`);
process.exitCode = Object.keys(missing).length ? 1 : 0;
