/*
 * Prints a web source file with everything that cannot affect the phone
 * layout removed, so a large page is quicker to read while porting:
 * blank lines, comment-only lines, debug logging, and the Tailwind variants
 * that never apply at 360-412 px in light mode (dark:, hover:, group-hover:,
 * focus-visible:, sm:, md:, lg:, xl:, 2xl:).
 *
 * usage: node tools/slim.js <path relative to Frontend/src> [fromLine] [toLine]
 */
const fs = require('fs');
const path = require('path');
const web = path.resolve(__dirname, '../../Frontend/src');
const [rel, from = '1', to = '999999'] = process.argv.slice(2);
const lines = fs.readFileSync(path.join(web, rel), 'utf8').replace(/\r\n/g, '\n').split('\n');
const VARIANT = /(?:^|(?<=[\s"'`]))(?:dark|hover|group-hover|peer-hover|focus-visible|focus|sm|md|lg|xl|2xl|motion-safe|motion-reduce|print)(?::[a-z-]+)*:[^\s"'`}]+/g;
const out = [];
for (let i = Number(from) - 1; i < Math.min(lines.length, Number(to)); i += 1) {
  let line = lines[i];
  const trimmed = line.trim();
  if (!trimmed) continue;
  if (/^(\/\/|\*|\/\*)/.test(trimmed) && !/\*\/\s*\S/.test(trimmed)) continue;
  if (/^\{\/\*.*\*\/\}$/.test(trimmed) && trimmed.length < 90) {
    out.push(`${i + 1}: ${trimmed}`);
    continue;
  }
  if (/^debug(Log|Warn|Error)\(/.test(trimmed) && /\);?$/.test(trimmed)) continue;
  line = line.replace(VARIANT, '').replace(/[ \t]{2,}(?=\S)/g, (m, off) => (off === line.search(/\S/) ? m : ' '));
  line = line.replace(/\s+"/g, (m) => (m.includes('\n') ? m : m.replace(/\s+/, ' '))).replace(/ +"/g, '"').replace(/=" /g, '="');
  out.push(`${i + 1}: ${line.replace(/^\s+/, (s) => ' '.repeat(Math.min(Math.floor(s.length / 2), 12)))}`);
}
process.stdout.write(`${out.join('\n')}\n`);
