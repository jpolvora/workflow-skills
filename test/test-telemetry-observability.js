import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const aggregateModule = require('../bin/generate-telemetry-aggregate.cjs');
const { assert, path, repoRoot, temp, run, write } = utils;
const doctor = path.join(repoRoot, '.agents/skills/ws-doctor/scripts/doctor.js');
const persist = path.join(repoRoot, '.agents/skills/ws-shared/scripts/persist_diagnostic.cjs');
const root = temp('ws-telemetry-');
const plans = path.join(root, '.agents/plans');
write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans', diagnosticsDir: '.agents/plans/diagnostics' },
  defaults: {},
  verification: {},
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
const telemetry = path.join(plans, 'demo', 'telemetry', 'step-04.jsonl');
write(telemetry, [
  JSON.stringify({
    schemaVersion: 1, type: 'finish', timestamp: '2026-08-21T20:00:12.000Z',
    workflowId: 'wf', pipeline: 'standard', packageVersion: '0.0.0', step: 4,
    model: 'test', retries: 1, reviewRounds: 0, refineRounds: 0, skipReason: null,
    acTotal: 2, acImplemented: 2, elapsedSec: 12, estimated: false,
  }),
  JSON.stringify({
    schemaVersion: 1, type: 'audit-finalize', timestamp: '2026-08-21T20:00:13.000Z',
    workflowId: 'wf', pipeline: 'standard', packageVersion: '0.0.0', step: 9,
    model: 'test', retries: 1, reviewRounds: 2, refineRounds: 0, skipReason: null,
    acTotal: 2, acImplemented: 2, auditCounts: { errors: 1, unusual: 2, suggestions: 3 },
  }),
].join('\n') + '\n');

const aggregate = aggregateModule.generateAggregate({ repoRoot: root, plansDir: plans, write: false });
assert.strictEqual(aggregate.runs.length, 1);
assert.strictEqual(aggregate.runs[0].auditCounts.unusual, 2);
assert.strictEqual(aggregate.medians.standard.steps['4'], 12);
assert.match(aggregateModule.renderReport(aggregate), /Workflow telemetry report[\s\S]*wf/);

const doctorResult = run(doctor, ['--json', '--persist'], { cwd: root });
assert.strictEqual(doctorResult.status, 0, doctorResult.stderr);
const diagnosticFiles = fs.readdirSync(path.join(plans, 'diagnostics'));
assert.ok(diagnosticFiles.some((name) => name.startsWith('doctor-') && name.endsWith('.json')));
write(path.join(root, 'harness.md'), '# Harness result\n');
assert.strictEqual(run(persist, ['--kind', 'harness', '--input', 'harness.md', '--repo-root', root]).status, 0);
assert.ok(fs.readdirSync(path.join(plans, 'diagnostics')).some((name) => name.startsWith('harness-')));
console.log('test-telemetry-observability: ok');
