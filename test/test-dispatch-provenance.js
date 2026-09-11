/**
 * test-dispatch-provenance.js — Tests dispatch provenance recording (subagentId, agentType, model)
 * in stepDispatches and telemetry.jsonl (Issues #315 and #316).
 *
 * Run: node test/test-dispatch-provenance.js
 */

import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import assert from 'assert';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const UPDATE_STATE = path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const { loadJsonSchema, validateNode } = require(path.join(REPO, '.agents/skills/ws-shared/runtime/scripts/validate_json_schema.cjs'));
const { resolveStepAgentType } = require(path.join(REPO, '.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs'));

const stateSchema = loadJsonSchema(path.join(REPO, '.agents/skills/ws-shared/runtime/workflow-state.schema.json'), 'workflow state schema');
const telemetrySchema = loadJsonSchema(path.join(REPO, '.agents/skills/ws-shared/runtime/telemetry.schema.json'), 'telemetry schema');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-prov-test-'));

function cleanup() {
  try {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
process.on('exit', cleanup);

// Setup mock consumer structure
const sharedDir = path.join(tempRoot, '.agents/skills/ws-shared');
const plansDir = path.join(tempRoot, '.agents/plans');
const slug = 'prov-demo';
const usDir = path.join(plansDir, slug);
fs.mkdirSync(sharedDir, { recursive: true });
fs.mkdirSync(usDir, { recursive: true });

// Base config with specializedSubagents enabled
fs.writeFileSync(
  path.join(sharedDir, 'config.json'),
  JSON.stringify({
    project: { name: 'provenance-test', baseBranch: 'main' },
    plans: { dir: '.agents/plans' },
    defaults: {
      specializedSubagents: {
        enabled: true,
        targetHost: 'cursor',
        agentPrefix: 'ws',
      },
    },
  }, null, 2),
);

const stateFile = path.join(usDir, 'prov-demo-20260911T120000Z.state.md');
fs.writeFileSync(
  stateFile,
  `---
workflowId: wf-prov-test
slug: ${slug}
status: active
currentStep: 4
currentModel: composer-2.5
revision: 0
completedSteps: [0, 1, 2, 3]
stepStatus:
  "0": completed
  "1": completed
  "2": completed
  "3": completed
  "4": pending
---
# Workflow State
`,
);
fs.writeFileSync(path.join(usDir, `step-00-${slug}.spec.md`), '# Spec\n');
fs.writeFileSync(path.join(usDir, `step-01-${slug}.plan.md`), '# Plan\n');
fs.writeFileSync(path.join(usDir, `step-02-${slug}.plan-interview.md`), '# Interview\n');
fs.writeFileSync(path.join(usDir, `step-02-${slug}.plan.refined.md`), '# Refined Plan\n');
fs.writeFileSync(path.join(usDir, 'plan.index.json'), JSON.stringify({ schemaVersion: 1, slug, tasks: [] }));
fs.writeFileSync(path.join(usDir, 'ac-ledger.json'), JSON.stringify({ schemaVersion: 1, slug, acceptanceCriteria: [] }));

// 1. Test unit resolution of agentType
const unitNamed = resolveStepAgentType(4, {}, {
  sharedDir,
  config: { defaults: { specializedSubagents: { enabled: true, agentPrefix: 'ws', targetHost: 'cursor' } } },
}, {});
assert.strictEqual(unitNamed, 'named:ws-step-04-implement-tasks', 'Step 4 resolves to named implementation subagent');

const unitScoreAndRefine = resolveStepAgentType(5, { substep: 'scoreAndRefine' }, {
  sharedDir,
  config: { defaults: { specializedSubagents: { enabled: true, agentPrefix: 'ws', targetHost: 'cursor' } } },
}, {});
assert.strictEqual(unitScoreAndRefine, 'named:ws-step-04-implement-tasks', 'scoreAndRefine substep resolves to implement-tasks');

const unitDisabled = resolveStepAgentType(4, {}, {
  sharedDir,
  config: { defaults: { specializedSubagents: { enabled: false } } },
}, {});
assert.strictEqual(unitDisabled, 'generic:Task', 'Disabled specialized subagents resolves to generic:Task');

const unitExplicit = resolveStepAgentType(4, { agentType: 'custom:agent-runner' }, {
  sharedDir,
  config: { defaults: { specializedSubagents: { enabled: true } } },
}, {});
assert.strictEqual(unitExplicit, 'custom:agent-runner', 'Explicit agentType overrides automatic derivation');

// 2. Test update_state.cjs dispatch CLI with explicit provenance
const dispatchRes = spawnSync(
  process.execPath,
  [
    UPDATE_STATE,
    'dispatch',
    stateFile,
    '--step', '4',
    '--agent-type', 'named:ws-step-04-implement-tasks',
    '--subagent-id', 'sub-agent-run-99',
    '--model', 'composer-2.5',
    '--repo-root', tempRoot,
  ],
  { encoding: 'utf8' },
);
assert.strictEqual(dispatchRes.status, 0, `dispatch failed: ${dispatchRes.stderr}`);

// Verify state JSON
const stateJsonFile = stateFile.replace(/\.state\.md$/, '.state.json');
const stateJson = JSON.parse(fs.readFileSync(stateJsonFile, 'utf8'));
assert(Array.isArray(stateJson.stepDispatches), 'state has stepDispatches');
const d4 = stateJson.stepDispatches.find((d) => Number(d.step) === 4);
assert(d4, 'step 4 dispatch entry found');
assert.strictEqual(d4.agentType, 'named:ws-step-04-implement-tasks', 'dispatch preserves agentType');
assert.strictEqual(d4.subagentId, 'sub-agent-run-99', 'dispatch preserves subagentId');
assert.strictEqual(d4.model, 'composer-2.5', 'dispatch preserves model');

// Validate workflow state against schema
const stateErrors = validateNode(stateJson, stateSchema, 'state.json');
assert.strictEqual(stateErrors.length, 0, `state schema errors: ${stateErrors.join('; ')}`);

// Verify telemetry.jsonl dispatch event
const telemetryFile = path.join(usDir, 'telemetry.jsonl');
assert(fs.existsSync(telemetryFile), 'telemetry.jsonl created');
const lines = fs.readFileSync(telemetryFile, 'utf8').trim().split('\n');
const dispatchEvent = JSON.parse(lines[0]);
assert.strictEqual(dispatchEvent.type, 'dispatch', 'first event is dispatch');
assert.strictEqual(dispatchEvent.agentType, 'named:ws-step-04-implement-tasks', 'telemetry dispatch event records agentType');
assert.strictEqual(dispatchEvent.subagentId, 'sub-agent-run-99', 'telemetry dispatch event records subagentId');
assert.strictEqual(dispatchEvent.model, 'composer-2.5', 'telemetry dispatch event records model');

// Validate telemetry event against schema
const telemetryErrors = validateNode(dispatchEvent, telemetrySchema, 'telemetry.jsonl[0]');
assert.strictEqual(telemetryErrors.length, 0, `telemetry schema errors: ${telemetryErrors.join('; ')}`);

// 3. Test update_state.cjs finish carries forward provenance
const finishRes = spawnSync(
  process.execPath,
  [
    UPDATE_STATE,
    'finish',
    stateFile,
    '--step', '4',
    '--repo-root', tempRoot,
  ],
  { encoding: 'utf8' },
);
assert.strictEqual(finishRes.status, 0, `finish failed: ${finishRes.stderr}`);

const updatedState = JSON.parse(fs.readFileSync(stateJsonFile, 'utf8'));
const step4Telemetry = updatedState.telemetry?.steps?.find((s) => Number(s.N ?? s.step) === 4);
assert(step4Telemetry, 'step 4 telemetry row found');
assert.strictEqual(step4Telemetry.agentType, 'named:ws-step-04-implement-tasks', 'finish telemetry inherits agentType from dispatch');
assert.strictEqual(step4Telemetry.subagentId, 'sub-agent-run-99', 'finish telemetry inherits subagentId from dispatch');

const finishLines = fs.readFileSync(telemetryFile, 'utf8').trim().split('\n');
const finishEvent = JSON.parse(finishLines[1]);
assert.strictEqual(finishEvent.type, 'finish', 'second event is finish');
assert.strictEqual(finishEvent.agentType, 'named:ws-step-04-implement-tasks', 'finish telemetry event inherits agentType');
assert.strictEqual(finishEvent.subagentId, 'sub-agent-run-99', 'finish telemetry event inherits subagentId');

const finishTelemetryErrors = validateNode(finishEvent, telemetrySchema, 'telemetry.jsonl[1]');
assert.strictEqual(finishTelemetryErrors.length, 0, `finish telemetry schema errors: ${finishTelemetryErrors.join('; ')}`);

// 4. Test dispatch with automatic derivation (no flags passed)
const dispatchAuto = spawnSync(
  process.execPath,
  [
    UPDATE_STATE,
    'dispatch',
    stateFile,
    '--step', '5',
    '--repo-root', tempRoot,
  ],
  { encoding: 'utf8' },
);
assert.strictEqual(dispatchAuto.status, 0, `auto dispatch failed: ${dispatchAuto.stderr}`);

const autoState = JSON.parse(fs.readFileSync(stateJsonFile, 'utf8'));
const d5 = autoState.stepDispatches.find((d) => Number(d.step) === 5);
assert(d5, 'step 5 dispatch found');
assert.strictEqual(d5.agentType, 'named:ws-step-05-plan-verify', 'derived agentType for step 5 is named plan-verify');
assert.strictEqual(d5.subagentId, undefined, 'subagentId undefined when unsupplied');

// 5. Test auto-derivation when targetHost is omitted/auto without hostBinding
const noTargetDerived = resolveStepAgentType(
  4,
  {},
  { config: { defaults: { specializedSubagents: { enabled: true } } }, sharedDir },
  {},
);
assert.strictEqual(noTargetDerived, 'generic:Task', 'defaults to generic:Task when targetHost is omitted');

const autoTargetDerived = resolveStepAgentType(
  4,
  {},
  { config: { defaults: { specializedSubagents: { enabled: true, targetHost: 'auto' } } }, sharedDir },
  {},
);
assert.strictEqual(autoTargetDerived, 'generic:Task', 'defaults to generic:Task when targetHost is auto');

const genericTargetDerived = resolveStepAgentType(
  4,
  {},
  { config: { defaults: { specializedSubagents: { enabled: true, targetHost: 'generic' } } }, sharedDir },
  {},
);
assert.strictEqual(genericTargetDerived, 'generic:Task', 'defaults to generic:Task when targetHost is generic');

console.log('test-dispatch-provenance: ok');
