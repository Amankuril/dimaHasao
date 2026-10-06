/*
 * Registers a built screen: writes the Expo Router file under src/app/taxi/driver
 * and marks the route's row in CONVERSION_CHECKLIST.md as "Built, not tested".
 *
 * usage: node tools/add-route.js <route> <ScreenFile> [<route> <ScreenFile> ...]
 *   route:      the web sub-path, e.g. "status" or "outlet-timings/:day"
 *   ScreenFile: path under src/driver/screens without extension, e.g. "DriverHome"
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'src/app/taxi/driver');
const checklistPath = path.join(root, 'CONVERSION_CHECKLIST.md');
let checklist = fs.readFileSync(checklistPath, 'utf8');

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const route = args[i];
  // "File" for a default export, "File:Name" for a named one
  const [screen, exportName] = args[i + 1].split(':');
  // ":id" -> "[id]"; a route with children keeps its own file as index
  const segments = route.split('/').map((s) => (s.startsWith(':') ? `[${s.slice(1)}]` : s));
  const file = path.join(appDir, ...segments) + '.jsx';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const screenAbs = path.join(root, 'src/driver/screens', screen);
  let rel = path.relative(path.dirname(file), screenAbs).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  const name = exportName || path.basename(screen);
  fs.writeFileSync(file, exportName ? `export { ${name} as default } from '${rel}';\n` : `import ${name} from '${rel}';\n\nexport default ${name};\n`);

  const native = `\`app/taxi/driver/${segments.join('/')}.jsx\` → \`driver/screens/${screen}.jsx\`${exportName ? ` (${exportName})` : ''}`;
  const lines = checklist.split('\n');
  const idx = lines.findIndex((l) => l.startsWith(`| \`${route}\` |`));
  if (idx < 0) {
    console.log(`route file written; NO CHECKLIST ROW for ${route}`);
    continue;
  }
  const cells = lines[idx].split('|');
  cells[cells.length - 3] = ` ${native} `;
  cells[cells.length - 2] = ' Built, not tested ';
  lines[idx] = cells.join('|');
  checklist = lines.join('\n');
  console.log(`${route} -> ${screen}`);
}
fs.writeFileSync(checklistPath, checklist);
