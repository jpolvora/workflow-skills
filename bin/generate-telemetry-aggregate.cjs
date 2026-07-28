#!/usr/bin/env node
'use strict';

/**
 * AC7 — Regenerate project-wide workflow telemetry aggregate.
 * Scans all *.state.md under plansDir and optional telemetry JSONL files.
 * No npm dependencies.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SHARED_DIR = path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared');
const DEFAULT_PLANS_REL = '.agents/plans';

function loadJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Warning: failed to parse ${filePath}: ${err.message}`);
    return null;
  }
}

/** Resolve plans.dir from ws-shared config (default .agents/plans). */
function resolvePlansDir() {
  const configPath = path.join(SHARED_DIR, 'config.json');
  const examplePath = path.join(SHARED_DIR, 'config.json.example');
  const config = loadJsonIfExists(configPath) || loadJsonIfExists(examplePath) || {};
  const rel = (config.plans && config.plans.dir) || DEFAULT_PLANS_REL;
  const plansPath = path.isAbsolute(rel) ? rel : path.join(REPO_ROOT, rel);
  return path.resolve(plansPath);
}

function stripQuotes(val) {
  const s = String(val).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

function splitFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: '', body: content };
  }
  return { frontmatter: match[1], body: match[2] };
}

function parseScalar(val) {
  const s = stripQuotes(val);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '') return null;
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d+\.\d+$/.test(s)) return Number(s);
  return s;
}

function parseInlineObject(text) {
  const inner = text.trim();
  if (!inner.startsWith('{') || !inner.endsWith('}')) return null;
  const obj = {};
  const body = inner.slice(1, -1);
  const parts = body.split(/,\s*(?=[A-Za-z0-9_]+:)/);
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const rawVal = part.slice(idx + 1).trim();
    obj[key] = parseScalar(rawVal);
  }
  return obj;
}

/** Minimal frontmatter reader for workflow state files. */
function parseFrontmatter(fm) {
  const data = {};
  const lines = fm.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].replace(/\r$/, '');
    i += 1;
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();

    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      data[key] = inner
        ? inner.split(',').map((x) => stripQuotes(x.trim())).filter(Boolean)
        : [];
      continue;
    }

    if (val === '' || val === '|') {
      const block = [];
      while (i < lines.length && (/^\s/.test(lines[i]) || !lines[i].trim())) {
        block.push(lines[i]);
        i += 1;
      }
      data[key] = parseYamlBlock(block);
      continue;
    }

    data[key] = parseScalar(val);
  }
  return data;
}

function parseYamlBlock(block) {
  if (!block.length) return {};

  const first = block[0].trim();
  if (first.startsWith('- ')) {
    const items = [];
    let current = null;
    for (const raw of block) {
      const line = raw.replace(/\r$/, '');
      const listMatch = line.match(/^\s*-\s*(.*)$/);
      if (listMatch) {
        const rest = listMatch[1].trim();
        if (rest.startsWith('{') && rest.endsWith('}')) {
          current = parseInlineObject(rest);
          items.push(current);
        } else if (rest) {
          current = parseScalar(rest);
          items.push(current);
        } else {
          current = {};
          items.push(current);
        }
        continue;
      }
      const kv = line.match(/^\s+([A-Za-z0-9_]+):\s*(.*)$/);
      if (kv && current && typeof current === 'object' && !Array.isArray(current)) {
        current[kv[1]] = parseScalar(kv[2].trim());
      }
    }
    return items;
  }

  // Mapping that may contain nested lists/maps (e.g. telemetry.steps).
  const obj = {};
  let i = 0;
  while (i < block.length) {
    const line = block[i].replace(/\r$/, '');
    i += 1;
    if (!line.trim()) continue;
    const kv = line.match(/^(\s*)([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const indent = kv[1].length;
    const k = kv[2];
    const v = kv[3].trim();

    if (v === '[]') {
      obj[k] = [];
      continue;
    }
    if (v === '{}') {
      obj[k] = {};
      continue;
    }
    if (v !== '') {
      if (v.startsWith('[') && v.endsWith(']')) {
        const inner = v.slice(1, -1).trim();
        obj[k] = inner
          ? inner.split(',').map((x) => stripQuotes(x.trim())).filter(Boolean)
          : [];
      } else {
        obj[k] = parseScalar(v);
      }
      continue;
    }

    const nested = [];
    while (i < block.length) {
      const nxt = block[i];
      if (!nxt.trim()) {
        i += 1;
        continue;
      }
      const nxtIndent = (nxt.match(/^(\s*)/) || ['', ''])[1].length;
      if (nxtIndent <= indent) break;
      nested.push(nxt);
      i += 1;
    }
    obj[k] = parseYamlBlock(nested);
  }
  return obj;
}

function walkFiles(dir, predicate, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, predicate, results);
    } else if (predicate(full, entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function normalizeVerdict(verdict) {
  if (verdict == null || verdict === '') return null;
  return String(verdict)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

function classifyError(errorValue) {
  if (errorValue == null) return 'unknown';
  if (typeof errorValue === 'object') {
    if (errorValue.type) return String(errorValue.type).trim() || 'unknown';
    if (errorValue.name) return String(errorValue.name).trim() || 'unknown';
    return 'unknown';
  }
  const text = String(errorValue).trim();
  if (!text) return 'unknown';
  const colonIdx = text.indexOf(':');
  if (colonIdx > 0 && colonIdx < 48) {
    const prefix = text.slice(0, colonIdx).trim().toLowerCase();
    if (/^[a-z][a-z0-9_-]*$/.test(prefix)) return prefix;
  }
  const bracket = text.match(/^\[([^\]]+)\]/);
  if (bracket) return bracket[1].trim().toLowerCase() || 'unknown';
  return 'other';
}

function bumpCount(map, key) {
  const k = key == null || key === '' ? 'unknown' : String(key);
  map[k] = (map[k] || 0) + 1;
}

function createAccumulator() {
  return {
    totalWorkflows: 0,
    completedWorkflows: 0,
    elapsedValues: [],
    verificationScores: [],
    fableVerdictDistribution: {},
    gateBypassCount: 0,
    gateBypassKeys: new Set(),
    /** Workflow dirs that already contributed scores/verdicts from state.md (dedupe vs JSONL). */
    workflowsWithStateScores: new Set(),
    errorTypeDistribution: {},
  };
}

/** Dedupe key for typed gate-bypass events and step records with bypassed:true. */
function bypassDedupeKey(record) {
  const ts = record && record.timestamp != null ? String(record.timestamp) : '';
  const step =
    record && record.step != null && record.step !== ''
      ? String(record.step)
      : record && record.gate != null
        ? String(record.gate)
        : '';
  return `${ts}|${step}`;
}

function noteGateBypass(acc, record) {
  const key = bypassDedupeKey(record);
  if (acc.gateBypassKeys.has(key)) return;
  acc.gateBypassKeys.add(key);
  acc.gateBypassCount += 1;
}

function ingestVerificationScore(acc, step, score) {
  if (score == null || score === '') return;
  const stepNum = Number(step);
  if (!Number.isFinite(stepNum) || (stepNum !== 5 && stepNum !== 6)) return;
  const num = Number(score);
  if (Number.isFinite(num)) acc.verificationScores.push(num);
}

function ingestFableVerdict(acc, verdict) {
  const key = normalizeVerdict(verdict);
  if (!key) return;
  bumpCount(acc.fableVerdictDistribution, key);
}

function ingestErrors(acc, errors) {
  if (!Array.isArray(errors)) return;
  for (const err of errors) {
    bumpCount(acc.errorTypeDistribution, classifyError(err));
  }
}

/**
 * Ingest one JSONL record.
 * @param {object} acc
 * @param {object} record
 * @param {{ ingestScores?: boolean }} [opts] — false when state.md already supplied scores
 */
function ingestJsonlRecord(acc, record, opts = {}) {
  if (!record || typeof record !== 'object') return;
  const ingestScores = opts.ingestScores !== false;

  if (record.type === 'gate-bypass') {
    noteGateBypass(acc, record);
    return;
  }

  if (record.bypassed === true) {
    noteGateBypass(acc, record);
  }

  if (ingestScores) {
    ingestVerificationScore(acc, record.step, record.verificationScore);
    ingestFableVerdict(acc, record.fableVerdict);
  }
  ingestErrors(acc, record.errors);
}

/**
 * Primary source for scores/verdicts when present. Marks workflow dir so JSONL
 * dual-write of the same metrics is skipped (W2).
 */
function ingestStateFile(acc, statePath) {
  let content;
  try {
    content = fs.readFileSync(statePath, 'utf8');
  } catch (err) {
    console.error(`Warning: failed to read ${statePath}: ${err.message}`);
    return;
  }

  const { frontmatter } = splitFrontmatter(content);
  if (!frontmatter) return;

  const meta = parseFrontmatter(frontmatter);
  acc.totalWorkflows += 1;
  if (String(meta.status || '').toLowerCase() === 'completed') {
    acc.completedWorkflows += 1;
  }

  const wfDir = path.resolve(path.dirname(statePath));
  const telemetry = meta.telemetry;
  if (telemetry && typeof telemetry === 'object' && !Array.isArray(telemetry)) {
    const elapsed = Number(telemetry.totalElapsedSec);
    if (Number.isFinite(elapsed)) {
      acc.elapsedValues.push(elapsed);
    }
    const steps = telemetry.steps;
    if (Array.isArray(steps)) {
      let contributedScore = false;
      for (const step of steps) {
        if (!step || typeof step !== 'object') continue;
        const scoreBefore = acc.verificationScores.length;
        const verdictKey = normalizeVerdict(step.fableVerdict);
        ingestVerificationScore(acc, step.N ?? step.step, step.verificationScore);
        ingestFableVerdict(acc, step.fableVerdict);
        if (
          acc.verificationScores.length > scoreBefore ||
          Boolean(verdictKey)
        ) {
          contributedScore = true;
        }
        if (step.bypassed === true) {
          noteGateBypass(acc, {
            timestamp: step.timestamp || meta.workflowId || statePath,
            step: step.N ?? step.step,
            bypassed: true,
          });
        }
      }
      if (contributedScore) {
        acc.workflowsWithStateScores.add(wfDir);
      }
    }
  }
}

function workflowDirForJsonl(filePath) {
  const parent = path.dirname(filePath);
  return path.resolve(
    path.basename(parent) === 'telemetry' ? path.dirname(parent) : parent,
  );
}

/** Workflow dirs under plansDir that contain at least one *.jsonl. */
function workflowDirsWithJsonl(plansDir) {
  const dirs = new Set();
  const jsonlFiles = walkFiles(plansDir, (_full, name) => name.endsWith('.jsonl'));
  for (const filePath of jsonlFiles) {
    dirs.add(workflowDirForJsonl(filePath));
  }
  return dirs;
}

/**
 * Prefer state.md for scores/verdicts when already ingested; JSONL always
 * contributes gate-bypass (and scores only when state had none).
 */
function ingestJsonlFiles(acc, plansDir) {
  const jsonlFiles = walkFiles(plansDir, (_full, name) => name.endsWith('.jsonl'));
  for (const filePath of jsonlFiles) {
    let text;
    try {
      text = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      console.error(`Warning: failed to read ${filePath}: ${err.message}`);
      continue;
    }
    const wfDir = workflowDirForJsonl(filePath);
    const ingestScores = !acc.workflowsWithStateScores.has(wfDir);
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        ingestJsonlRecord(acc, JSON.parse(trimmed), { ingestScores });
      } catch (err) {
        console.error(`Warning: invalid JSONL in ${filePath}: ${err.message}`);
      }
    }
  }
}

function average(values) {
  if (!values.length) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

function finalizeAggregate(acc) {
  return {
    totalWorkflows: acc.totalWorkflows,
    completedWorkflows: acc.completedWorkflows,
    averageElapsedSec: average(acc.elapsedValues),
    averageVerificationScore: average(acc.verificationScores),
    fableVerdictDistribution: acc.fableVerdictDistribution,
    gateBypassCount: acc.gateBypassCount,
    errorTypeDistribution: acc.errorTypeDistribution,
  };
}

function main() {
  const plansDir = resolvePlansDir();
  const acc = createAccumulator();

  const stateFiles = walkFiles(plansDir, (_full, name) => name.endsWith('.state.md'));
  stateFiles.sort();
  for (const statePath of stateFiles) {
    ingestStateFile(acc, statePath);
  }

  // Skip JSONL scores/verdicts when the same workflow already contributed them from state.md.
  ingestJsonlFiles(acc, plansDir);

  const aggregate = finalizeAggregate(acc);
  const outDir = path.join(plansDir, 'telemetry');
  const outPath = path.join(outDir, 'aggregate.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(aggregate, null, 2)}\n`, 'utf8');

  console.log(
    `Wrote ${path.relative(REPO_ROOT, outPath)} (${aggregate.totalWorkflows} workflows, ${aggregate.completedWorkflows} completed)`,
  );
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  resolvePlansDir,
  parseFrontmatter,
  splitFrontmatter,
  normalizeVerdict,
  classifyError,
  createAccumulator,
  bypassDedupeKey,
  noteGateBypass,
  ingestStateFile,
  ingestJsonlRecord,
  workflowDirsWithJsonl,
  ingestJsonlFiles,
  finalizeAggregate,
  main,
};
