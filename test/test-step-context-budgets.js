/**
 * test-step-context-budgets.js — Per-step context budgets in dispatch contracts (AC1-AC8).
 *
 * Covers: schema/example config surface (AC1, AC7), per-step resolution with
 * global fallback (AC2), floor + key validation naming the offender (AC3),
 * manifest budget bytes + source (AC4), mandatory-over-budget fail-closed
 * (AC5), per-step measurement audit (AC6), GUI row parity (AC7), byte-identical
 * default behavior (AC8), and writer rejection of manifests without a budget
 * source (negative scenario).
 *
 * Run: node test/test-step-context-budgets.js
 */
import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot, temp, run, write } = utils;

const BUILDER = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/build_dispatch_context.cjs');
const WRITER = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/write_dispatch_prompt_audit.cjs');
const MEASURE = path.join(repoRoot, '.agents/skills/ws-check-harness/scripts/measure_harness.cjs');
const SCHEMA_PATH = path.join(repoRoot, '.agents/skills/ws-shared/runtime/config.schema.json');
const EXAMPLE_PATH = path.join(repoRoot, '.agents/skills/ws-shared/templates/config.json.example');
const GUI_PATH = path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1');
const SKILL = path.join(repoRoot, '.agents/skills/ws-implement-tasks/SKILL.md');

const tempRoot = temp('ws-step-budgets-');
process.on('exit', () => { try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch { /* ignore */ } });
// Hermetic skill-body resolution: fixture repos carry only .ws/config.json, so
// enhancing/target SKILL.md lookups must not depend on the ambient machine
// global install (absent on CI). Point spawned builders at this repo's own
// skills tree as the global fallback (repoRoot-local wins where present).
process.env.WORKFLOW_SKILLS_GLOBAL_DIR = path.join(repoRoot, '.agents/skills');

function fixtureRepo(name, defaults) {
  const root = path.join(tempRoot, name);
  write(path.join(root, '.ws/config.json'), JSON.stringify({ plans: { dir: '.agents/plans' }, defaults }));
  return root;
}

function buildManifest(repo, { step, extra = [] } = {}) {
  const out = path.join(repo, `dispatch-${step}.md`);
  const args = ['--skill', SKILL, '--step', String(step), '--slug', 'budget-probe', '--output', out, '--json', 'true', '--repo-root', repo, ...extra];
  const result = run(BUILDER, args);
  assert.strictEqual(result.status, 0, result.stderr);
  return { manifest: JSON.parse(result.stdout), promptFile: out };
}

// --- AC1: schema + example carry the per-step map ---
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const budgetsSchema = schema.properties?.defaults?.properties?.stepContextBudgets;
assert.strictEqual(budgetsSchema?.type, 'object', 'AC1: schema defaults.stepContextBudgets is object');
assert.strictEqual(budgetsSchema?.additionalProperties?.type, 'integer', 'AC1: schema map values are integers');
assert.strictEqual(budgetsSchema?.additionalProperties?.minimum, 18000, 'AC1: schema map values floor at 18000');
const example = JSON.parse(fs.readFileSync(EXAMPLE_PATH, 'utf8'));
assert.ok(example.defaults.stepContextBudgets !== undefined && typeof example.defaults.stepContextBudgets === 'object', 'AC1: example carries stepContextBudgets');

// --- AC2 + AC4: step override wins; unmatched step falls back to global; manifest records source ---
const repoOverride = fixtureRepo('override', { contextBudget: 32000, stepContextBudgets: { 4: 20000 } });
const step4 = buildManifest(repoOverride, { step: 4 }).manifest;
assert.strictEqual(step4.budgetBytes, 20000, 'AC2: step override wins');
assert.strictEqual(step4.budgetSource, 'step', 'AC4: manifest source is step on override');
const step5 = buildManifest(repoOverride, { step: 5 }).manifest;
assert.strictEqual(step5.budgetBytes, 32000, 'AC2: unmatched step falls back to global');
assert.strictEqual(step5.budgetSource, 'global', 'AC4: manifest source is global on fallback');

// --- AC3: below-floor, non-integer, and out-of-range entries fail naming the key ---
function rejectsNamingKey(fixture, map, key) {
  const repo = fixtureRepo(fixture, { stepContextBudgets: map });
  const bad = run(BUILDER, ['--skill', SKILL, '--step', '4', '--slug', 'budget-probe', '--json', 'true', '--repo-root', repo]);
  assert.notStrictEqual(bad.status, 0, 'AC3: invalid override rejected');
  assert.match(bad.stderr, new RegExp(`stepContextBudgets\\["${key}"\\]`), 'AC3: rejection names the offending key');
  return bad;
}
rejectsNamingKey('bad-below-floor', { 4: 17999 }, '4');
rejectsNamingKey('bad-non-integer', { 4: 'big' }, '4');
rejectsNamingKey('bad-out-of-range', { 10: 20000 }, '10');

// --- AC5: mandatory content over the effective step cap fails closed with no prompt bytes ---
const repoSmall = fixtureRepo('small', { contextBudget: 32000, stepContextBudgets: { 4: 20000 } });
write(path.join(repoSmall, 'big.state.md'), `---\nworkflowId: big\n---\n\n## Step outputs (compact)\n\n${'z'.repeat(25000)}\n`);
write(path.join(repoSmall, 'big.state.json'), JSON.stringify({ workflowId: 'big' }));
const overOut = path.join(repoSmall, 'dispatch-over.md');
const over = run(BUILDER, ['--skill', SKILL, '--step', '4', '--slug', 'budget-probe', '--state', 'big.state.md', '--output', overOut, '--repo-root', repoSmall]);
assert.notStrictEqual(over.status, 0, 'AC5: over-budget mandatory content fails');
assert.match(over.stderr, /exceeds/, 'AC5: failure names the budget breach');
assert.ok(!fs.existsSync(overOut), 'AC5: no prompt bytes on failure');

// --- AC8: empty map behaves byte-identically to an absent map ---
function promptStdout(repo) {
  const result = run(BUILDER, ['--skill', SKILL, '--step', '4', '--slug', 'budget-probe', '--repo-root', repo]);
  assert.strictEqual(result.status, 0, result.stderr);
  return result.stdout;
}
const repoEmpty = fixtureRepo('empty', { contextBudget: 32000, stepContextBudgets: {} });
const repoAbsent = fixtureRepo('absent', { contextBudget: 32000 });
assert.strictEqual(promptStdout(repoEmpty), promptStdout(repoAbsent), 'AC8: empty map is byte-identical to absent map');
const emptyManifest = buildManifest(repoEmpty, { step: 4 }).manifest;
assert.strictEqual(emptyManifest.budgetSource, 'global', 'AC8: empty map resolves global source');

// --- Negative: writer refuses a builder manifest without budgetSource; passes it through when present ---
const usDir = path.join(tempRoot, 'audit');
fs.mkdirSync(usDir, { recursive: true });
write(path.join(usDir, 'prompt.md'), '# Portable workflow dispatch\n\nBody.\n');
write(path.join(usDir, 'builder-naked.json'), JSON.stringify({
  schemaVersion: 1, budgetBytes: 32000, fixedPreambleBytes: 100, mandatoryBytes: 200,
  totalBytes: 300, memoryBytes: 0, sourceSkill: 'ws-plan-write/SKILL.md',
}));
const naked = run(WRITER, ['--us-dir', usDir, '--step', '1', '--slug', 'budget-probe', '--prompt-file', path.join(usDir, 'prompt.md'), '--manifest', path.join(usDir, 'builder-naked.json')]);
assert.notStrictEqual(naked.status, 0, 'NS: writer rejects a manifest without budgetSource');
write(path.join(usDir, 'builder-sourced.json'), JSON.stringify({
  schemaVersion: 1, budgetBytes: 20000, budgetSource: 'step', fixedPreambleBytes: 100, mandatoryBytes: 200,
  totalBytes: 300, memoryBytes: 0, sourceSkill: 'ws-plan-write/SKILL.md',
}));
const sourced = run(WRITER, ['--us-dir', usDir, '--step', '1', '--slug', 'budget-probe', '--prompt-file', path.join(usDir, 'prompt.md'), '--manifest', path.join(usDir, 'builder-sourced.json'), '--json']);
assert.strictEqual(sourced.status, 0, sourced.stderr);
const auditManifest = JSON.parse(fs.readFileSync(path.join(usDir, 'step-01-budget-probe.prompt.json'), 'utf8'));
assert.strictEqual(auditManifest.budgetSource, 'step', 'NS: audit manifest passes budgetSource through');
const skip = run(WRITER, ['--us-dir', usDir, '--step', '2', '--slug', 'budget-probe', '--dispatch-mode', 'inline', '--skip-marker', '--json']);
assert.strictEqual(skip.status, 0, skip.stderr);
const skipManifest = JSON.parse(fs.readFileSync(path.join(usDir, 'step-02-budget-probe.prompt.json'), 'utf8'));
assert.strictEqual(skipManifest.budgetSource, null, 'NS: skip marker carries null budgetSource');

// --- AC6: measurement audits each step against its own effective cap ---
const measured = run(MEASURE, ['--scenario', 'standard', '--json', '--repo-root', repoRoot]);
assert.strictEqual(measured.status, 0, measured.stderr);
const report = JSON.parse(measured.stdout);
assert.ok(report.stepBudgets, 'AC6: report carries a stepBudgets block');
assert.strictEqual(report.stepBudgets.globalBudgetBytes, 32000, 'AC6: global cap reported');
assert.ok(Array.isArray(report.stepBudgets.steps) && report.stepBudgets.steps.length === report.dispatches, 'AC6: one row per dispatch');
for (const row of report.stepBudgets.steps) {
  assert.ok(Number.isInteger(row.step) && typeof row.skill === 'string', 'AC6: row names step + skill');
  assert.ok(Number.isInteger(row.budgetBytes) && (row.budgetSource === 'step' || row.budgetSource === 'global'), 'AC6: row carries effective cap + source');
  assert.ok(Number.isInteger(row.dispatchBytes) && row.dispatchBytes <= row.budgetBytes && row.pass === true, 'AC6: row dispatch fits its own cap');
}
assert.strictEqual(report.stepBudgets.perStepPass, true, 'AC6: per-step rollup passes');
const repoMeasured = fixtureRepo('measured', { contextBudget: 32000, stepContextBudgets: { 4: 25000 } });
const measuredOverride = run(MEASURE, ['--scenario', 'standard', '--json', '--repo-root', repoMeasured]);
assert.strictEqual(measuredOverride.status, 0, measuredOverride.stderr);
const overrideReport = JSON.parse(measuredOverride.stdout);
const row4 = overrideReport.stepBudgets.steps.find((row) => row.step === 4);
assert.strictEqual(row4.budgetBytes, 25000, 'AC6: step row uses the override cap');
assert.strictEqual(row4.budgetSource, 'step', 'AC6: step row names the override source');
const row5 = overrideReport.stepBudgets.steps.find((row) => row.skill === 'ws-plan-verify');
assert.strictEqual(row5.budgetBytes, 32000, 'AC6: unmapped step keeps the global cap');
assert.strictEqual(row5.budgetSource, 'global', 'AC6: unmapped step names the global source');

// --- AC7: GUI editor exposes the map as a json row ---
const guiScript = fs.readFileSync(GUI_PATH, 'utf8');
assert.match(
  guiScript,
  /-Key\s+['"]stepContextBudgets['"][\s\S]*?-Type\s+['"]json['"]/,
  'AC7: stepContextBudgets row uses -Type json',
);

console.log('test-step-context-budgets: ok');
