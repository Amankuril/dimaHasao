/**
 * Static scan for sequential-await waterfalls in request handlers.
 *
 * A handler that awaits ten independent queries one after another pays ten
 * round trips for work that costs one. That is invisible in the code — each
 * line looks cheap — and it is the difference between a 40ms endpoint and a
 * 500ms one, before the database holds any real data.
 *
 * This counts top-level awaits per exported async function and reports the
 * ones that look like a waterfall. It is a pointer, not a verdict: awaits that
 * genuinely depend on each other are fine, and only reading the function tells
 * you which is which.
 *
 * Usage: node scripts/perf/scan-waterfalls.js [--min 4]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MIN = Number(process.argv[process.argv.indexOf('--min') + 1]) || 4;
const ROOT = 'src';

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.js')) out.push(full);
  }
  return out;
};

/** Await calls that are database or network work, not trivial awaits. */
const QUERY = /await\s+[\w.]*\b(find|findOne|findById|findOneAndUpdate|findByIdAndUpdate|countDocuments|aggregate|distinct|save|create|updateOne|updateMany|deleteOne|deleteMany|insertMany|exec)\b/;

const findings = [];

for (const file of walk(ROOT)) {
  const lines = readFileSync(file, 'utf8').split('\n');

  let fn = null;
  let depth = 0;

  lines.forEach((line, i) => {
    const start = line.match(/^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(|^\s*(?:export\s+)?async\s+function\s+(\w+)/);
    if (start && depth === 0) {
      if (fn && fn.queries >= MIN) findings.push(fn);
      fn = { file, name: start[1] || start[2], line: i + 1, queries: 0, inParallel: 0 };
      depth = 0;
    }

    if (!fn) return;

    if (/Promise\.all|Promise\.allSettled/.test(line)) fn.inParallel += 1;
    if (QUERY.test(line)) fn.queries += 1;

    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    if (depth <= 0 && fn.queries) {
      if (fn.queries >= MIN) findings.push(fn);
      fn = null;
      depth = 0;
    }
  });

  if (fn && fn.queries >= MIN) findings.push(fn);
}

findings.sort((a, b) => b.queries - a.queries);

console.log(`Handlers with ${MIN}+ awaited queries, worst first:\n`);
for (const f of findings.slice(0, 30)) {
  const parallel = f.inParallel ? `${f.inParallel} Promise.all` : 'NO Promise.all';
  console.log(
    `  ${String(f.queries).padStart(3)} queries  ${parallel.padEnd(16)}  ${f.file}:${f.line}  ${f.name}`
  );
}
console.log(`\n${findings.length} handlers over the threshold.`);
console.log(`${findings.filter((f) => !f.inParallel).length} of them run every query sequentially.`);
