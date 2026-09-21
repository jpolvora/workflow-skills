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
// whitespace, a double quote, a cmd metacharacter, or is empty. Embedded quotes double (MSVCRT
// convention) and stay literal-safe; the quotes also neutralize &|<>()^ (literal inside quotes in cmd.exe).
// Embedded % still expands inside quotes. Doubling is conditional: paired %NAME% doubles to %% (literal through cmd's own parse, e.g. native targets), while unpaired % stays single (batch shims echo it literally; doubling would arrive doubled). Residual cmd design limit, verified live: paired %NAME% bound for a batch shim is re-parsed at batch dispatch and arrives as %VALUE% either way.
// A ! stays literal unless the child enables delayed expansion (off by default) — accepted residual for
// this thin deterministic layer, not a shell parser.
function quoteCmdArg(value) {
  const text = String(value);
  if (text === '' || /[\s"&|<>^%!()]/.test(text)) {
    const body = text.replace(/"/g, '""').replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, '%%$1%%');
    return `"${body}"`;
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
