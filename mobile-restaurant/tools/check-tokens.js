// Lists `tw.<token>` colours used under src/ that the theme does not define (they would render as undefined).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const theme = fs.readFileSync(path.join(root, 'src/theme/index.js'), 'utf8');
const defined = new Set([...theme.matchAll(/([A-Za-z][A-Za-z0-9]*)\s*:\s*['"`]/g)].map((m) => m[1]));
const used = new Map();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.jsx?$/.test(e.name)) for (const m of fs.readFileSync(p, 'utf8').matchAll(/\btw\.([A-Za-z0-9]+)/g)) used.set(m[1], path.relative(root, p));
  }
})(path.join(root, 'src'));
const missing = [...used.keys()].filter((k) => !defined.has(k)).sort();
console.log(missing.length ? `missing tokens: ${missing.join(' ')}` : 'all tw tokens are defined');
