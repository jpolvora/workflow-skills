#!/usr/bin/env node
'use strict';

// dispatch_subagent_task.cjs — standalone subagent task dispatch.
//
// CLI:
//   node dispatch_subagent_task.cjs --subagent <name> --task "<directive>"
//     [--payload '{"k":"v"}'] [--json] [--repo-root <dir>] [--timeout-ms <n>]
//   (also reachable as `workflow-skills dispatch …`; the `antigravity
//   dispatch` spelling in the originating request is that harness's alias.)
//
// API:
//   const { dispatchSubagentTask } = require('./dispatch_subagent_task.cjs');
//   await dispatchSubagentTask({ subagent, task, payload }, { executor, repoRoot, timeoutMs });
//
// Execution resolves in order: explicit `executor` option → configured
// `defaults.hostAdapter.cliTemplate` runner → structured failure (no phantom
// success when no runner exists). Spawns never use a shell: the template is
// tokenized quote-aware first, then {prompt}/{cwd}/{slug} are substituted per
// argv element, so payload JSON is never shell-interpolated.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
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
const { resolveConsumerContext } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const DEFAULT_TIMEOUT_MS = 120000;

// Fail-closed identifier rule: no path separators, no traversal, no shell
// metacharacters — the name may travel into argv templates and file paths.
const SUBAGENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
  }
}

function validateInput({ subagent, task, payload }) {
  if (typeof subagent !== 'string' || !subagent.trim()) {
    throw new ValidationError('missing required subagent (non-empty string)');
  }
  if (!SUBAGENT_RE.test(subagent) || subagent.includes('..')) {
    throw new ValidationError(
      `invalid subagent "${subagent}" (allowed: letters, digits, dot, underscore, hyphen; no traversal)`
    );
  }
  if (typeof task !== 'string' || !task.trim()) {
    throw new ValidationError('missing required task (non-empty string)');
  }
  if (payload === undefined) return { subagent, task, payload: {} };
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('invalid payload (expected a JSON object)');
  }
  return { subagent, task, payload };
}

// Quote-aware argv tokenizer: double-quoted segments stay whole (quotes
// removed). Inside quotes a backslash escapes only a following quote or
// backslash; otherwise it stays literal so Windows paths survive.
function tokenizeTemplate(template) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  let hasCurrent = false;
  const push = () => {
    if (hasCurrent) parts.push(current);
    current = '';
    hasCurrent = false;
  };
  for (let i = 0; i < template.length; i += 1) {
    const ch = template[i];
    if (inQuotes) {
      if (ch === '\\' && i + 1 < template.length && (template[i + 1] === '"' || template[i + 1] === '\\')) {
        current += template[i + 1];
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
      hasCurrent = true;
    } else if (ch === '"') {
      inQuotes = true;
      hasCurrent = true;
    } else if (/\s/.test(ch)) {
      push();
    } else {
      current += ch;
      hasCurrent = true;
    }
  }
  if (inQuotes) throw new ValidationError('invalid cliTemplate (unterminated quote)');
  push();
  return parts.filter((part) => part.length > 0);
}

function substituteTokens(argv, { prompt, cwd, slug }) {
  return argv.map((part) => part
    .split('{prompt}').join(prompt)
    .split('{cwd}').join(cwd)
    .split('{slug}').join(slug));
}

function runTemplate(template, envelope, { cwd, timeoutMs }) {
  const argv = substituteTokens(tokenizeTemplate(template), {
    prompt: JSON.stringify(envelope),
    cwd,
    slug: envelope.subagent,
  });
  if (!argv.length) return Promise.reject(new ValidationError('invalid cliTemplate (empty after tokenize)'));
  const [command, ...args] = argv;
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let child;
    try {
      child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    } catch (error) {
      resolve({ ok: false, error: `spawn failed: ${error.message}` });
      return;
    }
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, durationMs: Date.now() - startedAt });
    };
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        // Already exited; the close handler settles below.
      }
      finish({ ok: false, error: `subagent runner timed out after ${timeoutMs}ms`, timedOut: true, output: stdout, stderr });
    }, timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
    child.on('error', (error) => {
      finish({ ok: false, error: `subagent runner failed: ${error.message}` });
    });
    child.on('close', (code, signal) => {
      if (code === 0) {
        finish({ ok: true, exitCode: 0, output: stdout, stderr });
      } else {
        finish({
          ok: false,
          error: `subagent runner exited ${code === null ? `on signal ${signal}` : `with code ${code}`}${stderr.trim() ? `: ${stderr.trim().split(/\r?\n/)[0]}` : ''}`,
          exitCode: code,
          output: stdout,
          stderr,
        });
      }
    });
  });
}

function resolveCliTemplate(repoRoot) {
  try {
    const context = resolveConsumerContext({ repoRoot, scriptFile: __filename });
    const template = context
      && context.config && context.config.defaults && context.config.defaults.hostAdapter
      && context.config.defaults.hostAdapter.cliTemplate;
    return {
      template: typeof template === 'string' && template.trim() ? template.trim() : null,
      repoRoot: (context && context.repoRoot) || repoRoot || process.cwd(),
    };
  } catch {
    return { template: null, repoRoot: repoRoot || process.cwd() };
  }
}

async function dispatchSubagentTask(input, options = {}) {
  const startedAt = Date.now();
  let validated;
  try {
    validated = validateInput(input || {});
  } catch (error) {
    return Promise.reject(error);
  }
  const { subagent, task, payload } = validated;
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0
    ? Number(options.timeoutMs)
    : DEFAULT_TIMEOUT_MS;
  const envelope = { subagent, task, payload };

  try {
    if (typeof options.executor === 'function') {
      const produced = await options.executor(envelope);
      return {
        ok: true,
        subagent,
        task,
        payload,
        durationMs: Date.now() - startedAt,
        output: typeof produced === 'string' ? produced : JSON.stringify(produced ?? null),
      };
    }
    const { template, repoRoot } = resolveCliTemplate(options.repoRoot);
    if (!template) {
      return {
        ok: false,
        subagent,
        task,
        payload,
        durationMs: Date.now() - startedAt,
        error: 'no subagent runner configured (set defaults.hostAdapter.cliTemplate or pass an executor)',
        code: 'NO_RUNNER',
      };
    }
    const spawned = await runTemplate(template, envelope, { cwd: repoRoot, timeoutMs });
    return { subagent, task, payload, ...spawned };
  } catch (error) {
    // Executor throws, rejects, or the spawn path faults: structured failure,
    // never an unhandled rejection or an orphaned child (the child is reaped
    // by the close handler; timeouts SIGKILL first).
    return {
      ok: false,
      subagent,
      task,
      payload,
      durationMs: Date.now() - startedAt,
      error: error && error.message ? error.message : String(error),
    };
  }
}

function parseArgs(argv) {
  const options = {
    subagent: null,
    task: null,
    payload: undefined,
    payloadRaw: null,
    json: false,
    repoRoot: null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--subagent') {
      options.subagent = argv[++index] ?? null;
    } else if (arg === '--task') {
      options.task = argv[++index] ?? null;
    } else if (arg === '--payload') {
      options.payloadRaw = argv[++index] ?? null;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--repo-root') {
      options.repoRoot = argv[++index] ?? null;
    } else if (arg === '--timeout-ms') {
      options.timeoutMs = argv[++index] ?? null;
    } else if (arg.startsWith('--subagent=')) {
      options.subagent = arg.slice('--subagent='.length);
    } else if (arg.startsWith('--task=')) {
      options.task = arg.slice('--task='.length);
    } else if (arg.startsWith('--payload=')) {
      options.payloadRaw = arg.slice('--payload='.length);
    } else if (arg.startsWith('--repo-root=')) {
      options.repoRoot = arg.slice('--repo-root='.length);
    } else if (arg.startsWith('--timeout-ms=')) {
      options.timeoutMs = arg.slice('--timeout-ms='.length);
    } else {
      printError(`unknown argument: ${arg}`, options.json, {});
      process.exit(1);
    }
  }
  return options;
}

function printHelp() {
  process.stdout.write(`Usage:
  node dispatch_subagent_task.cjs --subagent <name> --task "<directive>" [--payload '{"k":"v"}'] [--json] [--repo-root <dir>] [--timeout-ms <n>]
  workflow-skills dispatch --subagent <name> --task "<directive>" [--payload '{"k":"v"}'] [--json]

Dispatch one subagent task through the configured runner
(defaults.hostAdapter.cliTemplate). --payload must be a JSON object.
--json prints the result envelope on stdout (errors included).
Exit 0 on dispatched success, 1 on validation or dispatch failure.
`);
}

function printError(message, asJson, envelope) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify({ ok: false, ...envelope, error: message })}\n`);
  } else {
    process.stderr.write(`ERROR: ${message}\n`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const envelope = {};
  if (options.subagent != null) envelope.subagent = options.subagent;
  if (options.task != null) envelope.task = options.task;
  if (options.subagent == null || options.task == null) {
    const missing = [options.subagent == null ? '--subagent' : null, options.task == null ? '--task' : null]
      .filter(Boolean).join(' and ');
    printError(`missing required ${missing}`, options.json, envelope);
    process.exit(1);
  }
  let payload;
  if (options.payloadRaw != null) {
    try {
      payload = JSON.parse(options.payloadRaw);
    } catch {
      printError('invalid --payload (expected JSON)', options.json, envelope);
      process.exit(1);
    }
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      printError('invalid --payload (expected a JSON object)', options.json, envelope);
      process.exit(1);
    }
  }
  let result;
  try {
    result = await dispatchSubagentTask(
      { subagent: options.subagent, task: options.task, payload },
      { repoRoot: options.repoRoot, timeoutMs: options.timeoutMs },
    );
  } catch (error) {
    // Validation rejections surface here; executor faults resolve to {ok:false}.
    printError(error && error.message ? error.message : String(error), options.json, envelope);
    process.exit(1);
  }
  if (!result.ok) {
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } else {
      process.stderr.write(`ERROR: ${result.error}\n`);
    }
    process.exit(1);
  }
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else {
    process.stdout.write(`dispatching subagent "${result.subagent}" task "${result.task}"\n`);
    process.stdout.write(`payload keys: ${Object.keys(result.payload || {}).length}\n`);
    process.stdout.write(`ok in ${result.durationMs}ms (exit ${result.exitCode ?? 0})\n`);
    if (result.output && result.output.trim()) process.stdout.write(`${result.output.trimEnd()}\n`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`ERROR: ${error && error.message ? error.message : String(error)}\n`);
    process.exit(1);
  });
}

module.exports = {
  dispatchSubagentTask,
  ValidationError,
  DEFAULT_TIMEOUT_MS,
};
