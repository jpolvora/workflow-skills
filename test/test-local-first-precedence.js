/**
 * Local-first precedence + stale monitor contract (issue #308).
 * Run: node test/test-local-first-precedence.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const resolver = require('../.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs');
const monitorScript = path.join(repoRoot, '.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');
const monitor = require(monitorScript);
const tempRoots = [];
let failures = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failures += 1;
}

function check(condition, message) {
  if (condition) console.log(`ok: ${message}`);
  else fail(message);
}

function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function writeConfig(root, config) {
  write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify(config, null, 2));
}

function baseConfig(overrides = {}) {
  return {
    project: { name: 'precedence-test', baseBranch: 'main' },
    plans: { dir: '.agents/plans', specsDir: '.agents/specs', useWorktrees: false, worktreesDir: '.agents/plans/{slug}/worktrees' },
    verification: {},
    defaults: { minVerifyScore: 9 },
    ...overrides,
  };
}

function runMonitor(args, cwd, env = {}) {
  return cp.spawnSync(process.execPath, [monitorScript, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

// 1. Shared precedence matrix covers all seven contract dimensions.
const matrix = resolver.describePrecedenceMatrix();
check(Array.isArray(matrix) && matrix.length === 7, 'precedence matrix has seven dimensions');
for (const dimension of ['config', 'skill-bodies', 'shared-runtime', 'harness', 'specs', 'plans-state', 'fallback']) {
  check(matrix.some((row) => row.dimension === dimension), `matrix covers ${dimension}`);
}

// 2. Local config wins over the global hub when both exist.
const consumer = mkTmp('ws-precedence-consumer-');
const globalHub = mkTmp('ws-precedence-global-');
writeConfig(consumer, baseConfig({ plans: { dir: '.agents/consumer-plans', specsDir: '.agents/consumer-specs', useWorktrees: false } }));
write(
  path.join(globalHub, 'ws-shared/config.json'),
  JSON.stringify(baseConfig({ plans: { dir: '.agents/global-plans', specsDir: '.agents/global-specs' } }, null, 2)),
);
const localCtx = resolver.resolveConsumerContext({ repoRoot: consumer, scriptFile: path.join(globalHub, 'ws-monitor/scripts/monitor_snapshot.cjs') });
check(localCtx.configSource === 'project', 'local config wins over global hub');
check(String(localCtx.config?.plans?.dir || '').includes('consumer-plans'), 'winning config is the consumer-local file');
check(localCtx.configError == null, 'valid local config sets no configError');

// 3. Global fallback only when the local candidate is absent, and it stays observable.
const bare = mkTmp('ws-precedence-bare-');
const fallbackCtx = resolver.resolveConsumerContext({ repoRoot: bare, scriptFile: path.join(globalHub, 'ws-x/scripts/y.cjs') });
check(fallbackCtx.configSource === 'global' || fallbackCtx.configPath.includes('.agents'), 'fallback path resolves observably');
const fallbackDiagnostic = resolver.resolveResolvedContext({ repoRoot: bare, scriptFile: path.join(globalHub, 'ws-x/scripts/y.cjs') });
check(fallbackDiagnostic.configSource != null && fallbackDiagnostic.skillsSource != null, 'fallback source stays observable in resolved context');

// 4. Present-but-malformed local config never silently falls back to global.
const broken = mkTmp('ws-precedence-broken-');
write(path.join(broken, '.agents/skills/ws-shared/config.json'), '{ not-json');
const brokenCtx = resolver.resolveConsumerContext({ repoRoot: broken, scriptFile: path.join(globalHub, 'ws-x/scripts/y.cjs') });
check(brokenCtx.configError != null, 'malformed local config surfaces configError');
check(String(brokenCtx.configPath).includes('config.json'), 'malformed local config keeps the local path as source of record');

// 5. Local skill bodies and runtime win over global copies.
write(path.join(consumer, '.agents/skills/ws-demo/SKILL.md'), '# local body\n');
write(path.join(globalHub, 'ws-demo/SKILL.md'), '# global body\n');
const skillPath = resolver.resolveSkillMdPath({ repoRoot: consumer, globalSkillsRoot: globalHub }, 'ws-demo');
check(String(skillPath).includes('.agents'), 'local skill body wins over global copy');
fs.mkdirSync(path.join(consumer, '.agents/skills/ws-shared/runtime'), { recursive: true });
const runtimeCtx = resolver.resolveConsumerContext({ repoRoot: consumer, scriptFile: path.join(globalHub, 'ws-x/scripts/y.cjs') });
check(String(runtimeCtx.runtimeSource).includes('.agents'), 'local runtime wins over global runtime');

// 6. Local specs/plans directories win in the resolved diagnostic.
const diagnostic = resolver.resolveResolvedContext({ repoRoot: consumer, scriptFile: path.join(globalHub, 'ws-x/scripts/y.cjs'), slug: 'demo', workflowId: 'wf-demo' });
for (const key of ['repoRoot', 'configPath', 'skillsRoot', 'sharedDir', 'specsDir', 'plansDir', 'worktreePath', 'workflowId']) {
  check(diagnostic[key] !== undefined, `resolved context includes ${key}`);
}
check(String(diagnostic.specsDir).includes('consumer-specs'), 'resolved specs dir comes from consumer-local config');
check(String(diagnostic.plansDir).includes('consumer-plans'), 'resolved plans dir comes from consumer-local config');

// 7. useWorktrees false/true plus a mid-run config change invalidates cached resolution.
const worktreeRoot = mkTmp('ws-precedence-worktrees-');
writeConfig(worktreeRoot, baseConfig());
const before = resolver.resolveResolvedContext({ repoRoot: worktreeRoot, slug: 'demo', workflowId: 'wf-demo', branch: 'feature-a' });
check(String(before.plansDir).includes('.agents/plans'), 'worktree fixture starts on default plans dir');
writeConfig(worktreeRoot, baseConfig({ plans: { dir: '.agents/consumer-plans', specsDir: '.agents/specs', useWorktrees: true, worktreesDir: '.agents/plans/{slug}/worktrees' } }));
const after = resolver.resolveResolvedContext({ repoRoot: worktreeRoot, slug: 'demo', workflowId: 'wf-demo', branch: 'feature-a' });
check(after.plansDir !== before.plansDir, 'config change after workflow start changes resolution');
const refreshed = resolver.refreshResolvedContext({ repoRoot: worktreeRoot, slug: 'demo', workflowId: 'wf-demo', branch: 'feature-b' });
check(resolver.isResolutionStale(before, after) === true, 'stale detector fires after config change');
check(resolver.isResolutionStale(after, { ...after }) === false, 'identical diagnostics are not stale');
check(resolver.isResolutionStale(after, refreshed) === true, 'stale detector fires after branch change');

// 8. Monitor flags telemetry that advanced beyond the selected state file.
const staleRoot = mkTmp('ws-precedence-stale-');
writeConfig(staleRoot, baseConfig());
const staleSlug = 'stale-demo';
const staleDir = path.join(staleRoot, '.agents/plans', staleSlug);
write(
  path.join(staleDir, 'wf-stale.state.json'),
  JSON.stringify({ stateVersion: 3, revision: 1, workflowId: 'wf-stale', slug: staleSlug, workflowType: 'standard', status: 'active', currentStep: 2, completedSteps: [0, 1], skippedSteps: [], verificationScore: 9 }),
);
write(
  path.join(staleDir, 'telemetry.jsonl'),
  `${JSON.stringify({ type: 'finish', step: 4, packageVersion: '0.4.13', filesTouched: { created: ['a.js'], modified: [], deleted: [] } })}\n`,
);
const staleResult = runMonitor(['--repo-root', staleRoot, '--slug', staleSlug, '--json'], staleRoot);
if (staleResult.status !== 0) fail(`stale monitor run failed: ${staleResult.stderr || staleResult.stdout}`);
else {
  const report = JSON.parse(staleResult.stdout);
  check(report.resolvedContext != null, 'monitor snapshot includes resolved context');
  check(report.findings.some((finding) => finding.code === 'stale-state'), 'monitor reports stale-state when telemetry is ahead');
}

// 8b. Revision-race branch: equal sibling revisions are not newer evidence.
const raceSibling = path.join(staleDir, 'wf-stale-sibling.state.json');
const raceState = (revision) => ({ currentStep: 2, revision });
write(
  raceSibling,
  JSON.stringify({ stateVersion: 3, revision: 1, workflowId: 'wf-stale', slug: staleSlug, workflowType: 'standard', status: 'active', currentStep: 2, completedSteps: [0, 1], skippedSteps: [], verificationScore: 9 }),
);
const raceEqual = monitor.detectStaleState(
  raceState(1),
  staleDir,
  { events: [], errors: [] },
  path.join(staleDir, 'wf-stale.state.json'),
  staleRoot,
);
check(!raceEqual.some((finding) => finding.message.includes('newer state evidence')), 'equal sibling revisions report no newer-evidence finding');
write(
  raceSibling,
  JSON.stringify({ stateVersion: 3, revision: 5, workflowId: 'wf-stale', slug: staleSlug, workflowType: 'standard', status: 'active', currentStep: 2, completedSteps: [0, 1], skippedSteps: [], verificationScore: 9 }),
);
const raceNewer = monitor.detectStaleState(
  raceState(1),
  staleDir,
  { events: [], errors: [] },
  path.join(staleDir, 'wf-stale.state.json'),
  staleRoot,
);
check(raceNewer.some((finding) => finding.message.includes('newer state evidence')), 'strictly newer sibling revision still reports newer evidence');
fs.rmSync(raceSibling);

// 9. Monitor flags branch mismatch without depending on the real checkout.
const mismatched = monitor.detectContextMismatch({ branch: 'feature-x' }, { branch: 'main', head: 'abc', topLevel: repoRoot }, repoRoot);
check(mismatched.some((finding) => finding.code === 'context-mismatch'), 'branch mismatch helper reports context-mismatch');
const matched = monitor.detectContextMismatch({ branch: 'main' }, { branch: 'main', head: 'abc', topLevel: repoRoot }, repoRoot);
check(!matched.some((finding) => finding.code === 'context-mismatch'), 'matching branch reports no mismatch');
const unknown = monitor.detectContextMismatch({}, { branch: 'main', head: 'abc', topLevel: repoRoot }, repoRoot);
check(!unknown.some((finding) => finding.code === 'context-mismatch'), 'missing state branch stays unknown instead of mismatched');

// 10. Monitor surfaces unreadable local config instead of silently using global state.
const unreadableRoot = mkTmp('ws-precedence-unreadable-');
write(path.join(unreadableRoot, '.agents/skills/ws-shared/config.json'), '{ broken');
const unreadableResult = runMonitor(['--repo-root', unreadableRoot, '--json'], unreadableRoot);
if (unreadableResult.status !== 0) fail(`unreadable-config monitor run failed: ${unreadableResult.stderr || unreadableResult.stdout}`);
else {
  const report = JSON.parse(unreadableResult.stdout);
  check(report.findings.some((finding) => finding.code === 'config-unreadable'), 'monitor reports config-unreadable for malformed local config');
}

for (const directory of tempRoots) fs.rmSync(directory, { recursive: true, force: true });
if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\ntest-local-first-precedence: ok');
