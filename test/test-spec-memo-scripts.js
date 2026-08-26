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

  const badStdin = runNode(
    CONFIGURE,
    ['--repo-root', tmp, '--apply', '--json', '--stdin-json'],
    {
      env: { WORKFLOW_SKILLS_SHARED_DIR: customShared },
      input: '{not-json',
    },
  );
  assert(badStdin.status === 2, 'configure rejects malformed --stdin-json');

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

  const healthyStub = path.join(tmp, 'healthy-memo.cjs');
  fs.writeFileSync(
    healthyStub,
    `#!/usr/bin/env node
const cmd = process.argv[2];
if (cmd === '--help') process.exit(0);
if (cmd === 'doctor') { console.log('{"ok":true}'); process.exit(0); }
process.exit(0);
`,
  );
  const healthyHubRel = 'vault-healthy-hub';
  seedHub(tmp, { sharedRel: healthyHubRel });
  const healthyHub = path.join(tmp, healthyHubRel);
  const healthyCfgPath = path.join(healthyHub, 'config.json');
  fs.copyFileSync(path.join(healthyHub, 'config.json.example'), healthyCfgPath);
  const healthyCfg = JSON.parse(fs.readFileSync(healthyCfgPath, 'utf8'));
  healthyCfg.specMemo = { enabled: true, cli: `node ${healthyStub}` };
  fs.writeFileSync(healthyCfgPath, `${JSON.stringify(healthyCfg, null, 2)}\n`, 'utf8');
  const checkHealthy = runNode(CHECK, ['--repo-root', tmp, '--json'], {
    env: { WORKFLOW_SKILLS_SHARED_DIR: healthyHub },
  });
  const healthyReport = JSON.parse(checkHealthy.stdout);
  assert(healthyReport.config.enabled === true, 'healthy fixture activates vault branch');
  assert(healthyReport.ok === true, 'vault-active preflight passes when CLI and doctor healthy');
  assert(checkHealthy.status === 0, 'vault-active healthy preflight exits 0');
  assert(healthyReport.runtimeHandoff !== null, 'runtimeHandoff required when vault active');
  assert(healthyReport.runtimeHandoff.mcpServerName === 'spec-memo', 'runtimeHandoff reports mcp server name');
  assert(healthyReport.runtimeHandoff.wsMemo.installed === false, 'healthy fixture without ws-memo seed reports missing');
  assert(checkHealthy.status === 0, 'missing ws-memo warns but does not fail healthy vault check');

  const memoSkillDir = path.join(tmp, '.agents', 'skills', 'ws-memo');
  fs.mkdirSync(memoSkillDir, { recursive: true });
  fs.writeFileSync(path.join(memoSkillDir, 'SKILL.md'), '---\nname: ws-memo\n---\n', 'utf8');
  const checkWithMemo = runNode(CHECK, ['--repo-root', tmp, '--json'], {
    env: { WORKFLOW_SKILLS_SHARED_DIR: healthyHub },
  });
  const withMemoReport = JSON.parse(checkWithMemo.stdout);
  assert(withMemoReport.runtimeHandoff.wsMemo.installed === true, 'local ws-memo skill detected');
  assert(
    withMemoReport.runtimeHandoff.wsMemo.skillPath.replace(/\\/g, '/').includes('.agents/skills/ws-memo/SKILL.md'),
    'reports repo-relative ws-memo path',
  );

  const globalRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'global-skills-'));
  const globalMemo = path.join(globalRoot, 'ws-memo');
  fs.mkdirSync(globalMemo, { recursive: true });
  fs.writeFileSync(path.join(globalMemo, 'SKILL.md'), '---\nname: ws-memo\n---\n', 'utf8');
  const globalTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-memo-global-'));
  const globalOnlyHubRel = 'vault-global-memo-hub';
  seedHub(globalTmp, { sharedRel: globalOnlyHubRel });
  const globalOnlyHub = path.join(globalTmp, globalOnlyHubRel);
  const globalCfgPath = path.join(globalOnlyHub, 'config.json');
  fs.copyFileSync(path.join(globalOnlyHub, 'config.json.example'), globalCfgPath);
  const globalCfg = JSON.parse(fs.readFileSync(globalCfgPath, 'utf8'));
  globalCfg.specMemo = { enabled: true, cli: `node ${healthyStub}` };
  fs.writeFileSync(globalCfgPath, `${JSON.stringify(globalCfg, null, 2)}\n`, 'utf8');
  const checkGlobal = runNode(CHECK, ['--repo-root', globalTmp, '--json'], {
    env: { WORKFLOW_SKILLS_SHARED_DIR: globalOnlyHub, WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot },
  });
  const globalReport = JSON.parse(checkGlobal.stdout);
  assert(globalReport.runtimeHandoff.wsMemo.installed === true, 'global ws-memo detected when local missing');
  assert(
    globalReport.runtimeHandoff.wsMemo.skillPath.includes('global install'),
    'reports global install path',
  );
  fs.rmSync(globalRoot, { recursive: true, force: true });
  fs.rmSync(globalTmp, { recursive: true, force: true });

  const bothTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-memo-both-'));
  const bothGlobal = fs.mkdtempSync(path.join(os.tmpdir(), 'global-skills-both-'));
  fs.mkdirSync(path.join(bothGlobal, 'ws-memo'), { recursive: true });
  fs.writeFileSync(path.join(bothGlobal, 'ws-memo', 'SKILL.md'), '---\nname: ws-memo\n---\n', 'utf8');
  const bothHubRel = 'vault-both-memo-hub';
  seedHub(bothTmp, { sharedRel: bothHubRel });
  const bothHub = path.join(bothTmp, bothHubRel);
  const bothCfgPath = path.join(bothHub, 'config.json');
  fs.copyFileSync(path.join(bothHub, 'config.json.example'), bothCfgPath);
  const bothCfg = JSON.parse(fs.readFileSync(bothCfgPath, 'utf8'));
  bothCfg.specMemo = { enabled: true, cli: `node ${healthyStub}` };
  fs.writeFileSync(bothCfgPath, `${JSON.stringify(bothCfg, null, 2)}\n`, 'utf8');
  const localMemo = path.join(bothTmp, '.agents', 'skills', 'ws-memo', 'SKILL.md');
  fs.mkdirSync(path.dirname(localMemo), { recursive: true });
  fs.writeFileSync(localMemo, '---\nname: ws-memo-local\n---\n', 'utf8');
  const checkBoth = runNode(CHECK, ['--repo-root', bothTmp, '--json'], {
    env: { WORKFLOW_SKILLS_SHARED_DIR: bothHub, WORKFLOW_SKILLS_GLOBAL_DIR: bothGlobal },
  });
  const bothReport = JSON.parse(checkBoth.stdout);
  assert(bothReport.runtimeHandoff.wsMemo.installed === true, 'both fixtures: ws-memo detected');
  assert(
    bothReport.runtimeHandoff.wsMemo.skillPath.replace(/\\/g, '/').includes('.agents/skills/ws-memo/SKILL.md'),
    'local ws-memo wins over global when both exist',
  );
  fs.rmSync(bothGlobal, { recursive: true, force: true });
  fs.rmSync(bothTmp, { recursive: true, force: true });

  const disabledReport = JSON.parse(checkDefault.stdout);
  assert(disabledReport.runtimeHandoff === null, 'runtimeHandoff omitted when vault disabled');
  assert(checkDefault.status === 0, 'disabled vault check exits 0 without ws-memo');

  const stubCli = path.join(tmp, 'stub-memo.cjs');
  fs.writeFileSync(
    stubCli,
    `#!/usr/bin/env node
const cmd = process.argv[2];
if (cmd === '--help') process.exit(0);
if (cmd === 'hook') process.exit(1);
process.exit(0);
`,
  );
  const hookFail = runNode(
    CONFIGURE,
    [
      '--repo-root',
      tmp,
      '--apply',
      '--enabled',
      'true',
      '--cli',
      `node ${stubCli}`,
      '--hook',
      'true',
      '--import',
      'false',
      '--json',
    ],
    { env: { WORKFLOW_SKILLS_SHARED_DIR: customShared } },
  );
  assert(hookFail.status === 0, 'hook failure still exits 0 by contract');
  const hookResult = JSON.parse(hookFail.stdout);
  assert(hookResult.specMemo.writeBlockHook === false, 'failed hook does not mark writeBlockHook true');
  assert(
    hookResult.actions.find((a) => a.action === 'hook-install')?.status === 1,
    'hook failure recorded in actions',
  );

  const cfgBeforeHookRetry = JSON.parse(fs.readFileSync(path.join(customShared, 'config.json'), 'utf8'));
  cfgBeforeHookRetry.specMemo = { ...cfgBeforeHookRetry.specMemo, enabled: false, writeBlockHook: true };
  fs.writeFileSync(path.join(customShared, 'config.json'), `${JSON.stringify(cfgBeforeHookRetry, null, 2)}\n`, 'utf8');
  const hookRetry = runNode(
    CONFIGURE,
    [
      '--repo-root',
      tmp,
      '--apply',
      '--enabled',
      'true',
      '--cli',
      `node ${stubCli}`,
      '--hook',
      'true',
      '--import',
      'false',
      '--json',
    ],
    { env: { WORKFLOW_SKILLS_SHARED_DIR: customShared } },
  );
  assert(hookRetry.status === 0, 'hook retry exits 0 when reinstall fails');
  const hookRetryResult = JSON.parse(hookRetry.stdout);
  assert(hookRetryResult.specMemo.writeBlockHook === true, 'failed hook reinstall preserves writeBlockHook true');

  const importFailStub = path.join(tmp, 'import-fail-stub.cjs');
  fs.writeFileSync(
    importFailStub,
    `#!/usr/bin/env node
if (process.argv[2] === '--help') process.exit(0);
if (process.argv[2] === 'import') process.exit(3);
process.exit(0);
`,
  );
  const cfgBeforeImportFail = JSON.parse(fs.readFileSync(path.join(customShared, 'config.json'), 'utf8'));
  const importFail = runNode(
    CONFIGURE,
    [
      '--repo-root',
      tmp,
      '--apply',
      '--enabled',
      'true',
      '--cli',
      `node ${importFailStub}`,
      '--import',
      'true',
      '--json',
    ],
    { env: { WORKFLOW_SKILLS_SHARED_DIR: customShared } },
  );
  assert(importFail.status === 3, 'import failure aborts configure');
  const cfgAfterImportFail = JSON.parse(fs.readFileSync(path.join(customShared, 'config.json'), 'utf8'));
  assert(
    cfgAfterImportFail.specMemo.enabled === cfgBeforeImportFail.specMemo.enabled,
    'import failure does not persist partial config',
  );

  if (failures === 0) console.log('\ntest-spec-memo-scripts: ok');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

process.exit(failures === 0 ? 0 : 1);
