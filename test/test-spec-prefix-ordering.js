/**
 * Comprehensive test suite for spec-prefix-ordering and ws-spec-organizer
 * Run: node test/test-spec-prefix-ordering.js
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const RESOLVE_SCRIPT = path.join(REPO, '.agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs');
const ORGANIZE_SCRIPT = path.join(REPO, '.agents/skills/ws-spec-organizer/scripts/organize_specs.cjs');
const REGISTER_SCRIPT = path.join(REPO, '.agents/skills/ws-local-spec-provider/scripts/register_local_spec.cjs');
const TRACK_SCRIPT = path.join(REPO, '.agents/skills/ws-spec-index/scripts/track_index.cjs');

console.log('--- Testing spec-prefix-ordering & ws-spec-organizer ---');

// 1. Schema & Config Example Checks (AC1, AC2)
console.log('1. Checking config schema and config.json.example');
const schema = JSON.parse(fs.readFileSync(path.join(REPO, '.agents/skills/ws-shared/config.schema.json'), 'utf8'));
assert.ok(schema.properties.plans.properties.enforceSpecPrefixOrdering, 'schema defines enforceSpecPrefixOrdering');
assert.strictEqual(schema.properties.plans.properties.enforceSpecPrefixOrdering.type, 'boolean');
assert.strictEqual(schema.properties.plans.properties.enforceSpecPrefixOrdering.default, false);

const configExample = fs.readFileSync(path.join(REPO, '.agents/skills/ws-shared/config.json.example'), 'utf8');
assert.match(configExample, /"enforceSpecPrefixOrdering":\s*false/, 'config.json.example contains enforceSpecPrefixOrdering');

// 2. Dependencies Checks (AC5)
console.log('2. Checking skill-dependencies.json registration');
const deps = JSON.parse(fs.readFileSync(path.join(REPO, 'bin/skill-dependencies.json'), 'utf8'));
assert.ok(deps.packages.workflows.skills.includes('ws-spec-organizer'), 'ws-spec-organizer in workflows package');
assert.ok(deps.dependencies['ws-write-spec'].includes('ws-spec-organizer'), 'ws-write-spec depends on ws-spec-organizer');
assert.ok('ws-spec-organizer' in deps.dependencies, 'ws-spec-organizer registered in dependencies map');

// 3. Documentation checks (AC4, AC17, AC18, AC19, AC20)
console.log('3. Checking documentation references');
const interviewDoc = fs.readFileSync(path.join(REPO, '.agents/skills/ws-configure-project/INTERVIEW.md'), 'utf8');
assert.match(interviewDoc, /plans\.enforceSpecPrefixOrdering/, 'INTERVIEW.md contains enforceSpecPrefixOrdering gate');

const writeSpecDoc = fs.readFileSync(path.join(REPO, '.agents/skills/ws-write-spec/SKILL.md'), 'utf8');
assert.match(writeSpecDoc, /resolve_spec_path\.cjs/, 'ws-write-spec SKILL.md references resolve_spec_path.cjs');

const fromProviderDoc = fs.readFileSync(path.join(REPO, '.agents/skills/ws-spec-from-provider/SKILL.md'), 'utf8');
assert.match(fromProviderDoc, /NNNN-us-\{id\}\.spec\.md/, 'ws-spec-from-provider SKILL.md references NNNN prefix');

const formatDoc = fs.readFileSync(path.join(REPO, '.agents/skills/ws-spec-format/FORMAT.md'), 'utf8');
assert.match(formatDoc, /NNNN-\{slug\}\.spec\.md/, 'FORMAT.md documents NNNN pattern');

const autoloadDoc = fs.readFileSync(path.join(REPO, '.agents/skills/ws-shared/autoload.md'), 'utf8');
assert.match(autoloadDoc, /ws-spec-organizer/, 'autoload.md references ws-spec-organizer');

// 4. resolve_spec_path.cjs tests
console.log('4. Testing resolve_spec_path.cjs CLI and behavior');

function createTempProject(enforcePrefixVal = false) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-prefix-test-'));
  const shared = path.join(tmp, '.agents', 'skills', 'ws-shared');
  fs.mkdirSync(shared, { recursive: true });
  const specs = path.join(tmp, '.agents', 'specs');
  fs.mkdirSync(specs, { recursive: true });
  const plans = path.join(tmp, '.agents', 'plans');
  fs.mkdirSync(plans, { recursive: true });

  const config = {
    project: { name: 'test-project', baseBranch: 'main' },
    plans: {
      dir: '.agents/plans',
      specsDir: '.agents/specs',
      enforceSpecPrefixOrdering: enforcePrefixVal,
    },
  };
  fs.writeFileSync(path.join(shared, 'config.json'), JSON.stringify(config, null, 2), 'utf8');
  return { tmp, specs, plans, shared };
}

// Missing --slug should fail (AC21)
{
  const res = spawnSync(process.execPath, [RESOLVE_SCRIPT], { encoding: 'utf8' });
  assert.strictEqual(res.status, 2, 'missing --slug returns exit code 2');
}

// Default false / omitted (AC3, AC6)
{
  const proj = createTempProject(false);
  const res = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'my-feature', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.stdout.trim(), '.agents/specs/my-feature.spec.md');

  // Non-boolean string "true" should safely resolve to false (AC3, NS1)
  const nonBoolProj = createTempProject('true');
  const resNonBool = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'my-feature', '--repo-root', nonBoolProj.tmp], { encoding: 'utf8' });
  assert.strictEqual(resNonBool.status, 0);
  assert.strictEqual(resNonBool.stdout.trim(), '.agents/specs/my-feature.spec.md');
}

// enforceSpecPrefixOrdering: true on empty specs dir (AC7, NS4)
{
  const proj = createTempProject(true);
  const res = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'first-feature', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.stdout.trim(), '.agents/specs/0001-first-feature.spec.md');
}

// enforceSpecPrefixOrdering: true with existing prefixes (AC7)
{
  const proj = createTempProject(true);
  fs.writeFileSync(path.join(proj.specs, '0001-auth.spec.md'), '---\nslug: auth\n---\n# Auth\n', 'utf8');
  fs.writeFileSync(path.join(proj.specs, '0004-billing.spec.md'), '---\nslug: billing\n---\n# Billing\n', 'utf8');

  const res = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'next-feature', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.stdout.trim(), '.agents/specs/0005-next-feature.spec.md');
}

// Existing files win (AC8, NS2)
{
  const proj = createTempProject(true);
  fs.writeFileSync(path.join(proj.specs, '0002-checkout.spec.md'), '---\nslug: checkout\n---\n# Checkout\n', 'utf8');
  fs.writeFileSync(path.join(proj.specs, 'legacy-unprefixed.spec.md'), '---\nslug: legacy-unprefixed\n---\n# Legacy\n', 'utf8');

  // Querying existing 0002-checkout
  const res1 = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'checkout', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(res1.status, 0);
  assert.strictEqual(res1.stdout.trim(), '.agents/specs/0002-checkout.spec.md');

  // Querying slug with prefix already in query
  const res2 = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', '0002-checkout', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(res2.status, 0);
  assert.strictEqual(res2.stdout.trim(), '.agents/specs/0002-checkout.spec.md');

  // Querying existing legacy unprefixed file
  const res3 = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'legacy-unprefixed', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(res3.status, 0);
  assert.strictEqual(res3.stdout.trim(), '.agents/specs/legacy-unprefixed.spec.md');
}

// Context flag and JSON output (AC9, AC10)
{
  const proj = createTempProject(true);
  fs.writeFileSync(path.join(proj.specs, '0001-auth.spec.md'), '---\nslug: auth\n---\n# Auth\n', 'utf8');

  const resContext = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'search', '--context', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(resContext.status, 0);
  assert.strictEqual(resContext.stdout.trim(), '.agents/specs/0002-search.context.md');

  const resJson = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'search', '--json', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(resJson.status, 0);
  const data = JSON.parse(resJson.stdout);
  assert.strictEqual(data.slug, 'search');
  assert.strictEqual(data.specPath, '.agents/specs/0002-search.spec.md');
  assert.strictEqual(data.contextPath, '.agents/specs/0002-search.context.md');
  assert.strictEqual(data.enforceSpecPrefixOrdering, true);
  assert.strictEqual(data.existing, false);
}

// 5. register_local_spec.cjs integration (AC12)
console.log('5. Testing register_local_spec.cjs with prefixed spec');
{
  const proj = createTempProject(true);
  const specContent = `---
slug: user-profile
title: User Profile
specDate: 2026-08-28
---

# User Profile
## Acceptance Criteria
- AC1: View profile
`;
  const specPath = path.join(proj.specs, '0007-user-profile.spec.md');
  fs.writeFileSync(specPath, specContent, 'utf8');

  const resReg = spawnSync(
    process.execPath,
    [REGISTER_SCRIPT, '--input', specPath, '--source', 'local', '--json'],
    { encoding: 'utf8', cwd: proj.tmp }
  );
  assert.strictEqual(resReg.status, 0, 'register exits 0');
  const regData = JSON.parse(resReg.stdout);
  assert.strictEqual(regData.slug, 'user-profile', 'slug is unprefixed');
  assert.strictEqual(regData.specPath, '.agents/plans/user-profile/step-00-user-profile.spec.md', 'plan path is unprefixed');
  assert.ok(fs.existsSync(path.join(proj.plans, 'user-profile', 'step-00-user-profile.spec.md')), 'plan file created');
}

// 6. track_index.cjs integration (AC13)
console.log('6. Testing track_index.cjs with prefixed spec');
{
  const proj = createTempProject(true);
  fs.writeFileSync(
    path.join(proj.specs, 'index.PRD'),
    `# Spec Index\n\n## 7. Feature map by phase\n\n### Phase 1: Core\n- [x] Initial setup (\`spec: 0001-setup.spec.md\`)\n\n## 8. Next specs\n\n| # | Spec | Status | Target Phase | Notes |\n|---|------|--------|--------------|-------|\n| 1 | \`setup\` | \`[x]\` done | Phase 1 | Initial |\n\nOpen Next-spec: \`setup\`\n`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(proj.specs, '0002-billing.spec.md'),
    `---
title: Billing Engine
slug: billing
---
# Billing Engine
`,
    'utf8'
  );

  const resTrack = spawnSync(
    process.execPath,
    [TRACK_SCRIPT, '--specs-dir', proj.specs, '--slug', 'billing'],
    { encoding: 'utf8', cwd: proj.tmp }
  );
  assert.strictEqual(resTrack.status, 0, 'track exits 0');
  const trackJson = JSON.parse(resTrack.stdout);
  assert.strictEqual(trackJson.status, 'tracked');

  const updatedIndex = fs.readFileSync(path.join(proj.specs, 'index.PRD'), 'utf8');
  assert.match(updatedIndex, /- \[ \] Billing Engine \(`spec: 0002-billing\.spec\.md`\)/, 'references prefixed filename');
  assert.match(updatedIndex, /\|\s*2\s*\|\s*`billing`\s*\|/, 'next specs table row');
}

// 7. organize_specs.cjs dry-run and apply (AC14, AC15, AC16, NS3, NS5)
console.log('7. Testing organize_specs.cjs dry-run and apply');
{
  const proj = createTempProject(true);
  fs.writeFileSync(
    path.join(proj.specs, 'index.PRD'),
    `# Spec Index\n\n## 7. Feature map by phase\n\n### Phase 1: Core\n- [ ] Beta Feature (\`spec: beta-feature.spec.md\`)\n- [ ] Alpha Feature (\`spec: alpha-feature.spec.md\`)\n`,
    'utf8'
  );

  // File 1: specDate 2026-06-01 (should become 0001)
  fs.writeFileSync(
    path.join(proj.specs, 'beta-feature.spec.md'),
    `---
title: Beta Feature
slug: beta-feature
specDate: 2026-06-01
---
# Beta Feature
`,
    'utf8'
  );
  fs.writeFileSync(path.join(proj.specs, 'beta-feature.context.md'), '# Beta context\n', 'utf8');

  // File 2: specDate 2026-07-01 (should become 0002)
  fs.writeFileSync(
    path.join(proj.specs, 'alpha-feature.spec.md'),
    `---
title: Alpha Feature
slug: alpha-feature
specDate: 2026-07-01
---
# Alpha Feature
`,
    'utf8'
  );

  // Subdirectory and non-spec file (should be ignored per AC16)
  const subDir = path.join(proj.specs, 'domains');
  fs.mkdirSync(subDir);
  fs.writeFileSync(path.join(subDir, 'sub.spec.md'), '# Sub\n', 'utf8');
  fs.writeFileSync(path.join(proj.specs, 'notes.txt'), 'notes\n', 'utf8');

  // Dry-run
  const resDry = spawnSync(
    process.execPath,
    [ORGANIZE_SCRIPT, '--repo-root', proj.tmp, '--dry-run', '--json'],
    { encoding: 'utf8' }
  );
  assert.strictEqual(resDry.status, 0, 'dry-run exits 0');
  const dryData = JSON.parse(resDry.stdout);
  assert.strictEqual(dryData.dryRun, true);
  assert.strictEqual(dryData.specsCount, 2, 'only 2 top-level specs found');
  assert.strictEqual(dryData.renames.length, 3, '2 specs + 1 context rename planned');

  // Apply
  const resApply = spawnSync(
    process.execPath,
    [ORGANIZE_SCRIPT, '--repo-root', proj.tmp, '--apply', '--json'],
    { encoding: 'utf8' }
  );
  assert.strictEqual(resApply.status, 0, 'apply exits 0');
  const applyData = JSON.parse(resApply.stdout);
  assert.strictEqual(applyData.dryRun, false);

  // Check files on disk
  assert.ok(fs.existsSync(path.join(proj.specs, '0001-beta-feature.spec.md')), '0001-beta-feature.spec.md exists');
  assert.ok(fs.existsSync(path.join(proj.specs, '0001-beta-feature.context.md')), '0001-beta-feature.context.md exists');
  assert.ok(fs.existsSync(path.join(proj.specs, '0002-alpha-feature.spec.md')), '0002-alpha-feature.spec.md exists');
  assert.ok(!fs.existsSync(path.join(proj.specs, 'beta-feature.spec.md')), 'old beta spec removed');
  assert.ok(!fs.existsSync(path.join(proj.specs, 'alpha-feature.spec.md')), 'old alpha spec removed');
  assert.ok(fs.existsSync(path.join(subDir, 'sub.spec.md')), 'nested spec untouched');

  // Check index.PRD update
  const updatedPrd = fs.readFileSync(path.join(proj.specs, 'index.PRD'), 'utf8');
  assert.match(updatedPrd, /`spec: 0001-beta-feature\.spec\.md`/, 'index.PRD updated beta');
  assert.match(updatedPrd, /`spec: 0002-alpha-feature\.spec\.md`/, 'index.PRD updated alpha');
}

console.log('--- All spec-prefix-ordering & ws-spec-organizer tests PASSED ---');
