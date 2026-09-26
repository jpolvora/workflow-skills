#!/usr/bin/env node
'use strict';

// check_git_ownership.cjs — Phase 5a gate: parallel-writer git compatibility.
//
// Tree-wide scan of the shipped workflow surface for ownership violations:
//   * broad staging forms (`git add -A`, `git add .`, bare `git add -u`,
//     directory-wide adds) in executable recipes or helper sources;
//   * destructive whole-tree verbs (`git reset --hard`, `git checkout -- .`,
//     `git restore .`, `git clean -fd`, whole-tree `git stash`, force-push)
//     in executable recipes or helper sources.
//
// Scope: fenced command blocks in .agents/skills/**/*.md plus .cjs/.js under
// skill scripts/ (and bin/). Narrative prose that documents the forbidden
// list is exempt — only fenced blocks and script sources are scanned.
// Canonical contract: ws-shared/runtime/git-ownership.md. Severity critical.
// The two checker scripts below are self-exempt: their verb strings are
// detection patterns (comments, regexes, quoted fixtures), never executed
// git call sites; both are covered by their own committed tests.
//
// Usage: node check_git_ownership.cjs [--json] [--repo-root <dir>]

const fs = require('fs');
const path = require('path');

// Whole-tree staging detectors. Terminals accept end-of-string, whitespace, or
// a shell separator (`;`, `&`, `|`) so `git add .;` / `git add . &&` are caught,
// not only `git add . `. `git add -u -- <deleted-paths>` stays allowed (scoped),
// and a directory-wide add is only a bare directory token ending at a boundary
// (never a scoped file path such as `git add src/Program.cs`).
const BROAD_STAGING = [
  { id: 'broad:git-add-A', re: /git add -A(?:\s|$|;|&|\|)/ },
  { id: 'broad:git-add-all', re: /git add --all(?:\s|$|;|&|\|)/ },
  { id: 'broad:git-add-dot', re: /git add \.\.?(?:\/|[\s;|&]|$)/ },
  { id: 'broad:git-add-u', re: /git add -u(?!\s+--\s+[^\s;|&])(?:\s|$|;|&|\|)/ },
  { id: 'broad:dir-add', re: /git add (?!-|-- )[\w~][^\s`]*\/(?:\s|$|;|&|\|)/ },
];

const DESTRUCTIVE = [
  { id: 'destructive:reset-hard', re: /git reset --hard/ },
  { id: 'destructive:checkout-dot', re: /git checkout -- \.(?:\s|$|;|&|\|)/ },
  { id: 'destructive:restore-dot', re: /git restore \.(?:\s|$)/ },
  { id: 'destructive:clean-fd', re: /git clean -fd/ },
  // Bare `git stash` (save/push/pop) is whole-tree; `list`/`show` are read-only.
  { id: 'destructive:stash', re: /git stash(?!\s+(?:list|show)\b)(?:\s|$)/ },
  { id: 'destructive:force-push', re: /git push (?:--force|-f)\b/ },
];

// Enforcement-layer self-exemption (detection patterns, not call sites).
const SELF_EXEMPT_BASENAMES = new Set(['check_git_ownership.cjs', 'check_workflows.cjs']);

function isCommentLine(text) {
  const trimmed = String(text).trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#');
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') options.json = true;
    else if (token === '--repo-root') options.repoRoot = argv[++index];
    else if (token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
  }
  return options;
}

function walkFiles(root, accept) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'runs') continue;
        stack.push(full);
      } else if (entry.isFile() && accept(full, entry.name)) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

// Yield {line, text} for fenced-block content lines only (info string and
// fences excluded), tracking 1-based line numbers. Fences may be indented under
// list items, so the opener/closer match allows leading whitespace.
function fencedLines(markdown) {
  const out = [];
  const lines = String(markdown).split(/\r?\n/);
  let inFence = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) out.push({ line: i + 1, text: line });
  }
  return out;
}

function scanText(units, checks) {
  const hits = [];
  for (const unit of units) {
    for (const check of checks) {
      if (check.re.test(unit.text)) {
        hits.push({ line: unit.line, pattern: check.id, text: unit.text.trim().slice(0, 160) });
      }
    }
  }
  return hits;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
  const skillsRoot = path.join(repoRoot, '.agents', 'skills');
  const findings = [];
  let scannedDocs = 0;
  let scannedScripts = 0;

  const docs = fs.existsSync(skillsRoot)
    ? walkFiles(skillsRoot, (full, name) => name.endsWith('.md'))
    : [];
  for (const file of docs) {
    scannedDocs += 1;
    const units = fencedLines(fs.readFileSync(file, 'utf8'));
    for (const hit of scanText(units, [...BROAD_STAGING, ...DESTRUCTIVE])) {
      findings.push({ file: path.relative(repoRoot, file).split(path.sep).join('/'), ...hit });
    }
  }

  const scripts = [];
  if (fs.existsSync(skillsRoot)) {
    scripts.push(...walkFiles(skillsRoot, (full, name) => /\.(cjs|js)$/.test(name) && full.split(path.sep).includes('scripts')));
  }
  const binRoot = path.join(repoRoot, 'bin');
  if (fs.existsSync(binRoot)) {
    scripts.push(...walkFiles(binRoot, (full, name) => /\.(cjs|js)$/.test(name)));
  }
  for (const file of scripts) {
    if (SELF_EXEMPT_BASENAMES.has(path.basename(file))) continue;
    scannedScripts += 1;
    const units = fs.readFileSync(file, 'utf8').split(/\r?\n/)
      .map((text, i) => ({ line: i + 1, text }))
      .filter((unit) => !isCommentLine(unit.text));
    for (const hit of scanText(units, [...BROAD_STAGING, ...DESTRUCTIVE])) {
      findings.push({ file: path.relative(repoRoot, file).split(path.sep).join('/'), ...hit });
    }
  }

  const payload = { ok: findings.length === 0, scannedDocs, scannedScripts, findings };
  if (options.json) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else if (payload.ok) process.stdout.write(`check_git_ownership: OK (${scannedDocs} docs, ${scannedScripts} scripts)\n`);
  else {
    for (const f of findings) {
      process.stderr.write(`check_git_ownership: ${f.file}:${f.line} [${f.pattern}] ${f.text}\n`);
    }
  }
  if (!payload.ok) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
