/**
 * ws-check-harness install mode/scope detector tests (upstream + machine-global coexistence, project, hybrid, global, none).
 * Run: node test/test-check-harness-install-mode.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DETECTOR = path.join(REPO_ROOT, '.agents', 'skills', 'ws-check-harness', 'scripts', 'detect_install_mode.cjs');

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
      // ignore
    }
  }
}

function writeSkill(dir, id, version = '0.4.32') {
  const skillDir = path.join(dir, id);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: ${id}\nversion: ${version}\ndescription: fixture\n---\n\n# ${id}\n`,
    'utf8',
  );
}

function writeLocalSkill(repoRoot, id, version = '0.4.32') {
  writeSkill(path.join(repoRoot, '.agents', 'skills'), id, version);
}

function writeProjectHub(repoRoot) {
  const shared = path.join(repoRoot, '.agents', 'skills', 'ws-shared');
  fs.mkdirSync(shared, { recursive: true });
  fs.writeFileSync(path.join(shared, 'config.json'), JSON.stringify({ plans: { dir: '.agents/plans' } }, null, 2), 'utf8');
  fs.writeFileSync(path.join(shared, 'AGENTS.md'), '# hub\n', 'utf8');
  return shared;
}

function writeGlobalHub(globalRoot) {
  const shared = path.join(globalRoot, 'ws-shared');
  fs.mkdirSync(path.join(shared, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(shared, 'AGENTS.md'), '# global hub\n', 'utf8');
  fs.writeFileSync(path.join(shared, 'runtime', 'AGENTS.md'), '# global runtime hub\n', 'utf8');
}

function detect(repoRoot, globalRoot, extraArgs = []) {
  const result = cp.spawnSync(
    process.execPath,
    [DETECTOR, '--json', '--repo-root', repoRoot, ...extraArgs],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot, PYTHONIOENCODING: 'utf-8' },
    },
  );
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  return { result, report };
}

function testUpstreamWithGlobalCoexistence() {
  console.log('\n--- testUpstreamWithGlobalCoexistence ---');
  const upstream = mkTmp('ws-chk-upstream-');
  fs.mkdirSync(path.join(upstream, 'bin'), { recursive: true });
  fs.writeFileSync(
    path.join(upstream, 'bin', 'skill-dependencies.json'),
    JSON.stringify({ packageVersion: '0.4.32', externalSkills: [{ id: 'ws-memo' }] }, null, 2),
    'utf8',
  );
  fs.writeFileSync(path.join(upstream, 'bin', 'cli.js'), '#!/usr/bin/env node\n', 'utf8');
  fs.writeFileSync(path.join(upstream, 'package.json'), JSON.stringify({ version: '0.4.32' }, null, 2), 'utf8');
  fs.writeFileSync(path.join(upstream, 'AGENTS.md'), '# root hub\n', 'utf8');
  writeProjectHub(upstream);
  writeLocalSkill(upstream, 'ws-tdah', '0.4.32');
  writeLocalSkill(upstream, 'ws-plan-write', '0.4.32');

  const globalRoot = mkTmp('ws-chk-global-');
  writeGlobalHub(globalRoot);
  writeSkill(globalRoot, 'ws-tdah', '0.4.30');
  writeSkill(globalRoot, 'ws-retired-thing', '0.3.1');
  writeSkill(globalRoot, 'ws-memo', '1.0.0');

  const { result, report } = detect(upstream, globalRoot);
  assert(result.status === 0, `detector exit 0 (${result.stderr || ''})`);
  assert(report && report.installMode === 'upstream', 'Install mode: upstream');
  assert(report && report.installScope === 'upstream', 'Install scope: upstream');
  assert(report && report.skillsScanRoots.length === 1 && report.skillsScanRoots[0] === '.agents/skills', 'scan root is .agents/skills only');
  assert(report && report.integrityGate === 'required', 'integrity gate required in upstream mode');
  assert(report && report.coexistence.globalPresent === true, 'coexistence reports the global install');
  assert(report && report.coexistence.globalVersion === '0.4.30', 'coexistence reads global skill version');
  assert(report && report.coexistence.globalVersionDrift === 'behind', 'global older than package → drift behind');
  assert(
    report &&
      JSON.stringify(report.coexistence.globalIdsOutsidePackage) === JSON.stringify(['ws-retired-thing']),
    'global ids outside package exclude local ids and externalSkills',
  );
  assert(
    report && report.notes.some((note) => /Upstream SoT wins/.test(note)),
    'note explains upstream wins over global coexistence',
  );
  assert(report && report.warnings.length === 0, 'no warnings for healthy upstream + global tree');
  assert(report && report.primaryHub === 'AGENTS.md', 'primary hub is root AGENTS.md');
}

function testMarkersWithoutSotFallsBackToGlobal() {
  console.log('\n--- testMarkersWithoutSotFallsBackToGlobal ---');
  const consumer = mkTmp('ws-chk-markers-');
  fs.mkdirSync(path.join(consumer, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(consumer, 'bin', 'skill-dependencies.json'), '{"packageVersion":"0.0.0"}', 'utf8');
  fs.writeFileSync(path.join(consumer, 'bin', 'cli.js'), '', 'utf8');
  writeProjectHub(consumer);

  const globalRoot = mkTmp('ws-chk-global2-');
  writeSkill(globalRoot, 'ws-plan-write', '0.4.32');

  const { result, report } = detect(consumer, globalRoot);
  assert(result.status === 0, `detector exit 0 (${result.stderr || ''})`);
  assert(report && report.installMode === 'consumer', 'markers without SoT → consumer');
  assert(report && report.installScope === 'global', 'global-only scope detected');
  assert(
    report && report.warnings.some((warning) => /markers present without SoT/i.test(warning)),
    'warning records markers-without-SoT evidence',
  );
}

function testProjectAndHybridScopes() {
  console.log('\n--- testProjectAndHybridScopes ---');
  const consumer = mkTmp('ws-chk-project-');
  writeProjectHub(consumer);
  writeLocalSkill(consumer, 'ws-tdah');

  const emptyGlobal = mkTmp('ws-chk-global-empty-');
  const projectRun = detect(consumer, emptyGlobal);
  assert(projectRun.result.status === 0, `project detect exit 0 (${projectRun.result.stderr || ''})`);
  assert(projectRun.report && projectRun.report.installScope === 'project', 'local-only consumer → scope project');
  assert(
    projectRun.report &&
      JSON.stringify(projectRun.report.skillsScanRoots) === JSON.stringify(['.agents/skills']),
    'project scan root is {skillsRoot}',
  );

  const hybridGlobal = mkTmp('ws-chk-global-hybrid-');
  writeSkill(hybridGlobal, 'ws-plan-write', '0.4.32');
  const hybridRun = detect(consumer, hybridGlobal);
  assert(hybridRun.report && hybridRun.report.installScope === 'hybrid', 'local + global → scope hybrid');
  assert(
    hybridRun.report &&
      JSON.stringify(hybridRun.report.skillsScanRoots) === JSON.stringify(['.agents/skills', '{globalSkillsRoot}']),
    'hybrid scan roots list local first, global fallback',
  );
  assert(
    hybridRun.report && hybridRun.report.notes.some((note) => /Hybrid install/.test(note)),
    'hybrid note documents local override',
  );
}

function testGlobalOnlyScope() {
  console.log('\n--- testGlobalOnlyScope ---');
  const consumer = mkTmp('ws-chk-globalonly-');
  writeProjectHub(consumer);
  const globalRoot = mkTmp('ws-chk-global-only-');
  writeGlobalHub(globalRoot);
  writeSkill(globalRoot, 'ws-tdah', '0.4.32');

  const { result, report } = detect(consumer, globalRoot);
  assert(result.status === 0, `detector exit 0 (${result.stderr || ''})`);
  assert(report && report.installMode === 'consumer' && report.installScope === 'global', 'global-only consumer classified');
  assert(
    report && JSON.stringify(report.skillsScanRoots) === JSON.stringify(['{globalSkillsRoot}']),
    'global-only scan root is {globalSkillsRoot}',
  );
  assert(report && report.primaryHubSource === 'project', 'project hub wins over global hub when present');
}

function testNoSkills() {
  console.log('\n--- testNoSkills ---');
  const empty = mkTmp('ws-chk-none-');
  const emptyGlobal = mkTmp('ws-chk-none-global-');
  const { result, report } = detect(empty, emptyGlobal);
  assert(result.status === 0, `detector exit 0 (${result.stderr || ''})`);
  assert(report && report.installMode === 'none' && report.installScope === 'none', 'empty trees → mode none');
  assert(report && report.warnings.some((warning) => /No ws-\* SKILL\.md/.test(warning)), 'none mode warns with guidance');
}

function testCorruptManifestEmitsWarning() {
  console.log('\n--- testCorruptManifestEmitsWarning ---');
  const upstream = mkTmp('ws-chk-corrupt-');
  fs.mkdirSync(path.join(upstream, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(upstream, 'bin', 'skill-dependencies.json'), '{"packageVersion":', 'utf8');
  fs.writeFileSync(path.join(upstream, 'bin', 'cli.js'), '#!/usr/bin/env node\n', 'utf8');
  fs.writeFileSync(path.join(upstream, 'package.json'), JSON.stringify({ version: '0.4.32' }, null, 2), 'utf8');
  writeProjectHub(upstream);
  writeLocalSkill(upstream, 'ws-tdah', '0.4.32');

  const globalRoot = mkTmp('ws-chk-corrupt-global-');
  writeSkill(globalRoot, 'ws-tdah', '0.4.32');
  writeSkill(globalRoot, 'ws-retired-thing', '0.3.1');

  const { result, report } = detect(upstream, globalRoot);
  assert(result.status === 0, `detector exit 0 on corrupt manifest (${result.stderr || ''})`);
  assert(report && report.installMode === 'upstream', 'corrupt manifest still resolves upstream from file evidence');
  assert(
    report && report.warnings.some((warning) => /manifest .* unreadable/i.test(warning)),
    'corrupt manifest emits a structured warning instead of crashing',
  );
  assert(
    report && (report.coexistence.globalIdsOutsidePackage || []).includes('ws-retired-thing'),
    'outside-package ids still computed without the externalSkills filter',
  );
}

function testCurrentRepoIsUpstream() {
  console.log('\n--- testCurrentRepoIsUpstream ---');
  const run = cp.spawnSync(process.execPath, [DETECTOR, '--repo-root', REPO_ROOT], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env },
  });
  assert(run.status === 0, `detector exit 0 on this repo (${run.stderr || ''})`);
  assert(/Install mode: upstream/.test(run.stdout), 'human output reports Install mode: upstream');
  assert(/Install scope: upstream/.test(run.stdout), 'human output reports Install scope: upstream');
  assert(/Skills scan root: \.agents\/skills/.test(run.stdout), 'human output reports .agents/skills scan root');
}

function main() {
  testUpstreamWithGlobalCoexistence();
  testMarkersWithoutSotFallsBackToGlobal();
  testProjectAndHybridScopes();
  testGlobalOnlyScope();
  testNoSkills();
  testCorruptManifestEmitsWarning();
  testCurrentRepoIsUpstream();
  cleanup();
  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll check-harness install-mode tests passed.');
}

main();
