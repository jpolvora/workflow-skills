/**
 * test-per-task-adequacy.js — Per-task Test Adequacy review (AC1-AC7).
 *
 * Covers: adequacy record binding map (AC1), non-shallow litmus per mapped
 * test (AC2), orphan remove-or-remap rule (AC3), TDD re-entry + bound prose
 * (AC4), adequacy ledger verb + observed scoring + step-output evidence (AC5),
 * false-positive rejection without litmus (AC6), fix-mode adequacy (AC7),
 * and the four spec negative scenarios.
 *
 * Run: node test/test-per-task-adequacy.js
 */
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, fs, path, repoRoot, temp, run, write } = utils;

const HELPER = path.join(repoRoot, '.agents/skills/ws-implement-tasks/scripts/check_test_adequacy.cjs');
const LEDGER = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs');
const IMPLEMENT_SKILL = path.join(repoRoot, '.agents/skills/ws-implement-tasks/SKILL.md');
const VERIFY_SKILL = path.join(repoRoot, '.agents/skills/ws-plan-verify/SKILL.md');

const root = temp('ws-adequacy-');
process.on('exit', () => { try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ } });
write(path.join(root, '.ws/config.json'), JSON.stringify({ verification: {}, plans: { dir: '.agents/plans' } }));
write(path.join(root, 'feature.spec.md'), '## Acceptance Criteria\n- AC1: First behavior.\n- AC2: Second behavior.\n');
write(path.join(root, 'impl.js'), 'export const value = 1;\n');
write(
  path.join(root, 'feature.test.js'),
  'test("first behavior rejects wrong code", () => {});\ntest("second behavior rejects wrong code", () => {});\ntest("orphan probe with no requirement", () => {});\n',
);
write(path.join(root, 'plan.index.json'), JSON.stringify({
  acceptanceCriteria: [
    { id: 'AC1', taskIds: ['T1'], planSectionIds: ['S1'], expectedTestNames: [] },
    { id: 'AC2', taskIds: ['T1'], planSectionIds: ['S1'], expectedTestNames: [] },
  ],
}));

function helper(args) {
  return run(HELPER, [...args, '--repo-root', root]);
}

function ledger(args) {
  return run(LEDGER, [...args, '--repo-root', root]);
}

function writeRecord(name, record) {
  const file = path.join(root, name);
  write(file, `${JSON.stringify(record, null, 2)}\n`);
  return file;
}

function baseRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    taskId: 'T1',
    acs: ['AC1'],
    status: 'adequate',
    bindings: [{ ac: 'AC1', test: 'first behavior rejects wrong code', file: 'feature.test.js', lineStart: 1, lineEnd: 1 }],
    litmus: [{ test: 'first behavior rejects wrong code', kind: 'inversion-run', exitCode: 1, evidence: 'invert patch flips impl.js value; first behavior rejects wrong code fails with exit 1' }],
    addedTests: ['first behavior rejects wrong code'],
    orphansRemoved: [],
    falsePositives: [],
    checkedAt: '2026-09-30T08:00:00.000Z',
    ...overrides,
  };
}

// --- AC1: binding map -------------------------------------------------
{
  const verdict = JSON.parse(helper(['--record', writeRecord('ac1-ok.json', baseRecord())]).stdout);
  assert.strictEqual(verdict.status, 'adequate', 'AC1: full binding map validates adequate');
  const missing = helper(['--record', writeRecord('ac1-missing.json', baseRecord({ acs: ['AC1', 'AC2'] }))]);
  assert.strictEqual(missing.status, 1, 'AC1: AC without a binding exits 1');
  assert.match(missing.stdout, /AC2/, 'AC1: gap names the unmapped AC');
}

// --- AC2: non-shallow litmus -------------------------------------------
{
  const wrongCode = JSON.parse(helper(['--record', writeRecord('ac2-wrongcode.json', baseRecord({
    litmus: [{ test: 'first behavior rejects wrong code', kind: 'wrong-code-run', exitCode: 1, evidence: 'stashed fix, first behavior rejects wrong code failed with exit 1, restored' }],
  }))]).stdout);
  assert.strictEqual(wrongCode.status, 'adequate', 'AC2: documented wrong-code run is acceptable litmus');
  const noLitmus = helper(['--record', writeRecord('ac2-none.json', baseRecord({ litmus: [] }))]);
  assert.strictEqual(noLitmus.status, 1, 'AC2: mapped test without litmus exits 1');
  assert.match(noLitmus.stdout, /first behavior rejects wrong code/, 'AC2: gap names the surviving test');
}

// --- AC3: orphan rule ---------------------------------------------------
{
  const orphan = helper(['--record', writeRecord('ac3-orphan.json', baseRecord({
    addedTests: ['first behavior rejects wrong code', 'orphan probe with no requirement'],
  }))]);
  assert.strictEqual(orphan.status, 1, 'AC3: unmapped added test exits 1');
  assert.match(orphan.stdout, /orphan probe with no requirement/, 'AC3: gap names the orphan');
  const removed = JSON.parse(helper(['--record', writeRecord('ac3-removed.json', baseRecord({
    addedTests: ['first behavior rejects wrong code', 'orphan probe with no requirement'],
    orphansRemoved: [{ test: 'orphan probe with no requirement', action: 'removed' }],
  }))]).stdout);
  assert.strictEqual(removed.status, 'adequate', 'AC3: removed orphan validates adequate');
  const remapped = JSON.parse(helper(['--record', writeRecord('ac3-remapped.json', baseRecord({
    addedTests: ['first behavior rejects wrong code', 'orphan probe with no requirement'],
    orphansRemoved: [{ test: 'orphan probe with no requirement', action: 'remapped', target: 'NS1' }],
  }))]).stdout);
  assert.strictEqual(remapped.status, 'adequate', 'AC3: remapped orphan validates adequate');
}

// --- AC6 + NS1: false-positive rejection --------------------------------
{
  const fp = helper(['--record', writeRecord('ac6-fp.json', baseRecord({
    litmus: [],
    falsePositives: [{ test: 'first behavior rejects wrong code', observedOn: 'unmodified-code' }],
  }))]);
  assert.strictEqual(fp.status, 1, 'AC6: pass-on-unmodified-code exits 1 with zero litmus entries');
  assert.match(fp.stdout, /first behavior rejects wrong code/, 'AC6: gap names the false-positive test');
}

// --- NS4: missing evidence fails handoff validation ---------------------
{
  const empty = helper(['--record', writeRecord('ns4-empty.json', baseRecord({ bindings: [], litmus: [], addedTests: [] }))]);
  assert.strictEqual(empty.status, 1, 'NS4: empty bindings/litmus exits 1');
}

// --- Helper CLI contract -------------------------------------------------
{
  assert.strictEqual(helper([]).status, 2, 'helper without --record exits 2');
  assert.notStrictEqual(helper(['--record', 'nope.json', '--bogus', 'x']).status, 0, 'unknown flag fails');
  const help = helper(['--help']);
  assert.strictEqual(help.status, 0, '--help exits 0');
  assert.match(help.stdout, /--record/, '--help documents --record');
  const out = path.join(root, 'emitted.json');
  assert.strictEqual(helper(['--record', writeRecord('emit-in.json', baseRecord()), '--emit-record', out]).status, 0);
  assert.ok(fs.existsSync(out), '--emit-record writes the canonical record');
  assert.strictEqual(JSON.parse(fs.readFileSync(out, 'utf8')).status, 'adequate');
}

// --- AC7: fix-mode record -------------------------------------------------
{
  const fix = JSON.parse(helper(['--record', writeRecord('ac7-fix.json', baseRecord({ taskId: 'CR-001' }))]).stdout);
  assert.strictEqual(fix.status, 'adequate', 'AC7: finding-derived task record validates');
}

// --- AC5: ledger verb + observed scoring ----------------------------------
{
  assert.strictEqual(ledger(['init', '--spec', 'feature.spec.md', '--plan-index', 'plan.index.json', '--output', 'ac-ledger.json', '--workflow-id', 'wf', '--slug', 'feature']).status, 0);
  for (const [id, name] of [['AC1', 'first behavior rejects wrong code'], ['AC2', 'second behavior rejects wrong code']]) {
    const linked = ledger([
      'link', '--ledger', 'ac-ledger.json', '--event-id', `link-${id}`, '--ac', id,
      '--status', 'Implemented', '--file', 'impl.js:L1-L1',
      '--test', JSON.stringify({ name, sourceFile: 'feature.test.js', phase: 'observed', alias: null, exitCode: 0 }),
    ]);
    assert.strictEqual(linked.status, 0, linked.stderr);
  }
  const before = JSON.parse(ledger(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
  assert.strictEqual(before.score, 10, 'AC5: clean ledger scores 10 without adequacy rows');

  const recordFile = writeRecord('ledger-adequate.json', baseRecord());
  const attached = ledger(['link', '--ledger', 'ac-ledger.json', '--event-id', 'adequacy-ac1', '--ac', 'AC1', '--adequacy-file', recordFile]);
  assert.strictEqual(attached.status, 0, attached.stderr);
  const withAdequacy = JSON.parse(fs.readFileSync(path.join(root, 'ac-ledger.json'), 'utf8'));
  assert.strictEqual(withAdequacy.acceptanceCriteria.find((row) => row.id === 'AC1').adequacy.status, 'adequate', 'AC5: link attaches row.adequacy');
  const rescored = JSON.parse(ledger(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
  assert.strictEqual(rescored.score, before.score, 'AC5: adequate adequacy leaves the score unchanged');
  assert.deepStrictEqual(rescored.deficiencies, before.deficiencies, 'AC5: no new deficiencies without inadequacy');

  const badFile = writeRecord('ledger-inadequate.json', baseRecord({ taskId: 'T1', acs: ['AC2'], status: 'inadequate' }));
  assert.strictEqual(ledger(['link', '--ledger', 'ac-ledger.json', '--event-id', 'adequacy-ac2', '--ac', 'AC2', '--adequacy-file', badFile]).status, 0);
  const capped = JSON.parse(ledger(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
  assert.ok(capped.knownDefect, 'AC5: inadequate adequacy sets knownDefect');
  assert.ok(capped.score <= 8, 'AC5: inadequate adequacy caps the score');
  assert.ok(capped.deficiencies.some((d) => d.includes('AC2')), 'AC5: deficiency names the inadequate AC');

  const snapshot = fs.readFileSync(path.join(root, 'ac-ledger.json'));
  const malformed = writeRecord('ledger-malformed.json', { schemaVersion: 1, taskId: 'T1' });
  assert.notStrictEqual(ledger(['link', '--ledger', 'ac-ledger.json', '--event-id', 'adequacy-bad', '--ac', 'AC1', '--adequacy-file', malformed]).status, 0, 'AC5: malformed record fails');
  assert.ok(fs.readFileSync(path.join(root, 'ac-ledger.json')).equals(snapshot), 'AC5: failed link leaves the ledger unchanged');

  const multiRecord = writeRecord('ledger-multi.json', baseRecord({
    acs: ['AC1', 'AC2'],
    bindings: [
      { ac: 'AC1', test: 'first behavior rejects wrong code', file: 'feature.test.js', lineStart: 1, lineEnd: 1 },
      { ac: 'AC2', test: 'second behavior rejects wrong code', file: 'feature.test.js', lineStart: 2, lineEnd: 2 },
    ],
    litmus: [
      { test: 'first behavior rejects wrong code', kind: 'inversion-run', exitCode: 1, evidence: 'first behavior rejects wrong code fails inverted with exit 1' },
      { test: 'second behavior rejects wrong code', kind: 'wrong-code-run', exitCode: 1, evidence: 'second behavior rejects wrong code fails wrong-code with exit 1' },
    ],
    addedTests: ['first behavior rejects wrong code', 'second behavior rejects wrong code'],
  }));
  const multi = ledger(['link', '--ledger', 'ac-ledger.json', '--event-id', 'adequacy-multi', '--ac', 'AC1', '--ac', 'AC2', '--adequacy-file', multiRecord]);
  assert.strictEqual(multi.status, 0, multi.stderr);
  const multiRows = JSON.parse(fs.readFileSync(path.join(root, 'ac-ledger.json'), 'utf8')).acceptanceCriteria;
  assert.ok(multiRows.every((row) => row.adequacy && row.adequacy.status === 'adequate'), 'AC5: one record attaches to every --ac target');
  const uncovered = ledger(['link', '--ledger', 'ac-ledger.json', '--event-id', 'adequacy-uncovered', '--ac', 'AC2', '--adequacy-file', recordFile]);
  assert.notStrictEqual(uncovered.status, 0, 'AC5: record not covering the target AC fails closed');

  const linkHelp = ledger(['link', '--help']);
  assert.match(linkHelp.stdout, /--adequacy-file/, 'AC5: link help documents the verb');
}

// --- Recipe prose (AC1-AC7) -----------------------------------------------
const implement = fs.readFileSync(IMPLEMENT_SKILL, 'utf8');
assert.match(implement, /Test Adequacy review/, 'AC1: recipe names the review step');
assert.match(implement, /file:line/, 'AC1: recipe requires file:line bindings');
assert.match(implement, /inversion/, 'AC2: recipe names inversion litmus');
assert.match(implement, /wrong-code run/, 'AC2: recipe names wrong-code runs');
assert.match(implement, /run_sabotage\.cjs/, 'AC2: recipe reuses the sabotage helper');
assert.match(implement, /remove or remap|remap.+remove|orphan/i, 'AC3: recipe carries the orphan rule');
assert.match(implement, /re-enter.+TDD|TDD cycle/i, 'AC4: recipe requires TDD re-entry');
assert.match(implement, /adequacy:/, 'AC5: step-output carries the adequacy block');
assert.match(implement, /--adequacy-file/, 'AC5: recipe links records via the ledger verb');
assert.match(implement, /unmodified code/, 'AC6: recipe rejects pass-on-unmodified-code');
assert.match(implement, /check_test_adequacy\.cjs/, 'recipe invokes the adequacy helper');
assert.match(implement, /Anti-regression test[\s\S]{0,800}adequacy/i, 'AC7: fix mode reviews anti-regression tests');

// Locked phrases from sibling suites must survive the recipe edit.
for (const phrase of ['failing tests first', 'false-positive', '--negative', 'Lite orch', 'backendFormat', 'backendBuild', 'backendTest', 'frontendTest', 'format only files this step created or modified', 'stack-invariant-scan: pass | fail', 'Do not drop ACs', 'state.handoffs', 'Visual References']) {
  assert.ok(implement.includes(phrase), `locked phrase survives: ${phrase}`);
}
assert.doesNotMatch(implement, /Step 5 fail-closes/, 'locked absence survives');

// --- Verify consumer note (AC5) --------------------------------------------
const verify = fs.readFileSync(VERIFY_SKILL, 'utf8');
assert.match(verify, /adequacy/i, 'AC5: verify documents observed adequacy');
for (const phrase of ['negative test', 'negativeScenarios', 'skipReason: baseline-dirty', 'failing paths are enumerated']) {
  assert.ok(verify.includes(phrase), `verify locked phrase survives: ${phrase}`);
}

// --- Fix round 1 anti-regression (CR-001..CR-003) ------------------------------
{
  assert.strictEqual(ledger(['init', '--spec', 'feature.spec.md', '--plan-index', 'plan.index.json', '--output', 'ac-ledger-cr001.json', '--workflow-id', 'wf-fix', '--slug', 'feature']).status, 0);
  const recA = writeRecord('cr001-a.json', baseRecord({ taskId: 'T-A' }));
  const recB = writeRecord('cr001-b.json', baseRecord({ taskId: 'T-B' }));
  assert.strictEqual(ledger(['link', '--ledger', 'ac-ledger-cr001.json', '--event-id', 'fix-a', '--ac', 'AC1', '--adequacy-file', recA]).status, 0);
  assert.strictEqual(ledger(['link', '--ledger', 'ac-ledger-cr001.json', '--event-id', 'fix-b', '--ac', 'AC1', '--adequacy-file', recB]).status, 0);
  const row = JSON.parse(fs.readFileSync(path.join(root, 'ac-ledger-cr001.json'), 'utf8')).acceptanceCriteria.find((r) => r.id === 'AC1');
  assert.strictEqual(row.adequacyHistory.length, 2, 'CR-001: multi-task links append history');
  assert.strictEqual(row.adequacy.taskId, 'T-B', 'CR-001: latest record governs the row');
  assert.deepStrictEqual(row.adequacyHistory.map((e) => e.taskId), ['T-A', 'T-B'], 'CR-001: history preserves every task');
}
{
  const outside = helper(['--record', writeRecord('cr002-outside.json', baseRecord({
    bindings: [{ ac: 'AC1', test: 'first behavior rejects wrong code', file: 'feature.test.js', lineStart: 2, lineEnd: 2 }],
  }))]);
  assert.strictEqual(outside.status, 1, 'CR-002: out-of-range binding exits 1');
  assert.match(outside.stdout, /outside declared range/, 'CR-002: gap names the false range');
  const absent = helper(['--record', writeRecord('cr002-absent.json', baseRecord({
    bindings: [{ ac: 'AC1', test: 'no such test anywhere', file: 'feature.test.js', lineStart: 1, lineEnd: 1 }],
    litmus: [],
  }))]);
  assert.strictEqual(absent.status, 1, 'CR-002: absent name still exits 1');
  assert.match(absent.stdout, /not present/, 'CR-002: absent name keeps its message');
}
assert.match(implement, /Derive `addedTests` from the task diff/, 'CR-003: recipe derives addedTests from the diff');

// --- Fix-PR round 1 anti-regression (review threads T1-T2) --------------------
{
  const snapshot = fs.readFileSync(path.join(root, 'ac-ledger.json'));
  const lying = writeRecord('t1-lying.json', baseRecord({ litmus: [] }));
  const lied = ledger(['link', '--ledger', 'ac-ledger.json', '--event-id', 'fixpr-lying', '--ac', 'AC1', '--adequacy-file', lying]);
  assert.notStrictEqual(lied.status, 0, 'T1: adequate-claimed but helper-inadequate record fails');
  assert.match(`${lied.stdout}${lied.stderr}`, /status mismatch/, 'T1: failure names the status mismatch');
  assert.ok(fs.readFileSync(path.join(root, 'ac-ledger.json')).equals(snapshot), 'T1: rejected link leaves the ledger unchanged');
  const modest = writeRecord('t1-modest.json', baseRecord({ status: 'inadequate' }));
  const moaned = ledger(['link', '--ledger', 'ac-ledger.json', '--event-id', 'fixpr-modest', '--ac', 'AC1', '--adequacy-file', modest]);
  assert.notStrictEqual(moaned.status, 0, 'T1: inadequate-claimed but helper-adequate record fails');
}
{
  const outside = path.resolve(root, '..', 'fixpr-evil.json');
  const refused = helper(['--record', writeRecord('t2-in.json', baseRecord()), '--emit-record', outside]);
  assert.strictEqual(refused.status, 2, 'T2: emit outside the repository exits 2');
  assert.match(`${refused.stdout}${refused.stderr}`, /outside the repository/, 'T2: refusal names the cause');
  assert.ok(!fs.existsSync(outside), 'T2: refused emit writes nothing');
}

console.log('test-per-task-adequacy: ok');
