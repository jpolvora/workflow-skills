#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
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
const { spawnSync } = require('child_process');
const { resolveConsumerContext, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const STATUSES = new Set(['Pending', 'Implemented', 'ImplementedDifferently', 'NotImplemented']);
const BOUNDARIES = new Set(['step5', 'pre-step6', 'ship']);
const ALIAS_SKIP_REASONS = new Set(['not-applicable', 'baseline-dirty', 'comment-key']);

function isSkipped(result) {
  return Boolean(result && ALIAS_SKIP_REASONS.has(result.skipReason));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizePath(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function toRepoPath(p, repoRoot) {
  if (!p) return '';
  const s = String(p).trim();
  if (path.isAbsolute(s)) {
    return normalizePath(path.relative(repoRoot || process.cwd(), s));
  }
  return normalizePath(s);
}

function parseArgs(argv) {
  const positional = [];
  const options = {};
  const repeatable = new Set(['ac', 'negative', 'file', 'test', 'commit', 'verdict', 'finding', 'aliasResult', 'invariantViolation', 'failingPath', 'filesTouched']);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (!token.startsWith('--')) positional.push(token);
    else {
      const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const value = argv[++index];
      if (repeatable.has(key)) (options[key] ||= []).push(value);
      else options[key] = value;
    }
  }
  return { command: positional[0], options };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
}

function criteriaFromSpec(text) {
  return [...text.matchAll(/^- (AC[1-9][0-9]*):\s*(.+)$/gm)].map((match) => ({ id: match[1], text: match[2].trim() }));
}

function sliceHeading(text, heading, nextRe) {
  const start = text.search(new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im'));
  if (start < 0) return '';
  const rest = text.slice(start);
  const cut = rest.search(nextRe);
  return cut < 0 ? rest : rest.slice(0, cut);
}

function negativeScenariosFromSpec(text) {
  const notes = sliceHeading(text, '## Validation & Observation Notes', /\n## /);
  const subsection = sliceHeading(notes, '### Negative & Failing Test Scenarios', /\n### |\n## /);
  if (!subsection) return [];
  return [...subsection.matchAll(/^[-*]\s+(.+)$/gm)]
    .map((match) => match[1].trim())
    .filter((line) => line && !/^\([^)]+\)\s*$/.test(line) && !/^(TBD|TODO|placeholder)\b/i.test(line))
    .map((line, index) => ({
      id: `NS${index + 1}`,
      text: line,
      tests: [],
      linkEventIds: [],
    }));
}

function defaultRow(criterion, planIndex) {
  const mapping = planIndex?.acceptanceCriteria?.find((row) => row.id === criterion.id);
  return {
    id: criterion.id,
    text: criterion.text,
    status: 'Pending',
    evidence: [],
    tasks: mapping?.taskIds || [],
    planSections: mapping?.planSectionIds || [],
    files: [],
    commits: [],
    tests: (mapping?.expectedTestNames || []).map((name) => ({
      name,
      sourceFile: null,
      phase: 'planned',
      alias: null,
      exitCode: null,
      timestamp: null,
    })),
    verdicts: [],
    findings: [],
    sabotage: { required: false, status: 'not-required', exitCode: null },
    linkEventIds: [],
  };
}

function init(options, context) {
  if (!options.spec || !options.output) throw new Error('init requires --spec and --output');
  const spec = path.resolve(context.repoRoot, options.spec);
  const planIndex = options.planIndex ? readJson(path.resolve(context.repoRoot, options.planIndex)) : null;
  const criteria = criteriaFromSpec(fs.readFileSync(spec, 'utf8'));
  if (!criteria.length) throw new Error('spec has no acceptance criteria');
  const ledger = {
    schemaVersion: 1,
    revision: 1,
    workflowId: options.workflowId || path.basename(path.dirname(path.resolve(context.repoRoot, options.output))),
    slug: options.slug || path.basename(path.dirname(path.resolve(context.repoRoot, options.output))),
    specPath: toRepoRelative(context.repoRoot, spec),
    planIndexPath: options.planIndex || null,
    declaredGaps: [],
    aliasResults: [],
    testingSkip: null,
    acceptanceCriteria: criteria.map((criterion) => defaultRow(criterion, planIndex)),
    negativeScenarios: negativeScenariosFromSpec(fs.readFileSync(spec, 'utf8')),
    invariantViolations: [],
    scoreState: null,
  };
  writeJson(path.resolve(context.repoRoot, options.output), ledger);
  return ledger;
}

function parseObject(value, label) {
  try {
    const object = JSON.parse(value);
    if (!object || typeof object !== 'object' || Array.isArray(object)) throw new Error();
    return object;
  } catch {
    if (typeof value === 'string' && value.includes('=')) {
      const parsed = {};
      const numericKeys = new Set(['step', 'round', 'exitCode', 'lineStart', 'lineEnd']);
      for (const pair of value.split(',')) {
        const eq = pair.indexOf('=');
        if (eq > 0) {
          const k = pair.slice(0, eq).trim();
          const v = pair.slice(eq + 1).trim();
          if (k) {
            parsed[k] = numericKeys.has(k) && /^-?\d+$/.test(v) ? Number(v) : v;
          }
        }
      }
      if (Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
    throw new Error(`${label} must be a JSON object`);
  }
}

function evidenceFile(value, context) {
  const match = value.match(/^(.+):L([1-9][0-9]*)-L([1-9][0-9]*)$/);
  if (!match) throw new Error(`file evidence must use path:Lstart-Lend: ${value}`);
  const absolute = path.resolve(context.repoRoot, match[1]);
  const relative = toRepoRelative(context.repoRoot, absolute);
  if (!fs.existsSync(absolute)) throw new Error(`file evidence does not exist: ${relative}`);
  const lines = fs.readFileSync(absolute, 'utf8').replace(/\r\n?/g, '\n').split('\n');
  const start = Number(match[2]);
  const end = Number(match[3]);
  if (end < start || end > lines.length) throw new Error(`file evidence line range is invalid: ${value}`);
  return { path: relative, lineStart: start, lineEnd: end, sha256: sha256(fs.readFileSync(absolute)) };
}

function validateTest(test, context) {
  for (const key of ['name', 'sourceFile', 'phase']) if (!test[key]) throw new Error(`test evidence requires ${key}`);
  if (!['planned', 'observed'].includes(test.phase)) throw new Error('test phase must be planned or observed');
  const source = path.resolve(context.repoRoot, test.sourceFile);
  if (!fs.existsSync(source)) throw new Error(`test source file does not exist: ${test.sourceFile}`);
  if (!fs.readFileSync(source, 'utf8').includes(test.name)) throw new Error(`test name not found in source file: ${test.name}`);
  return {
    name: String(test.name),
    sourceFile: toRepoRelative(context.repoRoot, source),
    phase: test.phase,
    alias: test.alias || null,
    exitCode: test.exitCode === null || test.exitCode === undefined ? null : Number(test.exitCode),
    timestamp: test.timestamp || new Date().toISOString(),
  };
}

function link(options, context) {
  if (!options.ledger || !options.eventId) throw new Error('link requires --ledger and --event-id');
  const acIds = options.ac || [];
  const nsIds = options.negative || [];
  if (!acIds.length && !nsIds.length && !options.aliasResult && !options.testSurfaceSkip && !options.gap && !options.planIndex) {
    throw new Error('link requires at least one --ac, --negative, --alias-result, --test-surface-skip, --gap, or --plan-index');
  }
  const file = path.resolve(context.repoRoot, options.ledger);
  const ledger = readJson(file);
  ledger.negativeScenarios ||= [];
  if (options.planIndex) {
    const planIndex = readJson(path.resolve(context.repoRoot, options.planIndex));
    ledger.planIndexPath = toRepoRelative(context.repoRoot, path.resolve(context.repoRoot, options.planIndex));
    for (const row of ledger.acceptanceCriteria || []) {
      const mapping = planIndex?.acceptanceCriteria?.find((item) => item.id === row.id);
      if (mapping) {
        if (mapping.taskIds && mapping.taskIds.length) {
          row.tasks = [...new Set([...(row.tasks || []), ...mapping.taskIds])].sort();
        }
        if (mapping.planSectionIds && mapping.planSectionIds.length) {
          row.planSections = [...new Set([...(row.planSections || []), ...mapping.planSectionIds])].sort();
        }
        for (const name of mapping.expectedTestNames || []) {
          if (!row.tests.some((t) => t.name === name)) {
            row.tests.push({
              name,
              sourceFile: null,
              phase: 'planned',
              alias: null,
              exitCode: null,
              timestamp: null,
            });
          }
        }
      }
    }
  }
  const targetAcs = acIds.map((id) => (ledger.acceptanceCriteria || []).find((row) => row.id === id)).filter(Boolean);
  const targetNs = nsIds.map((id) => (ledger.negativeScenarios || []).find((row) => row.id === id)).filter(Boolean);
  const hasExplicitTargets = targetAcs.length > 0 || targetNs.length > 0;
  const eventAlreadyApplied = hasExplicitTargets
    ? targetAcs.every((row) => (row.linkEventIds || []).includes(options.eventId))
      && targetNs.every((row) => (row.linkEventIds || []).includes(options.eventId))
    : (ledger.acceptanceCriteria || []).some((row) => (row.linkEventIds || []).includes(options.eventId))
      || (ledger.negativeScenarios || []).some((row) => (row.linkEventIds || []).includes(options.eventId));
  if (eventAlreadyApplied) {
    process.stderr.write(`NOTICE: event-id "${options.eventId}" already applied to target criteria; skipping link payload\n`);
    return ledger;
  }
  for (const ac of acIds) {
    const row = ledger.acceptanceCriteria.find((item) => item.id === ac);
    if (!row) throw new Error(`unknown AC: ${ac}`);
    if (options.status) {
      if (!STATUSES.has(options.status)) throw new Error(`invalid semantic status: ${options.status}`);
      row.status = options.status;
    }
    for (const value of options.file || []) {
      const item = evidenceFile(value, context);
      row.files = [...row.files.filter((entry) => !(entry.path === item.path && entry.lineStart === item.lineStart && entry.lineEnd === item.lineEnd)), item]
        .sort((a, b) => a.path.localeCompare(b.path) || a.lineStart - b.lineStart);
      row.evidence = [...new Set([...row.evidence, `${item.path}:L${item.lineStart}-L${item.lineEnd}`])].sort();
    }
    for (const value of options.test || []) {
      const item = validateTest(parseObject(value, 'test'), context);
      row.tests = [...row.tests.filter((entry) => !(entry.name === item.name && entry.phase === item.phase)), item]
        .sort((a, b) => a.name.localeCompare(b.name) || a.phase.localeCompare(b.phase));
    }
    for (const value of options.commit || []) {
      const item = parseObject(value, 'commit');
      if (!/^[a-f0-9]{7,40}$/i.test(item.sha || '') || !Number.isInteger(Number(item.step))) throw new Error('commit requires sha and integer step');
      row.commits = [...row.commits.filter((entry) => entry.sha !== item.sha), { sha: item.sha, step: Number(item.step) }]
        .sort((a, b) => a.step - b.step || a.sha.localeCompare(b.sha));
    }
    for (const value of options.verdict || []) {
      const item = parseObject(value, 'verdict');
      if (!item.verdict || !item.evidence || !/^.+:L[1-9][0-9]*-L[1-9][0-9]*$/.test(item.evidence)) throw new Error('verdict requires verdict and file:Lx-Ly evidence');
      row.verdicts.push({ ...item, timestamp: item.timestamp || new Date().toISOString() });
    }
    for (const value of options.finding || []) {
      const item = parseObject(value, 'finding');
      if (!item.id || !['Critical', 'Warning', 'Suggestion'].includes(item.severity) || !['open', 'closed'].includes(item.state) || !item.evidence) {
        throw new Error('finding requires id, severity Critical|Warning|Suggestion, state open|closed, and evidence');
      }
      evidenceFile(item.evidence, context);
      const previous = row.findings.find((entry) => entry.id === item.id);
      if (previous && item.state === 'closed' && Number(item.round) <= Number(previous.round)) throw new Error('finding closure must occur in a later round');
      row.findings = [...row.findings.filter((entry) => entry.id !== item.id), { ...item, round: Number(item.round || 1) }]
        .sort((a, b) => a.id.localeCompare(b.id));
    }
    if (options.sabotageExit !== undefined) {
      const exitCode = Number(options.sabotageExit);
      row.sabotage = { required: true, status: exitCode === 0 ? 'passed' : 'failed', exitCode };
    }
    if (!row.linkEventIds.includes(options.eventId)) {
      row.linkEventIds.push(options.eventId);
      row.linkEventIds.sort();
    }
  }
  for (const id of nsIds) {
    const row = ledger.negativeScenarios.find((item) => item.id === id);
    if (!row) throw new Error(`unknown negative scenario: ${id}`);
    for (const value of options.test || []) {
      const item = validateTest(parseObject(value, 'test'), context);
      row.tests = [...row.tests.filter((entry) => !(entry.name === item.name && entry.phase === item.phase)), item]
        .sort((a, b) => a.name.localeCompare(b.name) || a.phase.localeCompare(b.phase));
    }
    if (!row.linkEventIds.includes(options.eventId)) {
      row.linkEventIds.push(options.eventId);
      row.linkEventIds.sort();
    }
  }
  for (const value of options.aliasResult || []) {
    const result = parseObject(value, 'alias-result');
    if (!result.alias || result.exitCode === undefined || !result.command) throw new Error('alias result requires alias, command, and exitCode');
    if (result.skipReason !== undefined && result.skipReason !== null && result.skipReason !== '') {
      if (!ALIAS_SKIP_REASONS.has(result.skipReason)) throw new Error(`invalid alias skipReason: ${result.skipReason}`);
    }
    const normalized = {
      alias: result.alias,
      commandHash: sha256(result.command),
      startedAt: result.startedAt || null,
      endedAt: result.endedAt || null,
      exitCode: Number(result.exitCode),
    };
    if (result.skipReason) normalized.skipReason = result.skipReason;
    let rawFailingPaths = result.failingPaths;
    if (typeof rawFailingPaths === 'string') {
      rawFailingPaths = rawFailingPaths.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
    }
    if ((!rawFailingPaths || rawFailingPaths.length === 0) && options.failingPath && options.failingPath.length > 0) {
      rawFailingPaths = options.failingPath;
    }
    if (Array.isArray(rawFailingPaths) && rawFailingPaths.length > 0) {
      normalized.failingPaths = [...new Set(rawFailingPaths.map((p) => toRepoPath(p, context.repoRoot)).filter(Boolean))].sort();
    }
    if (result.productFailure !== undefined) {
      normalized.productFailure = Boolean(result.productFailure === true || result.productFailure === 'true');
    } else if (options.productFailure !== undefined) {
      normalized.productFailure = Boolean(options.productFailure === true || options.productFailure === 'true');
    }
    ledger.aliasResults = [...ledger.aliasResults.filter((entry) => entry.alias !== normalized.alias), normalized].sort((a, b) => a.alias.localeCompare(b.alias));
  }
  if (options.testSurfaceSkip) {
    const item = parseObject(options.testSurfaceSkip, 'test-surface-skip');
    if (!['no-test-surface', 'testing-disabled'].includes(item.reason) || !item.evidence) {
      throw new Error('test-surface-skip requires reason no-test-surface|testing-disabled and evidence');
    }
    const evidence = path.resolve(context.repoRoot, item.evidence);
    if (!fs.existsSync(evidence)) throw new Error(`test-surface skip evidence does not exist: ${item.evidence}`);
    ledger.testingSkip = { reason: item.reason, evidence: toRepoRelative(context.repoRoot, evidence), sha256: sha256(fs.readFileSync(evidence)) };
  }
  if (options.gap) ledger.declaredGaps = [...new Set([...ledger.declaredGaps, options.gap])].sort();
  if (options.invariantViolation) {
    ledger.invariantViolations ||= [];
    for (const value of options.invariantViolation) {
      const item = parseObject(value, 'invariant-violation');
      if (!item.rule || !['Critical', 'Warning', 'Suggestion'].includes(item.severity) || !item.evidence) {
        throw new Error('invariant-violation requires rule, severity Critical|Warning|Suggestion, and evidence');
      }
      let normEvidence = item.evidence;
      const single = normEvidence.match(/^(.+):L?([1-9][0-9]*)$/);
      if (single) normEvidence = `${single[1]}:L${single[2]}-L${single[2]}`;
      evidenceFile(normEvidence, context);
      const normalized = {
        rule: item.rule,
        severity: item.severity,
        evidence: normEvidence,
        message: item.message || item.description || '',
      };
      if (options.eventId) normalized.linkEventId = options.eventId;
      ledger.invariantViolations = [
        ...ledger.invariantViolations.filter((entry) => !(entry.rule === normalized.rule && entry.evidence === normalized.evidence)),
        normalized,
      ].sort((a, b) => a.rule.localeCompare(b.rule) || a.evidence.localeCompare(b.evidence));
    }
  }
  ledger.revision += 1;
  const requestedBoundary = options.scoreBoundary || options.boundary;
  const hasCommit = (ledger.acceptanceCriteria || []).some((row) => (row.commits || []).length > 0);
  const linkBoundary = requestedBoundary || (hasCommit ? 'pre-step6' : 'step5');
  try {
    const linkScore = scoreLedger(ledger, linkBoundary, context, options);
    ledger.scoreState = { ...linkScore, boundary: linkBoundary, computedAt: new Date().toISOString(), writer: 'ac_ledger.cjs link', ledgerHash: ledgerContentHash(ledger) };
  } catch {
    ledger.scoreState = null;
  }
  writeJson(file, ledger);
  return ledger;
}

function verifyFileHashes(ledger, context, errors) {
  for (const row of ledger.acceptanceCriteria) {
    for (const evidence of row.files) {
      const file = path.resolve(context.repoRoot, evidence.path);
      if (!fs.existsSync(file)) errors.push(`${row.id}: linked file is missing: ${evidence.path}`);
      else if (sha256(fs.readFileSync(file)) !== evidence.sha256) errors.push(`${row.id}: linked file hash changed: ${evidence.path}`);
    }
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

function ledgerContentHash(ledger) {
  const { scoreState, ...rest } = ledger;
  return sha256(JSON.stringify(canonicalize(rest)));
}

function pathMatchesTouched(failingPath, touchedSet) {
  const normF = normalizePath(failingPath);
  if (!normF) return false;
  for (const touched of touchedSet) {
    const normT = normalizePath(touched);
    if (!normT) continue;
    if (normF === normT) return true;
    if (normF.endsWith('/' + normT) || normT.endsWith('/' + normF)) return true;
  }
  return false;
}

function resolveFilesTouched(ledger, context, options = {}) {
  const touched = new Set();
  const repoRoot = context.repoRoot || process.cwd();
  const addPath = (p) => {
    if (!p) return;
    const norm = toRepoPath(p, repoRoot);
    if (norm) touched.add(norm);
  };

  for (const row of ledger.acceptanceCriteria || []) {
    for (const f of row.files || []) {
      if (f && f.path) addPath(f.path);
    }
  }
  if (Array.isArray(ledger.filesTouched)) {
    for (const p of ledger.filesTouched) {
      if (p) addPath(p);
    }
  }
  const optTouched = options.filesTouched;
  if (optTouched) {
    const list = Array.isArray(optTouched) ? optTouched : [optTouched];
    for (const item of list) {
      for (const p of String(item).split(/[;,]/)) {
        if (p.trim()) addPath(p.trim());
      }
    }
  }
  try {
    const candidateDirs = [];
    if (ledger.specPath) candidateDirs.push(path.dirname(path.resolve(repoRoot, ledger.specPath)));
    if (ledger.slug) {
      const plansDir = context.config?.plans?.dir || '.agents/plans';
      candidateDirs.push(path.resolve(repoRoot, plansDir, ledger.slug));
    }
    for (const dir of candidateDirs) {
      if (!fs.existsSync(dir)) continue;
      const stateFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.state.json'));
      for (const stateFile of stateFiles) {
        try {
          const stateData = JSON.parse(fs.readFileSync(path.join(dir, stateFile), 'utf8'));
          const manifest = stateData.workflowManifest || {};
          for (const p of [...(manifest.created || []), ...(manifest.modified || []), ...(manifest.deleted || [])]) {
            if (p) addPath(p);
          }
        } catch {
          // Ignore invalid state json
        }
      }
    }
  } catch {
    // Best-effort state discovery
  }
  return touched;
}

function isAliasDefect(result, filesTouched) {
  if (!result || isSkipped(result) || Number(result.exitCode) === 0) return false;
  if (result.productFailure === true) return true;
  const paths = Array.isArray(result.failingPaths) ? result.failingPaths : [];
  if (paths.length > 0) {
    return paths.some((p) => pathMatchesTouched(p, filesTouched));
  }
  return false;
}

function scoreLedger(ledger, boundary, context, options = {}) {
  if (!BOUNDARIES.has(boundary)) throw new Error(`boundary must be one of: ${[...BOUNDARIES].join(', ')}`);
  const errors = [];
  verifyFileHashes(ledger, context, errors);
  let earned = 0;
  let total = 0;
  let knownDefect = ledger.declaredGaps.length > 0;
  let missingEvidence = false;
  const deficiencies = [];
  const filesTouched = resolveFilesTouched(ledger, context, options);
  const configuredAliases = Object.entries(context.config?.verification || {})
    .filter(([key, value]) => /(?:Build|Test|Format)$/.test(key) && !/^_/.test(key) && typeof value === 'string' && value.trim() && !/^<.*>$/.test(value.trim()))
    .map(([key]) => key)
    .sort();
  for (const alias of configuredAliases) {
    const observed = ledger.aliasResults.find((item) => item.alias === alias);
    if (!observed) errors.push(`configured verification alias lacks observed result: ${alias}`);
    else if (isAliasDefect(observed, filesTouched)) knownDefect = true;
  }
  const validTestingSkip = ledger.testingSkip
    && fs.existsSync(path.resolve(context.repoRoot, ledger.testingSkip.evidence))
    && sha256(fs.readFileSync(path.resolve(context.repoRoot, ledger.testingSkip.evidence))) === ledger.testingSkip.sha256;
  for (const row of ledger.acceptanceCriteria) {
    total += 10;
    if (['Implemented', 'ImplementedDifferently'].includes(row.status)) earned += 4;
    else if (row.status === 'NotImplemented') knownDefect = true;
    if (row.files.length && !errors.some((error) => error.startsWith(`${row.id}: linked file`))) earned += 3;
    else {
      missingEvidence = true;
      deficiencies.push(`${row.id}: no linked files`);
    }
    for (const [fileIndex, entry] of (row.files || []).entries()) {
      if (!entry || !entry.sha256) deficiencies.push(`${row.id}: files[${fileIndex}] missing sha256`);
    }
    const mapped = row.tests.some((test) => {
      if (!test.name || !test.sourceFile) return false;
      const source = path.resolve(context.repoRoot, test.sourceFile);
      if (!fs.existsSync(source) || !fs.readFileSync(source, 'utf8').includes(test.name)) return false;
      if (boundary === 'ship') return test.phase === 'observed' && test.exitCode === 0;
      return test.phase === 'planned' || (test.phase === 'observed' && test.exitCode === 0);
    }) || (boundary === 'ship' && validTestingSkip);
    if (mapped) earned += 2;
    else {
      missingEvidence = true;
      deficiencies.push(`${row.id}: no mapped tests (need {name, sourceFile} with the name present in the file${boundary === 'ship' ? '; ship boundary needs phase observed with exitCode 0' : ''})`);
    }
    if (row.tasks.length || row.planSections.length) earned += 1;
    else deficiencies.push(`${row.id}: no tasks or planSections`);
    if (row.sabotage.required && row.sabotage.status !== 'passed') knownDefect = true;
    if (row.findings.some((finding) => finding.state === 'open' && ['Critical', 'Warning'].includes(finding.severity))) knownDefect = true;
    if (boundary === 'pre-step6' && !row.commits.length) errors.push(`${row.id}: product commit linkage required before step 6`);
  }
  if (ledger.aliasResults.some((result) => isAliasDefect(result, filesTouched))) knownDefect = true;
  for (const row of ledger.negativeScenarios || []) {
    const covered = (row.tests || []).some((test) => test.phase === 'observed' && Number(test.exitCode) === 0);
    if (!covered) {
      knownDefect = true;
      deficiencies.push(`${row.id}: no observed passing test (caps score at 8)`);
    }
  }
  const criticalInvariants = (ledger.invariantViolations || []).filter((item) => item.severity === 'Critical');
  if (criticalInvariants.length > 0) knownDefect = true;
  let score = total ? Math.floor((10 * earned) / total) : 0;
  if (criticalInvariants.length > 0) {
    score = Math.min(score, 7);
    deficiencies.push('score capped at 7: Critical invariant violations');
  } else if (knownDefect) {
    score = Math.min(score, 8);
    deficiencies.push('score capped at 8: knownDefect');
  } else if (missingEvidence) score = Math.min(score, 9);
  const completeTen = !knownDefect && !missingEvidence && !errors.length && ledger.acceptanceCriteria.every((row) => row.status === 'Implemented' || row.status === 'ImplementedDifferently');
  if (!completeTen) score = Math.min(score, 9);
  return {
    boundary,
    score,
    earnedUnits: earned,
    totalUnits: total,
    knownDefect,
    missingEvidence,
    deficiencies,
    errors,
    invariantViolations: ledger.invariantViolations || [],
  };
}
function verify(options, context, persistScore) {
  if (!options.ledger) throw new Error('verify requires --ledger');
  const file = path.resolve(context.repoRoot, options.ledger);
  const ledger = readJson(file);
  const result = scoreLedger(ledger, options.boundary || 'step5', context, options);
  if (persistScore) {
    ledger.revision += 1;
    ledger.scoreState = { ...result, computedAt: new Date().toISOString(), writer: 'ac_ledger.cjs score', ledgerHash: ledgerContentHash(ledger) };
    writeJson(file, ledger);
  }
  return result;
}

function report(options, context) {
  if (!options.ledger || !options.output) throw new Error('report requires --ledger and --output');
  const ledger = readJson(path.resolve(context.repoRoot, options.ledger));
  const score = scoreLedger(ledger, options.boundary || 'ship', context, options);
  const lines = [
    '# Acceptance criteria ledger report',
    '',
    `Derived score: ${score.score}/10`,
    `Boundary: ${score.boundary}`,
    '',
    '| AC | Status | Files | Tests | Findings | Sabotage |',
    '|---|---|---:|---:|---:|---|',
  ];
  for (const row of ledger.acceptanceCriteria) {
    const open = row.findings.filter((finding) => finding.state === 'open').length;
    lines.push(`| ${row.id} | ${row.status} | ${row.files.length} | ${row.tests.length} | ${open} | ${row.sabotage.status} |`);
  }
  if (score.errors.length) lines.push('', '## Verification errors', '', ...score.errors.map((error) => `- ${error}`));
  if (score.deficiencies && score.deficiencies.length) lines.push('', '## Deficiencies', '', ...score.deficiencies.map((item) => `- ${item}`));
  lines.push('');
  fs.writeFileSync(path.resolve(context.repoRoot, options.output), lines.join('\n'), 'utf8');
  return score;
}

function syncPlanIndex(options, context) {
  if (!options.ledger || !options.planIndex) throw new Error('sync-plan-index requires --ledger and --plan-index');
  const file = path.resolve(context.repoRoot, options.ledger);
  const ledger = readJson(file);
  const planIndex = readJson(path.resolve(context.repoRoot, options.planIndex));
  ledger.planIndexPath = toRepoRelative(context.repoRoot, path.resolve(context.repoRoot, options.planIndex));
  for (const row of ledger.acceptanceCriteria || []) {
    const mapping = planIndex?.acceptanceCriteria?.find((item) => item.id === row.id);
    if (mapping) {
      if (mapping.taskIds && mapping.taskIds.length) {
        row.tasks = [...new Set([...(row.tasks || []), ...mapping.taskIds])].sort();
      }
      if (mapping.planSectionIds && mapping.planSectionIds.length) {
        row.planSections = [...new Set([...(row.planSections || []), ...mapping.planSectionIds])].sort();
      }
      for (const name of mapping.expectedTestNames || []) {
        if (!row.tests.some((t) => t.name === name)) {
          row.tests.push({
            name,
            sourceFile: null,
            phase: 'planned',
            alias: null,
            exitCode: null,
            timestamp: null,
          });
        }
      }
    }
  }
  ledger.revision += 1;
  ledger.scoreState = null;
  writeJson(file, ledger);
  return ledger;
}

function ledgerHelpText(command) {
  const generic = 'Usage: ac_ledger.cjs init|link|sync-plan-index|verify|score|report [options]\n'
    + 'Run with <subcommand> --help for flags and an example, e.g. ac_ledger.cjs score --help.\n'
    + 'Subcommands: init (create ledger), link (attach evidence), sync-plan-index (task backfill),\n'
    + 'verify (dry-run score), score (derive and persist scoreState), report (markdown report).\n';
  const notes = 'Notes: every read/write subcommand requires --ledger <ledger>; score takes a boundary\n'
    + 'label (--boundary step5|pre-step6|ship, default step5) and PERSISTS scoreState, while verify\n'
    + 'with the same boundary is a dry run that writes nothing.\n';
  switch (command) {
    case 'init':
      return 'Usage: ac_ledger.cjs init --spec <spec> --output <ledger> [--plan-index <index>] [--workflow-id <id>] [--slug <slug>]\n'
        + 'Create a ledger from the spec Acceptance Criteria bullets (plus Negative & Failing Test Scenarios).\n'
        + 'init creates the ledger via --output and takes no --ledger; every later subcommand\n'
        + '(link, sync-plan-index, verify, score, report) passes --ledger <ledger> instead.\n'
        + 'Example: node ac_ledger.cjs init --spec step-00-slug.spec.md --output ac-ledger.json --slug slug --workflow-id wf\n';
    case 'link':
      return 'Usage: ac_ledger.cjs link --ledger <ledger> --event-id <id> [--ac ACn ...] [--negative NSn ...]\n'
        + '  [--status Implemented|ImplementedDifferently|NotImplemented|Pending] [--file <path:Lstart-Lend> ...]\n'
        + '  [--test <name=N,sourceFile=F,phase=planned|observed,exitCode=C> ...] [--commit <sha=S,step=N> ...]\n'
        + '  [--verdict ...] [--finding ...] [--sabotage-exit N] [--gap <text>] [--plan-index <index>]\n'
        + '  [--alias-result ...] [--test-surface-skip ...] [--invariant-violation ...] [--score-boundary <label>]\n'
        + 'Attach evidence to AC rows. Requires --ledger and --event-id plus at least one target (--ac,\n'
        + '--negative, --alias-result, --test-surface-skip, --gap, or --plan-index). --file ranges use the\n'
        + 'path:Lstart-Lend shape. --plan-index backfills taskIds, planSectionIds, and expected test names.\n'
        + 'Persist: link recomputes scoreState (--score-boundary wins; else pre-step6 when commits exist,\n'
        + 'else step5), so re-score only when the next gate expects a different boundary.\n'
        + 'Example: node ac_ledger.cjs link --ledger ac-ledger.json --event-id impl-ac1 --ac AC1 --status Implemented --file impl.js:L1-L10 --commit sha=<sha>,step=4\n';
    case 'sync-plan-index':
      return 'Usage: ac_ledger.cjs sync-plan-index --ledger <ledger> --plan-index <index>\n'
        + 'Backfill tasks, plan sections, and expected test names from the plan index. Clears scoreState;\n'
        + 're-run score afterwards.\n'
        + 'Example: node ac_ledger.cjs sync-plan-index --ledger ac-ledger.json --plan-index .runtime/plan.index.json\n';
    case 'verify':
      return 'Usage: ac_ledger.cjs verify --ledger <ledger> [--boundary step5|pre-step6|ship]\n'
        + 'Dry run: derive the score without writing. Prints score, earnedUnits/totalUnits, knownDefect,\n'
        + 'missingEvidence, per-row deficiencies[], and errors[].\n'
        + 'Example: node ac_ledger.cjs verify --ledger ac-ledger.json --boundary pre-step6\n';
    case 'score':
      return 'Usage: ac_ledger.cjs score --ledger <ledger> [--boundary step5|pre-step6|ship]\n'
        + 'Derive the score AND persist scoreState (boundary defaults to step5). Use the boundary the next\n'
        + 'gate expects: pre-step6 before step 6, step5 before steps 7-8, ship before step 9.\n'
        + 'Example: node ac_ledger.cjs score --ledger ac-ledger.json --boundary pre-step6\n';
    case 'report':
      return 'Usage: ac_ledger.cjs report --ledger <ledger> --output <report> [--boundary ship]\n'
        + 'Write a markdown ledger report (score, per-AC table, verification errors, deficiencies).\n'
        + 'Example: node ac_ledger.cjs report --ledger ac-ledger.json --output ledger-report.md --boundary ship\n';
    default:
      return generic;
  }
}

function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(ledgerHelpText(command));
    return;
  }
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  let result;
  if (command === 'init') result = init(options, context);
  else if (command === 'link') result = link(options, context);
  else if (command === 'sync-plan-index') result = syncPlanIndex(options, context);
  else if (command === 'verify') result = verify(options, context, false);
  else if (command === 'score') result = verify(options, context, true);
  else if (command === 'report') result = report(options, context);
  else throw new Error('command must be init, link, sync-plan-index, verify, score, or report');
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (command === 'verify' && result.errors.length) process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { scoreLedger, verifyFileHashes, criteriaFromSpec, negativeScenariosFromSpec, readJson, ledgerContentHash };
