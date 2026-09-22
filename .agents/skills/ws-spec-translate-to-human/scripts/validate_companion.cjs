#!/usr/bin/env node
'use strict';

// validate_companion.cjs — deterministic shape gate for ws-spec-translate-to-human.
// Usage: node validate_companion.cjs --spec <spec.md> --companion <*-translated.md>
// Exit 0 when the companion is well-formed; non-zero with findings on stdout.
// Never writes either file. Node builtins only.

const fs = require('fs');
const path = require('path');

const HEADINGS = new Map([
  ['implementation', 'implementation'],
  ['implementação', 'implementation'],
  ['ui test', 'ui-test'],
  ['teste ui', 'ui-test'],
  ['out of scope', 'out-of-scope'],
  ['fora de escopo', 'out-of-scope'],
  ['open questions', 'open-questions'],
  ['perguntas abertas', 'open-questions'],
]);

const ORDER = ['implementation', 'ui-test', 'out-of-scope', 'open-questions'];
const REQUIRED = ['implementation', 'ui-test'];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--spec') out.spec = argv[++i];
    else if (argv[i] === '--companion') out.companion = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!out.spec) throw new Error('missing --spec <path>');
  if (!out.companion) throw new Error('missing --companion <path>');
  return out;
}

function sectionsOf(text) {
  const found = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (!m) continue;
    const key = HEADINGS.get(m[1].trim().toLowerCase());
    if (key) found.push({ key, title: m[1].trim() });
  }
  return found;
}

function numberingOf(text) {
  // Map section key -> observed step numbers in order.
  const map = new Map();
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const h = line.match(/^###\s+(.+?)\s*$/);
    if (h) {
      const key = HEADINGS.get(h[1].trim().toLowerCase());
      current = key || null;
      if (current && !map.has(current)) map.set(current, []);
      continue;
    }
    const s = line.match(/^(\d+)\.\s+\S/);
    if (s && current) map.get(current).push(Number(s[1]));
  }
  return map;
}

function main() {
  const findings = [];
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.log(`FAIL: ${error.message}`);
    process.exitCode = 2;
    return;
  }
  const specPath = path.resolve(args.spec);
  const companionPath = path.resolve(args.companion);

  if (specPath === companionPath) findings.push('companion path must differ from the spec path (never overwrite the agent spec)');
  if (path.basename(companionPath) === path.basename(specPath)) findings.push('companion basename must differ from the spec basename');
  if (!path.basename(companionPath).endsWith('.spec-translated.md')) findings.push('companion file must be named *.spec-translated.md');
  if (path.dirname(companionPath) !== path.dirname(specPath)) findings.push('companion must sit beside the source spec (same directory)');

  let spec = null;
  let companion = null;
  try {
    spec = fs.readFileSync(specPath, 'utf8');
  } catch {
    findings.push(`cannot read spec: ${args.spec}`);
  }
  try {
    companion = fs.readFileSync(companionPath, 'utf8');
  } catch {
    findings.push(`cannot read companion: ${args.companion}`);
  }
  if (spec === null || companion === null) {
    for (const f of findings) console.log(`FAIL: ${f}`);
    process.exitCode = 1;
    return;
  }

  const seen = sectionsOf(companion).map((s) => s.key);
  for (const required of REQUIRED) {
    if (!seen.includes(required)) findings.push(`missing required section: ${required}`);
  }
  const orderIndex = seen.map((key) => ORDER.indexOf(key)).filter((i) => i >= 0);
  for (let i = 1; i < orderIndex.length; i += 1) {
    if (orderIndex[i] < orderIndex[i - 1]) {
      findings.push('sections out of order (expected Implementation, UI Test, Out of scope, Open questions)');
      break;
    }
  }
  if (new Set(seen).size !== seen.length) findings.push('duplicate section heading');

  const numbering = numberingOf(companion);
  for (const [key, nums] of numbering) {
    if (nums.length === 0) {
      // Out of scope / Open questions are bullet sections; only the two
      // step sections require numbered entries.
      if (key === 'implementation' || key === 'ui-test') findings.push(`section has no numbered steps: ${key}`);
      continue;
    }
    for (let i = 0; i < nums.length; i += 1) {
      if (nums[i] !== i + 1) {
        findings.push(`non-continuous numbering in section ${key} (expected ${i + 1}, saw ${nums[i]})`);
        break;
      }
    }
  }

  const specAcs = new Set();
  for (const m of spec.matchAll(/^-\s+(?:\*\*)?AC(\d+)(?:\*\*)?:/gm)) specAcs.add(m[1]);
  const citedAcs = new Set();
  for (const m of companion.matchAll(/AC(\d+)/g)) citedAcs.add(m[1]);
  for (const ac of [...specAcs].sort((a, b) => Number(a) - Number(b))) {
    if (!citedAcs.has(ac)) findings.push(`source AC${ac} has no corresponding companion step`);
  }

  for (const m of companion.matchAll(/\[unresolved:([^\]]*)\]/g)) {
    if (!m[1].trim()) findings.push('empty [unresolved:] flag (name the unresolvable term)');
  }

  if (findings.length) {
    for (const f of findings) console.log(`FAIL: ${f}`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK: ${path.basename(companionPath)} covers ACs [${[...specAcs].sort((a, b) => Number(a) - Number(b)).join(', ')}]`);
}

main();
