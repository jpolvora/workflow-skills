import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, run } = utils;

const classifyScript = path.join(repoRoot, '.agents/skills/ws-classify-complexity/scripts/classify.cjs');
const stubScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/write_simple_plan_stub.cjs');
const planIndexScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/plan_index.cjs');
const fixtureSpec = path.join(repoRoot, 'test/fixtures/fx-docs-micro/fx-docs-micro.spec.md');

// fx-docs-micro must classify as simple with no interview, stub cleanly,
// and keep artifact bytes small relative to product LOC (process-waste guard).
const outDir = fs.mkdtempSync(path.join(repoRoot, 'test/fixtures/fx-docs-micro/.tmp-'));
const classify = run(classifyScript, [fixtureSpec, '--output-dir', outDir]);
assert.strictEqual(classify.status, 0, classify.stderr);
const jsonPart = classify.stdout.split('\nWrote')[0];
const payload = JSON.parse(jsonPart);
assert.strictEqual(payload.complexityClass, 'simple', `expected simple, got ${payload.complexityClass}`);
assert.strictEqual(payload.runInterview, false, 'docs-micro must not trigger interview');
assert.ok(payload.metrics.layers <= 1, `spec-touched layers must be <=1, got ${payload.metrics.layers}`);

const stubPlan = path.join(outDir, 'step-01-fx-docs-micro.plan.md');
const stub = run(stubScript, ['--spec', fixtureSpec, '--plan', stubPlan, '--slug', 'fx-docs-micro']);
assert.strictEqual(stub.status, 0, stub.stderr);
const stubText = fs.readFileSync(stubPlan, 'utf8');
assert.match(stubText, /## AC1/);
assert.match(stubText, /complexityClass: simple/);

const indexOut = path.join(outDir, 'plan.index.json');
const indexed = run(planIndexScript, ['build', '--plan', stubPlan, '--spec', fixtureSpec, '--output', indexOut]);
assert.strictEqual(indexed.status, 0, indexed.stderr);

const artifactBytes = fs.statSync(stubPlan).size + fs.statSync(indexOut).size;
const productLoc = stubText.split('\n').length;
assert.ok(artifactBytes < 20000, `stub artifacts must stay small, got ${artifactBytes} bytes`);
assert.ok(productLoc > 0, 'stub must contain plan lines');

fs.rmSync(outDir, { recursive: true, force: true });

console.log('test-workflow-process-waste: ok');
