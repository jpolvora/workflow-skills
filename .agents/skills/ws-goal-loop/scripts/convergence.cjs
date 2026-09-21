#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
// Managed runtime loads from its skills installation: the project-local
// skills tree ({skillsRoot}/ws-shared) or the global skills tree
// ({globalSkillsRoot}/ws-shared, override via WORKFLOW_SKILLS_GLOBAL_DIR).
// An explicit WORKFLOW_SKILLS_SHARED_DIR selects the shared hub root
// (<hub>/runtime/scripts is used). The project consumer hub (<repo>/.ws)
// holds only local config variable files (config.json, STACK.md, memory,
// changelog) and is not a managed-runtime source.
const HUB_SCRIPTS_DIR = (() => {
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
})();
const { resolveConsumerContext, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    options[token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++index];
  }
  if (!options.input) throw new Error('--input is required');
  return options;
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  const descriptor = fs.openSync(temporary, 'w');
  try {
    fs.writeFileSync(descriptor, content, 'utf8');
    try {
      fs.fsyncSync(descriptor);
    } catch (error) {
      if (!error || !['EPERM', 'EINVAL'].includes(error.code)) throw error;
    }
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temporary, file);
}

function checkStates(payload) {
  if (Array.isArray(payload.checks)) return payload.checks.map((item) => String(item.state || item.status || '').toLowerCase());
  if (Array.isArray(payload.requiredChecks)) return payload.requiredChecks.map((item) => String(item.state || item.status || '').toLowerCase());
  return [];
}

function classify(payload) {
  const states = checkStates(payload);
  const failure = states.some((state) => ['failed', 'failure', 'cancelled', 'error', 'timed_out'].includes(state));
  const running = states.some((state) => ['running', 'in_progress'].includes(state));
  const queued = states.some((state) => ['queued', 'pending', 'waiting', 'requested'].includes(state));
  const concluded = states.length > 0 && states.every((state) => ['success', 'succeeded', 'passed', 'completed', 'skipped', 'neutral'].includes(state));
  const activeThreads = Array.isArray(payload.activeThreads) ? payload.activeThreads.length : Number(payload.activeThreads || 0);
  if (activeThreads === 0 && concluded && !failure) return { action: 'done', ciState: 'concluded', activeThreads };
  if (failure) return { action: 'act', ciState: 'failed', activeThreads };
  if (running) return { action: 'wait', ciState: 'running', activeThreads };
  if (queued || !states.length) return { action: 'wait', ciState: queued ? 'queued' : 'absent', activeThreads };
  return { action: activeThreads ? 'act' : 'wait', ciState: 'unknown', activeThreads };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const payload = JSON.parse(fs.readFileSync(path.resolve(context.repoRoot, options.input), 'utf8'));
  const config = context.config?.defaults?.convergence || {};
  const policy = {
    initialDelaySec: Number(config.initialDelaySec ?? 0),
    minPollSec: Number(config.minPollSec ?? 30),
    maxPollSec: Number(config.maxPollSec ?? 300),
    backoff: Number(config.backoff ?? 1.5),
    maxIterations: Number(config.maxIterations ?? 20),
  };
  if (policy.minPollSec < 0 || policy.maxPollSec < policy.minPollSec || policy.backoff < 1 || policy.maxIterations < 1) {
    throw new Error('invalid defaults.convergence policy');
  }
  const round = Number(options.round || 1);
  const observed = classify(payload);
  const previous = Number(options.previousInterval || policy.minPollSec);
  let intervalSec = 0;
  if (observed.action === 'wait') {
    intervalSec = observed.ciState === 'running'
      ? policy.minPollSec
      : Math.min(policy.maxPollSec, Math.max(policy.minPollSec, Math.ceil(previous * policy.backoff)));
    if (['queued', 'absent'].includes(observed.ciState)) intervalSec = policy.maxPollSec;
  }
  const result = {
    schemaVersion: 1,
    round,
    observedAt: new Date().toISOString(),
    ...observed,
    intervalSec,
    armHeartbeat: observed.action === 'wait' && intervalSec > 0,
    terminal: observed.action === 'done',
    maxIterations: policy.maxIterations,
  };
  if (options.roundLog) {
    const output = path.resolve(context.repoRoot, options.roundLog);
    atomicWrite(output, [
      `# Convergence round ${round}`,
      '',
      `- Observed: ${result.observedAt}`,
      `- Active threads: ${result.activeThreads}`,
      `- CI state: ${result.ciState}`,
      `- Action: ${result.action}`,
      `- Chosen interval: ${result.intervalSec}s`,
      '',
    ].join('\n'));
    result.roundLog = toRepoRelative(context.repoRoot, output);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
