#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  resolveConsumerContext,
  resolveConfiguredPath,
  toRepoRelative,
  inside,
  resolveMinVerifyScore,
} = require('./resolve_consumer_root.cjs');
const { scoreLedger } = require('../../ws-spec-to-pr/scripts/ac_ledger.cjs');
const { syncAcCountsFromLedger } = require('./ac_counts.cjs');
const { loadJsonSchema, validateNode } = require('./validate_json_schema.cjs');

const STATE_VERSION = 2;
const SCHEMA_VERSION = 1;
const SKIP_REASONS = new Set([
  'interview-not-required',
  'dag-disabled',
  'testing-disabled',
  'no-test-surface',
  'fix-pr-not-applicable',
]);
const RUNTIME_NAMES = [
  /^started-at\.txt$/,
  /^workflow-id\.txt$/,
  /^baseline\.txt$/,
  /^sentinel\.pid$/,
  /^revision$/,
  /^blocked-reason$/,
  /^round-\d+\.md$/,
  /^final\.md$/,
  /^plan-gate\.md$/,
  /^resolve-[A-Za-z0-9_-]+\.txt$/,
  /\.(cjs|patch|md)$/,
];

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stateIdentityHash(text) {
  return sha256(parseFrontmatter(text).frontmatter);
}

function legacyStateHash(text) {
  return sha256(text);
}

function snapshotHashMatches(stored, stateText, jsonText) {
  if (jsonText && stored === sha256(jsonText)) return true;
  return stored === stateIdentityHash(stateText) || stored === legacyStateHash(stateText);
}

function markdownStatePath(file) {
  return String(file).endsWith('.state.json') ? String(file).replace(/\.state\.json$/, '.state.md') : file;
}

function jsonStatePath(file) {
  return String(file).endsWith('.state.json') ? file : String(file).replace(/\.state\.md$/, '.state.json');
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = stableValue(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function canonicalStateJson(state) {
  return `${JSON.stringify(stableValue(state), null, 2)}\n`;
}

function jsonIdentityHash(state) {
  return sha256(canonicalStateJson(state));
}

function finishFingerprint(state) {
  return JSON.stringify(stableValue({
    currentStep: state.currentStep,
    completedSteps: state.completedSteps,
    skippedSteps: state.skippedSteps,
    stepStatus: state.stepStatus,
    workflowManifest: state.workflowManifest,
    status: state.status,
    gateDecision: state.gateDecision,
    commits: state.commits,
    verificationScore: state.verificationScore,
    fableVerdict: state.fableVerdict,
  }));
}

function loadPersistedState(stateFile) {
  const mdPath = markdownStatePath(stateFile);
  const jsonPath = jsonStatePath(stateFile);
  if (fs.existsSync(jsonPath)) {
    const state = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const body = fs.existsSync(mdPath) ? parseFrontmatter(fs.readFileSync(mdPath, 'utf8')).body : '';
    return { state, body, mdPath, jsonPath, jsonText: fs.readFileSync(jsonPath, 'utf8') };
  }
  if (!fs.existsSync(mdPath)) throw new Error(`state file not found: ${stateFile}`);
  const parsed = parseFrontmatter(fs.readFileSync(mdPath, 'utf8'));
  return { state: parsed.data, body: parsed.body, mdPath, jsonPath, jsonText: null };
}

function stateCoresAgree(jsonState, markdownData) {
  const keys = ['workflowId', 'revision', 'currentStep', 'status', 'stateVersion', 'slug', 'workflowType'];
  return keys.every((key) => JSON.stringify(jsonState[key]) === JSON.stringify(markdownData[key]));
}

function resolveContextHygiene(config) {
  const hygiene = config?.defaults?.contextHygiene || {};
  return {
    pruneAfterStep: hygiene.pruneAfterStep !== false,
    backgroundVerboseSteps: hygiene.backgroundVerboseSteps === true,
  };
}

function resolveReviewJurySize(config) {
  const size = Number(config?.defaults?.reviewJury?.size);
  if (!Number.isInteger(size)) return 1;
  return size;
}

function findingsHistogram(value) {
  const empty = {
    critical: 0, warning: 0, suggestion: 0, info: 0,
  };
  if (!value) return empty;
  if (Array.isArray(value)) {
    for (const item of value) {
      const key = String(item.severity || '').toLowerCase();
      if (Object.hasOwn(empty, key)) empty[key] += 1;
    }
    return empty;
  }
  if (typeof value === 'object') {
    return {
      critical: Number(value.critical || 0),
      warning: Number(value.warning || 0),
      suggestion: Number(value.suggestion || 0),
      info: Number(value.info || 0),
    };
  }
  return empty;
}

function truncateHandoff(payload) {
  let text = `${JSON.stringify(payload)}\n`;
  const limit = 8192;
  if (Buffer.byteLength(text, 'utf8') <= limit) return text;
  const copy = {
    ...payload,
    summary: String(payload.summary || '').slice(0, 200),
    artifactPaths: (payload.artifactPaths || []).slice(0, 8),
  };
  text = `${JSON.stringify(copy)}\n`;
  if (Buffer.byteLength(text, 'utf8') <= limit) return text;
  copy.summary = String(copy.summary || '').slice(0, 80);
  copy.artifactPaths = [];
  return `${JSON.stringify(copy)}\n`;
}

function writeHandoffFile({ usDir, state, pipeline, step, options, context, output }) {
  const schemaPath = path.join(__dirname, '..', 'schemas', 'handoff.schema.json');
  let payload;
  if (options.handoff) {
    payload = JSON.parse(fs.readFileSync(path.resolve(context.repoRoot, options.handoff), 'utf8'));
  } else {
    const created = listArg(options.created || output.files_touched?.created?.join(','));
    const modified = listArg(options.modified || output.files_touched?.modified?.join(','));
    const deleted = listArg(options.deleted || output.files_touched?.deleted?.join(','));
    payload = {
      step: Number(step),
      slug: String(state.slug || ''),
      workflowId: String(state.workflowId || ''),
      workflowType: pipeline,
      status: String(options.status || 'completed'),
      artifactPaths: [...new Set([...created, ...modified, ...deleted])],
      acRefs: listArg(options.acRefs || (Array.isArray(output.acRefs) ? output.acRefs.join(',') : '')),
      summary: String(output.summary || options.summary || `Finished step ${step}`).slice(0, 500),
      nextAction: String(state.nextAction || ''),
      findings: findingsHistogram(output.findings),
    };
  }
  const errors = validateNode(payload, loadJsonSchema(schemaPath, 'handoff schema'), 'handoff');
  if (errors.length) throw new Error(errors.join('; '));
  const text = truncateHandoff(payload);
  const target = path.join(usDir, 'handoff', `step-${String(step).padStart(2, '0')}.json`);
  atomicWrite(target, text);
  return Buffer.byteLength(text, 'utf8');
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function cleanScalar(value) {
  const raw = String(value ?? '').trim();
  const unquoted = raw.replace(/^(['"])([\s\S]*)\1$/, '$2');
  if (unquoted === 'true') return true;
  if (unquoted === 'false') return false;
  if (unquoted === 'null' || unquoted === '~') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(unquoted)) return Number(unquoted);
  return unquoted;
}

function splitInline(value) {
  const parts = [];
  let current = '';
  let quote = '';
  let depth = 0;
  for (const character of value) {
    if (quote) {
      current += character;
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      current += character;
    } else if (character === '{' || character === '[') {
      depth += 1;
      current += character;
    } else if (character === '}' || character === ']') {
      depth -= 1;
      current += character;
    } else if (character === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += character;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseInline(value) {
  const raw = value.trim();
  if (raw === '[]') return [];
  if (raw === '{}') return {};
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return splitInline(raw.slice(1, -1)).map((item) => parseValue(item));
  }
  if (raw.startsWith('{') && raw.endsWith('}')) {
    const object = {};
    for (const item of splitInline(raw.slice(1, -1))) {
      const match = item.match(/^["']?([A-Za-z0-9_-]+)["']?\s*:\s*([\s\S]*)$/);
      if (match) object[match[1]] = parseValue(match[2]);
    }
    return object;
  }
  return cleanScalar(raw);
}

function parseValue(value) {
  const raw = String(value).trim();
  return /^[{[]/.test(raw) ? parseInline(raw) : cleanScalar(raw);
}

function mappingIndent(block) {
  for (const line of block) {
    if (line.trim()) return line.match(/^(\s*)/)[0].length;
  }
  return 0;
}

function parseNestedMapping(block) {
  const nested = {};
  const base = mappingIndent(block);
  for (let index = 0; index < block.length; index += 1) {
    const line = block[index];
    if (!line.trim()) continue;
    const indent = line.match(/^(\s*)/)[0].length;
    if (indent !== base) continue;
    const item = line.trim().match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!item) continue;
    const [, nestedKey, raw] = item;
    if (raw !== '') {
      nested[nestedKey] = parseValue(raw);
      continue;
    }
    const child = [];
    while (index + 1 < block.length) {
      const next = block[index + 1];
      if (!next.trim()) {
        index += 1;
        continue;
      }
      const nextIndent = next.match(/^(\s*)/)[0].length;
      if (nextIndent <= indent) break;
      child.push(block[++index]);
    }
    const childNonEmpty = child.filter((row) => row.trim());
    if (!childNonEmpty.length) nested[nestedKey] = {};
    else if (childNonEmpty.every((row) => row.trim().startsWith('-'))) {
      nested[nestedKey] = childNonEmpty.map((row) => parseValue(row.trim().slice(1).trim()));
    } else nested[nestedKey] = parseNestedMapping(child);
  }
  return nested;
}

function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n?/g, '\n');
  const match = normalized.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) throw new Error('frontmatter YAML marker not found');
  const data = {};
  const lines = match[1].split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const top = lines[index].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!top) continue;
    const [, key, raw] = top;
    if (raw !== '') {
      data[key] = parseValue(raw);
      continue;
    }
    const block = [];
    while (index + 1 < lines.length && (/^\s+/.test(lines[index + 1]) || lines[index + 1].trim() === '')) {
      block.push(lines[++index]);
    }
    const nonEmpty = block.filter((line) => line.trim());
    if (nonEmpty.every((line) => line.trim().startsWith('-'))) {
      data[key] = nonEmpty.map((line) => parseValue(line.trim().slice(1).trim()));
    } else {
      data[key] = parseNestedMapping(block);
    }
  }
  return { data, body: normalized.slice(match[0].length), frontmatter: match[1] };
}

function scalar(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const text = String(value);
  if (!text || /[:#,\n[\]{}]|^\s|\s$/.test(text)) return JSON.stringify(text);
  return text;
}

function formatInline(value) {
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return `[${value.map((item) => (item && typeof item === 'object' && !Array.isArray(item) ? inlineObject(item) : scalar(item))).join(', ')}]`;
  }
  if (value && typeof value === 'object') return inlineObject(value);
  return scalar(value);
}

function inlineObject(value) {
  return `{ ${Object.entries(value).map(([key, item]) => `${key}: ${formatInline(item)}`).join(', ')} }`;
}

function upsertArtifactFrontmatter(text, fields) {
  const normalized = String(text).replace(/\r\n?/g, '\n');
  let data = {};
  let body = normalized;
  try {
    const parsed = parseFrontmatter(normalized);
    data = parsed.data;
    body = parsed.body;
  } catch (error) {
    if (!/frontmatter YAML marker not found/.test(error.message)) throw error;
  }
  return `---\n${serializeFrontmatter({ ...data, ...fields })}\n---\n${body.replace(/^\n*/, '')}`;
}

function artifactStampFields(state, step, now) {
  return {
    step,
    slug: state.slug,
    workflowId: state.workflowId,
    status: state.status || 'completed',
    startedAt: state.startedAt || now,
    endedAt: now,
    acRefs: Array.isArray(state.acRefs) ? state.acRefs : [],
  };
}

function finishArtifactName(slug, step) {
  const names = {
    0: `step-00-${slug}.spec.md`,
    1: `step-01-${slug}.plan.md`,
    2: `step-02-${slug}.plan.refined.md`,
    3: `step-03-${slug}.plan.exec.md`,
    5: `step-05-${slug}.plan.report.md`,
    6: `step-06-${slug}.review.md`,
    7: `step-07-${slug}.testing.report.md`,
    8: `step-08-${slug}.result.md`,
  };
  return names[step];
}

function stampStepArtifact(file, state, step) {
  if (!file || !fs.existsSync(file)) return false;
  const now = new Date().toISOString();
  const fields = artifactStampFields(state, step, now);
  try {
    const previous = parseFrontmatter(fs.readFileSync(file, 'utf8')).data;
    if (previous.startedAt) fields.startedAt = previous.startedAt;
    if (previous.endedAt) fields.endedAt = previous.endedAt;
  } catch {
    // body-only artifacts get a new metadata block
  }
  atomicWrite(file, upsertArtifactFrontmatter(fs.readFileSync(file, 'utf8'), fields));
  return true;
}

function serializeFrontmatter(data) {
  const lines = [];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      if (!value.length) lines.push(`${key}: []`);
      else {
        lines.push(`${key}:`);
        for (const item of value) lines.push(`  - ${item && typeof item === 'object' ? inlineObject(item) : scalar(item)}`);
      }
    } else if (value && typeof value === 'object') {
      if (!Object.keys(value).length) lines.push(`${key}: {}`);
      else {
        lines.push(`${key}:`);
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (Array.isArray(nestedValue)) {
            if (!nestedValue.length) lines.push(`  ${nestedKey}: []`);
            else if (nestedValue.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
              lines.push(`  ${nestedKey}:`);
              for (const item of nestedValue) lines.push(`    - ${inlineObject(item)}`);
            } else lines.push(`  ${nestedKey}: ${formatInline(nestedValue)}`);
          } else if (nestedValue && typeof nestedValue === 'object') {
            lines.push(`  ${nestedKey}: ${inlineObject(nestedValue)}`);
          } else lines.push(`  ${nestedKey}: ${scalar(nestedValue)}`);
        }
      }
    } else lines.push(`${key}: ${scalar(value)}`);
  }
  return lines.join('\n');
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  const handle = fs.openSync(temporary, 'w');
  try {
    fs.writeFileSync(handle, content, 'utf8');
    try {
      fs.fsyncSync(handle);
    } catch (error) {
      if (!error || !['EPERM', 'EINVAL'].includes(error.code)) throw error;
    }
  } finally {
    fs.closeSync(handle);
  }
  fs.renameSync(temporary, file);
}

function appendJsonl(file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
}

function listArg(value) {
  if (!value) return [];
  return String(value).split(',').map((item) => item.trim().replace(/\\/g, '/')).filter(Boolean);
}

function redactSecrets(value) {
  return String(value).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED]');
}

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (!token.startsWith('--')) positional.push(token);
    else {
      const key = token.slice(2).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
      if (key === 'preAdvance') {
        const next = argv[index + 1];
        if (next === undefined || String(next).startsWith('--')) {
          throw new Error('--pre-advance requires a step number (1-9)');
        }
        options.preAdvance = argv[++index];
        continue;
      }
      if (['json', 'estimated'].includes(key) && (index + 1 >= argv.length || argv[index + 1].startsWith('--'))) options[key] = true;
      else options[key] = argv[++index];
    }
  }
  return { positional, options };
}

function requirePreAdvanceStep(value) {
  const next = Number(value);
  if (!Number.isInteger(next) || next < 1 || next > 9) {
    throw new Error('--pre-advance requires a step number (1-9)');
  }
  return next;
}

function normalizeFable(value) {
  if (value === true || value === 'true' || value === undefined || value === null) return 'refuted';
  if (value === false || value === 'false') return false;
  if (value === 'refuted' || value === 'caveats') return value;
  throw new Error('fable.auditVerdictsBlockShip must be false, "refuted", or "caveats"');
}

function fableBlocks(value, verdict) {
  const normalized = normalizeFable(value);
  const upper = String(verdict || '').toUpperCase();
  if (upper === 'REFUTED') return true;
  return normalized === 'caveats' && upper === 'VERIFIED WITH CAVEATS';
}

function commonEvent(state, pipeline, step, type, timestamp, options, context) {
  const packageFile = path.join(context.repoRoot, 'package.json');
  const packageVersion = fs.existsSync(packageFile) ? JSON.parse(fs.readFileSync(packageFile, 'utf8')).version : 'unknown';
  return {
    schemaVersion: SCHEMA_VERSION,
    type,
    timestamp,
    workflowId: String(state.workflowId || ''),
    pipeline,
    packageVersion,
    step,
    ...(isNonEmptyModel(options.substep) ? { substep: String(options.substep).trim() } : {}),
    model: String(options.model || state.currentModel || 'unknown'),
    retries: Number(options.retries || 0),
    reviewRounds: Number(options.reviewRounds || 0),
    refineRounds: Number(options.refineRounds || 0),
    skipReason: options.reason || null,
    bypassed: type === 'gate-bypass',
    acTotal: Number(options.acTotal || state.acTotal || 0),
    acImplemented: Number(options.acImplemented || state.acImplemented || 0),
  };
}

function readStepOutput(value, context) {
  if (!value) return {};
  const candidate = path.resolve(context.repoRoot, value);
  const raw = fs.existsSync(candidate) ? fs.readFileSync(candidate, 'utf8') : value;
  try {
    return JSON.parse(raw);
  } catch {
    return { summary: String(raw).slice(0, 2000) };
  }
}

function applyFinishTelemetry(state, labels, step, payload) {
  const telemetry = state.telemetry && typeof state.telemetry === 'object' && !Array.isArray(state.telemetry)
    ? state.telemetry
    : {};
  const prior = Array.isArray(telemetry.steps)
    ? telemetry.steps.filter((item) => item && typeof item === 'object')
    : [];
  const row = {
    N: step,
    label: labels[step] || `Step ${step}`,
    dispatchedAt: payload.dispatchedAt || null,
    finishedAt: payload.finishedAt,
    elapsedSec: payload.elapsedSec,
    promptTokens: payload.promptTokens,
    completionTokens: payload.completionTokens,
    estimated: payload.estimated,
    model: payload.model,
    filesTouched: payload.filesTouched,
  };
  telemetry.steps = [...prior.filter((item) => Number(item.N ?? item.step) !== step), row]
    .sort((a, b) => Number(a.N ?? a.step) - Number(b.N ?? b.step));
  telemetry.totalElapsedSec = telemetry.steps.reduce((sum, item) => sum + Number(item.elapsedSec || 0), 0);
  telemetry.totalTokens = telemetry.steps.reduce(
    (sum, item) => sum + Number(item.promptTokens || 0) + Number(item.completionTokens || 0),
    0,
  );
  state.telemetry = telemetry;
}

function compactOutputs(body, step, output) {
  const heading = '## Step outputs (compact)';
  const line = `- Step ${step}: ${String(output.summary || output.status || 'completed').replace(/\s+/g, ' ').slice(0, 240)}`;
  if (!body.includes(heading)) return `${body.replace(/\s*$/, '\n\n')}${heading}\n\n${line}\n`;
  const expression = new RegExp(`(${heading}\\n\\n)([\\s\\S]*?)(?=\\n## |$)`);
  return body.replace(expression, (_, prefix, content) => {
    const rows = content.trim().split('\n').filter((item) => item && !item.startsWith(`- Step ${step}:`));
    rows.push(line);
    rows.sort((a, b) => Number(a.match(/Step (\d+)/)?.[1] || 0) - Number(b.match(/Step (\d+)/)?.[1] || 0));
    return `${prefix}${rows.join('\n')}\n`;
  });
}

function dispatchTimestamp(entry) {
  if (!entry || typeof entry !== 'object') return '';
  return String(entry.dispatchedAt || entry.dispatched || '');
}

function estimatedSteps(context, pipeline, maxStep) {
  const aggregateFile = resolveConfiguredPath(
    context.repoRoot,
    context.config?.telemetry?.aggregateFile || path.join(context.config?.plans?.dir || '.agents/plans', 'telemetry', 'aggregate.json'),
  );
  let medians = {};
  try {
    const aggregate = JSON.parse(fs.readFileSync(aggregateFile, 'utf8'));
    medians = aggregate.medians?.[pipeline]?.steps || aggregate.medians?.byPipeline?.[pipeline]?.steps || {};
  } catch {
    medians = {};
  }
  return Array.from({ length: maxStep + 1 }, (_, step) => Number(
    typeof medians[String(step)] === 'number' ? medians[String(step)] : medians[String(step)]?.elapsedSec || 0,
  ));
}

function renderRun(run, labels) {
  const lines = [
    '# Workflow progress',
    '',
    `Workflow: ${run.workflowId}`,
    `Status: ${run.status}`,
    `Current step: ${run.currentStep}`,
    `Next action: ${run.nextAction}`,
    '',
    '| Step | Label | Status | Remaining |',
    '|---:|---|---|---:|',
  ];
  for (const step of run.steps) {
    lines.push(`| ${step.step} | ${labels[step.step] || `Step ${step.step}`} | ${step.status} | ${step.estimatedRemainingSec}s |`);
  }
  lines.push('', `ACs: ${run.acImplemented}/${run.acTotal}`, `Score: ${run.score ?? 'n/a'}`, '');
  return lines.join('\n');
}

function buildRun(state, pipeline, maxStep, labels, stateHash, medians) {
  const currentStep = Number(state.currentStep || 0);
  const completed = new Set((state.completedSteps || []).map(Number));
  const skipped = new Map((state.skippedSteps || []).map((item) => [Number(item.step), item.reason]));
  let remaining = 0;
  const steps = Array.from({ length: maxStep + 1 }, (_, step) => {
    const status = skipped.has(step) ? 'skipped' : completed.has(step) ? 'completed' : step === currentStep ? 'active' : 'pending';
    const estimate = status === 'pending' || status === 'active' ? Number(medians[step] || 0) : 0;
    remaining += estimate;
    return { step, status, skipReason: skipped.get(step) || null, estimatedRemainingSec: estimate };
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: Number(state.revision || 0),
    workflowId: String(state.workflowId || ''),
    slug: String(state.slug || state.us || ''),
    pipeline,
    status: String(state.status || 'active'),
    currentStep,
    pendingGate: state.pendingGate || null,
    nextAction: String(state.nextAction || `Run step ${currentStep}`),
    acTotal: Number(state.acTotal || 0),
    acImplemented: Number(state.acImplemented || 0),
    score: state.verificationScore ?? null,
    estimatedRemainingSec: remaining,
    steps,
    statePath: state.statePath,
    stateSha256: stateHash,
  };
}

function plansIndexPath(context) {
  const plansDir = resolveConfiguredPath(context.repoRoot, context.config?.plans?.dir, '.agents/plans');
  return path.join(plansDir, 'index.json');
}

function updatePlansIndex(context, run, timestamp) {
  const file = plansIndexPath(context);
  let index = { schemaVersion: SCHEMA_VERSION, revision: run.revision, generatedAt: timestamp, workflows: [] };
  try {
    index = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    index = { schemaVersion: SCHEMA_VERSION, workflows: [] };
  }
  const row = {
    workflowId: run.workflowId,
    slug: run.slug,
    pipeline: run.pipeline,
    statePath: run.statePath,
    stateSha256: run.stateSha256,
    status: run.status,
    currentStep: run.currentStep,
    updatedAt: timestamp,
    runPath: `${path.posix.dirname(run.statePath)}/run.json`,
  };
  index.schemaVersion = SCHEMA_VERSION;
  index.revision = run.revision;
  index.generatedAt = timestamp;
  index.workflows = [...(index.workflows || []).filter((item) => item && item.workflowId && item.workflowId !== row.workflowId), row]
    .sort((a, b) => String(a.workflowId).localeCompare(String(b.workflowId)));
  return { file, index };
}

function validateGateDecision(value) {
  if (!value) return null;
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  const keys = Object.keys(parsed).sort().join(',');
  if (keys !== 'choice,gate,reason,round' || !Number.isInteger(Number(parsed.round))) {
    throw new Error('gateDecision must contain gate, choice, reason, and integer round only');
  }
  return { gate: String(parsed.gate), choice: String(parsed.choice), reason: String(parsed.reason), round: Number(parsed.round) };
}

function statePaths(stateFile, context) {
  const mdPath = markdownStatePath(stateFile);
  const statePath = toRepoRelative(context.repoRoot, mdPath);
  return {
    statePath,
    usDir: path.dirname(mdPath),
    runFile: path.join(path.dirname(mdPath), 'run.json'),
    runMarkdown: path.join(path.dirname(mdPath), 'RUN.md'),
    jsonFile: jsonStatePath(mdPath),
  };
}

const KNOWN_SUBSTEPS = new Set(['dag', 'scoreAndRefine', 'reviewFix', 'fixPrPlan', 'fixPrExec']);
const FIX_PR_SUBSTEPS = new Set(['fixPrPlan', 'fixPrExec']);

function isNonEmptyModel(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function normalizeSubstep(value) {
  if (!isNonEmptyModel(value)) return null;
  const role = String(value).trim();
  return KNOWN_SUBSTEPS.has(role) ? role : null;
}

function getActivePreset(defaults) {
  const presets = defaults?.modelPresets;
  if (!presets || typeof presets !== 'object') return null;
  const selected = defaults.modelsPreset;
  if (isNonEmptyModel(selected) && presets[String(selected).trim()]) {
    return presets[String(selected).trim()];
  }
  if (presets.default) return presets.default;
  return null;
}

function resolveStepOverride(defaults, preset, stepKey, role, pipeline) {
  const numericStepAllowed = !FIX_PR_SUBSTEPS.has(role);
  const stepModels = defaults?.stepModels;
  if (stepModels && typeof stepModels === 'object') {
    if (pipeline !== 'lite' && role && isNonEmptyModel(stepModels[role])) {
      return String(stepModels[role]).trim();
    }
    if (numericStepAllowed && isNonEmptyModel(stepModels[stepKey])) {
      const stepNum = Number(stepKey);
      if (pipeline !== 'lite' || (Number.isInteger(stepNum) && stepNum >= 0 && stepNum <= 5)) {
        return String(stepModels[stepKey]).trim();
      }
    }
  }
  const steps = preset?.steps;
  if (steps && typeof steps === 'object') {
    if (pipeline !== 'lite' && role && isNonEmptyModel(steps[role])) {
      return String(steps[role]).trim();
    }
    if (numericStepAllowed && isNonEmptyModel(steps[stepKey])) {
      const stepNum = Number(stepKey);
      if (pipeline !== 'lite' || (Number.isInteger(stepNum) && stepNum >= 0 && stepNum <= 5)) {
        return String(steps[stepKey]).trim();
      }
    }
  }
  return null;
}

function resolvePhaseKeyValue(defaults, preset, phaseKey) {
  if (phaseKey && isNonEmptyModel(defaults?.[phaseKey])) return String(defaults[phaseKey]).trim();
  if (phaseKey && preset && isNonEmptyModel(preset[phaseKey])) return String(preset[phaseKey]).trim();
  return null;
}

function resolveStandardStep7Chain(defaults, preset) {
  if (isNonEmptyModel(defaults?.testingModel)) return String(defaults.testingModel).trim();
  if (preset && isNonEmptyModel(preset.testingModel)) return String(preset.testingModel).trim();
  if (isNonEmptyModel(defaults?.executionModel)) return String(defaults.executionModel).trim();
  if (preset && isNonEmptyModel(preset.executionModel)) return String(preset.executionModel).trim();
  return null;
}

function standardPhaseKey(step, role) {
  if (role === 'fixPrPlan') return 'reviewerModel';
  if (role === 'fixPrExec') return 'executionModel';
  if (role) return 'executionModel';
  if (step >= 0 && step <= 3) return 'plannerModel';
  if (step === 4) return 'executionModel';
  if (step === 5 || step === 6) return 'reviewerModel';
  if (step === 7) return 'step7-chain';
  return null;
}

function litePhaseKey(step) {
  if (step === 0 || step === 1) return 'plannerModel';
  if (step === 2) return 'executionModel';
  if (step === 3) return 'reviewerModel';
  return null;
}

function finalizeResolvedModel(value, sessionModel) {
  if (value === 'current') return sessionModel || 'unknown';
  if (isNonEmptyModel(value)) return String(value).trim();
  return sessionModel || 'unknown';
}

function resolvePhaseModel(defaults, { step, role, pipeline = 'standard', sessionModel = 'unknown' }) {
  const stepNum = Number(step);
  const stepKey = String(step);
  const normalizedRole = pipeline === 'lite' ? null : normalizeSubstep(role);
  const preset = getActivePreset(defaults || {});
  const override = resolveStepOverride(defaults || {}, preset, stepKey, normalizedRole, pipeline);
  if (override) return finalizeResolvedModel(override, sessionModel);

  if (pipeline === 'lite') {
    const phaseKey = litePhaseKey(stepNum);
    if (phaseKey) {
      const phaseValue = resolvePhaseKeyValue(defaults || {}, preset, phaseKey);
      if (phaseValue) return finalizeResolvedModel(phaseValue, sessionModel);
    }
    return sessionModel || 'unknown';
  }

  const phaseKey = standardPhaseKey(stepNum, normalizedRole);
  if (phaseKey === 'step7-chain') {
    const chainValue = resolveStandardStep7Chain(defaults || {}, preset);
    if (chainValue) return finalizeResolvedModel(chainValue, sessionModel);
    return sessionModel || 'unknown';
  }
  if (phaseKey) {
    const phaseValue = resolvePhaseKeyValue(defaults || {}, preset, phaseKey);
    if (phaseValue) return finalizeResolvedModel(phaseValue, sessionModel);
  }
  return sessionModel || 'unknown';
}

function resolveRecordedModel(options, context, state, pipeline, step) {
  if (options.model && String(options.model).trim()) return String(options.model).trim();
  let role = options.substep;
  if (!role || !String(role).trim()) {
    const prior = (state.stepDispatches || []).find((item) => Number(item.step) === Number(step));
    role = prior?.substep;
  }
  return resolvePhaseModel(context.config?.defaults || {}, {
    step,
    role,
    pipeline,
    sessionModel: String(state.currentModel || 'unknown'),
  });
}

function performUpdate({ pipeline, maxStep, labels }, operation, stateFile, options) {
  if (!['dispatch', 'finish', 'bypass'].includes(operation)) throw new Error('operation must be dispatch, finish, or bypass');
  if (options.elapsed !== undefined) throw new Error('--elapsed is not accepted; elapsedSec is derived from timestamps');
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: options.scriptFile });
  const absoluteInput = path.resolve(context.repoRoot, stateFile);
  const loaded = loadPersistedState(absoluteInput);
  const absoluteState = loaded.mdPath;
  const priorFingerprint = finishFingerprint(loaded.state);
  const priorJsonText = loaded.jsonText;
  const state = loaded.state;
  const step = Number(options.step);
  if (!Number.isInteger(step) || step < 0 || step > maxStep) throw new Error(`step must be in range 0..${maxStep}`);
  const timestamp = String(options.timestamp || options.finishedAt || options.dispatchedAt || nowIso());
  const paths = statePaths(absoluteState, context);
  syncAcCountsFromLedger(state, paths.usDir);
  state.stateVersion = STATE_VERSION;
  state.revision = Number(state.revision || 0) + 1;
  state.workflowType = pipeline;
  state.workflowId ||= path.basename(absoluteState, '.state.md');
  state.slug ||= state.us || path.basename(path.dirname(absoluteState));
  state.statePath = paths.statePath;
  state.completedSteps = Array.isArray(state.completedSteps) ? state.completedSteps : [];
  state.skippedSteps = Array.isArray(state.skippedSteps) ? state.skippedSteps : [];
  state.stepStatus = state.stepStatus && typeof state.stepStatus === 'object' ? state.stepStatus : {};
  state.stepDispatches = Array.isArray(state.stepDispatches) ? state.stepDispatches : [];
  let body = loaded.body;
  let event;
  let finishOutput = {};

  if (operation === 'dispatch') {
    state.currentStep = step;
    state.stepStatus[String(step)] = 'active';
    const dispatch = { step, dispatchedAt: timestamp };
    if (options.substep && String(options.substep).trim()) {
      dispatch.substep = String(options.substep).trim();
    }
    state.stepDispatches = [...state.stepDispatches.filter((item) => Number(item.step) !== step), dispatch].sort((a, b) => a.step - b.step);
    state.currentModel = resolveRecordedModel(options, context, state, pipeline, step);
    options.model = state.currentModel;
    state.nextAction = `Finish step ${step}`;
    event = commonEvent(state, pipeline, step, 'dispatch', timestamp, options, context);
    event.dispatchedAt = timestamp;
  } else if (operation === 'finish') {
    const dispatch = state.stepDispatches.find((item) => Number(item.step) === step);
    const dispatchedAt = String(options.dispatchedAt || dispatchTimestamp(dispatch));
    const finishedAt = timestamp;
    const elapsedSec = dispatchedAt ? Math.max(0, Math.floor((Date.parse(finishedAt) - Date.parse(dispatchedAt)) / 1000)) : 0;
    const estimated = !dispatchedAt;
    const status = String(options.status || 'completed');
    if (!['completed', 'failed', 'skipped'].includes(status)) throw new Error('finish status must be completed, failed, or skipped');
    if (status === 'skipped') {
      if (!SKIP_REASONS.has(options.reason)) throw new Error(`skip reason must be one of: ${[...SKIP_REASONS].join(', ')}`);
      state.skippedSteps = [...(Array.isArray(state.skippedSteps) ? state.skippedSteps : []).filter((item) => Number(item.step) !== step), {
        step,
        reason: options.reason,
        evidence: String(options.evidence || ''),
      }].sort((a, b) => a.step - b.step);
    }
    state.completedSteps = [...new Set([...(state.completedSteps || []).map(Number), step])].sort((a, b) => a - b);
    state.stepStatus[String(step)] = status;
    state.currentStep = Math.min(maxStep, step + 1);
    state.currentModel = resolveRecordedModel(options, context, state, pipeline, step);
    options.model = state.currentModel;
    state.nextAction = status === 'failed' ? `Repair step ${step}` : `Run step ${state.currentStep}`;
    const output = readStepOutput(options.stepOutput, context);
    finishOutput = output;
    body = compactOutputs(body, step, output);
    const created = listArg(options.created || output.files_touched?.created?.join(','));
    const modified = listArg(options.modified || output.files_touched?.modified?.join(','));
    const deleted = listArg(options.deleted || output.files_touched?.deleted?.join(','));
    applyFinishTelemetry(state, labels, step, {
      dispatchedAt,
      finishedAt,
      elapsedSec,
      estimated,
      promptTokens: Number(options.promptTokens || 0),
      completionTokens: Number(options.completionTokens || 0),
      model: state.currentModel,
      filesTouched: { created, modified, deleted },
    });
    state.workflowManifest = state.workflowManifest && typeof state.workflowManifest === 'object' ? state.workflowManifest : {};
    for (const key of ['created', 'modified', 'deleted']) {
      state.workflowManifest[key] = [...new Set([...(state.workflowManifest[key] || []), ...({ created, modified, deleted }[key])])].sort();
    }
    const gateDecision = validateGateDecision(options.gateDecision);
    if (gateDecision) state.gateDecision = gateDecision;
    let derivedScore = null;
    if (options.verificationScore !== undefined) {
      const ledgerFile = path.join(paths.usDir, 'ac-ledger.json');
      if (!fs.existsSync(ledgerFile)) throw new Error('verification score requires ac-ledger.json');
      const ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
      const derived = scoreLedger(ledger, options.scoreBoundary || 'step5', context);
      if (Number(options.verificationScore) !== derived.score) {
        throw new Error(`verification score mismatch: supplied ${options.verificationScore}, derived ${derived.score}`);
      }
      derivedScore = derived.score;
      state.verificationScore = derivedScore;
    }
    if (options.fableVerdict !== undefined) {
      if (fableBlocks(context.config?.fable?.auditVerdictsBlockShip, options.fableVerdict)) throw new Error(`fable verdict blocks this transition: ${options.fableVerdict}`);
      state.fableVerdict = options.fableVerdict;
    }
    if (options.commit) {
      const commitSha = String(options.commit).trim();
      if (!/^[a-f0-9]{7,40}$/i.test(commitSha)) throw new Error('commit sha must be 7-40 hex characters');
      state.commits = Array.isArray(state.commits) ? state.commits : [];
      if (!state.commits.some((item) => item.sha === commitSha)) {
        state.commits.push({ sha: commitSha, step: Number(step) });
      }
    }
    event = {
      ...commonEvent(state, pipeline, step, 'finish', finishedAt, options, context),
      dispatchedAt: dispatchedAt || null,
      finishedAt,
      elapsedSec,
      estimated,
      promptTokens: Number(options.promptTokens || 0),
      completionTokens: Number(options.completionTokens || 0),
      filesTouched: { created, modified, deleted },
      gateDecision,
      score: derivedScore,
      verdict: options.fableVerdict || null,
      errors: listArg(options.errors).map(redactSecrets),
    };
  } else {
    if (!options.gate || !options.reason) throw new Error('bypass requires --gate and --reason');
    event = {
      ...commonEvent(state, pipeline, step, 'gate-bypass', timestamp, options, context),
      gate: String(options.gate),
      reason: String(options.reason),
    };
    state.nextAction ||= `Run step ${step}`;
  }

  syncAcCountsFromLedger(state, paths.usDir);
  if (Array.isArray(state.stepDispatches)) {
    state.stepDispatches = state.stepDispatches
      .map((item) => {
        const dispatchedAt = dispatchTimestamp(item);
        const row = { step: Number(item.step), dispatchedAt };
        if (item.substep && String(item.substep).trim()) row.substep = String(item.substep).trim();
        return dispatchedAt ? row : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.step - b.step);
  }
  if (operation === 'finish' && priorJsonText && finishFingerprint(state) === priorFingerprint) {
    const restored = JSON.parse(priorJsonText);
    Object.keys(state).forEach((key) => {
      delete state[key];
    });
    Object.assign(state, restored);
  }
  const jsonText = canonicalStateJson(state);
  const stateHash = sha256(jsonText);
  const stateContent = `---\n${serializeFrontmatter(state)}\n---\n${body.replace(/^\n*/, '')}`;
  const medians = estimatedSteps(context, pipeline, maxStep);
  const run = buildRun(state, pipeline, maxStep, labels, stateHash, medians);
  const index = updatePlansIndex(context, run, timestamp);
  const telemetryFile = path.resolve(context.repoRoot, options.jsonlOut || path.join(paths.usDir, 'telemetry', `step-${String(step).padStart(2, '0')}.jsonl`));

  if (operation === 'finish') {
    const hygiene = resolveContextHygiene(context.config);
    event.handoffBytes = writeHandoffFile({
      usDir: paths.usDir,
      state,
      pipeline,
      step,
      options,
      context,
      output: finishOutput,
    });
    event.pruneAfterStep = hygiene.pruneAfterStep;
    if (pipeline === 'lite' && resolveReviewJurySize(context.config) > 1 && Number(step) === 3) {
      event.juryIgnored = 'lite-inline';
    }
  }

  appendJsonl(telemetryFile, event);
  atomicWrite(paths.jsonFile, jsonText);
  atomicWrite(absoluteState, stateContent);
  atomicWrite(paths.runFile, `${JSON.stringify(run, null, 2)}\n`);
  atomicWrite(paths.runMarkdown, renderRun(run, labels));
  atomicWrite(index.file, `${JSON.stringify(index.index, null, 2)}\n`);
  if (operation === 'finish') {
    const artifact = finishArtifactName(state.slug, step);
    if (artifact) stampStepArtifact(path.join(paths.usDir, artifact), state, step);
  }
  validateSnapshot({ stateFile: absoluteState, runFile: paths.runFile, indexFile: index.file, context, maxStep, pipeline });
  return { ok: true, operation, step, revision: state.revision, stateSha256: stateHash, runPath: toRepoRelative(context.repoRoot, paths.runFile) };
}

function artifactMetadata(file, expectedStep, state) {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) {
    const meta = JSON.parse(text)._meta;
    if (!meta) throw new Error(`JSON artifact lacks _meta: ${file}`);
    return meta;
  }
  const parsed = parseFrontmatter(text).data;
  const required = ['step', 'slug', 'workflowId', 'status', 'startedAt', 'endedAt', 'acRefs'];
  for (const key of required) if (parsed[key] === undefined) throw new Error(`artifact metadata missing ${key}: ${file}`);
  if (Number(parsed.step) !== expectedStep || parsed.slug !== state.slug || parsed.workflowId !== state.workflowId) {
    throw new Error(`artifact metadata identity mismatch: ${file}`);
  }
  if (Number.isNaN(Date.parse(parsed.startedAt)) || (parsed.endedAt && Number.isNaN(Date.parse(parsed.endedAt)))) {
    throw new Error(`artifact timestamps invalid: ${file}`);
  }
  const acRefs = parsed.acRefs || [];
  if (!Array.isArray(acRefs) || new Set(acRefs).size !== acRefs.length) throw new Error(`artifact acRefs invalid: ${file}`);
  return parsed;
}

function validateRuntime(usDir) {
  const runtime = path.join(usDir, '.runtime');
  if (!fs.existsSync(runtime)) return [];
  return fs.readdirSync(runtime).filter((name) => !RUNTIME_NAMES.some((pattern) => pattern.test(name)));
}

function skippedReason(state, step) {
  const item = (state.skippedSteps || []).find((row) => Number(row.step) === Number(step));
  return item && item.reason ? String(item.reason) : '';
}

function requiredAdvanceArtifact(pipeline, next, state) {
  const slug = state.slug || state.us;
  if (!slug) return null;
  if (pipeline === 'lite') {
    const lite = {
      1: { file: `step-00-${slug}.spec.md`, expectedStep: 0 },
      2: { file: `step-01-${slug}.plan.md`, expectedStep: 1 },
      4: { file: `step-06-${slug}.review.md`, expectedStep: 6 },
      5: { file: `step-08-${slug}.result.md`, expectedStep: 8 },
    };
    return lite[next] || null;
  }
  if (next === 3 && skippedReason(state, 2) === 'interview-not-required') return null;
  if (next === 8) {
    const skip = skippedReason(state, 7);
    if (skip === 'testing-disabled' || skip === 'no-test-surface') return null;
  }
  const standard = {
    1: { file: `step-00-${slug}.spec.md`, expectedStep: 0 },
    2: { file: `step-01-${slug}.plan.md`, expectedStep: 1 },
    3: { file: `step-02-${slug}.plan.refined.md`, expectedStep: 2 },
    4: { file: `step-03-${slug}.plan.exec.md`, expectedStep: 3 },
    6: { file: `step-05-${slug}.plan.report.md`, expectedStep: 5 },
    7: { file: `step-06-${slug}.review.md`, expectedStep: 6 },
    8: { file: `step-07-${slug}.testing.report.md`, expectedStep: 7 },
    9: { file: `step-08-${slug}.result.md`, expectedStep: 8 },
  };
  return standard[next] || null;
}

function validateSnapshot({ stateFile, runFile, indexFile, context, maxStep, preAdvance, pipeline }) {
  const mdPath = markdownStatePath(stateFile);
  const jsonPath = jsonStatePath(stateFile);
  const mdText = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : '';
  const jsonText = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, 'utf8') : '';
  if (!mdText && !jsonText) throw new Error(`state file not found: ${stateFile}`);
  const parsed = mdText ? parseFrontmatter(mdText) : { data: {}, body: '' };
  const state = jsonText ? JSON.parse(jsonText) : parsed.data;
  const errors = [];
  if (jsonText && mdText && !stateCoresAgree(state, parsed.data)) {
    errors.push('Markdown-only edit disagrees with JSON state (hash mismatch vs .state.json)');
  }
  for (const key of ['workflowId', 'status', 'currentStep', 'stateVersion', 'revision']) {
    if (state[key] === undefined) errors.push(`mandatory key missing: ${key}`);
  }
  if (Number(state.stateVersion) !== STATE_VERSION) errors.push(`stateVersion must equal ${STATE_VERSION}`);
  if (Number(state.currentStep) < 0 || Number(state.currentStep) > maxStep) errors.push(`currentStep outside 0..${maxStep}`);
  for (const item of state.skippedSteps || []) {
    if (!item || !SKIP_REASONS.has(item.reason) || !Number.isInteger(Number(item.step))) errors.push('skippedSteps entry has invalid reason or step');
  }
  if (state.gateDecision !== undefined) {
    try { validateGateDecision(state.gateDecision); } catch (error) { errors.push(error.message); }
  }
  if (jsonText) {
    errors.push(...validateNode(state, loadJsonSchema(path.join(__dirname, '..', 'workflow-state.schema.json'), 'workflow state schema'), 'state.json'));
  }
  const actualHash = jsonText ? sha256(jsonText) : stateIdentityHash(mdText);
  if (fs.existsSync(runFile)) {
    const run = JSON.parse(fs.readFileSync(runFile, 'utf8'));
    if (run.revision !== Number(state.revision) || !snapshotHashMatches(run.stateSha256, mdText, jsonText)) {
      errors.push('run.json revision/state hash mismatch');
    }
    const runSchema = path.join(__dirname, '..', 'run.schema.json');
    errors.push(...validateNode(run, loadJsonSchema(runSchema, 'run schema'), 'run.json'));
  }
  if (fs.existsSync(indexFile) && inside(path.resolve(mdPath), context.repoRoot)) {
    const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    const row = index.workflows?.find((item) => item.workflowId === state.workflowId);
    if (!row) {
      errors.push(`plans index missing workflow entry: ${state.workflowId}`);
    } else if (!snapshotHashMatches(row.stateSha256, mdText, jsonText)) {
      errors.push('plans index state hash mismatch');
    }
  }
  const unknownRuntime = validateRuntime(path.dirname(mdPath));
  if (unknownRuntime.length) errors.push(`unknown .runtime residue: ${unknownRuntime.join(', ')}`);
  if (preAdvance !== undefined) {
    const next = Number(preAdvance);
    const flow = pipeline || state.workflowType || 'standard';
    const required = requiredAdvanceArtifact(flow, next, state);
    if (required) {
      const file = path.join(path.dirname(mdPath), required.file);
      if (!fs.existsSync(file)) errors.push(`required artifact missing: ${toRepoRelative(context.repoRoot, file, { allowOutside: true })}`);
      else {
        try { artifactMetadata(file, required.expectedStep, state); } catch (error) { errors.push(error.message); }
      }
    }
    const implementFrom = flow === 'lite' ? 2 : 4;
    if (next >= implementFrom && !fs.existsSync(path.join(path.dirname(mdPath), 'plan.index.json'))) {
      errors.push('plan.index.json is required before implement');
    }
    const ledgerFile = path.join(path.dirname(mdPath), 'ac-ledger.json');
    if (next >= 1 && !fs.existsSync(ledgerFile)) errors.push('ac-ledger.json is required before advance');
    if (next >= 6 && fs.existsSync(ledgerFile)) {
      const ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
      const boundary = next === 6 ? 'pre-step6' : next >= 9 ? 'ship' : 'step5';
      let derived;
      try {
        derived = scoreLedger(ledger, boundary, context);
      } catch (error) {
        errors.push(`ledger verification failed: ${error.message}`);
      }
      const minVerifyScore = resolveMinVerifyScore(context.config);
      if (!derived || derived.score < minVerifyScore) {
        errors.push(`ledger score must be at least ${minVerifyScore} before step 6`);
      }
      if (!ledger.scoreState || Number(ledger.scoreState.score) !== derived?.score || ledger.scoreState.boundary !== boundary) {
        errors.push(`ledger scoreState must match derived ${boundary} score`);
      }
      for (const error of derived?.errors || []) errors.push(`ledger: ${error}`);
      if ((ledger.acceptanceCriteria || []).some((row) => !row.commits?.length)) errors.push('every AC requires a linked product commit before step 6');
      const verdicts = (ledger.acceptanceCriteria || []).flatMap((row) => row.verdicts || []);
      const blocking = verdicts.find((item) => fableBlocks(context.config?.fable?.auditVerdictsBlockShip, item.verdict));
      if (blocking) errors.push(`ledger fable verdict blocks transition: ${blocking.verdict}`);
    }
  }
  if (errors.length) throw new Error(errors.join('; '));
  return { ok: true, workflowId: state.workflowId, revision: Number(state.revision), stateSha256: actualHash };
}

function runUpdateCli(config) {
  try {
    const { positional, options } = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write('Usage: update_state.cjs dispatch|finish|bypass <state> --step N [options]\n');
      return;
    }
    const [operation, stateFile] = positional;
    options.scriptFile = config.scriptFile;
    const result = performUpdate(config, operation, stateFile, options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}

function resolveStateFile(input, context) {
  const direct = path.resolve(context.repoRoot, input);
  if (fs.existsSync(direct)) return direct;
  const plansDir = resolveConfiguredPath(context.repoRoot, context.config?.plans?.dir, '.agents/plans');
  const names = input.endsWith('.state.md') ? [input] : [input, `${input}.state.md`];
  const indexFile = path.join(plansDir, 'index.json');
  if (fs.existsSync(indexFile)) {
    const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    const row = (index.workflows || []).find((item) => item.workflowId === input || names.some((name) => path.posix.basename(item.statePath) === name));
    if (row) return path.resolve(context.repoRoot, row.statePath);
    return direct;
  }
  const stack = [plansDir];
  while (stack.length) {
    const current = stack.pop();
    if (!fs.existsSync(current)) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (names.includes(entry.name)) return full;
    }
  }
  return direct;
}

function rebuildIndex(context, config) {
  const plansDir = resolveConfiguredPath(context.repoRoot, context.config?.plans?.dir, '.agents/plans');
  const workflows = [];
  const stack = [plansDir];
  let maxRevision = 0;
  for (const current of stack) {
    if (!fs.existsSync(current)) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.endsWith('.state.md')) {
        const loaded = loadPersistedState(full);
        const state = loaded.state;
        const hash = loaded.jsonText ? sha256(loaded.jsonText) : stateIdentityHash(fs.readFileSync(full, 'utf8'));
        maxRevision = Math.max(maxRevision, Number(state.revision || 0));
        workflows.push({
          workflowId: state.workflowId,
          slug: state.slug || state.us,
          pipeline: state.workflowType || config.pipeline,
          statePath: toRepoRelative(context.repoRoot, full),
          stateSha256: hash,
          status: state.status,
          currentStep: Number(state.currentStep || 0),
          updatedAt: nowIso(),
          runPath: `${path.posix.dirname(toRepoRelative(context.repoRoot, full))}/run.json`,
        });
      }
    }
  }
  workflows.sort((a, b) => String(a.workflowId).localeCompare(String(b.workflowId)));
  const index = { schemaVersion: SCHEMA_VERSION, revision: maxRevision, generatedAt: nowIso(), workflows };
  atomicWrite(plansIndexPath(context), `${JSON.stringify(index, null, 2)}\n`);
  return { ok: true, type: 'index-rebuilt', workflows: workflows.length };
}

function runValidateCli(config) {
  try {
    const { positional, options } = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write('Usage: validate_state.cjs <state|workflowId|rebuild-index> [--pre-advance N] [--repo-root DIR]\n');
      return;
    }
    const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: config.scriptFile });
    if (positional[0] === 'rebuild-index') {
      process.stdout.write(`${JSON.stringify(rebuildIndex(context, config), null, 2)}\n`);
      return;
    }
    if (!positional[0]) throw new Error('state path or workflow id is required');
    const stateFile = resolveStateFile(positional[0], context);
    if (!fs.existsSync(stateFile)) throw new Error(`state file not found: ${positional[0]}`);
    const result = validateSnapshot({
      stateFile,
      runFile: path.join(path.dirname(stateFile), 'run.json'),
      indexFile: plansIndexPath(context),
      context,
      maxStep: config.maxStep,
      pipeline: config.pipeline,
      preAdvance: options.preAdvance === undefined ? undefined : requirePreAdvanceStep(options.preAdvance),
    });
    process.stdout.write(`${JSON.stringify({ ...result, state: toRepoRelative(context.repoRoot, stateFile, { allowOutside: true }) }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  STATE_VERSION,
  SCHEMA_VERSION,
  SKIP_REASONS,
  RUNTIME_NAMES,
  sha256,
  stateIdentityHash,
  jsonIdentityHash,
  canonicalStateJson,
  legacyStateHash,
  snapshotHashMatches,
  parseArgs,
  parseFrontmatter,
  serializeFrontmatter,
  normalizeFable,
  fableBlocks,
  renderRun,
  validateGateDecision,
  artifactMetadata,
  upsertArtifactFrontmatter,
  artifactStampFields,
  stampStepArtifact,
  performUpdate,
  resolvePhaseModel,
  validateSnapshot,
  runUpdateCli,
  runValidateCli,
};
