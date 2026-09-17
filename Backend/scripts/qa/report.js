/**
 * Turn the last run into the QA documents.
 *
 * Generated from scripts/qa/last-run.json so the counts in the docs are the
 * counts that actually ran — a hand-maintained checklist drifts from reality
 * the first time somebody is in a hurry.
 *
 *   node scripts/qa/run.js && node scripts/qa/report.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const docs = path.resolve(here, '../../../docs/qa');
const runPath = path.join(here, 'last-run.json');

if (!fs.existsSync(runPath)) {
  console.error('no last-run.json — run scripts/qa/run.js first');
  process.exit(2);
}

const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
fs.mkdirSync(docs, { recursive: true });

const stamp = new Date().toISOString().slice(0, 10);
const byModule = run.results.reduce((acc, r) => {
  (acc[r.module] = acc[r.module] || []).push(r);
  return acc;
}, {});

const icon = { PASS: '✅', FAIL: '❌', BLOCKED: '⏸' };

/* ---------------- checklist ---------------- */
const checklist = [
  '# Master testing checklist',
  '',
  `Generated from \`scripts/qa/last-run.json\` on ${stamp}. Do not edit by hand —`,
  'run `node scripts/qa/run.js && node scripts/qa/report.js` instead.',
  '',
  `**${run.total} cases — ${run.passed} passed, ${run.failed} failed, ${run.blocked} blocked.**`,
  '',
  '| ID | Suite | Case | Expected | Result | Status |',
  '| --- | --- | --- | --- | --- | --- |',
  ...run.results.map((r) =>
    `| ${r.id} | ${r.module} | ${r.title} | ${r.expected || '—'} | ${r.status === 'PASS' ? '—' : (r.evidence || r.actual || '—')} | ${icon[r.status]} ${r.status} |`),
  '',
  '## By suite',
  '',
  ...Object.entries(byModule).map(([name, rs]) => {
    const p = rs.filter((r) => r.status === 'PASS').length;
    const f = rs.filter((r) => r.status === 'FAIL').length;
    const b = rs.filter((r) => r.status === 'BLOCKED').length;
    return `- **${name}** — ${rs.length} cases: ${p} passed, ${f} failed, ${b} blocked`;
  }),
  '',
].join('\n');

fs.writeFileSync(path.join(docs, 'MASTER_TESTING_CHECKLIST.md'), checklist);

/* ---------------- summary ---------------- */
const summary = [
  '# QA summary',
  '',
  `Last run ${stamp}, against a development database.`,
  '',
  '| | |',
  '| --- | --- |',
  `| Cases | ${run.total} |`,
  `| Passed | ${run.passed} |`,
  `| Failed | ${run.failed} |`,
  `| Blocked | ${run.blocked} |`,
  '',
  '## Coverage by suite',
  '',
  ...Object.entries(byModule).map(([name, rs]) =>
    `- **${name}** — ${rs.length} cases (${rs.filter((r) => r.status === 'PASS').length} passing)`),
  '',
  '## Blocked',
  '',
  ...(run.results.filter((r) => r.status === 'BLOCKED').map((r) => `- \`${r.id}\` ${r.title} — ${r.evidence}`)
      .concat(run.blocked ? [] : ['- none'])),
  '',
  '## Outstanding failures',
  '',
  ...(run.failed
    ? run.results.filter((r) => r.status === 'FAIL').map((r) => `- \`${r.id}\` [${r.severity}] ${r.title} — ${r.evidence}`)
    : ['- none in the last run']),
  '',
  '## How to run',
  '',
  '```bash',
  'cd Backend',
  'node scripts/qa/run.js               # every suite',
  'node scripts/qa/run.js auth authz    # named suites',
  'node scripts/qa/report.js            # regenerate these documents',
  '```',
  '',
  'The suite needs the API running and `USE_DEFAULT_OTP=true`, which is how it',
  'provisions its two consumer identities through the real login flow. It creates',
  'bookings and uploads as it goes and releases or deletes them at the end.',
  '',
].join('\n');

fs.writeFileSync(path.join(docs, 'QA_SUMMARY.md'), summary);

console.log(`wrote ${path.relative(process.cwd(), docs)}/MASTER_TESTING_CHECKLIST.md`);
console.log(`wrote ${path.relative(process.cwd(), docs)}/QA_SUMMARY.md`);
