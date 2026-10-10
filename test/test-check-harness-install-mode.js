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
  const shared = path.join(repoRoot, '.ws');
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

function writeHubVersionFile(globalRoot, rawText) {
  const shared = path.join(globalRoot, 'ws-shared');
  fs.mkdirSync(shared, { recursive: true });
  fs.writeFileSync(path.join(shared, 'version.json'), rawText, 'utf8');
}

function writeGlobalManifest(globalRoot, manifest) {
  const runtime = path.join(globalRoot, 'ws-shared', 'runtime');
  fs.mkdirSync(runtime, { recursive: true });
  fs.writeFileSync(path.join(runtime, 'skill-dependencies.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

function writePackageJson(repoRoot, version) {
  fs.writeFileSync(path.join(repoRoot, 'package.json'), JSON.stringify({ version }, null, 2), 'utf8');
}

function notesMatching(report, pattern) {
  return report && Array.isArray(report.notes) ? report.notes.filter((note) => pattern.test(note)) : [];
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

function testCoincidentRootsReportGlobal() {
  console.log('\n--- testCoincidentRootsReportGlobal ---');
  const home = mkTmp('ws-chk-coincident-');
  writeProjectHub(home);
  writeLocalSkill(home, 'ws-tdah', '0.5.35');
  const globalRoot = path.join(home, '.agents', 'skills');

  const { result, report } = detect(home, globalRoot);
  assert(result.status === 0, `coincident detect exit 0 (${result.stderr || ''})`);
  assert(report && report.installMode === 'consumer', 'coincident tree is a consumer install');
  assert(report && report.installScope !== 'hybrid', 'coincident roots never report hybrid (AC2/NS1)');
  assert(report && report.installScope === 'global', 'coincident roots report global (AC3)');
  assert(
    report && JSON.stringify(report.skillsScanRoots) === JSON.stringify(['{globalSkillsRoot}']),
    'coincident scan roots list {globalSkillsRoot} only (AC7/NS5)',
  );
  assert(
    notesMatching(report, /same directory/i).length === 1,
    'coincident report states the two roots resolve to the same directory (AC8)',
  );
  assert(
    notesMatching(report, /Hybrid install/).length === 0,
    'coincident report omits the hybrid override note (AC9/NS5)',
  );
  assert(
    report && !report.notes.some((note) => /duplicate name: entries/i.test(note)),
    'coincident report omits the duplicate name: guidance (AC9)',
  );
  assert(
    report &&
      report.evidence.globalSkills.resolved === path.resolve(globalRoot) &&
      report.evidence.globalSkills.count === report.evidence.localSkills.count,
    'evidence describes one enumerated tree, not two',
  );
}

function testTrailingSeparatorAndDotSegmentsAreSameRoot() {
  console.log('\n--- testTrailingSeparatorAndDotSegmentsAreSameRoot ---');
  const home = mkTmp('ws-chk-coincident-spelling-');
  writeLocalSkill(home, 'ws-tdah', '0.5.35');
  const variants = [
    `${path.join(home, '.agents', 'skills')}${path.sep}`,
    path.join(home, '.agents', 'skills', '..', 'skills'),
    path.join(home, '.agents', '.', 'skills'),
  ];
  for (const variant of variants) {
    const { result, report } = detect(home, variant);
    assert(
      result.status === 0 && report && report.installScope === 'global',
      `separator/dot-segment spelling resolves to the same root → global (AC10): ${variant}`,
    );
  }
}

function testCaseVariantSpellingIsSameRoot() {
  console.log('\n--- testCaseVariantSpellingIsSameRoot ---');
  const probe = mkTmp('ws-chk-case-probe-');
  fs.mkdirSync(path.join(probe, 'CaseProbe'), { recursive: true });
  const hostCaseInsensitive = fs.existsSync(path.join(probe, 'caseprobe'));
  if (!hostCaseInsensitive) {
    console.log('⏭ skipped: host filesystem is case-sensitive (AC11 assertion not applicable)');
    return;
  }
  const home = mkTmp('ws-chk-coincident-case-');
  writeLocalSkill(home, 'ws-tdah', '0.5.35');
  const globalRoot = path.join(home, '.agents', 'skills');
  const { result, report } = detect(home, globalRoot.toUpperCase());
  assert(result.status === 0, `case-variant detect exit 0 (${result.stderr || ''})`);
  assert(report && report.installScope === 'global', 'case-only spelling difference is the same root (AC11)');
  assert(report && report.installScope !== 'hybrid', 'case-only spelling difference never reports hybrid (NS2)');
}

function testMissingGlobalRootFallsBackToResolvedPath() {
  console.log('\n--- testMissingGlobalRootFallsBackToResolvedPath ---');
  const consumer = mkTmp('ws-chk-missing-global-');
  writeProjectHub(consumer);
  writeLocalSkill(consumer, 'ws-tdah', '0.5.35');
  const missing = path.join(mkTmp('ws-chk-missing-parent-'), 'not-installed');

  const { result, report } = detect(consumer, missing);
  assert(result.status === 0, `missing global root exits 0, no ENOENT (NS3) (${result.stderr || ''})`);
  assert(report && report.installScope === 'project', 'missing global root keeps local-only scope project (AC5/AC12)');
  assert(
    report && path.resolve(report.evidence.globalSkills.resolved) === path.resolve(missing),
    'uncanonicalizable root falls back to its resolved absolute path (AC12)',
  );
  assert(report && report.coexistence.globalVersion === null, 'missing global tree reports a null version');
}

function testHubVersionFileWins() {
  console.log('\n--- testHubVersionFileWins ---');
  const consumer = mkTmp('ws-chk-version-file-');
  writeProjectHub(consumer);
  writePackageJson(consumer, '0.5.37');
  writeLocalSkill(consumer, 'ws-tdah', '0.5.37');

  const globalRoot = mkTmp('ws-chk-version-file-global-');
  writeGlobalHub(globalRoot);
  writeHubVersionFile(globalRoot, JSON.stringify({ version: '9.9.9' }, null, 2));
  writeGlobalManifest(globalRoot, {
    packageVersion: '0.5.38',
    externalSkills: [{ id: 'ws-memo' }, { id: 'ws-session-tracking' }],
  });
  writeSkill(globalRoot, 'ws-memo', '0.37.1');
  writeSkill(globalRoot, 'ws-session-tracking', '0.37.1');
  writeSkill(globalRoot, 'ws-tdah', '0.4.30');

  const { result, report } = detect(consumer, globalRoot);
  assert(result.status === 0, `version-file fixture exit 0 (${result.stderr || ''})`);
  assert(report && report.evidence.globalSkills.version === '9.9.9', 'AC16: hub version file read before frontmatter');
  assert(report && report.coexistence.globalVersion === '9.9.9', 'AC17/AC29: version.json value wins over frontmatter');
  assert(report && report.coexistence.packageVersion === '0.5.37', 'package version still read from the repo package.json');
  assert(report && report.coexistence.globalVersionDrift === 'ahead', 'AC27: drift derived from the two resolved versions');
  assert(
    notesMatching(report, /differs from package/).length === 1,
    'AC25: drift is an informational note',
  );
  assert(
    report && !report.warnings.some((warning) => /differs from package|9\.9\.9/.test(warning)),
    'AC25: drift is never a warning',
  );

  const human = cp.spawnSync(process.execPath, [DETECTOR, '--repo-root', consumer], {
    cwd: consumer,
    encoding: 'utf8',
    env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot },
  });
  assert(human.status === 0, `human path exit 0 (${human.stderr || ''})`);
  assert(
    /Global skills: \d+ under \{globalSkillsRoot\} \(v9\.9\.9\)/.test(human.stdout),
    'AC18: human-readable output reports the same resolved version',
  );
}

function testHubVersionFileSameVersionReportsSame() {
  console.log('\n--- testHubVersionFileSameVersionReportsSame ---');
  const consumer = mkTmp('ws-chk-version-same-');
  writeProjectHub(consumer);
  writePackageJson(consumer, '0.5.37');
  writeLocalSkill(consumer, 'ws-tdah', '0.5.37');

  const globalRoot = mkTmp('ws-chk-version-same-global-');
  writeGlobalHub(globalRoot);
  writeHubVersionFile(globalRoot, JSON.stringify({ version: '0.5.37' }, null, 2));
  writeSkill(globalRoot, 'ws-tdah', '0.4.30');

  const { result, report } = detect(consumer, globalRoot);
  assert(result.status === 0, `same-version fixture exit 0 (${result.stderr || ''})`);
  assert(report && report.coexistence.globalVersion === '0.5.37', 'AC24: canonical version reported');
  assert(report && report.coexistence.globalVersionDrift === 'same', 'AC26: equal versions report drift same');
  assert(notesMatching(report, /differs from package/).length === 0, 'AC26: no drift note when versions match');
}

function testTruncatedVersionFileFallsBackToProjection() {
  console.log('\n--- testTruncatedVersionFileFallsBackToProjection ---');
  const consumer = mkTmp('ws-chk-version-truncated-');
  writeProjectHub(consumer);
  writePackageJson(consumer, '0.5.37');
  writeLocalSkill(consumer, 'ws-tdah', '0.5.37');

  const globalRoot = mkTmp('ws-chk-version-truncated-global-');
  writeGlobalHub(globalRoot);
  writeHubVersionFile(globalRoot, '{"version":');
  writeGlobalManifest(globalRoot, { packageVersion: '0.5.38' });
  writeSkill(globalRoot, 'ws-tdah', '0.4.30');

  const { result, report } = detect(consumer, globalRoot);
  assert(result.status === 0, `truncated version.json exits 0, no parse throw (NS8) (${result.stderr || ''})`);
  assert(report && report.coexistence.globalVersion === '0.5.38', 'AC19: falls through to the projection manifest');
  assert(report && report.evidence.globalSkills.version === '0.5.38', 'AC18/AC19: evidence field matches');
}

function testNonSemverVersionFileIsDiscarded() {
  console.log('\n--- testNonSemverVersionFileIsDiscarded ---');
  const consumer = mkTmp('ws-chk-version-nonsemver-');
  writeProjectHub(consumer);
  writePackageJson(consumer, '0.5.37');
  writeLocalSkill(consumer, 'ws-tdah', '0.5.37');

  const globalRoot = mkTmp('ws-chk-version-nonsemver-global-');
  writeGlobalHub(globalRoot);
  writeHubVersionFile(globalRoot, JSON.stringify({ version: 'not-a-semver' }, null, 2));
  writeGlobalManifest(globalRoot, { packageVersion: '0.5.38' });
  writeSkill(globalRoot, 'ws-tdah', '0.4.30');

  const { result, report } = detect(consumer, globalRoot);
  assert(result.status === 0, `non-semver fixture exit 0 (${result.stderr || ''})`);
  assert(report && report.coexistence.globalVersion === '0.5.38', 'AC20: non-semver hub value is discarded');
  assert(
    report &&
      report.coexistence.globalVersion !== 'not-a-semver' &&
      report.evidence.globalSkills.version !== 'not-a-semver',
    'AC20/NS9: the non-semver string never surfaces as the global version',
  );
}

function testExternalOnlyVersionsReportNull() {
  console.log('\n--- testExternalOnlyVersionsReportNull ---');
  const consumer = mkTmp('ws-chk-external-only-');
  writeProjectHub(consumer);
  writePackageJson(consumer, '0.5.37');
  writeLocalSkill(consumer, 'ws-tdah', '0.5.37');

  const globalRoot = mkTmp('ws-chk-external-only-global-');
  writeGlobalHub(globalRoot);
  writeGlobalManifest(globalRoot, {
    externalSkills: [{ id: 'ws-memo' }, { id: 'ws-session-tracking' }],
  });
  writeSkill(globalRoot, 'ws-memo', '0.37.1');
  writeSkill(globalRoot, 'ws-session-tracking', '0.37.1');
  writeSkill(globalRoot, 'my-activities', '1.0.0');

  const { result, report } = detect(consumer, globalRoot);
  assert(result.status === 0, `external-only fixture exit 0 (${result.stderr || ''})`);
  assert(report && report.coexistence.globalVersion === null, 'AC21/AC23: no package-owned version → null (NS10)');
  assert(report && report.coexistence.globalVersionDrift === null, 'AC23/NS10: null version leaves drift null');
  assert(report && report.evidence.globalSkills.version === null, 'AC18: evidence version is null as well');
}

function testRepresentativeProbeBeatsModalFallback() {
  console.log('\n--- testRepresentativeProbeBeatsModalFallback ---');
  const consumer = mkTmp('ws-chk-probe-');
  writeProjectHub(consumer);
  writePackageJson(consumer, '0.5.37');
  writeLocalSkill(consumer, 'ws-tdah', '0.5.37');

  const globalRoot = mkTmp('ws-chk-probe-global-');
  writeGlobalHub(globalRoot);
  writeGlobalManifest(globalRoot, {
    externalSkills: [{ id: 'ws-memo' }, { id: 'ws-session-tracking' }],
  });
  writeSkill(globalRoot, 'ws-tdah', '0.4.30');
  writeSkill(globalRoot, 'ws-memo', '0.37.1');
  writeSkill(globalRoot, 'ws-session-tracking', '0.37.1');

  const probeRun = detect(consumer, globalRoot);
  assert(
    probeRun.report && probeRun.report.coexistence.globalVersion === '0.4.30',
    'AC22: representative probe order beats the modal companion value (NS7)',
  );

  const modalRoot = mkTmp('ws-chk-probe-modal-');
  writeGlobalHub(modalRoot);
  writeGlobalManifest(modalRoot, { externalSkills: [{ id: 'ws-memo' }, { id: 'ws-session-tracking' }] });
  writeSkill(modalRoot, 'ws-plan-write', '0.4.32');
  writeSkill(modalRoot, 'ws-memo', '0.37.1');
  writeSkill(modalRoot, 'ws-session-tracking', '0.37.1');
  const modalRun = detect(consumer, modalRoot);
  assert(
    modalRun.report && modalRun.report.coexistence.globalVersion === '0.4.32',
    'AC21/AC22: modal fallback population is package-owned only',
  );
}

function testUnreadablePackageJsonLeavesDriftNull() {
  console.log('\n--- testUnreadablePackageJsonLeavesDriftNull ---');
  const consumer = mkTmp('ws-chk-no-package-json-');
  writeProjectHub(consumer);
  writeLocalSkill(consumer, 'ws-tdah', '0.5.37');

  const globalRoot = mkTmp('ws-chk-no-package-json-global-');
  writeGlobalHub(globalRoot);
  writeHubVersionFile(globalRoot, JSON.stringify({ version: '9.9.9' }, null, 2));

  const { result, report } = detect(consumer, globalRoot);
  assert(result.status === 0, `unreadable package.json exits 0 (NS12) (${result.stderr || ''})`);
  assert(report && report.coexistence.packageVersion === null, 'package version is null without package.json');
  assert(report && report.coexistence.globalVersion === '9.9.9', 'global version still resolves from the hub file');
  assert(report && report.coexistence.globalVersionDrift === null, 'AC23/NS12: drift stays null, no fabricated direction');
  assert(notesMatching(report, /differs from package/).length === 0, 'NS12: no misleading drift note');
}

function testSkillIdGuardRejectsEscapingFolder() {
  console.log('\n--- testSkillIdGuardRejectsEscapingFolder ---');
  const consumer = mkTmp('ws-chk-id-guard-');
  writeProjectHub(consumer);
  writePackageJson(consumer, '0.5.37');
  writeLocalSkill(consumer, 'ws-tdah', '0.5.37');

  const globalRoot = mkTmp('ws-chk-id-guard-global-');
  writeGlobalHub(globalRoot);
  writeSkill(globalRoot, 'ws-..escape', '9.9.9');
  writeSkill(globalRoot, 'ws-tdah', '0.4.30');

  const { result, report } = detect(consumer, globalRoot);
  assert(result.status === 0, `escape-id fixture exit 0 (${result.stderr || ''})`);
  assert(
    report && report.evidence.globalSkills.count === 1,
    'AC28/N11: the SKILL_ID_RE listing guard still rejects a traversal-shaped folder',
  );
  assert(
    report && report.coexistence.globalVersion === '0.4.30',
    'AC28/N11: the rejected folder never feeds version resolution',
  );
}

function testHybridDistinctRootsDocumented() {
  console.log('\n--- testHybridDistinctRootsDocumented ---');
  for (const rel of [
    '.agents/skills/ws-check-harness/SKILL.md',
    '.agents/skills/ws-check-harness/PHASES.md',
  ]) {
    const text = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    assert(
      text.includes('**different** directories') && /hybrid/.test(text),
      `AC15: ${rel} states hybrid requires different local and global skills-root directories`,
    );
  }
}

function main() {
  testUpstreamWithGlobalCoexistence();
  testMarkersWithoutSotFallsBackToGlobal();
  testProjectAndHybridScopes();
  testGlobalOnlyScope();
  testNoSkills();
  testCorruptManifestEmitsWarning();
  testCurrentRepoIsUpstream();
  testCoincidentRootsReportGlobal();
  testTrailingSeparatorAndDotSegmentsAreSameRoot();
  testCaseVariantSpellingIsSameRoot();
  testMissingGlobalRootFallsBackToResolvedPath();
  testHubVersionFileWins();
  testHubVersionFileSameVersionReportsSame();
  testTruncatedVersionFileFallsBackToProjection();
  testNonSemverVersionFileIsDiscarded();
  testExternalOnlyVersionsReportNull();
  testRepresentativeProbeBeatsModalFallback();
  testUnreadablePackageJsonLeavesDriftNull();
  testSkillIdGuardRejectsEscapingFolder();
  testHybridDistinctRootsDocumented();
  cleanup();
  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll check-harness install-mode tests passed.');
}

main();
