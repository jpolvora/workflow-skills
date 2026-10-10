#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
// Managed runtime loads from its skills installation: the project-local
// skills tree ({skillsRoot}/ws-shared) or the global skills tree
// ({globalSkillsRoot}/ws-shared, override via WORKFLOW_SKILLS_GLOBAL_DIR).
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
const {
  resolveConsumerContext,
  inside,
  consumerHubExists,
} = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const TOP_LEVEL = new Set(['.agents', '.github', 'bin', 'docs', 'scripts', 'specs', 'test']);
// Hub-root binding/routing files, per the hub layout manifest
// ({skillsRoot}/ws-shared/runtime/hub-layout.json -> consumerOwned + generatedLocal
// hub-root paths). Only these can ever be classified as an install-layout note:
// a managed runtime contract file (for example host-capability-tokens.md) is not a
// hub binding file, so an unrewritten runtime sibling always stays a broken link.
const HUB_BINDING_FILES = new Set(['AGENTS.md', 'autoload.md', 'config.json', 'STACK.md']);
const TOKENS = {
  '{skillsRoot}': '.agents/skills',
  '{sharedDir}': '.ws',
  '{plansDir}': '.agents/plans',
  '{reviewsDir}': '.agents/codereviews',
  '{memoryDir}': '.',
  '{specsDir}': '.agents/specs',
  '{wikiDir}': '.agents/specs/wiki',
};
const EXCLUDED_MD = /(^|[\\/])(CHANGELOG\.md|MEMORY\.md|memory[\\/]|evals[\\/]|ws-fix-pr[\\/]runs[\\/])/;
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

// Package membership: only this package's own directories are audited. A
// shared global skills root may also hold unrelated user skills; their
// markdown is not shipped package content and must not produce link findings.
// Explicitly external ws-* companions (bin/skill-dependencies.json
// externalSkills, e.g. ws-memo) are also excluded.
function externalSkillIds(repoRoot) {
  try {
    const manifest = path.join(path.resolve(repoRoot || process.cwd()), 'bin', 'skill-dependencies.json');
    const parsed = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    const ids = (parsed.externalSkills || []).map((entry) => entry.id).filter(Boolean);
    if (ids.length) return new Set(ids);
  } catch {
    // Fall through to the known-external fallback below.
  }
  return new Set(['ws-memo', 'ws-session-tracking']);
}

function packageRoots(dir, repoRoot) {
  if (!fs.existsSync(dir)) return [];
  const external = externalSkillIds(repoRoot);
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && (entry.name === 'ws-shared' || (entry.name.startsWith('ws-') && !external.has(entry.name))))
    .map((entry) => path.join(dir, entry.name));
}

function collectFiles(repoRoot, skillsRoot) {
  const files = [];
  for (const name of ROOT_DOCS) {
    const full = path.join(repoRoot, name);
    if (fs.existsSync(full)) files.push(full);
  }
  const localSkills = path.resolve(repoRoot, '.agents', 'skills');
  for (const skillDir of new Set([localSkills, skillsRoot].filter(Boolean))) {
    for (const root of packageRoots(skillDir, repoRoot)) {
      for (const full of walk(root, (p) => p.toLowerCase().endsWith('.md'))) {
        if (!EXCLUDED_MD.test(path.relative(repoRoot, full))) files.push(full);
      }
    }
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

function tokenTargets(repoRoot, skillsRoot) {
  const skillsRel = path.relative(repoRoot, skillsRoot).replace(/\\/g, '/') || '.agents/skills';
  return { ...TOKENS, '{skillsRoot}': skillsRel };
}

function expandTokenTarget(target, tokens) {
  let expanded = target;
  for (const [token, value] of Object.entries(tokens)) expanded = expanded.split(token).join(value);
  return expanded;
}

function hasDeclaredToken(target, tokens) {
  return Object.keys(tokens).some((token) => target.includes(token));
}

// Depth-1 hub binding literal: the resolved target is contained in one of the
// resolved hub directories, sits directly inside it, and names a hub binding
// file. Classification never inspects link text, so a `.ws/...` or
// `ws-shared/...` prefix earns nothing on its own.
function hubBindingClass(candidates, hubs) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    for (const hub of hubs) {
      if (!inside(candidate, hub)) continue;
      const relative = path.relative(hub, candidate);
      if (!relative || relative.includes(path.sep) || relative.includes('/')) continue;
      if (!HUB_BINDING_FILES.has(relative)) continue;
      return hub;
    }
  }
  return null;
}

function analyze(repoRoot) {
  const context = resolveConsumerContext({ repoRoot, scriptFile: __filename });
  const skillsRoot = context.skillsRoot && path.isAbsolute(String(context.skillsRoot))
    ? String(context.skillsRoot)
    : path.resolve(repoRoot, '.agents', 'skills');
  const tokens = tokenTargets(repoRoot, skillsRoot);
  const skillsRel = tokens['{skillsRoot}'];
  // Resolved hub directories (contract: PHASES.md § Hub resolution details). Both
  // are derived from the resolved consumer context; the project hub is never
  // assumed to be the literal `.ws` path.
  const projectHub = path.resolve(String(context.sharedDir || path.join(repoRoot, '.ws')));
  const skillsHub = path.join(skillsRoot, 'ws-shared');
  const hubDirs = [...new Set([projectHub, skillsHub])];
  const projectHubPresent = consumerHubExists(repoRoot);
  // Tolerance window (AC12/AC24): global install scope with the project hub absent.
  // The value is consumed as published; this gate adds no scope detection of its own.
  const tolerateHubLiterals = String(context.executionScope || '') === 'global' && !projectHubPresent;
  const installLayoutNotes = [];
  const warnings = [];
  if (!projectHubPresent) {
    warnings.push({
      code: 'project-hub-absent',
      message: `${path.relative(repoRoot, projectHub).replace(/\\/g, '/') || '.'} is absent; run ws-configure-project to create the consumer hub (install-layout only, not a broken link)`,
    });
  }
  const brokenLinks = [];
  const absolutePaths = [];
  const tokenInLinkTargets = [];
  const shorthand = [];
  const linkRe = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  for (const file of collectFiles(repoRoot, skillsRoot)) {
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
      if (hasDeclaredToken(target, tokens)) {
        tokenInLinkTargets.push({ file: rel, target });
        const expanded = expandTokenTarget(target, tokens);
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
        const hub = tolerateHubLiterals ? hubBindingClass([fromRoot, fromDir], hubDirs) : null;
        if (hub) {
          installLayoutNotes.push({
            file: rel,
            target,
            hub: path.relative(repoRoot, hub).replace(/\\/g, '/') || '.',
            how: 'hub-binding-literal',
            remediation: 'ws-configure-project',
          });
        } else {
          brokenLinks.push({ file: rel, target, how: fromRoot ? 'root-anchored+relative' : 'relative' });
        }
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

  const skillsDir = skillsRoot;
  const externalForRouting = externalSkillIds(repoRoot);
  const diskSkills = (fs.existsSync(skillsDir) ? fs.readdirSync(skillsDir, { withFileTypes: true }) : [])
    .filter((entry) => entry.isDirectory() && entry.name !== 'ws-shared' && /^ws-/.test(entry.name) && !externalForRouting.has(entry.name))
    .filter((entry) => fs.existsSync(path.join(skillsDir, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
  const hubText = ['AGENTS.md', 'CATALOG.md', '.ws/AGENTS.md', '.ws/autoload.md',
    path.join(skillsRel, 'ws-shared/runtime/AGENTS.md'),
    path.join(skillsRel, 'ws-shared/runtime/CATALOG.md')]
    .map((rel) => {
      const full = path.join(repoRoot, rel);
      return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
    })
    .join('\n');
  const unrouted = diskSkills.filter((id) => !new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(hubText));

  const findings = { brokenLinks, absolutePaths, tokenInLinkTargets, shorthand, unrouted };
  // installLayoutNotes and warnings stay outside `findings`: they never count
  // toward total/ok (they are install-layout diagnostics, not gate failures).
  const total = Object.values(findings).reduce((sum, rows) => sum + rows.length, 0);
  return { ok: total === 0, total, findings, installLayoutNotes, warnings };
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
    for (const row of report.installLayoutNotes || []) {
      process.stdout.write(`installLayoutNote: ${row.file} ${row.target} (hub binding literal; ${row.remediation})\n`);
    }
    for (const row of report.warnings || []) {
      process.stdout.write(`warning: ${row.code} ${row.message}\n`);
    }
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
