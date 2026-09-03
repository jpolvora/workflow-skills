import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const resolver = require('../.agents/skills/ws-shared/scripts/resolve_consumer_root.cjs');
const { assert, path, repoRoot, temp, run, write } = utils;
const registerNode = path.join(repoRoot, '.agents/skills/ws-spec-provider-local/scripts/register_local_spec.cjs');
const probe = path.join(repoRoot, '.agents/skills/ws-testing/scripts/probe_test_surface.cjs');
const root = temp('ws-runtime-portability-');
write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans', specsDir: '.agents/specs' },
  defaults: { testGlobs: ['test/**/*.js'] },
  verification: { backendTest: 'node --test' },
  fable: { auditVerdictsBlockShip: true },
}));
write(path.join(root, 'input.spec.md'), `---
id: null
slug: portable
title: Portable
source: local
specDate: 2026-08-21
---
## Description
Portable.
## Acceptance Criteria
- AC1: Work.
`);
assert.strictEqual(run(registerNode, ['--input', 'input.spec.md', '--repo-root', root, '--json']).status, 0);
const registered = fs.readFileSync(path.join(root, '.agents/plans/portable/step-00-portable.spec.md'), 'utf8');
assert.match(registered, /source: local/);
assert.strictEqual(resolver.resolveConsumerContext({ repoRoot: root }).config.fable.auditVerdictsBlockShip, 'refuted');

let surface = run(probe, ['--repo-root', root]);
assert.strictEqual(surface.status, 0, surface.stderr);
assert.strictEqual(JSON.parse(surface.stdout).hasTestSurface, true, 'non-empty configured test alias is a machine test surface');
write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans' },
  defaults: { testGlobs: ['test/**/*.js'] },
  verification: { backendTest: '' },
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
surface = run(probe, ['--repo-root', root]);
assert.strictEqual(JSON.parse(surface.stdout).hasTestSurface, false);
write(path.join(root, 'test/example.js'), 'test("x", () => {});\n');
surface = run(probe, ['--repo-root', root]);
assert.strictEqual(JSON.parse(surface.stdout).hasTestSurface, true);

for (const relative of [
  '.agents/skills/ws-shared/tools.md',
  '.agents/skills/ws-shared/gates.md',
  '.agents/skills/ws-shared/host-dispatch.md',
  '.agents/skills/ws-shared/config-resolution.md',
  '.agents/skills/ws-spec-to-pr/SKILL.md',
  '.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md',
  '.agents/skills/ws-spec-to-pr-lite/SKILL.md',
  '.agents/skills/ws-configure-project/INTERVIEW.md',
]) {
  const text = fs.readFileSync(path.join(repoRoot, relative), 'utf8');
  assert.doesNotMatch(text, /\b(?:Cursor|OpenCode|Antigravity)\b/i, `${relative} keeps runtime prose host-neutral`);
}
// Host-agent environment adapter (0056): neutral capability discovery + tier ladder + gate cadence.
{
  const tools = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/tools.md'), 'utf8');
  assert.match(tools, /hasStructuredChoiceTool/, 'tools.md declares hasStructuredChoiceTool (AC1)');
  assert.match(tools, /hasSubagentTool/, 'tools.md declares hasSubagentTool (AC1)');
  assert.match(tools, /hasBrowserTool/, 'tools.md declares hasBrowserTool (AC1)');
  assert.match(tools, /Tier 1/, 'tools.md documents Tier 1 native-tool (AC4)');
  assert.match(tools, /Tier 2/, 'tools.md documents Tier 2 cli-command (AC5)');
  assert.match(tools, /Tier 3/, 'tools.md documents Tier 3 inline-isolated (AC6)');
  assert.match(tools, /host-capability-detect/, 'tools.md logs host-capability-detect telemetry');
  const gates = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/gates.md'), 'utf8');
  assert.match(gates, /user-gate-modal/, 'gates.md logs user-gate-modal (AC2)');
  assert.match(gates, /MUST NOT emit any tool calls in the same response turn/, 'gates.md enforces turn-yielding (AC3)');
  assert.match(gates, /One Step Per Turn/, 'gates.md enforces One Step Per Turn cadence (AC8)');
  const dispatch = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/host-dispatch.md'), 'utf8');
  assert.match(dispatch, /Inline Isolated Execution/, 'host-dispatch.md defines Inline Isolated Execution (AC6)');
  assert.match(dispatch, /inline-isolated-step/, 'host-dispatch.md logs inline-isolated-step telemetry');
  assert.match(dispatch, /native-tool.*cli-command.*inline-isolated/s, 'host-dispatch.md resolves neutral modes only');
  const orch = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/SKILL.md'), 'utf8');
  assert.match(orch, /Inline Isolated Execution/, 'ws-spec-to-pr reconciles Orch-never-edits-code for Tier 3 (AC7)');
  assert.match(orch, /One Step Per Turn/, 'ws-spec-to-pr enforces single-turn cadence (AC8)');
  const lite = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/SKILL.md'), 'utf8');
  assert.match(lite, /One Step Per Turn/, 'lite enforces single-turn cadence (AC8)');
  const stepDispatch = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md'), 'utf8');
  assert.match(stepDispatch, /Host execution mode/, 'STEP-DISPATCH honors detected host mode');
}
for (const relative of [
  '.agents/skills/ws-spec-to-pr/SKILL.md',
  '.agents/skills/ws-spec-to-pr-lite/SKILL.md',
  '.agents/skills/ws-spec-provider-local/SKILL.md',
  '.agents/skills/ws-self-learning/SKILL.md',
]) {
  const text = fs.readFileSync(path.join(repoRoot, relative), 'utf8');
  assert.doesNotMatch(text, /(?:update_state|validate_state|register_local_spec|detect_specs_dir|self_learning)\.py/, `${relative} invokes Node runtime ports`);
}
assert.match(
  fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-testing/SKILL.md'), 'utf8'),
  /probe_test_surface\.cjs/,
);
console.log('test-runtime-portability: ok');
