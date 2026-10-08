#!/usr/bin/env node
'use strict';

/**
 * ws-retro candidate validator (issue #490).
 *
 * Validates machine candidate records produced by the ws-retro skill before
 * they are presented to the user. Rejects ungrounded or malformed candidates
 * so no generic advice is ever emitted (spec NS2).
 *
 * CLI:
 *   node validate_candidates.cjs --input <candidates.json> [--json] [--repo-root <dir>]
 *
 * Input: `{ "candidates": [ { id, title, severity, category, evidence, proposedChange } ] }`.
 * Output: `{"ok":bool,"accepted":[ids],"rejected":[{id,reason}],"checked":n}`.
 * Stable rejection reasons: `field-required`, `category-invalid`,
 * `evidence-required`, `evidence-unresolvable`.
 * Exit 0 for an emitted report (rejections are data), 1 for unusable input
 * (unreadable file, malformed JSON, missing candidates array), 2 usage error.
 * This helper never writes files and never spawns processes.
 */

const fs = require('fs');
const path = require('path');

const CATEGORIES = new Set([
  'memory',
  'harness-directive',
  'reviewer-standard',
  'automated-check',
  'navigation-pointer',
  'no-op-deletion',
]);
const SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);

function usage() {
  process.stderr.write('Usage: node validate_candidates.cjs --input <candidates.json> [--json] [--repo-root <dir>]\n');
}

function parseArgs(argv) {
  const out = { input: null, json: false, repoRoot: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') out.json = true;
    else if (arg === '--input') out.input = argv[(index += 1)];
    else if (arg === '--repo-root') out.repoRoot = argv[(index += 1)];
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function inside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function trimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveEvidence(evidence, repoRoot) {
  const artifact = trimmed(evidence && evidence.artifact);
  const ref = trimmed(evidence && evidence.ref);
  if (!artifact && !ref) return { ok: false, reason: 'evidence-required' };
  if (!repoRoot || !artifact) return { ok: true };
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(artifact)) return { ok: true };
  const resolved = path.resolve(repoRoot, artifact);
  if (!inside(repoRoot, resolved) || !fs.existsSync(resolved)) {
    return { ok: false, reason: 'evidence-unresolvable' };
  }
  return { ok: true };
}

function validateCandidate(candidate, index, repoRoot) {
  const fallbackId = `candidate-${index + 1}`;
  const id = trimmed(candidate && candidate.id) || fallbackId;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { id, reason: 'field-required' };
  }
  if (!trimmed(candidate.id) || !trimmed(candidate.title)) return { id, reason: 'field-required' };
  if (!SEVERITIES.has(trimmed(candidate.severity))) return { id, reason: 'field-required' };
  if (!CATEGORIES.has(trimmed(candidate.category))) return { id, reason: 'category-invalid' };
  const change = candidate.proposedChange;
  if (!change || typeof change !== 'object' || !trimmed(change.target) || !trimmed(change.change)) {
    return { id, reason: 'field-required' };
  }
  const evidence = resolveEvidence(candidate.evidence, repoRoot);
  if (!evidence.ok) return { id, reason: evidence.reason };
  return { id, accepted: true };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`validate_candidates: ${error.message}\n`);
    usage();
    process.exitCode = 2;
    return;
  }
  if (!options.input) {
    usage();
    process.exitCode = 2;
    return;
  }
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(options.input, 'utf8'));
  } catch (error) {
    process.stderr.write(`validate_candidates: unreadable or malformed input (${error.message})\n`);
    process.exitCode = 1;
    return;
  }
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.candidates)) {
    process.stderr.write('validate_candidates: input must be an object with a candidates array\n');
    process.exitCode = 1;
    return;
  }
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : null;
  const accepted = [];
  const rejected = [];
  payload.candidates.forEach((candidate, index) => {
    const verdict = validateCandidate(candidate, index, repoRoot);
    if (verdict.accepted) accepted.push(verdict.id);
    else rejected.push({ id: verdict.id, reason: verdict.reason });
  });
  const report = {
    ok: rejected.length === 0,
    accepted,
    rejected,
    checked: payload.candidates.length,
  };
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } else {
    process.stdout.write(`checked ${report.checked}: ${accepted.length} accepted, ${rejected.length} rejected\n`);
    for (const item of rejected) process.stdout.write(`rejected ${item.id}: ${item.reason}\n`);
  }
  process.exitCode = 0;
}

if (require.main === module) {
  main();
}

module.exports = { validateCandidate, CATEGORIES, SEVERITIES };
