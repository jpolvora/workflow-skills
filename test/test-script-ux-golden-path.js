import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, path, repoRoot, temp, run, write } = utils;
const ledgerScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs');
const update = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const validate = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/validate_state.cjs');
const { ledgerContentHash } = require(ledgerScript);

function makeRoot(prefix) {
  const root = temp(prefix);
  fs.mkdirSync(path.join(root, '.agents/skills/ws-shared/runtime'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
    path.join(root, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
  );
  write(path.join(root, '.ws/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  return root;
}

function seedState(root, stateRel, { currentStep = 0, completed = [], skipped = [] } = {}) {
  const skippedYaml = skipped.length
    ? `[${skipped.map((item) => `{step: ${item.step}, reason: ${item.reason}}`).join(', ')}]`
    : '[]';
  write(path.join(root, stateRel), [
    '---',
    'stateVersion: 3',
    'revision: 0',
    'workflowId: wf',
    'slug: demo',
    'workflowType: standard',
    'status: active',
    `currentStep: ${currentStep}`,
    `completedSteps: [${completed.join(', ')}]`,
    `skippedSteps: ${skippedYaml}`,
    'workflowManifest: {"created":[],"modified":[],"deleted":[]}',
    'acTotal: 1',
    'acImplemented: 0',
    '---',
    '# State',
    '',
  ].join('\n'));
}

// AC1: every ac_ledger subcommand documents flags with an example.
{
  const root = makeRoot('ws-script-ux-help-');
  const invoke = (args) => run(ledgerScript, [...args, '--repo-root', root]);
  const cases = {
    init: ['--spec', '--output', '--plan-index'],
    link: ['--ledger', '--event-id', '--ac', '--commit', '--score-boundary'],
    'sync-plan-index': ['--ledger', '--plan-index'],
    verify: ['--ledger', '--boundary'],
    score: ['--ledger', '--boundary'],
    report: ['--ledger', '--output'],
  };
  for (const [sub, flags] of Object.entries(cases)) {
    const result = invoke([sub, '--help']);
    assert.strictEqual(result.status, 0, `${sub} --help exits 0`);
    for (const flag of flags) assert.match(result.stdout, new RegExp(flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${sub} --help documents ${flag}`);
    assert.match(result.stdout, /Example:/, `${sub} --help shows an example`);
  }
  const bare = invoke(['--help']);
  assert.match(bare.stdout, /Usage: ac_ledger\.cjs init\|link\|sync-plan-index\|verify\|score\|report/, 'bare --help keeps the generic usage line');
}

// AC2: every update_state subcommand documents flags with an example.
{
  const root = makeRoot('ws-script-ux-update-help-');
  const invoke = (args) => run(update, [...args, '--repo-root', root]);
  const cases = {
    dispatch: ['--step', 'dispatch <state>'],
    finish: ['--modified', '--created', '--deleted', '--noop'],
    'finish-batch': ['--steps'],
    bypass: ['--gate', '--reason'],
  };
  for (const [sub, flags] of Object.entries(cases)) {
    const result = invoke([sub, '--help']);
    assert.strictEqual(result.status, 0, `${sub} --help exits 0`);
    for (const flag of flags) assert.ok(result.stdout.includes(flag), `${sub} --help documents ${flag}`);
    assert.match(result.stdout, /Example:/, `${sub} --help shows an example`);
  }
}

// AC3: help states the persist-vs-dry-run contract and link evidence flags.
{
  const root = makeRoot('ws-script-ux-semantics-');
  const scoreHelp = run(ledgerScript, ['score', '--help', '--repo-root', root]).stdout;
  assert.match(scoreHelp, /PERSIST/i, 'score help states it persists scoreState');
  const verifyHelp = run(ledgerScript, ['verify', '--help', '--repo-root', root]).stdout;
  assert.match(verifyHelp, /dry run/i, 'verify help states it is a dry run');
  const linkHelp = run(ledgerScript, ['link', '--help', '--repo-root', root]).stdout;
  assert.match(linkHelp, /--event-id/, 'link help documents evidence-linking flags');

  write(path.join(root, 'solo.spec.md'), '## Acceptance Criteria\n- AC1: Solo behavior.\n');
  const init = run(ledgerScript, ['init', '--spec', 'solo.spec.md', '--output', 'ac-ledger.json', '--workflow-id', 'wf', '--slug', 'solo', '--repo-root', root]);
  assert.strictEqual(init.status, 0, init.stderr);
  const dry = run(ledgerScript, ['verify', '--ledger', 'ac-ledger.json', '--repo-root', root]);
  assert.strictEqual(dry.status, 0, dry.stderr);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(root, 'ac-ledger.json'), 'utf8')).scoreState, null, 'verify leaves scoreState unpersisted');
  const scored = run(ledgerScript, ['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5', '--repo-root', root]);
  assert.strictEqual(scored.status, 0, scored.stderr);
  const persisted = JSON.parse(fs.readFileSync(path.join(root, 'ac-ledger.json'), 'utf8')).scoreState;
  assert.strictEqual(persisted.boundary, 'step5', 'score persists the requested boundary');
  assert.strictEqual(persisted.writer, 'ac_ledger.cjs score', 'score stamps the writer');
  assert.ok(persisted.ledgerHash, 'score stamps the ledger content hash');
}

// AC4: score output lists per-row deficiencies, not just aggregates.
{
  const root = makeRoot('ws-script-ux-deficiencies-');
  write(path.join(root, 'thin.spec.md'), '## Acceptance Criteria\n- AC1: Thin behavior.\n');
  const invoke = (args) => run(ledgerScript, [...args, '--repo-root', root]);
  assert.strictEqual(invoke(['init', '--spec', 'thin.spec.md', '--output', 'ac-ledger.json', '--workflow-id', 'wf', '--slug', 'thin']).status, 0);
  const result = JSON.parse(invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
  assert.ok(Array.isArray(result.deficiencies) && result.deficiencies.length > 0, 'score exposes deficiencies[]');
  assert.ok(result.deficiencies.some((item) => item.includes('AC1') && item.includes('no linked files')), 'deficiencies name the row and missing files');
  assert.ok(result.deficiencies.some((item) => item.includes('AC1') && item.includes('no mapped tests')), 'deficiencies name unmapped tests');
  assert.ok(result.deficiencies.some((item) => item.includes('AC1') && item.includes('no tasks or planSections')), 'deficiencies name missing tasks/planSections');
}

// AC5 + NEG2: boundary mismatch names the expected label and the repair command.
{
  const root = makeRoot('ws-script-ux-boundary-');
  write(path.join(root, 'b.spec.md'), '## Acceptance Criteria\n- AC1: Boundary behavior.\n');
  const invoke = (args) => run(ledgerScript, [...args, '--repo-root', root]);
  assert.strictEqual(invoke(['init', '--spec', 'b.spec.md', '--output', '.agents/plans/demo/ac-ledger.json', '--workflow-id', 'wf', '--slug', 'demo']).status, 0);
  assert.strictEqual(invoke(['score', '--ledger', '.agents/plans/demo/ac-ledger.json', '--boundary', 'step5']).status, 0);
  seedState(root, '.agents/plans/demo/wf.state.md', { currentStep: 5, completed: [5] });
  const checked = run(validate, ['.agents/plans/demo/wf.state.md', '--pre-advance', '6', '--repo-root', root]);
  assert.notStrictEqual(checked.status, 0, 'step5-persisted ledger fails pre-advance 6');
  const output = `${checked.stdout}${checked.stderr}`;
  assert.match(output, /expected boundary "pre-step6"/, 'error names the expected boundary label');
  assert.match(output, /boundary "step5" instead of "pre-step6"/, 'error names the differing field');
  assert.match(output, /ac_ledger\.cjs score --ledger .* --boundary pre-step6/, 'error names the repair command');
}

// AC9 + NEG3: hand-editing scoreState.boundary fails closed naming the command;
// hand-editing ledger content trips the tamper hash.
{
  const root = makeRoot('ws-script-ux-tamper-');
  write(path.join(root, 'impl.js'), 'export const value = 1;\n');
  write(path.join(root, 'impl.test.js'), 'test("full behavior", () => {});\n');
  write(path.join(root, 't.spec.md'), '## Acceptance Criteria\n- AC1: Full behavior.\n');
  write(path.join(root, 'plan.index.json'), JSON.stringify({
    acceptanceCriteria: [{ id: 'AC1', taskIds: ['T1'], planSectionIds: ['S1'], expectedTestNames: ['full behavior'] }],
  }));
  const invoke = (args) => run(ledgerScript, [...args, '--repo-root', root]);
  assert.strictEqual(invoke(['init', '--spec', 't.spec.md', '--plan-index', 'plan.index.json', '--output', '.agents/plans/demo/ac-ledger.json', '--workflow-id', 'wf', '--slug', 'demo']).status, 0);
  assert.strictEqual(invoke([
    'link', '--ledger', '.agents/plans/demo/ac-ledger.json', '--event-id', 'ev-ac1', '--ac', 'AC1',
    '--status', 'Implemented', '--file', 'impl.js:L1-L1',
    '--test', 'name=full behavior,sourceFile=impl.test.js,phase=observed,exitCode=0',
    '--commit', 'sha=abcdef1,step=5',
  ]).status, 0);
  assert.strictEqual(invoke(['score', '--ledger', '.agents/plans/demo/ac-ledger.json', '--boundary', 'pre-step6']).status, 0);
  const ledgerFile = path.join(root, '.agents/plans/demo/ac-ledger.json');
  const before = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
  assert.strictEqual(before.scoreState.writer, 'ac_ledger.cjs score', 'persisted scoreState carries the writer');
  assert.strictEqual(before.scoreState.ledgerHash, ledgerContentHash(before), 'persisted hash matches recomputed content hash');

  seedState(root, '.agents/plans/demo/wf.state.md', { currentStep: 5, completed: [5] });
  write(path.join(root, '.agents/plans/demo/.runtime/plan.index.json'), '{}');
  write(path.join(root, '.agents/plans/demo/step-05-demo.plan.report.md'), [
    '---', 'step: 5', 'slug: demo', 'workflowId: wf', 'status: completed',
    'startedAt: "2026-09-24T00:00:00.000Z"', 'endedAt: "2026-09-24T00:00:01.000Z"', 'acRefs: []', '---', '# Report', '',
  ].join('\n'));

  // NEG3: flip the persisted boundary by hand.
  const flipped = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
  flipped.scoreState.boundary = 'step5';
  fs.writeFileSync(ledgerFile, `${JSON.stringify(flipped, null, 2)}\n`);
  const neg3 = run(validate, ['.agents/plans/demo/wf.state.md', '--pre-advance', '6', '--repo-root', root]);
  assert.notStrictEqual(neg3.status, 0, 'hand-flipped boundary fails pre-advance 6');
  assert.match(`${neg3.stdout}${neg3.stderr}`, /ac_ledger\.cjs score --ledger .* --boundary pre-step6/, 'boundary error names the supported command');

  // Tamper: restore, then edit ledger content without re-scoring.
  fs.writeFileSync(ledgerFile, `${JSON.stringify(before, null, 2)}\n`);
  const tampered = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
  tampered.acceptanceCriteria[0].text = 'Tampered behavior.';
  fs.writeFileSync(ledgerFile, `${JSON.stringify(tampered, null, 2)}\n`);
  const tamper = run(validate, ['.agents/plans/demo/wf.state.md', '--pre-advance', '6', '--repo-root', root]);
  assert.notStrictEqual(tamper.status, 0, 'hand-edited ledger content fails pre-advance 6');
  assert.match(`${tamper.stdout}${tamper.stderr}`, /changed after scoring/, 'tamper error names the cause');
}

// AC6 + NEG1: phantom finish fails without applying (no ok:true, revision unchanged).
{
  const root = makeRoot('ws-script-ux-phantom-');
  const { spawnSync } = require('child_process');
  spawnSync('git', ['init', '-q'], { cwd: root });
  spawnSync('git', ['config', 'user.email', 't@t.t'], { cwd: root });
  spawnSync('git', ['config', 'user.name', 't'], { cwd: root });
  write(path.join(root, 'real.txt'), 'hi\n');
  spawnSync('git', ['add', '.'], { cwd: root });
  spawnSync('git', ['commit', '-qm', 'init'], { cwd: root });
  const stateRel = '.agents/plans/demo/wf.state.md';
  seedState(root, stateRel, { currentStep: 1 });
  const result = run(update, ['finish', stateRel, '--step', '1', '--modified', 'nonexistent-phantom.txt', '--repo-root', root, '--jsonl-out', '.agents/plans/demo/telemetry.jsonl']);
  assert.notStrictEqual(result.status, 0, 'phantom finish exits non-zero');
  assert.ok(!result.stdout.includes('"ok": true'), 'phantom finish emits no ok:true payload');
  assert.match(result.stderr, /nonexistent-phantom\.txt/, 'phantom error names the path');
  assert.match(result.stderr, /nothing was applied/, 'phantom error states nothing was applied');
  const mdAfter = fs.readFileSync(path.join(root, stateRel), 'utf8');
  assert.match(mdAfter, /revision: 0/, 'phantom finish leaves the revision unchanged');
}

// AC7: golden-path table rows are runnable copy-paste commands (launcher + flags).
{
  const gates = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/gates.md'), 'utf8');
  const sectionStart = gates.indexOf('## Golden-path state commands');
  assert.ok(sectionStart >= 0, 'golden-path section exists in gates.md');
  const sectionEnd = gates.indexOf('\n## ', sectionStart + 1);
  const section = gates.slice(sectionStart, sectionEnd < 0 ? undefined : sectionEnd);
  const rows = section.split('\n').filter((line) => line.startsWith('| ') && !line.startsWith('| Gate'));
  assert.ok(rows.length >= 7, `golden-path table covers standard + lite boundaries (found ${rows.length})`);
  for (const row of rows) assert.ok(row.includes('node {skillsRoot}/'), `golden-path row carries a runnable launcher: ${row.slice(0, 60)}`);
}

// AC1: init help teaches its own contract (no --ledger requirement).
{
  const initHelp = run(ledgerScript, ['init', '--help']).stdout;
  assert.ok(!initHelp.includes('requires --ledger'), 'init help claims no --ledger requirement');
  assert.match(initHelp, /--spec.*--output/, 'init help centers --spec and --output');
}

console.log('test-script-ux-golden-path: ok');
