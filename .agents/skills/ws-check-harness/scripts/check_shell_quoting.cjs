#!/usr/bin/env node
/**
 * Static scan for nested-quote python -c / node -e recipes in skill trees.
 * Exit 1 when hits are found (critical for harness Phase 5a).
 *
 * Usage:
 *   node check_shell_quoting.cjs [--repo-root <path>] [--skills-root <rel>] [--json]
 */
'use strict';

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
  const candidates = [packaged];
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

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'memory',
  'evals',
  'CHANGELOG.md',
]);

const TEXT_EXT = new Set(['.md', '.py', '.js', '.cjs', '.mjs', '.sh', '.ps1', '.bash']);

function argsOf(argv) {
  const options = { repoRoot: null, skillsRoot: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') options.json = true;
    else if (a === '--repo-root') options.repoRoot = argv[++i];
    else if (a === '--skills-root') options.skillsRoot = argv[++i];
    else if (a === '--help' || a === '-h') options.help = true;
    else throw new Error('unknown argument: ' + a);
  }
  return options;
}

function walk(dir, out) {
  out = out || [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(ent.name)) continue;
    if (ent.name === 'CHANGELOG.md') continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(abs, out);
      continue;
    }
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (!TEXT_EXT.has(ext)) continue;
    out.push(abs);
  }
  return out;
}

/**
 * Detect fragile nested-quote -c/-e recipes.
 * Outer shell quotes are stripped from the payload (trailing matching closer only),
 * so safe recipes like python -c with a single-quoted outer wrapper around
 * double-quoted JS/Python strings are not flagged.
 * Flags: (1) both-quote character classes like ["']; (2) python -c payloads mixing " and '.
 */
function scanLine(line) {
  const inv = line.match(/\b(?:python(?:3)?\s+-c|node\s+(?:-e|--eval))\s+(["'`])(.*)$/i);
  if (!inv) return null;
  const opener = inv[1];
  let payload = inv[2];
  if (payload.endsWith(opener)) payload = payload.slice(0, -1);
  if (/\[["'`]/.test(payload)) {
    return 'nested-quote-character-class-in-dash-c';
  }
  if (
    /\bpython(?:3)?\s+-c\b/i.test(line) &&
    payload.indexOf('"') !== -1 &&
    payload.indexOf("'") !== -1
  ) {
    return 'mixed-quotes-in-python-dash-c-payload';
  }
  return null;
}

function hasUnclosedDashCQuote(line) {
  const m = line.match(/\b(?:python(?:3)?\s+-c|node\s+(?:-e|--eval))\s+(["'`])/i);
  if (!m) return false;
  const opener = m[1];
  const after = line.slice(m.index + m[0].length);
  return after.indexOf(opener) === -1;
}

function scanFile(abs, repoRoot) {
  const text = fs.readFileSync(abs, 'utf8');
  const rel = path.relative(repoRoot, abs).replace(/\\/g, '/');
  const hits = [];
  const rawLines = text.split(/\r?\n/);
  for (let i = 0; i < rawLines.length; i += 1) {
    let line = rawLines[i];
    const startLine = i + 1;
    while (hasUnclosedDashCQuote(line) && i + 1 < rawLines.length) {
      i += 1;
      line += '\n' + rawLines[i];
    }
    const reason = scanLine(line);
    if (!reason) continue;
    hits.push({
      file: rel,
      line: startLine,
      reason: reason,
      excerpt: line.trim().slice(0, 200),
    });
  }
  return hits;
}

function main() {
  const options = argsOf(process.argv.slice(2));
  if (options.help) {
    console.log(
      'Usage: node check_shell_quoting.cjs [--repo-root <path>] [--skills-root <rel>] [--json]',
    );
    process.exit(0);
  }

  const context = resolveConsumerContext({
    repoRoot: options.repoRoot || undefined,
    scriptFile: __filename,
  });
  const repoRoot = context.repoRoot;
  const skillsRootRel =
    options.skillsRoot ||
    (context.pathTokens && context.pathTokens.skillsRoot) ||
    '.agents/skills';
  const skillsAbs = path.resolve(repoRoot, skillsRootRel);

  const files = walk(skillsAbs);
  const findings = [];
  for (let i = 0; i < files.length; i += 1) {
    const more = scanFile(files[i], repoRoot);
    for (let j = 0; j < more.length; j += 1) findings.push(more[j]);
  }

  const payload = {
    ok: findings.length === 0,
    skillsRoot: skillsRootRel.replace(/\\/g, '/'),
    filesScanned: files.length,
    findingCount: findings.length,
    findings: findings,
    remediation:
      'Replace nested-quote python -c / node -e recipes with a permanent script file + explicit launcher (CROSS-PLATFORM.md). For YAML frontmatter fields use ws-shared/runtime/scripts/extract_frontmatter_field.cjs.',
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else if (findings.length === 0) {
    console.log(
      'check_shell_quoting: OK (' + files.length + ' files under ' + payload.skillsRoot + ')',
    );
  } else {
    console.error(
      'check_shell_quoting: ' +
        findings.length +
        ' nested-quote dash-c hit(s) under ' +
        payload.skillsRoot,
    );
    for (let i = 0; i < findings.length; i += 1) {
      const f = findings[i];
      console.error('  ' + f.file + ':' + f.line + ' [' + f.reason + '] ' + f.excerpt);
    }
    console.error(payload.remediation);
  }

  process.exit(findings.length === 0 ? 0 : 1);
}

main();
