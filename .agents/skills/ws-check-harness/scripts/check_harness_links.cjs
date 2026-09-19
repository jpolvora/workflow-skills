#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const TOP_LEVEL = new Set(['.agents', '.github', 'bin', 'docs', 'scripts', 'specs', 'test']);
const TOKENS = {
  '{skillsRoot}': '.agents/skills',
  '{sharedDir}': '.ws',
  '{plansDir}': '.agents/plans',
  '{reviewsDir}': '.agents/codereviews',
  '{memoryDir}': '.',
  '{specsDir}': '.agents/specs',
};
const EXCLUDED_MD = /(^|[\\/])(CHANGELOG\.md|MEMORY\.md|memory[\\/]|evals[\\/])/;
const ROOT_DOCS = ['AGENTS.md', 'CATALOG.md', 'README.md', 'FEATURES.md', 'RESEARCH.md', 'STACK.md'];

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, filter, out);
    else if (filter(full)) out.push(full);
  }
  return out;
}

function collectFiles(repoRoot) {
  const files = [];
  for (const name of ROOT_DOCS) {
    const full = path.join(repoRoot, name);
    if (fs.existsSync(full)) files.push(full);
  }
  for (const full of walk(path.join(repoRoot, '.agents', 'skills'), (p) => p.toLowerCase().endsWith('.md'))) {
    if (!EXCLUDED_MD.test(path.relative(repoRoot, full))) files.push(full);
  }
  for (const full of walk(path.join(repoRoot, 'docs'), (p) => p.toLowerCase().endsWith('.md'))) files.push(full);
  const ciPrompt = path.join(repoRoot, '.github', 'agentic-code-reviewers-prompt.md');
  if (fs.existsSync(ciPrompt)) files.push(ciPrompt);
  return files;
}

function stripFences(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let fenced = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      out.push('');
      continue;
    }
    out.push(fenced ? '' : line);
  }
  return out.join('\n');
}

function expandTokenTarget(target) {
  let expanded = target;
  for (const [token, value] of Object.entries(TOKENS)) expanded = expanded.split(token).join(value);
  return expanded;
}

function hasDeclaredToken(target) {
  return Object.keys(TOKENS).some((token) => target.includes(token));
}

function analyze(repoRoot) {
  const brokenLinks = [];
  const absolutePaths = [];
  const tokenInLinkTargets = [];
  const shorthand = [];
  const linkRe = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  for (const file of collectFiles(repoRoot)) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
    const raw = fs.readFileSync(file, 'utf8');
    const text = stripFences(raw);
    linkRe.lastIndex = 0;
    let match;
    while ((match = linkRe.exec(text))) {
      let target = match[1];
      if (/^(https?:|mailto:|tel:)/i.test(target) || target.startsWith('#')) continue;
      if (target.startsWith('<') && target.endsWith('>')) continue;
      target = target.split('#')[0].split('?')[0];
      if (!target || target === '.') continue;
      if (/[A-Za-z]:[\\/]/.test(target)) {
        if (!target.includes('...')) absolutePaths.push({ file: rel, target, how: 'link' });
        continue;
      }
      if (hasDeclaredToken(target)) {
        tokenInLinkTargets.push({ file: rel, target });
        const expanded = expandTokenTarget(target);
        if (!fs.existsSync(path.join(repoRoot, expanded))) {
          brokenLinks.push({ file: rel, target, how: 'token-expanded-from-root' });
        }
        continue;
      }
      if (/\{[^}]*\}/.test(target)) continue;
      let decoded;
      try {
        decoded = decodeURIComponent(target);
      } catch {
        decoded = target;
      }
      const fromDir = path.resolve(path.dirname(file), decoded);
      const firstSegment = decoded.split(/[\\/]/)[0];
      const fromRoot = TOP_LEVEL.has(firstSegment) ? path.join(repoRoot, decoded) : null;
      if (!fs.existsSync(fromDir) && !(fromRoot && fs.existsSync(fromRoot))) {
        brokenLinks.push({ file: rel, target, how: fromRoot ? 'root-anchored+relative' : 'relative' });
      }
    }

    text.split(/\r?\n/).forEach((line, index) => {
      if (/^\s*```/.test(line)) return;
      if (/[A-Za-z]:\\(?:Users|source|dev|repos)/.test(line) && !line.includes('...')) {
        absolutePaths.push({ file: rel, line: index + 1, target: line.trim() });
      }
      if (/\b(bare|forbidden)\b|undeclared shorthand/i.test(line)) return;
      const shorthandRe = /(?<![\w./{(-])ws-shared\/[A-Za-z0-9_./-]+/g;
      let hit;
      while ((hit = shorthandRe.exec(line))) {
        const after = line.slice(hit.index + hit[0].length);
        if (/^`?\]\(/.test(after)) continue;
        shorthand.push({ file: rel, line: index + 1, target: hit[0] });
      }
    });
  }

  const skillsDir = path.join(repoRoot, '.agents', 'skills');
  const diskSkills = (fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir, { withFileTypes: true }) : [])
    .filter((entry) => entry.isDirectory() && entry.name !== 'ws-shared' && /^ws-/.test(entry.name))
    .filter((entry) => fs.existsSync(path.join(skillsDir, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
  const hubText = ['AGENTS.md', 'CATALOG.md', '.ws/AGENTS.md', '.ws/runtime/AGENTS.md', '.ws/runtime/CATALOG.md', '.ws/autoload.md', '.agents/skills/ws-shared/runtime/AGENTS.md', '.agents/skills/ws-shared/runtime/CATALOG.md']
    .map((rel) => {
      const full = path.join(repoRoot, rel);
      return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
    })
    .join('\n');
  const unrouted = diskSkills.filter((id) => !new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(hubText));

  const findings = { brokenLinks, absolutePaths, tokenInLinkTargets, shorthand, unrouted };
  const total = Object.values(findings).reduce((sum, rows) => sum + rows.length, 0);
  return { ok: total === 0, total, findings };
}

function main() {
  const argv = process.argv.slice(2);
  let json = false;
  let repoRoot = process.cwd();
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--json') json = true;
    else if (argv[index] === '--repo-root') repoRoot = argv[++index];
    else throw new Error(`unknown argument: ${argv[index]}`);
  }
  const report = analyze(path.resolve(repoRoot));
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (report.ok) {
    process.stdout.write('OK: harness links, paths, shorthand, and routing are clean\n');
  } else {
    for (const [kind, rows] of Object.entries(report.findings)) {
      for (const row of rows) process.stdout.write(`${kind}: ${row.file}${row.line ? `:${row.line}` : ''} ${row.target}\n`);
    }
  }
  process.exitCode = report.ok ? 0 : 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
