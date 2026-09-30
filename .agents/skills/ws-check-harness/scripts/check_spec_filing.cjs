#!/usr/bin/env node
'use strict';

/**
 * Harness gate: index completion vs spec filing location (us-474, AC6).
 *
 * Flags any index.PRD row that marks a spec done while the spec of record
 * still resolves under pending/:
 *  - feature-map `- [x] ... (\`spec: pending/...\`)` bullets,
 *  - next-specs rows with a `` `[x]` `` status cell referencing a pending spec,
 *  - Done-log rows whose referenced spec resolves under pending/ on disk.
 *
 * Usage: node check_spec_filing.cjs [--json] [--repo-root <dir>]
 * Exit 1 with { ok: false, findings: [...] } when any finding exists.
 */

const fs = require('fs');
const path = require('path');

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

const STATUS_SUBFOLDERS = ['pending', 'completed', 'archived'];

function parseArgs(argv) {
  const out = { json: false, repoRoot: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') out.json = true;
    else if (arg === '--repo-root') out.repoRoot = argv[++i];
    else if (arg.startsWith('--repo-root=')) out.repoRoot = arg.slice('--repo-root='.length);
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: check_spec_filing.cjs [--json] [--repo-root <dir>]');
      process.exit(0);
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return out;
}

function refUnderPending(line) {
  const m = line.match(/`spec:\s*([^`]+)`/);
  if (!m) return null;
  const ref = String(m[1]).trim();
  return /(^|\/)pending\//.test(ref) ? ref : null;
}

function pendingSpecOnDisk(specsDir, slug) {
  if (!slug) return null;
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const dir = path.join(specsDir, 'pending');
  const prefixedRe = new RegExp('^(?:\\d{4}-)?' + esc + '\\.spec\\.md$');
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return null;
  }
  const hit = names.find((name) => prefixedRe.test(name));
  return hit ? `pending/${hit}` : null;
}

function slugFromLine(line) {
  const spec = line.match(/`spec:\s*(?:[A-Za-z0-9._-]+\/)*(?:\d{4}-)?([A-Za-z0-9][A-Za-z0-9._-]*)\.spec\.md`/);
  if (spec) return spec[1];
  const cell = line.match(/\|\s*`([A-Za-z0-9][A-Za-z0-9._-]*)`\s*\|/);
  if (cell) return cell[1];
  return null;
}

function check(repoRoot) {
  const context = resolveConsumerContext({ repoRoot, scriptFile: __filename });
  const plans = (context.config && context.config.plans) || {};
  const specsDir = path.resolve(context.repoRoot, plans.specsDir || '.agents/specs');
  const indexPath = path.join(specsDir, 'index.PRD');
  const findings = [];
  if (!fs.existsSync(indexPath)) return { ok: true, findings, skillsScanRoots: [] };

  const lines = fs.readFileSync(indexPath, 'utf8').split(/\r?\n/);
  let section = '';
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      section = heading[1].toLowerCase();
      continue;
    }
    const inDoneLog = section.includes('done log') || section.includes('delivery archive');
    const markedDone = inDoneLog || /^-\s*\[x\]/i.test(line.trim()) || /\|\s*`\[x\]`/i.test(line);
    if (!markedDone) continue;

    const ref = refUnderPending(line);
    if (ref && (/^-\s*\[x\]/i.test(line.trim()) || /\|\s*`\[x\]`/i.test(line))) {
      findings.push({ line: i + 1, kind: 'index-ref-pending', ref, message: `index marks done but spec: ref points under pending/: ${ref}` });
      continue;
    }
    if (inDoneLog) {
      const slug = slugFromLine(line);
      const pending = slug ? pendingSpecOnDisk(specsDir, slug) : null;
      if (pending) {
        findings.push({ line: i + 1, kind: 'done-log-pending', slug, path: pending, message: `Done-log entry "${slug}" resolves under ${pending}` });
      }
    }
  }
  return { ok: findings.length === 0, findings, specsIndex: path.relative(context.repoRoot, indexPath).split(path.sep).join('/') };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  let result;
  try {
    result = check(options.repoRoot);
  } catch (error) {
    result = { ok: false, error: error.message };
  }
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) main();

module.exports = { check, refUnderPending, slugFromLine, pendingSpecOnDisk };
