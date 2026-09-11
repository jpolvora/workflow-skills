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
const { scoreLedger } = require('../../../ws-spec-to-pr/scripts/ac_ledger.cjs');
const { syncAcCountsFromLedger } = require('./ac_counts.cjs');
const { loadJsonSchema, validateNode } = require('./validate_json_schema.cjs');

const STATE_VERSION = 3;
const SCHEMA_VERSION = 1;
const SKIP_REASONS = new Set([
  'interview-not-required',
  'dag-disabled',
  'testing-disabled',
  'no-test-surface',
  'fix-pr-not-applicable',
]);
const SHIP_STATUSES = new Set(['pending', 'skipped', 'pushed', 'pr-open', 'merged', 'stopped']);
const STEP_FINISH_STATUSES = new Set(['completed', 'failed', 'skipped']);
const FILE_LIST_FLAGS = new Set(['created', 'modified', 'deleted']);
const CLOSE_STEP = { standard: 8, lite: 4 };
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
  /^plan\.index\.json$/,
  /^step(-\d+)?-output\.json$/,
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

function readPriorHandoffOutput(state, step) {
  const raw = state?.handoffs?.[String(step)];
  if (!raw) return null;
  return {
    summary: String(raw.summary || ''),
    findings: raw.findings ?? null,
  };
}

function finishFingerprint(state, output, step) {
  const rawSummary = String(output?.summary || '');
  const outputSummary = rawSummary || (step !== undefined ? `Finished step ${step}` : '');
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
    shipStatus: state.shipStatus,
    outputSummary,
    outputFindings: findingsHistogram(output?.findings),
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
  const limit = 8192;
  const serialized = (value) => `${JSON.stringify(value)}\n`;
  if (Buffer.byteLength(serialized(payload), 'utf8') <= limit) return payload;

  const compact = {
    step: payload.step,
    slug: String(payload.slug || '').slice(0, 256),
    workflowId: String(payload.workflowId || '').slice(0, 256),
    workflowType: payload.workflowType,
    status: String(payload.status || '').slice(0, 256),
    artifactPaths: (Array.isArray(payload.artifactPaths) ? payload.artifactPaths : [])
      .map((item) => String(item).slice(0, 256))
      .slice(0, 8),
    acRefs: (Array.isArray(payload.acRefs) ? payload.acRefs : [])
      .map((item) => String(item).slice(0, 32))
      .slice(0, 32),
    summary: String(payload.summary || '').slice(0, 200),
    nextAction: String(payload.nextAction || '').slice(0, 200),
    findings: findingsHistogram(payload.findings),
  };
  if (Buffer.byteLength(serialized(compact), 'utf8') <= limit) return compact;

  compact.artifactPaths = [];
  compact.acRefs = [];
  compact.summary = compact.summary.slice(0, 80);
  compact.nextAction = compact.nextAction.slice(0, 80);
  compact.slug = compact.slug.slice(0, 80);
  compact.workflowId = compact.workflowId.slice(0, 80);
  compact.status = compact.status.slice(0, 80);
  return compact;
}

function normalizeHandoffPaths(repoRoot, paths) {
  if (!Array.isArray(paths)) return [];
  return [...new Set(
    paths.filter(Boolean).map((item) => {
      const clean = String(item).trim();
      if (!clean) return '';
      const absolute = path.isAbsolute(clean) ? clean : path.resolve(repoRoot, clean);
      return toRepoRelative(repoRoot, absolute, { allowOutside: true });
    }).filter(Boolean)
  )];
}

function writeHandoffFile({ usDir, state, pipeline, step, options, context, output, fallbackArtifacts = [] }) {
  const schemaPath = path.join(__dirname, '..', 'schemas', 'handoff.schema.json');
  let payload;
  if (options.handoff) {
    payload = JSON.parse(fs.readFileSync(path.resolve(context.repoRoot, options.handoff), 'utf8'));
    payload.artifactPaths = normalizeHandoffPaths(context.repoRoot, payload.artifactPaths || []);
  } else {
    const { created, modified, deleted } = normalizeFilesTouched(output, options, context.repoRoot, fallbackArtifacts);
    const touched = [...new Set([...created, ...modified, ...deleted])];
    payload = {
      step: Number(step),
      slug: String(state.slug || ''),
      workflowId: String(state.workflowId || ''),
      workflowType: pipeline,
      status: String(options.status || 'completed'),
      artifactPaths: normalizeHandoffPaths(context.repoRoot, touched),
      acRefs: listArg(options.acRefs || (Array.isArray(output.acRefs) ? output.acRefs.join(',') : '')),
      summary: String(output.summary || options.summary || `Finished step ${step}`).slice(0, 500),
      nextAction: String(state.nextAction || ''),
      findings: findingsHistogram(output.findings),
    };
  }
  payload = truncateHandoff(payload);
  const errors = validateNode(payload, loadJsonSchema(schemaPath, 'handoff schema'), 'handoff');
  if (errors.length) throw new Error(errors.join('; '));
  state.handoffs = state.handoffs && typeof state.handoffs === 'object' ? state.handoffs : {};
  state.handoffs[String(step)] = payload;
  return Buffer.byteLength(JSON.stringify(payload), 'utf8');
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function toIndexIso(value) {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function workflowActivityIso(state) {
  const candidates = [];
  if (state && state.endedAt) candidates.push(state.endedAt);
  if (state && state.updatedAt) candidates.push(state.updatedAt);
  for (const item of Array.isArray(state?.stepDispatches) ? state.stepDispatches : []) {
    if (!item || typeof item !== 'object') continue;
    if (item.dispatchedAt) candidates.push(item.dispatchedAt);
    if (item.finishedAt) candidates.push(item.finishedAt);
    if (item.dispatched) candidates.push(item.dispatched);
  }
  if (state && state.startedAt) candidates.push(state.startedAt);
  if (state && state.createdAt) candidates.push(state.createdAt);
  let latestMs = NaN;
  for (const value of candidates) {
    const ms = Date.parse(value);
    if (!Number.isNaN(ms) && (Number.isNaN(latestMs) || ms > latestMs)) latestMs = ms;
  }
  return Number.isNaN(latestMs) ? null : new Date(latestMs).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function workflowIndexUpdatedAt(state, priorRow) {
  return workflowActivityIso(state) || toIndexIso(priorRow?.updatedAt) || nowIso();
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

function resolveStepStampStatus(stepFinishStatus) {
  if (!STEP_FINISH_STATUSES.has(stepFinishStatus)) {
    throw new Error(`step finish status must be one of: completed, failed, skipped (received: ${String(stepFinishStatus)})`);
  }
  return stepFinishStatus;
}

function artifactStampFields(state, step, now, stepFinishStatus) {
  return {
    step,
    slug: state.slug,
    workflowId: state.workflowId,
    status: resolveStepStampStatus(stepFinishStatus),
    startedAt: state.startedAt || now,
    endedAt: now,
    acRefs: Array.isArray(state.acRefs) ? state.acRefs : [],
  };
}

function finishArtifactNames(slug, step, pipeline = 'standard') {
  const names = {
    0: `step-00-${slug}.spec.md`,
    1: `step-01-${slug}.plan.md`,
    3: `step-03-${slug}.plan.exec.md`,
    5: `step-05-${slug}.plan.report.md`,
    6: `step-06-${slug}.review.md`,
    7: `step-07-${slug}.testing.report.md`,
    8: `step-08-${slug}.result.md`,
  };
  if (pipeline === 'standard' && step === 2) {
    return [
      `step-02-${slug}.plan-interview.md`,
      `step-02-${slug}.plan.refined.md`,
    ];
  }
  return names[step] ? [names[step]] : [];
}

function stampStepArtifact(file, state, step, stepFinishStatus) {
  if (!file || !fs.existsSync(file)) return false;
  const now = new Date().toISOString();
  const fields = artifactStampFields(state, step, now, stepFinishStatus);
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
  if (Array.isArray(value)) return value.flatMap((item) => listArg(item));
  if (value === undefined || value === null || value === '') return [];
  return String(value).split(',').map((item) => item.trim().replace(/\\/g, '/')).filter(Boolean);
}

function normalizeFileList(repoRoot, value) {
  return [...new Set(
    listArg(value).map((item) => {
      const clean = String(item).trim();
      if (!clean) return '';
      const absolute = path.isAbsolute(clean) ? clean : path.resolve(repoRoot, clean);
      return toRepoRelative(repoRoot, absolute, { allowOutside: true });
    }).filter(Boolean),
  )];
}

function normalizeFilesTouched(output, options, repoRoot, fallbackArtifacts = []) {
  const reported = output?.files_touched ?? output?.filesTouched;
  const source = Array.isArray(reported) ? { created: reported } : (reported || {});
  const created = normalizeFileList(
    repoRoot,
    options.created !== undefined ? options.created : source.created,
  );
  const modified = normalizeFileList(
    repoRoot,
    options.modified !== undefined ? options.modified : source.modified,
  );
  const deleted = normalizeFileList(
    repoRoot,
    options.deleted !== undefined ? options.deleted : source.deleted,
  );
  if (!created.length && !modified.length && !deleted.length && Array.isArray(fallbackArtifacts) && fallbackArtifacts.length) {
    const existing = fallbackArtifacts.filter((file) => fs.existsSync(file));
    if (existing.length) {
      return {
        created: normalizeFileList(repoRoot, existing),
        modified: [],
        deleted: [],
      };
    }
  }
  return { created, modified, deleted };
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
      else {
        const value = argv[++index];
        if (FILE_LIST_FLAGS.has(key) && options[key] !== undefined) {
          if (Array.isArray(options[key])) options[key].push(value);
          else options[key] = [options[key], value];
        } else options[key] = value;
      }
    }
  }
  return { positional, options };
}

function applyCloseAndShipStatus(state, options, pipeline, step, finishedAt, stepFinishStatus) {
  if (options.shipStatus !== undefined) {
    const value = String(options.shipStatus);
    if (!SHIP_STATUSES.has(value)) {
      throw new Error(`shipStatus must be one of: ${[...SHIP_STATUSES].join(', ')}`);
    }
    state.shipStatus = value;
  }
  const closeStep = CLOSE_STEP[pipeline];
  if (step === closeStep && stepFinishStatus === 'completed') {
    state.status = 'completed';
    state.endedAt = finishedAt;
    if (!state.shipStatus) state.shipStatus = 'pending';
  }
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
  const event = {
    schemaVersion: SCHEMA_VERSION,
    type,
    timestamp,
    workflowId: String(state.workflowId || ''),
    pipeline,
    packageVersion: resolvePackageVersion(context),
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
  if (isNonEmptyModel(options.configuredModel)) {
    event.configuredModel = String(options.configuredModel).trim();
  }
  if (options.agentType && String(options.agentType).trim()) {
    event.agentType = String(options.agentType).trim();
  }
  if (options.subagentId && String(options.subagentId).trim()) {
    event.subagentId = String(options.subagentId).trim();
  }
  return event;
}

function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function resolvePackageVersion(context) {
  const candidates = [
    context.runtimeSource && path.join(context.runtimeSource, 'skill-dependencies.json'),
    path.join(context.skillsRoot, 'ws-shared', 'runtime', 'skill-dependencies.json'),
    path.join(context.globalSkillsRoot, 'ws-shared', 'runtime', 'skill-dependencies.json'),
    path.join(context.repoRoot, 'package.json'),
  ].filter(Boolean);
  for (const file of [...new Set(candidates)]) {
    if (!fs.existsSync(file)) continue;
    const parsed = readJsonFile(file);
    const version = parsed?.packageVersion || parsed?.version;
    if (typeof version === 'string' && version.trim()) return version.trim();
  }
  return 'unknown';
}

function tokenCount(options, output, key) {
  const snake = key === 'promptTokens' ? 'prompt_tokens' : 'completion_tokens';
  const candidates = [
    options[key],
    output?.[key],
    output?.[snake],
    output?.telemetry?.[key],
    output?.telemetry?.[snake],
    output?.metrics?.[key],
    output?.metrics?.[snake],
  ];
  for (const value of candidates) {
    if (value === undefined || value === null || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed);
  }
  return 0;
}

function readStepOutput(value, context, paths, step) {
  if (!value) {
    if (paths && paths.usDir && step !== undefined) {
      const stepPadded = String(step).padStart(2, '0');
      const candidates = [
        path.join(paths.usDir, '.runtime', `step-${stepPadded}-output.json`),
        path.join(paths.usDir, '.runtime', `step-${step}-output.json`),
        path.join(paths.usDir, `step-${stepPadded}-output.json`),
        path.join(paths.usDir, `step-${step}-output.json`),
        path.join(paths.usDir, '.runtime', 'step-output.json'),
        path.join(paths.usDir, 'step-output.json'),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            return JSON.parse(fs.readFileSync(candidate, 'utf8'));
          } catch {
            // continue
          }
        }
      }
    }
    return {};
  }
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
    agentType: payload.agentType || null,
    subagentId: payload.subagentId || null,
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
    runPath: run.statePath.replace(/\.state\.md$/, '.state.json'),
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

function collectModelIds(value, target) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) if (typeof item === 'string' && item.trim()) target.add(item.trim());
    return;
  }
  if (typeof value !== 'object') return;
  for (const key of ['supportedModels', 'models', 'binding']) collectModelIds(value[key], target);
}

function resolveSupportedHostModels(context, state) {
  const models = new Set();
  collectModelIds(state?.hostBinding, models);
  collectModelIds(context.config?.defaults?.hostAdapter, models);
  const capabilityFile = path.join(context.sharedDir, 'host-capabilities.json');
  const capabilities = readJsonFile(capabilityFile);
  collectModelIds(capabilities, models);
  if (capabilities && typeof capabilities === 'object') {
    for (const value of Object.values(capabilities)) collectModelIds(value, models);
  }
  return [...models];
}

function resolveDispatchModel(context, state, configuredModel, sessionModel) {
  const configured = String(configuredModel || '').trim() || String(sessionModel || 'unknown');
  const session = String(sessionModel || 'unknown').trim() || 'unknown';
  const supported = resolveSupportedHostModels(context, state);
  if (supported.length && configured !== session && !supported.includes(configured)) {
    return {
      model: session,
      configuredModel: configured,
      fallbackReason: 'unsupported-host-model',
    };
  }
  return { model: configured, configuredModel: null, fallbackReason: null };
}

function resolveRecordedModelDetails(options, context, state, pipeline, step) {
  const sessionModel = String(state.currentModel || 'unknown');
  let role = options.substep;
  if (!role || !String(role).trim()) {
    const prior = (state.stepDispatches || []).find((item) => Number(item.step) === Number(step));
    role = prior?.substep;
  }
  const phaseModel = resolvePhaseModel(context.config?.defaults || {}, {
    step,
    role,
    pipeline,
    sessionModel,
  });
  const configuredModel = isNonEmptyModel(options.configuredModel)
    ? String(options.configuredModel).trim()
    : isNonEmptyModel(options.model)
      ? String(options.model).trim()
      : phaseModel;
  const actualModel = isNonEmptyModel(options.configuredModel) && isNonEmptyModel(options.model)
    ? String(options.model).trim()
    : configuredModel;
  if (isNonEmptyModel(options.configuredModel) && isNonEmptyModel(options.model)) {
    return {
      model: actualModel,
      configuredModel: actualModel === configuredModel ? null : configuredModel,
      fallbackReason: actualModel === configuredModel ? null : 'host-dispatch-fallback',
    };
  }
  return resolveDispatchModel(context, state, configuredModel, sessionModel);
}

function resolveRecordedModel(options, context, state, pipeline, step) {
  return resolveRecordedModelDetails(options, context, state, pipeline, step).model;
}

const STEP_ROLES = {
  0: 'spec-write',
  1: 'plan-write',
  2: 'plan-interview',
  3: 'plan-to-tasks',
  4: 'implement-tasks',
  5: 'plan-verify',
  6: 'code-review',
  7: 'testing',
  8: 'ship-pr',
  9: 'fix-pr',
};

function resolveStepAgentType(step, options, context, state) {
  if (options.agentType && String(options.agentType).trim()) {
    return String(options.agentType).trim();
  }
  const specSub = context.config?.defaults?.specializedSubagents;
  const isEnabled = specSub?.enabled === true;
  const capabilityFile = path.join(context.sharedDir, 'host-capabilities.json');
  let capabilities = null;
  try {
    capabilities = readJsonFile(capabilityFile);
  } catch {
    // ignore
  }
  const hostBinding = state?.hostBinding || capabilities?.binding || (capabilities && typeof capabilities === 'object' ? Object.values(capabilities)[0]?.binding : null);
  const subagentTool = hostBinding?.subagentTool || 'Task';
  const supportsNamedAgents = hostBinding?.supportsNamedAgents
    ?? (specSub?.targetHost ? !['generic', 'auto'].includes(specSub.targetHost) : false);

  if (isEnabled && supportsNamedAgents === true) {
    let stepNum = Number(step);
    let role = STEP_ROLES[stepNum] || 'step';
    if (options.substep === 'scoreAndRefine' || options.substep === 'reviewFix' || options.substep === 'fixPrExec') {
      stepNum = 4;
      role = 'implement-tasks';
    } else if (options.substep === 'fixPrPlan') {
      stepNum = 6;
      role = 'code-review';
    }
    const stepPadded = String(stepNum).padStart(2, '0');
    const prefix = specSub?.agentPrefix || 'ws';
    return `named:${prefix}-step-${stepPadded}-${role}`;
  }
  if (hostBinding?.mode === 'inline-isolated' || context.config?.defaults?.hostAdapter?.mode === 'inline-isolated') {
    return 'inline:session';
  }
  return `generic:${subagentTool}`;
}

function performUpdate({ pipeline, maxStep, labels }, operation, stateFile, options) {
  if (!['dispatch', 'finish', 'bypass'].includes(operation)) throw new Error('operation must be dispatch, finish, or bypass');
  if (options.elapsed !== undefined) throw new Error('--elapsed is not accepted; elapsedSec is derived from timestamps');
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: options.scriptFile });
  const absoluteInput = path.resolve(context.repoRoot, stateFile);
  const loaded = loadPersistedState(absoluteInput);
  const absoluteState = loaded.mdPath;
  const priorJsonText = loaded.jsonText;
  const state = loaded.state;
  const step = Number(options.step);
  if (!Number.isInteger(step) || step < 0 || step > maxStep) throw new Error(`step must be in range 0..${maxStep}`);
  const timestamp = String(options.timestamp || options.finishedAt || options.dispatchedAt || nowIso());
  const paths = statePaths(absoluteState, context);
  const priorHandoffOutput = operation === 'finish' ? readPriorHandoffOutput(loaded.state, step) : null;
  const priorFingerprint = finishFingerprint(loaded.state, priorHandoffOutput, step);
  const priorStepTelemetry = (loaded.state.telemetry?.steps || []).find((row) => Number(row.N ?? row.step) === step);
  const priorFinishDispatchedAt = priorStepTelemetry?.dispatchedAt || null;
  const wasStepCompletedBeforeUpdate = stepCompleted(loaded.state, step);
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
  let fallbackArtifacts = [];
  let isInternalSubstep = false;
  let dispatchedAt = null;
  let stepFinishStatus = null;

  if (operation === 'dispatch') {
    if (pipeline === 'standard') {
      const minVerifyScore = resolveMinVerifyScore(context.config);
      if (step === 6) {
        if (!stepCompleted(state, 5)) {
          throw new Error('cannot dispatch step 6: step 5 must be completed first');
        }
        if (state.verificationScore === undefined || Number(state.verificationScore) < minVerifyScore) {
          throw new Error(`cannot dispatch step 6: step 5 score (${state.verificationScore}) is below minVerifyScore (${minVerifyScore}); scoreAndRefine is required`);
        }
      } else if (step === 4 && normalizeSubstep(options.substep) !== 'dag') {
        if (!stepCompleted(state, 1)) {
          throw new Error('cannot dispatch step 4: step 1 must be completed before implement');
        }
        const step2Reason = skippedReason(state, 2);
        if (!stepCompleted(state, 2) && step2Reason !== 'interview-not-required') {
          throw new Error('cannot dispatch step 4: step 2 must be completed or skipped with reason interview-not-required before implement');
        }
        const step3Reason = skippedReason(state, 3);
        if (!stepCompleted(state, 3) && step3Reason !== 'dag-disabled') {
          throw new Error('cannot dispatch step 4: step 3 must be completed or skipped with reason dag-disabled before implement');
        }
        const slug = state.slug || state.us;
        if (slug) {
          const needRefined = stepCompleted(state, 2) && step2Reason !== 'interview-not-required';
          const planFile = needRefined ? `step-02-${slug}.plan.refined.md` : `step-01-${slug}.plan.md`;
          const planPath = path.join(paths.usDir, planFile);
          if (!isNonEmptyFile(planPath)) {
            throw new Error(`cannot dispatch step 4: required plan artifact missing: ${toRepoRelative(context.repoRoot, planPath, { allowOutside: true })}`);
          }
          if (needRefined) {
            const interviewPath = path.join(paths.usDir, `step-02-${slug}.plan-interview.md`);
            if (!isNonEmptyFile(interviewPath)) {
              throw new Error(`cannot dispatch step 4: required plan interview artifact missing: ${toRepoRelative(context.repoRoot, interviewPath, { allowOutside: true })}`);
            }
          }
          const planIndex = path.join(paths.usDir, 'plan.index.json');
          const runtimePlanIndex = path.join(paths.usDir, '.runtime', 'plan.index.json');
          const indexPath = fs.existsSync(planIndex) ? planIndex : runtimePlanIndex;
          if (!isParseableJsonObject(indexPath)) {
            throw new Error(`cannot dispatch step 4: plan.index.json is required before implement: ${toRepoRelative(context.repoRoot, indexPath, { allowOutside: true })}`);
          }
        }
      }
    }
    state.currentStep = step;
    state.stepStatus[String(step)] = 'active';
    const dispatch = { step, dispatchedAt: timestamp };
    if (options.substep && String(options.substep).trim()) {
      dispatch.substep = String(options.substep).trim();
    }
    const modelDetails = resolveRecordedModelDetails(options, context, state, pipeline, step);
    if (modelDetails.configuredModel) dispatch.configuredModel = modelDetails.configuredModel;
    if (modelDetails.model) dispatch.model = modelDetails.model;
    const resolvedAgentType = resolveStepAgentType(step, options, context, state);
    if (resolvedAgentType) {
      dispatch.agentType = resolvedAgentType;
      options.agentType = resolvedAgentType;
    }
    if (options.subagentId && String(options.subagentId).trim()) {
      dispatch.subagentId = String(options.subagentId).trim();
    }
    state.stepDispatches = [...state.stepDispatches.filter((item) => Number(item.step) !== step), dispatch].sort((a, b) => a.step - b.step);
    state.currentModel = modelDetails.model;
    if (modelDetails.configuredModel) {
      state.configuredModel = modelDetails.configuredModel;
      options.configuredModel = modelDetails.configuredModel;
    } else {
      delete state.configuredModel;
      delete options.configuredModel;
    }
    options.model = state.currentModel;
    state.nextAction = `Finish step ${step}`;
    event = commonEvent(state, pipeline, step, 'dispatch', timestamp, options, context);
    event.dispatchedAt = timestamp;
  } else if (operation === 'finish') {
    const dispatch = state.stepDispatches.find((item) => Number(item.step) === step);
    if (dispatch) {
      if (!options.agentType && dispatch.agentType) options.agentType = dispatch.agentType;
      if (!options.subagentId && dispatch.subagentId) options.subagentId = dispatch.subagentId;
    }
    dispatchedAt = String(options.dispatchedAt || dispatchTimestamp(dispatch));
    const finishedAt = timestamp;
    const elapsedSec = dispatchedAt ? Math.max(0, Math.floor((Date.parse(finishedAt) - Date.parse(dispatchedAt)) / 1000)) : 0;
    const estimated = !dispatchedAt;
    const status = String(options.status || 'completed');
    if (!['completed', 'failed', 'skipped'].includes(status)) throw new Error('finish status must be completed, failed, or skipped');
    stepFinishStatus = status;
    isInternalSubstep = Boolean(options.substep && ['scoreAndRefine', 'reviewFix', 'fixPrPlan', 'fixPrExec'].includes(options.substep));
    let derivedScore = null;
    if (options.verificationScore !== undefined || (pipeline === 'standard' && step === 5 && status === 'completed' && !isInternalSubstep)) {
      const ledgerFile = path.join(paths.usDir, 'ac-ledger.json');
      let ledger = null;
      if (fs.existsSync(ledgerFile)) {
        ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
        state.acLedger = ledger;
      } else {
        ledger = state.acLedger;
      }
      if (options.verificationScore !== undefined) {
        if (!ledger) throw new Error('verification score requires ac-ledger.json or state.acLedger');
        const derived = scoreLedger(ledger, options.scoreBoundary || 'step5', context);
        if (Number(options.verificationScore) !== derived.score) {
          throw new Error(`verification score mismatch: supplied ${options.verificationScore}, derived ${derived.score}`);
        }
        derivedScore = derived.score;
        state.verificationScore = derivedScore;
      } else if (ledger) {
        try {
          const derived = scoreLedger(ledger, options.scoreBoundary || 'step5', context);
          derivedScore = derived.score;
          state.verificationScore = derivedScore;
        } catch {
          // ignore derivation error here; gate check below will catch invalid or missing score
        }
      }
    }
    if (pipeline === 'standard' && step === 5 && status === 'completed' && !isInternalSubstep) {
      const minVerifyScore = resolveMinVerifyScore(context.config);
      const score = options.verificationScore !== undefined
        ? Number(options.verificationScore)
        : Number(state.verificationScore);
      if (!Number.isFinite(score) || score < minVerifyScore) {
        throw new Error(`cannot finish step 5 above the advance bar: score (${Number.isFinite(score) ? score : 'missing'}) is below minVerifyScore (${minVerifyScore}); finish scoreAndRefine first`);
      }
    }
    if (pipeline === 'standard' && step === 2 && status === 'completed') {
      const missing = finishArtifactNames(state.slug || state.us, step, pipeline)
        .filter((name) => !isNonEmptyFile(path.join(paths.usDir, name)));
      if (missing.length) {
        throw new Error(`cannot finish step 2: required artifacts missing: ${missing.join(', ')}`);
      }
    }
    if (status === 'skipped') {
      if (!SKIP_REASONS.has(options.reason)) throw new Error(`skip reason must be one of: ${[...SKIP_REASONS].join(', ')}`);
      state.skippedSteps = [...(Array.isArray(state.skippedSteps) ? state.skippedSteps : []).filter((item) => Number(item.step) !== step), {
        step,
        reason: options.reason,
        evidence: String(options.evidence || ''),
      }].sort((a, b) => a.step - b.step);
    }
    if (!isInternalSubstep) {
      state.completedSteps = [...new Set([...(state.completedSteps || []).map(Number), step])].sort((a, b) => a - b);
      state.stepStatus[String(step)] = status;
      state.currentStep = Math.min(maxStep, step + 1);
    } else {
      state.currentStep = step;
      state.stepStatus[String(step)] = 'active';
    }
    state.currentModel = String(options.model || state.currentModel || 'unknown');
    if (isNonEmptyModel(options.configuredModel)) state.configuredModel = String(options.configuredModel).trim();
    if (isNonEmptyModel(state.configuredModel)) options.configuredModel = state.configuredModel;
    options.model = state.currentModel;
    state.nextAction = isInternalSubstep
      ? `Resume step ${step} (${options.substep})`
      : status === 'failed' ? `Repair step ${step}` : `Run step ${state.currentStep}`;
    const output = status === 'completed'
      ? readStepOutput(options.stepOutput, context, paths, step)
      : (options.stepOutput ? readStepOutput(options.stepOutput, context, paths, step) : {});
    finishOutput = status === 'completed' ? output : {};
    fallbackArtifacts = status === 'completed'
      ? finishArtifactNames(state.slug || state.us, step, pipeline).map((name) => path.join(paths.usDir, name))
      : [];
    if (status === 'completed' && step === 0 && (state.slug || state.us)) {
      const slug = state.slug || state.us;
      const specsDir = resolveConfiguredPath(context.repoRoot, context.config?.specs?.dir, '.agents/specs');
      fallbackArtifacts.push(path.join(specsDir, `${slug}.spec.md`));
      fallbackArtifacts.push(path.join(paths.usDir, 'ac-ledger.json'));
    }
    const { created, modified, deleted } = normalizeFilesTouched(output, options, context.repoRoot, fallbackArtifacts);
    const promptTokens = tokenCount(options, output, 'promptTokens');
    const completionTokens = tokenCount(options, output, 'completionTokens');
    applyFinishTelemetry(state, labels, step, {
      dispatchedAt,
      finishedAt,
      elapsedSec,
      estimated,
      promptTokens,
      completionTokens,
      model: state.currentModel,
      filesTouched: { created, modified, deleted },
      agentType: options.agentType || null,
      subagentId: options.subagentId || null,
    });
    state.workflowManifest = state.workflowManifest && typeof state.workflowManifest === 'object' ? state.workflowManifest : {};
    for (const key of ['created', 'modified', 'deleted']) {
      state.workflowManifest[key] = [...new Set([...(state.workflowManifest[key] || []), ...({ created, modified, deleted }[key])])].sort();
    }
    const gateDecision = validateGateDecision(options.gateDecision);
    if (gateDecision) state.gateDecision = gateDecision;
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
    applyCloseAndShipStatus(state, options, pipeline, step, finishedAt, status);
    event = {
      ...commonEvent(state, pipeline, step, 'finish', finishedAt, options, context),
      dispatchedAt: dispatchedAt || null,
      finishedAt,
      elapsedSec,
      estimated,
      promptTokens,
      completionTokens,
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
        if (item.configuredModel && String(item.configuredModel).trim()) row.configuredModel = String(item.configuredModel).trim();
        if (item.model && String(item.model).trim()) row.model = String(item.model).trim();
        if (item.agentType && String(item.agentType).trim()) row.agentType = String(item.agentType).trim();
        if (item.subagentId && String(item.subagentId).trim()) row.subagentId = String(item.subagentId).trim();
        return dispatchedAt ? row : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.step - b.step);
  }
  const isIdempotentFinish = operation === 'finish' && Boolean(priorJsonText) && finishFingerprint(state, finishOutput, step) === priorFingerprint;
  if (isIdempotentFinish) {
    const restored = JSON.parse(priorJsonText);
    Object.keys(state).forEach((key) => {
      delete state[key];
    });
    Object.assign(state, restored);
    event.idempotentReplay = true;
  } else if (operation === 'finish') {
    body = compactOutputs(body, step, finishOutput);
    event.handoffBytes = writeHandoffFile({
      usDir: paths.usDir,
      state,
      pipeline,
      step,
      options,
      context,
      output: finishOutput,
      fallbackArtifacts,
    });
  }
  if (operation === 'finish') {
    const hygiene = resolveContextHygiene(context.config);
    event.pruneAfterStep = hygiene.pruneAfterStep;
    if (pipeline === 'lite' && resolveReviewJurySize(context.config) > 1 && Number(step) === 3) {
      event.juryIgnored = 'lite-inline';
    }
  }
  const jsonText = canonicalStateJson(state);
  const stateHash = sha256(jsonText);
  const stateContent = `---\n${serializeFrontmatter(state)}\n---\n${body.replace(/^\n*/, '')}`;
  const medians = estimatedSteps(context, pipeline, maxStep);
  const run = buildRun(state, pipeline, maxStep, labels, stateHash, medians);
  const index = updatePlansIndex(context, run, timestamp);
  const defaultTelemetry = path.join(paths.usDir, 'telemetry.jsonl');
  const rawJsonlOut = String(options.jsonlOut || '');
  const isLegacyStepStream = /(^|[\\/])telemetry[\\/]step-\d+\.jsonl$/.test(rawJsonlOut);
  const telemetryFile = path.resolve(
    context.repoRoot,
    rawJsonlOut && !isLegacyStepStream ? rawJsonlOut : defaultTelemetry,
  );

  const isDuplicateFinish = operation === 'finish' && !isInternalSubstep && wasStepCompletedBeforeUpdate && (
    (Boolean(dispatchedAt) && priorFinishDispatchedAt === dispatchedAt) ||
    (!dispatchedAt && Boolean(priorStepTelemetry))
  );

  if (!isIdempotentFinish && !isDuplicateFinish) {
    appendJsonl(telemetryFile, event);
  }
  atomicWrite(paths.jsonFile, jsonText);
  atomicWrite(absoluteState, stateContent);
  atomicWrite(index.file, `${JSON.stringify(index.index, null, 2)}\n`);
  if (operation === 'finish') {
    for (const artifact of finishArtifactNames(state.slug, step, pipeline)) {
      stampStepArtifact(path.join(paths.usDir, artifact), state, step, stepFinishStatus);
    }
  }
  validateSnapshot({ stateFile: absoluteState, indexFile: index.file, context, maxStep, pipeline });
  return { ok: true, operation, step, revision: state.revision, stateSha256: stateHash, runPath: toRepoRelative(context.repoRoot, paths.jsonFile) };
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

function stepCompleted(state, step) {
  return (state.completedSteps || []).map(Number).includes(Number(step));
}

function isNonEmptyFile(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function isParseableJsonObject(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed !== null && typeof parsed === 'object';
  } catch {
    return false;
  }
}

function stepSkipped(state, step) {
  return (state.skippedSteps || []).some((row) => Number(row.step) === Number(step));
}

function requiredAdvanceArtifacts(pipeline, next, state) {
  const slug = state.slug || state.us;
  if (!slug) return [];
  if (pipeline === 'lite') {
    const lite = {
      1: { file: `step-00-${slug}.spec.md`, expectedStep: 0 },
      2: { file: `step-01-${slug}.plan.md`, expectedStep: 1 },
      4: { file: `step-06-${slug}.review.md`, expectedStep: 6 },
      5: { file: `step-08-${slug}.result.md`, expectedStep: 8 },
    };
    return lite[next] ? [lite[next]] : [];
  }
  if (next === 3 && skippedReason(state, 2) === 'interview-not-required') return [];
  if (next === 4 && skippedReason(state, 3) === 'dag-disabled') return [];
  if (next === 8) {
    const skip = skippedReason(state, 7);
    if (skip === 'testing-disabled' || skip === 'no-test-surface') return [];
  }
  const standard = {
    1: { file: `step-00-${slug}.spec.md`, expectedStep: 0 },
    2: { file: `step-01-${slug}.plan.md`, expectedStep: 1 },
    4: { file: `step-03-${slug}.plan.exec.md`, expectedStep: 3 },
    6: { file: `step-05-${slug}.plan.report.md`, expectedStep: 5 },
    7: { file: `step-06-${slug}.review.md`, expectedStep: 6 },
    8: { file: `step-07-${slug}.testing.report.md`, expectedStep: 7 },
    9: { file: `step-08-${slug}.result.md`, expectedStep: 8 },
  };
  if (next === 3) {
    return [
      { file: `step-02-${slug}.plan-interview.md`, expectedStep: 2 },
      { file: `step-02-${slug}.plan.refined.md`, expectedStep: 2 },
    ];
  }
  return standard[next] ? [standard[next]] : [];
}

function requiredAdvanceArtifact(pipeline, next, state) {
  return requiredAdvanceArtifacts(pipeline, next, state)[0] || null;
}

function validateSnapshot({ stateFile, indexFile, context, maxStep, preAdvance, pipeline }) {
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
    const required = requiredAdvanceArtifacts(flow, next, state);
    for (const artifact of required) {
      const file = path.join(path.dirname(mdPath), artifact.file);
      if (!fs.existsSync(file)) errors.push(`required artifact missing: ${toRepoRelative(context.repoRoot, file, { allowOutside: true })}`);
      else {
        try { artifactMetadata(file, artifact.expectedStep, state); } catch (error) { errors.push(error.message); }
      }
    }
    const implementFrom = flow === 'lite' ? 2 : 4;
    const planIndex = path.join(path.dirname(mdPath), 'plan.index.json');
    const runtimePlanIndex = path.join(path.dirname(mdPath), '.runtime', 'plan.index.json');
    if (next >= implementFrom && !fs.existsSync(planIndex) && !fs.existsSync(runtimePlanIndex)) {
      errors.push('plan.index.json is required before implement');
    }
    const ledgerFile = path.join(path.dirname(mdPath), 'ac-ledger.json');
    if (next >= 1 && !state.acLedger && !fs.existsSync(ledgerFile)) errors.push('ac-ledger.json is required before advance');
    if (Number(next) === 4 && flow === 'standard') {
      const slug = state.slug || state.us;
      const usDir = path.dirname(mdPath);
      const step2Reason = skippedReason(state, 2);
      if (!stepCompleted(state, 1)) {
        errors.push('step 1 must be completed before implement');
      }
      if (!stepCompleted(state, 2) && step2Reason !== 'interview-not-required') {
        errors.push('step 2 must be completed or skipped with reason interview-not-required before implement');
      }
      const step3Reason = skippedReason(state, 3);
      if (!stepCompleted(state, 3) && step3Reason !== 'dag-disabled') {
        errors.push('step 3 must be completed or skipped with reason dag-disabled before implement');
      }
      if (slug) {
        const needRefined = stepCompleted(state, 2) && step2Reason !== 'interview-not-required';
        const planFile = needRefined ? `step-02-${slug}.plan.refined.md` : `step-01-${slug}.plan.md`;
        const planPath = path.join(usDir, planFile);
        if (!fs.existsSync(planPath)) {
          errors.push(`required artifact missing: ${toRepoRelative(context.repoRoot, planPath, { allowOutside: true })}`);
        }
        if (needRefined) {
          const interviewPath = path.join(usDir, `step-02-${slug}.plan-interview.md`);
          if (!fs.existsSync(interviewPath)) {
            errors.push(`required artifact missing: ${toRepoRelative(context.repoRoot, interviewPath, { allowOutside: true })}`);
          }
        }
      }
    }
    if (Number(next) === 6 && flow === 'standard') {
      if (!stepCompleted(state, 5)) {
        errors.push('step 5 must be completed before step 6');
      }
    }
    if (next >= 6 && (fs.existsSync(ledgerFile) || state.acLedger)) {
      const ledger = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) : state.acLedger;
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
    if (!['dispatch', 'finish', 'bypass'].includes(operation)) {
      throw new Error('operation must be dispatch, finish, or bypass');
    }
    if (!stateFile) throw new Error('state path or workflow id is required');
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

function readPriorPlansIndex(context) {
  try {
    const parsed = JSON.parse(fs.readFileSync(plansIndexPath(context), 'utf8'));
    return Array.isArray(parsed.workflows) ? parsed.workflows : [];
  } catch {
    return [];
  }
}

function rebuildIndex(context, config) {
  const plansDir = resolveConfiguredPath(context.repoRoot, context.config?.plans?.dir, '.agents/plans');
  const priorById = new Map(
    readPriorPlansIndex(context)
      .filter((item) => item && item.workflowId)
      .map((item) => [String(item.workflowId), item]),
  );
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
        const workflowId = String(state.workflowId || '');
        workflows.push({
          workflowId,
          slug: state.slug || state.us,
          pipeline: state.workflowType || config.pipeline,
          statePath: toRepoRelative(context.repoRoot, full),
          stateSha256: hash,
          status: state.status,
          currentStep: Number(state.currentStep || 0),
          updatedAt: workflowIndexUpdatedAt(state, priorById.get(workflowId)),
          runPath: toRepoRelative(context.repoRoot, jsonStatePath(full)),
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
  let options = {};
  try {
    const parsed = parseArgs(process.argv.slice(2));
    options = parsed.options;
    const { positional } = parsed;
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
      indexFile: plansIndexPath(context),
      context,
      maxStep: config.maxStep,
      pipeline: config.pipeline,
      preAdvance: options.preAdvance === undefined ? undefined : requirePreAdvanceStep(options.preAdvance),
    });
    process.stdout.write(`${JSON.stringify({ ...result, state: toRepoRelative(context.repoRoot, stateFile, { allowOutside: true }) }, null, 2)}\n`);
  } catch (error) {
    let message = error.message;
    let preAdvanceStep = null;
    try {
      preAdvanceStep = options.preAdvance === undefined ? null : requirePreAdvanceStep(options.preAdvance);
    } catch {
      preAdvanceStep = null;
    }
    if (preAdvanceStep === 4 && config.pipeline === 'standard' && !message.includes('HS-5')) {
      message = `${message}; HS-5`;
    }
    process.stderr.write(`ERROR: ${message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  STATE_VERSION,
  SCHEMA_VERSION,
  SKIP_REASONS,
  RUNTIME_NAMES,
  FILE_LIST_FLAGS,
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
  validateGateDecision,
  artifactMetadata,
  upsertArtifactFrontmatter,
  artifactStampFields,
  resolveStepStampStatus,
  stampStepArtifact,
  normalizeFilesTouched,
  resolvePackageVersion,
  resolveDispatchModel,
  resolveStepAgentType,
  performUpdate,
  resolvePhaseModel,
  validateSnapshot,
  runUpdateCli,
  runValidateCli,
};
