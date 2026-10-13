/**
 * Token resolution for the canonical review-thread reader.
 *
 * Network-free coverage of the four-link token chain documented in
 * ws-spec-provider-github/SKILL.md:
 *   AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN -> GITHUB_TOKEN -> GH_TOKEN -> `gh auth token`.
 *
 * Strategy (spec "Implementation seam for tests"): a temporary git repo whose origin
 * is a GitHub URL, a PATH-first `gh` stub (POSIX `gh` + Windows `gh.cmd`) driven by
 * env vars, a `--require` preload that replaces `globalThis.fetch` with a recorder,
 * and a scrubbed environment. No live network or live `gh` call is made.
 *
 * Run: node test/test-fetch-threads-token-fallback.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const CANONICAL = path.join(
  REPO,
  '.agents/skills/ws-spec-provider-github/scripts/fetch_threads.cjs',
);
const SHIM = path.join(REPO, '.agents/skills/ws-fix-pr/scripts/fetch_threads.cjs');

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

const ENV_TOKEN_VARS = ['AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN', 'GITHUB_TOKEN', 'GH_TOKEN'];

// --- fixture -----------------------------------------------------------------

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ft-token-'));
const repoDir = path.join(root, 'repo');
const binDir = path.join(root, 'bin');
const outDir = path.join(root, 'out');
const fetchShim = path.join(outDir, 'fetch-shim.cjs');
fs.mkdirSync(repoDir, { recursive: true });
fs.mkdirSync(binDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

spawnSync('git', ['init', '-q'], { cwd: repoDir });
spawnSync('git', ['remote', 'add', 'origin', 'https://github.com/jpolvora/workflow-skills.git'], {
  cwd: repoDir,
});

fs.writeFileSync(
  path.join(binDir, 'gh.cmd'),
  [
    '@echo off',
    'if defined GH_STUB_MARKER echo invoked>>"%GH_STUB_MARKER%"',
    'if defined GH_STUB_STDOUT echo %GH_STUB_STDOUT%',
    'if defined GH_STUB_STDERR echo %GH_STUB_STDERR% 1>&2',
    'exit /b %GH_STUB_EXIT%',
    '',
  ].join('\r\n'),
);
const posixGh = path.join(binDir, 'gh');
fs.writeFileSync(
  posixGh,
  [
    '#!/bin/sh',
    'if [ -n "$GH_STUB_MARKER" ]; then echo invoked >> "$GH_STUB_MARKER"; fi',
    'if [ -n "$GH_STUB_STDOUT" ]; then printf \'%s\' "$GH_STUB_STDOUT"; fi',
    'if [ -n "$GH_STUB_STDERR" ]; then printf \'%s\' "$GH_STUB_STDERR" 1>&2; fi',
    'exit "${GH_STUB_EXIT:-0}"',
    '',
  ].join('\n'),
);
try {
  fs.chmodSync(posixGh, 0o755);
} catch {
  // Non-POSIX host: the .cmd stub is used instead.
}

// Recorder: the canonical script calls `fetchRetry`, whose default `fetchImpl = fetch`
// resolves against the global at call time, so overriding globalThis.fetch intercepts it.
fs.writeFileSync(
  fetchShim,
  [
    "'use strict';",
    "const fs = require('fs');",
    'globalThis.fetch = async (url, options = {}) => {',
    '  const payload =',
    '    process.env.FT_FETCH_PAYLOAD ||',
    '    JSON.stringify({ data: { repository: { pullRequest: { reviewThreads: { nodes: [] } } } } });',
    '  if (process.env.FT_FETCH_CAPTURE) {',
    '    fs.writeFileSync(',
    '      process.env.FT_FETCH_CAPTURE,',
    '      JSON.stringify({ url: String(url), headers: options.headers || {}, body: options.body || "" }),',
    '    );',
    '  }',
    '  return {',
    '    ok: true,',
    '    status: 200,',
    '    json: async () => JSON.parse(payload),',
    '    text: async () => payload,',
    '  };',
    '};',
    '',
  ].join('\n'),
);

function baseEnv() {
  const env = { ...process.env };
  for (const key of ENV_TOKEN_VARS) delete env[key];
  for (const key of ['GH_STUB_MARKER', 'GH_STUB_STDOUT', 'GH_STUB_STDERR', 'GH_STUB_EXIT']) {
    delete env[key];
  }
  // Prepend the stub dir to every PATH-cased key so a Windows `Path`/`PATH` duplication
  // cannot hide the stub or the real `gh`.
  for (const key of Object.keys(env)) {
    if (key.toUpperCase() === 'PATH') {
      env[key] = `${binDir}${path.delimiter}${env[key]}`;
    }
  }
  // NODE_OPTIONS propagates the fetch shim into the `ws-fix-pr` shim's child process
  // (which re-execs the canonical script without our explicit `--require`). Forward
  // slashes keep Node's NODE_OPTIONS tokenizer from eating Windows backslashes.
  const nodeOptionsShim = fetchShim.replace(/\\/g, '/');
  env.NODE_OPTIONS = `${env.NODE_OPTIONS || ''} --require ${nodeOptionsShim}`.trim();
  return env;
}

function runScript(script, args, extraEnv) {
  const env = baseEnv();
  Object.assign(env, extraEnv);
  return spawnSync(
    process.execPath,
    ['--require', fetchShim, script, ...args],
    { cwd: repoDir, env, encoding: 'utf8' },
  );
}

function markerPath(tag) {
  return path.join(outDir, `marker-${tag}.txt`);
}
function capturePath(tag) {
  return path.join(outDir, `capture-${tag}.json`);
}

function scanForSentinel(dir, sentinel) {
  const hits = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (fs.readFileSync(full).includes(sentinel)) hits.push(full);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return hits;
}

try {
  // --- Case A: explicit env token wins; CLI stub never invoked (AC1, AC2, AC4, NS6) ---
  const envSentinel = 'env-sentinel-aaa';
  const cliSentinel = 'cli-sentinel-zzz';
  const capA = capturePath('a');
  const markA = markerPath('a');
  const runA = runScript(CANONICAL, ['42', '--json'], {
    GH_TOKEN: envSentinel,
    GH_STUB_STDOUT: cliSentinel,
    GH_STUB_STDERR: 'stub-stderr-leak',
    GH_STUB_EXIT: '0',
    GH_STUB_MARKER: markA,
    FT_FETCH_CAPTURE: capA,
  });
  assert(runA.status === 0, `AC1/AC2 env-token run exits 0 (got ${runA.status})`);
  assert(!fs.existsSync(markA), 'AC2 env token short-circuits before `gh auth token`');
  const capturedA = JSON.parse(fs.readFileSync(capA, 'utf8'));
  assert(
    capturedA.headers.Authorization === `Bearer ${envSentinel}`,
    'AC4 Authorization header carries the env token',
  );
  assert(
    !runA.stdout.includes(envSentinel) && !runA.stderr.includes(envSentinel),
    'AC8 env token never printed on stdout/stderr',
  );
  let jsonA = null;
  try {
    jsonA = JSON.parse(runA.stdout);
  } catch {
    /* handled by the assertion below */
  }
  assert(jsonA !== null, 'AC14 --json payload is valid JSON');
  for (const key of ['prNumber', 'owner', 'repo', 'cooperativeContract', 'activeThreads']) {
    assert(jsonA && Object.hasOwn(jsonA, key), `AC14 --json payload keeps key ${key}`);
  }
  assert(
    scanForSentinel(repoDir, envSentinel).length === 0,
    'AC8/NS7 env token not persisted to disk',
  );

  // --- Case B: CLI fallback supplies the token (AC1, AC3, AC4, AC7, AC12, NS5) ---
  const capB = capturePath('b');
  const markB = markerPath('b');
  const cliStderrB = 'stub-stderr-should-be-discarded';
  const runB = runScript(CANONICAL, ['42', '--json'], {
    GH_STUB_STDOUT: cliSentinel,
    GH_STUB_STDERR: cliStderrB,
    GH_STUB_EXIT: '0',
    GH_STUB_MARKER: markB,
    FT_FETCH_CAPTURE: capB,
  });
  assert(runB.status === 0, `AC1/AC3 CLI fallback run exits 0 (got ${runB.status})`);
  assert(fs.existsSync(markB), 'AC3 `gh auth token` invoked after env miss');
  const capturedB = JSON.parse(fs.readFileSync(capB, 'utf8'));
  assert(
    capturedB.headers.Authorization === `Bearer ${cliSentinel}`,
    'AC4 Authorization header carries the CLI token',
  );
  assert(runB.stderr.includes('gh auth token'), 'AC12 stderr names the selected source');
  assert(!runB.stdout.includes(cliSentinel) && !runB.stderr.includes(cliSentinel),
    'AC8 CLI token never printed');
  assert(!runB.stderr.includes(cliStderrB), 'AC7 CLI stderr is discarded, not forwarded');
  assert(scanForSentinel(repoDir, cliSentinel).length === 0, 'AC8/NS5 CLI token not persisted');

  // --- Case C: token resolution fails, non-zero + actionable (AC5, AC6, NS1, NS2) ---
  const capC = capturePath('c');
  const runC = runScript(CANONICAL, ['42', '--json'], {
    GH_STUB_EXIT: '127',
    FT_FETCH_CAPTURE: capC,
  });
  assert(runC.status !== 0, `AC5 no-source run exits non-zero (got ${runC.status})`);
  assert(runC.stderr.includes('gh auth login'), 'AC5 message names `gh auth login`');
  for (const v of ENV_TOKEN_VARS) {
    assert(runC.stderr.includes(v), `AC5 message names ${v}`);
  }
  assert(!runC.stdout.includes('No active unresolved review threads found.'), 'AC6 zero-thread text absent on failure');
  assert(!fs.existsSync(capC), 'AC6 no GraphQL request issued when resolution fails');

  // --- Case D: CLI present but not authenticated (NS3) ---
  const notAuthSentinel = 'gh-not-authenticated-sentinel';
  const runD = runScript(CANONICAL, ['42', '--json'], {
    GH_STUB_EXIT: '1',
    GH_STUB_STDERR: notAuthSentinel,
  });
  assert(runD.status !== 0, `NS3 not-authenticated run exits non-zero (got ${runD.status})`);
  assert(runD.stderr.includes('gh auth login'), 'NS3 message stays actionable');
  assert(!runD.stderr.includes(notAuthSentinel), 'NS3 CLI stderr not forwarded verbatim');

  // --- Case E: CLI returns empty output -> treat as fallback failure (NS4) ---
  const runE = runScript(CANONICAL, ['42', '--json'], {
    GH_STUB_EXIT: '0',
    GH_STUB_STDOUT: '',
  });
  assert(runE.status !== 0, `NS4 empty-CLI run exits non-zero (got ${runE.status})`);
  assert(!runE.stdout.includes('No active unresolved review threads found.'), 'NS4 no zero-thread success');

  // --- Case F: legitimate zero-thread success still exits 0 (AC13) ---
  const runF = runScript(CANONICAL, ['42'], { GH_TOKEN: 'env-sentinel-aaa' });
  assert(runF.status === 0, `AC13 zero-thread success exits 0 (got ${runF.status})`);
  assert(
    runF.stdout.includes('No active unresolved review threads found.'),
    'AC13 zero-thread message preserved',
  );

  // --- Case H: ws-fix-pr shim forwards resolution + failure (AC9, AC10, NS8) ---
  const shimSrc = fs.readFileSync(SHIM, 'utf8');
  assert(!shimSrc.includes('gh auth token'), 'AC9 shim does not duplicate token logic');
  assert(shimSrc.includes('spawnSync'), 'AC9 shim keeps forwarding via spawnSync');
  const runHOk = runScript(SHIM, ['42'], { GH_TOKEN: 'env-sentinel-aaa' });
  assert(runHOk.status === 0, `AC9/AC10 shim success forwards exit 0 (got ${runHOk.status})`);
  const runHFail = runScript(SHIM, ['42', '--json'], { GH_STUB_EXIT: '127' });
  assert(runHFail.status !== 0, 'AC10 shim propagates the canonical non-zero exit');
  assert(runHFail.stderr.includes('gh auth login'), 'AC10 shim inherits the canonical error text');

  // --- Case I: stack invariants (AC8/NS7 disk, NS11 Node-only, no new dependency) ---
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  assert(
    Object.keys(pkg.dependencies || {}).length === 0,
    'NS11 no runtime dependencies added',
  );
  assert(
    Object.keys(pkg.devDependencies || {}).sort().join(',') === 'c8',
    'NS11 devDependencies unchanged (c8 only)',
  );
  const pyHits = [];
  for (const base of [path.join(REPO, '.agents/skills'), path.join(REPO, 'bin')]) {
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__pycache__') pyHits.push(full);
          else walk(full);
        } else if (/\.py[cod]?$/.test(entry.name) || entry.name.endsWith('.pyo')) {
          pyHits.push(full);
        }
      }
    };
    if (fs.existsSync(base)) walk(base);
  }
  assert(pyHits.length === 0, `NS11 no Python files under .agents/skills or bin (${pyHits.join(', ')})`);

  // --- Case J: provider docs state the same four-link chain (AC11, NS10) ---
  const providerDir = path.join(REPO, '.agents/skills/ws-spec-provider-github');
  const docsToCheck = [
    path.join(providerDir, 'INTENTS.md'),
    path.join(providerDir, 'SKILL.md'),
    path.join(REPO, '.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md'),
    path.join(REPO, '.agents/skills/ws-fix-pr/README.md'),
  ];
  for (const docPath of docsToCheck) {
    const doc = fs.readFileSync(docPath, 'utf8');
    for (const token of [
      'AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN',
      'GITHUB_TOKEN',
      'GH_TOKEN',
      'gh auth token',
    ]) {
      assert(doc.includes(token), `AC11 provider docs state the four-link chain: ${path.basename(docPath)} ${token}`);
    }
  }
} finally {
  try {
    fs.rmSync(root, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

if (failures > 0) {
  console.error(`test-fetch-threads-token-fallback: ${failures} failure(s)`);
  process.exit(1);
}
console.log('test-fetch-threads-token-fallback: ok');
