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
const { resolveConsumerContext } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

// Repo-relative display path that never throws for a path outside the repo.
// Global-only installs audit files under {globalSkillsRoot}; those stay
// resolvable from repoRoot (via `..` or an absolute cross-drive path) instead
// of aborting the report. toRepoRelative() without allowOutside throws, and
// with allowOutside collapses to a basename that would merge distinct files.
function displayPath(repoRoot, value) {
  return path.relative(path.resolve(repoRoot), path.resolve(value)).replace(/\\/g, '/') || '.';
}

function parseArgs(argv) {
  const options = { paths: [], minLines: 6, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') options.json = true;
    else if (token === '--path') options.paths.push(argv[++index]);
    else if (token === '--allowlist' || token === '--repo-root' || token === '--min-lines') {
      const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      options[key] = argv[++index];
    } else throw new Error(`unknown argument: ${token}`);
  }
  options.minLines = Number(options.minLines);
  if (!Number.isInteger(options.minLines) || options.minLines < 6) throw new Error('--min-lines must be at least 6');
  return options;
}

// Package membership: only this package's own directories are audited. A
// shared global skills root may also hold unrelated user skills; their
// markdown is not shipped package content and must not be compared here.
function packageRoots(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && (entry.name === 'ws-shared' || entry.name.startsWith('ws-')))
    .map((entry) => path.join(dir, entry.name));
}

function shippedMarkdown(context) {
  const generatedHubMarkdown = new Set();
  try {
    // us-351: installed hubs may lag the SoT manifest; the generatedLocal
    // classification is package-level, so fall back to the SoT copy.
    const layoutCandidates = [
      path.join(context.runtimeSource, 'hub-layout.json'),
      path.join(context.repoRoot, '.agents', 'skills', 'ws-shared', 'runtime', 'hub-layout.json'),
    ];
    const layoutPath = layoutCandidates.find((file) => fs.existsSync(file));
    const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
    for (const entry of layout.categories?.generatedLocal?.paths || []) {
      if (String(entry).toLowerCase().endsWith('.md')) generatedHubMarkdown.add(String(entry));
    }
  } catch {
    // A consumer may rely on a global hub without a local layout manifest.
  }
  const roots = ['AGENTS.md', 'CATALOG.md', 'README.md', 'FEATURES.md']
    .map((item) => path.join(context.repoRoot, item))
    .filter((item) => fs.existsSync(item));
  const hubRel = displayPath(context.repoRoot, context.sharedDir);
  const hubOutside = hubRel === '..' || hubRel.startsWith('../');
  const hubPrefix = hubOutside ? null : `${hubRel}/`;
  const hubEsc = hubOutside ? null : hubRel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hubFileRe = hubOutside ? null : new RegExp(`^${hubEsc}/(?:MEMORY|CHANGELOG|STACK|backend|frontend)\\.md$`);
  const hubMemoryRe = hubOutside ? null : new RegExp(`^${hubEsc}/memory(?:/|$)`);
  // Scan the resolved skills root (local or global install), not a hardcoded
  // project-local path, so global-only installs are audited, not skipped.
  const skillsBase = context.skillsRoot && path.isAbsolute(String(context.skillsRoot))
    ? String(context.skillsRoot)
    : path.join(context.repoRoot, '.agents', 'skills');
  const stack = packageRoots(skillsBase);
  if (!hubOutside && fs.existsSync(context.sharedDir)) stack.push(context.sharedDir);
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const relative = displayPath(context.repoRoot, full);
      if (entry.isDirectory()) {
        if (!hubMemoryRe || !hubMemoryRe.test(relative)) stack.push(full);
      } else if (entry.name.endsWith('.md')) {
        if (hubPrefix && relative.startsWith(hubPrefix)) {
          const hubRelative = relative.slice(hubPrefix.length);
          if (generatedHubMarkdown.has(hubRelative)) continue;
        }
        if (
          !(hubFileRe && hubFileRe.test(relative))
        ) {
          roots.push(full);
        }
      }
    }
  }
  return [...new Set(roots.map((item) => displayPath(context.repoRoot, item)))].sort();
}

function normativeBlocks(text, minLines) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let start = 0;
  while (start < lines.length) {
    while (start < lines.length && !lines[start].trim()) start += 1;
    let end = start;
    while (end < lines.length && lines[end].trim()) end += 1;
    const candidate = lines.slice(start, end);
    if (
      candidate.length >= minLines &&
      !candidate[0].startsWith('```') &&
      !candidate.every((line) => /^\s*\|/.test(line)) &&
      candidate.some((line) => /\b(?:must|never|required|forbidden|do not|always|shall)\b/i.test(line))
    ) {
      blocks.push({ startLine: start + 1, lines: candidate, text: candidate.join('\n') });
    }
    start = end + 1;
  }
  return blocks;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const files = options.paths.length ? options.paths : shippedMarkdown(context);
  const allowlist = options.allowlist
    ? JSON.parse(fs.readFileSync(path.resolve(context.repoRoot, options.allowlist), 'utf8')).blocks || []
    : [];
  const map = new Map();
  for (const relative of files) {
    const file = path.resolve(context.repoRoot, relative);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    for (const block of normativeBlocks(fs.readFileSync(file, 'utf8'), options.minLines)) {
      const digest = crypto.createHash('sha256').update(block.text).digest('hex');
      const occurrence = { path: displayPath(context.repoRoot, file), line: block.startLine };
      const row = map.get(digest) || { digest, lines: block.lines.length, text: block.text, occurrences: [] };
      row.occurrences.push(occurrence);
      map.set(digest, row);
    }
  }
  const duplicates = [...map.values()]
    .filter((row) => new Set(row.occurrences.map((item) => item.path)).size > 1)
    .filter((row) => !allowlist.some((item) => item.sha256 === row.digest))
    .map(({ text: _text, ...row }) => row)
    .sort((a, b) => a.digest.localeCompare(b.digest));
  const result = { ok: duplicates.length === 0, minLines: options.minLines, filesScanned: files.length, duplicates };
  process.stdout.write(options.json ? `${JSON.stringify(result, null, 2)}\n` : duplicates.map((row) => `${row.digest} (${row.lines} lines): ${row.occurrences.map((item) => `${item.path}:L${item.line}`).join(', ')}`).join('\n') + (duplicates.length ? '\n' : 'No duplicated normative blocks.\n'));
  process.exitCode = result.ok ? 0 : 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
