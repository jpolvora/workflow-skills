/**
 * Phase 5a skill-load gate tests (0136 AC8): divergent raw skill-load recipes
 * fail, canonical delegations and informational mentions pass.
 * Run: node test/test-check-skill-load.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join(REPO_ROOT, '.agents', 'skills', 'ws-check-harness', 'scripts', 'check_skill_load.cjs');

let failures = 0;
const tmpRoots = [];

function fail(msg) {
  console.error(`FAIL ${msg}`);
  failures += 1;
}

function ok(msg) {
  console.log(`OK ${msg}`);
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

function writeSkillBody(fixture, skillId, body) {
  const dir = path.join(fixture, '.agents', 'skills', skillId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), body, 'utf8');
}

function check(fixture, extraEnv = {}) {
  const emptyGlobal = mkTmp('ws-chk-load-emptyglobal-');
  const result = cp.spawnSync(process.execPath, [CHECKER, '--json', '--repo-root', fixture], {
    cwd: fixture,
    encoding: 'utf8',
    env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: emptyGlobal, ...extraEnv },
  });
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  return { result, report };
}

// F1: raw `Read` + SKILL.md recipe fails, naming file, line, and pattern.
{
  const fixture = mkTmp('ws-chk-load-f1-');
  writeSkillBody(fixture, 'ws-demo', '---\nname: ws-demo\n---\n\n# ws-demo\n\nFirst `Read` the `ws-other/SKILL.md` body, then act.\n');
  const { result, report } = check(fixture);
  assert(result.status === 1, 'F1 raw Read recipe exits 1');
  assert(
    report && report.findings.length === 1
      && /ws-demo\/SKILL\.md$/.test(report.findings[0].file)
      && report.findings[0].line === 7
      && report.findings[0].pattern === 'F1',
    'F1 finding names file, line, and pattern',
  );
}

// F2: raw `Read {skillsRoot}/ws-…` path recipe fails.
{
  const fixture = mkTmp('ws-chk-load-f2-');
  writeSkillBody(fixture, 'ws-demo', '# ws-demo\n\nRead {skillsRoot}/ws-other/SKILL.md before dispatch.\n');
  const { result, report } = check(fixture);
  assert(result.status === 1, 'F2 raw path recipe exits 1');
  assert(report && report.findings.some((f) => f.pattern === 'F2'), 'F2 pattern reported');
}

// F3: raw `load {skillsRoot}/ws-……SKILL.md` fails.
{
  const fixture = mkTmp('ws-chk-load-f3-');
  writeSkillBody(fixture, 'ws-demo', '# ws-demo\n\nResume via load {skillsRoot}/ws-other/SKILL.md now.\n');
  const { result, report } = check(fixture);
  assert(result.status === 1, 'F3 raw load-by-path exits 1');
  assert(report && report.findings.some((f) => f.pattern === 'F3'), 'F3 pattern reported');
}

// Pass: cross-links, prohibitions, {skillLoader} delegation, already-loaded shorthand.
{
  const fixture = mkTmp('ws-chk-load-pass-');
  writeSkillBody(
    fixture,
    'ws-demo',
    '# ws-demo\n\n'
      + 'See [ws-other](../ws-other/SKILL.md) for the contract.\n\n'
      + 'Do not load `ws-bench` during this workflow.\n\n'
      + 'Load `ws-other` via `{skillLoader}` (canonical skill-load procedure).\n\n'
      + 'Never re-read a skill already loaded this session.\n',
  );
  const { result, report } = check(fixture);
  assert(result.status === 0, `migrated body passes (${result.stderr || ''})`);
  assert(report && report.ok === true && report.findings.length === 0, 'migrated body reports zero findings');
}

// Pass: a `Read` of MEMORY plus a SKILL.md cross-link on one table row is not a recipe.
{
  const fixture = mkTmp('ws-chk-load-table-');
  writeSkillBody(
    fixture,
    'ws-demo',
    '# ws-demo\n\n'
      + '| alias | use |\n|---|---|\n'
      + '| `read-memory` | `Read` the effective `{memoryDir}/MEMORY.md` — see [`ws-x`](../../ws-x/SKILL.md) |\n',
  );
  const { result } = check(fixture);
  assert(result.status === 0, 'link-target SKILL.md plus unrelated Read passes');
}

// Real tree: the migrated upstream SoT reports zero findings.
{
  const result = cp.spawnSync(process.execPath, [CHECKER, '--json', '--repo-root', REPO_ROOT], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  assert(result.status === 0, `real skills tree passes (${result.stderr || ''})`);
  assert(report && report.ok === true, 'real skills tree reports ok');
  assert(report && report.scanned > 100, `real skills tree scan covers the SoT (scanned=${report && report.scanned})`);
}

// Upstream-only layer: root hub docs carry no divergent raw recipes either.
{
  const roots = ['AGENTS.md', 'CATALOG.md'].map((f) => path.join(REPO_ROOT, f));
  const stripLinks = (line) => String(line).replace(/\]\([^)]*\)/g, ']');
  const hits = [];
  for (const file of roots) {
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const bare = stripLinks(line);
      if (bare.includes('`Read`') && bare.includes('SKILL.md')) hits.push(`${path.basename(file)}:${i + 1}:F1`);
      if (/Read \{skillsRoot\}\/ws-/.test(bare)) hits.push(`${path.basename(file)}:${i + 1}:F2`);
      if (/\bload\s+\{skillsRoot\}\/ws-/.test(bare) && bare.includes('SKILL.md')) hits.push(`${path.basename(file)}:${i + 1}:F3`);
    });
  }
  assert(hits.length === 0, `root hub docs carry no raw recipes (${hits.join(', ') || 'none'})`);
}

for (const dir of tmpRoots) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll skill-load gate tests passed.');
