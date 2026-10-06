/*
 * Prints what is needed to write a screen from a generated hook: the web page's render (compact, from the
 * line where its JSX starts) and the names the hook returns.
 *
 * usage: node tools/page.js <PageName> [maxWidth]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const name = process.argv[2];
const width = Number(process.argv[3] || 210);
const jobs = JSON.parse(fs.readFileSync(path.join(__dirname, 'hook-jobs.json'), 'utf8'));
const job = jobs.find((j) => j.component === name || j.hook === `use${name}`);
if (!job) throw new Error(`no hook job for ${name}`);

const web = fs.readFileSync(path.join(root, '../Frontend/src', job.from), 'utf8').replace(/\r\n/g, '\n').split('\n');
const startRe = new RegExp(`^(export default )?(function ${job.component}\\b|const ${job.component} = )`);
const start = web.findIndex((l) => startRe.test(l));
// the render: the last top-level `  return (` (or an early `  if (...) {` guard just before it) inside the component
let end = web.length;
for (let i = start + 1; i < web.length; i += 1) {
  if (/^}/.test(web[i])) {
    end = i + 1;
    break;
  }
}
let render = -1;
for (let i = start; i < end; i += 1) if (/^  return \($/.test(web[i]) || /^  return <[A-Za-z]/.test(web[i])) render = i;
for (let i = start; i < render; i += 1) {
  if (/^  if \(.*\) \{?$/.test(web[i]) && /^\s+return \($/.test(web[i + 1] || '') ) {
    render = i;
    break;
  }
  if (/^  if \(.*\)\s*return \(/.test(web[i])) {
    render = i;
    break;
  }
}
const out = execFileSync('node', [path.join(__dirname, 'slim.js'), job.from, String(render + 1), String(end)], { encoding: 'utf8', maxBuffer: 1 << 26 });
console.log(out.split('\n').map((l) => l.slice(0, width)).join('\n'));

const hook = fs.readFileSync(path.join(root, 'src', job.to), 'utf8');
const at = hook.lastIndexOf('\n  return {\n');
const names = hook.slice(at).replace(/\s+/g, ' ').replace(/^ return \{ /, '').replace(/,? \} \}\s*$/, '');
const sig = (hook.match(/^export function .*$/m) || [''])[0];
console.log(`\nHOOK ${sig}\nRETURNS ${names}`);
