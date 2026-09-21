#!/usr/bin/env node
'use strict';

// us-365: opt-in execution observer for ws-spec-to-pr.
//
// The watcher observes harness execution only (orchestrator dispatch flow,
// workflow state, telemetry, expected step artifacts, agent transcript
// paths) — never consumer product implementation. The `watch` subcommand is
// strictly read-only outside its own `<usDir>/observer/` artifact pair:
// `observer.log` (classified JSONL findings) + `observer-report.md` (fix
// proposals scoped to the upstream package). `record` and `note-dispatch`
// are orchestrator-side writes (state annotation + dispatch accounting),
// not watcher writes.

const fs = require('fs');
const path = require('path');
// Managed runtime loads from its skills installation: the project-local
// skills tree ({skillsRoot}/ws-shared) or the global skills tree
// ({globalSkillsRoot}/ws-shared, override via WORKFLOW_SKILLS_GLOBAL_DIR).
const HUB_SCRIPTS_DIR = (() => {
  try {
    return require('../../ws-shared/runtime/scripts/bootstrap_runtime.cjs').resolveHubScriptsDir(__dirname);
  } catch {
    const packaged = path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'scripts');
    const candidates = [];
    const explicitShared = process.env.WORKFLOW_SKILLS_SHARED_DIR;
    if (explicitShared && String(explicitShared).trim()) {
      candidates.unshift(path.join(path.resolve(String(explicitShared).trim()), 'runtime', 'scripts'));
    }
    try {
      candidates.push(path.resolve(process.cwd(), '.agents', 'skills', 'ws-shared', 'runtime', 'scripts'));
    } catch {
      // Ignore cwd resolution failures; remaining candidates still apply.
    }
    const globalDir = process.env.WORKFLOW_SKILLS_GLOBAL_DIR;
    const globalRoot = globalDir && String(globalDir).trim()
      ? path.resolve(String(globalDir).trim())
      : path.join(require('os').homedir(), '.agents', 'skills');
    candidates.push(packaged);
    candidates.push(path.join(globalRoot, 'ws-shared', 'runtime', 'scripts'));
    for (const candidate of [...new Set(candidates)]) {
      try {
        require.resolve(path.join(candidate, 'resolve_consumer_root.cjs'));
        return candidate;
      } catch {
        // Try the next candidate.
      }
    }
    return packaged;
  }
})();
const {
  resolveAutoStartObserver,
  resolveMinVerifyScore,
} = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));
const {
  resolveConsumerContext,
} = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));
const {
  withBatonLock,
} = require(path.join(HUB_SCRIPTS_DIR, 'step_baton.cjs'));
const {
  canonicalStateJson,
  jsonStatePath,
  parseFrontmatter,
  plansIndexPath,
  refreshPlansIndexForState,
  syncStateDualWrite,
} = require(path.join(HUB_SCRIPTS_DIR, 'workflow_state.cjs'));

const OBSERVER_DIRNAME = 'observer';
const LOG_NAME = 'observer.log';
const REPORT_NAME = 'observer-report.md';
const MAX_WATCHER_DISPATCHES = 1;
const TRANSCRIPT_REASONS = new Set(['discovery-disabled', 'no-matching-session', 'scan-capped']);
const RETIRED_SKILL_IDS = ['implement-plan', 'plan-us', '05-verify-sync-plan-us'];

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Build the state-file transcript marker. Present paths win; otherwise the
// explicit absent marker carries the reason and monitoring continues.
function buildAgentTranscripts({ paths, reason, recordedAt } = {}) {
  const cleanPaths = Array.isArray(paths)
    ? [...new Set(paths.map((item) => String(item || '').trim()).filter(Boolean))]
    : [];
  if (cleanPaths.length > 0) {
    return { status: 'available', paths: cleanPaths, recordedAt: recordedAt || nowIso() };
  }
  if (!TRANSCRIPT_REASONS.has(reason)) {
    throw new Error(
      `agentTranscripts needs paths or a reason (${[...TRANSCRIPT_REASONS].join('|')})`,
    );
  }
  return { status: 'transcript-unavailable', reason, recordedAt: recordedAt || nowIso() };
}

function assertValidMarker(marker) {
  if (!marker || typeof marker !== 'object') throw new Error('agentTranscripts marker must be an object');
  if (marker.status === 'available') {
    if (!Array.isArray(marker.paths) || marker.paths.length === 0) {
      throw new Error('available agentTranscripts needs a non-empty paths array');
    }
  } else if (marker.status === 'transcript-unavailable') {
    if (!TRANSCRIPT_REASONS.has(marker.reason)) {
      throw new Error(`transcript-unavailable agentTranscripts needs a valid reason (${[...TRANSCRIPT_REASONS].join('|')})`);
    }
  } else {
    throw new Error('agentTranscripts status must be available|transcript-unavailable');
  }
  // Round-2 fix-pr: forbid cross-branch fields so a marker is unambiguous.
  if (marker.status === 'available' && marker.reason !== undefined) {
    throw new Error('available agentTranscripts must not carry a reason');
  }
  if (marker.status === 'transcript-unavailable'
    && Array.isArray(marker.paths) && marker.paths.length > 0) {
    throw new Error('transcript-unavailable agentTranscripts must not carry paths');
  }
}

// Resolve the repo root that owns a state file by walking up from the
// state directory: nearest ancestor carrying .git or .ws wins, else the
// nearest ancestor carrying .agents (tmpdir fixtures), else the state dir.
function resolveObserverRepoRoot(usDir) {
  let dir = path.resolve(String(usDir));
  for (;;) {
    try {
      if (fs.existsSync(path.join(dir, '.git')) || fs.existsSync(path.join(dir, '.ws'))) return dir;
      if (fs.existsSync(path.join(dir, '.agents'))) return dir;
    } catch {
      return path.resolve(String(usDir));
    }
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(String(usDir));
    dir = parent;
  }
}

function observerContext(usDir) {
  const repoRoot = resolveObserverRepoRoot(usDir);
  try {
    return resolveConsumerContext({ repoRoot, scriptFile: __filename });
  } catch {
    return { repoRoot, config: {} };
  }
}

// Canonical observer-side persist: read-modify-write under the baton lock
// (same lock the coordinator uses for CAS), bump revision through the
// canonical dual writer, and refresh the plans index so stateSha256 tracks
// the new state. Mirrors the coordinator persist() path.
function persistObserverMutation(stateFile, mutate) {
  const jsonPath = jsonStatePath(stateFile);
  if (!fs.existsSync(jsonPath)) throw new Error(`state file not found: ${stateFile}`);
  const usDir = path.dirname(jsonPath);
  return withBatonLock(usDir, () => {
    const state = readJson(jsonPath);
    mutate(state);
    state.revision = Number(state.revision || 0) + 1;
    syncStateDualWrite(stateFile, state);
    const context = observerContext(usDir);
    fs.mkdirSync(path.dirname(plansIndexPath(context)), { recursive: true });
    refreshPlansIndexForState(context, state, { stateFile });
    return state;
  });
}

// Orchestrator-side annotation: record the transcript marker in the state
// file (dual write). Not a watcher write.
function recordAgentTranscripts(stateFile, marker) {
  assertValidMarker(marker);
  persistObserverMutation(stateFile, (state) => {
    state.agentTranscripts = marker;
  });
  return marker;
}

function readTelemetryEvents(telemetryFile) {
  if (!telemetryFile || !fs.existsSync(telemetryFile)) return [];
  const events = [];
  for (const line of fs.readFileSync(telemetryFile, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // Malformed telemetry lines are themselves observable below.
    }
  }
  return events;
}

function countObserverDispatches(telemetryEvents) {
  return (Array.isArray(telemetryEvents) ? telemetryEvents : [])
    .filter((event) => event && event.type === 'observer-dispatch').length;
}

// Round-4 fix-pr: the durable state record backs the telemetry gate, so a
// truncated/rotated/lost telemetry file cannot reopen dispatch.
function alreadyDispatched({ telemetryEvents, state } = {}) {
  if (countObserverDispatches(telemetryEvents) >= MAX_WATCHER_DISPATCHES) return true;
  const count = state && state.observer ? state.observer.dispatchCount : undefined;
  return Number.isInteger(count) && count >= MAX_WATCHER_DISPATCHES;
}

// Gate: default-off resolves false (zero dispatches); an already-dispatched
// run refuses a second watcher (at most one per run, fail closed).
function shouldDispatchObserver({ config, telemetryEvents, state } = {}) {
  if (!resolveAutoStartObserver(config)) return false;
  return !alreadyDispatched({ telemetryEvents, state });
}

// Orchestrator-side accounting: note the single allowed watcher dispatch in
// telemetry and state. Refuses when disabled or already dispatched. The
// dispatch check+append runs serialized under the baton lock so concurrent
// callers yield exactly one observer-dispatch record.
function noteObserverDispatch({ stateFile, telemetryFile, config, subagentId, dispatchedAt }) {
  if (!resolveAutoStartObserver(config)) {
    throw new Error('observer dispatch refused: monitor.autoStartObserver is not explicit true');
  }
  const jsonPath = jsonStatePath(stateFile);
  // Round-9 fix-pr: fail closed when the state JSON is missing, so the
  // durable record cannot be silently skipped (mirrors record).
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`note-dispatch requires an existing state JSON file: ${stateFile}`);
  }
  const usDir = path.dirname(jsonPath);
  const at = dispatchedAt || nowIso();
  return withBatonLock(usDir, () => {
    const events = readTelemetryEvents(telemetryFile);
    const priorState = readJson(jsonPath);
    if (alreadyDispatched({ telemetryEvents: events, state: priorState })) {
      throw new Error('observer dispatch refused: at most one watcher per run');
    }
    const record = { type: 'observer-dispatch', at, subagentId: subagentId || null };
    fs.mkdirSync(path.dirname(telemetryFile), { recursive: true });
    fs.appendFileSync(telemetryFile, `${JSON.stringify(record)}\n`, 'utf8');
    const state = readJson(jsonPath);
    state.observer = state.observer && typeof state.observer === 'object' ? state.observer : {};
    state.observer.enabled = true;
    state.observer.dispatchCount = MAX_WATCHER_DISPATCHES;
    state.observer.dispatchedAt = at;
    state.revision = Number(state.revision || 0) + 1;
    syncStateDualWrite(stateFile, state);
    const context = observerContext(usDir);
    fs.mkdirSync(path.dirname(plansIndexPath(context)), { recursive: true });
    refreshPlansIndexForState(context, state, { stateFile });
    return record;
  });
}

function containedPath(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function observerPaths(usDir) {
  const dir = path.join(path.resolve(usDir), OBSERVER_DIRNAME);
  return { dir, log: path.join(dir, LOG_NAME), report: path.join(dir, REPORT_NAME) };
}

function addFinding(findings, severity, code, message, evidence = [], proposal = null) {
  const key = `${severity}:${code}:${message}`;
  if (findings.some((item) => `${item.severity}:${item.code}:${item.message}` === key)) return;
  const finding = { severity, code, message, evidence };
  if (proposal) finding.proposal = proposal;
  findings.push(finding);
}

// Strictly read-only outside <usDir>/observer/: reads state + telemetry +
// step artifacts, writes only the observer log/report pair.
function watchRun({ stateFile, telemetryFile, usDir, config, at } = {}) {
  if (!usDir) throw new Error('watch needs --us-dir');
  // Fail closed before any write: the watched state file must live directly
  // under --us-dir so observer artifacts cannot escape the run directory
  // (e.g. writing %TEMP%/observer for a --us-dir above the workflow dir).
  const jsonPath = jsonStatePath(stateFile);
  if (path.dirname(path.resolve(jsonPath)) !== path.resolve(usDir)) {
    throw new Error(`watch refused: state file is outside --us-dir (${stateFile})`);
  }
  const targets = observerPaths(usDir);
  for (const target of [targets.log, targets.report]) {
    if (!containedPath(targets.dir, target)) {
      throw new Error(`observer write refused outside ${OBSERVER_DIRNAME}/: ${target}`);
    }
  }
  if (!fs.existsSync(jsonPath)) throw new Error(`state file not found: ${stateFile}`);
  const state = readJson(jsonPath);
  const events = readTelemetryEvents(telemetryFile);
  const timestamp = at || nowIso();
  const findings = [];
  const slug = state.slug || path.basename(path.resolve(usDir));

  const requiredKeys = ['stateVersion', 'workflowId', 'slug', 'workflowType', 'status', 'currentStep'];
  const missingKeys = requiredKeys.filter((key) => state[key] === undefined || state[key] === null);
  if (missingKeys.length > 0) {
    addFinding(findings, 'critical', 'state-missing-field',
      `state file misses required keys: ${missingKeys.join(', ')}`, [jsonPath],
      'Upstream fix: extend the state writer to always persist the required workflow-state.schema.json keys before finish.');
  }

  const minScore = resolveMinVerifyScore(config);
  if (Number(state.currentStep) > 5
    && state.verificationScore !== null && state.verificationScore !== undefined
    && Number(state.verificationScore) < minScore) {
    addFinding(findings, 'critical', 'verify-below-bar',
      `currentStep ${state.currentStep} advanced with verification score ${state.verificationScore} below ${minScore}`,
      [jsonPath],
      'Upstream fix: hold Step 5 advance below defaults.minVerifyScore and run scoreAndRefine until the bar is met.');
  }

  const handoffs = state.handoffs && typeof state.handoffs === 'object' ? state.handoffs : {};
  for (const step of [4, 6]) {
    const handoff = handoffs[String(step)];
    if (handoff && (!Array.isArray(handoff.artifactPaths) || handoff.artifactPaths.length === 0)) {
      addFinding(findings, 'warning', 'empty-files-touched',
        `completed mutating step ${step} reports no artifact paths`, [jsonPath],
        'Upstream fix: require non-empty files_touched (or an explicit no-op declaration) on step finish.');
    }
  }

  const dispatches = countObserverDispatches(events);
  if (dispatches > MAX_WATCHER_DISPATCHES) {
    addFinding(findings, 'critical', 'observer-double-dispatch',
      `observer dispatched ${dispatches} times; at most ${MAX_WATCHER_DISPATCHES} allowed`, [telemetryFile || jsonPath],
      'Upstream fix: keep the shouldDispatchObserver gate (zero when disabled, refuse when already dispatched).');
  }

  const marker = state.agentTranscripts;
  if (!marker || marker.status === 'transcript-unavailable') {
    addFinding(findings, 'info', 'transcript-absent',
      marker ? `agent transcripts unavailable (${marker.reason || 'unknown'})` : 'agent transcripts not recorded',
      [jsonPath]);
  }

  try {
    const stateMtimeMs = fs.statSync(jsonPath).mtimeMs;
    let latestTelemetryMs = NaN;
    for (const event of events) {
      const candidate = event.at || event.dispatchedAt || event.finishedAt || event.timestamp;
      const ms = Date.parse(candidate);
      if (!Number.isNaN(ms) && (Number.isNaN(latestTelemetryMs) || ms > latestTelemetryMs)) latestTelemetryMs = ms;
    }
    if (!Number.isNaN(latestTelemetryMs) && latestTelemetryMs - stateMtimeMs > 5000) {
      addFinding(findings, 'warning', 'stale-state',
        'telemetry is newer than the state file (> 5s): delayed state flush or revision race', [jsonPath, telemetryFile || jsonPath],
        'Upstream fix: flush state before appending telemetry on every step transition.');
    }
  } catch {
    // Stat failures are environmental; the run still reports other findings.
  }

  const haystack = JSON.stringify({
    nextAction: state.nextAction || '',
    handoffs: Object.values(handoffs).map((item) => item && item.summary ? item.summary : ''),
  });
  const retired = RETIRED_SKILL_IDS.filter((id) => haystack.includes(id));
  if (retired.length > 0) {
    addFinding(findings, 'warning', 'retired-reference',
      `state references retired skill ids: ${retired.join(', ')}`, [jsonPath],
      'Upstream fix: dispatch only the canonical skill ids in STEP-DISPATCH.md (never retired ids).');
  }

  if (findings.length === 0) {
    addFinding(findings, 'info', 'observer-clean', 'no harness-execution defects observed', [jsonPath]);
  }

  fs.mkdirSync(targets.dir, { recursive: true });
  const logLines = [
    JSON.stringify({ type: 'observer-run', at: timestamp, workflowId: state.workflowId || null, slug }),
    ...findings.map((finding) => JSON.stringify({ at: timestamp, ...finding })),
  ];
  fs.writeFileSync(targets.log, `${logLines.join('\n')}\n`, 'utf8');

  const withProposals = findings.filter((finding) => finding.proposal);
  const lines = [
    `# Observer report — ${slug}`,
    '',
    `Run at ${timestamp}. Harness execution only; consumer product files were neither read for content nor touched.`,
    '',
    '## Findings',
    '',
    '| Severity | Code | Message |',
    '|----------|------|---------|',
    ...findings.map((finding) => `| ${finding.severity} | \`${finding.code}\` | ${finding.message} |`),
    '',
    ...(withProposals.length > 0 ? [
      '## Fix proposals (upstream package scope)',
      '',
      ...withProposals.flatMap((finding) => [`### ${finding.code}`, '', finding.proposal, '']),
    ] : ['No fix proposals: nothing above info severity.', '']),
  ];
  fs.writeFileSync(targets.report, `${lines.join('\n')}\n`, 'utf8');
  return { log: targets.log, report: targets.report, findings };
}

function printHelp() {
  process.stdout.write(
    'Usage: node observer.cjs <resolve-config|should-dispatch|record|note-dispatch|watch> [options]\n'
    + '  resolve-config --config <config.json>\n'
    + '  should-dispatch --config <config.json> --telemetry <telemetry.jsonl> [--state <state>]\n'
    + '  record --state <state.json|state.md> (--paths a,b | --reason <reason>)\n'
    + '  note-dispatch --state <state> --telemetry <telemetry.jsonl> --config <config.json> [--subagent-id ID]\n'
    + '  watch --state <state> --us-dir <dir> [--telemetry <telemetry.jsonl>] [--config <config.json>]\n',
  );
}

function flagValue(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1 || index + 1 >= argv.length) return null;
  return argv[index + 1];
}

function main(argv) {
  const command = argv[2];
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  if (command === 'resolve-config') {
    const configFile = flagValue(argv, '--config');
    const config = configFile && fs.existsSync(configFile) ? readJson(configFile) : {};
    process.stdout.write(`${JSON.stringify({ autoStartObserver: resolveAutoStartObserver(config) })}\n`);
    return;
  }
  if (command === 'should-dispatch') {
    const configFile = flagValue(argv, '--config');
    const config = configFile && fs.existsSync(configFile) ? readJson(configFile) : {};
    const telemetryFile = flagValue(argv, '--telemetry');
    const enabled = resolveAutoStartObserver(config);
    const gateStateFile = flagValue(argv, '--state');
    // Round-8 fix-pr: fail closed when enabled without --state, so the
    // durable check cannot be silently skipped.
    if (enabled && (!gateStateFile || !fs.existsSync(jsonStatePath(gateStateFile)))) {
      throw new Error('should-dispatch requires an existing state JSON file when monitor.autoStartObserver is true');
    }
    const gateState = gateStateFile && fs.existsSync(jsonStatePath(gateStateFile))
      ? readJson(jsonStatePath(gateStateFile))
      : null;
    const allowed = shouldDispatchObserver({
      config,
      telemetryEvents: readTelemetryEvents(telemetryFile),
      state: gateState,
    });
    process.stdout.write(`${JSON.stringify({ dispatch: allowed, enabled })}\n`);
    // Round-2 fix-pr: exit 2 only when enabled but refused (already
    // dispatched); default-off (enabled false) is normal operation, exit 0.
    if (enabled && !allowed) process.exitCode = 2;
    return;
  }
  if (command === 'record') {
    const stateFile = flagValue(argv, '--state');
    if (!stateFile) throw new Error('record needs --state');
    const pathsValue = flagValue(argv, '--paths');
    const reason = flagValue(argv, '--reason');
    const marker = buildAgentTranscripts({
      paths: pathsValue ? pathsValue.split(',') : [],
      reason,
    });
    recordAgentTranscripts(stateFile, marker);
    process.stdout.write(`${JSON.stringify(marker)}\n`);
    return;
  }
  if (command === 'note-dispatch') {
    const stateFile = flagValue(argv, '--state');
    const telemetryFile = flagValue(argv, '--telemetry');
    const configFile = flagValue(argv, '--config');
    if (!stateFile || !telemetryFile) throw new Error('note-dispatch needs --state and --telemetry');
    const config = configFile && fs.existsSync(configFile) ? readJson(configFile) : {};
    const record = noteObserverDispatch({
      stateFile,
      telemetryFile,
      config,
      subagentId: flagValue(argv, '--subagent-id'),
    });
    process.stdout.write(`${JSON.stringify(record)}\n`);
    return;
  }
  if (command === 'watch') {
    const stateFile = flagValue(argv, '--state');
    const usDir = flagValue(argv, '--us-dir');
    if (!stateFile || !usDir) throw new Error('watch needs --state and --us-dir');
    const configFile = flagValue(argv, '--config');
    const config = configFile && fs.existsSync(configFile) ? readJson(configFile) : {};
    const result = watchRun({
      stateFile,
      telemetryFile: flagValue(argv, '--telemetry'),
      usDir,
      config,
    });
    process.stdout.write(`${JSON.stringify({
      log: result.log,
      report: result.report,
      findings: result.findings.length,
      critical: result.findings.filter((finding) => finding.severity === 'critical').length,
    })}\n`);
    return;
  }
  throw new Error(`unknown command: ${command}`);
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (error) {
    process.stderr.write(`observer: ${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  OBSERVER_DIRNAME,
  LOG_NAME,
  REPORT_NAME,
  MAX_WATCHER_DISPATCHES,
  TRANSCRIPT_REASONS: [...TRANSCRIPT_REASONS],
  RETIRED_SKILL_IDS,
  resolveAutoStartObserver,
  resolveMinVerifyScore,
  buildAgentTranscripts,
  assertValidMarker,
  resolveObserverRepoRoot,
  persistObserverMutation,
  recordAgentTranscripts,
  readTelemetryEvents,
  countObserverDispatches,
  alreadyDispatched,
  shouldDispatchObserver,
  noteObserverDispatch,
  observerPaths,
  watchRun,
  jsonStatePath,
  parseFrontmatter,
  canonicalStateJson,
};
