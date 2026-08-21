#!/usr/bin/env node
'use strict';

/**
 * List disposable workflow leftovers. Never deletes.
 * Usage:
 *   node list_disposable.cjs --repo-root <root> --plans-dir <rel-or-abs>
 *     [--scratch-only] [--slug <slug>] [--json]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveConsumerContext } = require('../../ws-shared/scripts/resolve_consumer_root.cjs');

function parseArgs(argv) {
  const opts = { scratchOnly: false, json: true, slug: null, repoRoot: null, plansDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--scratch-only') opts.scratchOnly = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--repo-root') opts.repoRoot = argv[++i];
    else if (a === '--plans-dir') opts.plansDir = argv[++i];
    else if (a === '--slug') opts.slug = argv[++i];
    else throw new Error(`unknown argument: ${a}`);
  }
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
    err: (r.stderr || '').replace(/\r\n/g, '\n').trim(),
  };
}

function isTracked(repo, relPosix) {
  const r = runGit(repo, ['ls-files', '--error-unmatch', '--', relPosix]);
  return r.code === 0;
}

function anyTrackedUnder(repo, absDir, repoRoot) {
  const rel = toPosix(path.relative(repoRoot, absDir));
  if (!rel || rel.startsWith('..')) return true;
  const r = runGit(repo, ['ls-files', '--', rel]);
  return r.code === 0 && r.out.length > 0;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function dirSize(abs) {
  let total = 0;
  if (!fs.existsSync(abs)) return 0;
  const st = fs.statSync(abs);
  if (st.isFile()) return st.size;
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      let s;
      try {
        s = fs.lstatSync(p);
      } catch {
        continue;
      }
      if (s.isDirectory()) walk(p);
      else if (s.isFile()) total += s.size;
    }
  };
  walk(abs);
  return total;
}

function readStateStatus(planDir) {
  let status = null;
  if (!fs.existsSync(planDir)) return status;
  for (const name of fs.readdirSync(planDir)) {
    if (!name.endsWith('.state.md')) continue;
    const text = fs.readFileSync(path.join(planDir, name), 'utf8');
    const m = text.match(/^status:\s*(\S+)/m);
    if (m) status = m[1].trim().toLowerCase();
  }
  return status;
}

function pushCandidate(list, item) {
  if (list.some((c) => c.path === item.path)) return;
  list.push(item);
}

function collectScratch(repoRoot, planAbs, plansRelPosix, candidates, skipped) {
  const relPlan = toPosix(path.relative(repoRoot, planAbs));

  const addPath = (abs, kind, reason) => {
    if (!fs.existsSync(abs)) return;
    const rel = toPosix(path.relative(repoRoot, abs));
    if (!rel || rel.startsWith('..')) {
      skipped.push({ path: rel || abs, reason: 'outside-enclosure' });
      return;
    }
    if (anyTrackedUnder(repoRoot, abs, repoRoot) || (fs.statSync(abs).isFile() && isTracked(repoRoot, rel))) {
      skipped.push({ path: rel, reason: 'tracked' });
      return;
    }
    pushCandidate(candidates, {
      path: rel,
      kind,
      reason,
      bytes: dirSize(abs),
      tracked: false,
    });
  };

  addPath(path.join(planAbs, 'telemetry'), 'scratch', 'plan telemetry');
  addPath(path.join(planAbs, '.runtime'), 'scratch', 'plan .runtime');

  if (!fs.existsSync(planAbs)) return;
  for (const name of fs.readdirSync(planAbs)) {
    const abs = path.join(planAbs, name);
    if (name.startsWith('.finding-') && name.endsWith('.json')) {
      addPath(abs, 'scratch', 'finding scratch');
    } else if (name.startsWith('.audit-session-') && name.endsWith('.json')) {
      addPath(abs, 'scratch', 'audit-session scratch');
    } else if (name.endsWith('.baseline') || name.endsWith('.baseline/')) {
      addPath(abs, 'scratch', 'baseline snapshot');
    } else if (/^step-03-.+\.plan\.exec\.md$/.test(name) || /^step-03-.+\.exec\.dag\.json$/.test(name)) {
      addPath(abs, 'scratch', 'exec dump');
    } else if (/^step-00-.+\.issue\.json$/.test(name)) {
      addPath(abs, 'scratch', 'issue fetch temp');
    } else if (fs.statSync(abs).isDirectory() && name.endsWith('.baseline')) {
      addPath(abs, 'scratch', 'baseline snapshot');
    }
  }

  // workflow-id.baseline directories
  for (const name of fs.readdirSync(planAbs)) {
    const abs = path.join(planAbs, name);
    try {
      if (fs.statSync(abs).isDirectory() && /\.baseline$/i.test(name)) {
        addPath(abs, 'scratch', 'baseline snapshot');
      }
    } catch {
      /* ignore */
    }
  }

  void relPlan;
  void plansRelPosix;
}

function readGitignore(repoRoot) {
  const p = path.join(repoRoot, '.gitignore');
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8');
}

function patternCovered(gitignoreText, pattern) {
  const lines = gitignoreText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  return lines.some((l) => l === pattern || l === pattern.replace(/\/$/, '') || l === `/${pattern}`);
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
  const plansDirRel =
    opts.plansDir ||
    (config.plans && config.plans.dir) ||
    '.agents/plans';
  const plansAbs = path.isAbsolute(plansDirRel)
    ? plansDirRel
    : path.join(repoRoot, plansDirRel);
  const plansPosix = toPosix(path.relative(repoRoot, plansAbs)) || toPosix(plansDirRel);

  const candidates = [];
  const skipped = [];

  if (!fs.existsSync(plansAbs)) {
    const out = {
      ok: true,
      repoRoot,
      plansDir: plansPosix,
      candidates: [],
      skipped: [{ path: plansPosix, reason: 'plans-dir-missing' }],
      gitignoreSuggestions: [],
    };
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    return;
  }

  // Cross-plan telemetry aggregate
  const agg = path.join(plansAbs, 'telemetry');
  if (fs.existsSync(agg)) {
    if (anyTrackedUnder(repoRoot, agg, repoRoot)) {
      skipped.push({ path: `${plansPosix}/telemetry`, reason: 'tracked' });
    } else {
      pushCandidate(candidates, {
        path: `${plansPosix}/telemetry`,
        kind: 'scratch',
        reason: 'aggregate telemetry',
        bytes: dirSize(agg),
        tracked: false,
      });
    }
  }

  const entries = fs.readdirSync(plansAbs).filter((n) => {
    if (opts.slug) return n === opts.slug || n === `${opts.slug}.archive`;
    return true;
  });

  for (const name of entries) {
    if (name === 'telemetry') continue;
    const abs = path.join(plansAbs, name);
    let st;
    try {
      st = fs.statSync(abs);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;

    collectScratch(repoRoot, abs, plansPosix, candidates, skipped);

    if (opts.scratchOnly) continue;

    const status = readStateStatus(abs);
    const isArchive = /\.archive$/i.test(name);
    const shipped =
      isArchive || status === 'completed' || status === 'cancelled' || status === 'failed';
    if (!shipped) {
      if (status === 'active' || status === 'paused') {
        skipped.push({
          path: `${plansPosix}/${name}`,
          reason: `active-workflow:${status || 'unknown'}`,
        });
      }
      continue;
    }
    if (anyTrackedUnder(repoRoot, abs, repoRoot)) {
      skipped.push({ path: `${plansPosix}/${name}`, reason: 'tracked' });
      continue;
    }
    pushCandidate(candidates, {
      path: `${plansPosix}/${name}`,
      kind: 'shipped-plan',
      reason: isArchive ? 'archive folder' : `status:${status}`,
      bytes: dirSize(abs),
      tracked: false,
    });
  }

  // Repo-root temps
  for (const name of fs.readdirSync(repoRoot)) {
    if (name.startsWith('.tmp-') || /\.bak_/i.test(name)) {
      const abs = path.join(repoRoot, name);
      if (anyTrackedUnder(repoRoot, abs, repoRoot)) {
        skipped.push({ path: name, reason: 'tracked' });
        continue;
      }
      pushCandidate(candidates, {
        path: name,
        kind: 'temp-root',
        reason: name.startsWith('.tmp-') ? 'tmp dir' : 'bak leftover',
        bytes: dirSize(abs),
        tracked: false,
      });
    }
  }

  // Prefer shipped-plan roots over nested scratch under the same folder.
  const shippedRoots = candidates.filter((c) => c.kind === 'shipped-plan').map((c) => c.path);
  const deduped = candidates.filter((c) => {
    if (c.kind === 'shipped-plan') return true;
    return !shippedRoots.some((root) => c.path === root || c.path.startsWith(`${root}/`));
  });

  const gi = readGitignore(repoRoot);
  const suggestPatterns = [
    `${plansPosix}/**/telemetry/`,
    `${plansPosix}/**/.runtime/`,
    `${plansPosix}/**/.finding-*.json`,
    `${plansPosix}/**/.audit-session-*.json`,
    `${plansPosix}/**/*.baseline/`,
    '.tmp-*/',
  ];
  const gitignoreSuggestions = suggestPatterns.map((pattern) => ({
    pattern,
    reason: 'workflow disposable pattern',
    alreadyIgnored: patternCovered(gi, pattern),
  }));

  const out = {
    ok: true,
    repoRoot,
    plansDir: plansPosix,
    scratchOnly: opts.scratchOnly,
    slug: opts.slug,
    candidates: deduped,
    skipped,
    gitignoreSuggestions,
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`${err && err.message ? err.message : String(err)}\n`);
  process.exit(1);
}
