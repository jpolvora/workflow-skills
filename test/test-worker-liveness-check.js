/**
 * Worker liveness evaluator regression coverage (us-502).
 *
 * Covers the worker marker obligation, the four evaluator verdicts with their
 * exit codes, the stale-marker case, progress-outranks-absence, the runtime
 * residue allowlist, the window-resolver fallback, and the canonical contract
 * section. Literal assertion messages are the plan §5 ledger-linkable names.
 *
 * Run: node test/test-worker-liveness-check.js
 *
 * Red-first (plan G13): `.agents/skills/ws-spec-to-pr/scripts/
 * worker_liveness_check.cjs` is authored by DAG node T02 (level 3), so this
 * suite is written before the evaluator exists and fails module-not-found until
 * T02 lands. Fixtures use controlled past timestamps plus fs.utimesSync, never
 * a sleep and never a `--now` override (interview G04); no fixture writes into
 * a real run `.runtime` directory.
 */
import cp from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const EVALUATOR = path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/worker_liveness_check.cjs');
// T02 owns the evaluator: until it lands, this line throws MODULE_NOT_FOUND and
// the suite exits non-zero (the deliberate red run this node records).
require.resolve(EVALUATOR);

const { RUNTIME_NAMES } = require(path.join(REPO, '.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs'));
const { resolveWorkerLivenessWindowSec } = require(path.join(
  REPO,
  '.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs',
));

const STEP = 9;
const BATCH = 'r1';
const WINDOW_SEC = 600;
const SLUG = 'liveness-fixture';
const WORKFLOW_ID = `${SLUG}-20261011T000000Z`;
const MARKER_NAME = `worker-started-${STEP}-${BATCH}.md`;
const TMP_ROOT = path.join(REPO, 'test', `.tmp-liveness-${process.pid}`);

let failures = 0;

function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), 'utf8');
}

// ---------------------------------------------------------------------------
// Fixture helpers (throwaway run dirs under test/.tmp-liveness-<pid>/)
// ---------------------------------------------------------------------------

function iso(date) {
  return new Date(date).toISOString();
}

function agoSec(sec) {
  return new Date(Date.now() - sec * 1000);
}

function shifted(date, sec) {
  return new Date(new Date(date).getTime() + sec * 1000);
}

function writeFileAt(file, content, mtime) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  if (mtime) fs.utimesSync(file, mtime, mtime);
}

function telemetryLine(type, step, timestamp, substep) {
  const record = {
    schemaVersion: 1,
    type,
    timestamp,
    workflowId: WORKFLOW_ID,
    pipeline: 'standard',
    packageVersion: '0.0.0-fixture',
    step,
    model: 'fixture',
    retries: 0,
    reviewRounds: 0,
    refineRounds: 0,
    skipReason: null,
    acTotal: 13,
    acImplemented: 0,
  };
  if (type === 'dispatch') record.dispatchedAt = timestamp;
  if (substep) record.substep = substep;
  return JSON.stringify(record);
}

function newRun(name, { windowSec } = {}) {
  const root = path.join(TMP_ROOT, name);
  const usDir = path.join(root, '.agents', 'plans', SLUG);
  fs.mkdirSync(usDir, { recursive: true });
  fs.mkdirSync(path.join(root, '.agents', 'skills', 'ws-shared', 'runtime'), { recursive: true });
  fs.copyFileSync(
    path.join(REPO, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
    path.join(root, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
  );
  const defaults = {};
  if (windowSec !== undefined) defaults.workerLivenessWindowSec = windowSec;
  writeFileAt(
    path.join(root, '.ws', 'config.json'),
    `${JSON.stringify({ plans: { dir: '.agents/plans' }, verification: {}, defaults, fable: { auditVerdictsBlockShip: 'refuted' } }, null, 2)}\n`,
  );
  return { name, root, usDir };
}

function writeState(run, { revision = 7 } = {}, mtime) {
  const file = path.join(run.usDir, `${WORKFLOW_ID}.state.json`);
  const body = {
    stateVersion: 3,
    revision,
    workflowId: WORKFLOW_ID,
    slug: SLUG,
    workflowType: 'standard',
    status: 'active',
    currentStep: STEP,
    completedSteps: [],
    workflowManifest: { created: [], modified: [], deleted: [] },
    acTotal: 13,
    acImplemented: 0,
  };
  writeFileAt(file, `${JSON.stringify(body, null, 2)}\n`, mtime);
  return file;
}

function writeTelemetry(run, lines, mtime) {
  const file = path.join(run.usDir, 'telemetry.jsonl');
  writeFileAt(file, `${lines.join('\n')}\n`, mtime);
  return file;
}

function writeMarker(run, { fileBatch = BATCH, step = STEP, dispatchedAt = iso(new Date()), body, mtime } = {}) {
  const file = path.join(run.usDir, '.runtime', `worker-started-${step}-${fileBatch}.md`);
  const payload = body === undefined
    ? ['---', `step: ${step}`, `batch: ${fileBatch}`, `dispatchedAt: ${dispatchedAt}`, 'owner: ws-goal-fix-pr', '---', ''].join('\n')
    : body;
  writeFileAt(file, payload, mtime);
  return file;
}

function evaluate(run, { batch = BATCH, step = STEP, extra = [] } = {}) {
  const result = cp.spawnSync(
    process.execPath,
    [EVALUATOR, '--us-dir', run.usDir, '--step', String(step), '--batch', batch, '--repo-root', run.root, '--json', ...extra],
    { encoding: 'utf8', cwd: run.root },
  );
  const stdout = result.stdout || '';
  let record = null;
  try {
    record = JSON.parse(stdout);
  } catch {
    record = null;
  }
  return { status: result.status, stdout, stderr: result.stderr || '', record };
}

// ---------------------------------------------------------------------------
// V12 / V13 — canonical contract section (WORKER-TURN-RULES.md)
// ---------------------------------------------------------------------------

const flat = (text) => text.replace(/\s+/g, ' ').trim();

function levelTwoSections(text) {
  const sections = [];
  let current = { heading: '', lines: [] };
  for (const line of text.split('\n')) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      sections.push(current);
      current = { heading: match[1], lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections.filter((section) => section.heading);
}

// The canonical section is the level-2 section that carries the marker name, so
// renaming the heading never silently detaches these pins.
const rulesText = read('.agents/skills/ws-spec-to-pr/WORKER-TURN-RULES.md');
const livenessSection = levelTwoSections(rulesText).find((section) => section.lines.join('\n').includes('worker-started-'));
const canonical = livenessSection ? flat(`## ${livenessSection.heading}\n${livenessSection.lines.join('\n')}`) : '';

assert(
  canonical.includes('worker-started-{step}-{batch}.md')
    && /within the effective worker liveness window after dispatch, for this dispatch/i.test(canonical),
  'AC1 canonical section states the marker write obligation within the window for this dispatch',
);

assert(
  /cancel-then-redispatch/i.test(canonical)
    && /measured ages/i.test(canonical)
    && /round artifact/i.test(canonical),
  'AC8 canonical section records takeover branch with measured ages',
);

assert(
  /only a `?wedged`? verdict authorizes takeover/i.test(canonical)
    && /never dispatch a second worker for a batch that is not proven wedged/i.test(canonical),
  'AC9 canonical section forbids a second worker for a batch not proven wedged',
);

assert(
  /ping is never a progress signal/i.test(canonical)
    && /outcome as watchdog evidence/i.test(canonical),
  'AC10 canonical section records a ping outcome as watchdog evidence',
);

assert(
  /inline/i.test(canonical) && /lite/i.test(canonical) && /Tier 3/.test(canonical),
  'AC12 canonical section exempts inline, lite, and Tier 3 postures',
);

assert(
  canonical.includes('worker-started-{step}-{batch}.md')
    && /no marker obligation/i.test(canonical)
    && /Tier 3/.test(canonical),
  'NS9 exemption sits in the same section as the obligation',
);

assert(
  canonical.includes('Worker marker obligation')
    && canonical.includes('Parent watchdog contract')
    && canonical.includes('Sanctioned no-output takeover branches'),
  'AC13 canonical section states marker obligation, watchdog contract, and takeover branches',
);

{
  const builders = {
    'STEP-DISPATCH.md': read('.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md'),
    'PROTOCOLS.md': read('.agents/skills/ws-spec-to-pr/PROTOCOLS.md'),
  };
  const entries = Object.entries(builders);
  const divergent = entries.filter(([, text]) => text.includes('worker-started-') && !text.includes('WORKER-TURN-RULES.md'));
  assert(
    entries.some(([name, text]) => name === 'STEP-DISPATCH.md' && text.includes('WORKER-TURN-RULES.md'))
      && divergent.length === 0,
    'AC13 dispatch builders point at the canonical section without a divergent copy',
  );
}

// ---------------------------------------------------------------------------
// V8 / V9 / V21 — window resolver + config surface parity
// ---------------------------------------------------------------------------

assert(
  resolveWorkerLivenessWindowSec({}) === WINDOW_SEC
    && resolveWorkerLivenessWindowSec({ defaults: {} }) === WINDOW_SEC
    && resolveWorkerLivenessWindowSec({ defaults: { workerLivenessWindowSec: 0 } }) === WINDOW_SEC
    && resolveWorkerLivenessWindowSec({ defaults: { workerLivenessWindowSec: -5 } }) === WINDOW_SEC
    && resolveWorkerLivenessWindowSec({ defaults: { workerLivenessWindowSec: '600' } }) === WINDOW_SEC
    && resolveWorkerLivenessWindowSec({ defaults: { workerLivenessWindowSec: 9.5 } }) === WINDOW_SEC
    && resolveWorkerLivenessWindowSec({ defaults: { workerLivenessWindowSec: null } }) === WINDOW_SEC
    && resolveWorkerLivenessWindowSec({ defaults: { workerLivenessWindowSec: true } }) === WINDOW_SEC
    && resolveWorkerLivenessWindowSec({ defaults: { workerLivenessWindowSec: 120 } }) === 120,
  'AC11 resolver falls back to 600 for 0, negative, string, and non-integer',
);

{
  const schema = JSON.parse(read('.agents/skills/ws-shared/runtime/config.schema.json'));
  const schemaDefaults = schema?.properties?.defaults?.properties || null;
  const schemaKey = schemaDefaults ? schemaDefaults.workerLivenessWindowSec : null;
  const example = JSON.parse(read('.agents/skills/ws-shared/templates/config.json.example'));
  const guiRow = read('.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1')
    .split('\n')
    .find((line) => line.includes("-Key 'workerLivenessWindowSec'")) || '';
  assert(
    schemaKey !== null
      && schemaKey.type === 'integer'
      && schemaKey.minimum === 1
      && schemaKey.default === WINDOW_SEC
      && example?.defaults?.workerLivenessWindowSec === WINDOW_SEC
      && /-Type 'int'/.test(guiRow)
      && /-DefaultVal 600/.test(guiRow),
    'AC11 schema, example, and GUI carry workerLivenessWindowSec default 600',
  );
}

// ---------------------------------------------------------------------------
// V3 — the marker name stays inside the fail-closed runtime residue allowlist
// ---------------------------------------------------------------------------

assert(
  RUNTIME_NAMES.some((pattern) => pattern.test(MARKER_NAME))
    && !RUNTIME_NAMES.some((pattern) => pattern.test(`worker-started-${STEP}-${BATCH}.log`)),
  'AC3 marker name is tolerated by RUNTIME_NAMES',
);

// ---------------------------------------------------------------------------
// Evaluator fixtures (V1, V2, V4-V7, V10, V11, V16, V20, NS1-NS4, NS6, NS7,
// NS10, NS11, G02)
// ---------------------------------------------------------------------------

try {
  // V7 / NS3 — no dispatch event for the evaluated step: fail open, never wedge.
  {
    const run = newRun('no-baseline');
    const baseline = agoSec(3600);
    writeState(run, { revision: 4 }, agoSec(7200));
    writeTelemetry(run, [telemetryLine('dispatch', 3, iso(baseline))], agoSec(7200));
    const out = evaluate(run);
    assert(out.record?.verdict === 'no-baseline', 'AC7 missing dispatch event resolves no-baseline');
    assert(out.status === 0 && out.record?.verdict !== 'wedged', 'NS3 no-baseline exits 0 and never wedges');
  }

  // V4 / NS4 — window not elapsed, no marker, no progress.
  {
    const run = newRun('pending');
    writeState(run, { revision: 3 }, agoSec(3600));
    writeTelemetry(run, [telemetryLine('dispatch', STEP, iso(agoSec(30)))], agoSec(3600));
    const out = evaluate(run);
    assert(out.record?.verdict === 'pending', 'AC4 no marker within the window resolves pending');
    assert(out.status === 0 && out.record?.verdict === 'pending', 'NS4 in-window evaluation exits 0 with pending');
  }

  // V5 / NS1 — window elapsed, no marker, frozen state and telemetry.
  {
    const run = newRun('wedged');
    const baseline = agoSec(1800);
    writeState(run, { revision: 5 }, shifted(baseline, -600));
    writeTelemetry(run, [telemetryLine('dispatch', STEP, iso(baseline))], shifted(baseline, -1));
    const out = evaluate(run);
    assert(out.record?.verdict === 'wedged', 'AC5 elapsed window with no marker and no progress resolves wedged');
    assert(out.status === 2 && out.record?.verdict === 'wedged', 'NS1 wedged verdict exits 2');
  }

  // V1 / V16 — fresh marker for this dispatch resolves alive; payload hygiene.
  {
    const run = newRun('alive-marker');
    const baseline = agoSec(1800);
    writeState(run, { revision: 6 }, shifted(baseline, -600));
    writeTelemetry(run, [telemetryLine('dispatch', STEP, iso(baseline))], shifted(baseline, -1));
    const markerFile = writeMarker(run, { dispatchedAt: iso(baseline), mtime: shifted(baseline, 60) });
    const out = evaluate(run);
    assert(
      out.record?.verdict === 'alive' && out.record?.markerPresent === true,
      'AC2 marker fixture resolves alive with markerPresent true',
    );

    const markerText = fs.readFileSync(markerFile, 'utf8');
    const absolutePath = /(?:[A-Za-z]:[\\/]|\\\\)/;
    const secretish = /secret|password|api[_-]?key|private key/i;
    const recordedMarker = String(out.record?.markerPath || '');
    assert(
      !absolutePath.test(markerText)
        && !secretish.test(markerText)
        && !absolutePath.test(out.stdout)
        && !secretish.test(out.stdout)
        && new RegExp(`(^|[\\\\/])\\.runtime[\\\\/]${MARKER_NAME.replace('.', '\\.')}$`).test(recordedMarker)
        && !path.isAbsolute(recordedMarker),
      'security marker payload carries no absolute machine path or secret',
    );
  }

  // V1 (negative) — a marker with an empty `batch` field is never evidence.
  {
    const run = newRun('empty-batch-marker');
    const baseline = agoSec(30);
    writeState(run, { revision: 4 }, agoSec(3600));
    writeTelemetry(run, [telemetryLine('dispatch', STEP, iso(baseline))], agoSec(3600));
    writeMarker(run, {
      fileBatch: BATCH,
      body: ['---', `step: ${STEP}`, 'batch:', `dispatchedAt: ${iso(baseline)}`, '---', ''].join('\n'),
      mtime: new Date(),
    });
    const out = evaluate(run);
    assert(out.record?.verdict === 'pending', 'AC2 marker with empty batch field is not a valid marker');
  }

  // V6 — durable progress after the baseline outranks marker absence.
  {
    const run = newRun('alive-progress');
    const baseline = agoSec(1800);
    writeState(run, { revision: 7 }, shifted(baseline, -600));
    writeTelemetry(run, [
      telemetryLine('dispatch', STEP, iso(baseline)),
      telemetryLine('finish', STEP, iso(shifted(baseline, 120))),
    ], shifted(baseline, -1));
    const out = evaluate(run);
    assert(out.record?.verdict === 'alive', 'AC6 durable progress after baseline resolves alive');
  }

  // NS2 — marker absent while the run advanced after dispatch.
  {
    const run = newRun('revision-advance');
    const baseline = agoSec(1800);
    writeState(run, { revision: 9 }, new Date());
    writeTelemetry(run, [telemetryLine('dispatch', STEP, iso(baseline))], shifted(baseline, -1));
    const out = evaluate(run);
    assert(
      out.record?.verdict === 'alive' && out.record?.markerPresent === false,
      'NS2 marker-absent revision advance resolves alive',
    );
  }

  // G02 — ambient sibling activity can only delay a wedge, never authorize one.
  {
    const run = newRun('ambient-activity');
    const baseline = agoSec(1800);
    writeState(run, { revision: 9 }, shifted(baseline, -600));
    writeTelemetry(run, [
      telemetryLine('dispatch', STEP, iso(baseline)),
      telemetryLine('finish', 6, iso(shifted(baseline, 300))),
    ], shifted(baseline, -1));
    const out = evaluate(run);
    assert(
      out.record?.verdict === 'alive' && out.record?.verdict !== 'wedged',
      'G02 ambient sibling telemetry after the baseline resolves alive and never wedged',
    );
  }

  // V11 / NS10 — a marker that lands after the window still resolves alive.
  {
    const run = newRun('marker-after-window');
    const baseline = agoSec(1800);
    writeState(run, { revision: 4 }, shifted(baseline, -600));
    writeTelemetry(run, [telemetryLine('dispatch', STEP, iso(baseline))], shifted(baseline, -1));
    writeMarker(run, { dispatchedAt: iso(baseline), mtime: agoSec(5) });
    const out = evaluate(run);
    assert(out.record?.verdict === 'alive', 'NS10 marker written after the window resolves alive');
  }

  // V20 / NS11 — a stale same-name marker from a superseded dispatch is not alive.
  {
    const run = newRun('stale-marker');
    const baseline = agoSec(1800);
    const staleMtime = shifted(baseline, -3600);
    writeState(run, { revision: 4 }, shifted(baseline, -600));
    writeTelemetry(run, [telemetryLine('dispatch', STEP, iso(baseline))], shifted(baseline, -1));
    writeMarker(run, { dispatchedAt: iso(staleMtime), mtime: staleMtime });
    const out = evaluate(run);
    assert(
      out.record?.verdict !== 'alive'
        && out.record?.markerPresent === true
        && out.record?.markerFresh === false,
      'AC5 stale marker predating the baseline does not resolve alive',
    );
    assert(out.status === 2 && out.record?.verdict === 'wedged', 'NS11 elapsed window with a stale marker and no progress resolves wedged');
  }

  // V10 / NS7 — malformed telemetry lines are skipped, latest baseline wins.
  {
    const run = newRun('malformed-telemetry');
    const older = agoSec(3600);
    const newer = agoSec(30);
    writeState(run, { revision: 4 }, agoSec(7200));
    writeTelemetry(run, [
      telemetryLine('dispatch', STEP, iso(older)),
      '{"type":"dispatch","step":9,"timestamp":',
      telemetryLine('dispatch', STEP, iso(newer), 'fixPrExec'),
    ], agoSec(7200));
    const out = evaluate(run);
    assert(
      out.record?.verdict === 'pending'
        && Math.abs(Date.parse(out.record?.dispatchedAt) - newer.getTime()) <= 1000,
      'NS7 malformed telemetry line is skipped and the baseline still resolves',
    );
  }

  // V8 / NS6 — an invalid configured window never wedges a batch immediately.
  {
    const run = newRun('invalid-window', { windowSec: -5 });
    writeState(run, { revision: 4 }, agoSec(3600));
    writeTelemetry(run, [telemetryLine('dispatch', STEP, iso(agoSec(30)))], agoSec(3600));
    const out = evaluate(run);
    assert(
      out.record?.verdict === 'pending' && out.record?.windowSec === WINDOW_SEC,
      'NS6 invalid window value does not wedge immediately',
    );
  }

  // V2 — the marker write and an evaluation never touch state or `.runtime`.
  {
    const run = newRun('no-revision-bump');
    const baseline = agoSec(30);
    const stateFile = writeState(run, { revision: 11 }, agoSec(3600));
    writeTelemetry(run, [telemetryLine('dispatch', STEP, iso(baseline))], agoSec(3600));
    const stateBefore = fs.readFileSync(stateFile, 'utf8');
    writeMarker(run, { dispatchedAt: iso(baseline), mtime: new Date() });
    const stateAfterMarker = fs.readFileSync(stateFile, 'utf8');
    assert(
      JSON.parse(stateAfterMarker).revision === JSON.parse(stateBefore).revision
        && stateAfterMarker === stateBefore,
      'AC3 marker write leaves state revision unchanged',
    );
    const runtimeBefore = fs.readdirSync(path.join(run.usDir, '.runtime')).sort();
    const out = evaluate(run);
    const runtimeAfter = fs.readdirSync(path.join(run.usDir, '.runtime')).sort();
    assert(
      out.record?.verdict === 'alive'
        && fs.readFileSync(stateFile, 'utf8') === stateBefore
        && runtimeAfter.join(',') === runtimeBefore.join(','),
      'AC3 evaluation leaves state bytes and .runtime contents unchanged',
    );
  }
} finally {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll worker-liveness checks passed.');
