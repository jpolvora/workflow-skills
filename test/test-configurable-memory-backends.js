/**
 * Tests for configurable memory backends: enableMemoryFiles & enableSpecMemoIntegration.
 * Run: node test/test-configurable-memory-backends.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CHECK = path.join(REPO_ROOT, '.agents/skills/ws-spec-memo/scripts/check_spec_memo.cjs');
const CONFIGURE = path.join(REPO_ROOT, '.agents/skills/ws-spec-memo/scripts/configure_spec_memo.cjs');
const SELF_LEARNING = path.join(REPO_ROOT, '.agents/skills/ws-self-learning/scripts/self_learning.cjs');
const { resolveMemoryRouting } = await import(
  '../.agents/skills/ws-shared/scripts/resolve_consumer_root.cjs'
);

let failures = 0;
function ok(msg) {
  console.log(`✅ ${msg}`);
}
function fail(msg) {
  console.error(`❌ ${msg}`);
  failures += 1;
}
function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

function runNode(script, args, opts = {}) {
  return cp.spawnSync(process.execPath, [script, ...args], {
    cwd: opts.cwd || REPO_ROOT,
    encoding: 'utf8',
    input: opts.input,
    env: { ...process.env, ...(opts.env || {}) },
  });
}

function seedHub(root, { sharedRel = '.agents/skills/ws-shared' } = {}) {
  const shared = path.join(root, sharedRel);
  fs.mkdirSync(shared, { recursive: true });
  fs.writeFileSync(
    path.join(shared, 'config.json.example'),
    JSON.stringify({
      toolsFile: 'tools.md',
      project: { name: 'test', baseBranch: 'main' },
      verification: {},
      plans: { dir: '.agents/plans' },
      specMemo: {
        enabled: false,
        enableMemoryFiles: true,
        enableSpecMemoIntegration: false,
        mode: 'vault',
        cli: 'memo',
      },
    }, null, 2),
    'utf8'
  );
}

console.log('Testing resolveMemoryRouting helper...');

// 1. Default when empty
assert(
  JSON.stringify(resolveMemoryRouting({})) ===
    JSON.stringify({ enableMemoryFiles: true, enableSpecMemoIntegration: false }),
  'empty config defaults to enableMemoryFiles: true, enableSpecMemoIntegration: false'
);

// 2. Explicit top-level flags
assert(
  JSON.stringify(resolveMemoryRouting({ enableMemoryFiles: false, enableSpecMemoIntegration: true })) ===
    JSON.stringify({ enableMemoryFiles: false, enableSpecMemoIntegration: true }),
  'honors top-level enableMemoryFiles and enableSpecMemoIntegration'
);

// 3. Explicit specMemo block flags
assert(
  JSON.stringify(
    resolveMemoryRouting({
      specMemo: { enableMemoryFiles: true, enableSpecMemoIntegration: true },
    })
  ) === JSON.stringify({ enableMemoryFiles: true, enableSpecMemoIntegration: true }),
  'honors specMemo block flags'
);

// 4. Legacy resolution: enabled: true, mode: "vault" -> memoryFiles: false, specMemo: true
assert(
  JSON.stringify(
    resolveMemoryRouting({
      specMemo: { enabled: true, mode: 'vault' },
    })
  ) === JSON.stringify({ enableMemoryFiles: false, enableSpecMemoIntegration: true }),
  'legacy mode: "vault" maps to enableMemoryFiles: false, enableSpecMemoIntegration: true'
);

// 5. Legacy resolution: enabled: true, mode: "hybrid" -> memoryFiles: true, specMemo: true
assert(
  JSON.stringify(
    resolveMemoryRouting({
      specMemo: { enabled: true, mode: 'hybrid' },
    })
  ) === JSON.stringify({ enableMemoryFiles: true, enableSpecMemoIntegration: true }),
  'legacy mode: "hybrid" maps to enableMemoryFiles: true, enableSpecMemoIntegration: true'
);

// 6. Legacy resolution: enabled: false -> memoryFiles: true, specMemo: false
assert(
  JSON.stringify(
    resolveMemoryRouting({
      specMemo: { enabled: false },
    })
  ) === JSON.stringify({ enableMemoryFiles: true, enableSpecMemoIntegration: false }),
  'legacy enabled: false maps to enableMemoryFiles: true, enableSpecMemoIntegration: false'
);

console.log('Testing configure_spec_memo with new flags & reporting...');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'configurable-memory-test-'));

try {
  seedHub(tmp);
  const sharedDir = path.join(tmp, '.agents/skills/ws-shared');

  // Test State 1: Local files only (default)
  const cfgState1 = runNode(
    CONFIGURE,
    ['--repo-root', tmp, '--apply', '--enable-memory-files', 'true', '--enable-spec-memo', 'false', '--json']
  );
  assert(cfgState1.status === 0, 'configure state 1 (local only) exits 0');
  const res1 = JSON.parse(cfgState1.stdout).specMemo;
  assert(res1.enableMemoryFiles === true && res1.enableSpecMemoIntegration === false, 'state 1 persisted correctly');

  const checkState1 = runNode(CHECK, ['--repo-root', tmp, '--json']);
  const checkState1Json = JSON.parse(checkState1.stdout);
  assert(checkState1Json.config.mode === 'local', 'check_spec_memo reports mode: "local" for local-only state');

  // Test State 2: Vault only
  const cfgState2 = runNode(
    CONFIGURE,
    ['--repo-root', tmp, '--apply', '--enable-memory-files', 'false', '--enable-spec-memo', 'true', '--json']
  );
  assert(cfgState2.status === 0, 'configure state 2 (vault only) exits 0');
  const res2 = JSON.parse(cfgState2.stdout).specMemo;
  assert(res2.enableMemoryFiles === false && res2.enableSpecMemoIntegration === true, 'state 2 persisted correctly');

  // Disabling spec-memo from vault-only mode without explicit memoryFiles flag restores local markdown memory
  const cfgDisableVault = runNode(
    CONFIGURE,
    ['--repo-root', tmp, '--apply', '--enabled', 'false', '--json']
  );
  assert(cfgDisableVault.status === 0, 'disable spec-memo exits 0');
  const resDisableVault = JSON.parse(cfgDisableVault.stdout).specMemo;
  assert(
    resDisableVault.enableMemoryFiles === true && resDisableVault.enableSpecMemoIntegration === false,
    'disabling spec-memo from vault-only mode restores enableMemoryFiles: true'
  );
  const checkRestoredJson = JSON.parse(runNode(CHECK, ['--repo-root', tmp, '--json']).stdout);
  assert(checkRestoredJson.config.mode === 'local', 'check_spec_memo reports mode: "local" after vault disable restoration');

  // Test State 4: None / Disabled via stdin-json
  const cfgState4 = runNode(
    CONFIGURE,
    ['--repo-root', tmp, '--apply', '--stdin-json', '--json'],
    {
      input: JSON.stringify({
        enableMemoryFiles: false,
        enableSpecMemoIntegration: false,
      }),
    }
  );
  assert(cfgState4.status === 0, 'configure state 4 (disabled) exits 0');
  const res4 = JSON.parse(cfgState4.stdout).specMemo;
  assert(res4.enableMemoryFiles === false && res4.enableSpecMemoIntegration === false, 'state 4 persisted correctly');

  // Test check_spec_memo reports new flags
  const checkRes = runNode(CHECK, ['--repo-root', tmp, '--json']);
  const checkJson = JSON.parse(checkRes.stdout);
  assert(checkJson.config.enableMemoryFiles === false, 'check_spec_memo reports enableMemoryFiles');
  assert(checkJson.config.enableSpecMemoIntegration === false, 'check_spec_memo reports enableSpecMemoIntegration');
  assert(checkJson.config.mode === 'disabled', 'check_spec_memo reports mode: "disabled" when both are false');
  assert(checkRes.status === 0, 'disabled memory check exits 0');

  // Seed legacy memory files to test short-circuit even with files on disk
  const memDir = path.join(sharedDir, 'memory');
  fs.mkdirSync(memDir, { recursive: true });
  fs.writeFileSync(
    path.join(memDir, '2026-08-01-legacy-trap.md'),
    `# [2026-08-01] Legacy Trap\n- **Severity:** High\n- **PathPattern:** src/**\n- **DO NOT:** use legacy trap\n- **INSTEAD DO:** ignore when disabled\n`,
    'utf8'
  );

  // Test self_learning query when enableMemoryFiles is false with legacy files present
  const selfLearnRes = runNode(
    SELF_LEARNING,
    ['--query', 'legacy', '--repo-root', tmp]
  );
  assert(selfLearnRes.status === 0, 'self_learning query exits 0 when local memory disabled with files present');
  assert(
    selfLearnRes.stdout.includes('local memory files disabled'),
    'self_learning short-circuits on disabled local memory even with files on disk'
  );

  // Test self_learning compile when enableMemoryFiles is false with legacy files present
  const selfLearnCompileRes = runNode(
    SELF_LEARNING,
    ['--compile', '--repo-root', tmp]
  );
  assert(selfLearnCompileRes.status === 0, 'self_learning compile exits 0 when local memory disabled');
  assert(
    selfLearnCompileRes.stdout.includes('Skipped compile (local memory files disabled)'),
    'self_learning compile skips when local memory disabled'
  );

  // Test tools.md alias consistency (knowledge-tool rows must stay on new flags)
  const toolsMd = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-shared/tools.md'),
    'utf8'
  );
  assert(
    toolsMd.includes('enableSpecMemoIntegration') &&
      !/update-ws-changelog.*specMemo\.enabled/s.test(toolsMd),
    'update-ws-changelog alias uses enableSpecMemoIntegration, not legacy specMemo.enabled'
  );
  for (const alias of ['read-memory', 'update-memory', 'update-ws-changelog']) {
    const row = toolsMd.split('\n').find((line) => line.includes('`' + alias + '`'));
    assert(
      Boolean(row) && row.includes('enableSpecMemoIntegration'),
      `${alias} alias row references enableSpecMemoIntegration`
    );
  }

} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n❌ ${failures} test(s) failed`);
  process.exit(1);
} else {
  console.log('\ntest-configurable-memory-backends: all tests passed ✅');
}
