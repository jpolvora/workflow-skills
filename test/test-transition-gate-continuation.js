import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot } = utils;

// Regression for https://github.com/jpolvora/workflow-skills/issues/280
// Native Next must continue in the same turn; markdown fallback must yield.
// A native Next must never leave currentStep advanced with no N+1 dispatch.

const gates = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-shared/gates.md'),
  'utf8',
);
const orch = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-spec-to-pr/SKILL.md'),
  'utf8',
);
const stepDispatch = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md'),
  'utf8',
);
const lite = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/SKILL.md'),
  'utf8',
);
const readme = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-spec-to-pr/README.md'),
  'utf8',
);

// Shared contract keeps both halves: markdown yield + native continuation.
assert.match(gates, /One Step Per Turn/, 'gates.md keeps One Step Per Turn cadence');
assert.match(
  gates,
  /MUST NOT emit any tool calls in the same response turn/,
  'gates.md keeps markdown fallback turn-yielding',
);
assert.match(
  gates,
  /Markdown fallback.*must halt the turn/s,
  'gates.md scopes the halt to markdown fallback',
);
assert.match(
  gates,
  /Native modal gate.*returns?\s+\*\*Next\*\*.*same turn/s,
  'gates.md requires same-turn dispatch after native Next',
);
assert.match(
  gates,
  /stall bug/,
  'gates.md names the advanced-without-dispatch stall as a bug',
);

// Blanket continuation covers every step boundary (1->2 ... 8->9),
// manual step-by-step and auto full, native and markdown alike.
assert.match(
  gates,
  /Gate continuation \(all gates, every step boundary/,
  'gates.md states the all-gates continuation rule',
);
assert.match(
  gates,
  /intermediate gates \(classifier, safety valve, Reach-10, scoreAndRefine, G2-code, close, ship\)/,
  'gates.md extends continuation to intermediate gates',
);
assert.match(
  gates,
  /\| Classifier \(Step 0\) \| Accept recommendation \|/,
  'gates.md auto-gate accepts the classifier by default',
);
assert.match(
  gates,
  /\| Lite safety valve \| Continue lite \|/,
  'gates.md auto-gate continues lite by default',
);
assert.match(
  gates,
  /`autoMode` → zero [`']?user-gate[`']? prompts of any kind/,
  'gates.md keeps autoMode zero-prompt compatibility',
);

// Orchestrators inherit the same distinction (no competing one-line halt).
for (const [name, body] of [
  ['ws-spec-to-pr', orch],
  ['STEP-DISPATCH', stepDispatch],
  ['ws-spec-to-pr-lite', lite],
]) {
  assert.match(body, /One Step Per Turn/, `${name} keeps single-turn cadence`);
  assert.match(
    body,
    /native modal.*Next.*same turn/i,
    `${name} continues in the same turn after native Next`,
  );
  assert.match(
    body,
    /markdown fallback.*never.*same turn/i,
    `${name} still yields the turn on markdown fallback`,
  );
}

// README golden rule stays aligned with native continuation.
assert.match(
  readme,
  /After Transition Gate \*\*Next\*\*, dispatch the next step in the \*\*same turn\*\*/,
  'README golden rule requires same-turn dispatch after Next',
);

console.log('test-transition-gate-continuation: ok');
