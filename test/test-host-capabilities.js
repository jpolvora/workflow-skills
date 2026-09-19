/**
 * Tests for us-348 host capability detection & cache (AC1-AC5 + negatives).
 * Run: node test/test-host-capabilities.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const RUNTIME = path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime');
const TOKENS_DOC = path.join(RUNTIME, 'host-capability-tokens.md');
const MAP_FILE = path.join(RUNTIME, 'host-tool-map.json');
const PROBE = path.join(RUNTIME, 'scripts', 'probe_host_capabilities.cjs');
const TOOLS_MD = path.join(RUNTIME, 'tools.md');
const HOST_DISPATCH = path.join(RUNTIME, 'host-dispatch.md');

const TOKENS = ['readFile', 'writeFile', 'editFile', 'shellExec', 'dispatchAgent', 'askQuestion', 'browserVerify'];

let failures = 0;

function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

function probe(args, cache) {
  return cp.spawnSync(
    process.execPath,
    [PROBE, '--cache', cache, ...args, '--json'],
    { cwd: REPO_ROOT, encoding: 'utf-8' },
  );
}

// Mirror of the cache-query-first ordering in host-capability-tokens.md.
function chooseTool(capabilities, token) {
  if (capabilities && capabilities[token] && capabilities[token] !== 'none') {
    return { tool: capabilities[token], native: true };
  }
  return { tool: 'shell', native: false };
}

function main() {
  // File existence.
  assert(fs.existsSync(TOKENS_DOC), 'host-capability-tokens.md exists');
  assert(fs.existsSync(MAP_FILE), 'host-tool-map.json exists');
  assert(fs.existsSync(PROBE), 'probe_host_capabilities.cjs exists');

  // AC1: documented brainstorm decision.
  const tokensDoc = fs.readFileSync(TOKENS_DOC, 'utf8');
  assert(/refine-and-implement/i.test(tokensDoc), 'AC1 decision note records refine-and-implement');
  assert(/abandon/i.test(tokensDoc), 'AC1 decision note records the rejected abandon option');

  // AC3: vocabulary greppable in tools.md + tokens doc.
  const toolsMd = fs.readFileSync(TOOLS_MD, 'utf8');
  for (const token of TOKENS) {
    assert(toolsMd.includes(`{${token}}`), `AC3 tools.md maps {${token}}`);
    assert(tokensDoc.includes(`{${token}}`), `AC3 tokens doc defines {${token}}`);
  }
  assert(/cache-query-first/i.test(toolsMd), 'AC3 tools.md states cache-query-first ordering');

  // AC5: pre-mapped named entries including dispatch-agent variants.
  const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
  const shapes = Object.keys(map.shapes || {});
  assert(shapes.length >= 2, 'AC5 map ships at least two named host shapes');
  for (const shape of shapes) {
    for (const token of TOKENS) {
      assert(Array.isArray(map.shapes[shape][token]), `AC5 ${shape}.${token} is a variant list`);
    }
  }
  const nonGeneric = shapes.filter((s) => s !== 'generic');
  assert(nonGeneric.length >= 1, 'AC5 map has non-generic shapes');
  for (const shape of nonGeneric) {
    assert(
      map.shapes[shape].dispatchAgent.length > 0,
      `AC5 ${shape} pre-maps dispatch-agent variants`,
    );
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-hostcaps-'));
  const cache = path.join(tmp, 'host-capabilities.json');
  const probeLog = path.join(tmp, 'probes.log');

  // AC2: cache-content test on at least two host shapes.
  const shapeA = shapes[0];
  const shapeB = shapes[1];
  const rA = probe(['--key', 'shape-a::model-1', '--host-shape', shapeA, '--probe-log', probeLog], cache);
  assert(rA.status === 0, 'AC2 probe exits 0 for first host shape');
  const pA = JSON.parse(rA.stdout.trim());
  assert(pA.ok === true && pA.cached === false, 'AC2 first probe detects (not cached)');
  const rB = probe(['--key', 'shape-b::model-1', '--host-shape', shapeB, '--probe-log', probeLog], cache);
  assert(rB.status === 0, 'AC2 probe exits 0 for second host shape');
  const stored = JSON.parse(fs.readFileSync(cache, 'utf8'));
  assert(
    stored['shape-a::model-1'] && stored['shape-b::model-1'],
    'AC2 cache holds detected tools per host-shape key',
  );
  assert(
    TOKENS.every((t) => typeof stored['shape-a::model-1'].capabilities[t] === 'string'),
    'AC2 cached entry lists every capability token',
  );

  // AC3 scenario: file work uses the native tool when cached-available.
  const choice = chooseTool(stored['shape-a::model-1'].capabilities, 'readFile');
  assert(choice.native === true, 'AC3 scenario file work picks the native tool over shell');
  assert(choice.tool !== 'shell', 'AC3 scenario native choice is not a shell equivalent');

  // Negative: file operation via shell when native is cached-available must fail tool-choice.
  const shellBypass = { tool: 'shell', native: false };
  assert(
    shellBypass.tool !== choice.tool,
    'NEG shell-when-native-available diverges from the native choice (fails tool-choice)',
  );

  // AC4: cached detection reused across steps — probe-count test over a multi-step run.
  const before = fs.existsSync(probeLog)
    ? fs.readFileSync(probeLog, 'utf8').split('\n').filter(Boolean).length
    : 0;
  for (let step = 0; step < 3; step += 1) {
    const r = probe(['--key', 'shape-a::model-1', '--probe-log', probeLog], cache);
    assert(r.status === 0, `AC4 step ${step + 1} reuses cache without error`);
    assert(JSON.parse(r.stdout.trim()).cached === true, `AC4 step ${step + 1} is a cache hit`);
  }
  const after = fs.readFileSync(probeLog, 'utf8').split('\n').filter(Boolean).length;
  assert(after === before, 'AC4 multi-step run performs no per-step re-probing');
  assert(/invalidation/i.test(tokensDoc), 'AC4 documented invalidation rule exists');
  const rRefresh = probe(
    ['--key', 'shape-a::model-1', '--refresh', '--host-shape', shapeA, '--probe-log', probeLog],
    cache,
  );
  assert(JSON.parse(rRefresh.stdout.trim()).cached === false, 'AC4 --refresh forces re-probe');
  const refreshed = fs.readFileSync(probeLog, 'utf8').split('\n').filter(Boolean).length;
  assert(refreshed === after + 1, 'AC4 refresh appends exactly one probe');

  // Negative: unknown host degrades to the minimal capability set without failing startup.
  const rUnknown = probe(['--key', 'mystery::model-9', '--host-shape', 'no-such-shape'], cache);
  assert(rUnknown.status === 0, 'NEG unknown host exits 0 (graceful degradation)');
  const pUnknown = JSON.parse(rUnknown.stdout.trim());
  assert(pUnknown.capabilities.shellExec !== 'none', 'NEG unknown host keeps a shell fallback');
  assert(pUnknown.capabilities.dispatchAgent === 'none', 'NEG unknown host has no phantom dispatch tool');

  // Negative: host-declared tools override the pre-map (effective resolution).
  const rDeclared = probe(
    ['--key', 'declared::model-1', '--host-shape', shapeA, '--declare', 'readFile=custom_reader'],
    cache,
  );
  assert(
    JSON.parse(rDeclared.stdout.trim()).capabilities.readFile === 'custom_reader',
    'NEG host-declared tool wins over the pre-map entry',
  );

  // REG legacy-shape entries (no capabilities field) backfill instead of cache-hit.
  const legacyCache = path.join(tmp, 'legacy-capabilities.json');
  const legacyKey = 'legacy::model-1';
  fs.writeFileSync(
    legacyCache,
    `${JSON.stringify({ [legacyKey]: { binding: { subagentTool: 'none' }, probedAt: '2026-01-01T00:00:00.000Z', hostAdapterMode: 'auto' } }, null, 2)}\n`,
    'utf8',
  );
  const rLegacy = probe(['--key', legacyKey, '--host-shape', shapeA, '--probe-log', probeLog], legacyCache);
  assert(rLegacy.status === 0, 'REG legacy entry exits 0');
  const pLegacy = JSON.parse(rLegacy.stdout.trim());
  assert(pLegacy.cached === false, 'REG legacy entry is treated as a miss (probe runs)');
  const backfilled = JSON.parse(fs.readFileSync(legacyCache, 'utf8'));
  assert(
    backfilled[legacyKey] && backfilled[legacyKey].capabilities
      && typeof backfilled[legacyKey].capabilities === 'object'
      && TOKENS.every((t) => typeof backfilled[legacyKey].capabilities[t] === 'string'),
    'REG legacy entry backfills the full capability token map',
  );

  // REG documented --key-only invocation infers the host shape from the key.
  const rKeyOnly = probe(['--key', 'cursor::model-keyonly'], cache);
  assert(rKeyOnly.status === 0, 'REG --key-only probe exits 0');
  const pKeyOnly = JSON.parse(rKeyOnly.stdout.trim());
  assert(pKeyOnly.cached === false, 'REG --key-only probe runs (miss, not inert hit)');
  assert(
    pKeyOnly.capabilities.readFile !== 'none' && pKeyOnly.capabilities.dispatchAgent !== 'none',
    'REG --key-only probe reaches the pre-map (native tools bound, not minimal)',
  );
  const storedKeyOnly = JSON.parse(fs.readFileSync(cache, 'utf8'))['cursor::model-keyonly'];
  assert(
    storedKeyOnly && storedKeyOnly.knownShape === true && storedKeyOnly.hostShape === 'cursor-like',
    'REG --key-only entry records the inferred cursor-like shape',
  );

  // REG unknown host id still degrades to the minimal safe set.
  const rKeyUnknown = probe(['--key', 'mystery-host-zzz::model-1'], cache);
  assert(
    JSON.parse(rKeyUnknown.stdout.trim()).capabilities.dispatchAgent === 'none',
    'REG uninferred host id degrades to minimal (no phantom dispatch tool)',
  );

  // REG default cache resolves to the consumer shared dir (hybrid-safe).
  const consumerRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-consumer-'));
  fs.mkdirSync(path.join(consumerRoot, '.agents', 'skills', 'ws-shared'), { recursive: true });
  fs.writeFileSync(
    path.join(consumerRoot, '.agents', 'skills', 'ws-shared', 'config.json'),
    '{}\n',
    'utf8',
  );
  const rDefaultCache = cp.spawnSync(
    process.execPath,
    [PROBE, '--key', 'cursor::model-default-cache', '--json'],
    { cwd: consumerRoot, encoding: 'utf-8' },
  );
  assert(rDefaultCache.status === 0, 'REG default-cache probe exits 0');
  const expectedCache = path.join(consumerRoot, '.agents', 'skills', 'ws-shared', 'host-capabilities.json');
  assert(fs.existsSync(expectedCache), 'REG default cache lands in the consumer shared dir');
  assert(
    JSON.parse(fs.readFileSync(expectedCache, 'utf8'))['cursor::model-default-cache'],
    'REG default cache holds the probed key',
  );
  fs.rmSync(consumerRoot, { recursive: true, force: true });

  // REG host-declared tools override an ALREADY cached entry (highest precedence).
  probe(['--key', 'shape-a::model-1'], cache); // warm the cache from the pre-map
  const rRedeclare = probe(
    ['--key', 'shape-a::model-1', '--declare', 'readFile=custom_reader'],
    cache,
  );
  assert(rRedeclare.status === 0, 'REG --declare on warm cache exits 0');
  assert(
    JSON.parse(rRedeclare.stdout.trim()).capabilities.readFile === 'custom_reader',
    'REG --declare overrides an existing cached entry (host-declared highest)',
  );
  assert(
    JSON.parse(fs.readFileSync(cache, 'utf8'))['shape-a::model-1'].capabilities.readFile
      === 'custom_reader',
    'REG rewritten cache entry keeps the declared tool',
  );

  // REG re-probe preserves data the probe does not own (binding extras like
  // supportedModels) and previously detected tools it has no new info about.
  const preserveCache = path.join(tmp, 'preserve-capabilities.json');
  const preserveKey = 'custom-host-zzz::model-1';
  fs.writeFileSync(
    preserveCache,
    `${JSON.stringify({ [preserveKey]: {
      binding: { askQuestionTool: 'none', subagentTool: 'task', backgroundTaskTool: 'none', browserTool: 'none', supportedModels: ['composer-2.5'] },
      capabilities: { readFile: 'read', writeFile: 'write', editFile: 'edit', shellExec: 'bash', dispatchAgent: 'task', askQuestion: 'question', browserVerify: 'none' },
      hostShape: 'opencode-like', knownShape: true, probedAt: '2026-01-01T00:00:00.000Z', hostAdapterMode: 'auto',
    } }, null, 2)}\n`,
    'utf8',
  );
  const rPreserve = probe(['--key', preserveKey, '--declare', 'readFile=custom_reader'], preserveCache);
  assert(rPreserve.status === 0, 'REG preserving re-probe exits 0');
  const preserved = JSON.parse(fs.readFileSync(preserveCache, 'utf8'))[preserveKey];
  assert(
    JSON.parse(rPreserve.stdout.trim()).capabilities.readFile === 'custom_reader',
    'REG preserving re-probe applies the declared tool',
  );
  assert(
    preserved.capabilities.writeFile === 'write' && preserved.capabilities.dispatchAgent === 'task',
    'REG preserving re-probe keeps previously detected tools (no minimal degrade)',
  );
  assert(
    Array.isArray(preserved.binding.supportedModels)
      && preserved.binding.supportedModels[0] === 'composer-2.5',
    'REG preserving re-probe keeps binding.supportedModels the probe never emits',
  );
  assert(
    preserved.binding.subagentTool === 'task',
    'REG preserving re-probe keeps the bound dispatch alias (capabilities/binding consistent)',
  );

  // REG declared tools survive a later re-probe that omits --declare (known shape).
  const rDeclareFirst = probe(
    ['--key', 'cursor::model-declared', '--declare', 'writeFile=custom_writer'],
    cache,
  );
  assert(
    JSON.parse(rDeclareFirst.stdout.trim()).capabilities.writeFile === 'custom_writer',
    'REG initial --declare stores the declared tool',
  );
  const rRefreshKept = probe(['--key', 'cursor::model-declared', '--refresh'], cache);
  assert(rRefreshKept.status === 0, 'REG refresh re-probe exits 0');
  const keptCaps = JSON.parse(rRefreshKept.stdout.trim()).capabilities;
  assert(
    keptCaps.writeFile === 'custom_writer',
    'REG refresh without --declare keeps the persisted declaration (declared outranks map)',
  );
  assert(
    keptCaps.readFile !== 'none',
    'REG refresh still resolves non-declared tokens from the inferred shape',
  );
  const keptEntry = JSON.parse(fs.readFileSync(cache, 'utf8'))['cursor::model-declared'];
  assert(
    keptEntry.declared && keptEntry.declared.writeFile === 'custom_writer',
    'REG entry persists the declared map across re-probes',
  );

  // REG unknown flags fail loudly instead of silently keeping defaults.
  const rUnknownFlag = cp.spawnSync(
    process.execPath,
    [PROBE, '--cache', cache, '--bogus-flag', '--json'],
    { cwd: REPO_ROOT, encoding: 'utf-8' },
  );
  assert(rUnknownFlag.status === 2, 'REG unknown flag exits 2 (fail loudly)');

  // host-dispatch.md references the probe script and the reuse rule (quoter sweep target).
  const dispatch = fs.readFileSync(HOST_DISPATCH, 'utf8');
  assert(dispatch.includes('probe_host_capabilities.cjs'), 'host-dispatch.md references the probe script');
  assert(/no per-step re-probing/i.test(dispatch), 'host-dispatch.md states the reuse rule');

  // REG hub docs name the capabilities field so the documented schema cannot drift.
  assert(
    dispatch.includes('capabilities: { readFile'),
    'REG host-dispatch.md §4 schema documents the capabilities map',
  );
  assert(
    toolsMd.includes('`capabilities` map of the'),
    'REG tools.md names the capabilities map of the cached entry',
  );

  fs.rmSync(tmp, { recursive: true, force: true });

  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll host-capability tests passed.');
}

main();
