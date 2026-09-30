#!/usr/bin/env node
'use strict';

// Fresh-verify dispatch builder (ws-fresh-verify, Step 1):
// Emits the compact fresh-worker handoff (spec + plan of record + product
// tree + AC list) and fail-closes on any prior full step output.
//
// Usage:
//   node build_fresh_dispatch.cjs --spec <spec> --plan <plan> --product-tree <dir> --output <json> [--prior-output <path> ...]
//
// Exit 0: handoff written. Exit 2: usage error. Exit 1: refused input
// (missing file, unreadable spec, or a prior full step output).

const fs = require('fs');
const path = require('path');

// Basename shapes that count as prior full step outputs. The allowlist is
// exactly the --spec and --plan paths; everything else matching a step
// artifact shape is refused.
const REFUSED_PATTERNS = [
  /^step-01-.*\.plan\.md$/,
  /^step-02-.*\.plan-interview\.md$/,
  /^step-02-.*\.plan\.refined\.md$/,
  /^step-03-.*\.plan\.exec\.md$/,
  /^step-03-.*\.exec\.dag\.json$/,
  /^step-05-.*\.plan\.report\.md$/,
  /^step-05-.*\.score-analysis\.md$/,
  /^step-05b-.*\.fresh-verify\.md$/,
  /^step-06-.*\.review.*\.md$/,
  /^step-06-.*\.fix\.report\.md$/,
  /^step-07-.*\.testing\.(plan|report)\.md$/,
  /^step-08-.*\.result\.md$/,
  /^step-08-.*\.second-pass-report\.md$/,
  /\.prompt\.(md|json)$/,
  /plan\.index\.json$/,
  /^ac-ledger\.json$/,
];

function printHelp() {
  console.log('Usage: node build_fresh_dispatch.cjs --spec <spec> --plan <plan> --product-tree <dir> --output <json> [--prior-output <path> ...]');
}

function parseArgs(argv) {
  const o = { spec: null, plan: null, productTree: null, output: null, priorOutputs: [] };
  const fail = (msg) => { console.error(msg); process.exitCode = 2; return null; };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { printHelp(); process.exitCode = 0; return null; }
    else if (a === '--spec') { o.spec = argv[++i]; if (o.spec === undefined) return fail('argument --spec: expected one argument'); }
    else if (a === '--plan') { o.plan = argv[++i]; if (o.plan === undefined) return fail('argument --plan: expected one argument'); }
    else if (a === '--product-tree') { o.productTree = argv[++i]; if (o.productTree === undefined) return fail('argument --product-tree: expected one argument'); }
    else if (a === '--output') { o.output = argv[++i]; if (o.output === undefined) return fail('argument --output: expected one argument'); }
    else if (a === '--prior-output') {
      const value = argv[++i];
      if (value === undefined) return fail('argument --prior-output: expected one argument');
      o.priorOutputs.push(value);
    } else if (a.startsWith('--spec=')) o.spec = a.slice(7);
    else if (a.startsWith('--plan=')) o.plan = a.slice(7);
    else if (a.startsWith('--product-tree=')) o.productTree = a.slice(15);
    else if (a.startsWith('--output=')) o.output = a.slice(9);
    else if (a.startsWith('--prior-output=')) o.priorOutputs.push(a.slice(15));
    else return fail(`unknown argument: ${a}`);
  }
  if (!o.spec) return fail('argument --spec is required');
  if (!o.plan) return fail('argument --plan is required');
  if (!o.productTree) return fail('argument --product-tree is required');
  if (!o.output) return fail('argument --output is required');
  return o;
}

function isRefused(basename) {
  return REFUSED_PATTERNS.some((pattern) => pattern.test(String(basename).toLowerCase()));
}

// AC ids from `- ACn:` bullets inside the `## Acceptance Criteria` section
// only (the authoring format guarantees one line per criterion there;
// `- ACn:` mentions quoted elsewhere must not pollute the handoff).
function extractAcList(specText) {
  const out = [];
  let inSection = false;
  for (const line of specText.split('\n')) {
    const trimmed = line.trim();
    if (/^##\s+/.test(trimmed)) inSection = /^##\s+Acceptance Criteria\s*$/.test(trimmed);
    if (!inSection) continue;
    const match = /^-\s+(AC\d+):\s*(.*)$/.exec(trimmed);
    if (match) out.push({ id: match[1], text: match[2].trim() });
  }
  return out;
}

function emit(payload) {
  console.log(JSON.stringify(payload, Object.keys(payload).sort()));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) return process.exitCode || 0;
  const specAbs = path.resolve(args.spec);
  const planAbs = path.resolve(args.plan);
  const treeAbs = path.resolve(args.productTree);
  const allowed = new Set([specAbs, planAbs]);
  for (const prior of args.priorOutputs) {
    const abs = path.resolve(prior);
    if (allowed.has(abs)) continue;
    if (isRefused(path.basename(abs))) {
      emit({ status: 'refused', reason: 'prior-full-step-output', path: String(prior) });
      process.exitCode = 1;
      return 1;
    }
  }
  let specText;
  try {
    specText = fs.readFileSync(specAbs, 'utf8');
  } catch {
    emit({ status: 'refused', reason: 'missing-spec', path: String(args.spec) });
    process.exitCode = 1;
    return 1;
  }
  try {
    if (!fs.statSync(planAbs).isFile()) throw new Error('missing');
  } catch {
    emit({ status: 'refused', reason: 'missing-plan', path: String(args.plan) });
    process.exitCode = 1;
    return 1;
  }
  try {
    if (!fs.statSync(treeAbs).isDirectory()) throw new Error('missing');
  } catch {
    emit({ status: 'refused', reason: 'missing-product-tree', path: String(args.productTree) });
    process.exitCode = 1;
    return 1;
  }
  const acList = extractAcList(specText);
  if (!acList.length) {
    emit({ status: 'refused', reason: 'no-acceptance-criteria', path: String(args.spec) });
    process.exitCode = 1;
    return 1;
  }
  const handoff = {
    specPath: path.relative(process.cwd(), specAbs).replace(/\\/g, '/'),
    planOfRecordPath: path.relative(process.cwd(), planAbs).replace(/\\/g, '/'),
    productTreeRoot: path.relative(process.cwd(), treeAbs).replace(/\\/g, '/'),
    acList,
    createdAt: new Date().toISOString(),
  };
  const outAbs = path.resolve(args.output);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
  emit({ status: 'ok', acCount: acList.length, output: String(args.output) });
  return 0;
}

if (require.main === module) process.exitCode = main();
module.exports = { main };
