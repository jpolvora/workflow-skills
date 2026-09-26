#!/usr/bin/env node
'use strict';

// check_skill_load.cjs — Phase 5a gate: no divergent raw skill-load recipes.
//
// Shipped skill bodies must load other skills through {skillLoader} per the
// canonical skill-load procedure in
// ws-shared/runtime/host-capability-tokens.md — never via a restated raw
// Read-the-SKILL.md recipe. Fails closed on:
//
//   F1  `Read` + SKILL.md on the same line (raw Read recipe), unless every
//       SKILL.md mention sits inside a Markdown link target (informational
//       cross-link: WHICH skill, not HOW to load).
//   F2  `Read {skillsRoot}/ws-…` on the same line (raw path recipe).
//   F3  `load {skillsRoot}/ws-……SKILL.md` on the same line (raw load-by-path).
//
// Pass: the canonical doc itself, Markdown cross-links, `do not load`
// prohibitions, already-loaded shorthand without raw paths, and bodies that
// delegate via {skillLoader}. Scope: ws-*/**/*.md under the skills scan root —
// upstream wins: when the local install carries ws-*/SKILL.md evidence, only
// the local tree is scanned (a machine-global tree is a managed consumer copy,
// never merged); otherwise the resolved skills root (consumer/global fallback).
//
// Usage: node check_skill_load.cjs [--json] [--repo-root <dir>]

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
const { resolveConsumerContext, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const CANONICAL_BASENAME = 'host-capability-tokens.md';

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

function skillDocFiles(skillsRoot) {
  const out = [];
  let top;
  try {
    top = fs.readdirSync(skillsRoot, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of top) {
    if (!entry.isDirectory() || !entry.name.startsWith('ws-')) continue;
    const base = path.join(skillsRoot, entry.name);
    const stack = [base];
    while (stack.length) {
      const dir = stack.pop();
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const child of entries) {
        const full = path.join(dir, child.name);
        if (child.isDirectory()) {
          if (child.name === 'runs' || child.name === '.runtime') continue;
          stack.push(full);
        } else if (child.isFile() && child.name.endsWith('.md')) {
          if (child.name === CANONICAL_BASENAME) continue;
          out.push(full);
        }
      }
    }
  }
  return out.sort();
}

// Strip Markdown link targets so informational cross-links
// ([label](…SKILL.md)) never read as load recipes.
function withoutLinkTargets(line) {
  return String(line).replace(/\]\([^)]*\)/g, ']');
}

function checkLine(line) {
  const findings = [];
  const bare = withoutLinkTargets(line);
  // Documented pass: a `do not load` prohibition is not a load recipe.
  if (/do not load/i.test(bare)) return findings;
  if (bare.includes('`Read`') && bare.includes('SKILL.md')) {
    findings.push('F1');
  }
  if (/Read \{skillsRoot\}\/ws-/.test(bare)) {
    findings.push('F2');
  }
  if (/\bload\s+\{skillsRoot\}\/ws-/.test(bare) && bare.includes('SKILL.md')) {
    findings.push('F3');
  }
  return findings;
}

function hasSkillEvidence(root) {
  let top;
  try {
    top = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return false;
  }
  return top.some((entry) => entry.isDirectory() && entry.name.startsWith('ws-')
    && fs.existsSync(path.join(root, entry.name, 'SKILL.md')));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const localRoot = path.join(context.repoRoot, '.agents', 'skills');
  let roots = [localRoot];
  if (!hasSkillEvidence(localRoot) && context.skillsRoot && path.isAbsolute(String(context.skillsRoot))) {
    roots = [path.resolve(String(context.skillsRoot))];
  }
  const findings = [];
  let scanned = 0;
  for (const root of roots) {
    for (const file of skillDocFiles(root)) {
      scanned += 1;
      const text = fs.readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i += 1) {
        for (const pattern of checkLine(lines[i])) {
          findings.push({
            file: toRepoRelative(context.repoRoot, file, { allowOutside: true }),
            line: i + 1,
            pattern,
            text: lines[i].trim().slice(0, 160),
          });
        }
      }
    }
  }
  const payload = { ok: findings.length === 0, scanned, findings };
  if (options.json) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else if (payload.ok) process.stdout.write(`check_skill_load: OK (${scanned} skill docs)\n`);
  else {
    for (const f of findings) {
      process.stderr.write(`check_skill_load: ${f.file}:${f.line} [${f.pattern}] ${f.text}\n`);
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
