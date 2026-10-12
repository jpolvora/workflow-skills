/**
 * us-504: check_workflows.cjs global-tree repo-root regression.
 * AC1 global fixture PASS, AC2 skills-tree preference, AC3/AC4 --repo-root
 * space + equals forms, AC5 covered by local PASS, NS1/NS2/NS3 loud failures.
 * Run: node test/test-check-workflows-global-root.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, '.agents/skills/ws-check-workflows/scripts/check_workflows.cjs');

function run(args, cwd = repoRoot) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// AC4: both flag forms take effect (PASS exit 0 on the real tree).
for (const args of [['--json', '--repo-root', '.'], ['--json', '--repo-root=.']]) {
  const r = run(args);
  assert(r.status === 0, `${args.join(' ')}: expected exit 0, got ${r.status}: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert(out.status === 'PASS', `${args.join(' ')}: expected PASS, got ${out.status}`);
}

// NS2: missing value + unknown flag fail loudly (exit 2), never silent defaults.
for (const args of [['--repo-root'], ['--json', '--bogus-flag-us504']]) {
  const r = run(args);
  assert(r.status === 2, `${args.join(' ')}: expected exit 2, got ${r.status}`);
  assert(/missing value for --repo-root|unknown argument/.test(r.stderr), `${args.join(' ')}: expected loud stderr, got ${r.stderr}`);
}

// AC1/AC2 + NS1/NS3: script copied under a .git-rooted global tree reports
// PASS exit 0 (old code reported 19 findings / exit 1 from the same layout).
const gw = fs.mkdtempSync(path.join(os.tmpdir(), 'us504gw-'));
const home = path.join(gw, 'globalhome');
fs.mkdirSync(path.join(home, '.git'), { recursive: true });
fs.cpSync(path.join(repoRoot, '.agents/skills'), path.join(home, 'skills'), { recursive: true });
try {
  const fixtureScript = path.join(home, 'skills/ws-check-workflows/scripts/check_workflows.cjs');
  const r = run(['--json'], repoRoot);
  assert(r.status === 0, `fixture precheck: expected exit 0, got ${r.status}`);
  const fr = spawnSync(process.execPath, [fixtureScript, '--json'], { cwd: repoRoot, encoding: 'utf8' });
  assert(fr.status === 0, `global fixture: expected exit 0, got ${fr.status}: ${fr.stdout.slice(0, 400)} ${fr.stderr.slice(0, 200)}`);
  const out = JSON.parse(fr.stdout);
  assert(out.status === 'PASS', `global fixture: expected PASS, got ${out.status}`);
  assert(Array.isArray(out.issues) && out.issues.length === 0, `global fixture: expected 0 issues, got ${out.issues.length}`);
} finally {
  fs.rmSync(gw, { recursive: true, force: true });
}

// AC5/NS3: plain local run (no flags) still PASS exit 0.
{
  const r = run(['--json']);
  assert(r.status === 0, `local: expected exit 0, got ${r.status}`);
  assert(JSON.parse(r.stdout).status === 'PASS', 'local: expected PASS');
}

console.log('PASS: test-check-workflows-global-root (us-504 AC1-AC5, NS1-NS3)');
