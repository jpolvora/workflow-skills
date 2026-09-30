#!/usr/bin/env node
'use strict';

// Fresh-verify report writer (ws-fresh-verify, Step 4):
// Applies evidence-or-zero per AC, appends round history, and writes the
// step-05b fresh-verify report. An AC with no pass evidence or no red
// signal scores zero and is listed as a defect naming the missing evidence.
//
// Usage:
//   node write_fresh_report.cjs --slug <slug> --verdicts <json> --injections <json> --output <md> --round <n> [--max-rounds <n>] [--history <json>] [--skip <marker>]
//
// Exit 0: zero defects (loopAction done), or the skip marker was written.
// Exit 2: usage error. Exit 1: defects remain (loopAction continue|pause)
// or an input file is invalid.

const fs = require('fs');
const path = require('path');

function printHelp() {
  console.log('Usage: node write_fresh_report.cjs --slug <slug> --verdicts <json> --injections <json> --output <md> --round <n> [--max-rounds <n>] [--history <json>] [--skip <marker>]');
}

function parseArgs(argv) {
  const o = { slug: null, verdicts: null, injections: null, output: null, round: null, maxRounds: 3, history: null, skip: null };
  const fail = (msg) => { console.error(msg); process.exitCode = 2; return null; };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { printHelp(); process.exitCode = 0; return null; }
    else if (a === '--slug') { o.slug = argv[++i]; if (o.slug === undefined) return fail('argument --slug: expected one argument'); }
    else if (a === '--verdicts') { o.verdicts = argv[++i]; if (o.verdicts === undefined) return fail('argument --verdicts: expected one argument'); }
    else if (a === '--injections') { o.injections = argv[++i]; if (o.injections === undefined) return fail('argument --injections: expected one argument'); }
    else if (a === '--output') { o.output = argv[++i]; if (o.output === undefined) return fail('argument --output: expected one argument'); }
    else if (a === '--round') { o.round = argv[++i]; if (o.round === undefined) return fail('argument --round: expected one argument'); }
    else if (a === '--max-rounds') { o.maxRounds = argv[++i]; if (o.maxRounds === undefined) return fail('argument --max-rounds: expected one argument'); }
    else if (a === '--history') { o.history = argv[++i]; if (o.history === undefined) return fail('argument --history: expected one argument'); }
    else if (a === '--skip') { o.skip = argv[++i]; if (o.skip === undefined) return fail('argument --skip: expected one argument'); }
    else if (a.startsWith('--slug=')) o.slug = a.slice(7);
    else if (a.startsWith('--verdicts=')) o.verdicts = a.slice(11);
    else if (a.startsWith('--injections=')) o.injections = a.slice(13);
    else if (a.startsWith('--output=')) o.output = a.slice(9);
    else if (a.startsWith('--round=')) o.round = a.slice(8);
    else if (a.startsWith('--max-rounds=')) o.maxRounds = a.slice(13);
    else if (a.startsWith('--history=')) o.history = a.slice(10);
    else if (a.startsWith('--skip=')) o.skip = a.slice(7);
    else return fail(`unknown argument: ${a}`);
  }
  if (!o.slug) return fail('argument --slug is required');
  if (!o.output) return fail('argument --output is required');
  if (!o.skip) {
    if (!o.verdicts) return fail('argument --verdicts is required');
    if (!o.injections) return fail('argument --injections is required');
    if (!o.round) return fail('argument --round is required');
  }
  return o;
}

function emit(payload) {
  console.log(JSON.stringify(payload, Object.keys(payload).sort()));
}

function readJsonArray(file, label) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  } catch {
    return { error: `invalid-${label}` };
  }
  if (!Array.isArray(parsed)) return { error: `invalid-${label}` };
  return { rows: parsed };
}

function hasPassEvidence(verdict) {
  if (!verdict || verdict.verdict !== 'pass') return false;
  const evidence = verdict.evidence;
  return typeof evidence === 'string' && /.+:L?\d+(-L?\d+)?$/.test(evidence.trim());
}

function hasRedSignal(injection) {
  if (!injection || injection.redObserved !== true) return false;
  if (typeof injection.failingTest !== 'string' || !injection.failingTest.trim()) return false;
  return Number.isInteger(injection.testExitCode) && injection.testExitCode !== 0;
}

function acSort(a, b) {
  const num = (id) => { const m = /^AC(\d+)$/.exec(String(id)); return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER; };
  const diff = num(a) - num(b);
  return diff !== 0 ? diff : String(a).localeCompare(String(b));
}

function reportMarkdown({ slug, round, maxRounds, rows, defects, historyRows, loopAction }) {
  const lines = [];
  lines.push(`# Fresh-verify report — ${slug}`);
  lines.push('');
  lines.push(`- **Slug**: ${slug}`);
  lines.push(`- **Date/Time**: ${new Date().toISOString()}`);
  lines.push(`- **Round**: ${round}/${maxRounds}`);
  lines.push(`- **Defects**: ${defects.length} (\`loopAction\`: ${loopAction})`);
  lines.push('');
  lines.push('## Per-AC Verdicts');
  lines.push('');
  lines.push('| AC | Verdict | Pass evidence | Injection red | Score |');
  lines.push('|----|---------|---------------|---------------|-------|');
  for (const row of rows) {
    lines.push(`| ${row.ac} | ${row.verdict} | ${row.evidenceCell} | ${row.redCell} | ${row.score} |`);
  }
  lines.push('');
  lines.push('## Injection Results');
  lines.push('');
  lines.push('| AC | Red observed | Failing test | Test exit code | Restored | Worktree removed |');
  lines.push('|----|--------------|--------------|----------------|----------|------------------|');
  for (const row of rows) {
    lines.push(`| ${row.ac} | ${row.injection.redObserved === true ? 'yes' : 'no'} | ${row.injection.failingTest || '*none*'} | ${row.injection.testExitCode ?? '*none*'} | ${row.injection.restored === true ? 'yes' : 'no'} | ${row.injection.worktreeRemoved === true ? 'yes' : 'no'} |`);
  }
  lines.push('');
  lines.push('## Defects');
  lines.push('');
  if (!defects.length) lines.push('None.');
  for (const defect of defects) lines.push(`- [ ] **${defect.ac}**: ${defect.gap} — ${defect.detail}`);
  lines.push('');
  lines.push('## Round History');
  lines.push('');
  lines.push('| Round | Defects in | Defects out | Action |');
  lines.push('|-------|------------|-------------|--------|');
  for (const item of historyRows) lines.push(`| ${item.round} | ${item.defectsIn} | ${item.defectsOut} | ${item.action} |`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function skipMarkdown(slug, marker) {
  return `# Fresh-verify report — ${slug}\n\n- **Slug**: ${slug}\n- **Date/Time**: ${new Date().toISOString()}\n- **Round**: 0/3\n- **Defects**: 0 (\`loopAction\`: done)\n\n## Skip Marker\n\n${marker} — the run has no product tree changes, so no verdicts were re-derived and no faults were injected.\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) return process.exitCode || 0;
  const outAbs = path.resolve(args.output);
  if (args.skip) {
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, skipMarkdown(args.slug, args.skip), 'utf8');
    emit({ defects: 0, loopAction: 'done', output: String(args.output), round: 0, skipped: String(args.skip), status: 'ok' });
    return 0;
  }
  const round = Number(args.round);
  const maxRounds = Number(args.maxRounds);
  if (!Number.isInteger(round) || round < 1) { emit({ status: 'failed', reason: 'invalid-round' }); process.exitCode = 1; return 1; }
  if (!Number.isInteger(maxRounds) || maxRounds < 1) { emit({ status: 'failed', reason: 'invalid-max-rounds' }); process.exitCode = 1; return 1; }
  const verdicts = readJsonArray(args.verdicts, 'verdicts');
  if (verdicts.error) { emit({ status: 'failed', reason: verdicts.error }); process.exitCode = 1; return 1; }
  const injections = readJsonArray(args.injections, 'injections');
  if (injections.error) { emit({ status: 'failed', reason: injections.error }); process.exitCode = 1; return 1; }
  let historyRows = [];
  if (args.history) {
    const history = readJsonArray(args.history, 'history');
    if (history.error) { emit({ status: 'failed', reason: history.error }); process.exitCode = 1; return 1; }
    historyRows = history.rows;
  }
  const verdictByAc = new Map(verdicts.rows.map((row) => [row && row.ac, row]));
  const injectionByAc = new Map(injections.rows.map((row) => [row && row.ac, row]));
  const acIds = [...new Set([...verdictByAc.keys(), ...injectionByAc.keys()].filter(Boolean))].sort(acSort);
  if (!acIds.length) { emit({ status: 'failed', reason: 'no-acceptance-criteria' }); process.exitCode = 1; return 1; }
  const rows = [];
  const defects = [];
  for (const ac of acIds) {
    const verdict = verdictByAc.get(ac) || null;
    const injection = injectionByAc.get(ac) || null;
    const passEvidence = hasPassEvidence(verdict);
    const red = hasRedSignal(injection);
    const score = passEvidence && red ? 1 : 0;
    const verdictLabel = verdict && verdict.verdict === 'pass' ? 'pass' : 'fail';
    rows.push({
      ac,
      verdict: verdictLabel,
      injection: injection || {},
      evidenceCell: passEvidence ? verdict.evidence.trim() : '*none*',
      redCell: red ? `${injection.failingTest} (exit ${injection.testExitCode})` : '*none*',
      score,
    });
    if (score === 0) {
      const gaps = [];
      if (!passEvidence) gaps.push('missing pass evidence');
      if (!red) gaps.push('missing red signal');
      const detail = verdictLabel === 'fail' && verdict && verdict.note ? String(verdict.note) : `verdict ${verdictLabel}`;
      defects.push({ ac, gap: gaps.join(' + '), detail });
    }
  }
  const loopAction = defects.length === 0 ? 'done' : round >= maxRounds ? 'pause' : 'continue';
  const defectsIn = historyRows.length ? Number(historyRows[historyRows.length - 1].defectsOut) : defects.length;
  const fullHistory = [...historyRows, { round, defectsIn: Number.isInteger(defectsIn) ? defectsIn : defects.length, defectsOut: defects.length, action: loopAction }];
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, reportMarkdown({ slug: args.slug, round, maxRounds, rows, defects, historyRows: fullHistory, loopAction }), 'utf8');
  emit({ defects: defects.length, loopAction, output: String(args.output), round, status: defects.length === 0 ? 'ok' : 'defects' });
  process.exitCode = defects.length === 0 ? 0 : 1;
  return process.exitCode;
}

if (require.main === module) process.exitCode = main();
module.exports = { main };
