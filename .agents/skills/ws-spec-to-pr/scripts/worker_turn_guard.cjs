#!/usr/bin/env node
'use strict';

// Worker-turn guard: fail-fast verdict for premature worker turns.
//
// A turn that ends with zero tool calls (preview-only no-op) or with
// required step artifacts unwritten resolves as failed, never completed,
// so the parent fails fast without waiting on artifact timeouts.
// Single runtime (Node .cjs); synchronous only; no new dependencies.

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
  const candidates = [packaged];
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
const { finishArtifactNames } = require(path.join(HUB_SCRIPTS_DIR, 'workflow_state.cjs'));

const SIGNALS = {
  ZERO_TOOL_CALLS: 'worker_zero_tool_calls',
  MISSING_ARTIFACT: 'worker_missing_artifact',
};

function isNonEmptyFile(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

// Extract an explicit toolCalls count from a step-output envelope embedded in
// worker stdout. Returns the number when present, else null (unknown — the
// caller falls back to the artifact check instead of guessing).
function extractToolCalls(text) {
  if (!text) return null;
  const match = String(text).match(/(?:^|[^A-Za-z0-9_])["']?toolCalls["']?\s*[:=]\s*(\d+)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function missingArtifacts(usDir, required) {
  return (required || []).filter((name) => !isNonEmptyFile(path.join(usDir, name)));
}

// classifyTurn({toolCalls, requiredArtifacts, usDir}) ->
//   {verdict: 'completed'|'failed', signal, reason, missing}
// An explicit zero tool-call count always fails (preview text counts as zero
// work regardless of length). Unknown (null — no envelope to read) falls
// through to the artifact-presence check instead of guessing: unwritten
// required artifacts fail instead of resolving completed.
function classifyTurn({ toolCalls = null, requiredArtifacts = [], usDir = '' } = {}) {
  if (toolCalls === 0) {
    return {
      verdict: 'failed',
      signal: SIGNALS.ZERO_TOOL_CALLS,
      reason: 'turn ended with zero tool calls (preview-only no-op is failed delivery)',
      missing: missingArtifacts(usDir, requiredArtifacts),
    };
  }
  const missing = missingArtifacts(usDir, requiredArtifacts);
  if (missing.length) {
    return {
      verdict: 'failed',
      signal: SIGNALS.MISSING_ARTIFACT,
      reason: `required step artifacts unwritten: ${missing.join(', ')}`,
      missing,
    };
  }
  return { verdict: 'completed', signal: null, reason: 'tool calls present and required artifacts on disk', missing: [] };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === 'help') {
      options.help = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${token} requires a value`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: node worker_turn_guard.cjs --us-dir DIR --step N [--slug SLUG] [--pipeline standard|lite] [--tool-calls N] [--stdout-file FILE]\n');
    return { exitCode: 0 };
  }
  if (!options.usDir) throw new Error('--us-dir is required');
  if (options.step === undefined) throw new Error('--step is required');
  const step = Number(options.step);
  if (!Number.isInteger(step)) throw new Error('--step must be an integer');
  const usDir = path.resolve(String(options.usDir));
  let slug = String(options.slug || '').trim();
  if (!slug) {
    const base = path.basename(usDir);
    slug = base;
  }
  const pipeline = String(options.pipeline || 'standard');
  const required = finishArtifactNames(slug, step, pipeline);
  let toolCalls = null;
  if (options.toolCalls !== undefined) {
    toolCalls = Number(options.toolCalls);
    if (!Number.isInteger(toolCalls) || toolCalls < 0) throw new Error('--tool-calls must be an integer >= 0');
  } else if (options.stdoutFile) {
    const stdoutText = fs.readFileSync(path.resolve(String(options.stdoutFile)), 'utf8');
    toolCalls = extractToolCalls(stdoutText);
  }
  const verdict = classifyTurn({ toolCalls, requiredArtifacts: required, usDir });
  const record = {
    schemaVersion: 1,
    verdict: verdict.verdict,
    signal: verdict.signal,
    reason: verdict.reason,
    missing: verdict.missing,
    toolCalls,
    step,
    slug,
    pipeline,
  };
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
  return { exitCode: verdict.verdict === 'completed' ? 0 : 2 };
}

if (require.main === module) {
  try {
    const result = main();
    process.exitCode = result.exitCode;
  } catch (error) {
    process.stderr.write(`ERROR: ${error && error.message ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  SIGNALS,
  classifyTurn,
  extractToolCalls,
  missingArtifacts,
};
