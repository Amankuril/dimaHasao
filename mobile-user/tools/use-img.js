// Swap react-native's Image for components/Img in the given folders (single-line imports).
const fs = require('fs');
const path = require('path');
const src = require('path').resolve(__dirname, '../src').replace(/\\/g, '/');
const roots = process.argv.slice(2);
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
let changed = 0;
for (const root of roots) {
  for (const file of walk(path.join(src, root)).filter((f) => f.endsWith('.jsx'))) {
    let text = fs.readFileSync(file, 'utf8');
    const m = text.match(/^import \{([^}]*)\} from 'react-native';$/m);
    if (!m) continue;
    const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    if (!names.includes('Image') || /components\/Img'/.test(text)) continue;
    const rest = names.filter((n) => n !== 'Image');
    let rel = path.relative(path.dirname(file), path.join(src, 'components/Img')).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    const rn = rest.length ? `import { ${rest.join(', ')} } from 'react-native';\n` : '';
    text = text.replace(m[0] + '\n', `${rn}import Image from '${rel}';\n`);
    fs.writeFileSync(file, text, 'utf8');
    changed += 1;
    console.log('updated', path.relative(src, file));
  }
}
console.log('files changed:', changed);
