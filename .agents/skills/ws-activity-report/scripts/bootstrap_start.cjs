#!/usr/bin/env node
'use strict';

// Port of bootstrap_start.py (ws-activity-report):
// Resolve billing start time from earliest bootstrap file creation in a plan folder.

const fs = require('fs');
const path = require('path');

const CANDIDATE_GLOBS = [
  '.runtime/started-at.txt',
  '.runtime/workflow-id.txt',
  '.runtime/baseline.txt',
];

const NAME_PATTERNS = [
  /.*\.state\.md$/i,
  /^step-00-.*\.(issue\.json|spec\.md|classify\.md)$/i,
  /^.*\.issue\.json$/i,
];

const STARTED_AT_RE = /^startedAt:\s*["']?([^"'\n#]+)/gim;

function creationTs(p) {
  let st;
  try {
    st = fs.statSync(p);
  } catch {
    return null;
  }
  // Node stat: birthtimeMs when available, else ctimeMs (mirrors py birthtime/ctime logic).
  const birth = st.birthtimeMs;
  if (birth && birth > 0 && Number.isFinite(birth)) return birth / 1000;
  return st.ctimeMs / 1000;
}

function isoUtc(ts) {
  return new Date(ts * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function listCandidates(usDir) {
  const found = [];
  for (const rel of CANDIDATE_GLOBS) {
    const p = path.join(usDir, rel);
    try {
      if (fs.statSync(p).isFile() && !found.includes(p)) found.push(p);
    } catch { /* skip */ }
  }
  let entries = [];
  try {
    entries = fs.readdirSync(usDir, { withFileTypes: true });
  } catch { return found; }
  const files = entries.filter((e) => e.isFile()).map((e) => e.name).sort();
  for (const name of files) {
    if (NAME_PATTERNS.some((rx) => rx.test(name))) {
      const p = path.join(usDir, name);
      if (!found.includes(p)) found.push(p);
    }
  }
  return found;
}

function readStartedAt(usDir) {
  const globState = (dir) => {
    try {
      return fs.readdirSync(dir).filter((n) => n.endsWith('.state.md')).map((n) => path.join(dir, n)).sort();
    } catch { return []; }
  };
  let states = globState(usDir);
  try {
    const arch = path.join(usDir, '*.archive');
    void arch;
  } catch { /* ignore */ }
  // Include *.archive/*.state.md
  try {
    for (const e of fs.readdirSync(usDir, { withFileTypes: true })) {
      if (e.isDirectory() && e.name.endsWith('.archive')) {
        states = states.concat(globState(path.join(usDir, e.name)));
      }
    }
  } catch { /* ignore */ }
  for (const state of states) {
    let text;
    try {
      text = fs.readFileSync(state, 'utf8');
    } catch { continue; }
    STARTED_AT_RE.lastIndex = 0;
    const m = STARTED_AT_RE.exec(text);
    if (!m) continue;
    const raw = m[1].trim().replace(/^["']|["']$/g, '');
    try {
      let text = raw.replace(/Z$/i, '+00:00');
      // Parity with bootstrap_start.py read_started_at: naive wall times are UTC, not local.
      if (!/[+-]\d{2}:?\d{2}$/.test(text)) {
        const m = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/);
        text = m ? `${m[1]}T${m[2]}Z` : `${text}Z`;
      }
      const dt = new Date(text);
      if (Number.isNaN(dt.getTime())) return [raw, null];
      return [raw, dt.getTime() / 1000];
    } catch {
      return [raw, null];
    }
  }
  return [null, null];
}

function resolve(usDir) {
  const candidates = listCandidates(usDir);
  const rows = [];
  for (const p of candidates) {
    const ts = creationTs(p);
    if (ts === null || ts === undefined) continue;
    rows.push({
      path: path.relative(usDir, p).replace(/\\/g, '/'),
      creationIso: isoUtc(ts),
      creationTs: ts,
    });
  }
  const [startedRaw, startedTs] = readStartedAt(usDir);
  if (rows.length === 0) {
    return { ok: false, error: 'no-bootstrap-candidates', usDir: String(usDir), startedAt: startedRaw, candidates: [] };
  }
  const earliest = rows.reduce((a, b) => (b.creationTs < a.creationTs ? b : a));
  let startTs = earliest.creationTs;
  let startIso = earliest.creationIso;
  const firstFile = earliest.path;
  let override = null;
  const seconds = new Set(rows.map((r) => Math.floor(r.creationTs)));
  if (startedTs !== null && startedTs !== undefined && rows.length >= 2 && seconds.size === 1 && startedTs < startTs - 60) {
    startTs = startedTs;
    startIso = isoUtc(startedTs);
    override = 'startedAt';
  }
  void startTs;
  return {
    ok: true,
    usDir: String(usDir),
    startIso,
    firstFile,
    override,
    startedAt: startedRaw,
    candidates: rows.map((r) => ({ path: r.path, creationIso: r.creationIso })),
  };
}

function main() {
  const argv = process.argv.slice(2);
  let usDirArg = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      console.log('Usage: node bootstrap_start.cjs <us_dir> [--json]');
      process.exit(0);
    } else if (a === '--json') {
      continue;
    } else if (a.startsWith('--')) {
      console.error(`unknown argument: ${a}`);
      process.exit(2);
    } else if (!usDirArg) {
      usDirArg = a;
    } else {
      console.error(`unexpected argument: ${a}`);
      process.exit(2);
    }
  }
  if (!usDirArg) {
    console.error('argument us_dir is required');
    process.exit(2);
  }
  const usDir = path.resolve(usDirArg);
  let isDir = false;
  try {
    isDir = fs.statSync(usDir).isDirectory();
  } catch { isDir = false; }
  if (!isDir) {
    console.log(JSON.stringify({ ok: false, error: 'not-a-directory', usDir }));
    process.exit(1);
  }
  const result = resolve(usDir);
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 2);
}

if (require.main === module) main();
module.exports = { resolve };
