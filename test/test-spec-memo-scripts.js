/**
 * ws-spec-memo script smoke tests.
 * Run: node test/test-spec-memo-scripts.js
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
const EXAMPLE = path.join(REPO_ROOT, '.agents/skills/ws-shared/config.json.example');

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
  fs.copyFileSync(EXAMPLE, path.join(shared, 'config.json.example'));
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-memo-test-'));

try {
  seedHub(tmp);
  const checkDefault = runNode(CHECK, ['--repo-root', tmp, '--json']);
  const report = JSON.parse(checkDefault.stdout);
  assert(typeof report.cli === 'object', 'check JSON includes cli');
  assert(typeof report.doctor === 'object', 'check JSON includes doctor');
  assert(typeof report.vault === 'object' && typeof report.vault.ok === 'boolean', 'check JSON includes vault.ok alias');
  assert(report.sharedDir === '.agents/skills/ws-shared', 'check resolves default sharedDir');
  assert(report.ok === (report.config.enabled ? report.cli.available && report.vault.ok : true), 'check report.ok reflects vault-active health only');
  assert(checkDefault.status === (report.ok ? 0 : 1), 'check_spec_memo exit code matches health');

  const customShared = path.join(tmp, 'custom-hub');
  seedHub(tmp, { sharedRel: 'custom-hub' });
  const checkOverride = runNode(CHECK, ['--repo-root', tmp, '--json'], {
    env: { WORKFLOW_SKILLS_SHARED_DIR: customShared },
  });
  const overrideReport = JSON.parse(checkOverride.stdout);
  assert(checkOverride.status === (overrideReport.ok ? 0 : 1), 'check_spec_memo honors WORKFLOW_SKILLS_SHARED_DIR exit code');
  assert(
    overrideReport.sharedDir.replace(/\\/g, '/') === 'custom-hub',
    'check reports overridden sharedDir',
  );

  const configureDry = runNode(CONFIGURE, ['--repo-root', tmp, '--apply', '--enabled', 'false', '--json'], {
    env: { WORKFLOW_SKILLS_SHARED_DIR: customShared },
  });
  assert(configureDry.status === 0, 'configure_spec_memo --apply false exits 0');
  const cfgResult = JSON.parse(configureDry.stdout);
  assert(cfgResult.specMemo.enabled === false, 'configure writes specMemo.enabled false');
  assert(
    fs.existsSync(path.join(customShared, 'config.json')),
    'configure seeds config under overridden sharedDir',
  );

  const badMode = runNode(CONFIGURE, ['--repo-root', tmp, '--apply', '--mode', 'hybird', '--json'], {
    env: { WORKFLOW_SKILLS_SHARED_DIR: customShared },
  });
  assert(badMode.status === 2, 'configure rejects invalid specMemo.mode');
  const cfgAfterBadMode = JSON.parse(fs.readFileSync(path.join(customShared, 'config.json'), 'utf8'));
  assert(cfgAfterBadMode.specMemo.mode !== 'hybird', 'invalid mode is not persisted');

  const configureStdin = runNode(
    CONFIGURE,
    ['--repo-root', tmp, '--apply', '--json', '--stdin-json'],
    {
      env: { WORKFLOW_SKILLS_SHARED_DIR: customShared },
      input: JSON.stringify({
        enabled: false,
        mode: 'hybrid',
        import: false,
        hook: false,
        bootstrapOnSession: true,
      }),
    },
  );
  assert(configureStdin.status === 0, 'configure_spec_memo --stdin-json exits 0');
  const stdinResult = JSON.parse(configureStdin.stdout);
  assert(stdinResult.specMemo.enabled === false, 'stdin-json applies enabled');
  assert(stdinResult.specMemo.mode === 'hybrid', 'stdin-json applies mode');
  assert(stdinResult.specMemo.importOnEnable === false, 'stdin-json persists importOnEnable false');

  const enableNoCli = runNode(
    CONFIGURE,
    ['--repo-root', tmp, '--apply', '--enabled', 'true', '--json'],
    { env: { WORKFLOW_SKILLS_SHARED_DIR: customShared } },
  );
  assert(enableNoCli.status === 2, 'configure rejects enable when CLI unavailable');

  const enabledHubRel = 'vault-active-hub';
  seedHub(tmp, { sharedRel: enabledHubRel });
  const enabledHub = path.join(tmp, enabledHubRel);
  const enabledCfgPath = path.join(enabledHub, 'config.json');
  fs.copyFileSync(path.join(enabledHub, 'config.json.example'), enabledCfgPath);
  const enabledCfg = JSON.parse(fs.readFileSync(enabledCfgPath, 'utf8'));
  enabledCfg.specMemo = { enabled: true, cli: 'memo-unavailable-for-test' };
  fs.writeFileSync(enabledCfgPath, `${JSON.stringify(enabledCfg, null, 2)}\n`, 'utf8');
  const checkEnabled = runNode(CHECK, ['--repo-root', tmp, '--json'], {
    env: { WORKFLOW_SKILLS_SHARED_DIR: enabledHub },
  });
  const enabledReport = JSON.parse(checkEnabled.stdout);
  assert(enabledReport.config.enabled === true, 'enabled fixture activates vault branch');
  assert(enabledReport.ok === false, 'vault-active preflight fails when CLI unavailable');
  assert(checkEnabled.status === 1, 'vault-active preflight exits 1 when unhealthy');

  if (failures === 0) console.log('\ntest-spec-memo-scripts: ok');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

process.exit(failures === 0 ? 0 : 1);
