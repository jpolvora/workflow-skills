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

function main() {
  console.log('Running ws-doctor thin smoke tests...');
  try {
    testDoctorExistsAndSyntax();
    testHelp();
    testJsonReportShape();
    testMissingConfigDoesNotInventValues();
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
