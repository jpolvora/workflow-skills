#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const {
  resolveConsumerContext,
} = require('../../ws-shared/runtime/scripts/resolve_consumer_root.cjs');
const {
  syncStateDualWrite,
  parseFrontmatter,
  finishArtifactNames,
  requiredAdvanceArtifacts,
  refreshPlansIndexForState,
  resolvePackageVersion,
  validateSnapshot,
  plansIndexPath,
} = require('../../ws-shared/runtime/scripts/workflow_state.cjs');
const {
  validateRunConfig,
  resolveMappedRunner,
  normalizeBaton,
  claimBaton,
  expiryState,
  computeBackoffMs,
  sleepSync,
  withBatonLock,
  resolveRunnerArgv,
  isGateShapedOutput,
  buildBatonEnvelope,
  computeLeaseUntil,
  createError,
} = require('../../ws-shared/runtime/scripts/step_baton.cjs');
const guard = require('./worker_turn_guard.cjs');

const EXIT_OK = 0;
const EXIT_BLOCKED = 2;
const EXIT_CONFIG = 3;
const EXIT_UNDERFOOT = 4;

const TERMINAL_STATUSES = new Set(['completed', 'blocked', 'failed', 'cancelled']);
const CLOSE_STEP = { standard: 8, lite: 4 };
const MAX_STEP = { standard: 9, lite: 5 };

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--once') {
      options.once = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (['once', 'json'].includes(key) && (index + 1 >= argv.length || argv[index + 1].startsWith('--'))) {
      options[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${token} requires a value`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function nowIso() {
  return new Date().toISOString();
}

function appendJsonl(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
}

function resolveStatePaths(repoRoot, input) {
  const absolute = path.isAbsolute(input) ? input : path.resolve(repoRoot, input);
  if (absolute.endsWith('.state.json')) {
    return { jsonPath: absolute, mdPath: absolute.replace(/\.state\.json$/, '.state.md') };
  }
  if (absolute.endsWith('.state.md')) {
    return { jsonPath: absolute.replace(/\.state\.md$/, '.state.json'), mdPath: absolute };
  }
  throw createError('STEPBATON_EMPTY_MAP', `--state must point at a .state.json or .state.md file (received: ${input})`);
}

function loadStateDisk(jsonPath, mdPath) {
  if (fs.existsSync(jsonPath)) {
    return { state: JSON.parse(fs.readFileSync(jsonPath, 'utf8')), jsonPath, mdPath };
  }
  if (!fs.existsSync(mdPath)) throw new Error(`state file not found: ${jsonPath}`);
  return { state: parseFrontmatter(fs.readFileSync(mdPath, 'utf8')).data, jsonPath, mdPath };
}

function packageVersionOf(context) {
  try {
    return resolvePackageVersion(context);
  } catch {
    return 'unknown';
  }
}

function buildBatonEvent(context, state, pipeline, type, { step, holder, attempt, exitCode, cause }) {
  const event = {
    schemaVersion: 1,
    type,
    timestamp: nowIso(),
    workflowId: String(state.workflowId || ''),
    pipeline,
    packageVersion: packageVersionOf(context),
    step: Number(step),
    model: 'coordinator',
    retries: Math.max(0, Number(attempt || 1) - 1),
    reviewRounds: 0,
    refineRounds: 0,
    skipReason: null,
    acTotal: Number(state.acTotal || 0),
    acImplemented: Number(state.acImplemented || 0),
  };
  if (holder) event.holder = String(holder);
  if (Number.isInteger(Number(attempt)) && Number(attempt) >= 1) event.attempt = Number(attempt);
  if (exitCode !== undefined) event.exitCode = exitCode === null ? null : Number(exitCode);
  if (cause) event.cause = String(cause);
  return event;
}

function emitTelemetry(telemetryFile, context, state, pipeline, type, fields) {
  const event = buildBatonEvent(context, state, pipeline, type, fields);
  appendJsonl(telemetryFile, event);
  return event;
}

function countTelemetryLines(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).length;
  } catch {
    return 0;
  }
}

// Count update_state op events (dispatch/finish/gate-bypass) appended after the
// line baseline. Each worker op bumps state.revision once and appends exactly one
// op event; malformed lines are skipped individually so one corrupt line cannot
// nuke the count, and coordinator events (baton_*/runner_*) never match the filter.
function countWorkerOps(file, baseline) {
  let lines;
  try {
    lines = fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).slice(Math.max(0, Number(baseline) || 0));
  } catch {
    return 0;
  }
  let count = 0;
  for (const line of lines) {
    try {
      const type = JSON.parse(line).type;
      if (type === 'dispatch' || type === 'finish' || type === 'gate-bypass') count += 1;
    } catch {
      // ignore malformed line
    }
  }
  return count;
}

function chunkGateOptions(options, maxPerQuestion = 3) {
  const list = [...options];
  const pages = [];
  for (let index = 0; index < list.length; index += maxPerQuestion) {
    pages.push(list.slice(index, index + maxPerQuestion));
  }
  return pages.length ? pages : [[]];
}

function formatGatePrompt(title, pageOptions, pageIndex = 0, pageCount = 1) {
  const lines = [String(title), ''];
  pageOptions.forEach((option, index) => {
    lines.push(`${index + 1}. ${option}${index === 0 && pageIndex === 0 ? ' (Recommended)' : ''}`);
  });
  if (pageCount > 1) lines.push(`(page ${pageIndex + 1} of ${pageCount}; answer "more" to page)`);
  return `${lines.join('\n')}\n`;
}

function resolveGateChoice({ autoMode, isTTY, options, input } = {}) {
  const list = [...(options || [])];
  if (!list.length) throw createError('STEPBATON_EMPTY_MAP', 'gate requires at least one option');
  if (autoMode === true) return { index: 0, choice: list[0], auto: true, nonTTY: false };
  if (isTTY === false) return { index: 0, choice: list[0], auto: false, nonTTY: true };
  const raw = String(input ?? '').trim().toLowerCase();
  if (!raw) return { index: 0, choice: list[0], auto: false, nonTTY: false };
  const asNumber = Number.parseInt(raw, 10);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= list.length) {
    return { index: asNumber - 1, choice: list[asNumber - 1], auto: false, nonTTY: false };
  }
  const found = list.findIndex((option) => String(option).toLowerCase().startsWith(raw));
  if (found >= 0) return { index: found, choice: list[found], auto: false, nonTTY: false };
  return { index: 0, choice: list[0], auto: false, nonTTY: false };
}

function promptInteractive(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(question);
    if (!stdin.isTTY) {
      resolve('');
      return;
    }
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk) => {
      stdin.pause();
      stdin.removeListener('data', onData);
      resolve(String(chunk || '').split('\n')[0] || '');
    };
    stdin.once('data', onData);
  });
}

function findSpecPath(usDir, slug) {
  const direct = path.join(usDir, `step-00-${slug}.spec.md`);
  if (fs.existsSync(direct)) return direct;
  try {
    for (const entry of fs.readdirSync(usDir)) {
      if (/^step-00-.*\.spec\.md$/.test(entry)) return path.join(usDir, entry);
    }
  } catch {
    // ignore
  }
  return direct;
}

function buildWorkerPrompt({ usDir, step, slug, workflowId, state, envelope }) {
  const specPath = findSpecPath(usDir, slug);
  const planIndex = fs.existsSync(path.join(usDir, 'plan.index.json'))
    ? path.join(usDir, 'plan.index.json')
    : path.join(usDir, '.runtime', 'plan.index.json');
  const ledgerPath = path.join(usDir, 'ac-ledger.json');
  const prior = state?.handoffs?.[String(Number(step) - 1)] || null;
  const lines = [
    `# Worker dispatch — step ${step} (baton)`,
    '',
    `Workflow ID: ${workflowId}`,
    `Slug: ${slug}`,
    `Step: ${step}`,
    '',
    'BATON ENVELOPE (JSON):',
    '```json',
    JSON.stringify(envelope),
    '```',
    '',
    'CONTEXT POINTERS:',
    `- Spec: ${specPath}`,
    `- Plan Index: ${planIndex}`,
    `- AC Ledger: ${ledgerPath}`,
    `- Prior Handoff: ${prior ? JSON.stringify(prior).slice(0, 2000) : '(none — first step)'}`,
    '',
    'INSTRUCTIONS:',
    '1. Read the referenced context pointers. Do not request full conversation history.',
    `2. Execute the actions required for step ${step}.`,
    `3. Call finish for step ${step} before exit (update_state finish --step ${step}).`,
    '4. Do not emit gates or prompts; the coordinator owns all user-gate surfacing.',
    '5. Turn rule: the FIRST response must contain BOTH the verbose preview AND at least 2 tool calls; a response with zero tool calls ends the turn as failed delivery. Do not end the turn after the preview.',
    '6. The final message starts with DONE plus the step-output envelope; required step artifacts must exist on disk before finish. The parent never pings a running turn; progress is observed via state writes only.',
    '',
  ];
  return { promptPath: path.join(usDir, '.runtime', `step-${step}-dispatch-prompt.md`), content: lines.join('\n') };
}

function killChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  if (process.platform === 'win32') {
    try {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      try {
        child.kill();
      } catch {
        // ignore
      }
    }
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, 2000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  try {
    child.kill('SIGTERM');
  } catch {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        if (child.exitCode === null) child.kill('SIGKILL');
      } catch {
        // ignore
      }
      resolve();
    }, 1000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function spawnWorker({ cmd, args, cwd, env, timeoutSeconds }) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(cmd, args, {
        cwd,
        env: { ...process.env, ...env },
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      reject(error);
      return;
    }
    let stdout = '';
    let stderr = '';
    const LIMIT = 1024 * 1024;
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
      if (stdout.length > LIMIT) stdout = stdout.slice(-LIMIT);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
      if (stderr.length > LIMIT) stderr = stderr.slice(-LIMIT);
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killChild(child).catch(() => {});
    }, Math.max(1, Number(timeoutSeconds)) * 1000);
    timer.unref?.();
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ exitCode: code === null ? null : code, signal: signal || null, timedOut, stdout, stderr });
    });
  });
}

function isNonEmptyFile(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function verifyAdvancement({ usDir, slug, pipeline, step, beforeCurrentStep, afterState }) {
  const maxStep = MAX_STEP[pipeline] ?? 9;
  const handoff = afterState?.handoffs?.[String(step)] || null;
  if (!handoff) {
    return { advanced: false, reason: 'missing-finish', detail: `no handoff recorded for step ${step}` };
  }
  if (handoff.status !== 'completed' && handoff.status !== 'skipped') {
    return { advanced: false, reason: 'missing-finish', detail: `step ${step} handoff is not completed (${handoff.status})` };
  }
  const afterStep = Number(afterState.currentStep);
  const isCloseOrLast = Number(step) >= maxStep;
  const stepped = afterStep > Number(beforeCurrentStep) || (isCloseOrLast && Array.isArray(afterState.completedSteps) && afterState.completedSteps.map(Number).includes(Number(step)));
  if (!stepped) {
    return { advanced: false, reason: 'missing-finish', detail: `currentStep did not advance (still ${afterStep})` };
  }
  const expected = finishArtifactNames(slug, Number(step), pipeline);
  // A reason-gated skip legitimately produces no artifact exactly when the canonical
  // pre-advance validator waives it; reuse that oracle so the two gates cannot drift.
  const skipWaived = handoff.status === 'skipped'
    && requiredAdvanceArtifacts(pipeline, Number(step) + 1, afterState).length === 0;
  const missing = skipWaived ? [] : expected.filter((name) => !isNonEmptyFile(path.join(usDir, name)));
  if (missing.length) {
    return { advanced: false, reason: 'missing-artifact', detail: `expected step artifacts missing: ${missing.join(', ')}` };
  }
  return { advanced: true, reason: 'advanced', detail: '' };
}

function specMemoEnabled(config) {
  if (config?.enableSpecMemoIntegration === true) return true;
  if (config?.specMemo?.enableSpecMemoIntegration === true) return true;
  if (config?.specMemo?.enabled === true && config?.specMemo?.mode !== 'local' && config?.specMemo?.mode !== 'disabled') return true;
  return false;
}

function mirrorSpecMemo({ config, repoRoot, handoff, envelope }) {
  if (!specMemoEnabled(config)) return { mirrored: false, reason: 'disabled' };
  const cliRaw = String(config?.specMemo?.cli || '').trim();
  if (!cliRaw) return { mirrored: false, reason: 'no-cli' };
  const parts = cliRaw.split(/\s+/).filter(Boolean);
  const bin = parts[0];
  const binArgs = parts.slice(1);
  const payload = {
    workflowId: String(handoff?.workflowId || ''),
    slug: String(handoff?.slug || ''),
    step: Number(handoff?.step ?? envelope?.step ?? 0),
    summary: String(handoff?.summary || ''),
    nextSteps: handoff?.nextAction ? [String(handoff.nextAction)] : [],
    holder: envelope?.holder || null,
  };
  const result = spawnSync(bin, [...binArgs, 'append', '--cwd', String(repoRoot)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 15000,
  });
  if (result.status !== 0) {
    return { mirrored: false, reason: `cli-exit-${result.status ?? 'signal'}` };
  }
  return { mirrored: true, reason: 'appended' };
}

// Canonical pre-advance oracle: the coordinator replaces the single-host
// orchestrator loop, so it must enforce the same fail-closed gate
// (validate_state.cjs --pre-advance N+1) after every verified advancement.
// Returns null when the gate passes, else the validator message.
function preAdvanceError({ context, pipeline, mdPath, currentStep }) {
  try {
    validateSnapshot({
      stateFile: mdPath,
      indexFile: plansIndexPath(context),
      context,
      maxStep: MAX_STEP[pipeline] ?? 9,
      pipeline,
      preAdvance: Number(currentStep) + 1,
    });
    return null;
  } catch (error) {
    return error && error.message ? error.message : String(error);
  }
}

async function runCoordinator(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    return { exitCode: EXIT_OK, output: 'Usage: node step_coordinator.cjs --state <file> [--config <file>] [--repo-root DIR] [--once] [--max-turns N]\n' };
  }
  if (!options.state) throw createError('STEPBATON_EMPTY_MAP', '--state is required');
  const repoRoot = options.repoRoot ? path.resolve(String(options.repoRoot)) : process.cwd();
  const context = resolveConsumerContext({ repoRoot, scriptFile: __filename });
  let config = context.config || {};
  if (options.config) {
    const configPath = path.isAbsolute(String(options.config)) ? String(options.config) : path.resolve(repoRoot, String(options.config));
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  const { jsonPath, mdPath } = resolveStatePaths(repoRoot, String(options.state));
  const usDir = path.dirname(fs.existsSync(jsonPath) ? jsonPath : mdPath);
  const telemetryFile = path.join(usDir, 'telemetry.jsonl');
  const maxTurns = options.maxTurns !== undefined ? Number(options.maxTurns) : 200;
  if (!Number.isInteger(maxTurns) || maxTurns < 1) throw createError('STEPBATON_MAX_ATTEMPTS_INVALID', '--max-turns must be an integer >= 1');

  const loaded = loadStateDisk(jsonPath, mdPath);
  const pipeline = loaded.state.workflowType === 'lite' ? 'lite' : 'standard';
  let runConfig;
  try {
    runConfig = validateRunConfig(config, pipeline);
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    return { exitCode: EXIT_CONFIG };
  }
  if (!Object.keys(runConfig.stepRunners).length) {
    process.stderr.write('ERROR: defaults.stepRunners is empty: nothing for the coordinator to drive (STEPBATON_EMPTY_MAP)\n');
    return { exitCode: EXIT_CONFIG };
  }
  const autoMode = config?.defaults?.autoMode === true;
  const attempts = new Map();
  let turns = 0;

  const indexSync = { context, pipeline, maxStep: MAX_STEP[pipeline] ?? 9 };
  const persist = (state) => {
    state.revision = Number(state.revision || 0) + 1;
    syncStateDualWrite(mdPath, state, { body: null, jsonText: null });
    refreshPlansIndexForState(context, state, { ...indexSync, stateFile: mdPath });
  };

  for (;;) {
    turns += 1;
    if (turns > maxTurns) {
      process.stderr.write(`ERROR: coordinator exceeded --max-turns ${maxTurns}\n`);
      return { exitCode: EXIT_BLOCKED };
    }
    const disk = loadStateDisk(jsonPath, mdPath);
    const state = disk.state;
    const status = String(state.status || 'active');
    if (TERMINAL_STATUSES.has(status)) {
      process.stdout.write(`coordinator done: status=${status} step=${state.currentStep}\n`);
      return { exitCode: status === 'completed' ? EXIT_OK : EXIT_BLOCKED };
    }
    const currentStep = Number(state.currentStep);
    const runnerId = resolveMappedRunner(config, currentStep);
    if (!runnerId) {
      const beforeStep = currentStep;
      const beforeRevision = Number(state.revision || 0);
      process.stdout.write(`coordinator: step ${currentStep} unmapped; waiting for single-host dispatch (poll ${runConfig.pollIntervalSeconds}s)\n`);
      if (options.once) return { exitCode: EXIT_OK };
      sleepSync(runConfig.pollIntervalSeconds * 1000);
      const again = loadStateDisk(jsonPath, mdPath).state;
      if (Number(again.currentStep) !== beforeStep || Number(again.revision || 0) !== beforeRevision) {
        process.stdout.write(`coordinator: external advancement detected: step ${beforeStep} -> ${again.currentStep}\n`);
      }
      continue;
    }
    const runner = runConfig.runners[runnerId];
    if (!runner) {
      process.stderr.write(`ERROR: unknown runner id ${JSON.stringify(runnerId)} for step ${currentStep} (RUNNER_UNKNOWN_ID)\n`);
      return { exitCode: EXIT_CONFIG };
    }

    // Gate at coordinator (pause-and-prompt, or index 0 in autoMode).
    const gateOptions = ['Next', 'More options...'];
    const pages = chunkGateOptions(gateOptions, 3);
    if (autoMode) {
      process.stdout.write(`auto-gate-apply | coordinator-step-${currentStep} | Next | ${nowIso()}\n`);
    } else if (!process.stdin.isTTY) {
      process.stdout.write(`coordinator: non-TTY gate default Next for step ${currentStep}\n`);
    } else {
      const answer = await promptInteractive(formatGatePrompt(`Coordinator gate — step ${currentStep} (runner ${runnerId})`, pages[0], 0, pages.length));
      const picked = resolveGateChoice({ autoMode: false, isTTY: true, options: pages[0], input: answer });
      process.stdout.write(`user-gate-modal | coordinator-step-${currentStep} | ${picked.choice} | ${nowIso()}\n`);
      if (picked.index !== 0) {
        process.stdout.write('coordinator: gate choice is not Next; stopping (HS-1)\n');
        return { exitCode: EXIT_BLOCKED };
      }
    }

    // Expiry check before claim.
    const attempt = (attempts.get(currentStep) || 0) + 1;
    normalizeBaton(state);
    const expiry = expiryState(state, { now: Date.now() });
    if (expiry.expired) {
      attempts.set(currentStep, attempt);
      emitTelemetry(telemetryFile, context, state, pipeline, 'baton_lease_expired', {
        step: currentStep, holder: expiry.holder, attempt, cause: 'lease-expired',
      });
      process.stdout.write(`coordinator: baton lease expired (holder=${expiry.holder} step=${expiry.step} attempt=${attempt})\n`);
      if (attempt >= runConfig.maxAttempts) {
        state.status = 'blocked';
        persist(state);
        process.stderr.write(`ERROR: step ${currentStep} exceeded maxAttempts ${runConfig.maxAttempts} (RUN_MAX_ATTEMPTS_EXCEEDED)\n`);
        return { exitCode: EXIT_BLOCKED };
      }
    }

    // Claim inside the lock with changed-underfoot detection.
    const beforeClaimRevision = Number(loadStateDisk(jsonPath, mdPath).state.revision || 0);
    const beforeClaimStep = Number(loadStateDisk(jsonPath, mdPath).state.currentStep);
    let baton;
    let leaseUntil;
    try {
      baton = withBatonLock(usDir, () => {
        const fresh = loadStateDisk(jsonPath, mdPath).state;
        if (Number(fresh.revision || 0) !== beforeClaimRevision) {
          if (Number(fresh.currentStep) !== beforeClaimStep) {
            process.stdout.write(`coordinator: external advancement detected: step ${beforeClaimStep} -> ${fresh.currentStep}\n`);
            return null;
          }
          throw createError('STATE_CHANGED_UNDERFOOT', `state revision changed underfoot (${beforeClaimRevision} -> ${fresh.revision}) with no step advance`);
        }
        normalizeBaton(fresh);
        const nowMs = Date.now();
        leaseUntil = computeLeaseUntil(nowMs, runner.timeoutSeconds);
        const claimed = claimBaton(fresh, {
          step: currentStep,
          holder: runnerId,
          expectedRevision: fresh.baton.revision,
          now: nowMs,
          leaseUntil,
        });
        fresh.revision = Number(fresh.revision || 0) + 1;
        syncStateDualWrite(mdPath, fresh, { body: null, jsonText: null });
        refreshPlansIndexForState(context, fresh, { ...indexSync, stateFile: mdPath });
        const reread = loadStateDisk(jsonPath, mdPath).state;
        if (Number(reread?.baton?.revision) !== claimed.revision || reread?.baton?.holder !== runnerId) {
          throw createError('BATON_REVISION_CONFLICT', 'baton claim lost the write-then-reread check');
        }
        if (Number(reread.revision || 0) !== Number(fresh.revision)) {
          throw createError('STATE_CHANGED_UNDERFOOT', 'state revision changed underfoot during claim write');
        }
        return claimed;
      }, { retries: 3, backoffBaseMs: 50 });
    } catch (error) {
      if (error && error.code === 'STATE_CHANGED_UNDERFOOT') {
        process.stderr.write(`ERROR: ${error.message}\n`);
        return { exitCode: EXIT_UNDERFOOT };
      }
      if (error && error.code === 'BATON_REVISION_CONFLICT') {
        attempts.set(currentStep, attempt);
        process.stdout.write(`coordinator: claim conflict on step ${currentStep} (attempt ${attempt}); backing off\n`);
        if (attempt >= runConfig.maxAttempts) {
          const blocked = loadStateDisk(jsonPath, mdPath).state;
          blocked.status = 'blocked';
          persist(blocked);
          process.stderr.write(`ERROR: step ${currentStep} exceeded maxAttempts ${runConfig.maxAttempts} (RUN_MAX_ATTEMPTS_EXCEEDED)\n`);
          return { exitCode: EXIT_BLOCKED };
        }
        sleepSync(computeBackoffMs(attempt, 100, 2000));
        continue;
      }
      if (error && (error.code === 'BATON_LEASE_HELD' || error.code === 'BATON_WRONG_STEP')) {
        process.stderr.write(`ERROR: ${error.message}\n`);
        return { exitCode: EXIT_BLOCKED };
      }
      throw error;
    }
    if (!baton) continue;

    emitTelemetry(telemetryFile, context, loadStateDisk(jsonPath, mdPath).state, pipeline, 'baton_claimed', {
      step: currentStep, holder: runnerId, attempt,
    });

    // Worker prompt file + spawn.
    const envelope = buildBatonEnvelope({ step: currentStep, holder: runnerId, leaseUntil, attempt });
    const prompt = buildWorkerPrompt({
      usDir,
      step: currentStep,
      slug: String(loadStateDisk(jsonPath, mdPath).state.slug || ''),
      workflowId: String(loadStateDisk(jsonPath, mdPath).state.workflowId || ''),
      state: loadStateDisk(jsonPath, mdPath).state,
      envelope,
    });
    fs.mkdirSync(path.dirname(prompt.promptPath), { recursive: true });
    fs.writeFileSync(prompt.promptPath, prompt.content, 'utf8');
    let argv;
    try {
      argv = resolveRunnerArgv(runner, {
        prompt: prompt.promptPath,
        cwd: repoRoot,
        slug: String(loadStateDisk(jsonPath, mdPath).state.slug || ''),
        step: currentStep,
      });
    } catch (error) {
      process.stderr.write(`ERROR: ${error.message}\n`);
      return { exitCode: EXIT_CONFIG };
    }
    emitTelemetry(telemetryFile, context, loadStateDisk(jsonPath, mdPath).state, pipeline, 'runner_spawned', {
      step: currentStep, holder: runnerId, attempt,
    });
    const telemetryBaseline = countTelemetryLines(telemetryFile);
    let result;
    try {
      result = await spawnWorker({ cmd: argv.cmd, args: argv.args, cwd: repoRoot, env: runner.env, timeoutSeconds: runner.timeoutSeconds });
    } catch (error) {
      emitTelemetry(telemetryFile, context, loadStateDisk(jsonPath, mdPath).state, pipeline, 'runner_exited', {
        step: currentStep, holder: runnerId, attempt, exitCode: null, cause: 'spawn-error',
      });
      attempts.set(currentStep, attempt);
      process.stdout.write(`coordinator: worker spawn failed for step ${currentStep}: ${error.message}\n`);
      if (attempt >= runConfig.maxAttempts) {
        const blocked = loadStateDisk(jsonPath, mdPath).state;
        blocked.status = 'blocked';
        persist(blocked);
        return { exitCode: EXIT_BLOCKED };
      }
      releaseOwnBaton(mdPath, jsonPath, runnerId, indexSync);
      sleepSync(computeBackoffMs(attempt, 100, 2000));
      continue;
    }

    const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
    if (isGateShapedOutput(combinedOutput)) {
      emitTelemetry(telemetryFile, context, loadStateDisk(jsonPath, mdPath).state, pipeline, 'runner_exited', {
        step: currentStep, holder: runnerId, attempt, exitCode: result.exitCode, cause: 'gate-violation',
      });
      attempts.set(currentStep, attempt);
      process.stdout.write(`coordinator: worker protocol violation on step ${currentStep}: gate-shaped output (WORKER_GATE_VIOLATION)\n`);
      if (attempt >= runConfig.maxAttempts) {
        const blocked = loadStateDisk(jsonPath, mdPath).state;
        blocked.status = 'blocked';
        persist(blocked);
        return { exitCode: EXIT_BLOCKED };
      }
      releaseOwnBaton(mdPath, jsonPath, runnerId, indexSync);
      sleepSync(computeBackoffMs(attempt, 100, 2000));
      continue;
    }
    if (result.timedOut) {
      emitTelemetry(telemetryFile, context, loadStateDisk(jsonPath, mdPath).state, pipeline, 'runner_exited', {
        step: currentStep, holder: runnerId, attempt, exitCode: result.exitCode, cause: 'timeout',
      });
      attempts.set(currentStep, attempt);
      process.stdout.write(`coordinator: worker timeout on step ${currentStep} after ${runner.timeoutSeconds}s (RUNNER_TIMEOUT)\n`);
      if (attempt >= runConfig.maxAttempts) {
        const blocked = loadStateDisk(jsonPath, mdPath).state;
        blocked.status = 'blocked';
        persist(blocked);
        return { exitCode: EXIT_BLOCKED };
      }
      releaseOwnBaton(mdPath, jsonPath, runnerId, indexSync);
      sleepSync(computeBackoffMs(attempt, 100, 2000));
      continue;
    }
    if (result.exitCode !== 0) {
      emitTelemetry(telemetryFile, context, loadStateDisk(jsonPath, mdPath).state, pipeline, 'runner_exited', {
        step: currentStep, holder: runnerId, attempt, exitCode: result.exitCode, cause: 'nonzero-exit',
      });
      attempts.set(currentStep, attempt);
      process.stdout.write(`coordinator: worker nonzero exit on step ${currentStep}: ${result.exitCode} (WORKER_NONZERO_EXIT)\n`);
      if (attempt >= runConfig.maxAttempts) {
        const blocked = loadStateDisk(jsonPath, mdPath).state;
        blocked.status = 'blocked';
        persist(blocked);
        return { exitCode: EXIT_BLOCKED };
      }
      releaseOwnBaton(mdPath, jsonPath, runnerId, indexSync);
      sleepSync(computeBackoffMs(attempt, 100, 2000));
      continue;
    }
    emitTelemetry(telemetryFile, context, loadStateDisk(jsonPath, mdPath).state, pipeline, 'runner_exited', {
      step: currentStep, holder: runnerId, attempt, exitCode: result.exitCode,
    });

    // Worker-turn guard (fail fast): a preview-only (zero-tool-call) or
    // unwritten-artifact turn resolves as failed with a named signal, never
    // completed, instead of a generic no-finish after artifact timeouts.
    const turnVerdict = guard.classifyTurn({
      toolCalls: guard.extractToolCalls(combinedOutput),
      requiredArtifacts: finishArtifactNames(String(loadStateDisk(jsonPath, mdPath).state.slug || ''), currentStep, pipeline),
      usDir,
    });
    if (turnVerdict.verdict === 'failed') {
      emitTelemetry(telemetryFile, context, loadStateDisk(jsonPath, mdPath).state, pipeline, turnVerdict.signal, {
        step: currentStep, holder: runnerId, attempt, cause: turnVerdict.reason,
      });
      attempts.set(currentStep, attempt);
      process.stdout.write(`coordinator: worker turn guard failed on step ${currentStep}: ${turnVerdict.reason} (${turnVerdict.signal})\n`);
      if (attempt >= runConfig.maxAttempts) {
        const blocked = loadStateDisk(jsonPath, mdPath).state;
        blocked.status = 'blocked';
        persist(blocked);
        return { exitCode: EXIT_BLOCKED };
      }
      releaseOwnBaton(mdPath, jsonPath, runnerId, indexSync);
      sleepSync(computeBackoffMs(attempt, 100, 2000));
      continue;
    }

    // Post-exit verification: revision guard + advancement + artifacts.
    const after = loadStateDisk(jsonPath, mdPath).state;
    // Every legitimate worker write goes through update_state, which bumps the
    // revision once and appends exactly one dispatch/finish event per op; the
    // coordinator claim is the only other writer. Derive the allowed delta from
    // the events actually recorded this turn instead of a fixed +2 window (a
    // plain dispatch + finish is already +3 relative to the pre-claim revision).
    // The +1 slack covers a suppressed duplicate/idempotent finish, which bumps
    // the revision without appending an event.
    const workerWrites = countWorkerOps(telemetryFile, telemetryBaseline);
    const revisionDelta = Number(after.revision || 0) - beforeClaimRevision;
    if (revisionDelta < 1 || revisionDelta - 1 > workerWrites + 1) {
      process.stderr.write(`ERROR: state revision changed underfoot on step ${currentStep} (${beforeClaimRevision} -> ${after.revision}) (STATE_CHANGED_UNDERFOOT)\n`);
      return { exitCode: EXIT_UNDERFOOT };
    }
    const check = verifyAdvancement({
      usDir,
      slug: String(after.slug || ''),
      pipeline,
      step: currentStep,
      beforeCurrentStep: currentStep,
      afterState: after,
    });
    if (!check.advanced) {
      attempts.set(currentStep, attempt);
      process.stdout.write(`coordinator: step ${currentStep} did not advance: ${check.detail} (WORKER_NO_FINISH)\n`);
      const reseated = loadStateDisk(jsonPath, mdPath).state;
      const cannotRetry = Number(reseated.currentStep) !== currentStep;
      if (cannotRetry) {
        process.stdout.write(`coordinator: step ${currentStep} left current while its contract is unmet; blocking for operator\n`);
      }
      if (cannotRetry || attempt >= runConfig.maxAttempts) {
        const blocked = loadStateDisk(jsonPath, mdPath).state;
        blocked.status = 'blocked';
        persist(blocked);
        return { exitCode: EXIT_BLOCKED };
      }
      releaseOwnBaton(mdPath, jsonPath, runnerId, indexSync);
      sleepSync(computeBackoffMs(attempt, 100, 2000));
      continue;
    }
    // Canonical pre-advance gate (HS-5): verifyAdvancement covers the finished
    // step's own contract; the validator covers everything single-host
    // enforces before the next dispatch (ledger score/aliases/commits, plan
    // index, artifact identity). A gate-weak finish reproduces under retry,
    // so fail closed like the single-host loop instead of retrying.
    const gateError = preAdvanceError({ context, pipeline, mdPath, currentStep });
    if (gateError) {
      process.stderr.write(`ERROR: step ${currentStep} failed pre-advance ${currentStep + 1}: ${gateError}\n`);
      const blocked = loadStateDisk(jsonPath, mdPath).state;
      blocked.status = 'blocked';
      persist(blocked);
      return { exitCode: EXIT_BLOCKED };
    }
    // Success: force-clear a stale held baton, emit release, mirror, reset counter.
    const settled = loadStateDisk(jsonPath, mdPath).state;
    if (settled?.baton?.holder) {
      releaseOwnBaton(mdPath, jsonPath, runnerId, indexSync);
    }
    attempts.delete(currentStep);
    const released = loadStateDisk(jsonPath, mdPath).state;
    emitTelemetry(telemetryFile, context, released, pipeline, 'baton_released', {
      step: currentStep, holder: runnerId, attempt,
    });
    const handoff = released?.handoffs?.[String(currentStep)] || null;
    if (handoff) {
      const mirror = mirrorSpecMemo({ config, repoRoot, handoff, envelope });
      if (mirror.mirrored) process.stdout.write(`coordinator: mirrored step ${currentStep} handoff to vault\n`);
    }
    process.stdout.write(`coordinator: step ${currentStep} advanced to ${released.currentStep}\n`);
    if (options.once) return { exitCode: EXIT_OK };
  }
}

function releaseOwnBaton(mdPath, jsonPath, holder, indexSync) {
  try {
    const usDir = path.dirname(mdPath);
    // Same lock as the claim path: re-read and re-check the holder on fresh
    // disk state inside the lock, so a claim that won the lock in between is
    // never overwritten (the holder check under the shared lock is the CAS).
    withBatonLock(usDir, () => {
      const disk = loadStateDisk(jsonPath, mdPath);
      const state = disk.state;
      normalizeBaton(state);
      if (!state.baton.holder) return;
      if (typeof holder === 'string' && holder && state.baton.holder !== holder) return;
      state.baton = {
        holder: null,
        step: Number(state.currentStep),
        claimedAt: state.baton.claimedAt,
        leaseUntil: null,
        revision: state.baton.revision + 1,
      };
      state.revision = Number(state.revision || 0) + 1;
      syncStateDualWrite(mdPath, state, { body: null, jsonText: null });
      if (indexSync?.context) {
        refreshPlansIndexForState(indexSync.context, state, { ...indexSync, stateFile: mdPath });
      }
    }, { retries: 3, backoffBaseMs: 50 });
  } catch {
    // best effort: next claim will surface the held lease
  }
}

async function main() {
  try {
    const result = await runCoordinator(process.argv.slice(2));
    if (result && result.output) process.stdout.write(result.output);
    process.exitCode = result ? result.exitCode : EXIT_OK;
  } catch (error) {
    if (error && typeof error.code === 'string' && /^(RUNNER_|STEPBATON_|BATON_|WORKER_|STATE_|RUN_)/.test(error.code)) {
      process.stderr.write(`ERROR: ${error.message}\n`);
      if (error.code === 'STATE_CHANGED_UNDERFOOT') {
        process.exitCode = EXIT_UNDERFOOT;
        return;
      }
      process.exitCode = EXIT_CONFIG;
      return;
    }
    process.stderr.write(`ERROR: ${error && error.message ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  EXIT_OK,
  EXIT_BLOCKED,
  EXIT_CONFIG,
  EXIT_UNDERFOOT,
  parseArgs,
  chunkGateOptions,
  formatGatePrompt,
  resolveGateChoice,
  buildWorkerPrompt,
  spawnWorker,
  verifyAdvancement,
  preAdvanceError,
  mirrorSpecMemo,
  specMemoEnabled,
  buildBatonEvent,
  runCoordinator,
  releaseOwnBaton,
  countTelemetryLines,
  countWorkerOps,
};
