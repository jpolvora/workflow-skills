#!/usr/bin/env node
'use strict';

/**
 * Cooperative session leases + short git critical-section lock.
 *
 *   node session_lease.cjs resolve [--config path]
 *   node session_lease.cjs acquire --slug <slug> [--lease-id id] [--workflow-id id] [--label text] [--plans-dir path] [--worktree path]
 *   node session_lease.cjs heartbeat --lease-id <id> [--plans-dir path]
 *   node session_lease.cjs prune [--plans-dir path]
 *   node session_lease.cjs release --lease-id <id> [--status completed|cancelled|failed] [--plans-dir path]
 *   node session_lease.cjs git-lock [--wait-ms 60000] [--ttl-ms 120000] [--holder id] [--plans-dir path]
 *   node session_lease.cjs git-unlock [--holder id] [--force] [--plans-dir path]
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  resolveConsumerContext,
  resolveConfiguredPath,
} = require('../../ws-shared/scripts/resolve_consumer_root.cjs');

const LEASE_TTL_MS = 15 * 60 * 1000;
const GIT_LOCK_TTL_MS = 2 * 60 * 1000;
const GIT_LOCK_WAIT_MS = 60 * 1000;
const GIT_LOCK_POLL_MS = 100;
const LIVE_STATUSES = new Set(['active', 'paused']);
const RELEASE_STATUSES = new Set(['completed', 'cancelled', 'failed']);

function usage(message) {
  if (message) console.error(message);
  console.error(`Usage:
  node session_lease.cjs resolve [--config <path>]
  node session_lease.cjs acquire --slug <slug> [--lease-id <id>] [--workflow-id <id>] [--label <text>] [--plans-dir <path>] [--worktree <path>]
  node session_lease.cjs heartbeat --lease-id <id> [--plans-dir <path>]
  node session_lease.cjs prune [--plans-dir <path>]
  node session_lease.cjs release --lease-id <id> [--status completed|cancelled|failed] [--plans-dir <path>]
  node session_lease.cjs git-lock [--wait-ms 60000] [--ttl-ms 120000] [--holder <id>] [--plans-dir <path>]
  node session_lease.cjs git-unlock [--holder <id>] [--force] [--plans-dir <path>]`);
  process.exit(message ? 2 : 0);
}

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) options[key] = true;
    else {
      options[key] = next;
      i += 1;
    }
  }
  return { command: positional[0], options };
}

function nowIso(ms = Date.now()) {
  return new Date(ms).toISOString();
}

function sleepSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* short busy-wait; no timer deps */
  }
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  const handle = fs.openSync(temporary, 'w');
  try {
    fs.writeFileSync(handle, content, 'utf8');
    try {
      fs.fsyncSync(handle);
    } catch (error) {
      if (!error || !['EPERM', 'EINVAL'].includes(error.code)) throw error;
    }
  } finally {
    fs.closeSync(handle);
  }
  fs.renameSync(temporary, file);
}

function exclusiveWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let handle;
  try {
    handle = fs.openSync(file, 'wx');
  } catch (error) {
    if (error && error.code === 'EEXIST') return false;
    throw error;
  }
  try {
    fs.writeFileSync(handle, content, 'utf8');
    try {
      fs.fsyncSync(handle);
    } catch (error) {
      if (!error || !['EPERM', 'EINVAL'].includes(error.code)) throw error;
    }
  } finally {
    fs.closeSync(handle);
  }
  return true;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function tryReadJson(file) {
  try {
    return readJson(file);
  } catch {
    return null;
  }
}

function sessionLeasesEnabled(config) {
  if (!config || typeof config !== 'object') return true;
  if (!config.defaults || !Object.prototype.hasOwnProperty.call(config.defaults, 'sessionLeases')) {
    return true;
  }
  return config.defaults.sessionLeases !== false;
}

function loadContext(options) {
  const context = resolveConsumerContext({
    repoRoot: options.repoRoot,
    scriptFile: __filename,
    skillId: 'ws-spec-to-pr',
  });
  if (options.config) {
    context.config = JSON.parse(fs.readFileSync(path.resolve(String(options.config)), 'utf8'));
  }
  return context;
}

function resolvePlansDir(context, options) {
  if (options.plansDir) return path.resolve(String(options.plansDir));
  const configured = context.config?.plans?.dir || '.agents/plans';
  return resolveConfiguredPath(context.repoRoot, configured, '.agents/plans');
}

function leasesDir(plansDir) {
  return path.join(plansDir, '.runtime', 'leases');
}

function leaseFile(plansDir, leaseId) {
  return path.join(leasesDir(plansDir), `${leaseId}.json`);
}

function slugLockFile(plansDir, slug) {
  return path.join(leasesDir(plansDir), `slug-${slug}.lock`);
}

function gitLockFile(plansDir) {
  return path.join(plansDir, '.runtime', 'git.lock');
}

function normalizeWorktree(value, repoRoot) {
  const absolute = path.resolve(value || repoRoot);
  const relative = path.relative(repoRoot, absolute).replace(/\\/g, '/');
  if (!relative || relative === '') return '.';
  if (relative.startsWith('..')) return absolute.replace(/\\/g, '/');
  return relative;
}

function sameWorktree(a, b) {
  return String(a || '').replace(/\\/g, '/') === String(b || '').replace(/\\/g, '/');
}

function isExpired(lease, at = Date.now()) {
  if (!lease?.expiresAt) return true;
  const ts = Date.parse(lease.expiresAt);
  return Number.isNaN(ts) || ts <= at;
}

function isLive(lease, at = Date.now()) {
  return Boolean(lease) && LIVE_STATUSES.has(lease.status) && !isExpired(lease, at);
}

function readSlugLock(plansDir, slug) {
  const file = slugLockFile(plansDir, slug);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8').trim();
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    return parsed.leaseId || null;
  } catch {
    return raw || null;
  }
}

function writeSlugLock(plansDir, slug, leaseId) {
  const file = slugLockFile(plansDir, slug);
  const body = `${JSON.stringify({ leaseId })}\n`;
  if (exclusiveWrite(file, body)) return true;
  return readSlugLock(plansDir, slug) === leaseId;
}

function forceWriteSlugLock(plansDir, slug, leaseId) {
  atomicWrite(slugLockFile(plansDir, slug), `${JSON.stringify({ leaseId })}\n`);
}

/** Ensure slug lock names leaseId; refuse to steal from a different live holder. */
function ensureSlugLock(plansDir, slug, leaseId) {
  if (writeSlugLock(plansDir, slug, leaseId)) return { ok: true };
  const holder = readSlugLock(plansDir, slug);
  const holderLease = holder ? tryReadJson(leaseFile(plansDir, holder)) : null;
  if (holder && holder !== leaseId && isLive(holderLease, Date.now())) {
    return {
      ok: false,
      conflict: 'same-slug',
      holderLeaseId: holder,
      holderStatus: holderLease?.status || 'unknown',
      holderExpiresAt: holderLease?.expiresAt,
      leaseId,
    };
  }
  forceWriteSlugLock(plansDir, slug, leaseId);
  return { ok: true };
}

function removeSlugLockIfHolder(plansDir, slug, leaseId) {
  const file = slugLockFile(plansDir, slug);
  if (!fs.existsSync(file)) return false;
  const holder = readSlugLock(plansDir, slug);
  if (holder && holder !== leaseId) return false;
  fs.unlinkSync(file);
  return true;
}

function listLeaseFiles(plansDir) {
  const dir = leasesDir(plansDir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(dir, name));
}

function stamp(lease, at = Date.now()) {
  lease.heartbeatAt = nowIso(at);
  lease.expiresAt = nowIso(at + LEASE_TTL_MS);
  lease.pid = process.pid;
  return lease;
}

function otherLiveSlugs(plansDir, worktreePath, exceptSlug) {
  const at = Date.now();
  const out = [];
  for (const file of listLeaseFiles(plansDir)) {
    const lease = tryReadJson(file);
    if (!isLive(lease, at)) continue;
    if (lease.slug === exceptSlug) continue;
    if (!sameWorktree(lease.worktreePath, worktreePath)) continue;
    out.push({
      slug: lease.slug,
      leaseId: lease.leaseId,
      status: lease.status,
      expiresAt: lease.expiresAt,
    });
  }
  return out;
}

function pruneInternal(plansDir) {
  const at = Date.now();
  const pruned = [];
  for (const file of listLeaseFiles(plansDir)) {
    const lease = tryReadJson(file);
    if (!lease) continue;
    if (isLive(lease, at)) continue;
    if (LIVE_STATUSES.has(lease.status)) {
      lease.status = 'stale';
      atomicWrite(file, `${JSON.stringify(lease, null, 2)}\n`);
    }
    const removed = removeSlugLockIfHolder(plansDir, lease.slug, lease.leaseId);
    pruned.push({
      leaseId: lease.leaseId,
      slug: lease.slug,
      status: lease.status,
      slugLockRemoved: removed,
    });
  }

  const dir = leasesDir(plansDir);
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      if (!name.startsWith('slug-') || !name.endsWith('.lock')) continue;
      const slug = name.slice('slug-'.length, -'.lock'.length);
      const holder = readSlugLock(plansDir, slug);
      const lease = holder ? tryReadJson(leaseFile(plansDir, holder)) : null;
      if (!isLive(lease, at)) {
        try {
          fs.unlinkSync(path.join(dir, name));
        } catch {
          /* ignore */
        }
        pruned.push({
          leaseId: holder || null,
          slug,
          status: lease?.status || 'missing',
          orphanLock: true,
        });
      }
    }
  }
  return pruned;
}

function cmdResolve(options) {
  const context = loadContext(options);
  console.log(JSON.stringify({ sessionLeases: sessionLeasesEnabled(context.config) }));
  return 0;
}

function cmdAcquire(options) {
  const slug = options.slug;
  if (!slug) usage('acquire requires --slug');

  const context = loadContext(options);
  if (!sessionLeasesEnabled(context.config)) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'sessionLeases=false' }));
    return 0;
  }

  const plansDir = resolvePlansDir(context, options);
  fs.mkdirSync(leasesDir(plansDir), { recursive: true });
  pruneInternal(plansDir);

  const leaseId = options.leaseId || crypto.randomUUID();
  const worktreePath = normalizeWorktree(options.worktree || context.repoRoot, context.repoRoot);
  const workflowId = options.workflowId || `pending-${slug}`;
  const at = Date.now();

  const existingLock = readSlugLock(plansDir, slug);
  if (existingLock && existingLock !== leaseId) {
    const holder = tryReadJson(leaseFile(plansDir, existingLock));
    if (isLive(holder, at)) {
      console.log(
        JSON.stringify({
          ok: false,
          conflict: 'same-slug',
          holderLeaseId: existingLock,
          holderStatus: holder.status,
          holderExpiresAt: holder.expiresAt,
          leaseId,
        }),
      );
      return 1;
    }
    removeSlugLockIfHolder(plansDir, slug, existingLock);
  }

  const file = leaseFile(plansDir, leaseId);
  if (fs.existsSync(file)) {
    const existing = readJson(file);
    if (existing.slug !== slug) {
      console.log(
        JSON.stringify({
          ok: false,
          conflict: 'lease-id-slug-mismatch',
          leaseId,
          existingSlug: existing.slug,
          requestedSlug: slug,
        }),
      );
      return 1;
    }
    stamp(existing, at);
    if (existing.status !== 'paused') existing.status = 'active';
    existing.worktreePath = worktreePath;
    if (options.label) existing.label = String(options.label);
    if (options.workflowId) existing.workflowId = String(options.workflowId);
    atomicWrite(file, `${JSON.stringify(existing, null, 2)}\n`);
    const lockResult = ensureSlugLock(plansDir, slug, leaseId);
    if (!lockResult.ok) {
      console.log(JSON.stringify(lockResult));
      return 1;
    }
    console.log(
      JSON.stringify({
        ok: true,
        refreshed: true,
        lease: existing,
        otherLiveSlugs: otherLiveSlugs(plansDir, worktreePath, slug),
      }),
    );
    return 0;
  }

  const lease = stamp(
    {
      leaseId,
      slug,
      workflowId,
      status: 'active',
      pid: process.pid,
      worktreePath,
      createdAt: nowIso(at),
    },
    at,
  );
  if (options.label) lease.label = String(options.label);

  if (!exclusiveWrite(file, `${JSON.stringify(lease, null, 2)}\n`)) {
    return cmdAcquire({ ...options, leaseId });
  }

  if (!writeSlugLock(plansDir, slug, leaseId)) {
    const holder = readSlugLock(plansDir, slug);
    const holderLease = holder ? tryReadJson(leaseFile(plansDir, holder)) : null;
    if (holder && holder !== leaseId && isLive(holderLease, Date.now())) {
      try {
        fs.unlinkSync(file);
      } catch {
        /* ignore */
      }
      console.log(
        JSON.stringify({
          ok: false,
          conflict: 'same-slug',
          holderLeaseId: holder,
          holderStatus: holderLease?.status || 'unknown',
          leaseId,
        }),
      );
      return 1;
    }
    forceWriteSlugLock(plansDir, slug, leaseId);
  }

  console.log(
    JSON.stringify({
      ok: true,
      created: true,
      lease,
      otherLiveSlugs: otherLiveSlugs(plansDir, worktreePath, slug),
    }),
  );
  return 0;
}

function cmdHeartbeat(options) {
  const leaseId = options.leaseId;
  if (!leaseId) usage('heartbeat requires --lease-id');
  const context = loadContext(options);
  const plansDir = resolvePlansDir(context, options);
  const file = leaseFile(plansDir, leaseId);
  if (!fs.existsSync(file)) {
    console.log(JSON.stringify({ ok: false, error: 'lease-not-found', leaseId }));
    return 1;
  }
  const lease = readJson(file);
  if (RELEASE_STATUSES.has(lease.status)) {
    console.log(JSON.stringify({ ok: false, error: 'lease-terminal', status: lease.status, leaseId }));
    return 1;
  }
  stamp(lease);
  if (lease.status === 'stale') lease.status = 'active';
  atomicWrite(file, `${JSON.stringify(lease, null, 2)}\n`);
  const lockResult = ensureSlugLock(plansDir, lease.slug, leaseId);
  if (!lockResult.ok) {
    console.log(JSON.stringify(lockResult));
    return 1;
  }
  console.log(JSON.stringify({ ok: true, lease }));
  return 0;
}

function cmdPrune(options) {
  const context = loadContext(options);
  const plansDir = resolvePlansDir(context, options);
  const pruned = pruneInternal(plansDir);
  console.log(JSON.stringify({ ok: true, pruned }));
  return 0;
}

function cmdRelease(options) {
  const leaseId = options.leaseId;
  if (!leaseId) usage('release requires --lease-id');
  const status = options.status || 'completed';
  if (!RELEASE_STATUSES.has(status)) usage('release --status must be completed|cancelled|failed');
  const context = loadContext(options);
  const plansDir = resolvePlansDir(context, options);
  const file = leaseFile(plansDir, leaseId);
  if (!fs.existsSync(file)) {
    console.log(JSON.stringify({ ok: false, error: 'lease-not-found', leaseId }));
    return 1;
  }
  const lease = readJson(file);
  lease.status = status;
  lease.heartbeatAt = nowIso();
  atomicWrite(file, `${JSON.stringify(lease, null, 2)}\n`);
  const removed = removeSlugLockIfHolder(plansDir, lease.slug, leaseId);
  console.log(JSON.stringify({ ok: true, lease, slugLockRemoved: removed }));
  return 0;
}

function readGitLock(plansDir) {
  const file = gitLockFile(plansDir);
  if (!fs.existsSync(file)) return null;
  return tryReadJson(file);
}

function gitLockExpired(lock, at = Date.now()) {
  if (!lock?.expiresAt) return true;
  const ts = Date.parse(lock.expiresAt);
  return Number.isNaN(ts) || ts <= at;
}

function cmdGitLock(options) {
  const context = loadContext(options);
  if (!sessionLeasesEnabled(context.config)) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'sessionLeases=false' }));
    return 0;
  }
  const plansDir = resolvePlansDir(context, options);
  fs.mkdirSync(path.dirname(gitLockFile(plansDir)), { recursive: true });
  const waitMs = Number(options.waitMs ?? GIT_LOCK_WAIT_MS);
  const ttlMs = Number(options.ttlMs ?? GIT_LOCK_TTL_MS);
  const holder = options.holder || `pid-${process.pid}`;
  const started = Date.now();

  while (Date.now() - started <= waitMs) {
    const existing = readGitLock(plansDir);
    if (existing && !gitLockExpired(existing)) {
      if (existing.holder === holder) {
        existing.expiresAt = nowIso(Date.now() + ttlMs);
        existing.heartbeatAt = nowIso();
        atomicWrite(gitLockFile(plansDir), `${JSON.stringify(existing, null, 2)}\n`);
        console.log(JSON.stringify({ ok: true, refreshed: true, lock: existing }));
        return 0;
      }
      sleepSync(GIT_LOCK_POLL_MS);
      continue;
    }
    if (existing && gitLockExpired(existing)) {
      try {
        fs.unlinkSync(gitLockFile(plansDir));
      } catch {
        /* race ok */
      }
    }
    const lock = {
      holder,
      pid: process.pid,
      createdAt: nowIso(),
      heartbeatAt: nowIso(),
      expiresAt: nowIso(Date.now() + ttlMs),
    };
    if (exclusiveWrite(gitLockFile(plansDir), `${JSON.stringify(lock, null, 2)}\n`)) {
      console.log(JSON.stringify({ ok: true, acquired: true, lock }));
      return 0;
    }
    sleepSync(GIT_LOCK_POLL_MS);
  }

  console.log(
    JSON.stringify({
      ok: false,
      conflict: 'git-lock-timeout',
      waitedMs: Date.now() - started,
      blockedBy: readGitLock(plansDir),
    }),
  );
  return 1;
}

function cmdGitUnlock(options) {
  const context = loadContext(options);
  const plansDir = resolvePlansDir(context, options);
  const file = gitLockFile(plansDir);
  if (!fs.existsSync(file)) {
    console.log(JSON.stringify({ ok: true, removed: false, reason: 'absent' }));
    return 0;
  }
  const lock = readGitLock(plansDir);
  if (!options.force && options.holder && lock && lock.holder !== options.holder) {
    console.log(JSON.stringify({ ok: false, error: 'holder-mismatch', lock }));
    return 1;
  }
  fs.unlinkSync(file);
  console.log(JSON.stringify({ ok: true, removed: true, lock }));
  return 0;
}

function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!command || options.help || options.h) usage();

  let code = 0;
  switch (command) {
    case 'resolve':
      code = cmdResolve(options);
      break;
    case 'acquire':
      code = cmdAcquire(options);
      break;
    case 'heartbeat':
      code = cmdHeartbeat(options);
      break;
    case 'prune':
      code = cmdPrune(options);
      break;
    case 'release':
      code = cmdRelease(options);
      break;
    case 'git-lock':
      code = cmdGitLock(options);
      break;
    case 'git-unlock':
      code = cmdGitUnlock(options);
      break;
    default:
      usage(`Unknown command: ${command}`);
  }
  process.exit(code);
}

if (require.main === module) main();

module.exports = {
  sessionLeasesEnabled,
  LEASE_TTL_MS,
  GIT_LOCK_TTL_MS,
  GIT_LOCK_WAIT_MS,
};
