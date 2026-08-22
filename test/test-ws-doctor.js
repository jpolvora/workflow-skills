/**
 * Thin smoke for ws-doctor (AC2–AC7 where cheap).
 * Run: node test/test-ws-doctor.js
 *
 * Full install/harness/integrity coverage stays with T5 `npm run test` +
 * ws-check-harness — this module only asserts script presence, syntax,
 * --json report shape, and missing-config does not invent values.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DOCTOR = path.join(
  REPO_ROOT,
  '.agents/skills/ws-doctor/scripts/doctor.js',
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

function run(cmd, args, opts = {}) {
  return cp.spawnSync(cmd, args, {
    cwd: opts.cwd || REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...(opts.env || {}) },
  });
}

function expectedSectionKeys(sections) {
  return (
    sections &&
    typeof sections === 'object' &&
    Object.prototype.hasOwnProperty.call(sections, 'pathErrors') &&
    Object.prototype.hasOwnProperty.call(sections, 'toolScriptDiagnostics') &&
    Object.prototype.hasOwnProperty.call(sections, 'configuration') &&
    Object.prototype.hasOwnProperty.call(sections, 'missingReferences')
  );
}

function testDoctorExistsAndSyntax() {
  console.log('\n--- testDoctorExistsAndSyntax ---');
  assert(fs.existsSync(DOCTOR), 'doctor.js exists under ws-doctor/scripts');
  const check = run('node', ['--check', DOCTOR]);
  assert(
    check.status === 0,
    `node --check doctor.js exits 0 (got ${check.status}): ${(check.stderr || check.stdout || '').trim()}`,
  );
}

function testHelp() {
  console.log('\n--- testHelp ---');
  const r = run('node', [DOCTOR, '--help']);
  assert(r.status === 0, `--help exits 0 (got ${r.status})`);
  assert(
    /Usage:.*doctor\.js/i.test(r.stdout || ''),
    '--help prints usage mentioning doctor.js',
  );
}

function testJsonReportShape() {
  console.log('\n--- testJsonReportShape ---');
  const r = run('node', [DOCTOR, '--json', '--skill', 'ws-doctor']);
  assert(r.status === 0, `--json --skill ws-doctor exits 0 (got ${r.status}): ${(r.stderr || '').trim()}`);

  let report = null;
  try {
    report = JSON.parse((r.stdout || '').trim());
  } catch (err) {
    fail(`--json stdout is parseable JSON: ${err.message}`);
    return;
  }
  ok('--json stdout is parseable JSON');
  assert(report.tool === 'ws-doctor', 'report.tool is ws-doctor');
  assert(report.readOnly === true, 'report.readOnly is true');
  assert(expectedSectionKeys(report.sections), 'sections has pathErrors, toolScriptDiagnostics, configuration, missingReferences');
  assert(
    report.meta && typeof report.meta.projectRoot === 'string',
    'meta.projectRoot present',
  );
}

function testMissingConfigDoesNotInventValues() {
  console.log('\n--- testMissingConfigDoesNotInventValues ---');
  const root = mkTmp('ws-doctor-missing-cfg-');
  // Local package.json so Node treats copied doctor.js as ESM without warnings.
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}\n', 'utf8');
  const skillsRoot = path.join(root, '.agents', 'skills');
  const skillDir = path.join(skillsRoot, 'ws-doctor');
  const scriptsDir = path.join(skillDir, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  // Stub skill only — no ws-shared/config.json
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    '# ws-doctor\n\nStub for missing-config smoke.\n',
    'utf8',
  );
  fs.copyFileSync(DOCTOR, path.join(scriptsDir, 'doctor.js'));

  const marker = path.join(skillsRoot, '.doctor-readonly-marker');
  fs.writeFileSync(marker, 'untouched\n', 'utf8');
  const before = listRelFiles(skillsRoot);

  const r = run('node', [path.join(scriptsDir, 'doctor.js'), '--json', '--skill', 'ws-doctor'], {
    cwd: root,
  });
  if (r.status !== 0) {
    fail(
      `missing-config doctor exits 0 (got ${r.status}): ${(r.stderr || r.stdout || '').trim()}`,
    );
  } else {
    ok('missing-config doctor exits 0');
  }

  let report = null;
  try {
    report = JSON.parse((r.stdout || '').trim());
  } catch (err) {
    fail(`missing-config --json parseable: ${err.message}`);
    return;
  }
  ok('missing-config --json parseable');

  const cfg = report.sections && report.sections.configuration;
  assert(cfg && cfg.available === false, 'configuration.available is false when config.json missing');
  assert(cfg.summary === null, 'configuration.summary is null (no invented values)');
  assert(
    cfg.reason === 'missing' || /missing/i.test(String(cfg.reason || '')),
    `configuration.reason reflects missing (got ${JSON.stringify(cfg.reason)})`,
  );
  assert(
    /ws-configure-project/i.test(String(cfg.recommendation || '')),
    'recommendation mentions ws-configure-project',
  );
  assert(
    !fs.existsSync(path.join(root, '.agents', 'skills', 'ws-shared', 'config.json')),
    'doctor did not create config.json',
  );

  const after = listRelFiles(skillsRoot);
  assert(
    JSON.stringify(before) === JSON.stringify(after),
    'skills tree file list unchanged after doctor (read-only)',
  );
  assert(
    fs.readFileSync(marker, 'utf8') === 'untouched\n',
    'readonly marker file content unchanged',
  );
}

function listRelFiles(dir) {
  const out = [];
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      const rel = path.relative(dir, full).split(path.sep).join('/');
      if (ent.isDirectory()) walk(full);
      else out.push(rel);
    }
  }
  walk(dir);
  out.sort();
  return out;
}

function runDoctorJson(args, opts = {}) {
  const doctorPath = opts.doctor || DOCTOR;
  const r = run('node', [doctorPath, '--json', ...args], opts);
  if (r.status !== 0) {
    return { ok: false, error: (r.stderr || r.stdout || '').trim(), report: null };
  }
  try {
    return { ok: true, report: JSON.parse((r.stdout || '').trim()), error: null };
  } catch (err) {
    return { ok: false, error: err.message, report: null };
  }
}

function citedMatches(findings, pattern) {
  if (!Array.isArray(findings)) return false;
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  return findings.some((f) => re.test(String(f.cited || '')));
}

function setupTmpDoctorProject(root) {
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}\n', 'utf8');
  const skillsRoot = path.join(root, '.agents', 'skills');
  const sharedDir = path.join(skillsRoot, 'ws-shared');
  fs.mkdirSync(sharedDir, { recursive: true });
  const doctorDir = path.join(skillsRoot, 'ws-doctor');
  const scriptsDir = path.join(doctorDir, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.writeFileSync(path.join(doctorDir, 'SKILL.md'), '# ws-doctor\n', 'utf8');
  fs.copyFileSync(DOCTOR, path.join(scriptsDir, 'doctor.js'));
  return {
    skillsRoot,
    sharedDir,
    doctorScript: path.join(scriptsDir, 'doctor.js'),
  };
}

function testGithubCanonicalRegisterRowHasNodeLauncher() {
  console.log('\n--- testGithubCanonicalRegisterRowHasNodeLauncher ---');
  const skillPath = path.join(REPO_ROOT, '.agents/skills/ws-github-provider/SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf8');
  const expected =
    '`node {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.cjs --source github`';
  assert(content.includes(expected), 'GitHub Canonical scripts row has Node launcher prefix');
  assert(
    !content.includes(
      '| Spec of record → workflow copy | `{skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.cjs --source github` |',
    ),
    'GitHub Canonical scripts row no longer has unprefixed launcher cell',
  );
}

function testAzureCanonicalRegisterRowHasNodeLauncher() {
  console.log('\n--- testAzureCanonicalRegisterRowHasNodeLauncher ---');
  const skillPath = path.join(REPO_ROOT, '.agents/skills/ws-azure-devops-provider/SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf8');
  const expected =
    '`node {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.cjs --source azure-devops`';
  assert(content.includes(expected), 'Azure Canonical scripts row has Node launcher prefix');
  assert(
    !content.includes(
      '| Spec of record → workflow copy | `{skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.cjs --source azure-devops` |',
    ),
    'Azure Canonical scripts row no longer has unprefixed launcher cell',
  );
}

function testProviderRegisterRowsNotMissingLaunchers() {
  console.log('\n--- testProviderRegisterRowsNotMissingLaunchers ---');
  for (const skillId of ['ws-github-provider', 'ws-azure-devops-provider']) {
    const { ok, report, error } = runDoctorJson(['--skill', skillId]);
    assert(ok, `${skillId} --json exits 0: ${error || ''}`);
    if (!report) continue;
    const ml = report.sections.toolScriptDiagnostics.missingLaunchers || [];
    assert(
      !citedMatches(ml, /register_local_spec\.cjs --source (github|azure-devops)/),
      `${skillId} missingLaunchers does not include register_local_spec.cjs --source rows`,
    );
  }
}

function testSkillFolderDocsFileRelative() {
  console.log('\n--- testSkillFolderDocsFileRelative ---');
  const root = mkTmp('ws-doctor-skill-docs-');
  const { skillsRoot, doctorScript } = setupTmpDoctorProject(root);
  const fixtureDir = path.join(skillsRoot, 'ws-fixture');
  fs.mkdirSync(path.join(fixtureDir, 'docs'), { recursive: true });
  fs.writeFileSync(
    path.join(fixtureDir, 'README.md'),
    '# Fixture\n\nSee [faq](docs/faq.md).\n',
    'utf8',
  );
  fs.writeFileSync(path.join(fixtureDir, 'docs', 'faq.md'), '# FAQ\n', 'utf8');
  fs.writeFileSync(path.join(fixtureDir, 'SKILL.md'), '# ws-fixture\n', 'utf8');

  const { ok, report, error } = runDoctorJson(['--skill', 'ws-fixture'], {
    cwd: root,
    doctor: doctorScript,
  });
  assert(ok, `fixture skill --json exits 0: ${error || ''}`);
  if (!report) return;
  const pe = report.sections.pathErrors || [];
  const mr = report.sections.missingReferences || [];
  assert(
    !citedMatches(pe, /docs\/faq\.md/) && !citedMatches(mr, /docs\/faq\.md/),
    'skill-folder docs/faq.md resolves file-relative when companion exists under skill',
  );
}

function testSkillFolderDocsDoesNotUseProjectRoot() {
  console.log('\n--- testSkillFolderDocsDoesNotUseProjectRoot ---');
  const root = mkTmp('ws-doctor-skill-docs-trap-');
  const { skillsRoot, doctorScript } = setupTmpDoctorProject(root);
  const fixtureDir = path.join(skillsRoot, 'ws-fixture');
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(
    path.join(fixtureDir, 'README.md'),
    '# Fixture\n\nSee [faq](docs/faq.md).\n',
    'utf8',
  );
  fs.writeFileSync(path.join(fixtureDir, 'SKILL.md'), '# ws-fixture\n', 'utf8');
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'faq.md'), '# Project FAQ\n', 'utf8');

  const { ok, report, error } = runDoctorJson(['--skill', 'ws-fixture'], {
    cwd: root,
    doctor: doctorScript,
  });
  assert(ok, `fixture trap --json exits 0: ${error || ''}`);
  if (!report) return;
  const pe = report.sections.pathErrors || [];
  const mr = report.sections.missingReferences || [];
  assert(
    citedMatches(pe, /docs\/faq\.md/) || citedMatches(mr, /docs\/faq\.md/),
    'skill-folder docs/faq.md still missing when only project-root docs/faq.md exists',
  );
}

function testHubDocsStaysProjectRoot() {
  console.log('\n--- testHubDocsStaysProjectRoot ---');
  const root = mkTmp('ws-doctor-hub-docs-');
  const { sharedDir, doctorScript } = setupTmpDoctorProject(root);
  fs.writeFileSync(
    path.join(sharedDir, 'AGENTS.md'),
    '# Hub\n\nCatalog: [catalog](docs/catalog.md).\n',
    'utf8',
  );
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'catalog.md'), '# Catalog\n', 'utf8');

  const { ok, report, error } = runDoctorJson([], { cwd: root, doctor: doctorScript });
  assert(ok, `hub docs diagnose --json exits 0: ${error || ''}`);
  if (!report) return;
  const pe = report.sections.pathErrors || [];
  const mr = report.sections.missingReferences || [];
  assert(
    !citedMatches(pe, /docs\/catalog\.md/) && !citedMatches(mr, /docs\/catalog\.md/),
    'hub AGENTS.md docs/catalog.md resolves against project root when companion exists',
  );
}

function testLiveSpecToPrDocsFaqNotMissing() {
  console.log('\n--- testLiveSpecToPrDocsFaqNotMissing ---');
  const faqPath = path.join(REPO_ROOT, '.agents/skills/ws-spec-to-pr/docs/faq.md');
  assert(fs.existsSync(faqPath), 'live ws-spec-to-pr/docs/faq.md exists for AC6');
  const { ok, report, error } = runDoctorJson(['--skill', 'ws-spec-to-pr']);
  assert(ok, `live ws-spec-to-pr --json exits 0: ${error || ''}`);
  if (!report) return;
  const pe = report.sections.pathErrors || [];
  const mr = report.sections.missingReferences || [];
  assert(
    !citedMatches(pe, /^docs\/faq\.md$/) && !citedMatches(mr, /^docs\/faq\.md$/),
    'live ws-spec-to-pr does not report docs/faq.md missing when skill companion exists',
  );
}

function testGlobalSkillFolderDocsFileRelative() {
  console.log('\n--- testGlobalSkillFolderDocsFileRelative ---');
  const project = mkTmp('ws-doctor-global-proj-');
  const globalRoot = mkTmp('ws-doctor-global-skills-');
  const { doctorScript } = setupTmpDoctorProject(project);
  const fixtureDir = path.join(globalRoot, 'ws-fixture');
  fs.mkdirSync(path.join(fixtureDir, 'docs'), { recursive: true });
  fs.writeFileSync(
    path.join(fixtureDir, 'README.md'),
    '# Fixture\n\nSee [faq](docs/faq.md).\n',
    'utf8',
  );
  fs.writeFileSync(path.join(fixtureDir, 'docs', 'faq.md'), '# FAQ\n', 'utf8');
  fs.writeFileSync(path.join(fixtureDir, 'SKILL.md'), '# ws-fixture\n', 'utf8');

  const { ok: exitedOk, report, error } = runDoctorJson(['--skill', 'ws-fixture'], {
    cwd: project,
    doctor: doctorScript,
    env: { WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot },
  });
  assert(exitedOk, `global skill --json exits 0: ${error || ''}`);
  if (!report) return;
  const pe = report.sections.pathErrors || [];
  const mr = report.sections.missingReferences || [];
  assert(
    !citedMatches(pe, /docs\/faq\.md/) && !citedMatches(mr, /docs\/faq\.md/),
    'global-skill docs/faq.md resolves file-relative when companion exists under global skill',
  );
}

function testGlobalSkillFolderDocsDoesNotUseProjectRoot() {
  console.log('\n--- testGlobalSkillFolderDocsDoesNotUseProjectRoot ---');
  const project = mkTmp('ws-doctor-global-trap-');
  const globalRoot = mkTmp('ws-doctor-global-trap-skills-');
  const { doctorScript } = setupTmpDoctorProject(project);
  const fixtureDir = path.join(globalRoot, 'ws-fixture');
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(
    path.join(fixtureDir, 'README.md'),
    '# Fixture\n\nSee [faq](docs/faq.md).\n',
    'utf8',
  );
  fs.writeFileSync(path.join(fixtureDir, 'SKILL.md'), '# ws-fixture\n', 'utf8');
  fs.mkdirSync(path.join(project, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(project, 'docs', 'faq.md'), '# Project FAQ\n', 'utf8');

  const { ok: exitedOk, report, error } = runDoctorJson(['--skill', 'ws-fixture'], {
    cwd: project,
    doctor: doctorScript,
    env: { WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot },
  });
  assert(exitedOk, `global trap --json exits 0: ${error || ''}`);
  if (!report) return;
  const pe = report.sections.pathErrors || [];
  const mr = report.sections.missingReferences || [];
  assert(
    citedMatches(pe, /docs\/faq\.md/) || citedMatches(mr, /docs\/faq\.md/),
    'global-skill docs/faq.md still missing when only project-root docs/faq.md exists',
  );
}

function testSkillFolderBacktickDocsFallsBackToProjectRoot() {
  console.log('\n--- testSkillFolderBacktickDocsFallsBackToProjectRoot ---');
  const root = mkTmp('ws-doctor-skill-docs-prose-');
  const { skillsRoot, doctorScript } = setupTmpDoctorProject(root);
  const fixtureDir = path.join(skillsRoot, 'ws-fixture');
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(
    path.join(fixtureDir, 'PHASES.md'),
    '# Phases\n\nSearch: `docs/specs/`, `docs/testing/`, `docs/faq.md`.\n',
    'utf8',
  );
  fs.writeFileSync(path.join(fixtureDir, 'SKILL.md'), '# ws-fixture\n', 'utf8');
  fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'testing'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'faq.md'), '# Project FAQ\n', 'utf8');

  const { ok, report, error } = runDoctorJson(['--skill', 'ws-fixture'], {
    cwd: root,
    doctor: doctorScript,
  });
  assert(ok, `fixture prose fallback --json exits 0: ${error || ''}`);
  if (!report) return;
  const pe = report.sections.pathErrors || [];
  const mr = report.sections.missingReferences || [];
  for (const cited of [/docs\/specs\//, /docs\/testing\//, /docs\/faq\.md/]) {
    assert(
      !citedMatches(pe, cited) && !citedMatches(mr, cited),
      `skill-folder backtick ${cited} accepted when project-root docs exist`,
    );
  }
}

function testSkillFolderDocsCompanionsWhenPresent() {
  console.log('\n--- testSkillFolderDocsCompanionsWhenPresent ---');
  const root = mkTmp('ws-doctor-skill-docs-companions-');
  const { skillsRoot, doctorScript } = setupTmpDoctorProject(root);
  const fixtureDir = path.join(skillsRoot, 'ws-fixture');
  fs.mkdirSync(path.join(fixtureDir, 'docs', 'specs'), { recursive: true });
  fs.mkdirSync(path.join(fixtureDir, 'docs', 'testing'), { recursive: true });
  fs.writeFileSync(path.join(fixtureDir, 'docs', 'faq.md'), '# FAQ\n', 'utf8');
  fs.writeFileSync(
    path.join(fixtureDir, 'PHASES.md'),
    '# Phases\n\nRefs: `docs/specs/`, `docs/testing/`, `docs/faq.md`.\n',
    'utf8',
  );
  fs.writeFileSync(path.join(fixtureDir, 'SKILL.md'), '# ws-fixture\n', 'utf8');

  const { ok, report, error } = runDoctorJson(['--skill', 'ws-fixture'], {
    cwd: root,
    doctor: doctorScript,
  });
  assert(ok, `fixture companions --json exits 0: ${error || ''}`);
  if (!report) return;
  const pe = report.sections.pathErrors || [];
  const mr = report.sections.missingReferences || [];
  for (const cited of [/docs\/specs\//, /docs\/testing\//, /docs\/faq\.md/]) {
    assert(
      !citedMatches(pe, cited) && !citedMatches(mr, cited),
      `skill-folder companion ${cited} not reported missing when present`,
    );
  }
}

function main() {
  console.log('Running ws-doctor thin smoke tests...');
  try {
    testDoctorExistsAndSyntax();
    testHelp();
    testJsonReportShape();
    testMissingConfigDoesNotInventValues();
    testGithubCanonicalRegisterRowHasNodeLauncher();
    testAzureCanonicalRegisterRowHasNodeLauncher();
    testProviderRegisterRowsNotMissingLaunchers();
    testSkillFolderDocsFileRelative();
    testSkillFolderDocsDoesNotUseProjectRoot();
    testHubDocsStaysProjectRoot();
    testLiveSpecToPrDocsFaqNotMissing();
    testSkillFolderDocsCompanionsWhenPresent();
    testSkillFolderBacktickDocsFallsBackToProjectRoot();
    testGlobalSkillFolderDocsFileRelative();
    testGlobalSkillFolderDocsDoesNotUseProjectRoot();
  } finally {
    cleanup();
  }

  console.log('');
  if (failures > 0) {
    console.error(`ws-doctor smoke: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('ws-doctor smoke: all passed');
}

main();
