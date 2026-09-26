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

// Acquire the lock and return a release() function. Throws on timeout.
function acquireFileLock(targetPath, { prefix = 'ws-lock', staleMs = DEFAULT_STALE_MS } = {}) {
  const lockPath = lockPathFor(targetPath, prefix);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    let fd;
    try {
      fd = fs.openSync(lockPath, 'wx');
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - fs.statSync(lockPath).mtimeMs > staleMs) {
          fs.rmSync(lockPath, { force: true });
          continue;
        }
      } catch { /* lock vanished between attempts; retry */ }
      sleepSync(2 + Math.min(attempt, 50));
      continue;
    }
    try {
      fs.writeSync(fd, `${process.pid}\n`);
    } catch { /* pid write is best-effort */ }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      try { fs.closeSync(fd); } catch { /* ignore */ }
      try { fs.rmSync(lockPath, { force: true }); } catch { /* ignore */ }
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
