/**
 * Platform QA suite.
 *
 *   node scripts/qa/run.js            run everything
 *   node scripts/qa/run.js auth injection   run named suites
 *
 * Read-only by default. Suites that create records clean up after themselves
 * and say so; nothing here deletes data it did not create.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get } from './lib/http.js';
import { printSummary } from './lib/runner.js';
import { provision, adminSession } from './lib/identities.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const SUITES = ['auth', 'authz', 'injection', 'validation', 'business', 'uploads'];

const main = async () => {
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const chosen = wanted.length ? wanted : SUITES;

  const health = await get('/health');
  if (health.status !== 200) {
    console.error(`server not reachable at ${process.env.QA_BASE_URL || 'http://localhost:5000/api/v1'} — start it first`);
    process.exit(2);
  }

  console.log('provisioning test identities…');
  const identities = await provision();
  const admin = await adminSession();
  for (const [label, who] of [['primary', identities.primary], ['secondary', identities.secondary], ['admin', admin]]) {
    console.log(`  ${label.padEnd(10)} ${who.error ? `BLOCKED — ${who.error}` : 'ready'}`);
  }
  console.log('');

  const context = { ...identities, admin };

  for (const name of chosen) {
    const file = path.join(here, 'suites', `${name}.js`);
    if (!fs.existsSync(file)) { console.log(`(no suite named ${name})`); continue; }
    console.log(`\n── ${name} ${'─'.repeat(Math.max(0, 66 - name.length))}`);
    const suite = await import(file);
    await suite.run(context);
  }

  const s = printSummary();
  fs.writeFileSync(path.join(here, 'last-run.json'), JSON.stringify(s, null, 2));
  console.log(`\nresults written to scripts/qa/last-run.json`);
  process.exit(s.failed > 0 ? 1 : 0);
};

main().catch((error) => { console.error(error); process.exit(2); });
