/**
 * Worker-turn guard regression coverage (preview-only no-op, ping-mid-batch,
 * unwritten-artifact completion). Pins the shared turn rule on every dispatch
 * path so a future prompt edit that drops the guard fails the suite.
 * Run: node test/test-worker-turn-guard.js
 */
import cp from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const guard = require('../.agents/skills/ws-spec-to-pr/scripts/worker_turn_guard.cjs');

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

// AC1: every dispatch path carries the structural turn rule.
const RULE_SENTENCES = [
  'FIRST response must contain BOTH the verbose preview AND at least 2 tool calls',
  'zero tool calls ends the turn as failed delivery',
];
const SOURCES = {
  standard: '.agents/skills/ws-spec-to-pr/PROTOCOLS.md',
  baton: '.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs',
  inline: '.agents/skills/ws-shared/runtime/host-dispatch.md',
  canonical: '.agents/skills/ws-spec-to-pr/WORKER-TURN-RULES.md',
};
for (const [name, rel] of Object.entries(SOURCES)) {
  const text = read(rel);
  for (const sentence of RULE_SENTENCES) {
    assert(
      text.includes(sentence),
      `AC1 turn rule on ${name} dispatch path (${rel}) pins: "${sentence.slice(0, 60)}..."`,
    );
  }
}
assert(
  read(SOURCES.baton).includes('worker_turn_guard.cjs')
    || read(SOURCES.baton).includes("require('./worker_turn_guard.cjs')"),
  'AC1 baton coordinator routes post-exit output through worker_turn_guard',
);

// AC1 companion: VerboseMode locked phrasing survives the PROTOCOLS.md edit.
const protocols = read('.agents/skills/ws-spec-to-pr/PROTOCOLS.md');
assert(/analyze THIS run/.test(protocols), 'PROTOCOLS.md keeps locked "analyze THIS run" phrasing');
assert(/explicit `true`/.test(protocols), 'PROTOCOLS.md keeps locked explicit-true phrasing');
assert(protocols.includes('Starting step {STEP}'), 'PROTOCOLS.md keeps locked Starting-step preview line');

// us-353 AC1: VerboseMode same-response continuation mandate survives on both
// dispatch paths (issue #353: resume loop ended its turn right after the preview).
const MANDATE =
  'then immediately continue with tool calls in the same response; never end the turn after the preview';
assert(
  protocols.includes(MANDATE),
  'us-353 AC1 PROTOCOLS.md VerboseMode addendum pins the same-response continuation mandate',
);
assert(
  read('.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md').includes(MANDATE),
  'us-353 AC1 STEP-DISPATCH.md verbose block pins the same-response continuation mandate',
);

// NS1 / AC2: preview-only worker (preview text, zero tool calls) resolves as failure.
const previewOnly = [
  'Starting step 5 (Verify):',
  '* goal for this run',
  '* what to look for',
  '* what to do',
].join('\n');
assert(
  guard.extractToolCalls(previewOnly) === null,
  'NS1 preview-only stdout carries no toolCalls envelope (unknown, not zero-claimed)',
);
const zeroCall = guard.classifyTurn({ toolCalls: 0, requiredArtifacts: [], usDir: REPO });
assert(zeroCall.verdict === 'failed', 'AC2 zero-tool-call turn verdict is failed');
assert(zeroCall.signal === 'worker_zero_tool_calls', 'AC2 zero-tool-call turn signal is worker_zero_tool_calls');

// AC2 via CLI: simulated preview-only turn exits 2 with the named signal.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'turn-guard-'));
const usDir = path.join(tmp, 'us-354');
fs.mkdirSync(usDir, { recursive: true });
const stdoutFile = path.join(tmp, 'preview-only.txt');
fs.writeFileSync(stdoutFile, `${previewOnly}\n`, 'utf8');
const cliZero = cp.spawnSync(process.execPath, [
  path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/worker_turn_guard.cjs'),
  '--us-dir', usDir,
  '--step', '5',
  '--slug', 'us-354',
  '--tool-calls', '0',
], { encoding: 'utf8' });
assert(cliZero.status === 2, 'AC2 CLI preview-only turn exits 2 (failed)');
assert(
  JSON.parse(cliZero.stdout).signal === 'worker_zero_tool_calls',
  'AC2 CLI preview-only turn emits worker_zero_tool_calls',
);

// NS3 / AC3: unwritten-artifact finish resolves as failure, never completed.
const missing = guard.classifyTurn({
  toolCalls: 4,
  requiredArtifacts: ['step-05-us-354.plan.report.md'],
  usDir,
});
assert(missing.verdict === 'failed', 'AC3 unwritten-artifact turn verdict is failed');
assert(missing.signal === 'worker_missing_artifact', 'AC3 unwritten-artifact turn signal is worker_missing_artifact');
const cliMissing = cp.spawnSync(process.execPath, [
  path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/worker_turn_guard.cjs'),
  '--us-dir', usDir,
  '--step', '5',
  '--slug', 'us-354',
  '--tool-calls', '4',
], { encoding: 'utf8' });
assert(cliMissing.status === 2, 'AC3 CLI unwritten-artifact turn exits 2 (failed)');
assert(
  JSON.parse(cliMissing.stdout).signal === 'worker_missing_artifact',
  'AC3 CLI unwritten-artifact turn emits worker_missing_artifact',
);

// Completed path: tool calls present and required artifacts on disk.
fs.writeFileSync(path.join(usDir, 'step-05-us-354.plan.report.md'), 'report fixture\n', 'utf8');
// Envelope-less CLI turns (toolCalls unknown) with artifacts on disk are real
// turns, not preview-only no-ops: unknown must not coerce to zero.
const unknown = guard.classifyTurn({
  toolCalls: null,
  requiredArtifacts: ['step-05-us-354.plan.report.md'],
  usDir,
});
assert(unknown.verdict === 'completed', 'guard treats unknown toolCalls + artifacts as completed (no null-to-zero coercion)');
const done = guard.classifyTurn({
  toolCalls: 4,
  requiredArtifacts: ['step-05-us-354.plan.report.md'],
  usDir,
});
assert(done.verdict === 'completed' && done.signal === null, 'guard passes a real turn (calls + artifacts)');
const cliDone = cp.spawnSync(process.execPath, [
  path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/worker_turn_guard.cjs'),
  '--us-dir', usDir,
  '--step', '5',
  '--slug', 'us-354',
  '--tool-calls', '4',
], { encoding: 'utf8' });
assert(cliDone.status === 0, 'CLI real turn exits 0 (completed)');

// NS4 / AC5: continuation reuses intact worktree progress (fixture keeps its
// uncommitted partial file; the guard sees the intact artifacts as done).
fs.writeFileSync(path.join(usDir, 'partial-progress.md'), 'uncommitted fixes\n', 'utf8');
const resumed = guard.classifyTurn({
  toolCalls: 9,
  requiredArtifacts: ['step-05-us-354.plan.report.md'],
  usDir,
});
assert(resumed.verdict === 'completed', 'AC5 continuation over intact worktree progress verifies completed');
assert(
  fs.existsSync(path.join(usDir, 'partial-progress.md')),
  'AC5 fixture partial progress is preserved (not rebuilt from scratch)',
);
const coordinator = read('.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs');
assert(!/git (reset|clean)/.test(coordinator), 'AC5 coordinator retry paths run no git reset/clean (worktree intact)');
assert(
  read(SOURCES.canonical).includes('reuses the intact'),
  'AC5 canonical rule file carries the continuation contract',
);

// NS2 / AC4: no mid-batch ping path remains in the parent dispatch loop.
assert(
  coordinator.includes("stdio: ['ignore'"),
  'AC4 coordinator spawns workers with stdin ignored (no message channel to ping through)',
);
assert(
  !/\bping\b/i.test(coordinator),
  'AC4 no ping path remains in the coordinator dispatch loop',
);
const hostDispatch = read('.agents/skills/ws-shared/runtime/host-dispatch.md');
assert(
  hostDispatch.includes('never-ping-mid-batch') || hostDispatch.includes('never sends a message into a running worker turn'),
  'AC4 never-ping-mid-batch contract is documented for all dispatch tiers',
);
assert(
  hostDispatch.includes('read-only poll of the workflow state'),
  'AC4 read-only state poll is documented as the sanctioned progress signal',
);

// AC6 companion: telemetry schema accepts the new signals; monitor tolerates them.
const schema = JSON.parse(read('.agents/skills/ws-shared/runtime/telemetry.schema.json'));
assert(
  schema.properties.type.enum.includes('worker_zero_tool_calls'),
  'telemetry schema accepts worker_zero_tool_calls',
);
assert(
  schema.properties.type.enum.includes('worker_missing_artifact'),
  'telemetry schema accepts worker_missing_artifact',
);
const monitor = read('.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');
assert(
  !/switch\s*\(\s*event\.type/.test(monitor),
  'ws-monitor has no exhaustive switch over telemetry types (new signals tolerated)',
);

fs.rmSync(tmp, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll worker-turn-guard checks passed.');
