/**
 * The QA suite's recorder.
 *
 * Every case carries an id, a severity and the evidence behind its verdict, so
 * the written report is generated from what actually ran rather than restated
 * by hand. A case that cannot run is BLOCKED with a reason — never silently
 * counted as a pass.
 */
const results = [];

export const SEVERITY = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', INFO: 'Info' };

let currentModule = 'general';
export const module_ = (name) => { currentModule = name; };

const record = (entry) => {
  results.push({ module: currentModule, ...entry });
  const mark = { PASS: '  ok  ', FAIL: ' FAIL ', BLOCKED: ' blkd ' }[entry.status];
  const tail = entry.status === 'PASS' ? '' : `  <- ${entry.evidence}`;
  console.log(`${mark} ${entry.id.padEnd(18)} ${entry.title}${tail}`);
  return entry;
};

/**
 * Assert a condition. `expected` describes the rule being checked so a failure
 * reads as a requirement, not just a mismatched number.
 */
export const check = (id, title, passed, { expected, actual, severity = SEVERITY.MEDIUM }) =>
  record({
    id,
    title,
    status: passed ? 'PASS' : 'FAIL',
    expected,
    actual,
    severity: passed ? SEVERITY.INFO : severity,
    evidence: passed ? '' : `expected ${expected}, got ${actual}`,
  });

export const blocked = (id, title, reason) =>
  record({ id, title, status: 'BLOCKED', expected: '', actual: '', severity: SEVERITY.INFO, evidence: reason });

export const summary = () => {
  const by = (s) => results.filter((r) => r.status === s);
  const failures = by('FAIL');
  const bySeverity = (sev) => failures.filter((f) => f.severity === sev).length;
  return {
    total: results.length,
    passed: by('PASS').length,
    failed: failures.length,
    blocked: by('BLOCKED').length,
    critical: bySeverity(SEVERITY.CRITICAL),
    high: bySeverity(SEVERITY.HIGH),
    medium: bySeverity(SEVERITY.MEDIUM),
    low: bySeverity(SEVERITY.LOW),
    results,
  };
};

export const printSummary = () => {
  const s = summary();
  console.log('\n' + '='.repeat(72));
  console.log(`  ${s.total} cases   ${s.passed} passed   ${s.failed} failed   ${s.blocked} blocked`);
  if (s.failed) {
    console.log(`  severity: ${s.critical} critical, ${s.high} high, ${s.medium} medium, ${s.low} low`);
    console.log('\n  failures:');
    for (const f of s.results.filter((r) => r.status === 'FAIL')) {
      console.log(`    [${f.severity}] ${f.id} ${f.title}`);
      console.log(`        ${f.evidence}`);
    }
  }
  console.log('='.repeat(72));
  return s;
};
