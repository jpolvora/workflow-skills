#!/usr/bin/env node
'use strict';

// check_test_adequacy.cjs (ws-implement-tasks):
// Per-task Test Adequacy validator: binding map, non-shallow litmus,
// orphan rule, false-positive rejection.
//
// Usage:
//   node check_test_adequacy.cjs --record <adequacy.json> [--emit-record <out>] [--repo-root DIR]
//
// Exit 0 adequate (prints verdict JSON), 1 inadequate with named gaps,
// 2 usage or unreadable/malformed record.

const fs = require('fs');
const path = require('path');

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
const { resolveRepoRoot, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const LITMUS_KINDS = new Set(['inversion-run', 'wrong-code-run']);
const ORPHAN_ACTIONS = new Set(['removed', 'remapped']);
const REQUIREMENT_PATTERN = /^(AC|NS)[1-9][0-9]*$/;

function printHelp() {
  console.log('Usage: node check_test_adequacy.cjs --record <adequacy.json> [--emit-record <out>] [--repo-root DIR]');
  console.log('Validates one per-task Test Adequacy record. Exit 0 adequate, 1 inadequate, 2 usage.');
}

function parseArgs(argv) {
  const o = { record: null, emitRecord: null, repoRoot: null };
  const fail = (msg) => { console.error(msg); process.exitCode = 2; return null; };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { printHelp(); process.exitCode = 0; return null; }
    else if (a === '--record') { o.record = argv[++i]; if (o.record === undefined) return fail('argument --record: expected one argument'); }
    else if (a === '--emit-record') { o.emitRecord = argv[++i]; if (o.emitRecord === undefined) return fail('argument --emit-record: expected one argument'); }
    else if (a === '--repo-root') { o.repoRoot = argv[++i]; if (o.repoRoot === undefined) return fail('argument --repo-root: expected one argument'); }
    else return fail(`unknown argument: ${a}`);
  }
  if (!o.record) return fail('argument --record is required');
  return o;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(recordPath) {
  let text;
  try {
    text = fs.readFileSync(recordPath, 'utf8');
  } catch {
    return { error: `unreadable record: ${recordPath}` };
  }
  try {
    const record = JSON.parse(text);
    if (!isRecord(record)) return { error: 'malformed record: top-level JSON object required' };
    return { record };
  } catch {
    return { error: 'malformed record: invalid JSON' };
  }
}

function validateShape(record) {
  const gaps = [];
  if (record.schemaVersion !== 1) gaps.push('record schemaVersion must be 1');
  if (!record.taskId || typeof record.taskId !== 'string') gaps.push('record taskId must be a non-empty string');
  if (!Array.isArray(record.acs) || !record.acs.length || !record.acs.every((ac) => typeof ac === 'string' && /^AC[1-9][0-9]*$/.test(ac))) {
    gaps.push('record acs must be a non-empty array of AC ids');
  }
  if (!['adequate', 'inadequate'].includes(record.status)) gaps.push('record status must be adequate or inadequate');
  for (const key of ['bindings', 'litmus', 'addedTests', 'orphansRemoved', 'falsePositives']) {
    if (!Array.isArray(record[key])) gaps.push(`record ${key} must be an array`);
  }
  return gaps;
}

function checkBindings(record, repoRoot, gaps) {
  const bindings = Array.isArray(record.bindings) ? record.bindings : [];
  const acs = Array.isArray(record.acs) ? record.acs : [];
  for (const ac of acs) {
    if (typeof ac !== 'string') continue;
    if (!bindings.some((b) => isRecord(b) && b.ac === ac)) gaps.push(`${ac}: no covering test binding`);
  }
  for (const [index, binding] of bindings.entries()) {
    const label = `bindings[${index}]`;
    if (!isRecord(binding)) { gaps.push(`${label}: entry must be an object`); continue; }
    if (typeof binding.ac !== 'string' || !REQUIREMENT_PATTERN.test(binding.ac)) gaps.push(`${label}: ac must be an ACn or NSn id`);
    if (!binding.test || typeof binding.test !== 'string') { gaps.push(`${label}: test must be a non-empty string`); continue; }
    if (!binding.file || typeof binding.file !== 'string') { gaps.push(`${label}: file must be a non-empty string`); continue; }
    if (!Number.isInteger(binding.lineStart) || !Number.isInteger(binding.lineEnd) || binding.lineStart < 1 || binding.lineEnd < binding.lineStart) {
      gaps.push(`${label}: lineStart/lineEnd must be positive integers with lineStart <= lineEnd`);
      continue;
    }
    let rel;
    try {
      rel = toRepoRelative(repoRoot, path.resolve(repoRoot, binding.file));
    } catch {
      gaps.push(`${label}: file is outside the repository: ${binding.file}`);
      continue;
    }
    let content;
    try {
      content = fs.readFileSync(path.resolve(repoRoot, rel), 'utf8');
    } catch {
      gaps.push(`${label}: file not found: ${binding.file}`);
      continue;
    }
    if (!content.includes(binding.test)) gaps.push(`${label}: test name not present in ${binding.file}: ${binding.test}`);
    else {
      const slice = content.split('\n').slice(binding.lineStart - 1, binding.lineEnd).join('\n');
      if (!slice.includes(binding.test)) gaps.push(`${label}: test name outside declared range ${binding.file}:L${binding.lineStart}-L${binding.lineEnd}: ${binding.test}`);
    }
  }
}

function checkLitmus(record, gaps) {
  const bindings = Array.isArray(record.bindings) ? record.bindings : [];
  const litmus = Array.isArray(record.litmus) ? record.litmus : [];
  for (const [index, entry] of litmus.entries()) {
    const label = `litmus[${index}]`;
    if (!isRecord(entry)) { gaps.push(`${label}: entry must be an object`); continue; }
    if (!entry.test || typeof entry.test !== 'string') gaps.push(`${label}: test must be a non-empty string`);
    if (!LITMUS_KINDS.has(entry.kind)) gaps.push(`${label}: kind must be inversion-run or wrong-code-run`);
    if (typeof entry.exitCode !== 'number' || !Number.isInteger(entry.exitCode) || entry.exitCode === 0) {
      gaps.push(`${label}: exitCode must be a recorded non-zero integer`);
    }
    if (!entry.evidence || typeof entry.evidence !== 'string' || (entry.test && !entry.evidence.includes(entry.test))) {
      gaps.push(`${label}: evidence must name the test`);
    }
  }
  for (const binding of bindings) {
    if (!isRecord(binding) || !binding.test) continue;
    const covered = litmus.some((entry) => isRecord(entry)
      && entry.test === binding.test
      && LITMUS_KINDS.has(entry.kind)
      && Number.isInteger(entry.exitCode) && entry.exitCode !== 0
      && typeof entry.evidence === 'string' && entry.evidence.includes(entry.test));
    if (!covered) gaps.push(`no litmus for mapped test (key assertion unproven under wrong code): ${binding.test}`);
  }
}

function checkOrphans(record, gaps) {
  const bindings = Array.isArray(record.bindings) ? record.bindings : [];
  const added = Array.isArray(record.addedTests) ? record.addedTests : [];
  const removed = Array.isArray(record.orphansRemoved) ? record.orphansRemoved : [];
  for (const [index, entry] of removed.entries()) {
    const label = `orphansRemoved[${index}]`;
    if (!isRecord(entry)) { gaps.push(`${label}: entry must be an object`); continue; }
    if (!entry.test || typeof entry.test !== 'string') gaps.push(`${label}: test must be a non-empty string`);
    if (!ORPHAN_ACTIONS.has(entry.action)) gaps.push(`${label}: action must be removed or remapped`);
    if (entry.action === 'remapped' && (typeof entry.target !== 'string' || !REQUIREMENT_PATTERN.test(entry.target))) {
      gaps.push(`${label}: remapped orphans need a target ACn or NSn id`);
    }
  }
  const mapped = new Set([
    ...bindings.filter(isRecord).map((b) => b.test),
    ...removed.filter(isRecord).map((entry) => entry.test),
  ]);
  for (const name of added) {
    if (typeof name !== 'string' || !name) { gaps.push('addedTests entries must be non-empty strings'); continue; }
    if (!mapped.has(name)) gaps.push(`orphan test with no requirement (remove or remap before handoff): ${name}`);
  }
}

function checkFalsePositives(record, gaps) {
  const entries = Array.isArray(record.falsePositives) ? record.falsePositives : [];
  for (const [index, entry] of entries.entries()) {
    const label = `falsePositives[${index}]`;
    if (!isRecord(entry) || !entry.test || typeof entry.test !== 'string') {
      gaps.push(`${label}: entry must carry a test name`);
      continue;
    }
    gaps.push(`false-positive hazard: ${entry.test} passed on unmodified code; inadequate without litmus`);
  }
}

function checkRecord(record, repoRoot) {
  const gaps = [...validateShape(record)];
  checkBindings(record, repoRoot, gaps);
  checkLitmus(record, gaps);
  checkOrphans(record, gaps);
  checkFalsePositives(record, gaps);
  return gaps;
}

function emit(payload) {
  console.log(JSON.stringify(payload, Object.keys(payload).sort()));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) return process.exitCode || 0;
  const repoRoot = path.resolve(resolveRepoRoot(args.repoRoot, { scriptFile: __filename }));
  const recordPath = path.resolve(args.record);
  const { record, error } = readRecord(recordPath);
  if (error) {
    console.error(error);
    process.exitCode = 2;
    return 2;
  }
  const gaps = checkRecord(record, repoRoot);
  const verdict = {
    status: gaps.length ? 'inadequate' : 'adequate',
    gaps,
    taskId: record.taskId,
    acs: Array.isArray(record.acs) ? record.acs : [],
    bindings: Array.isArray(record.bindings) ? record.bindings.length : 0,
    litmus: Array.isArray(record.litmus) ? record.litmus.length : 0,
    orphans: gaps.filter((gap) => gap.startsWith('orphan test')),
  };
  if (args.emitRecord && verdict.status === 'adequate') {
    const out = path.resolve(args.emitRecord);
    try {
      toRepoRelative(repoRoot, out);
    } catch {
      console.error(`refusing to emit outside the repository: ${args.emitRecord}`);
      process.exitCode = 2;
      return 2;
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify({ ...record, status: 'adequate' }, null, 2)}\n`, 'utf8');
    verdict.emitted = path.relative(repoRoot, out).replace(/\\/g, '/');
  }
  emit(verdict);
  process.exitCode = verdict.status === 'adequate' ? 0 : 1;
  return process.exitCode;
}

if (require.main === module) process.exitCode = main();
module.exports = { main, checkRecord };
