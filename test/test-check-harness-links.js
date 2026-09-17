/**
 * ws-check-harness link gate tests (safe percent-decode fallback, resolved-hub routing coverage).
 * Run: node test/test-check-harness-links.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join(REPO_ROOT, '.agents', 'skills', 'ws-check-harness', 'scripts', 'check_harness_links.cjs');

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

function check(repoRoot) {
  const result = cp.spawnSync(process.execPath, [CHECKER, '--json', '--repo-root', repoRoot], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  return { result, report };
}

function testPercentTargetReportsInsteadOfCrashing() {
  console.log('\n--- testPercentTargetReportsInsteadOfCrashing ---');
  const fixture = mkTmp('ws-chk-links-pct-');
  fs.writeFileSync(path.join(fixture, 'AGENTS.md'), '# hub\n\nSee [doc](docs/100%-coverage.md).\n', 'utf8');
  fs.mkdirSync(path.join(fixture, '.agents', 'skills'), { recursive: true });

  const { result, report } = check(fixture);
  assert(result.status === 1, `bare % target exits 1 as a finding (${result.stderr || ''})`);
  assert(
    report && (report.findings.brokenLinks || []).some((row) => row.file === 'AGENTS.md' && /100%/.test(row.target)),
    'bare % target reported in brokenLinks with valid JSON output',
  );
}

function testResolvedHubCountsForRouting() {
  console.log('\n--- testResolvedHubCountsForRouting ---');
  const fixture = mkTmp('ws-chk-links-hub-');
  fs.writeFileSync(path.join(fixture, 'AGENTS.md'), '# root hub\n', 'utf8');
  const skillDir = path.join(fixture, '.agents', 'skills', 'ws-foo');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: ws-foo\n---\n\n# ws-foo\n', 'utf8');
  const sharedDir = path.join(fixture, '.agents', 'skills', 'ws-shared');
  fs.mkdirSync(sharedDir, { recursive: true });
  fs.writeFileSync(
    path.join(sharedDir, 'AGENTS.md'),
    '# shared hub\n\n| `ws-foo` | `.agents/skills/ws-foo/SKILL.md` | fixture |\n',
    'utf8',
  );

  const { result, report } = check(fixture);
  assert(result.status === 0, `hub-only routing exits 0 (${result.stderr || JSON.stringify(report && report.findings)})`);
  assert(report && (report.findings.unrouted || []).length === 0, 'skill routed only via ws-shared hub is not unrouted');
}

function main() {
  testPercentTargetReportsInsteadOfCrashing();
  testResolvedHubCountsForRouting();
  cleanup();
  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll check-harness link gate tests passed.');
}

main();
