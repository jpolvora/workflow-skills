#!/usr/bin/env node
'use strict';

/**
 * Delete approved disposable paths after user confirm.
 * Usage:
 *   node apply_cleanup.cjs --repo-root <root> --confirm --paths-file <json>
 *
 * paths-file JSON: { "paths": ["relative/posix", ...] } or a bare string array.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveConsumerContext } = require('../../ws-shared/scripts/resolve_consumer_root.cjs');

function parseArgs(argv) {
  const opts = { confirm: false, repoRoot: null, pathsFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--confirm') opts.confirm = true;
    else if (a === '--repo-root') opts.repoRoot = argv[++i];
    else if (a === '--paths-file') opts.pathsFile = argv[++i];
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!opts.confirm) throw new Error('refusing to delete without --confirm');
  if (!opts.pathsFile) throw new Error('--paths-file is required');
  return opts;
}

function runGit(repo, args) {
  const r = spawnSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C' },
  });
  return {
    code: r.status == null ? 1 : r.status,
    out: (r.stdout || '').replace(/\r\n/g, '\n').trim(),
  };
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function anyTrackedUnder(repo, absPath, repoRoot) {
  const rel = toPosix(path.relative(repoRoot, absPath));
  if (!rel || rel.startsWith('..')) return true;
  const r = runGit(repo, ['ls-files', '--', rel]);
  return r.code === 0 && r.out.length > 0;
}

function loadPaths(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.paths)) return raw.paths;
  throw new Error('paths-file must be a JSON array or { "paths": [...] }');
}

function isAllowedEnclosure(relPosix, plansDirPosix) {
  if (!relPosix || relPosix.startsWith('..') || path.isAbsolute(relPosix)) return false;
  if (relPosix.startsWith('.tmp-') || /\.bak_/i.test(relPosix.split('/')[0])) return true;
  if (plansDirPosix && (relPosix === plansDirPosix || relPosix.startsWith(`${plansDirPosix}/`))) {
    return true;
  }
  return false;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const ctx = resolveConsumerContext({
    repoRoot: opts.repoRoot,
    scriptFile: __filename,
    skillId: 'ws-cleanup',
  });
  const repoRoot = ctx.repoRoot;
  const config = ctx.config || {};
  const plansDirRel = (config.plans && config.plans.dir) || '.agents/plans';
  const plansAbs = path.isAbsolute(plansDirRel)
    ? plansDirRel
    : path.join(repoRoot, plansDirRel);
  const plansPosix = toPosix(path.relative(repoRoot, plansAbs)) || toPosix(plansDirRel);

  const forbiddenPrefixes = [
    toPosix(path.join('.agents', 'skills')),
    'src/',
    'bin/',
    'test/',
    'docs/',
  ];

  const paths = loadPaths(opts.pathsFile);
  const deleted = [];
  const skipped = [];

  for (const relRaw of paths) {
    const rel = toPosix(String(relRaw).replace(/\\/g, '/'));
    if (!isAllowedEnclosure(rel, plansPosix)) {
      skipped.push({ path: rel, reason: 'outside-enclosure' });
      continue;
    }
    if (forbiddenPrefixes.some((p) => rel === p.replace(/\/$/, '') || rel.startsWith(p))) {
      // allow .agents/plans under .agents/ but not .agents/skills
      if (rel.startsWith('.agents/skills')) {
        skipped.push({ path: rel, reason: 'skill-body' });
        continue;
      }
      if (!rel.startsWith(`${plansPosix}/`) && rel !== plansPosix && !rel.startsWith('.agents/plans')) {
        if (rel.startsWith('src/') || rel.startsWith('bin/') || rel.startsWith('test/') || rel.startsWith('docs/')) {
          skipped.push({ path: rel, reason: 'product-tree' });
          continue;
        }
      }
    }
    const abs = path.join(repoRoot, ...rel.split('/'));
    if (!fs.existsSync(abs)) {
      skipped.push({ path: rel, reason: 'missing' });
      continue;
    }
    if (anyTrackedUnder(repoRoot, abs, repoRoot)) {
      skipped.push({ path: rel, reason: 'tracked' });
      continue;
    }
    try {
      fs.rmSync(abs, { recursive: true, force: true });
      deleted.push(rel);
    } catch (err) {
      skipped.push({ path: rel, reason: `error:${err.message}` });
    }
  }

  const out = { ok: true, deleted, skipped };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  if (skipped.some((s) => s.reason.startsWith('error:'))) process.exit(2);
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err && err.message ? err.message : String(err)}\n`);
  process.exit(1);
}
