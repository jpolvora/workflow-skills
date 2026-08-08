/**
 * Autoload configure + harness expectations (shared-autoload-md AC9).
 * Run: node test/test-autoload-configure.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(
  REPO_ROOT,
  '.agents/skills/ws-configure-project/scripts/configure_autoload.py',
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

function runPy(args, opts = {}) {
  const result = cp.spawnSync(PYTHON, ['-X', 'utf8', SCRIPT, ...args], {
    encoding: 'utf8',
    cwd: opts.cwd || REPO_ROOT,
    env: { ...process.env, ...(opts.env || {}) },
  });
  return result;
}

function seedConsumerTree(root, { withLocalSkills = true, withAutoload = true } = {}) {
  const shared = path.join(root, '.agents', 'skills', 'ws-shared');
  fs.mkdirSync(shared, { recursive: true });
  const template = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-shared/autoload.md'),
    'utf8',
  );
  if (withAutoload) {
    fs.writeFileSync(path.join(shared, 'autoload.md'), template, 'utf8');
  }
  fs.writeFileSync(
    path.join(shared, 'AGENTS.md'),
    '# Shared hub\n\nOn-demand defaults.\n',
    'utf8',
  );

  const skills = [
    'ws-senior-developer',
    'ws-self-learning',
    'ws-changelog',
    'ws-fable-method',
    'ws-tdah',
  ];
  if (withLocalSkills) {
    for (const id of skills) {
      const d = path.join(root, '.agents', 'skills', id);
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'SKILL.md'), `# ${id}\n`, 'utf8');
    }
  }
  return { shared, skills };
}

function parseJsonOut(result) {
  if (result.status !== 0 && !result.stdout) {
    fail(`script failed: ${result.stderr || result.error}`);
    return null;
  }
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    fail(`bad json: ${e.message}\n${result.stdout}`);
    return null;
  }
}

// --- tests ---

{
  const { HUB_WHITELIST } = await import(
    pathToFileURL(path.join(REPO_ROOT, 'bin', 'install-rules.js')).href
  );
  assert(HUB_WHITELIST.includes('autoload.md'), 'HUB_WHITELIST includes autoload.md');
}

{
  const root = mkTmp('ws-autoload-local-');
  seedConsumerTree(root, { withLocalSkills: true });
  const result = runPy([
    '--repo-root',
    root,
    '--write-autoload',
    '--write-root-agents',
    '--json',
  ]);
  const data = parseJsonOut(result);
  if (data) {
    const autoText = fs.readFileSync(
      path.join(root, '.agents/skills/ws-shared/autoload.md'),
      'utf8',
    );
    const rootText = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    assert(
      autoText.includes('.agents/skills/ws-senior-developer/SKILL.md'),
      'local install emits .agents/skills paths in autoload.md',
    );
    assert(
      rootText.includes('autoload.md') && rootText.includes('ws-shared/AGENTS.md'),
      'root AGENTS.md references shared hub + autoload.md',
    );
    assert(
      !/[A-Za-z]:\\/.test(autoText) && !/[A-Za-z]:\\/.test(rootText),
      'no Windows absolute paths in emitted markdown',
    );
    assert(
      !/\/Users\//.test(autoText) && !/\/Users\//.test(rootText),
      'no /Users absolute paths in emitted markdown',
    );
  }
}

{
  const root = mkTmp('ws-autoload-global-');
  const globalRoot = mkTmp('ws-autoload-global-skills-');
  seedConsumerTree(root, { withLocalSkills: false });
  for (const id of [
    'ws-senior-developer',
    'ws-self-learning',
    'ws-changelog',
    'ws-fable-method',
    'ws-tdah',
  ]) {
    const d = path.join(globalRoot, id);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'SKILL.md'), `# ${id}\n`, 'utf8');
  }
  const result = runPy([
    '--repo-root',
    root,
    '--global-skills-root',
    globalRoot,
    '--write-autoload',
    '--write-root-agents',
    '--emit-paths',
    '--json',
  ]);
  const data = parseJsonOut(result);
  if (data) {
    const paths = (data.skills || []).map((s) => s.path);
    assert(
      paths.every((p) => p.startsWith('{globalSkillsRoot}/')),
      'global-only install emits {globalSkillsRoot} token paths',
    );
    const autoText = fs.readFileSync(
      path.join(root, '.agents/skills/ws-shared/autoload.md'),
      'utf8',
    );
    assert(
      autoText.includes('{globalSkillsRoot}/ws-tdah/SKILL.md'),
      'autoload.md stores global token path',
    );
    assert(!path.isAbsolute(paths[0].replace(/\{[^}]+\}/g, 'x')), 'token paths are not absolute');
  }
}

{
  const root = mkTmp('ws-autoload-nocheck-');
  seedConsumerTree(root, { withLocalSkills: true });
  // no root AGENTS.md
  const result = runPy(['--repo-root', root, '--check', '--json']);
  const data = parseJsonOut(result);
  if (data) {
    assert(result.status === 0, 'check exits 0 without root AGENTS.md');
    assert(data.check?.ok === true, 'check ok when autoload paths resolve locally');
    assert(data.check?.rootAgentsPresent === false, 'root AGENTS.md absence is OK');
  }
}

{
  const root = mkTmp('ws-autoload-missing-');
  seedConsumerTree(root, { withLocalSkills: false });
  const emptyGlobal = mkTmp('ws-autoload-empty-global-');
  const result = runPy([
    '--repo-root',
    root,
    '--global-skills-root',
    emptyGlobal,
    '--check',
    '--json',
  ]);
  const data = parseJsonOut(result);
  if (data) {
    const warnings = (data.check?.findings || []).filter((f) => f.severity === 'warning');
    assert(warnings.length >= 1, 'missing Always-applied skills → warning findings');
    assert(
      warnings.some((w) => /missing/i.test(w.message)),
      'warning suggests missing skill',
    );
  }
}

{
  const phases = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-check-harness/PHASES.md'),
    'utf8',
  );
  const skill = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-check-harness/SKILL.md'),
    'utf8',
  );
  assert(
    /autoload\.md/.test(phases) && /intentional consumer root override/i.test(phases),
    'PHASES.md documents autoload dual-hub override',
  );
  assert(
    /autoload\.md/.test(skill) && /Missing root `AGENTS\.md` is OK/i.test(skill),
    'ws-check-harness SKILL.md: missing root OK + autoload override',
  );
  const cfg = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-configure-project/SKILL.md'),
    'utf8',
  );
  assert(
    /--section autoload/.test(cfg) && /configure_autoload\.py/.test(cfg),
    'ws-configure-project documents --section autoload + helper',
  );
}

{
  const root = mkTmp('ws-autoload-protect-');
  seedConsumerTree(root, { withLocalSkills: true });
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Custom consumer hub\n', 'utf8');
  const blocked = runPy([
    '--repo-root',
    root,
    '--write-root-agents',
    '--json',
  ]);
  assert(blocked.status !== 0, 'refuses overwrite of non-generated root AGENTS.md');
  const forced = runPy([
    '--repo-root',
    root,
    '--write-root-agents',
    '--force',
    '--json',
  ]);
  const data = parseJsonOut(forced);
  if (data) {
    const text = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    assert(
      text.includes('<!-- generated by configure_autoload.py -->'),
      'forced write stamps generated marker',
    );
    assert(
      fs.existsSync(path.join(root, 'AGENTS.md.bak')),
      'forced overwrite creates AGENTS.md.bak',
    );
  }
}

cleanup();

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll autoload configure tests passed.');
