#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_POLL_SECONDS = 30;
const MIN_POLL_SECONDS = 5;
const MAX_POLL_SECONDS = 300;
const DEFAULT_MAX_ATTEMPTS = 2;
const LEASE_MULTIPLIER = 3;

const STANDARD_MAX_STEP = 9;
const LITE_MAX_STEP = 5;

const GATE_TOKENS = [
  'user-gate',
  'Transition Gate',
  'Transition Gates',
  'Orchestrator session model:',
  'More options...',
  'More options\u2026',
];

function createError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function normalizeBaton(state) {
  const raw = state && typeof state.baton === 'object' && state.baton !== null ? state.baton : {};
  const revision = Number.isInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0;
  const baton = {
    holder: typeof raw.holder === 'string' && raw.holder ? raw.holder : null,
    step: Number.isInteger(raw.step) ? raw.step : Number(state?.currentStep || 0),
    claimedAt: typeof raw.claimedAt === 'string' && raw.claimedAt ? raw.claimedAt : null,
    leaseUntil: typeof raw.leaseUntil === 'string' && raw.leaseUntil ? raw.leaseUntil : null,
    revision,
  };
  if (state && typeof state === 'object') state.baton = baton;
  return baton;
}

function toMs(now) {
  if (now === undefined || now === null) return Date.now();
  if (typeof now === 'number') return now;
  if (now instanceof Date) return now.getTime();
  const ms = Date.parse(String(now));
  return Number.isNaN(ms) ? Date.now() : ms;
}

function toIso(ms) {
  return new Date(ms).toISOString();
}

function validateRunConfig(config, workflowType = 'standard') {
  const pipeline = workflowType === 'lite' ? 'lite' : 'standard';
  const maxStep = pipeline === 'lite' ? LITE_MAX_STEP : STANDARD_MAX_STEP;
  const defaults = (config && typeof config.defaults === 'object' && config.defaults !== null)
    ? config.defaults
    : {};
  const stepRunnersRaw = defaults.stepRunners === undefined || defaults.stepRunners === null
    ? {}
    : defaults.stepRunners;
  const runnersRaw = defaults.runners === undefined || defaults.runners === null ? {} : defaults.runners;
  const stepBatonRaw = defaults.stepBaton === undefined || defaults.stepBaton === null ? {} : defaults.stepBaton;
  if (!stepRunnersRaw || typeof stepRunnersRaw !== 'object' || Array.isArray(stepRunnersRaw)) {
    throw createError('RUNNER_STEP_OUT_OF_RANGE', 'defaults.stepRunners must be a step-to-runner map object');
  }
  if (!runnersRaw || typeof runnersRaw !== 'object' || Array.isArray(runnersRaw)) {
    throw createError('RUNNER_UNKNOWN_ID', 'defaults.runners must be a runner table object');
  }
  if (!stepBatonRaw || typeof stepBatonRaw !== 'object' || Array.isArray(stepBatonRaw)) {
    throw createError('STEPBATON_POLL_OUT_OF_RANGE', 'defaults.stepBaton must be an object');
  }
  const stepRunners = {};
  for (const [key, runnerId] of Object.entries(stepRunnersRaw)) {
    const step = Number(key);
    if (!Number.isInteger(step) || String(step) !== String(key).trim().replace(/^\+/, '')) {
      const asInt = Number.parseInt(String(key), 10);
      if (!Number.isInteger(asInt) || String(asInt) !== String(key)) {
        throw createError('RUNNER_STEP_OUT_OF_RANGE', `unknown step key in defaults.stepRunners: ${JSON.stringify(key)}`);
      }
    }
    const stepNum = Number.parseInt(String(key), 10);
    if (!Number.isInteger(stepNum) || stepNum < 0 || stepNum > maxStep) {
      throw createError(
        'RUNNER_STEP_OUT_OF_RANGE',
        `defaults.stepRunners key ${JSON.stringify(key)} is outside the ${pipeline} step set (0-${maxStep})`,
      );
    }
    if (typeof runnerId !== 'string' || !runnerId.trim()) {
      throw createError('RUNNER_UNKNOWN_ID', `defaults.stepRunners[${JSON.stringify(key)}] must be a non-empty runner id`);
    }
    const id = runnerId.trim();
    if (!Object.prototype.hasOwnProperty.call(runnersRaw, id)) {
      throw createError('RUNNER_UNKNOWN_ID', `unknown runner id ${JSON.stringify(id)} for step ${stepNum}`);
    }
    stepRunners[String(stepNum)] = id;
  }
  const runners = {};
  for (const [id, runner] of Object.entries(runnersRaw)) {
    if (!runner || typeof runner !== 'object' || Array.isArray(runner)) {
      throw createError('RUNNER_EMPTY_COMMAND', `defaults.runners[${JSON.stringify(id)}] must be an object`);
    }
    if (typeof runner.command !== 'string' || !runner.command.trim()) {
      throw createError('RUNNER_EMPTY_COMMAND', `defaults.runners[${JSON.stringify(id)}].command must be a non-empty string`);
    }
    const timeoutSeconds = Number(runner.timeoutSeconds);
    if (!Number.isInteger(timeoutSeconds) || timeoutSeconds <= 0) {
      throw createError(
        'RUNNER_INVALID_TIMEOUT',
        `defaults.runners[${JSON.stringify(id)}].timeoutSeconds must be a positive integer`,
      );
    }
    let env = {};
    if (runner.env !== undefined && runner.env !== null) {
      if (!runner.env || typeof runner.env !== 'object' || Array.isArray(runner.env)) {
        throw createError('RUNNER_EMPTY_COMMAND', `defaults.runners[${JSON.stringify(id)}].env must be an object`);
      }
      for (const [key, value] of Object.entries(runner.env)) {
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
          throw createError('RUNNER_EMPTY_COMMAND', `defaults.runners[${JSON.stringify(id)}].env[${JSON.stringify(key)}] must be a scalar`);
        }
        env[key] = String(value);
      }
    }
    runners[id] = { command: runner.command, timeoutSeconds, env };
  }
  let pollIntervalSeconds = DEFAULT_POLL_SECONDS;
  if (stepBatonRaw.pollIntervalSeconds !== undefined && stepBatonRaw.pollIntervalSeconds !== null) {
    pollIntervalSeconds = Number(stepBatonRaw.pollIntervalSeconds);
    if (!Number.isInteger(pollIntervalSeconds) || pollIntervalSeconds < MIN_POLL_SECONDS || pollIntervalSeconds > MAX_POLL_SECONDS) {
      throw createError(
        'STEPBATON_POLL_OUT_OF_RANGE',
        `defaults.stepBaton.pollIntervalSeconds must be an integer ${MIN_POLL_SECONDS}-300 (received: ${String(stepBatonRaw.pollIntervalSeconds)})`,
      );
    }
  }
  let maxAttempts = DEFAULT_MAX_ATTEMPTS;
  if (stepBatonRaw.maxAttempts !== undefined && stepBatonRaw.maxAttempts !== null) {
    maxAttempts = Number(stepBatonRaw.maxAttempts);
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw createError(
        'STEPBATON_MAX_ATTEMPTS_INVALID',
        `defaults.stepBaton.maxAttempts must be an integer >= 1 (received: ${String(stepBatonRaw.maxAttempts)})`,
      );
    }
  }
  return { stepRunners, runners, pollIntervalSeconds, maxAttempts };
}

function resolveMappedRunner(config, step) {
  const map = config?.defaults?.stepRunners;
  if (!map || typeof map !== 'object') return null;
  const id = map[String(step)];
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function claimBaton(state, { step, holder, expectedRevision, now, leaseUntil } = {}) {
  if (!state || typeof state !== 'object') throw createError('BATON_REVISION_CONFLICT', 'claim requires a state object');
  const stepNum = Number(step);
  if (!Number.isInteger(stepNum)) throw createError('BATON_WRONG_STEP', `claim step must be an integer (received: ${String(step)})`);
  if (stepNum !== Number(state.currentStep)) {
    throw createError('BATON_WRONG_STEP', `baton claim for step ${stepNum} rejected: currentStep is ${state.currentStep}`);
  }
  if (typeof holder !== 'string' || !holder.trim()) {
    throw createError('BATON_REVISION_CONFLICT', 'claim requires a non-empty holder runner id');
  }
  const stored = normalizeBaton(state);
  if (Number(expectedRevision) !== stored.revision) {
    throw createError(
      'BATON_REVISION_CONFLICT',
      `baton revision conflict: presented ${String(expectedRevision)}, stored ${stored.revision}`,
    );
  }
  const nowMs = toMs(now);
  if (stored.holder && stored.leaseUntil) {
    const leaseMs = Date.parse(stored.leaseUntil);
    if (!Number.isNaN(leaseMs) && leaseMs > nowMs) {
      throw createError('BATON_LEASE_HELD', `baton lease held by ${stored.holder} until ${stored.leaseUntil}`);
    }
  }
  if (typeof leaseUntil !== 'string' || Number.isNaN(Date.parse(leaseUntil))) {
    throw createError('BATON_REVISION_CONFLICT', 'claim requires a valid ISO leaseUntil');
  }
  state.baton = {
    holder: holder.trim(),
    step: stepNum,
    claimedAt: toIso(nowMs),
    leaseUntil,
    revision: stored.revision + 1,
  };
  return state.baton;
}

function releaseBaton(state, { step, nextStep } = {}) {
  if (!state || typeof state !== 'object') throw createError('BATON_REVISION_CONFLICT', 'release requires a state object');
  const stepNum = Number(step);
  if (!Number.isInteger(stepNum)) throw createError('BATON_WRONG_STEP', `release step must be an integer (received: ${String(step)})`);
  const stored = normalizeBaton(state);
  const handoffExists = Boolean(state.handoffs && typeof state.handoffs === 'object' && state.handoffs[String(stepNum)]);
  if (handoffExists && !stored.holder) return { idempotent: true, baton: stored };
  const next = nextStep === undefined || nextStep === null ? Number(state.currentStep) : Number(nextStep);
  state.baton = {
    holder: null,
    step: Number.isInteger(next) ? next : stored.step,
    claimedAt: stored.claimedAt,
    leaseUntil: null,
    revision: stored.revision + 1,
  };
  return { idempotent: false, baton: state.baton };
}

function expiryState(state, { now } = {}) {
  const stored = normalizeBaton(state);
  if (!stored.holder || !stored.leaseUntil) return { expired: false, holder: stored.holder, step: stored.step, leaseUntil: stored.leaseUntil };
  const leaseMs = Date.parse(stored.leaseUntil);
  if (Number.isNaN(leaseMs)) return { expired: false, holder: stored.holder, step: stored.step, leaseUntil: stored.leaseUntil };
  if (toMs(now) <= leaseMs) return { expired: false, holder: stored.holder, step: stored.step, leaseUntil: stored.leaseUntil };
  return { expired: true, holder: stored.holder, step: stored.step, leaseUntil: stored.leaseUntil };
}

function computeBackoffMs(attempt, baseMs = 100, capMs = 2000) {
  const n = Math.max(0, Number(attempt) || 0);
  return Math.min(capMs, baseMs * (2 ** n));
}

function sleepSync(ms) {
  const wait = Math.max(0, Number(ms) || 0);
  if (!wait) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait);
}

function lockDirFor(usDir) {
  return path.join(String(usDir), '.runtime', 'baton.lock');
}

function isPidAlive(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockMeta(lockDir) {
  try {
    const raw = fs.readFileSync(path.join(lockDir, 'lock.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isLockStale(lockDir, staleMs) {
  let mtimeMs = 0;
  try {
    mtimeMs = fs.statSync(lockDir).mtimeMs;
  } catch {
    return true;
  }
  if (Date.now() - mtimeMs < staleMs) return false;
  const meta = readLockMeta(lockDir);
  if (meta && isPidAlive(meta.pid)) return false;
  return true;
}

function acquireLockDir(lockDir) {
  try {
    fs.mkdirSync(lockDir, { recursive: false });
  } catch (error) {
    if (error && error.code === 'EEXIST') return false;
    throw error;
  }
  try {
    fs.writeFileSync(path.join(lockDir, 'lock.json'), JSON.stringify({ pid: process.pid, at: toIso(Date.now()) }), 'utf8');
  } catch {
    // best effort
  }
  return true;
}

function releaseLockDir(lockDir) {
  try {
    fs.rmSync(lockDir, { recursive: true, force: true });
  } catch {
    // best effort
  }
}

function withBatonLock(usDir, fn, options = {}) {
  if (!usDir) throw createError('BATON_REVISION_CONFLICT', 'withBatonLock requires a usDir');
  if (typeof fn !== 'function') throw createError('BATON_REVISION_CONFLICT', 'withBatonLock requires a function');
  const staleMs = Number(options.staleMs ?? 60000);
  const retries = Number(options.retries ?? 5);
  const backoffBaseMs = Number(options.backoffBaseMs ?? 50);
  const lockDir = lockDirFor(usDir);
  fs.mkdirSync(path.dirname(lockDir), { recursive: true });
  let attempt = 0;
  for (;;) {
    if (acquireLockDir(lockDir)) {
      try {
        return fn();
      } finally {
        releaseLockDir(lockDir);
      }
    }
    if (isLockStale(lockDir, staleMs)) {
      releaseLockDir(lockDir);
      continue;
    }
    if (attempt >= retries) {
      throw createError('BATON_REVISION_CONFLICT', `baton lock busy at ${lockDir} after ${attempt} retries`);
    }
    sleepSync(computeBackoffMs(attempt, backoffBaseMs, 2000));
    attempt += 1;
  }
}

function splitCommand(template) {
  const text = String(template ?? '');
  const tokens = [];
  let current = '';
  let quote = '';
  let hasToken = false;
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (quote) {
      if (ch === quote) {
        quote = '';
      } else {
        current += ch;
      }
      hasToken = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      hasToken = true;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      if (hasToken) {
        tokens.push(current);
        current = '';
        hasToken = false;
      }
      continue;
    }
    current += ch;
    hasToken = true;
  }
  if (quote) throw createError('RUNNER_EMPTY_COMMAND', 'runner command has an unterminated quote');
  if (hasToken) tokens.push(current);
  return tokens;
}

function substituteRunnerTemplate(command, { prompt, cwd, slug, step } = {}) {
  if (typeof command !== 'string' || !command.trim()) {
    throw createError('RUNNER_EMPTY_COMMAND', 'runner command template must be a non-empty string');
  }
  const values = {
    prompt: String(prompt ?? ''),
    cwd: String(cwd ?? ''),
    slug: String(slug ?? ''),
    step: String(step ?? ''),
  };
  const tokens = splitCommand(command).map((token) => token
    .replaceAll('{prompt}', () => values.prompt)
    .replaceAll('{cwd}', () => values.cwd)
    .replaceAll('{slug}', () => values.slug)
    .replaceAll('{step}', () => values.step));
  if (!tokens.length || !tokens[0]) {
    throw createError('RUNNER_EMPTY_COMMAND', 'runner command template produced no executable');
  }
  return { cmd: tokens[0], args: tokens.slice(1) };
}

function resolveRunnerArgv(runner, subs) {
  if (!runner || typeof runner.command !== 'string') {
    throw createError('RUNNER_EMPTY_COMMAND', 'runner entry must carry a command template');
  }
  return substituteRunnerTemplate(runner.command, subs);
}

function isGateShapedOutput(text) {
  const haystack = String(text ?? '');
  if (!haystack) return false;
  return GATE_TOKENS.some((token) => haystack.includes(token));
}

function buildBatonEnvelope({ step, holder, leaseUntil, attempt } = {}) {
  const stepNum = Number(step);
  const attemptNum = Number(attempt);
  if (!Number.isInteger(stepNum)) throw createError('BATON_WRONG_STEP', 'baton envelope requires an integer step');
  if (typeof holder !== 'string' || !holder.trim()) throw createError('BATON_REVISION_CONFLICT', 'baton envelope requires a holder');
  if (typeof leaseUntil !== 'string' || Number.isNaN(Date.parse(leaseUntil))) {
    throw createError('BATON_REVISION_CONFLICT', 'baton envelope requires an ISO leaseUntil');
  }
  if (!Number.isInteger(attemptNum) || attemptNum < 1) {
    throw createError('BATON_REVISION_CONFLICT', 'baton envelope requires an attempt >= 1');
  }
  return { step: stepNum, holder: holder.trim(), leaseUntil, attempt: attemptNum };
}

function computeLeaseUntil(nowMs, timeoutSeconds) {
  const timeout = Number(timeoutSeconds);
  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw createError('RUNNER_INVALID_TIMEOUT', 'lease computation requires a positive integer timeoutSeconds');
  }
  const base = toMs(nowMs);
  return toIso(base + timeout * LEASE_MULTIPLIER * 1000);
}

module.exports = {
  DEFAULT_POLL_SECONDS,
  MIN_POLL_SECONDS,
  MAX_POLL_SECONDS,
  DEFAULT_MAX_ATTEMPTS,
  LEASE_MULTIPLIER,
  GATE_TOKENS,
  createError,
  normalizeBaton,
  validateRunConfig,
  resolveMappedRunner,
  claimBaton,
  releaseBaton,
  expiryState,
  computeBackoffMs,
  sleepSync,
  withBatonLock,
  lockDirFor,
  splitCommand,
  substituteRunnerTemplate,
  resolveRunnerArgv,
  isGateShapedOutput,
  buildBatonEnvelope,
  computeLeaseUntil,
};
