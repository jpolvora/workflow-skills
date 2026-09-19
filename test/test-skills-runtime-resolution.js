/**
 * Skills-installation runtime resolution (local .agents/skills vs global).
 *
 * Managed runtime/templates resolve from the skills installation — the
 * project-local skills tree ({skillsRoot}/ws-shared) first, then
 * the global skills tree ({globalSkillsRoot}/ws-shared, override via
 * WORKFLOW_SKILLS_GLOBAL_DIR). An explicit WORKFLOW_SKILLS_SHARED_DIR wins
 * over both. The project consumer hub (<repo>/.ws) holds only local config
 * variable files; legacy .ws/runtime copies are a last-resort read fallback.
 *
 * Run: node test/test-skills-runtime-resolution.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const resolver = require('../.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs');

const tmpRoots = [];
let failures = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures += 1;
}

function check(cond, msg) {
  if (cond) console.log(`ok: ${msg}`);
  else fail(msg);
}

function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function writeConfig(root, config = {}) {
  write(
    path.join(root, '.ws/config.json'),
    JSON.stringify(
      {
        project: { name: 'runtime-resolution-test', baseBranch: 'main' },
        plans: { dir: '.agents/plans', specsDir: '.agents/specs' },
        verification: {},
        ...config,
      },
      null,
      2,
    ),
  );
}

function withEnv(vars, fn) {
  const saved = {};
  for (const key of Object.keys(vars)) {
    saved[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

const anchorScript = path.join(repoRoot, '.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');

// 1. Local skills-tree runtime wins over global and legacy .ws copies.
{
  const consumer = mkTmp('ws-rt-local-');
  writeConfig(consumer);
  write(path.join(consumer, '.agents/skills/ws-shared/runtime/placeholder.txt'), 'local\n');
  const globalRoot = mkTmp('ws-rt-global-');
  write(path.join(globalRoot, 'ws-shared/runtime/placeholder.txt'), 'global\n');
  fs.mkdirSync(path.join(consumer, '.ws/runtime'), { recursive: true });
  const ctx = withEnv({ WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot, WORKFLOW_SKILLS_SHARED_DIR: undefined }, () =>
    resolver.resolveConsumerContext({ repoRoot: consumer, scriptFile: anchorScript }),
  );
  check(String(ctx.runtimeSource).includes('.agents'), 'local skills-tree runtime wins over global and legacy .ws');
  check(String(ctx.templateSource).includes('.agents'), 'local skills-tree templates win over global and legacy .ws');
}

// 2. Global skills tree wins when the project has no local ws-shared runtime.
{
  const consumer = mkTmp('ws-rt-globalwin-');
  writeConfig(consumer);
  const globalRoot = mkTmp('ws-rt-globalonly-');
  write(path.join(globalRoot, 'ws-shared/runtime/placeholder.txt'), 'global\n');
  const ctx = withEnv({ WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot, WORKFLOW_SKILLS_SHARED_DIR: undefined }, () =>
    resolver.resolveConsumerContext({ repoRoot: consumer, scriptFile: anchorScript }),
  );
  check(String(ctx.runtimeSource).includes(globalRoot), 'global skills-tree runtime wins when local is absent');
}

// 3. Legacy .ws/runtime is a last resort when no skills-tree runtime exists.
{
  const consumer = mkTmp('ws-rt-legacy-');
  writeConfig(consumer);
  fs.mkdirSync(path.join(consumer, '.ws/runtime'), { recursive: true });
  const emptyGlobal = mkTmp('ws-rt-emptyglobal-');
  const ctx = withEnv({ WORKFLOW_SKILLS_GLOBAL_DIR: emptyGlobal, WORKFLOW_SKILLS_SHARED_DIR: undefined }, () =>
    resolver.resolveConsumerContext({ repoRoot: consumer, scriptFile: anchorScript }),
  );
  check(String(ctx.runtimeSource).includes('.ws'), 'legacy .ws/runtime applies only with no skills-tree runtime');
}

// 4. Explicit WORKFLOW_SKILLS_SHARED_DIR wins over every candidate.
{
  const consumer = mkTmp('ws-rt-explicit-');
  writeConfig(consumer);
  write(path.join(consumer, '.agents/skills/ws-shared/runtime/placeholder.txt'), 'local\n');
  const explicit = mkTmp('ws-rt-explicitdir-');
  const ctx = withEnv({ WORKFLOW_SKILLS_SHARED_DIR: explicit }, () =>
    resolver.resolveConsumerContext({ repoRoot: consumer, scriptFile: anchorScript }),
  );
  check(String(ctx.runtimeSource).startsWith(explicit), 'explicit shared dir wins over skills-tree candidates');
}

// 5. Bootstrap: an orphan script (no packaged runtime) selects the global
// skills runtime via WORKFLOW_SKILLS_GLOBAL_DIR.
{
  const t = mkTmp('ws-rt-bootstrap-');
  const gsScripts = path.join(t, 'gs', 'ws-shared', 'runtime', 'scripts');
  write(
    path.join(gsScripts, 'resolve_consumer_root.cjs'),
    `'use strict';\nthrow new Error('MARKER-GLOBAL-RUNTIME-SELECTED');\n`,
  );
  const orphanDir = path.join(t, 'orphan');
  fs.mkdirSync(orphanDir, { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, '.agents/skills/ws-classify-complexity/scripts/classify.cjs'),
    path.join(orphanDir, 'classify.cjs'),
  );
  const emptyCwd = path.join(t, 'empty');
  fs.mkdirSync(emptyCwd, { recursive: true });
  const result = cp.spawnSync(process.execPath, [path.join(orphanDir, 'classify.cjs'), '--help'], {
    encoding: 'utf8',
    cwd: emptyCwd,
    env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: path.join(t, 'gs'), WORKFLOW_SKILLS_SHARED_DIR: '' },
  });
  check(
    `${result.stdout}${result.stderr}`.includes('MARKER-GLOBAL-RUNTIME-SELECTED'),
    'orphan skill script bootstraps from the global skills runtime',
  );
}

// 6. Bootstrap hygiene: no managed skill script falls back to .ws/runtime.
{
  const hits = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && (entry.name.endsWith('.cjs') || entry.name.endsWith('.js'))) {
        const text = fs.readFileSync(full, 'utf8');
        if (text.includes("'.ws', 'runtime', 'scripts'")) hits.push(path.relative(repoRoot, full));
      }
    }
  };
  walk(path.join(repoRoot, '.agents/skills'));
  check(hits.length === 0, `no .ws/runtime bootstrap fallback remains${hits.length ? `: ${hits.join(', ')}` : ''}`);
}

for (const dir of tmpRoots) fs.rmSync(dir, { recursive: true, force: true });
if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\ntest-skills-runtime-resolution: ok');
