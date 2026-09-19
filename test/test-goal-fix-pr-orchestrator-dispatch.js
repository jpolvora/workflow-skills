/**
 * ws-goal-fix-pr orchestrator dispatch (us-347, AC1–AC8 + NS1–NS5).
 * Skill-text assertions on the round-batch dispatch contract plus
 * fixPrPlan/fixPrExec resolver fixtures. Failing before the skill
 * rewrite (red baseline), green after.
 * Run: node test/test-goal-fix-pr-orchestrator-dispatch.js
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SHARED = path.join(REPO, '.agents/skills/ws-shared');
const { resolvePhaseModel } = require(path.join(SHARED, 'runtime', 'scripts', 'workflow_state.cjs'));

let failures = 0;

function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

function read(rel) {
  return fs.readFileSync(path.join(REPO, rel), 'utf8');
}

const goalFix = read('.agents/skills/ws-goal-fix-pr/SKILL.md');
const fixPr = read('.agents/skills/ws-fix-pr/SKILL.md');

// AC1 — sessionOwnsLoopInline: session owns loop inline, never plans/fixes when dispatch available.
assert(
  /skill session (is the orchestrator|owns the (goal )?loop inline)/i.test(goalFix) &&
    /initialize, convergence check, heartbeat wait, re-check, pre-merge gate, and final report inline/i.test(
      goalFix,
    ),
  'AC1 sessionOwnsLoopInline: session owns loop steps inline',
);
assert(
  /never authors plan gates or product fixes itself when dispatch is available/i.test(goalFix),
  'AC1 sessionOwnsLoopInline: session never plans/fixes when dispatch available',
);

// AC1/lite posture — inline-only callers must NOT dispatch a batch worker and run the pair inline.
assert(
  /Lite \/ inline posture:.*do not dispatch a batch worker/i.test(goalFix) &&
    /run the ordered `fixPrPlan` → `fixPrExec` pair inline on the captured session model/i.test(goalFix),
  'AC1 liteInlinePosture: lite/inline runs the pair inline without a batch worker',
);
// Lite/inline runs must not emit internal role telemetry.
assert(
  /Lite\/inline runs emit none/i.test(goalFix),
  'AC4 liteInlinePosture: lite/inline emits no internal role telemetry',
);

// AC2 — freshWorkerPerRound: batch-worker reading verbatim (F1).
assert(
  goalFix.includes(
    'one fresh worker per round batch runs the ordered `fixPrPlan` → `fixPrExec` pair inside that worker; that worker is never reused for another round or substep instance',
  ),
  'AC2 freshWorkerPerRound: batch-worker reading verbatim',
);
assert(
  /dispatch.*fresh worker per round batch.*`dispatch-agent`/is.test(goalFix),
  'AC2 freshWorkerPerRound: dispatch per round batch via portable alias',
);
// AC2 — gateBeforeMutation: gate-only plan, exec validates + amends-before-deviates.
assert(
  /`fixPrPlan` must write the complete matching `plan-gate\.md` before product or remote mutation/i.test(
    goalFix,
  ),
  'AC2 gateBeforeMutation: fixPrPlan gate-only before mutation',
);
assert(
  /`fixPrExec` must validate and follow it, append any amendment before a deviating edit/i.test(goalFix),
  'AC2 gateBeforeMutation: fixPrExec validates + amends-before-deviates',
);

// AC3 — fixPrPlanChain / fixPrExecChain: both 5-link chains, ws-fix-pr table normative (F3).
assert(
  /`fixPrPlan`: `stepModels\.fixPrPlan` → active preset `steps\.fixPrPlan` → top-level `reviewerModel` → preset `reviewerModel` → captured session model/i.test(
    goalFix,
  ),
  'AC3 fixPrPlanChain: 5-link chain through reviewerModel',
);
assert(
  /`fixPrExec`: `stepModels\.fixPrExec` → active preset `steps\.fixPrExec` → top-level `executionModel` → preset `executionModel` → captured session model/i.test(
    goalFix,
  ),
  'AC3 fixPrExecChain: 5-link chain through executionModel',
);
assert(
  /ws-fix-pr.*"Internal model roles" table is the normative chain/i.test(goalFix) &&
    /STEP-DISPATCH.*abbreviated pointer only/i.test(goalFix),
  'AC3 chainNormativeSource: ws-fix-pr table normative, STEP-DISPATCH pointer only',
);
// AC3 — noNumericNine: neither role consults numeric "9".
assert(
  /Neither role consults numeric `"9"`/i.test(goalFix),
  'AC3 noNumericNine: numeric 9 excluded from internal roles',
);
// AC3/NS2 — modelRejectionFallback: retry under session model, configuredModel vs actual (F4).
assert(
  /retry that role under the captured session model and record `configuredModel` vs actual/i.test(goalFix),
  'AC3 modelRejectionFallback: rejection retries under session with configuredModel vs actual',
);
assert(
  /run that role inline under the captured session model/i.test(fixPr),
  'NS2 modelRejectionFallback: ws-fix-pr keeps session fallback wording',
);

// Resolver fixtures: both chains resolve role → preset role → top-level → preset → session.
{
  const session = 'session-model';
  const chain = {
    modelsPreset: 'roles',
    modelPresets: {
      roles: { reviewerModel: 'preset-reviewer', executionModel: 'preset-execution', steps: {} },
    },
    stepModels: { 9: 'outer-step-nine' },
    reviewerModel: 'top-reviewer',
    executionModel: 'top-execution',
  };
  assert(
    resolvePhaseModel(chain, { step: 9, role: 'fixPrPlan', pipeline: 'standard', sessionModel: session }) ===
      'top-reviewer',
    'AC3 resolver: fixPrPlan top-level reviewerModel before preset',
  );
  assert(
    resolvePhaseModel(
      { ...chain, reviewerModel: '', executionModel: '' },
      { step: 9, role: 'fixPrPlan', pipeline: 'standard', sessionModel: session },
    ) === 'preset-reviewer',
    'AC3 resolver: fixPrPlan preset reviewerModel before session',
  );
  assert(
    resolvePhaseModel(chain, { step: 9, role: 'fixPrExec', pipeline: 'standard', sessionModel: session }) ===
      'top-execution',
    'AC3 resolver: fixPrExec top-level executionModel before preset',
  );
  assert(
    resolvePhaseModel(
      { ...chain, reviewerModel: '', executionModel: '' },
      { step: 9, role: 'fixPrExec', pipeline: 'standard', sessionModel: session },
    ) === 'preset-execution',
    'AC3 resolver: fixPrExec preset executionModel before session',
  );
}

// AC4 — orderedDispatchEvents: ordered telemetry.jsonl events with actual vs configured models (F4).
assert(
  /every batch emits ordered `fixPrPlan` → `fixPrExec` dispatch events/i.test(goalFix) &&
    goalFix.includes('telemetry.jsonl'),
  'AC4 orderedDispatchEvents: ordered batch events in telemetry.jsonl',
);
assert(
  /actual model and the configured model/i.test(goalFix),
  'AC4 orderedDispatchEvents: events carry actual vs configured models',
);
// AC4 — noFinishFromInternal: internal roles never finish outer Step 9.
assert(
  /Internal roles emit (dispatch )?telemetry only and never (call )?`?finish --step 9`?/i.test(goalFix),
  'AC4 noFinishFromInternal: internal roles emit telemetry only, never finish Step 9',
);
assert(
  /outer caller owns the single outer finish/i.test(goalFix),
  'AC4 noFinishFromInternal: outer caller owns single finish',
);

// AC5/NS1 — tier3Fallback: Tier 3 inline-isolated per host-dispatch.md, documented never silent.
assert(
  /Tier 3 inline-isolated execution per .*host-dispatch\.md/i.test(goalFix),
  'AC5 tier3Fallback: Tier 3 per host-dispatch.md',
);
assert(
  /adopt the step persona, context pointers only, log `inline-isolated-step`/i.test(goalFix),
  'AC5 tier3Fallback: step persona + context pointers + inline-isolated-step log',
);
assert(
  /identical gate\/learning contracts/i.test(goalFix) && /never a silent change/i.test(goalFix),
  'AC5 tier3Fallback: identical contracts, documented never silent',
);

// AC6 — guardsPreserved: revision, blocked ≥3, resume, $RUNTIME_DIR.
assert(
  /stale revision.*conflicts loudly and is never silently overwritten/i.test(goalFix),
  'AC6 guardsPreserved: revision-guarded updates survive',
);
assert(
  /blocked.*only after.*>= 3 consecutive rounds.*same concrete reason/is.test(goalFix),
  'AC6 guardsPreserved: blocked verdict ≥3 identical rounds survives',
);
assert(
  /re-arms the objective.*re-initializes the blocked\/counter round state/is.test(goalFix),
  'AC6 guardsPreserved: resume re-arms + resets survives',
);
assert(
  /\$RUNTIME_DIR.*\{us-dir\}\/\.runtime.*Never OS temp.*Never skill-folder `runs\//is.test(goalFix),
  'AC6 guardsPreserved: $RUNTIME_DIR placement survives',
);
// AC6/F5 — dryRunZeroMutation: zero commits/pushes/resolves under both paths.
assert(
  /zero commits, zero pushes, and zero `resolve-thread` calls/i.test(goalFix) &&
    /under both the dispatch path and the Tier 3 path/i.test(goalFix),
  'AC6 dryRunZeroMutation: zero mutations under dispatch and Tier 3 paths',
);
// AC6/F6/NS3 — staleRevisionConflict: loud conflict, never last-wins.
assert(
  /Never take last-wins on a conflicting revision/i.test(goalFix),
  'NS3 staleRevisionConflict: never last-wins on conflicting revision',
);
// AC6/F6/NS4 — gateBeforeResolvePush: both-substeps evidence + same-class fixed-or-skipped.
assert(
  /Forbidden:.*resolve or push before both substeps have evidence/s.test(goalFix),
  'NS4 gateBeforeResolvePush: no resolve/push before both-substeps evidence',
);
assert(
  /while same-class surgical hits remain unfixed without recorded skips/i.test(goalFix),
  'NS4 gateBeforeResolvePush: same-class hits fixed or recorded skipped',
);

// AC7 — semanticsPreserved: convergence, overrides, verify, learning, pre-merge (F2 ownership).
assert(
  /`len\(activeThreads\) == 0`.*AND.*all active code reviews and CI pipelines have completed/is.test(goalFix),
  'AC7 semanticsPreserved: convergence criterion survives',
);
assert(
  /Auto-yes: save gate file and proceed/i.test(goalFix) && /Auto: execute unless `dry-run`/i.test(goalFix),
  'AC7 semanticsPreserved: automation overrides survive',
);
assert(
  /run `config\.json\.verification` commands plus a `ws-code-review` diff check/i.test(goalFix),
  'AC7 semanticsPreserved: verify step survives',
);
assert(
  /Forbidden:.*Learning: N\/A/s.test(goalFix),
  'AC7 semanticsPreserved: post-round learning rule survives',
);
assert(
  /hard gate.*do not hand off to the caller until this verification passes with evidence/is.test(goalFix),
  'AC7 semanticsPreserved: pre-merge hard gate survives',
);
assert(
  /never duplicates.*per-round .*`Learning:` write/is.test(goalFix),
  'AC7 workerSessionLearning: session never duplicates worker per-round Learning write',
);

// NS5 — harnessNeutrality: portable aliases only, no host/subagent product names or tool ids.
assert(
  goalFix.includes('`dispatch-agent`'),
  'NS5 harnessNeutrality: portable dispatch-agent alias used',
);
{
  const bodies = `${goalFix}\n${fixPr}`;
  const forbidden = [
    'claude',
    'cursor',
    'copilot',
    'codex',
    'windsurf',
    'aider',
    'gemini',
    'opencode',
    'grok',
    'chatgpt',
    'vscode',
    'kilocode',
    'antigravity',
    'subagent_type',
  ];
  const hits = forbidden.filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(bodies));
  assert(hits.length === 0, `NS5 harnessNeutrality: no product/tool-id terms (${hits.join(', ') || 'none'})`);
  assert(!/visual studio/i.test(bodies), 'NS5 harnessNeutrality: no Visual Studio reference');
}

// us-353 AC2 — loopLivenessWatchdog: parent-side wedge detection + resume takeover
// (issue #353: loop wedged after batch-1 worker result, resume no-op'd).
assert(/## Loop liveness watchdog/.test(goalFix), 'us-353 watchdog: section exists');
assert(
  /round-log freshness/i.test(goalFix) && /session-log mtime/i.test(goalFix),
  'us-353 watchdog: detection signals are round-log freshness and session-log mtime',
);
assert(/resume-takeover/i.test(goalFix), 'us-353 watchdog: resume-takeover procedure documented');
assert(
  /do not ping a fix worker mid-batch|never ping[^.]*mid-batch/i.test(goalFix),
  'us-353 watchdog: no-ping-mid-batch rule restated on the loop path',
);

// us-353 AC3 — statePathDispatch: loop-path update_state dispatch examples use the
// state-path form (bare workflow-id fails with `state file not found`).
assert(
  /\{plansDir\}\/\{slug\}\/\{workflow-id\}\.state\.md/.test(goalFix),
  'us-353 statePath: watchdog shows the state-path dispatch form',
);
assert(
  !/dispatch\s+(?:<workflow-id>|\{workflow-id\})(?!\.state)/.test(goalFix),
  'us-353 statePath: no bare workflow-id dispatch example on the loop path',
);

// us-353 AC4 — boundedHandoff: batch worker returns summary + artifact pointers,
// full transcript stays in the round artifact.
assert(
  /summar[^.]*artifact pointer/i.test(goalFix),
  'us-353 boundedHandoff: worker returns summary plus artifact pointers',
);
assert(
  /\{reviewsDir\}\/PR-<N>-round-\*\.md/.test(goalFix),
  'us-353 boundedHandoff: full output lives in the round artifact',
);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('test-goal-fix-pr-orchestrator-dispatch: ok');
