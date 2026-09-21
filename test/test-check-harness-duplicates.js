/**
 * check_duplicates.cjs gate tests (global-only install path safety).
 *
 * The gate audits the resolved skills root, which is outside the repository for
 * a global-only install. Reporting must not throw "Path is outside repository"
 * and must keep occurrence paths resolvable.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join(
  REPO_ROOT,
  '.agents',
  'skills',
  'ws-check-harness',
  'scripts',
  'check_duplicates.cjs',
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
      // ignore
    }
  }
}

const DUPLICATE_BLOCK = [
  'The gate must always run.',
  'It must never be skipped.',
  'The gate is required.',
  'Do not bypass it.',
  'Always report findings.',
  'It shall stay deterministic.',
].join('\n');

function testGlobalOnlyDoesNotThrow() {
  console.log('\n--- testGlobalOnlyDoesNotThrow ---');
  const fixture = mkTmp('ws-dup-global-');
  const globalRoot = mkTmp('ws-dup-globalroot-');
  fs.writeFileSync(path.join(fixture, 'AGENTS.md'), '# hub\n', 'utf8');
  for (const id of ['ws-demo-a', 'ws-demo-b']) {
    const dir = path.join(globalRoot, id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `# ${id}\n\n${DUPLICATE_BLOCK}\n`, 'utf8');
  }

  const result = cp.spawnSync(process.execPath, [CHECKER, '--json', '--repo-root', fixture], {
    cwd: fixture,
    encoding: 'utf8',
    env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot },
  });
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  assert(
    report !== null,
    `global-only run emits JSON instead of aborting (stderr: ${result.stderr || ''})`,
  );
  if (!report) return;
  assert(result.status === 1, 'duplicate normative block in the global install exits 1');
  assert(report.filesScanned >= 2, 'global-only run scans the installed skill files');
  assert((report.duplicates || []).length >= 1, 'duplicate across two global skills is reported');
  const occurrences = (report.duplicates[0] && report.duplicates[0].occurrences) || [];
  assert(occurrences.length === 2, 'both global occurrences are recorded');
  assert(
    occurrences.every((row) => fs.existsSync(path.resolve(fixture, row.path))),
    'outside-repo occurrence paths stay resolvable from repoRoot',
  );
}

function testUnrelatedSkillNotScanned() {
  console.log('\n--- testUnrelatedSkillNotScanned ---');
  const fixture = mkTmp('ws-dup-unrelated-');
  fs.writeFileSync(path.join(fixture, 'AGENTS.md'), '# hub\n', 'utf8');
  for (const id of ['custom-skill-a', 'custom-skill-b']) {
    const dir = path.join(fixture, '.agents', 'skills', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `# ${id}\n\n${DUPLICATE_BLOCK}\n`, 'utf8');
  }

  const result = cp.spawnSync(process.execPath, [CHECKER, '--json', '--repo-root', fixture], {
    cwd: fixture,
    encoding: 'utf8',
  });
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  assert(report !== null, 'unrelated-skill fixture emits JSON');
  if (report) {
    assert(result.status === 0, 'unrelated non-ws skills are not package content (exit 0)');
    assert((report.duplicates || []).length === 0, 'no duplicate reported for unrelated skills');
  }
}

function main() {
  testGlobalOnlyDoesNotThrow();
  testUnrelatedSkillNotScanned();
  cleanup();
  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll check-harness duplicates gate tests passed.');
}

main();
