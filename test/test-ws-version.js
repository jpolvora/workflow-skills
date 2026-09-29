/**
 * ws-version report_version.cjs behavior.
 * Run: node test/test-ws-version.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const REPORT_VERSION = path.join(
  REPO_ROOT,
  '.agents/skills/ws-version/scripts/report_version.cjs',
);
const DEPS_BIN = path.join(REPO_ROOT, 'bin/skill-dependencies.json');
const DEPS_RUNTIME = path.join(
  REPO_ROOT,
  '.agents/skills/ws-shared/runtime/skill-dependencies.json',
);
const CANONICAL_VERSION_PATH = path.join(
  REPO_ROOT,
  '.agents/skills/ws-shared/version.json',
);

const tmpRoots = [];
let failures = 0;

function fail(msg) {
  console.error(`❌ ${msg}`);
  failures += 1;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}

function cleanup() {
  for (const dir of tmpRoots) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function runHelper(scriptPath, opts = {}) {
  return cp.spawnSync(process.execPath, [scriptPath], {
    cwd: opts.cwd || REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...(opts.env || {}) },
  });
}

function installHelperUnderSkillsRoot(skillsRoot, versionJsonContent) {
  const skillScripts = path.join(skillsRoot, 'ws-version', 'scripts');
  fs.mkdirSync(skillScripts, { recursive: true });
  fs.copyFileSync(REPORT_VERSION, path.join(skillScripts, 'report_version.cjs'));
  const sharedDir = path.join(skillsRoot, 'ws-shared');
  fs.mkdirSync(sharedDir, { recursive: true });
  if (versionJsonContent !== undefined) {
    fs.writeFileSync(path.join(sharedDir, 'version.json'), versionJsonContent, 'utf8');
  }
  return path.join(skillScripts, 'report_version.cjs');
}

function readCanonicalVersion() {
  const data = JSON.parse(fs.readFileSync(CANONICAL_VERSION_PATH, 'utf8'));
  return data.version;
}

function testPrintsScopeAndAbsoluteSkillDir() {
  console.log('\n--- testPrintsScopeAndAbsoluteSkillDir ---');
  const r = runHelper(REPORT_VERSION);
  const out = r.stdout || '';
  assert(r.status === 0, `repo helper exits 0 (got ${r.status})`);
  assert(/installScope: project-local/.test(out), 'installScope is project-local in repo tree');
  assert(
    out.includes(`skillDir: ${path.resolve(REPO_ROOT, '.agents/skills/ws-version')}`),
    'skillDir is absolute ws-version folder',
  );
}

function testPrintsGlobalScopeUnderGlobalRoot() {
  console.log('\n--- testPrintsGlobalScopeUnderGlobalRoot ---');
  const fakeGlobal = mkTmp('ws-version-global-');
  const skillsRoot = fakeGlobal;
  const helper = installHelperUnderSkillsRoot(
    skillsRoot,
    JSON.stringify({ version: '1.2.3' }),
  );
  const r = runHelper(helper, {
    cwd: fakeGlobal,
    env: { WORKFLOW_SKILLS_GLOBAL_DIR: fakeGlobal },
  });
  const out = r.stdout || '';
  assert(r.status === 0, `global fixture exits 0 (got ${r.status})`);
  assert(/installScope: global/.test(out), 'installScope is global under WORKFLOW_SKILLS_GLOBAL_DIR');
  assert(out.includes('packageVersion: 1.2.3'), 'prints packageVersion from fixture version.json');
}

function testPrintsPackageVersionFromVersionJson() {
  console.log('\n--- testPrintsPackageVersionFromVersionJson ---');
  const r = runHelper(REPORT_VERSION);
  const expected = readCanonicalVersion();
  assert(
    (r.stdout || '').includes(`packageVersion: ${expected}`),
    `packageVersion matches ws-shared/version.json (${expected})`,
  );
  assert(!/packageVersion: unavailable/.test(r.stdout || ''), 'does not mark version unavailable in repo');
}

function testVersionUnavailableWhenMissing() {
  console.log('\n--- testVersionUnavailableWhenMissing ---');
  const root = mkTmp('ws-version-nover-');
  const helper = installHelperUnderSkillsRoot(root, undefined);
  const r = runHelper(helper, { cwd: root });
  const out = r.stdout || '';
  assert(r.status !== 0, 'missing version.json exits non-zero');
  assert(/packageVersion: unavailable/.test(out), 'packageVersion unavailable when file missing');
  assert(/skillDir:/.test(out), 'skillDir still printed when version missing');
  assert(/installScope:/.test(out), 'installScope still printed when version missing');
}

function testVersionUnavailableWhenInvalidJson() {
  console.log('\n--- testVersionUnavailableWhenInvalidJson ---');
  const root = mkTmp('ws-version-badver-');
  const helper = installHelperUnderSkillsRoot(root, '{ not json');
  const r = runHelper(helper, { cwd: root });
  const out = r.stdout || '';
  assert(r.status !== 0, 'invalid version.json exits non-zero');
  assert(/packageVersion: unavailable/.test(out), 'packageVersion unavailable on parse error');
  assert(out.includes('skillDir:'), 'skillDir still printed on bad version.json');
}

function testVersionUnavailableWhenNonSemver() {
  console.log('\n--- testVersionUnavailableWhenNonSemver ---');
  const root = mkTmp('ws-version-badsemver-');
  const helper = installHelperUnderSkillsRoot(root, JSON.stringify({ version: '1.2.3-beta' }));
  const r = runHelper(helper, { cwd: root });
  const out = r.stdout || '';
  assert(r.status !== 0, 'non-semver version exits non-zero');
  assert(/packageVersion: unavailable/.test(out), 'non-semver reported unavailable');
  assert(/skillDir:/.test(out), 'skillDir still printed on bad semver');
}

function testPrintsPathTokensFromConfig() {
  console.log('\n--- testPrintsPathTokensFromConfig ---');
  const root = mkTmp('ws-version-config-');
  const helper = installHelperUnderSkillsRoot(
    root,
    JSON.stringify({ version: '9.9.9' }),
  );
  const ws = path.join(root, '.ws');
  fs.mkdirSync(ws, { recursive: true });
  fs.writeFileSync(
    path.join(ws, 'config.json'),
    JSON.stringify(
      {
        pathTokens: { skillsRoot: '.agents/skills', sharedDir: '.ws' },
        plans: { dir: '.agents/plans', specsDir: '.agents/specs' },
      },
      null,
      2,
    ),
    'utf8',
  );
  const r = runHelper(helper, { cwd: root });
  const out = r.stdout || '';
  assert(r.status === 0, 'valid version + config exits 0');
  assert(out.includes('pathTokens.skillsRoot: .agents/skills'), 'prints pathTokens.skillsRoot as stored');
  assert(out.includes('pathTokens.sharedDir: .ws'), 'prints pathTokens.sharedDir as stored');
  assert(out.includes('plans.dir: .agents/plans'), 'prints plans.dir as stored');
  assert(out.includes('plans.specsDir: .agents/specs'), 'prints plans.specsDir as stored');
}

function testConfigUnavailableWhenMissingOrInvalid() {
  console.log('\n--- testConfigUnavailableWhenMissingOrInvalid ---');
  const rootMissing = mkTmp('ws-version-nocfg-');
  const helperMissing = installHelperUnderSkillsRoot(
    rootMissing,
    JSON.stringify({ version: '2.0.0' }),
  );
  const r1 = runHelper(helperMissing, { cwd: rootMissing });
  assert(r1.status === 0, 'missing config exits 0 when version ok');
  assert(/project config: unavailable/.test(r1.stdout || ''), 'missing config reported unavailable');

  const rootBad = mkTmp('ws-version-badcfg-');
  const helperBad = installHelperUnderSkillsRoot(
    rootBad,
    JSON.stringify({ version: '2.0.0' }),
  );
  const ws = path.join(rootBad, '.ws');
  fs.mkdirSync(ws, { recursive: true });
  fs.writeFileSync(path.join(ws, 'config.json'), 'not-json', 'utf8');
  const r2 = runHelper(helperBad, { cwd: rootBad });
  assert(r2.status === 0, 'invalid config exits 0 when version ok');
  assert(/project config: unavailable/.test(r2.stdout || ''), 'invalid config reported unavailable');
  assert((r2.stdout || '').includes('packageVersion: 2.0.0'), 'version still printed when config invalid');
}

function testSkillRegisteredInDependencyGraph() {
  console.log('\n--- testSkillRegisteredInDependencyGraph ---');
  const bin = JSON.parse(fs.readFileSync(DEPS_BIN, 'utf8'));
  const runtime = JSON.parse(fs.readFileSync(DEPS_RUNTIME, 'utf8'));
  const workflowsBin = bin.packages?.workflows?.skills || [];
  const workflowsRt = runtime.packages?.workflows?.skills || [];
  assert(workflowsBin.includes('ws-version'), 'bin workflows package lists ws-version');
  assert(workflowsRt.includes('ws-version'), 'runtime workflows package lists ws-version');
  assert(
    Array.isArray(bin.dependencies['ws-version']) && bin.dependencies['ws-version'].length === 0,
    'bin dependencies.ws-version is []',
  );
  assert(
    Array.isArray(runtime.dependencies['ws-version']) &&
      runtime.dependencies['ws-version'].length === 0,
    'runtime dependencies.ws-version is []',
  );
}

function testOutputIsShortAndReadOnly() {
  console.log('\n--- testOutputIsShortAndReadOnly ---');
  const r = runHelper(REPORT_VERSION);
  const out = (r.stdout || '').trim();
  const lines = out.split('\n').filter(Boolean);
  assert(lines.length >= 3 && lines.length <= 12, `stdout is short (${lines.length} lines)`);
  assert(!/Advance|user-gate|git add|commit/i.test(out), 'output has no workflow or write cues');
  const skillMd = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-version/SKILL.md'),
    'utf8',
  );
  assert(!/cursor|vscode|copilot|windsurf/i.test(skillMd), 'SKILL.md has no IDE product names');
}

function main() {
  testPrintsScopeAndAbsoluteSkillDir();
  testPrintsGlobalScopeUnderGlobalRoot();
  testPrintsPackageVersionFromVersionJson();
  testVersionUnavailableWhenMissing();
  testVersionUnavailableWhenInvalidJson();
  testVersionUnavailableWhenNonSemver();
  testPrintsPathTokensFromConfig();
  testConfigUnavailableWhenMissingOrInvalid();
  testSkillRegisteredInDependencyGraph();
  testOutputIsShortAndReadOnly();

  cleanup();
  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll ws-version tests passed.');
}

main();
