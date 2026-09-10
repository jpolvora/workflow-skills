/**
 * Test Suite: Specialized Subagents Compiler & Host Projections
 *
 * Tests:
 * - AC1: Schema validation for defaults.specializedSubagents
 * - AC2, AC3, AC4: ws-configure-project integration & auto-compile on enable
 * - AC5, AC6, AC7, AC8, AC9, AC15: Cursor subagent generation, frontmatter, no host readonly on Step 5, disable-model-invocation: true, signature header
 * - AC10, AC11, AC16: host-dispatch protocol, fail-safe fallback, context-pointer zero-turn bootstrap
 * - AC12, AC14: Hub layout classification, clean mode protecting custom agents
 * - AC13, NS2: Drift detection in check mode
 * - NS1: Rejection of invalid/unsupported targetHost
 * - NS5: Refusal to overwrite custom non-generated agent without --force
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const COMPILER_SCRIPT = path.join(
  REPO_ROOT,
  '.agents',
  'skills',
  'ws-shared',
  'runtime',
  'scripts',
  'compile_host_subagents.cjs'
);
const AUTO_CONFIG_SCRIPT = path.join(
  REPO_ROOT,
  '.agents',
  'skills',
  'ws-configure-project',
  'scripts',
  'auto_configure.cjs'
);
const SCHEMA_FILE = path.join(
  REPO_ROOT,
  '.agents',
  'skills',
  'ws-shared',
  'runtime',
  'config.schema.json'
);
const HUB_LAYOUT_FILE = path.join(
  REPO_ROOT,
  '.agents',
  'skills',
  'ws-shared',
  'runtime',
  'hub-layout.json'
);
const HOST_DISPATCH_FILE = path.join(
  REPO_ROOT,
  '.agents',
  'skills',
  'ws-shared',
  'runtime',
  'host-dispatch.md'
);

const NODE = process.execPath;
const tmpDirs = [];
let failures = 0;

function ok(msg) {
  console.log(`PASS: ${msg}`);
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures += 1;
}

function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

function createTmpDir(prefix = 'ws-subagents-test-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}

function cleanup() {
  for (const dir of tmpDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

function runCompiler(args, cwd = REPO_ROOT, env = process.env) {
  return cp.spawnSync(NODE, [COMPILER_SCRIPT, ...args], {
    encoding: 'utf8',
    cwd,
    env,
  });
}

function runAutoConfigure(args, cwd = REPO_ROOT, env = process.env) {
  return cp.spawnSync(NODE, [AUTO_CONFIG_SCRIPT, ...args], {
    encoding: 'utf8',
    cwd,
    env,
  });
}

function setupMockRepo(mockRoot, { withCursor = true, withConfig = false, subagentsConfig = null } = {}) {
  // Create minimal structure mirroring repo
  const sharedDir = path.join(mockRoot, '.agents', 'skills', 'ws-shared');
  const templatesDir = path.join(sharedDir, 'templates');
  const runtimeDir = path.join(sharedDir, 'runtime');
  const runtimeScriptsDir = path.join(runtimeDir, 'scripts');

  fs.mkdirSync(templatesDir, { recursive: true });
  fs.mkdirSync(runtimeScriptsDir, { recursive: true });

  // Copy runtime schema, scripts and hub-layout
  fs.copyFileSync(SCHEMA_FILE, path.join(runtimeDir, 'config.schema.json'));
  fs.copyFileSync(HUB_LAYOUT_FILE, path.join(runtimeDir, 'hub-layout.json'));
  fs.copyFileSync(
    path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'scripts', 'resolve_consumer_root.cjs'),
    path.join(runtimeScriptsDir, 'resolve_consumer_root.cjs')
  );
  fs.copyFileSync(
    COMPILER_SCRIPT,
    path.join(runtimeScriptsDir, 'compile_host_subagents.cjs')
  );

  // Copy example config
  fs.copyFileSync(
    path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'templates', 'config.json.example'),
    path.join(templatesDir, 'config.json.example')
  );

  // Create mock skills with minimal SKILL.md
  const skills = [
    'ws-spec-write',
    'ws-plan-write',
    'ws-plan-interview',
    'ws-plan-to-tasks',
    'ws-implement-tasks',
    'ws-plan-verify',
    'ws-code-review',
    'ws-testing',
    'ws-ship-pr',
    'ws-fix-pr',
  ];

  for (const skill of skills) {
    const sDir = path.join(mockRoot, '.agents', 'skills', skill);
    fs.mkdirSync(sDir, { recursive: true });
    fs.writeFileSync(
      path.join(sDir, 'SKILL.md'),
      `---\nname: ${skill}\ndescription: Mock instructions for ${skill}\n---\n\n# ${skill}\n\nInstructions for ${skill} step.\n`,
      'utf8'
    );
  }

  if (withCursor) {
    fs.mkdirSync(path.join(mockRoot, '.cursor'), { recursive: true });
  }

  if (withConfig) {
    const baseConfig = JSON.parse(
      fs.readFileSync(path.join(templatesDir, 'config.json.example'), 'utf8')
    );
    baseConfig.project = { name: 'test-project', baseBranch: 'main' };
    baseConfig.verification = { backendTest: 'npm test' };
    if (subagentsConfig) {
      baseConfig.defaults = baseConfig.defaults || {};
      baseConfig.defaults.specializedSubagents = subagentsConfig;
    } else if (baseConfig.defaults) {
      delete baseConfig.defaults.specializedSubagents;
    }
    fs.writeFileSync(path.join(sharedDir, 'config.json'), JSON.stringify(baseConfig, null, 2), 'utf8');
  }

  return mockRoot;
}

// -------------------------------------------------------------
// Test 1: Schema Validation (AC1)
// -------------------------------------------------------------
function testSchemaValidation() {
  console.log('\n--- Test 1: Schema Validation (AC1) ---');
  const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
  const defProps = schema.properties?.defaults?.properties;

  assert(defProps && defProps.specializedSubagents, 'config.schema.json defines defaults.specializedSubagents');
  const subSchema = defProps.specializedSubagents;
  assert(subSchema.type === 'object', 'specializedSubagents is type object');
  assert(subSchema.properties?.enabled?.type === 'boolean', 'specializedSubagents.enabled is boolean');
  assert(subSchema.properties?.targetHost?.type === 'string', 'specializedSubagents.targetHost is string');
  assert(Array.isArray(subSchema.properties?.targetHost?.enum), 'specializedSubagents.targetHost defines enum');
  assert(
    ['cursor', 'claude', 'generic', 'auto'].every((h) => subSchema.properties.targetHost.enum.includes(h)),
    'specializedSubagents.targetHost enum contains cursor, claude, generic, auto'
  );
  assert(subSchema.properties?.agentPrefix?.type === 'string', 'specializedSubagents.agentPrefix is string');
  assert(subSchema.properties?.directory?.type === 'string', 'specializedSubagents.directory is string');
  assert(subSchema.properties?.scope?.type === 'string', 'specializedSubagents.scope is string');
  assert(Array.isArray(subSchema.properties?.scope?.enum), 'specializedSubagents.scope defines enum');
  assert(
    ['projectLevel', 'userLevel', 'project', 'user'].every((s) => subSchema.properties.scope.enum.includes(s)),
    'specializedSubagents.scope enum contains projectLevel, userLevel, project, user'
  );
}

// -------------------------------------------------------------
// Test 2: Hub Layout Classification (AC14)
// -------------------------------------------------------------
function testHubLayoutClassification() {
  console.log('\n--- Test 2: Hub Layout Classification (AC14) ---');
  const layout = JSON.parse(fs.readFileSync(HUB_LAYOUT_FILE, 'utf8'));
  const proj = layout.categories?.generatedHostProjections;
  assert(proj, 'hub-layout.json categories contains generatedHostProjections');
  assert(
    proj?.roots?.includes('.cursor/agents') &&
      proj?.roots?.includes('.claude/agents') &&
      proj?.roots?.includes('.agents/projections'),
    'generatedHostProjections includes .cursor/agents, .claude/agents, .agents/projections'
  );
  assert(
    proj?.sourceControl === 'optional-track-or-ignore',
    'generatedHostProjections sourceControl is optional-track-or-ignore'
  );
}

// -------------------------------------------------------------
// Test 3: Host Dispatch Documentation & Contracts (AC10, AC11, AC16)
// -------------------------------------------------------------
function testHostDispatchContract() {
  console.log('\n--- Test 3: Host Dispatch Protocol Contract (AC10, AC11, AC16) ---');
  const content = fs.readFileSync(HOST_DISPATCH_FILE, 'utf8');
  assert(
    content.includes('Specialized Named Subagent Dispatch (when enabled)'),
    'host-dispatch.md defines Tier 1 named specialized subagents'
  );
  assert(
    content.includes('Fail-safe Fallback'),
    'host-dispatch.md specifies fail-safe fallback to generic or inline'
  );
  assert(
    content.includes('Zero-Turn Bootstrap'),
    'host-dispatch.md documents zero-turn bootstrap and discrete context pointers'
  );
  assert(
    content.includes('specializedSubagents'),
    'host-dispatch.md references defaults.specializedSubagents configuration'
  );
  assert(
    content.includes('Never resolve a project projection from the global skill installation'),
    'host-dispatch.md keeps named projections consumer-local in hybrid installs'
  );
  assert(
    content.includes('configuredModel'),
    'host-dispatch.md documents configured-versus-actual model telemetry'
  );
  assert(
    content.includes('Product-tree readonly'),
    'host-dispatch.md warns that Step 5 product-readonly is not host question-only readonly'
  );
}

// -------------------------------------------------------------
// Test 4: Compilation and Generation (AC5-AC9, AC15)
// -------------------------------------------------------------
function testCompilerGeneration() {
  console.log('\n--- Test 4: Compilation and Generation (AC5-AC9, AC15) ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-gen-test-'), { withCursor: true });

  const res = runCompiler(['--repo-root', mockRepo, '--json']);
  assert(res.status === 0, `Compiler exited with 0 (got ${res.status}): ${res.stderr}`);

  const json = JSON.parse(res.stdout || '{}');
  assert(json.ok === true, 'JSON response indicates ok: true');
  assert(json.totalAgents === 10, 'Compiled exactly 10 step agents');

  const agentsDir = path.join(mockRepo, '.cursor', 'agents');
  assert(fs.existsSync(agentsDir), '.cursor/agents directory created');

  const files = fs.readdirSync(agentsDir);
  assert(files.length === 10, `Expected 10 files in .cursor/agents, found ${files.length}`);

  // Test Step 00
  const step00Path = path.join(agentsDir, 'ws-step-00-spec-write.md');
  assert(fs.existsSync(step00Path), 'ws-step-00-spec-write.md exists');
  const step00Content = fs.readFileSync(step00Path, 'utf8');
  assert(step00Content.includes('<!-- @generated by workflow-skills compile_host_subagents.cjs'), 'Contains @generated signature');
  assert(step00Content.includes('name: ws-step-00-spec-write'), 'Frontmatter contains correct name');
  assert(step00Content.includes('disable-model-invocation: true'), 'Frontmatter contains disable-model-invocation: true');
  assert(/do not invoke autonomously/i.test(step00Content), 'Description restricts autonomous delegation');
  assert(!step00Content.includes('readonly: true'), 'Step 00 does not have readonly: true');
  assert(
    step00Content.includes('"files_touched": {') &&
      step00Content.includes('"created": []') &&
      step00Content.includes('"modified": []') &&
      step00Content.includes('"deleted": []'),
    'compiled step output contract uses categorized files_touched',
  );

  // Test Step 05: product-tree readonly in body, never host Ask-mode readonly
  const step05Path = path.join(agentsDir, 'ws-step-05-plan-verify.md');
  assert(fs.existsSync(step05Path), 'ws-step-05-plan-verify.md exists');
  const step05Content = fs.readFileSync(step05Path, 'utf8');
  const step05Fm = step05Content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert(step05Fm, 'Step 05 has YAML frontmatter');
  assert(!/^readonly:\s*true\s*$/m.test(step05Fm[1]), 'Step 05 frontmatter omits host readonly: true (question-only mode blocks Shell)');
  assert(step05Content.includes('Product-tree readonly (not host question-only mode)'), 'Step 05 body states product-tree readonly contract');
  assert(step05Content.includes('ac_ledger.cjs'), 'Step 05 body allows ledger/Shell verification');
  assert(step05Content.includes('name: ws-step-05-plan-verify'), 'Step 05 name is correct');

  // Test custom prefix
  const resPrefix = runCompiler(['--repo-root', mockRepo, '--prefix', 'custom', '--json']);
  assert(resPrefix.status === 0, 'Compiler accepts custom prefix');
  assert(fs.existsSync(path.join(agentsDir, 'custom-step-00-spec-write.md')), 'Agent generated with custom prefix');
}

// -------------------------------------------------------------
// Test 5: Drift Detection in Check Mode (AC13, NS2)
// -------------------------------------------------------------
function testDriftDetection() {
  console.log('\n--- Test 5: Drift Detection in Check Mode (AC13, NS2) ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-drift-test-'), { withCursor: true });

  // Initial compile
  runCompiler(['--repo-root', mockRepo]);

  // Check should pass
  const checkRes1 = runCompiler(['--repo-root', mockRepo, '--check', '--json']);
  assert(checkRes1.status === 0, `Check mode passes on clean directory (status ${checkRes1.status})`);
  const checkJson1 = JSON.parse(checkRes1.stdout || '{}');
  assert(checkJson1.ok === true, 'Check mode ok: true');
  assert(checkJson1.matchingCount === 10, 'Check mode matchingCount: 10');

  // Modify a generated file
  const step04File = path.join(mockRepo, '.cursor', 'agents', 'ws-step-04-implement-tasks.md');
  fs.appendFileSync(step04File, '\n<!-- modified by user -->\n');

  // Check should fail with drift
  const checkRes2 = runCompiler(['--repo-root', mockRepo, '--check', '--json']);
  assert(checkRes2.status === 1, 'Check mode exits with 1 on drifting file');
  const checkJson2 = JSON.parse(checkRes2.stdout || '{}');
  assert(checkJson2.ok === false, 'Check mode ok: false on drift');
  assert(checkJson2.drifting?.includes('ws-step-04-implement-tasks.md'), 'Drifting file identified in report');

  // Delete a generated file
  fs.unlinkSync(step04File);
  const checkRes3 = runCompiler(['--repo-root', mockRepo, '--check', '--json']);
  assert(checkRes3.status === 1, 'Check mode exits with 1 on missing file');
  const checkJson3 = JSON.parse(checkRes3.stdout || '{}');
  assert(checkJson3.missing?.includes('ws-step-04-implement-tasks.md'), 'Missing file identified in report');
}

// -------------------------------------------------------------
// Test 6: Clean Mode and Custom File Protection (AC12, NS5)
// -------------------------------------------------------------
function testCleanAndCustomFileProtection() {
  console.log('\n--- Test 6: Clean Mode and Custom File Protection (AC12, NS5) ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-clean-test-'), { withCursor: true });

  // Compile subagents
  runCompiler(['--repo-root', mockRepo]);

  const agentsDir = path.join(mockRepo, '.cursor', 'agents');
  const customAgentFile = path.join(agentsDir, 'custom-non-generated.md');
  fs.writeFileSync(customAgentFile, '---\nname: my-agent\n---\nCustom agent body without signature\n', 'utf8');

  // Run clean
  const cleanRes = runCompiler(['--repo-root', mockRepo, '--clean', '--json']);
  assert(cleanRes.status === 0, 'Clean command exited with 0');
  const cleanJson = JSON.parse(cleanRes.stdout || '{}');
  assert(cleanJson.removedCount === 10, 'Clean removed 10 generated agents');
  assert(cleanJson.preservedCustomCount === 1, 'Clean preserved 1 custom agent');
  assert(fs.existsSync(customAgentFile), 'Custom non-generated agent file still exists');
  assert(!fs.existsSync(path.join(agentsDir, 'ws-step-00-spec-write.md')), 'Generated agent was removed');
}

// -------------------------------------------------------------
// Test 7: Refusal to Overwrite Custom Agent Without --force (NS5)
// -------------------------------------------------------------
function testRefusalToOverwriteWithoutForce() {
  console.log('\n--- Test 7: Refusal to Overwrite Custom Agent Without --force (NS5) ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-overwrite-test-'), { withCursor: true });
  const agentsDir = path.join(mockRepo, '.cursor', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  // Pre-create ws-step-00-spec-write.md WITHOUT the generated signature header
  const customFile = path.join(agentsDir, 'ws-step-00-spec-write.md');
  fs.writeFileSync(customFile, '---\nname: ws-step-00-spec-write\n---\nCustom ungenerated content\n', 'utf8');

  // Run compiler without force
  const compileRes1 = runCompiler(['--repo-root', mockRepo, '--json']);
  assert(compileRes1.status === 1, 'Compiler exits with 1 when custom agent collision occurs');
  const json1 = JSON.parse(compileRes1.stdout || '{}');
  assert(json1.collisionCount === 1, 'Collisions reported');
  assert(json1.collisions?.includes('ws-step-00-spec-write.md'), 'Specific colliding file reported');

  // Content must remain untouched
  const contentBefore = fs.readFileSync(customFile, 'utf8');
  assert(contentBefore.includes('Custom ungenerated content'), 'Custom file was not overwritten');

  // Run compiler with force
  const compileRes2 = runCompiler(['--repo-root', mockRepo, '--force', '--json']);
  assert(compileRes2.status === 0, 'Compiler with --force exits with 0');
  const contentAfter = fs.readFileSync(customFile, 'utf8');
  assert(contentAfter.includes('<!-- @generated by workflow-skills'), 'Custom file was overwritten when --force was specified');
}

// -------------------------------------------------------------
// Test 8: Unsupported Host Rejection (NS1)
// -------------------------------------------------------------
function testUnsupportedHostRejection() {
  console.log('\n--- Test 8: Unsupported Host Rejection (NS1) ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-host-test-'), { withCursor: true });

  const res = runCompiler(['--repo-root', mockRepo, '--host', 'unsupported-host-xyz', '--json']);
  assert(res.status === 1, 'Compiler exits with 1 for unsupported host');
  const json = JSON.parse(res.stdout || '{}');
  assert(json.ok === false, 'Result indicates ok: false');
  assert(/unsupported host/i.test(json.error || ''), `Error mentions unsupported host: ${json.error}`);
}

// -------------------------------------------------------------
// Test 9: auto_configure.cjs Integration & Auto-Compile (AC2, AC3, AC4)
// -------------------------------------------------------------
function testAutoConfigureIntegration() {
  console.log('\n--- Test 9: auto_configure.cjs Integration & Auto-Compile (AC2, AC3, AC4) ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-autoconf-test-'), { withCursor: true, withConfig: true });

  // Run auto_configure for specializedSubagents section
  const res1 = runAutoConfigure(['--repo-root', mockRepo, '--section', 'specializedSubagents', '--json']);
  assert(res1.status === 0, `auto_configure exited with 0 (got ${res1.status}): ${res1.stderr}`);
  const json1 = JSON.parse(res1.stdout || '{}');
  assert(json1.ok === true && json1.sectionOk === true, 'Section configuration succeeded');

  const configPath = path.join(mockRepo, '.agents', 'skills', 'ws-shared', 'config.json');
  const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert(updatedConfig.defaults?.specializedSubagents, 'defaults.specializedSubagents written to config.json');
  assert(updatedConfig.defaults.specializedSubagents.enabled === false, 'enabled defaults to false');
  assert(updatedConfig.defaults.specializedSubagents.targetHost === 'cursor', 'targetHost detected as cursor because .cursor exists');

  // Now enable specializedSubagents and re-run auto_configure
  updatedConfig.defaults.specializedSubagents.enabled = true;
  fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf8');

  const res2 = runAutoConfigure(['--repo-root', mockRepo, '--section', 'specializedSubagents', '--json']);
  assert(res2.status === 0, 'auto_configure with enabled=true succeeded');
  const json2 = JSON.parse(res2.stdout || '{}');
  assert(json2.compiledSubagents, 'auto_configure triggered subagent compilation');
  assert(json2.compiledSubagents.ok === true, 'Subagent compilation succeeded via auto_configure');

  const agentsDir = path.join(mockRepo, '.cursor', 'agents');
  assert(fs.existsSync(path.join(agentsDir, 'ws-step-00-spec-write.md')), 'Subagent files compiled to .cursor/agents on enable');
}

// Prefix validation via CLI (traversal / illegal chars exit 1)
function testPrefixValidation() {
  console.log('\n--- Test 10: Prefix validation rejects traversal ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-prefix-test-'), { withCursor: true });

  const bad = runCompiler(['--repo-root', mockRepo, '--prefix', '../../evil', '--json']);
  assert(bad.status === 1, 'Compiler exits 1 for traversal prefix');
  const badJson = JSON.parse(bad.stdout || '{}');
  assert(badJson.ok === false, 'Traversal prefix reports ok: false');
  assert(/invalid agent prefix/i.test(badJson.error || ''), 'Error names invalid agent prefix');

  const bad2 = runCompiler(['--repo-root', mockRepo, '--prefix', 'Bad_Prefix!', '--json']);
  assert(bad2.status === 1, 'Compiler exits 1 for illegal prefix chars');
}

// auto with no host markers falls back to neutral generic (no host dir created)
function testAutoGenericFallback() {
  console.log('\n--- Test 11: auto fallback is neutral generic ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-auto-test-'), { withCursor: false });

  const res = runCompiler(['--repo-root', mockRepo, '--host', 'auto', '--json']);
  assert(res.status === 0, `auto compile exited 0 (got ${res.status}): ${res.stderr}`);
  const json = JSON.parse(res.stdout || '{}');
  assert(json.host === 'generic', `auto with no markers resolves generic (got ${json.host})`);
  assert(fs.existsSync(path.join(mockRepo, '.agents', 'projections', 'ws-step-00-spec-write.md')), 'generic projection written');
  assert(!fs.existsSync(path.join(mockRepo, '.cursor')), '.cursor/ not created unrequested');
}

// Second compile is idempotent (skips identical, check still green)
function testIdempotentRecompile() {
  console.log('\n--- Test 12: Idempotent recompile skips identical ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-idem-test-'), { withCursor: true });

  const first = runCompiler(['--repo-root', mockRepo, '--json']);
  assert(first.status === 0, 'first compile exits 0');
  const agentsDir = path.join(mockRepo, '.cursor', 'agents');
  const target = path.join(agentsDir, 'ws-step-00-spec-write.md');
  const mtime1 = fs.statSync(target).mtimeMs;

  const second = runCompiler(['--repo-root', mockRepo, '--json']);
  assert(second.status === 0, 'second compile exits 0');
  const json2 = JSON.parse(second.stdout || '{}');
  assert(json2.skippedIdenticalCount === 10, `second run skips 10 identical (got ${json2.skippedIdenticalCount})`);
  assert(json2.totalAgents === 10, 'totalAgents still 10 on rerun');
  assert(fs.statSync(target).mtimeMs === mtime1, 'identical file mtime untouched');

  const check = runCompiler(['--repo-root', mockRepo, '--check', '--json']);
  assert(check.status === 0, 'check passes after idempotent rerun');
}

// Compiled body: banner stripped, links rewritten, schema + tokens note present,
// claude dialect omits cursor-only keys
function testCompiledBodyRewrites() {
  console.log('\n--- Test 13: Compiled body rewrites (links/banner/schema) ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-body-test-'), { withCursor: true });
  const skillFile = path.join(mockRepo, '.agents', 'skills', 'ws-plan-write', 'SKILL.md');
  fs.writeFileSync(
    skillFile,
    '---\nname: ws-plan-write\ndescription: x\n---\n\n> When this skill is loaded, output "ws-plan-write loaded."\n\nSee [entry](../ws-shared/runtime/config-resolution.md), [template](references/PLAN-TEMPLATE.md), and `{us-dir}/plan.index.json`.\n',
    'utf8'
  );

  const res = runCompiler(['--repo-root', mockRepo, '--host', 'cursor', '--json']);
  assert(res.status === 0, 'compile with enriched skill exits 0');
  const body = fs.readFileSync(path.join(mockRepo, '.cursor', 'agents', 'ws-step-01-plan-write.md'), 'utf8');
  assert(!body.includes('When this skill is loaded'), 'load banner stripped from projection');
  assert(body.includes('](../../.agents/skills/ws-shared/runtime/config-resolution.md)'), 'skill-relative link rewritten to projection-relative');
  assert(body.includes('](../../.agents/skills/ws-plan-write/references/PLAN-TEMPLATE.md)'), 'bare sibling link rewritten to canonical skill directory');
  assert(!body.includes('](../ws-shared/'), 'no stale skill-relative links remain');
  assert(!body.includes('](references/PLAN-TEMPLATE.md)'), 'no stale bare sibling links remain');
  assert(body.includes('## Path tokens (expand before use)'), 'path-tokens note present');
  assert(body.includes('## Step output contract (mandatory)'), 'step-output schema appended');
  assert(body.includes('"status": "completed | failed | skipped"'), 'step-output schema fields present');
  assert(body.includes('.runtime/step-{step}-output.json'), 'step-output schema mentions .runtime step output file');

  const resClaude = runCompiler(['--repo-root', mockRepo, '--host', 'claude', '--json']);
  assert(resClaude.status === 0, 'claude compile exits 0');
  const claudeBody = fs.readFileSync(path.join(mockRepo, '.claude', 'agents', 'ws-step-01-plan-write.md'), 'utf8');
  assert(!claudeBody.includes('disable-model-invocation'), 'claude projection omits cursor-only frontmatter key');
}

// Clean log labels the actual host dialect
function testCleanHostLabel() {
  console.log('\n--- Test 14: Clean log labels actual host ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-cleanlabel-test-'), { withCursor: true });
  runCompiler(['--repo-root', mockRepo, '--host', 'claude']);

  const clean = cp.spawnSync(NODE, [COMPILER_SCRIPT, '--repo-root', mockRepo, '--host', 'claude', '--clean'], {
    encoding: 'utf8',
  });
  assert(clean.status === 0, 'claude clean exits 0');
  assert(/host=claude/.test(clean.stdout || ''), `clean log labels host=claude (got ${(clean.stdout || '').split('\n')[0]})`);
}

// Existing enabled:true is preserved (not reset to false) without --force
function testAutoConfigurePreservesEnabled() {
  console.log('\n--- Test 15: auto_configure preserves enabled:true ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-preserve-test-'), { withCursor: true, withConfig: true });
  const configPath = path.join(mockRepo, '.agents', 'skills', 'ws-shared', 'config.json');
  const base = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  base.defaults = base.defaults || {};
  base.defaults.specializedSubagents = { enabled: true, targetHost: 'generic', agentPrefix: 'ws' };
  fs.writeFileSync(configPath, JSON.stringify(base, null, 2), 'utf8');

  const res = runAutoConfigure(['--repo-root', mockRepo, '--section', 'specializedSubagents', '--json']);
  assert(res.status === 0, 'section rerun exits 0');
  const updated = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert(updated.defaults.specializedSubagents.enabled === true, 'enabled:true preserved without --force');
  assert(updated.defaults.specializedSubagents.targetHost === 'generic', 'custom targetHost preserved without --force');
}

// Test 16: User-level directory compilation via CLI and config
function testUserLevelDirectoryCompilation() {
  console.log('\n--- Test 16: User-level directory compilation (userLevel / $HOME) ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-userlvl-repo-'), { withCursor: true });
  const mockHome = createTmpDir('ws-userlvl-home-');
  const env = { ...process.env, USERPROFILE: mockHome, HOME: mockHome };

  // 1. Via CLI flag --user-level
  const resFlag = runCompiler(['--repo-root', mockRepo, '--host', 'cursor', '--user-level', '--json'], REPO_ROOT, env);
  assert(resFlag.status === 0, `user-level CLI compile exited 0 (got ${resFlag.status}): ${resFlag.stderr}`);
  const userAgentsDir = path.join(mockHome, '.cursor', 'agents');
  assert(fs.existsSync(path.join(userAgentsDir, 'ws-step-00-spec-write.md')), 'Agent compiled to mockHome/.cursor/agents');
  const checkRes = runCompiler(['--repo-root', mockRepo, '--host', 'cursor', '--user-level', '--check', '--json'], REPO_ROOT, env);
  assert(checkRes.status === 0, 'Check passes on userLevel directory');

  // 2. Via config defaults.specializedSubagents.directory = 'userLevel'
  const mockRepo2 = setupMockRepo(createTmpDir('ws-userlvl-cfg-'), {
    withCursor: true,
    withConfig: true,
    subagentsConfig: { enabled: true, targetHost: 'cursor', agentPrefix: 'ws', directory: 'userLevel' },
  });
  const mockHome2 = createTmpDir('ws-userlvl-home2-');
  const env2 = { ...process.env, USERPROFILE: mockHome2, HOME: mockHome2 };
  const resCfg = runCompiler(['--repo-root', mockRepo2, '--json'], REPO_ROOT, env2);
  assert(resCfg.status === 0, `config-driven userLevel compile exited 0 (got ${resCfg.status})`);
  const userAgentsDir2 = path.join(mockHome2, '.cursor', 'agents');
  assert(fs.existsSync(path.join(userAgentsDir2, 'ws-step-00-spec-write.md')), 'Agent compiled to mockHome2 from config directory setting');
}

// Test 17: Dynamic project-relative directory resolution
function testDynamicProjectRelativeDirectory() {
  console.log('\n--- Test 17: Dynamic project-relative directory resolution ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-proj-rel-'), { withCursor: true });

  // 1. Default projectLevel resolves to mockRepo/.cursor/agents
  const resDefault = runCompiler(['--repo-root', mockRepo, '--project-level', '--json']);
  assert(resDefault.status === 0, 'project-level compile exits 0');
  assert(fs.existsSync(path.join(mockRepo, '.cursor', 'agents', 'ws-step-00-spec-write.md')), 'projectLevel resolves to project-relative .cursor/agents');

  // 2. Custom relative path dynamically resolved against project root
  const resCustom = runCompiler(['--repo-root', mockRepo, '--directory', 'custom-agents-dir', '--json']);
  assert(resCustom.status === 0, 'custom relative directory compile exits 0');
  assert(fs.existsSync(path.join(mockRepo, 'custom-agents-dir', 'ws-step-00-spec-write.md')), 'Custom relative directory dynamically resolved against repo root');
}

// Test 18: auto_configure preserves directory configuration
function testAutoConfigurePreservesDirectory() {
  console.log('\n--- Test 18: auto_configure preserves directory setting ---');
  const mockRepo = setupMockRepo(createTmpDir('ws-dir-preserve-'), { withCursor: true, withConfig: true });
  const mockHome = createTmpDir('ws-dir-preserve-home-');
  const env = { ...process.env, USERPROFILE: mockHome, HOME: mockHome };
  const configPath = path.join(mockRepo, '.agents', 'skills', 'ws-shared', 'config.json');
  const base = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  base.defaults = base.defaults || {};
  base.defaults.specializedSubagents = { enabled: true, targetHost: 'cursor', agentPrefix: 'ws', directory: 'userLevel' };
  fs.writeFileSync(configPath, JSON.stringify(base, null, 2), 'utf8');

  const res = runAutoConfigure(['--repo-root', mockRepo, '--section', 'specializedSubagents', '--json'], REPO_ROOT, env);
  assert(res.status === 0, 'section rerun exits 0');
  const updated = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert(updated.defaults.specializedSubagents.directory === 'userLevel', 'custom directory:userLevel preserved without --force');
}

// -------------------------------------------------------------
// Run All Tests
// -------------------------------------------------------------
try {
  testSchemaValidation();
  testHubLayoutClassification();
  testHostDispatchContract();
  testCompilerGeneration();
  testDriftDetection();
  testCleanAndCustomFileProtection();
  testRefusalToOverwriteWithoutForce();
  testUnsupportedHostRejection();
  testAutoConfigureIntegration();
  testPrefixValidation();
  testAutoGenericFallback();
  testIdempotentRecompile();
  testCompiledBodyRewrites();
  testCleanHostLabel();
  testAutoConfigurePreservesEnabled();
  testUserLevelDirectoryCompilation();
  testDynamicProjectRelativeDirectory();
  testAutoConfigurePreservesDirectory();
} finally {
  cleanup();
}

console.log(`\n================================`);
if (failures === 0) {
  console.log(`ALL SPECIALIZED SUBAGENTS TESTS PASSED!`);
  process.exit(0);
} else {
  console.error(`${failures} TEST(S) FAILED.`);
  process.exit(1);
}
