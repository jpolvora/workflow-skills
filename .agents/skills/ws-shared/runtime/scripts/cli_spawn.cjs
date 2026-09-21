#!/usr/bin/env node
'use strict';

// Portable launcher for configured CLI binaries (e.g. specMemo.cli).
//
// Background: spec-memo mirror/vault probes used to run with
// `shell: process.platform === 'win32'`, which joins the argv array into one
// string on Windows and splits `--cwd` paths containing spaces. Switching to
// `shell: false` keeps spaced arguments intact on every platform but breaks
// npm-installed Windows launchers (`memo`, `npx -y ...` resolve to `*.cmd`
// shims, which are not directly executable: bare name -> ENOENT, and even
// `*.cmd` with `shell: false` -> EINVAL because batch files need a shell).
//
// `spawnCliSync` keeps the fast `shell: false` first attempt everywhere and,
// only on win32 when that attempt fails with ENOENT, retries once through
// ComSpec with a pre-quoted command line so spaced arguments still survive.

const { spawnSync } = require('child_process');

// Quote one argv element for cmd.exe: wrap in double quotes when it contains
// whitespace, a double quote, or is empty. Embedded quotes double (MSVCRT
// convention); paths and flags — the realistic inputs here — never contain
// them, so this stays a thin deterministic quoting layer, not a shell parser.
function quoteCmdArg(value) {
  const text = String(value);
  if (text === '' || /[\s"]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function spawnCliSync(bin, args, options = {}) {
  const argv = Array.isArray(args) ? args : [];
  const first = spawnSync(bin, argv, { ...options, shell: false });
  if (process.platform !== 'win32') return first;
  if (!first.error || !['ENOENT', 'EINVAL'].includes(first.error.code)) return first;
  // Windows command-shim fallback (npm `*.cmd` launchers; bare names -> ENOENT, explicit `*.cmd` -> EINVAL): re-run through
  // ComSpec with a caller-quoted command string. `shell: true` receives the
  // already-quoted line, so cmd.exe resolves PATHEXT shims while spaced
  // arguments stay intact (verified: spaced `--cwd` arrives as one arg).
  const commandLine = [bin, ...argv].map(quoteCmdArg).join(' ');
  return spawnSync(commandLine, { ...options, shell: true });
}

module.exports = {
  quoteCmdArg,
  spawnCliSync,
};
