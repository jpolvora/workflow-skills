/**
 * Upstream harness self-audit — proves a clean run at the package root.
 * Deterministic subset of ws-check-harness Phases 0–5c + integrity gate.
 * Run: node test/test-harness-clean.js [--report <path>]
 */
import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS = path.join(REPO_ROOT, '.agents', 'skills', 'ws-check-harness', 'scripts');

const argv = process.argv.slice(2);
let reportPath = null;
for (let index = 0; index < argv.length; index += 1) {
  if (argv[index] === '--report') reportPath = argv[++index];
  else {
    console.error(`unknown argument: ${argv[index]}`);
    process.exit(2);
  }
}

function run(cmd, args, { allowFailure = true } = {}) {
  const result = cp.spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    timeout: 120000,
  });
  if (!allowFailure && result.status !== 0) {
    console.error(result.stdout || '');
    console.error(result.stderr || '');
    process.exit(result.status || 1);
  }
  return result;
}

const checks = [];

function record(name, passed, detail) {
  checks.push({ name, passed, detail });
  console.log(`${passed ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function runGate(name, script, args) {
  const result = run(process.execPath, [path.join(SKILLS, script), ...args]);
  let detail = '';
  try {
    const payload = JSON.parse(result.stdout);
    if (typeof payload.ok === 'boolean') detail = payload.ok ? 'ok' : 'findings present';
  } catch {
    detail = (result.stderr || '').split(/\r?\n/)[0].slice(0, 160);
  }
  record(name, result.status === 0, detail);
  return result;
}

function testInstallMode() {
  const result = run(process.execPath, [path.join(SKILLS, 'detect_install_mode.cjs'), '--json', '--repo-root', REPO_ROOT]);
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  const ok =
    result.status === 0 &&
    report &&
    report.installMode === 'upstream' &&
    report.installScope === 'upstream' &&
    (report.warnings || []).length === 0;
  record(
    'Phase 0 install mode/scope detection',
    ok,
    report
      ? `mode=${report.installMode} scope=${report.installScope} roots=${report.skillsScanRoots.join('+')} global=${report.coexistence.globalPresent}`
      : result.stderr,
  );
  return report;
}

function testPackageHygiene() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const deps = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'bin', 'skill-dependencies.json'), 'utf8'));
  record(
    'packageVersion aligned (package.json == bin/skill-dependencies.json)',
    pkg.version === deps.packageVersion,
    `package=${pkg.version} manifest=${deps.packageVersion}`,
  );
  const integrity = run(process.execPath, [path.join(REPO_ROOT, 'bin', 'generate-skill-integrity.js'), '--check']);
  record('Phase 3 integrity manifest', integrity.status === 0, (integrity.stdout || integrity.stderr || '').trim().slice(0, 120));
}

function writeReport(mode, allPassed) {
  if (!reportPath) return;
  const version = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version;
  const lines = [
    '# Upstream harness self-audit report',
    '',
    `- Date: ${new Date().toISOString()}`,
    `- Package: workflow-skills v${version}`,
    `- Install mode: ${mode ? `${mode.installMode}/${mode.installScope}` : 'unknown'}`,
    `- Skills scan roots: ${mode ? mode.skillsScanRoots.join(', ') : 'unknown'}`,
    `- Global coexistence: ${mode && mode.coexistence.globalPresent ? `${mode.coexistence.globalSkillCount} skills v${mode.coexistence.globalVersion} (drift: ${mode.coexistence.globalVersionDrift})` : 'none'}`,
    `- Result: ${allPassed ? 'CLEAN — 0 findings' : 'FINDINGS PRESENT'}`,
    '',
    '| Check | Result | Detail |',
    '|-------|--------|--------|',
    ...checks.map((check) => `| ${check.name} | ${check.passed ? 'pass' : 'fail'} | ${String(check.detail || '').replace(/\|/g, '/')} |`),
    '',
  ];
  const absolute = path.resolve(REPO_ROOT, reportPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Report written: ${reportPath}`);
}

const mode = testInstallMode();
runGate('Phase 5a check_duplicates.cjs', 'check_duplicates.cjs', ['--json', '--repo-root', REPO_ROOT]);
runGate('Phase 5a measure_harness.cjs', 'measure_harness.cjs', ['--scenario', 'standard', '--json', '--repo-root', REPO_ROOT]);
runGate('Phase 5a check_shell_quoting.cjs', 'check_shell_quoting.cjs', ['--json', '--repo-root', REPO_ROOT]);
runGate('Phase 5a check_pipeline_handoff.cjs', 'check_pipeline_handoff.cjs', ['--json', '--repo-root', REPO_ROOT]);
runGate('Phase 2/4 links, paths, shorthand, routing', 'check_harness_links.cjs', ['--json', '--repo-root', REPO_ROOT]);
testPackageHygiene();

const failed = checks.filter((check) => !check.passed);
writeReport(mode, failed.length === 0);
if (failed.length > 0) {
  console.error(`\n${failed.length} harness self-audit failure(s)`);
  process.exit(1);
}
console.log('\nHarness OK (upstream clean) — 0 findings.');
