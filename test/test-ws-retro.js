import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot, temp, run, write, json } = utils;

const SKILL_DIR = path.join(repoRoot, '.agents/skills/ws-retro');
const SKILL_MD = path.join(SKILL_DIR, 'SKILL.md');
const HOOK = path.join(SKILL_DIR, 'scripts/retro_hook.cjs');
const VALIDATOR = path.join(SKILL_DIR, 'scripts/validate_candidates.cjs');
const SCAN = path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs');
const SPEC_P2P = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/SKILL.md');
const SPEC_P2P_DISPATCH = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md');
const SPEC_LITE = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/SKILL.md');
const GATES = path.join(repoRoot, '.agents/skills/ws-shared/runtime/gates.md');
const SCHEMA = path.join(repoRoot, '.agents/skills/ws-shared/runtime/config.schema.json');
const EXAMPLE = path.join(repoRoot, '.agents/skills/ws-shared/templates/config.json.example');
const PS_EDITOR = path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1');
const DEPS_BIN = path.join(repoRoot, 'bin/skill-dependencies.json');
const DEPS_HUB = path.join(repoRoot, '.agents/skills/ws-shared/runtime/skill-dependencies.json');

const read = (file) => fs.readFileSync(file, 'utf8');

function writeJson(file, value) {
  return write(file, `${JSON.stringify(value, null, 2)}\n`);
}

// V1: package exists with correct frontmatter and both dependency manifests register it.
{
  assert(fs.existsSync(SKILL_MD), 'V1: ws-retro/SKILL.md exists');
  const fm = read(SKILL_MD);
  assert(/^name:\s*ws-retro\s*$/m.test(fm), 'V1: frontmatter name is ws-retro');
  assert(/invocation_names:[\s\S]*?\bretro\b/.test(fm), 'V1: invocation alias "retro" declared');
  assert(/invocation_names:[\s\S]*?\bws-retro\b/.test(fm), 'V1: invocation alias "ws-retro" declared');
  for (const manifest of [DEPS_BIN, DEPS_HUB]) {
    const deps = JSON.parse(read(manifest));
    assert(deps.packages.workflows.skills.includes('ws-retro'), `V1: flows package lists ws-retro in ${path.basename(manifest)}`);
    assert(Array.isArray(deps.dependencies['ws-retro']), `V1: dependencies entry exists in ${path.basename(manifest)}`);
    assert(deps.dependencies['ws-retro'].includes('ws-self-learning'), `V1: ws-retro depends on ws-self-learning in ${path.basename(manifest)}`);
    assert(deps.dependencies['ws-spec-to-pr'].includes('ws-retro'), `V1: ws-spec-to-pr depends on ws-retro in ${path.basename(manifest)}`);
    assert(deps.dependencies['ws-spec-to-pr-lite'].includes('ws-retro'), `V1: ws-spec-to-pr-lite depends on ws-retro in ${path.basename(manifest)}`);
  }
}

// V3 / AC2: standalone usage documented; helpers run without any workflow state.
{
  const doc = read(SKILL_MD);
  assert(/standalone/i.test(doc), 'V3: skill documents standalone invocation');
  assert(/without an active workflow|no active workflow|any time/i.test(doc), 'V3: skill documents invocation without an active workflow run');

  const fixture = temp('ws-retro-standalone-');
  const config = writeJson(path.join(fixture, 'config.json'), { retro: { enabled: true } });
  const decision = json(run(HOOK, ['should-run', '--config', config, '--json'], { cwd: fixture }));
  assert.strictEqual(decision.run, true, 'V3: hook decides standalone with no workflow state present');
  const input = writeJson(path.join(fixture, 'candidates.json'), { candidates: [] });
  const report = json(run(VALIDATOR, ['--input', input, '--json'], { cwd: fixture }));
  assert.strictEqual(report.ok, true, 'V3: validator runs standalone with no workflow state present');
  fs.rmSync(fixture, { recursive: true, force: true });
}

// V4 / AC3: explicit true enables the run.
{
  const fixture = temp('ws-retro-hook-on-');
  const config = writeJson(path.join(fixture, 'config.json'), { retro: { enabled: true } });
  const decision = json(run(HOOK, ['should-run', '--config', config, '--json'], { cwd: fixture }));
  assert.strictEqual(decision.run, true, 'V4: explicit retro.enabled true runs');
  assert.strictEqual(decision.reason, 'enabled', 'V4: reason is enabled');
  assert.strictEqual(decision.key, 'retro.enabled', 'V4: decision names the retro.enabled key');
  fs.rmSync(fixture, { recursive: true, force: true });
}

// V5 / AC4 / NS1: omitted, false, and non-boolean values keep the step off.
{
  const cases = [
    { config: {}, reason: 'missing', label: 'omitted block' },
    { config: { retro: {} }, reason: 'missing', label: 'omitted key' },
    { config: { retro: { enabled: false } }, reason: 'disabled', label: 'explicit false' },
    { config: { retro: { enabled: 'yes' } }, reason: 'disabled', label: 'non-boolean value' },
    { config: { retro: { enabled: 1 } }, reason: 'disabled', label: 'numeric value' },
  ];
  for (const item of cases) {
    const fixture = temp('ws-retro-hook-off-');
    const config = writeJson(path.join(fixture, 'config.json'), item.config);
    const decision = json(run(HOOK, ['should-run', '--config', config, '--json'], { cwd: fixture }));
    assert.strictEqual(decision.run, false, `V5: ${item.label} keeps the step off`);
    assert.strictEqual(decision.reason, item.reason, `V5: ${item.label} reason is ${item.reason}`);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

// V12 / NS1: with the key omitted or false, no proposal artifact and no memory write occur.
{
  const fixture = temp('ws-retro-ns1-');
  const config = writeJson(path.join(fixture, 'config.json'), { retro: { enabled: false } });
  const decision = json(run(HOOK, ['should-run', '--config', config, '--json'], { cwd: fixture }));
  assert.strictEqual(decision.run, false, 'V12: NS1 disabled decision');
  const residue = fs.readdirSync(fixture).filter((name) => /retro|memory|MEMORY/.test(name));
  assert.deepStrictEqual(residue, [], 'V12: NS1 no retro or memory artifact appears');
  fs.rmSync(fixture, { recursive: true, force: true });
}

function candidate(overrides = {}) {
  return {
    id: 'C1',
    title: 'Add npm-cache guidance to the test recipe',
    severity: 'high',
    category: 'memory',
    evidence: { artifact: 'telemetry.jsonl', ref: 'finish step 7 exit 1' },
    proposedChange: { target: 'MEMORY.md', change: 'Record the writable-cache workaround.' },
    ...overrides,
  };
}

function validateFixture(candidates, extra = {}) {
  const fixture = temp('ws-retro-validate-');
  const input = writeJson(path.join(fixture, 'candidates.json'), { candidates });
  const args = ['--input', input, '--json', ...(extra.args || [])];
  const result = run(VALIDATOR, args, { cwd: fixture });
  fs.rmSync(fixture, { recursive: true, force: true });
  return result;
}

// V6 / AC5: required fields and the closed category enum are enforced.
{
  const good = json(validateFixture([candidate()]));
  assert.strictEqual(good.ok, true, 'V6: grounded candidate accepted');
  assert.deepStrictEqual(good.accepted, ['C1'], 'V6: accepted list contains the candidate id');

  const unknownCategory = json(validateFixture([candidate({ category: 'best-practice' })]));
  assert.strictEqual(unknownCategory.ok, false, 'V6: unknown category rejects the batch');
  assert.strictEqual(unknownCategory.rejected[0].reason, 'category-invalid', 'V6: unknown category reason');

  const missingTitle = json(validateFixture([candidate({ title: '   ' })]));
  assert.strictEqual(missingTitle.rejected[0].reason, 'field-required', 'V6: blank title reason');

  for (const category of ['memory', 'harness-directive', 'reviewer-standard', 'automated-check', 'navigation-pointer', 'no-op-deletion']) {
    const one = json(validateFixture([candidate({ category })]));
    assert.strictEqual(one.ok, true, `V6: category ${category} is accepted`);
  }
}

// V13 / NS2: a candidate without a specific run moment is rejected, and nothing generic is accepted.
{
  const noEvidence = json(validateFixture([candidate({ evidence: { artifact: '  ', ref: '' } })]));
  assert.strictEqual(noEvidence.ok, false, 'V13: NS2 ungrounded candidate is rejected');
  assert.strictEqual(noEvidence.rejected[0].reason, 'evidence-required', 'V13: NS2 evidence-required reason');
  assert.deepStrictEqual(noEvidence.accepted, [], 'V13: NS2 nothing generic is accepted');
}

// V13b: evidence file resolution is enforced when --repo-root is supplied.
{
  const fixture = temp('ws-retro-evidence-');
  const input = writeJson(path.join(fixture, 'candidates.json'), { candidates: [candidate({ evidence: { artifact: 'does/not/exist.md', ref: 'L1' } })] });
  const result = run(VALIDATOR, ['--input', input, '--json', '--repo-root', fixture], { cwd: fixture });
  const report = json(result);
  assert.strictEqual(report.rejected[0].reason, 'evidence-unresolvable', 'V13b: missing evidence file reason');
  fs.rmSync(fixture, { recursive: true, force: true });
}

// V14 / NS3: approval gate is documented, and the helpers cannot write without approval.
{
  const doc = read(SKILL_MD);
  assert(/user-gate/.test(doc), 'V14: NS3 skill requires user-gate approval');
  assert(/without approval|no memory or directive file changes|propose (only|candidates)/i.test(doc), 'V14: NS3 propose-only wording present');
  for (const script of [HOOK, VALIDATOR]) {
    const body = read(script);
    assert(!/writeFileSync|appendFileSync|createWriteStream|rmSync|unlinkSync/.test(body), `V14: NS3 ${path.basename(script)} performs no writes`);
    assert(!/child_process|spawnSync|execSync|exec\(/.test(body), `V14: NS4 ${path.basename(script)} executes no shell`);
  }
}

// V7 / AC6 + V8 / AC7: memory routing and proposal-only contract in the skill body.
{
  const doc = read(SKILL_MD);
  assert(/ws-self-learning/.test(doc), 'V7: memory persistence routes through ws-self-learning');
  assert(/update-memory/.test(doc), 'V7: update-memory contract referenced');
  assert(/rules\.memoryDir|spec-memo|enableSpecMemoIntegration/.test(doc), 'V7: configured memory backend referenced');
  assert(/single-run|earlier runs/i.test(doc), 'V7: single-run scope documented');
}

// V9 / AC3+AC4+AC8: orchestrators document the opt-in hook and never-block behavior.
{
  const p2p = `${read(SPEC_P2P)}\n${read(SPEC_P2P_DISPATCH)}`;
  assert(/retro_hook\.cjs/.test(p2p), 'V9: standard orch references the retro hook helper');
  assert(/retro\.enabled/.test(p2p), 'V9: standard orch names retro.enabled');
  assert(/never block|never blocks|non-blocking|advisory/i.test(p2p), 'V9: standard orch marks the step non-blocking');
  const lite = read(SPEC_LITE);
  assert(/retro_hook\.cjs/.test(lite), 'V9: lite orch references the retro hook helper');
  assert(/retro\.enabled/.test(lite), 'V9: lite orch names retro.enabled');
  const gates = read(GATES);
  assert(/retro/i.test(gates) && /never block|non-blocking|advisory/i.test(gates), 'V9: gates.md carries the advisory contract');
}

// V10 / AC9: config schema, example, and desktop editor are in sync.
{
  const schema = JSON.parse(read(SCHEMA));
  assert.strictEqual(schema.properties.retro.properties.enabled.type, 'boolean', 'V10: schema retro.enabled is boolean');
  assert.strictEqual(schema.properties.retro.properties.enabled.default, false, 'V10: schema default is false');
  const example = read(EXAMPLE);
  assert(/"retro"\s*:/.test(example), 'V10: config.json.example carries the retro block');
  const editor = read(PS_EDITOR);
  assert(/-Section\s+'retro'\s+-Key\s+'enabled'/.test(editor), 'V10: desktop editor binds retro.enabled');
  assert(/-Section\s+'retro'\s+-Key\s+'enabled'[\s\S]{0,200}-Type\s+'bool'/.test(editor), 'V10: editor row type is bool');
}

// V15 / NS4: stack invariant scan is clean for the new scripts.
{
  const scan = run(SCAN, ['--stack', 'typescript-node', '--files', 'HOOK,VALIDATOR'.replace('HOOK', '.agents/skills/ws-retro/scripts/retro_hook.cjs').replace('VALIDATOR', '.agents/skills/ws-retro/scripts/validate_candidates.cjs')]);
  assert.strictEqual(scan.status, 0, `V15: NS4 stack scan exits 0 (${scan.stdout || scan.stderr})`);
  assert(/0 Critical/.test(scan.stdout), 'V15: NS4 zero critical violations');
}

// V16 / AC10: shipped docs inventory reflects the new skill.
{
  const readme = read(path.join(repoRoot, 'README.md'));
  assert(readme.includes('ws-retro'), 'V16: README lists ws-retro');
  const features = read(path.join(repoRoot, 'FEATURES.md'));
  assert(features.includes('ws-retro'), 'V16: FEATURES lists ws-retro');
  const catalog = read(path.join(repoRoot, 'CATALOG.md'));
  assert(catalog.includes('ws-retro'), 'V16: root CATALOG lists ws-retro');
  const hubCatalog = read(path.join(repoRoot, '.agents/skills/ws-shared/runtime/CATALOG.md'));
  assert(hubCatalog.includes('ws-retro'), 'V16: hub CATALOG lists ws-retro');
}

console.log('test-ws-retro: all assertions passed');
