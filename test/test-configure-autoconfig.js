/**
 * ws-configure-project AutoConfig merge-write (autoconfig-gate AC1–AC8).
 * Run: node test/test-configure-autoconfig.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(
  REPO_ROOT,
  '.agents/skills/ws-configure-project/scripts/configure_autoconfig.py',
);
const EXAMPLE = path.join(
  REPO_ROOT,
  '.agents/skills/ws-shared/config.json.example',
);
const PYTHON = process.env.PYTHON || 'python';

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

function seedConfig(root, overlay = null) {
  const shared = path.join(root, '.agents', 'skills', 'ws-shared');
  fs.mkdirSync(shared, { recursive: true });
  const example = JSON.parse(fs.readFileSync(EXAMPLE, 'utf8'));
  const data = overlay ? deepMerge(example, overlay) : example;
  fs.writeFileSync(
    path.join(shared, 'config.json'),
    JSON.stringify(data, null, 2) + '\n',
    'utf8',
  );
  fs.copyFileSync(EXAMPLE, path.join(shared, 'config.json.example'));
  return path.join(shared, 'config.json');
}

function deepMerge(base, overlay) {
  const out = { ...base };
  for (const [k, v] of Object.entries(overlay)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof out[k] === 'object') {
      out[k] = deepMerge(out[k] || {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function runPy(args, opts = {}) {
  return cp.spawnSync(PYTHON, ['-X', 'utf8', SCRIPT, ...args], {
    encoding: 'utf8',
    cwd: opts.cwd || REPO_ROOT,
  });
}

function apply(root, suggestions, extra = []) {
  const sugPath = path.join(root, 'suggestions.json');
  fs.writeFileSync(sugPath, JSON.stringify(suggestions, null, 2) + '\n', 'utf8');
  const result = runPy(
    ['--apply', '--suggestions', sugPath, '--repo-root', root, '--json', ...extra],
    { cwd: root },
  );
  let parsed = null;
  if (result.stdout) {
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      parsed = null;
    }
  }
  return { result, parsed };
}

function readConfig(root) {
  return JSON.parse(
    fs.readFileSync(
      path.join(root, '.agents', 'skills', 'ws-shared', 'config.json'),
      'utf8',
    ),
  );
}

function docsSurface() {
  const skill = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-configure-project/SKILL.md'),
    'utf8',
  );
  const interview = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-configure-project/INTERVIEW.md'),
    'utf8',
  );
  assert(
    /AutoConfig and save/.test(skill) && /Ask user confirmations/.test(skill),
    'SKILL.md mode gate has AutoConfig and Ask user confirmations',
  );
  assert(
    /configure_autoconfig\.py/.test(skill),
    'SKILL.md documents configure_autoconfig.py',
  );
  assert(
    /--detect-only/.test(skill) && /--section/.test(skill),
    'SKILL.md skip table covers --detect-only and --section',
  );
  assert(
    !/\bCursor\b/.test(skill) && !/\bAskQuestion\b/.test(skill),
    'SKILL.md has no host product / AskQuestion names',
  );
  assert(
    /## Mode gate/.test(interview) && /AutoConfig write rules/.test(interview),
    'INTERVIEW.md has Mode gate + AutoConfig write rules',
  );
  assert(
    /Mode gate skip table/.test(interview),
    'INTERVIEW.md has skip table',
  );
  assert(
    /never commit `config\.json`/i.test(interview) ||
      /Never commit `config\.json`/.test(interview),
    'INTERVIEW.md says never commit config.json',
  );
  const evals = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, '.agents/skills/ws-configure-project/evals/evals.json'),
      'utf8',
    ),
  );
  assert(
    (evals.evals || []).some((e) => /AutoConfig and save/.test(e.expected_output || '')),
    'evals cover AutoConfig mode gate',
  );
}

function testFillPlaceholders() {
  const root = mkTmp('ws-autoconfig-fill-');
  seedConfig(root);
  const { result, parsed } = apply(root, {
    project: { name: 'demo-app', org: 'acme', repoUrl: 'https://github.com/acme/demo' },
    providers: { active: 'local', scm: 'github' },
    verification: { backendTest: 'npm test' },
  });
  assert(result.status === 0, 'fill placeholders: exit 0');
  assert(parsed && parsed.written === true, 'fill placeholders: wrote config');
  const cfg = readConfig(root);
  assert(cfg.project.name === 'demo-app', 'fills project.name placeholder');
  assert(cfg.project.workingBranch === 'develop', 'default workingBranch');
  assert(cfg.plans.dir === '.agents/plans', 'default plans.dir');
  assert(cfg.providers.scm === 'github', 'scm github');
  assert(cfg.defaults.autoload === false, 'autoload stays false');
  assert(cfg.verification.backendTest === 'npm test', 'fills verification from suggestions');
  assert(cfg._comment, 'preserves top-level _comment');
}

function testNoClobber() {
  const root = mkTmp('ws-autoconfig-keep-');
  seedConfig(root, { project: { name: 'kept-name', org: 'kept-org' } });
  const { result } = apply(root, {
    project: { name: 'other-name', org: 'other-org' },
  });
  assert(result.status === 0, 'no-clobber: exit 0');
  const cfg = readConfig(root);
  assert(cfg.project.name === 'kept-name', 'does not overwrite filled name');
  assert(cfg.project.org === 'kept-org', 'does not overwrite filled org');
}

function testForceClobber() {
  const root = mkTmp('ws-autoconfig-force-');
  seedConfig(root, { project: { name: 'old-name' } });
  const { result } = apply(
    root,
    { project: { name: 'new-name' } },
    ['--force'],
  );
  assert(result.status === 0, 'force: exit 0');
  const cfg = readConfig(root);
  assert(cfg.project.name === 'new-name', '--force overwrites filled name');
}

function testScmNeverLocal() {
  const root = mkTmp('ws-autoconfig-scm-');
  seedConfig(root, { providers: { active: '<ACTIVE>', scm: '<SCM>' } });
  const { result } = apply(root, {
    providers: { active: 'local', scm: 'local' },
  });
  assert(result.status === 0, 'scm coerce: exit 0');
  const cfg = readConfig(root);
  assert(cfg.providers.scm !== 'local', 'scm is never local');
  assert(cfg.providers.active === 'local', 'hybrid active=local allowed');
  assert(
    cfg.providers.scm === 'github' || cfg.providers.scm === 'azure-devops',
    'scm coerced to github or azure-devops',
  );
}

function testAutoloadNeverTrue() {
  const root = mkTmp('ws-autoconfig-al-');
  seedConfig(root);
  apply(root, { defaults: { autoload: true } });
  const cfg = readConfig(root);
  assert(cfg.defaults.autoload !== true, 'suggestions cannot set autoload true');
}

function testKeepExistingAutoloadTrue() {
  const root = mkTmp('ws-autoconfig-alkeep-');
  seedConfig(root, { defaults: { autoload: true } });
  apply(root, { project: { name: 'x' } });
  const cfg = readConfig(root);
  assert(
    cfg.defaults.autoload === true,
    'does not clobber existing autoload true without --force',
  );
}

function testSkipSecrets() {
  const root = mkTmp('ws-autoconfig-sec-');
  seedConfig(root);
  apply(root, {
    issueTrackers: {
      azureDevOps: { pat: 'super-secret-pat', patEnvVar: 'ADO_PAT' },
    },
  });
  const cfg = readConfig(root);
  assert(
    cfg.issueTrackers.azureDevOps.pat === undefined,
    'does not write pat secret value',
  );
  assert(
    cfg.issueTrackers.azureDevOps.patEnvVar === 'ADO_PAT',
    'allows patEnvVar env-var name',
  );
}

function testNoRootAgents() {
  const root = mkTmp('ws-autoconfig-root-');
  seedConfig(root);
  const { parsed } = apply(root, { project: { name: 'x' } });
  assert(parsed && parsed.touchedRootAgents === false, 'helper reports no root AGENTS.md write');
  assert(
    !fs.existsSync(path.join(root, 'AGENTS.md')),
    'does not create repo-root AGENTS.md',
  );
}

function testUnknownKeysPreserved() {
  const root = mkTmp('ws-autoconfig-unk-');
  seedConfig(root, { customExtra: { foo: 1 } });
  apply(root, { project: { name: 'x' } });
  const cfg = readConfig(root);
  assert(cfg.customExtra && cfg.customExtra.foo === 1, 'does not delete unknown keys');
}

docsSurface();
testFillPlaceholders();
testNoClobber();
testForceClobber();
testScmNeverLocal();
testAutoloadNeverTrue();
testKeepExistingAutoloadTrue();
testSkipSecrets();
testNoRootAgents();
testUnknownKeysPreserved();

cleanup();

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll configure-autoconfig checks passed.');
