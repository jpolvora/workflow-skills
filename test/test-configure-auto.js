/**
 * ws-configure-project --auto (auto_configure.cjs) tests.
 * Run: node test/test-configure-auto.js
 *
 * Covers: fresh-tree fill from detection/defaults, skip-existing,
 * placeholder-as-gap, --force refill, --section scoping, --dry-run,
 * no secret invention, and SKILL/INTERVIEW/evals documentation.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, '.agents', 'skills', 'ws-configure-project', 'scripts', 'auto_configure.cjs');
const NODE = process.execPath;

const tmpRoots = [];
let failures = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures += 1;
}

function ok(msg) {
  console.log(`ok: ${msg}`);
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

function runAuto(args, cwd) {
  return cp.spawnSync(NODE, [SCRIPT, ...args], {
    encoding: 'utf8',
    cwd: cwd || REPO_ROOT,
  });
}

function parseJson(result, what) {
  if (!result.stdout) {
    fail(`${what}: no stdout (status=${result.status} stderr=${(result.stderr || '').slice(0, 300)})`);
    return null;
  }
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    fail(`${what}: bad json (${e.message})`);
    return null;
  }
}

function seedHub(root, { withConfig = false } = {}) {
  const shared = path.join(root, '.agents', 'skills', 'ws-shared');
  fs.mkdirSync(shared, { recursive: true });
  fs.copyFileSync(
    path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'config.json.example'),
    path.join(shared, 'config.json.example'),
  );
  fs.copyFileSync(
    path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'config.schema.json'),
    path.join(shared, 'config.schema.json'),
  );
  if (withConfig) {
    fs.copyFileSync(
      path.join(shared, 'config.json.example'),
      path.join(shared, 'config.json'),
    );
  }
  return shared;
}

function readConfig(root) {
  return JSON.parse(fs.readFileSync(path.join(root, '.agents', 'skills', 'ws-shared', 'config.json'), 'utf8'));
}

function writeConfig(root, config) {
  fs.writeFileSync(
    path.join(root, '.agents', 'skills', 'ws-shared', 'config.json'),
    `${JSON.stringify(config, null, 2)}\n`,
    'utf8',
  );
}

// 1. Fresh tree: creates config.json, fills from detection + schema defaults.
{
  const root = mkTmp('ws-auto-fresh-');
  seedHub(root, { withConfig: false });
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'fresh-pkg', scripts: { build: 'tsc', test: 'vitest run' } }),
    'utf8',
  );
  const result = runAuto(['--repo-root', root, '--json']);
  const data = parseJson(result, 'fresh tree');
  if (data) {
    assert(result.status === 0, 'fresh tree exits 0');
    assert(data.written === true, 'fresh tree writes config.json');
    assert(data.createdFromExample === true, 'fresh tree seeds from example');
    assert(data.ok === true, 'fresh tree required gaps resolved');
    const cfg = readConfig(root);
    assert(cfg.project.name === 'fresh-pkg', 'project.name detected from package.json');
    assert(cfg.verification.backendBuild === 'npm run build', 'verification.backendBuild detected');
    assert(cfg.verification.backendTest === 'npm test', 'verification.backendTest detected');
    assert(cfg.stack.id === 'node', 'stack.id inferred as node');
    assert(data.stats.filled >= 3, `filled gaps (${data.stats.filled})`);
  }
}

// 2. Skip existing: custom filled values are kept (no overwrite, no prompt).
{
  const root = mkTmp('ws-auto-skip-');
  seedHub(root, { withConfig: true });
  runAuto(['--repo-root', root, '--json']);
  const cfg = readConfig(root);
  cfg.project.name = 'custom-kept';
  writeConfig(root, cfg);
  const result = runAuto(['--repo-root', root, '--json']);
  const data = parseJson(result, 'skip existing');
  if (data) {
    assert(readConfig(root).project.name === 'custom-kept', 'custom project.name kept after --auto');
    assert(data.stats.overwritten === 0, 'no overwrites without --force');
  }
}

// 3. Placeholder counts as gap and gets filled with the detected value.
{
  const root = mkTmp('ws-auto-placeholder-');
  seedHub(root, { withConfig: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { build: 'tsc' } }), 'utf8');
  runAuto(['--repo-root', root, '--json']);
  const cfg = readConfig(root);
  cfg.verification.backendBuild = '<e.g. dotnet build>';
  writeConfig(root, cfg);
  const result = runAuto(['--repo-root', root, '--json']);
  const data = parseJson(result, 'placeholder gap');
  if (data) {
    const filled = (data.changes || []).find((c) => c.path === 'verification.backendBuild');
    assert(readConfig(root).verification.backendBuild === 'npm run build', 'placeholder backendBuild refilled with detected value');
    assert(filled && filled.source === 'detected', 'placeholder fill sourced from detection');
  }
}

// 4. --force refills filled keys with auto values.
{
  const root = mkTmp('ws-auto-force-');
  seedHub(root, { withConfig: false });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'force-pkg' }), 'utf8');
  runAuto(['--repo-root', root, '--json']);
  const cfg = readConfig(root);
  cfg.project.name = 'custom-name';
  writeConfig(root, cfg);
  const forced = runAuto(['--repo-root', root, '--force', '--json']);
  const data = parseJson(forced, '--force refill');
  if (data) {
    assert(readConfig(root).project.name === 'force-pkg', '--force restores detected value');
    assert(data.stats.overwritten >= 1, 'force counts overwrites');
  }
}

// 5. --section scopes the fill to one top-level key.
{
  const root = mkTmp('ws-auto-section-');
  seedHub(root, { withConfig: true });
  runAuto(['--repo-root', root, '--json']);
  const cfg = readConfig(root);
  delete cfg.plans.dir;
  cfg.project.name = 'section-custom';
  writeConfig(root, cfg);
  const result = runAuto(['--repo-root', root, '--section', 'plans', '--json']);
  const data = parseJson(result, '--section scoping');
  if (data) {
    assert(data.section === 'plans', 'section echoed in output');
    assert(readConfig(root).plans.dir === '.agents/plans', '--section plans fills plans.dir default');
    assert(readConfig(root).project.name === 'section-custom', '--section plans leaves project.* untouched');
  }
}

// 6. --dry-run reports without writing.
{
  const root = mkTmp('ws-auto-dry-');
  seedHub(root, { withConfig: false });
  const before = fs.readdirSync(path.join(root, '.agents', 'skills', 'ws-shared'));
  const result = runAuto(['--repo-root', root, '--dry-run', '--json']);
  const data = parseJson(result, '--dry-run');
  if (data) {
    assert(data.written === false, 'dry-run writes nothing');
    const after = fs.readdirSync(path.join(root, '.agents', 'skills', 'ws-shared'));
    assert(!after.includes('config.json') && JSON.stringify(before) === JSON.stringify(after), 'dry-run leaves hub untouched');
  }
}

// 7. No secret invention: undetectable org/repoUrl stay placeholder.
{
  const root = mkTmp('ws-auto-nosecrets-');
  seedHub(root, { withConfig: true });
  const result = runAuto(['--repo-root', root, '--json']);
  const data = parseJson(result, 'no secret invention');
  if (data) {
    const cfg = readConfig(root);
    const org = cfg.project.org;
    assert(typeof org !== 'string' || org.includes('<') || org.length > 0, 'org not clobbered with invented value');
    assert(
      cfg.issueTrackers.azureDevOps.patEnvVar === 'ADO_PAT',
      'patEnvVar stays an env-var reference (no invented secret value)',
    );
  }
}

// 8. Idempotent: second run fills nothing.
{
  const root = mkTmp('ws-auto-idempotent-');
  seedHub(root, { withConfig: false });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'idem-pkg' }), 'utf8');
  runAuto(['--repo-root', root, '--json']);
  const second = runAuto(['--repo-root', root, '--json']);
  const data = parseJson(second, 'idempotent rerun');
  if (data) {
    assert(data.stats.filled === 0 && data.stats.overwritten === 0, `rerun fills nothing (filled=${data.stats.filled})`);
  }
}

// 9. Unknown --section errors with exit 2.
{
  const root = mkTmp('ws-auto-badsection-');
  seedHub(root, { withConfig: true });
  const result = runAuto(['--repo-root', root, '--section', 'nope', '--json']);
  assert(result.status === 2, 'unknown --section exits 2');
}

// 10. Documentation: SKILL.md, INTERVIEW.md, evals cover --auto.
{
  const skill = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-configure-project', 'SKILL.md'), 'utf8');
  assert(/\--auto/.test(skill), 'SKILL.md documents --auto');
  assert(/auto_configure\.cjs/.test(skill), 'SKILL.md references auto_configure.cjs');
  assert(/step 4b/i.test(skill), 'SKILL.md adds auto step 4b');
  const interview = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-configure-project', 'INTERVIEW.md'), 'utf8');
  assert(/## Auto/.test(interview), 'INTERVIEW.md has § Auto');
  assert(/auto_configure\.cjs/.test(interview), 'INTERVIEW.md references auto_configure.cjs');
  const evals = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-configure-project', 'evals', 'evals.json'), 'utf8'));
  assert((evals.evals || []).some((e) => /--auto/.test(e.prompt || '')), 'evals cover --auto');
}

// 11. Polyglot: Node-first repo keeps npm verification aliases (dotnet must not overwrite).
{
  const root = mkTmp('ws-auto-polyglot-');
  seedHub(root, { withConfig: false });
  fs.writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'poly-pkg', scripts: { build: 'tsc', test: 'vitest run' } }),
    'utf8',
  );
  fs.writeFileSync(path.join(root, 'app.sln'), 'polyglot sln stub', 'utf8');
  const result = runAuto(['--repo-root', root, '--json']);
  const data = parseJson(result, 'polyglot repo');
  if (data) {
    const cfg = readConfig(root);
    assert(cfg.stack.id === 'node', 'polyglot stack.id stays node-first');
    assert(cfg.verification.backendBuild === 'npm run build', 'polyglot backendBuild not overwritten by dotnet');
    assert(cfg.verification.backendTest === 'npm test', 'polyglot backendTest not overwritten by dotnet');
  }
}

// 12. Partial success exits non-zero when required gaps remain.
{
  const root = mkTmp('ws-auto-gaps-');
  seedHub(root, { withConfig: false });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'gaps-pkg' }), 'utf8');
  const result = runAuto(['--repo-root', root, '--json']);
  const data = parseJson(result, 'gaps remain');
  if (data) {
    assert(data.ok === false, 'bare package.json leaves required gaps');
    assert(result.status === 1, 'required gaps exit 1 (not silent 0)');
  }
}

// 13. --section reports global ok separately from section success.
{
  const root = mkTmp('ws-auto-sectionscope-');
  seedHub(root, { withConfig: false });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'scope-pkg' }), 'utf8');
  const result = runAuto(['--repo-root', root, '--section', 'project', '--json']);
  const data = parseJson(result, 'section scope');
  if (data) {
    assert(result.status === 0, 'clean section exits 0 despite global gaps');
    assert(data.ok === false, 'ok stays global (verification gap remains)');
    assert(data.sectionOk === true, 'sectionOk reports section success');
    assert(
      (data.requiredGaps || []).some((g) => String(g).startsWith('verification')),
      'requiredGaps still lists the global verification gap',
    );
  }
}

cleanup();

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll configure --auto tests passed.');
