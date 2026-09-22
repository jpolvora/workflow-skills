import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot, run, temp, write } = utils;

const SKILL = 'ws-spec-translate-to-human';
const skillDir = path.join(repoRoot, '.agents', 'skills', SKILL);
const skillBody = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');

// 1. Frontmatter: name / description / version / invocation_names (AC1).
const front = skillBody.match(/^---\r?\n([\s\S]*?)\r?\n---/);
assert.ok(front, 'SKILL.md has YAML frontmatter');
const frontmatter = front[1];
assert.match(frontmatter, /^name: ws-spec-translate-to-human$/m, 'frontmatter name');
assert.match(frontmatter, /^description: /m, 'frontmatter description');
assert.match(frontmatter, /^version: \d+\.\d+\.\d+$/m, 'frontmatter version');
assert.match(frontmatter, /^invocation_names:$/m, 'frontmatter invocation_names');
assert.match(frontmatter, /translate-to-human/, 'invocation alias present');
const pkgVersion = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version;
assert.match(frontmatter, new RegExp(`^version: ${pkgVersion.replace(/\./g, '\\.')}$`, 'm'), 'skill version tracks package.json');
assert.match(skillBody, new RegExp(`${SKILL} loaded\\.`), 'load banner');
assert.match(skillBody, /validate_companion\.cjs/, 'validator tool anchor');

// 2. Package membership in both manifests (AC1, AC8).
for (const manifest of ['bin/skill-dependencies.json', '.agents/skills/ws-shared/runtime/skill-dependencies.json']) {
  const deps = JSON.parse(fs.readFileSync(path.join(repoRoot, manifest), 'utf8'));
  assert.ok(deps.packages.workflows.skills.includes(SKILL), `${manifest} workflows package includes ${SKILL}`);
  assert.ok(Array.isArray(deps.dependencies[SKILL]), `${manifest} has ${SKILL} dependency key`);
  for (const owner of ['ws-plan-write', 'ws-spec-to-pr', 'ws-spec-to-pr-lite']) {
    assert.ok(deps.dependencies[owner].includes(SKILL), `${manifest} wires ${SKILL} into ${owner}`);
  }
}
assert.strictEqual(
  fs.readFileSync(path.join(repoRoot, 'bin/skill-dependencies.json'), 'utf8'),
  fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/skill-dependencies.json'), 'utf8'),
  'manifest mirrors are identical',
);

// 3. Refinement wiring prose is non-blocking and configurable (AC8).
const planWrite = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-plan-write/SKILL.md'), 'utf8');
assert.match(planWrite, /ws-spec-translate-to-human\.enabled !== false/, 'plan-write honors the enable switch');
assert.match(planWrite, /never fails planning/, 'plan-write hook is non-blocking');
for (const orch of ['ws-spec-to-pr', 'ws-spec-to-pr-lite']) {
  const body = fs.readFileSync(path.join(repoRoot, '.agents/skills', orch, 'SKILL.md'), 'utf8');
  assert.ok(body.includes(SKILL), `${orch} references ${SKILL}`);
}

// 4. Config section: enable switch + output language, en-us default (AC8).
const schema = JSON.parse(
  fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/config.schema.json'), 'utf8'),
);
const section = schema.properties[SKILL];
assert.ok(section, 'schema has per-skill section');
assert.strictEqual(section.properties.enabled.default, true, 'enabled defaults true');
assert.strictEqual(section.properties.outputLanguage.default, 'en-us', 'outputLanguage defaults en-us');
const example = JSON.parse(
  fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/templates/config.json.example'), 'utf8'),
);
assert.strictEqual(example[SKILL].enabled, true, 'example enables the skill');
assert.strictEqual(example[SKILL].outputLanguage, 'en-us', 'example defaults en-us');

// 5. Catalog / router / docs registration (AC9).
for (const doc of ['CATALOG.md', 'FEATURES.md', 'README.md', '.agents/skills/ws-shared/runtime/CATALOG.md', '.agents/skills/ws-shared/runtime/autoload.md', '.ws/autoload.md']) {
  assert.ok(fs.readFileSync(path.join(repoRoot, doc), 'utf8').includes(SKILL), `${doc} registers ${SKILL}`);
}

// 6. Validator matrix on temp fixtures (AC2, AC3, AC4, AC7).
const validator = path.join(skillDir, 'scripts', 'validate_companion.cjs');
const dir = temp('ws-translate-to-human-');
const spec = write(
  path.join(dir, 'step-00-demo.spec.md'),
  '---\nslug: demo\n---\n# Demo\n\n## Acceptance Criteria\n\n- AC1: Drafts auto-save every 30 seconds.\n- AC2: A banner shows the last saved time.\n\n## Out of Scope\n\n| Feature | Reason |\n|---------|--------|\n| Offline editing | Deferred |\n',
);
const goodCompanion = `## Draft auto-save runbook

> Source: \`step-00-demo.spec.md\` · Consulted: agent spec, README · Not found: vault

### Implementation
1. Persist the draft every 30 seconds while dirty. (AC1)
2. Publish the saved timestamp for the banner. (AC1, AC2)

### UI Test
1. From a clean draft, type and wait 30 seconds; verify the banner time on the **Editor** screen. (AC2)
2. From a saved draft, reload; verify the text is intact and the [unresolved: sync status icon] shows saved state. (AC1)

### Out of scope
- Offline editing.
`;
const specHash = fs.readFileSync(spec, 'utf8');
const good = write(path.join(dir, 'step-00-demo.spec-translated.md'), goodCompanion);
const ok = run(validator, ['--spec', spec, '--companion', good]);
assert.strictEqual(ok.status, 0, `valid companion passes: ${ok.stdout}`);
assert.match(ok.stdout, /covers ACs \[1, 2\]/, 'validator reports covered ACs');

const boldSpec = write(
  path.join(dir, 'step-00-bold.spec.md'),
  '---\nslug: bold\n---\n# Bold\n\n## Acceptance Criteria\n\n- **AC1:** Drafts auto-save every 30 seconds.\n- **AC2:** A banner shows the last saved time.\n',
);
const boldCompanion = write(path.join(dir, 'step-00-bold.spec-translated.md'), goodCompanion);
const boldOk = run(validator, ['--spec', boldSpec, '--companion', boldCompanion]);
assert.strictEqual(boldOk.status, 0, `bold AC headings pass: ${boldOk.stdout}`);
assert.match(boldOk.stdout, /covers ACs \[1, 2\]/, 'validator recognizes bold AC headings');

function expectFail(name, body, pattern) {
  const target = write(path.join(dir, name), body);
  const result = run(validator, ['--spec', spec, '--companion', target]);
  assert.notStrictEqual(result.status, 0, `${name} fails`);
  assert.match(result.stdout, pattern, `${name} reports ${pattern}`);
}

expectFail(
  'missing-section.spec-translated.md',
  goodCompanion.replace(/### UI Test[\s\S]*?(?=### Out of scope)/, ''),
  /missing required section: ui-test/,
);
expectFail(
  'broken-numbering.spec-translated.md',
  goodCompanion.replace('2. Publish', '3. Publish'),
  /non-continuous numbering in section implementation/,
);
expectFail(
  'uncovered-ac.spec-translated.md',
  goodCompanion.replace(/AC2/g, 'AC1'),
  /source AC2 has no corresponding companion step/,
);
expectFail(
  'ac-only-in-out-of-scope.spec-translated.md',
  goodCompanion
    .replace('2. Publish the saved timestamp for the banner. (AC1, AC2)\n', '')
    .replace(/\(AC2\)/g, '(AC1)')
    .replace('### Out of scope\n- Offline editing.', '### Out of scope\n- Offline editing. (AC2)'),
  /source AC2 has no corresponding companion step/,
);
expectFail(
  'empty-flag.spec-translated.md',
  goodCompanion.replace('[unresolved: sync status icon]', '[unresolved: ]'),
  /empty \[unresolved:\] flag/,
);
const elsewhere = write(path.join(temp('ws-translate-to-human-remote-'), 'step-00-demo.spec-translated.md'), goodCompanion);
const remote = run(validator, ['--spec', spec, '--companion', elsewhere]);
assert.notStrictEqual(remote.status, 0, 'companion outside the spec directory fails');
assert.match(remote.stdout, /same directory/, 'co-location is required');
const same = run(validator, ['--spec', spec, '--companion', spec]);
assert.notStrictEqual(same.status, 0, 'companion equal to the spec fails');
assert.match(same.stdout, /must differ from the spec path/, 'no-overwrite guard');

// The validator never writes the agent spec (AC7).
assert.strictEqual(fs.readFileSync(spec, 'utf8'), specHash, 'agent spec byte-identical after all runs');

console.log('test-spec-translate-to-human: ok');
