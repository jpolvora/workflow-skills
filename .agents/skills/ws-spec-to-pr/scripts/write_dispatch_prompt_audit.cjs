#!/usr/bin/env node
'use strict';

// write_dispatch_prompt_audit.cjs — durable per-step dispatch-prompt audit writer.
//
// Mirrors exact `build_dispatch_context.cjs` output bytes beside the step artifacts:
//   {us-dir}/step-{NN}-{slug}.prompt.md    (exact dispatched prompt bytes)
//   {us-dir}/step-{NN}-{slug}.prompt.json  (budget/refs/hash manifest)
// DAG per-node variant: step-04-{slug}.prompt.{node}.md + .json
// Lite skipped steps: manifest-only skip marker (--skip-marker).
//
// Single-writer rule: this is the only script that writes prompt pairs.
// Writes are atomic (same-directory temp file + rename).

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MANIFEST_SCHEMA_VERSION = 1;
const FIXED_PREAMBLE_CAP = 18000;

function parseArgs(argv) {
  const options = {};
  const known = new Set(['usDir', 'step', 'slug', 'promptFile', 'manifest', 'node', 'dispatchMode', 'skipMarker', 'json', 'help']);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    let rawKey = token.slice(2);
    let inlineValue;
    const eqIdx = rawKey.indexOf('=');
    if (eqIdx >= 0) {
      inlineValue = rawKey.slice(eqIdx + 1);
      rawKey = rawKey.slice(0, eqIdx);
    }
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!known.has(key)) throw new Error(`unknown flag: ${token}`);
    if (key === 'help') {
      options.help = true;
      continue;
    }
    if (key === 'skipMarker' || key === 'json') {
      options[key] = inlineValue !== undefined ? inlineValue !== 'false' : true;
      continue;
    }
    const value = inlineValue !== undefined ? inlineValue : argv[++index];
    if (value === undefined || String(value).startsWith('--')) throw new Error(`${token} requires a value`);
    options[key] = value;
  }
  return options;
}

function sanitizeNodeId(raw) {
  const cleaned = String(raw).replace(/[^A-Za-z0-9_-]/g, '-');
  if (!cleaned) throw new Error('--node sanitizes to an empty id; pass a non-empty node id');
  return cleaned;
}

function toForwardSlashes(value) {
  return String(value).replace(/\\/g, '/');
}

function atomicWriteFile(target, data) {
  const tmp = `${target}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, target);
}

function readBuilderManifest(file) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`builder manifest unreadable: ${file} (${error.message})`);
  }
  for (const key of ['budgetBytes', 'fixedPreambleBytes', 'mandatoryBytes', 'totalBytes', 'memoryBytes', 'sourceSkill']) {
    if (parsed[key] === undefined) throw new Error(`builder manifest missing required key: ${key}`);
  }
  if (!Number.isInteger(parsed.budgetBytes) || !Number.isInteger(parsed.fixedPreambleBytes)
    || !Number.isInteger(parsed.mandatoryBytes) || !Number.isInteger(parsed.totalBytes)
    || !Number.isInteger(parsed.memoryBytes)) {
    throw new Error('builder manifest byte counters must be integers');
  }
  return parsed;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: write_dispatch_prompt_audit.cjs --us-dir DIR --step N --slug SLUG --prompt-file FILE --manifest FILE [--node NODE] [--dispatch-mode standard|inline] [--skip-marker] [--json]\n');
    return;
  }
  const usDir = options.usDir;
  const slug = options.slug;
  const step = Number(options.step);
  if (!usDir) throw new Error('--us-dir is required');
  if (!slug) throw new Error('--slug is required');
  if (!Number.isInteger(step) || step < 0 || step > 9) throw new Error('--step must be an integer in range 0..9');
  const dispatchMode = options.dispatchMode || 'standard';
  if (dispatchMode !== 'standard' && dispatchMode !== 'inline') throw new Error('--dispatch-mode must be standard or inline');
  if (!fs.existsSync(usDir) || !fs.statSync(usDir).isDirectory()) throw new Error(`us-dir not found: ${usDir}`);

  const padded = String(step).padStart(2, '0');
  const nodeSuffix = options.node !== undefined ? `.${sanitizeNodeId(options.node)}` : '';
  const mdName = `step-${padded}-${slug}.prompt${nodeSuffix}.md`;
  const jsonName = `step-${padded}-${slug}.prompt${nodeSuffix}.json`;
  const mdPath = path.join(usDir, mdName);
  const jsonPath = path.join(usDir, jsonName);
  const promptRel = toForwardSlashes(path.join(usDir, mdName));

  if (options.skipMarker) {
    if (!options.node && fs.existsSync(mdPath)) {
      throw new Error(`skip marker refused: prompt markdown already exists: ${mdName}`);
    }
    const manifest = {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      step,
      slug,
      skipped: true,
      sourceSkill: null,
      acRefs: [],
      budgetBytes: null,
      fixedPreambleBytes: null,
      mandatoryBytes: null,
      totalBytes: null,
      memoryBytes: null,
      promptSha256: null,
      createdAt: new Date().toISOString(),
      dispatchMode,
      revision: 1,
      ...(options.node !== undefined ? { node: sanitizeNodeId(options.node) } : {}),
    };
    atomicWriteFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const result = { ok: true, promptPath: null, promptSha256: null, manifestPath: toForwardSlashes(path.join(usDir, jsonName)), revision: 1, priorPromptSha256: null, skipped: true };
    if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
    else process.stdout.write(`prompt audit skip marker written: ${jsonName}\n`);
    return;
  }

  if (!options.promptFile) throw new Error('--prompt-file is required (unless --skip-marker)');
  if (!options.manifest) throw new Error('--manifest is required (unless --skip-marker)');
  if (!fs.existsSync(options.promptFile)) throw new Error(`prompt file not found: ${options.promptFile}`);
  const promptBytes = fs.readFileSync(options.promptFile);
  const builder = readBuilderManifest(options.manifest);
  const promptSha256 = crypto.createHash('sha256').update(promptBytes).digest('hex');

  let revision = 1;
  let priorPromptSha256 = null;
  if (fs.existsSync(jsonPath)) {
    let prior;
    try {
      prior = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (error) {
      throw new Error(`existing prompt manifest unreadable (refusing silent reset): ${jsonName} (${error.message})`);
    }
    revision = Number(prior.revision || 0) + 1;
    priorPromptSha256 = prior.promptSha256 || null;
  }

  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    step,
    slug,
    sourceSkill: builder.sourceSkill,
    acRefs: Array.isArray(builder.acRefs) ? builder.acRefs : [],
    budgetBytes: builder.budgetBytes,
    fixedPreambleBytes: builder.fixedPreambleBytes,
    mandatoryBytes: builder.mandatoryBytes,
    totalBytes: builder.totalBytes,
    memoryBytes: builder.memoryBytes,
    promptSha256,
    createdAt: new Date().toISOString(),
    dispatchMode,
    revision,
    ...(options.node !== undefined ? { node: sanitizeNodeId(options.node) } : {}),
    ...(priorPromptSha256 ? { priorPromptSha256 } : {}),
  };
  if (manifest.fixedPreambleBytes > FIXED_PREAMBLE_CAP) {
    throw new Error(`refusing to audit an over-cap prompt: fixedPreambleBytes ${manifest.fixedPreambleBytes} exceeds ${FIXED_PREAMBLE_CAP}`);
  }
  if (manifest.totalBytes > manifest.budgetBytes) {
    throw new Error(`refusing to audit an over-budget prompt: totalBytes ${manifest.totalBytes} exceeds budgetBytes ${manifest.budgetBytes}`);
  }

  atomicWriteFile(mdPath, promptBytes);
  atomicWriteFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const result = { ok: true, promptPath: promptRel, promptSha256, revision, priorPromptSha256 };
  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else process.stdout.write(`prompt audit written: ${mdName} (revision ${revision})\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
