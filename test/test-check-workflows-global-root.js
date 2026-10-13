/**
 * us-504 + us-508: check_workflows.cjs repo-root resolution regression.
 *
 * us-504 (regression-locked): --repo-root space/equals forms take effect,
 * missing value / unknown flag fail loudly (exit 2), local run PASS.
 *
 * us-508: the <home>/.agents/skills global-install shape (no .git) —
 *  - AC1  resolved root + resolution source exposed in --json
 *  - AC2  consumer checkout at cwd wins (package.json / .git markers)
 *  - AC3  no consumer checkout -> global install root
 *  - AC4  never the install parent
 *  - AC5/AC6 dependency-parity skip record (json + markdown) naming the missing manifest
 *  - AC7  package root with bin/ + missing manifest -> CRITICAL exit 1
 *  - AC8  degraded-resolution WARNING (cwd-fallback)
 *  - AC9/AC13 --report written inside the resolved root, absent from the install parent
 *  - AC10/AC11/AC12 strengthened assertions on the copied global fixture
 *  - NS1-NS10 red-first scenarios
 *
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
const RESOLUTION_SOURCES = ['explicit-flag', 'consumer-checkout', 'install-root', 'cwd-fallback'];

function run(args, cwd = repoRoot) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
}
function runScript(scriptPath, args, cwd) {
  return spawnSync(process.execPath, [scriptPath, ...args], { cwd, encoding: 'utf8' });
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function parse(r, label) {
  try {
    return JSON.parse(r.stdout);
  } catch (e) {
    throw new Error(`${label}: expected JSON stdout, got: ${r.stdout.slice(0, 300)} | stderr: ${r.stderr.slice(0, 200)}`);
  }
}

const tmpRoots = [];
function mktmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}
function copySkills(destSkillsDir) {
  fs.cpSync(path.join(repoRoot, '.agents/skills'), destSkillsDir, { recursive: true });
}

try {
  // ---- us-504 regression: both --repo-root forms take effect (explicit-flag).
  for (const args of [['--json', '--repo-root', '.'], ['--json', '--repo-root=.']]) {
    const r = run(args);
    assert(r.status === 0, `${args.join(' ')}: expected exit 0, got ${r.status}: ${r.stderr}`);
    const out = parse(r, args.join(' '));
    assert(out.status === 'PASS', `${args.join(' ')}: expected PASS, got ${out.status}`);
    assert(out.resolutionSource === 'explicit-flag', `${args.join(' ')}: expected explicit-flag, got ${out.resolutionSource}`);
  }

  // ---- NS7: missing value + unknown flag fail loudly (exit 2), never silent defaults.
  for (const args of [['--repo-root'], ['--json', '--bogus-flag-us504']]) {
    const r = run(args);
    assert(r.status === 2, `${args.join(' ')}: expected exit 2, got ${r.status}`);
    assert(/missing value for --repo-root|unknown argument/.test(r.stderr), `${args.join(' ')}: expected loud stderr, got ${r.stderr}`);
  }

  // ---- us-504 regression (regression-locked): a copied global skills tree must
  // still report PASS exit 0 (the old ancestor heuristic produced 19 findings).
  // The copied tree is created below; asserted after the fixture setup.

  // ---- Plain local run (no flags) still PASS exit 0 (AC5 covered by local PASS).
  {
    const r = run(['--json']);
    const out = parse(r, 'local');
    assert(r.status === 0, `local: expected exit 0, got ${r.status}`);
    assert(out.status === 'PASS', 'local: expected PASS');
    assert(out.resolutionSource === 'consumer-checkout', `local: expected consumer-checkout, got ${out.resolutionSource}`);
    assert(out.checks.dependencyParity.status === 'checked', `local: expected parity checked, got ${out.checks.dependencyParity.status}`);
  }

  // ---- AC3/AC4/AC9/AC12/AC13: global install at <home>/.agents/skills, no .git (AC11).
  const gw = mktmp('us508home-');
  const home = path.join(gw, 'home');
  const homeAgents = path.join(home, '.agents');
  copySkills(path.join(homeAgents, 'skills'));
  assert(!fs.existsSync(path.join(homeAgents, 'skills', '.git')), 'AC11: global fixture must not carry a .git marker inside the install tree');
  const homeFixtureScript = path.join(homeAgents, 'skills/ws-check-workflows/scripts/check_workflows.cjs');

  // us-504 regression-locked: run the copied global tree with a consumer cwd and
  // assert PASS / 0 issues (the old ancestor heuristic produced 19 false findings).
  // Resolution now follows cwd precedence, so the tree layout no longer matters.
  {
    const fr = runScript(homeFixtureScript, ['--json'], repoRoot);
    assert(fr.status === 0, `copied global tree: expected exit 0, got ${fr.status}: ${fr.stdout.slice(0, 400)} ${fr.stderr.slice(0, 200)}`);
    const fout = parse(fr, 'copied global tree');
    assert(fout.status === 'PASS', `copied global tree: expected PASS, got ${fout.status}`);
    assert(Array.isArray(fout.issues) && fout.issues.length === 0, `copied global tree: expected 0 issues, got ${fout.issues.length}`);
  }

  // AC2/AC9/AC12/AC13: consumer checkout (package.json marker) as cwd.
  {
    const consumer = path.join(gw, 'consumer');
    fs.mkdirSync(consumer, { recursive: true });
    fs.writeFileSync(path.join(consumer, 'package.json'), '{"name":"fixture-consumer","private":true}\n');
    const r = runScript(homeFixtureScript, ['--json'], consumer);
    const out = parse(r, 'consumer-checkout fixture');
    assert(out.status === 'PASS', `consumer-checkout: expected PASS, got ${out.status} (${JSON.stringify(out.issues).slice(0, 200)})`);
    assert(r.status === 0, `consumer-checkout: expected exit 0, got ${r.status}`);
    assert(RESOLUTION_SOURCES.includes(out.resolutionSource), `AC1: unexpected resolution source ${out.resolutionSource}`);
    assert(out.resolutionSource === 'consumer-checkout', `AC2: expected consumer-checkout, got ${out.resolutionSource}`);
    assert(path.resolve(out.resolvedRoot) === path.resolve(consumer), `AC2/AC13: expected root ${consumer}, got ${out.resolvedRoot}`);
    // AC5/AC12: explicit skip record naming the missing manifest.
    const parity = out.checks.dependencyParity;
    assert(parity.status === 'skipped', `AC5: expected skipped parity, got ${parity.status}`);
    assert(parity.missingPath && parity.missingPath.endsWith(path.join('bin', 'skill-dependencies.json')), `AC5: skip must name the missing manifest, got ${parity.missingPath}`);
    assert(path.resolve(parity.missingPath).startsWith(path.resolve(consumer)), `AC5/AC12: missing manifest must be under the resolved root, got ${parity.missingPath}`);
    // AC9/AC13/NS6: --report lands inside the resolved root, never the install parent.
    const rr = runScript(homeFixtureScript, ['--report'], consumer);
    assert(rr.status === 0, `consumer-checkout --report: expected exit 0, got ${rr.status}`);
    const reportFile = path.join(consumer, 'ws-check-workflows-report.md');
    assert(fs.existsSync(reportFile), `AC9: report must be written inside the resolved root (${reportFile})`);
    const report = fs.readFileSync(reportFile, 'utf8');
    assert(/Dependency parity.*skipped/s.test(report), 'AC6: markdown report must show the skipped parity check');
    assert(!fs.existsSync(path.join(home, 'ws-check-workflows-report.md')), 'NS6: report must not be written into the install parent');
    assert(!fs.existsSync(path.join(homeAgents, 'ws-check-workflows-report.md')), 'NS6: report must not be written into the install root');
  }

  // AC2 (.git-only marker) + AC3/AC4: install-root fallback for a non-repository cwd.
  {
    const gitConsumer = path.join(gw, 'git-consumer');
    fs.mkdirSync(path.join(gitConsumer, '.git'), { recursive: true });
    const gr = runScript(homeFixtureScript, ['--json'], gitConsumer);
    const gout = parse(gr, 'git-checkout fixture');
    assert(gout.resolutionSource === 'consumer-checkout', `AC2: .git marker must win, got ${gout.resolutionSource}`);
    assert(path.resolve(gout.resolvedRoot) === path.resolve(gitConsumer), `AC2: expected root ${gitConsumer}, got ${gout.resolvedRoot}`);

    const bareConsumer = path.join(gw, 'bare-consumer');
    fs.mkdirSync(bareConsumer, { recursive: true });
    const br = runScript(homeFixtureScript, ['--json'], bareConsumer);
    const bout = parse(br, 'install-root fixture');
    assert(bout.status === 'PASS', `install-root: expected PASS, got ${bout.status} (${JSON.stringify(bout.issues).slice(0, 200)})`);
    assert(bout.resolutionSource === 'install-root', `AC3: expected install-root, got ${bout.resolutionSource}`);
    assert(path.resolve(bout.resolvedRoot) === path.resolve(homeAgents), `AC3: expected install root ${homeAgents}, got ${bout.resolvedRoot}`);
    assert(path.resolve(bout.resolvedRoot) !== path.resolve(home), 'AC4: must never return the install parent');
    assert(bout.checks.dependencyParity.status === 'skipped', 'AC5: install-root fixture must report the parity skip');
  }

  // ---- AC7 + NS8: package root carrying bin/ — mismatch CRITICAL, then missing manifest CRITICAL.
  {
    const pkgRoot = path.join(gw, 'pkgroot');
    const pkgSkills = path.join(pkgRoot, '.agents', 'skills');
    fs.mkdirSync(path.join(pkgSkills, 'ws-shared', 'runtime', 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(pkgSkills, 'ws-check-workflows', 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(pkgRoot, 'bin'), { recursive: true });
    fs.writeFileSync(path.join(pkgRoot, 'package.json'), '{"name":"fixture-pkg","private":true}\n');
    fs.writeFileSync(path.join(pkgRoot, 'bin', 'cli.js'), '#!/usr/bin/env node\n');
    // Minimal (fast) skills tree: enough for script-location discovery + the parity manifests.
    fs.writeFileSync(path.join(pkgSkills, 'ws-shared', 'runtime', 'tools.md'), '# tools\n');
    fs.copyFileSync(
      path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs'),
      path.join(pkgSkills, 'ws-shared', 'runtime', 'scripts', 'resolve_consumer_root.cjs'),
    );
    fs.copyFileSync(script, path.join(pkgSkills, 'ws-check-workflows', 'scripts', 'check_workflows.cjs'));
    fs.writeFileSync(
      path.join(pkgSkills, 'ws-shared', 'runtime', 'skill-dependencies.json'),
      JSON.stringify({ packages: { workflows: { skills: ['ws-real-skill'] } } }, null, 2),
    );
    const pkgScript = path.join(pkgSkills, 'ws-check-workflows', 'scripts', 'check_workflows.cjs');

    // NS8: both manifests present and mismatched -> CRITICAL exit 1.
    fs.writeFileSync(
      path.join(pkgRoot, 'bin', 'skill-dependencies.json'),
      JSON.stringify({ packages: { workflows: { skills: ['ws-real-skill', 'ws-not-a-real-fixture-skill'] } } }, null, 2),
    );
    const mr = runScript(pkgScript, ['--json'], pkgRoot);
    const mout = parse(mr, 'pkgroot mismatch');
    assert(mout.status === 'FAIL', `NS8: expected FAIL on mismatch, got ${mout.status}`);
    assert(mr.status === 1, `NS8: expected exit 1, got ${mr.status}`);
    assert(mout.checks.dependencyParity.status === 'failed', `NS8: expected parity failed, got ${mout.checks.dependencyParity.status}`);
    assert(mout.issues.some((i) => i.severity === 'CRITICAL' && i.category === 'Dependency Graph Sync'), 'NS8: expected a CRITICAL dependency mismatch finding');

    // AC7: shared manifest missing on a package root -> CRITICAL (not a skip).
    fs.rmSync(path.join(pkgSkills, 'ws-shared', 'runtime', 'skill-dependencies.json'), { force: true });
    const ar = runScript(pkgScript, ['--json'], pkgRoot);
    const aout = parse(ar, 'pkgroot missing manifest');
    assert(aout.status === 'FAIL', `AC7: expected FAIL when a manifest is missing on a package root, got ${aout.status}`);
    assert(ar.status === 1, `AC7: expected exit 1, got ${ar.status}`);
    assert(aout.checks.dependencyParity.status === 'failed', `AC7: expected parity failed, got ${aout.checks.dependencyParity.status}`);
    assert(aout.issues.some((i) => i.severity === 'CRITICAL' && i.category === 'Dependency Graph Sync'), 'AC7: expected a CRITICAL dependency-parity finding');
  }

  // ---- AC8/NS5/NS10: degraded resolution WARNING when neither marker nor install root exists.
  {
    const lone = path.join(gw, 'lone');
    fs.mkdirSync(path.join(lone, 'ws-check-workflows', 'scripts'), { recursive: true });
    fs.copyFileSync(script, path.join(lone, 'ws-check-workflows', 'scripts', 'check_workflows.cjs'));
    const loneScript = path.join(lone, 'ws-check-workflows', 'scripts', 'check_workflows.cjs');
    const bare = path.join(gw, 'nowhere');
    fs.mkdirSync(bare, { recursive: true });
    const r = runScript(loneScript, ['--json'], bare);
    const out = parse(r, 'degraded fixture');
    assert(out.resolutionSource === 'cwd-fallback', `AC8: expected cwd-fallback, got ${out.resolutionSource}`);
    assert(path.resolve(out.resolvedRoot) === path.resolve(bare), `AC8: expected root ${bare}, got ${out.resolvedRoot}`);
    const warning = out.issues.find((i) => i.severity === 'WARNING' && i.category === 'Resolution');
    assert(warning, 'AC8: expected a degraded-resolution WARNING naming the resolved root');
    assert(warning.message.includes(path.resolve(bare)), 'AC8: WARNING must name the resolved root');
  }
} finally {
  for (const dir of tmpRoots) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

console.log('PASS: test-check-workflows-global-root (us-504 AC1-AC5, NS1-NS3; us-508 AC1-AC13, NS1-NS10)');
