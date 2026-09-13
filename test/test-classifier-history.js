import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot, temp, run, write } = utils;
const classifier = path.join(repoRoot, '.agents/skills/ws-classify-complexity/scripts/classify.cjs');
const history = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/search_plan_history.cjs');
const memory = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.py');
const root = temp('ws-classifier-history-');
write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans' },
  dagThresholds: { maxImplementationSteps: 1, maxExpectedFiles: 1, maxLayers: 1 },
  defaults: { enableDag: true, skipTesting: false },
  verification: {},
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
write(path.join(root, '.agents/plans/telemetry/aggregate.json'), JSON.stringify({ medians: { standard: { runElapsedSec: 777, steps: {} } } }));
write(path.join(root, 'feature.spec.md'), `---
id: null
slug: feature
title: Feature
source: local
specDate: 2026-08-21
---
## Description
Update skills and tests across layers.
## Open Questions
- Which boundary?
## Acceptance Criteria
- AC1: Implement the first behavior in \`src/a.js\`.
- AC2: Implement the second behavior in \`test/a.test.js\`.
`);
const classified = run(classifier, ['feature.spec.md', '--output-dir', 'out'], { cwd: root, env: { WS_REPO_ROOT: root } });
assert.strictEqual(classified.status, 0, classified.stderr);
const payload = JSON.parse(classified.stdout.split('\nWrote ')[0]);
for (const key of ['pipeline', 'execMode', 'runInterview', 'runTesting', 'estimatedElapsedSec']) {
  assert.ok(payload.executionProfile[key] && payload.executionProfile[key].reason, `${key} includes value and reason`);
}
assert.strictEqual(payload.executionProfile.estimatedElapsedSec.value, 777);

const liteComplexRoot = temp('ws-classifier-lite-complex-');
write(path.join(liteComplexRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans' },
  dagThresholds: { maxImplementationSteps: 3, maxExpectedFiles: 6, maxLayers: 2 },
  defaults: { enableDag: false, skipTesting: false },
  verification: {},
}));
write(path.join(liteComplexRoot, 'schema-lite.spec.md'), `---
id: null
slug: schema-lite
title: Schema lite
source: local
specDate: 2026-09-13
---
## Description
Docs-only schema note in README.md.
## Acceptance Criteria
- AC1: Mention the schema change in \`README.md\`.
`);
const liteComplex = run(classifier, ['schema-lite.spec.md', '--output-dir', 'out'], {
  cwd: liteComplexRoot,
  env: { WS_REPO_ROOT: liteComplexRoot },
});
assert.strictEqual(liteComplex.status, 0, liteComplex.stderr);
const liteComplexPayload = JSON.parse(liteComplex.stdout.split('\nWrote ')[0]);
assert.strictEqual(liteComplexPayload.complexityClass, 'complex');
assert.strictEqual(liteComplexPayload.recommendedPipeline, 'standard');
assert.strictEqual(liteComplexPayload.runInterview, true);
assert.ok(liteComplexPayload.metrics.layers <= 2);
assert.match(
  liteComplexPayload.executionProfile.runInterview.reason,
  /Complexity class `complex`/,
);
assert.doesNotMatch(
  liteComplexPayload.executionProfile.runInterview.reason,
  /Standard execution has open questions/,
);
const liteComplexMd = fs.readFileSync(
  path.join(liteComplexRoot, 'out', 'step-00-schema-lite.classify.md'),
  'utf8',
);
assert.match(liteComplexMd, /Complexity class `complex`/);
assert.doesNotMatch(liteComplexMd, /Standard execution has open questions/);

write(path.join(root, '.agents/specs/0051-prefix-only.spec.md'), `
## Description
Small change.
## Acceptance Criteria
- AC1: One behavior in \`src/a.js\`.
`);
const prefixedClassify = run(
  classifier,
  ['.agents/specs/0051-prefix-only.spec.md', '--output-dir', 'out-prefixed'],
  { cwd: root, env: { WS_REPO_ROOT: root } },
);
assert.strictEqual(prefixedClassify.status, 0, prefixedClassify.stderr);
const prefixedPayload = JSON.parse(prefixedClassify.stdout.split('\nWrote ')[0]);
assert.match(
  prefixedPayload.classifyPath,
  /step-00-prefix-only\.classify\.md$/,
  'inferSlug strips four-digit filename prefix',
);

write(path.join(root, '.agents/plans/index.json'), JSON.stringify({
  workflows: [{
    workflowId: 'old-wf', slug: 'old-feature', status: 'completed',
    statePath: '.agents/plans/old-feature/old-wf.state.md',
  }],
}));
write(path.join(root, '.agents/plans/old-feature/step-00-old-feature.spec.md'), 'A prior feature discusses second behavior and boundaries.\n');
const historyResult = run(history, ['--slug', 'feature', '--keyword', 'second behavior', '--repo-root', root]);
assert.strictEqual(historyResult.status, 0, historyResult.stderr);
assert.strictEqual(JSON.parse(historyResult.stdout).matches[0].workflowId, 'old-wf');

write(path.join(root, 'plan.md'), 'Change src/payments/service.js for the feature.\n');
write(path.join(root, 'MEMORY.md'), `## Traps
### Payment boundary
- **Layer**: Core
- **Module**: Payments
- **Severity**: High
- **PathPattern**: src/payments/*
- **DO NOT**: bypass the boundary
- **INSTEAD DO**: use the service
`);
const memoryResult = run(memory, ['plan.md', '--json', '--memory', 'MEMORY.md', '--repo-root', root], { command: 'python', cwd: root });
assert.strictEqual(memoryResult.status, 2);
assert.strictEqual(JSON.parse(memoryResult.stdout).force_interview, true);

const softExitResult = run(memory, ['plan.md', '--json', '--soft-exit', '--memory', 'MEMORY.md', '--repo-root', root], { command: 'python', cwd: root });
assert.strictEqual(softExitResult.status, 0, softExitResult.stderr);
const softPayload = JSON.parse(softExitResult.stdout);
assert.strictEqual(softPayload.force_interview, true);
assert.ok(Array.isArray(softPayload.results.traps) && softPayload.results.traps.length > 0);

const humanSoft = run(memory, ['plan.md', '--soft-exit', '--memory', 'MEMORY.md', '--repo-root', root], { command: 'python', cwd: root });
assert.strictEqual(humanSoft.status, 1, humanSoft.stderr);
assert.match(humanSoft.stderr, /--soft-exit requires --json/);
console.log('test-classifier-history: ok');
