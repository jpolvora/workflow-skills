#!/usr/bin/env node
'use strict';

// file_lock.cjs — cross-process exclusive lock for shared-artifact
// read-modify-write. Creates an O_EXCL lock file in the OS temp dir keyed on
// the absolute target path, so writers never pollute the worktree. A stale lock
// (crashed writer) is stolen after `staleMs`.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_STALE_MS = 10000;
const MAX_ATTEMPTS = 200;

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function lockPathFor(targetPath, prefix = 'ws-lock') {
  const key = crypto.createHash('sha1').update(path.resolve(targetPath)).digest('hex').slice(0, 16);
  return path.join(os.tmpdir(), `${prefix}-${key}.lock`);
}

// Acquire the lock and return a release() function. The lock file carries a
// unique owner token; release verifies ownership before unlinking, and a stale
// lock is reclaimed by an atomic rename (only one stealer wins the rename).
function acquireFileLock(targetPath, { prefix = 'ws-lock', staleMs = DEFAULT_STALE_MS } = {}) {
  const lockPath = lockPathFor(targetPath, prefix);
  const token = `${process.pid}-${crypto.randomBytes(8).toString('hex')}`;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let fd;
    try {
      fd = fs.openSync(lockPath, 'wx');
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let stale = false;
      try {
        stale = Date.now() - fs.statSync(lockPath).mtimeMs > staleMs;
      } catch {
        continue; // lock vanished between attempts; retry immediately
      }
      if (stale) {
        // Atomic reclaim: rename is exclusive, so only one contender can move
        // the stale lock aside; the rest fall through to the retry path.
        const graveyard = `${lockPath}.stale-${token}`;
        try {
          fs.renameSync(lockPath, graveyard);
          try { fs.rmSync(graveyard, { force: true }); } catch { /* best-effort */ }
          continue;
        } catch { /* another process reclaimed it first */ }
      }
      sleepSync(2 + Math.min(attempt, 50));
      continue;
    }
    try {
      fs.writeSync(fd, token);
    } catch { /* owner token is best-effort */ }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      try { fs.closeSync(fd); } catch { /* ignore */ }
      try {
        // Only remove the lock if we still own it (a stale steal may have
        // replaced it while we held the section).
        if (fs.readFileSync(lockPath, 'utf8') === token) fs.rmSync(lockPath, { force: true });
      } catch { /* lock gone or now owned by another writer */ }
    };
  }
  throw new Error(`timed out acquiring lock for ${targetPath}`);
}

// Run `fn` while holding the lock.
function withFileLock(targetPath, fn, options) {
  const release = acquireFileLock(targetPath, options);
  try {
    return fn();
  } finally {
    release();
  }
}

module.exports = { acquireFileLock, withFileLock, lockPathFor };
