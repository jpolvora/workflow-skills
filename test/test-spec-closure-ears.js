import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;

const script = path.join(repoRoot, '.agents/skills/ws-spec-format/scripts/validate_spec.cjs');
const root = temp('ws-spec-closure-ears-');

const GOOD_TABLE = '| Feature | Reason |\n|---------|--------|\n| Bulk migration | Compat keeps passing |';
const HEADER_ONLY_TABLE = '| Feature | Reason |\n|---------|--------|';

function buildSpec({ acs, outOfScope = GOOD_TABLE, issueContext = '', notes = '' }) {
  const outSection = outOfScope === null ? '' : `## Out of Scope\n${outOfScope}\n`;
  return `---
id: null
slug: closure-case
title: Closure Case
source: local
specDate: 2026-09-30
---
## Description
Strengthen spec closure signals.
### Design Intent
Keep the behavior explicit.
## Acceptance Criteria
${acs}
${issueContext}${notes}${outSection}## Assumptions & Open Questions
| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Strictness | Syntactic match | Deterministic check | y |
## Definition of Ready (DoR)
| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded Scope | Clear problem statement | Inspect Description |
## Validation & Observation Notes
### Telemetry & Observable Signals
- Authoring validator emits PASS or FAIL for --mode=authoring.
### Negative & Failing Test Scenarios
- Free-form AC fails authoring validation with the AC id named.
`;
}

function authoring(relPath) {
  return run(script, [relPath, '--mode=authoring']);
}

function authoringJson(relPath) {
  return run(script, [relPath, '--mode=authoring', '--json']);
}

function compat(relPath) {
  return run(script, [relPath]);
}

// AC1: one authoring PASS per documented EARS pattern.
const earsAccept = [
  ['ubiquitous', '- AC1: The validator shall reject free-form AC bullets.'],
  ['event-driven', '- AC1: When authoring validation runs, the validator shall name the offending AC id.'],
  ['state-driven', '- AC1: While compat mode is active, the validator shall warn without failing.'],
  ['optional-feature', '- AC1: Where a tracker source is set, the writer shall include a Prior Work Sweep.'],
  ['unwanted-behavior', '- AC1: If the table is placeholder-only, then the validator shall exit non-zero.'],
];
for (const [pattern, ac] of earsAccept) {
  const file = write(path.join(root, `ears-accept-${pattern}.spec.md`), buildSpec({ acs: ac }));
  assert.strictEqual(authoring(file).status, 0, `EARS accept: ${pattern}`);
}

// AC1: free-form ACs fail authoring naming the AC id, and pass compat (mode split).
const freeForm = write(path.join(root, 'ears-reject-imperative.spec.md'), buildSpec({
  acs: '- AC1: Emit one deterministic result.',
}));
const freeFormRun = authoring(freeForm);
assert.notStrictEqual(freeFormRun.status, 0, 'EARS reject: bare imperative fails authoring');
assert.match(`${freeFormRun.stdout}${freeFormRun.stderr}`, /AC1[\s\S]*EARS/i, 'EARS reject names AC1');
assert.strictEqual(compat(freeForm).status, 0, 'AC6 mode split: free-form spec passes compat');

const noShall = write(path.join(root, 'ears-reject-no-shall.spec.md'), buildSpec({
  acs: '- AC1: The validator emits one deterministic result.',
}));
const noShallRun = authoring(noShall);
assert.notStrictEqual(noShallRun.status, 0, 'EARS reject: system without shall fails authoring');
assert.match(`${noShallRun.stdout}${noShallRun.stderr}`, /AC1[\s\S]*EARS/i, 'EARS reject names AC1');

// AC1 tolerance: trailing testability detail and backtick system names pass.
const trailing = write(path.join(root, 'ears-trailing.spec.md'), buildSpec({
  acs: '- AC1: The validator shall emit one deterministic result, verified by test/test-ears.js exit 0.',
}));
assert.strictEqual(authoring(trailing).status, 0, 'EARS tolerance: trailing detail passes');
const ticked = write(path.join(root, 'ears-ticked.spec.md'), buildSpec({
  acs: '- AC1: The `validate_spec.cjs` shall reject free-form AC bullets.',
}));
assert.strictEqual(authoring(ticked).status, 0, 'EARS tolerance: backtick system passes');

// AC2: out-of-scope table substance.
const zeroRow = write(path.join(root, 'oos-zero.spec.md'), buildSpec({
  acs: '- AC1: The validator shall reject free-form AC bullets.',
  outOfScope: HEADER_ONLY_TABLE,
}));
const zeroRowRun = authoring(zeroRow);
assert.notStrictEqual(zeroRowRun.status, 0, 'AC2: zero-row table fails');
assert.match(authoringJson(zeroRow).stdout, /"code": "out-of-scope-empty"/, 'AC2: zero-row names the rule');

const placeholderOnly = write(path.join(root, 'oos-placeholder.spec.md'), buildSpec({
  acs: '- AC1: The validator shall reject free-form AC bullets.',
  outOfScope: `${HEADER_ONLY_TABLE}\n| TBD | TBD |`,
}));
const placeholderRun = authoring(placeholderOnly);
assert.notStrictEqual(placeholderRun.status, 0, 'AC2: placeholder-only table fails');
assert.match(authoringJson(placeholderOnly).stdout, /"code": "out-of-scope-empty"/, 'AC2: placeholder-only names the rule');

const naBecause = write(path.join(root, 'oos-na-because.spec.md'), buildSpec({
  acs: '- AC1: The validator shall reject free-form AC bullets.',
  outOfScope: `${HEADER_ONLY_TABLE}\n| Migration | N/A because compat keeps passing |`,
}));
assert.strictEqual(authoring(naBecause).status, 0, 'AC2: N/A-because row passes');

const mixed = write(path.join(root, 'oos-mixed.spec.md'), buildSpec({
  acs: '- AC1: The validator shall reject free-form AC bullets.',
  outOfScope: `${HEADER_ONLY_TABLE}\n| TBD | TBD |\n| Bulk migration | Compat keeps passing |`,
}));
assert.strictEqual(authoring(mixed).status, 0, 'AC2: one substantive row among placeholders passes');

// AC3: canonical-section finder ignores other sections.
const shadowPass = write(path.join(root, 'oos-shadow-pass.spec.md'), buildSpec({
  acs: '- AC1: The validator shall reject free-form AC bullets.',
  issueContext: '## Original Issue Context\nFree-text request: strengthen spec closure.\n## Out of Scope\n- Ship the beta milestone\n- Rewrite every historical spec\n',
  notes: '## Notes\nTracker paste ends here.\n',
}));
assert.strictEqual(authoring(shadowPass).status, 0, 'AC3: verbatim duplicate heading does not shadow the canonical table');

const shadowFail = write(path.join(root, 'oos-shadow-fail.spec.md'), buildSpec({
  acs: '- AC1: The validator shall reject free-form AC bullets.',
  outOfScope: HEADER_ONLY_TABLE,
  notes: '## Notes\n| Topic | Detail |\n|-------|--------|\n| Unrelated | This table must not satisfy the rule |\n',
}));
const shadowFailRun = authoring(shadowFail);
assert.notStrictEqual(shadowFailRun.status, 0, 'AC3: other-section table does not satisfy an empty canonical table');
assert.match(authoringJson(shadowFail).stdout, /"code": "out-of-scope-empty"/, 'AC3: shadow-fail names the rule');

const verbatimOnly = write(path.join(root, 'oos-verbatim-only.spec.md'), buildSpec({
  acs: '- AC1: The validator shall reject free-form AC bullets.',
  outOfScope: null,
  issueContext: '## Original Issue Context\nFree-text request: strengthen spec closure.\n## Out of Scope\n- Ship the beta milestone\n',
  notes: '## Notes\nTracker paste ends here.\n',
}));
const verbatimOnlyRun = authoring(verbatimOnly);
assert.notStrictEqual(verbatimOnlyRun.status, 0, 'AC3: verbatim-only section fails closed');
assert.match(
  authoringJson(verbatimOnly).stdout,
  /"code": "(out-of-scope-empty|closure-heading)"/,
  'AC3: verbatim-only names the closure rule',
);

console.log('test-spec-closure-ears: ok');
