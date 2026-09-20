#!/usr/bin/env node
'use strict';

// Port of collect_window.py (ws-pre-daily):
// Collect git / plan / changelog evidence for a rolling hours window.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const TITLE_RE = /^(?:\*\*title:\*\*|title:)\s*(.+)$/gim;
const USID_RE = /^(?:\*\*usId:\*\*|usId:|slug:|us:)\s*(.+)$/gim;
const STEP_RE = /^(?:\*\*currentStep:\*\*|currentStep:)\s*(\S+)/gim;
const BRANCH_RE = /^(?:\*\*branch:\*\*|branch:)\s*(.+)$/gim;
const PR_RE = /^(?:\*\*(?:pr(?:Number|Url|Id)?|prUrl):\*\*|(?:pr(?:Number|Url|Id)?|prUrl):)\s*(.+)$/gim;
const CHANGELOG_RE = /^###? \[(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?)\](.*)$/gm;

function isoUtc(dt) {
  return new Date(dt.getTime()).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function parseIso(raw) {
  if (!raw) return null;
  let text = String(raw).trim().replace(/Z$/i, '+00:00');
  // Parity with collect_window.py parse_iso: naive wall times are UTC, not local.
  if (!/[+-]\d{2}:?\d{2}$/.test(text)) {
    const m = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/);
    text = m ? `${m[1]}T${m[2]}Z` : `${text}Z`;
  }
  const dt = new Date(text);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function runGit(repo, args) {
  const proc = spawnSync('git', args, { cwd: String(repo), encoding: 'utf8' });
  return [proc.status ?? 1, (proc.stdout || '').trim(), (proc.stderr || '').trim()];
}

function gitOk(repo, args) {
  const [code, out] = runGit(repo, args);
  return code === 0 ? out : '';
}

function detectBase(repo) {
  const [code, out] = runGit(repo, ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD']);
  if (code === 0 && out) {
    const name = out.split('/').pop();
    for (const candidate of [name, `origin/${name}`]) {
      const [c] = runGit(repo, ['rev-parse', '--verify', candidate]);
      if (c === 0) return candidate;
    }
  }
  for (const name of ['master', 'main', 'develop']) {
    let [c] = runGit(repo, ['rev-parse', '--verify', name]);
    if (c === 0) return name;
    [c] = runGit(repo, ['rev-parse', '--verify', `origin/${name}`]);
    if (c === 0) return `origin/${name}`;
  }
  return 'HEAD';
}

function parseCommits(raw) {
  const rows = [];
  if (!raw) return rows;
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const parts = line.split('');
    if (parts.length < 5) continue;
    rows.push({
      hash: parts[0],
      short: parts[0].slice(0, 7),
      committedAt: parts[1],
      authorName: parts[2],
      authorEmail: parts[3],
      subject: parts[4],
      refs: parts.length > 5 ? parts[5] : '',
    });
  }
  return rows;
}

function collectGit(repo, since, until, author) {
  const sinceIso = isoUtc(since);
  const untilIso = isoUtc(until);
  const logFmt = '%H%cI%an%ae%s%D';
  const logArgs = ['log', '--all', `--since=${sinceIso}`, `--until=${untilIso}`, `--pretty=format:${logFmt}`];
  if (author) logArgs.push(`--author=${author}`);
  const allCommits = parseCommits(gitOk(repo, logArgs));
  const base = detectBase(repo);
  const baseArgs = ['log', base, `--since=${sinceIso}`, `--until=${untilIso}`, `--pretty=format:${logFmt}`];
  if (author) baseArgs.push(`--author=${author}`);
  const onBase = new Set(parseCommits(gitOk(repo, baseArgs)).map((c) => c.hash));
  for (const c of allCommits) c.onBase = onBase.has(c.hash);
  const branch = gitOk(repo, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const porcelain = gitOk(repo, ['status', '--porcelain=v1', '-b']);
  const dirty = porcelain.split('\n').filter((l) => l && !l.startsWith('##'));
  return {
    baseBranch: base,
    currentBranch: branch,
    authorFilter: author || null,
    commits: allCommits,
    dirty,
    statusHead: porcelain ? porcelain.split('\n')[0] : '',
  };
}

function extractField(text, rx) {
  rx.lastIndex = 0;
  const m = rx.exec(text);
  if (!m) return null;
  let val = m[1].trim().replace(/^\*+|\*+$/g, '').trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1).trim();
  }
  return val;
}

function* walkStateFiles(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkStateFiles(p);
    else if (e.isFile() && e.name.endsWith('.state.md')) yield p;
  }
}

function collectPlans(plansDir, since, until) {
  let st0;
  try { st0 = fs.statSync(plansDir); } catch { return []; }
  if (!st0.isDirectory()) return [];
  const sinceTs = since.getTime() / 1000;
  const untilTs = until.getTime() / 1000;
  const rows = [];
  for (const state of [...walkStateFiles(plansDir)].sort()) {
    let st;
    try { st = fs.statSync(state); } catch { continue; }
    const mtime = st.mtimeMs / 1000;
    if (mtime < sinceTs || mtime > untilTs) continue;
    let text;
    try { text = fs.readFileSync(state, 'utf8'); } catch { continue; }
    rows.push({
      path: path.relative(plansDir, state).replace(/\\/g, '/'),
      updatedAt: isoUtc(new Date(st.mtimeMs)),
      usId: extractField(text, USID_RE),
      title: extractField(text, TITLE_RE),
      currentStep: extractField(text, STEP_RE),
      branch: extractField(text, BRANCH_RE),
      pr: extractField(text, PR_RE),
    });
  }
  return rows;
}

function collectChangelog(changelogPath, since, until) {
  let st;
  try { st = fs.statSync(changelogPath); } catch { return []; }
  if (!st.isFile()) return [];
  let text;
  try { text = fs.readFileSync(changelogPath, 'utf8'); } catch { return []; }
  const matches = [...text.matchAll(CHANGELOG_RE)];
  const entries = [];
  for (let i = 0; i < matches.length; i += 1) {
    const m = matches[i];
    const dt = parseIso(m[1].replace(' ', 'T'));
    if (!dt) continue;
    if (dt < since || dt > until) continue;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = text.slice(m.index + m[0].length, end).trim();
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 6);
    entries.push({ at: isoUtc(dt), heading: m[0].trim(), lines });
  }
  return entries;
}

function printHelp() {
  console.log('Usage: node collect_window.cjs [--hours N] [--tz LABEL] [--repo DIR] [--plans-dir DIR] [--changelog FILE] [--author NAME] [--all-authors]');
}

function parseArgs(argv) {
  const o = { hours: 36, tz: '', repo: '.', plansDir: '', changelog: '', author: '', allAuthors: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else if (a === '--hours') { o.hours = parseFloat(argv[++i]); }
    else if (a.startsWith('--hours=')) o.hours = parseFloat(a.slice(8));
    else if (a === '--tz') o.tz = argv[++i] ?? '';
    else if (a.startsWith('--tz=')) o.tz = a.slice(5);
    else if (a === '--repo') o.repo = argv[++i] ?? '.';
    else if (a.startsWith('--repo=')) o.repo = a.slice(7);
    else if (a === '--plans-dir') o.plansDir = argv[++i] ?? '';
    else if (a.startsWith('--plans-dir=')) o.plansDir = a.slice(12);
    else if (a === '--changelog') o.changelog = argv[++i] ?? '';
    else if (a.startsWith('--changelog=')) o.changelog = a.slice(12);
    else if (a === '--author') o.author = argv[++i] ?? '';
    else if (a.startsWith('--author=')) o.author = a.slice(9);
    else if (a === '--all-authors') o.allAuthors = true;
    else { console.error(`unknown argument: ${a}`); process.exit(2); }
  }
  return o;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = path.resolve(args.repo);
  const until = new Date();
  const since = new Date(until.getTime() - args.hours * 3600 * 1000);
  const [code, , err] = runGit(repo, ['rev-parse', '--is-inside-work-tree']);
  if (code !== 0) {
    console.log(JSON.stringify({ ok: false, error: 'not-a-git-repo', repo: String(repo), stderr: err }));
    process.exit(1);
  }
  let author = args.allAuthors ? null : (args.author.trim() || null);
  if (author === null && !args.allAuthors) {
    const email = gitOk(repo, ['config', 'user.email']);
    const name = gitOk(repo, ['config', 'user.name']);
    author = email || name || null;
  }
  const gitData = collectGit(repo, since, until, author);
  const plansDir = args.plansDir ? path.resolve(args.plansDir) : null;
  const changelog = args.changelog ? path.resolve(args.changelog) : null;
  const result = {
    ok: true,
    window: { hours: args.hours, tz: (args.tz || '').trim() || 'UTC', sinceIso: isoUtc(since), untilIso: isoUtc(until) },
    git: gitData,
    plans: plansDir ? collectPlans(plansDir, since, until) : [],
    changelog: changelog ? collectChangelog(changelog, since, until) : [],
    gaps: [],
  };
  if (plansDir === null) result.gaps.push('plans-dir-not-passed');
  else {
    try { if (!fs.statSync(plansDir).isDirectory()) result.gaps.push('plans-dir-missing'); } catch { result.gaps.push('plans-dir-missing'); }
  }
  if (changelog === null) result.gaps.push('changelog-not-passed');
  else {
    try { if (!fs.statSync(changelog).isFile()) result.gaps.push('changelog-missing'); } catch { result.gaps.push('changelog-missing'); }
  }
  console.log(JSON.stringify(result));
  return 0;
}

if (require.main === module) process.exit(main());
module.exports = { main };
