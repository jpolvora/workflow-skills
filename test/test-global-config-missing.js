/**
 * Global-without-hub fail-closed gate (spec AC5 / NS3).
 *
 * A config-dependent skill invoked from a global install
 * ({globalSkillsRoot} bodies) against a consumer project with no project hub
 * must fail closed with a `ws-configure-project` pointer — it must never
 * silently read global config as project config.
 *
 * Unit under test: requireProjectConfig() in
 * .agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs
 * (Node SoT; mirrored by require_project_config() in resolve_consumer_root.py).
 *
 * Run: node test/test-global-config-missing.js
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

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

check(typeof resolver.requireProjectConfig === 'function', 'resolver exposes requireProjectConfig');

// Fixture: a global skills root holding bodies + a global hub config, and a
// consumer project with NO project hub (.ws/config.json absent).
function makeGlobalWithoutHub() {
  const globalRoot = mkTmp('ws-gcm-global-');
  const globalSkillScript = path.join(globalRoot, 'ws-plan-write', 'scripts', 'plan.cjs');
  write(globalSkillScript, "'use strict';\n");
  write(
    path.join(globalRoot, 'ws-shared', 'config.json'),
    JSON.stringify({ project: { name: 'global-hub', baseBranch: 'main' } }, null, 2),
  );
  const consumer = mkTmp('ws-gcm-consumer-');
  return { globalRoot, globalSkillScript, consumer };
}

// 1. Global execution without a project hub fails closed with a
// ws-configure-project pointer (never silently uses global config).
{
  const { globalRoot, globalSkillScript, consumer } = makeGlobalWithoutHub();
  const ctx = withEnv(
    { WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot, WORKFLOW_SKILLS_SHARED_DIR: undefined },
    () => resolver.resolveConsumerContext({ repoRoot: consumer, scriptFile: globalSkillScript }),
  );
  check(ctx.executionScope === 'global', 'fixture executes in global scope');
  check(ctx.configSource === 'global', 'fixture resolves config from the global hub (the silent-read hazard)');
  let error = null;
  try {
    resolver.requireProjectConfig(ctx);
  } catch (err) {
    error = err;
  }
  check(error !== null, 'global-without-hub fails closed instead of proceeding');
  check(/ws-configure-project/.test(String(error && error.message)), 'fail-closed error points at ws-configure-project');
  check(!/global.*config\.json/i.test(String(error && error.message)) || /refusing/i.test(String(error && error.message)), 'error never presents global config as usable');
}

// 2. Negative proof: the same global invocation WITH a project hub passes
// the gate and keeps the project config source.
{
  const { globalRoot, globalSkillScript, consumer } = makeGlobalWithoutHub();
  write(
    path.join(consumer, '.ws', 'config.json'),
    JSON.stringify({ project: { name: 'consumer', baseBranch: 'main' } }, null, 2),
  );
  const ctx = withEnv(
    { WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot, WORKFLOW_SKILLS_SHARED_DIR: undefined },
    () => resolver.resolveConsumerContext({ repoRoot: consumer, scriptFile: globalSkillScript }),
  );
  check(ctx.configSource === 'project', 'project hub present resolves project config source');
  let error = null;
  let out = null;
  try {
    out = resolver.requireProjectConfig(ctx);
  } catch (err) {
    error = err;
  }
  check(error === null, 'global-with-hub passes the gate (no throw)');
  check(out === ctx, 'gate returns the context unchanged on success');
}

// 3. Project-local execution without any hub config also fails closed
// (missing project config, not a silent empty-config proceed).
{
  const consumer = mkTmp('ws-gcm-local-');
  const emptyGlobal = mkTmp('ws-gcm-noglobal-');
  const ctx = withEnv(
    { WORKFLOW_SKILLS_GLOBAL_DIR: emptyGlobal, WORKFLOW_SKILLS_SHARED_DIR: undefined },
    () => resolver.resolveConsumerContext({ repoRoot: consumer }),
  );
  let error = null;
  try {
    resolver.requireProjectConfig(ctx);
  } catch (err) {
    error = err;
  }
  check(error !== null, 'local-without-hub fails closed instead of proceeding on empty config');
  check(/ws-configure-project/.test(String(error && error.message)), 'local fail-closed error points at ws-configure-project');
}

for (const dir of tmpRoots) fs.rmSync(dir, { recursive: true, force: true });
if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\ntest-global-config-missing: ok');
