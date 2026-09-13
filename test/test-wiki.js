/**
 * ws-wiki test suite.
 * Run: node test/test-wiki.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const VALIDATE = path.join(REPO_ROOT, '.agents/skills/ws-wiki/scripts/validate_wiki.cjs');
const SYNC = path.join(REPO_ROOT, '.agents/skills/ws-wiki/scripts/sync_wiki_index.cjs');
const LIST_SWEEP = path.join(REPO_ROOT, '.agents/skills/ws-wiki/scripts/list_wiki_sweep_specs.cjs');
const LIST_VERIFY = path.join(REPO_ROOT, '.agents/skills/ws-wiki/scripts/list_wiki_feature_pages.cjs');
const LIST_FROM_CODE = path.join(REPO_ROOT, '.agents/skills/ws-wiki/scripts/list_wiki_from_code_areas.cjs');
const WIKI_SKILL_DIR = path.join(REPO_ROOT, '.agents/skills/ws-wiki');

let failures = 0;
function ok(msg) {
  console.log(`✅ ${msg}`);
}
function fail(msg) {
  console.error(`❌ ${msg}`);
  failures += 1;
}
function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

function run(script, args, cwd = REPO_ROOT) {
  return cp.spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env },
  });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-wiki-test-'));

try {
  const wikiDir = path.join(tmp, '.agents', 'specs', 'wiki');
  fs.mkdirSync(path.join(wikiDir, 'identity'), { recursive: true });

  // Test 1: Missing index.wiki.md
  {
    const res = run(VALIDATE, ['--wiki-dir', wikiDir, '--json']);
    assert(res.status === 1, 'validate_wiki fails with exit 1 when index.wiki.md is missing');
    const data = JSON.parse(res.stdout);
    assert(data.ok === false, 'validate_wiki JSON report ok is false when index missing');
    assert(data.errors.some((e) => e.includes('index.wiki.md not found')), 'error mentions missing index.wiki.md');
  }

  // Create valid index and feature page
  const featureFile = path.join(wikiDir, 'identity', 'user-management.md');
  fs.writeFileSync(
    featureFile,
    `# User Management

## Feature Overview
Allows administrators to manage user accounts and view profiles.

## Business Rules & Logic
- Email must be unique across tenants.
- Passwords must be at least 12 characters.

## Technical Architecture
- Model: UserEntity mapped via ORM.
- Route: /api/v1/users
`,
    'utf8',
  );

  const indexFile = path.join(wikiDir, 'index.wiki.md');
  fs.writeFileSync(
    indexFile,
    `# Project Living Feature Wiki & Domain Knowledge Base

## System Vision & Overview
Core platform architecture and living feature catalog.

## Domain: identity

- [User Management](identity/user-management.md): User account onboarding and lifecycle.
`,
    'utf8',
  );

  // Test 2: Valid wiki passes
  {
    const res = run(VALIDATE, ['--wiki-dir', wikiDir, '--json']);
    assert(res.status === 0, 'validate_wiki exits 0 on valid wiki structure');
    const data = JSON.parse(res.stdout);
    assert(data.ok === true, 'validate_wiki JSON ok is true on valid wiki');
    assert(data.errors.length === 0, 'no errors reported for valid wiki');
    assert(data.validatedPages.length === 2, 'validated both index and feature page');
  }

  // Test 3 (NS1): Broken relative link in index.wiki.md
  {
    const brokenIndexContent = `# Project Living Feature Wiki

## Domain: identity

- [Non Existent Feature](identity/non-existent.md): Does not exist on disk.
`;
    fs.writeFileSync(indexFile, brokenIndexContent, 'utf8');

    const res = run(VALIDATE, ['--wiki-dir', wikiDir, '--json']);
    assert(res.status === 1, 'NS1: validate_wiki fails with exit 1 on broken relative link');
    const data = JSON.parse(res.stdout);
    assert(data.ok === false, 'NS1: validate_wiki JSON ok is false on broken link');
    assert(data.errors.some((e) => e.includes('Broken relative link') && e.includes('non-existent.md')), 'NS1: error mentions broken link to non-existent.md');

    // Restore index
    fs.writeFileSync(
      indexFile,
      `# Project Living Feature Wiki

## Domain: identity

- [User Management](identity/user-management.md): User account onboarding and lifecycle.
`,
      'utf8',
    );
  }

  // Test 4 (NS2): Malformed heading in feature subpage
  {
    const malformedFeatureFile = path.join(wikiDir, 'identity', 'malformed-feature.md');
    fs.writeFileSync(
      malformedFeatureFile,
      `# Malformed Feature

## Feature Overview
Overview is here.

## Technical Architecture
Missing Business Rules & Logic section!
`,
      'utf8',
    );

    // Add link in index so it is indexed
    fs.appendFileSync(indexFile, `- [Malformed](identity/malformed-feature.md): Missing section.\n`, 'utf8');

    const res = run(VALIDATE, ['--wiki-dir', wikiDir, '--json']);
    assert(res.status === 1, 'NS2: validate_wiki fails with exit 1 when feature page omits required section');
    const data = JSON.parse(res.stdout);
    assert(data.ok === false, 'NS2: validate_wiki JSON ok is false on malformed section');
    assert(data.errors.some((e) => e.includes('missing required section heading(s)') && e.includes('Business Rules & Logic')), 'NS2: error specifically identifies missing Business Rules & Logic heading');

    // Clean up malformed feature
    fs.unlinkSync(malformedFeatureFile);
    fs.writeFileSync(
      indexFile,
      `# Project Living Feature Wiki

## Domain: identity

- [User Management](identity/user-management.md): User account onboarding and lifecycle.
`,
      'utf8',
    );
  }

  // Test 5: sync_wiki_index.cjs creates and updates index links
  {
    const syncRes = run(SYNC, [
      '--wiki-dir', wikiDir,
      '--domain', 'billing',
      '--feature', 'invoicing',
      '--title', 'Invoicing & Payments',
      '--description', 'Invoice generation, payment processing, and receipts.',
      '--json',
    ]);
    assert(syncRes.status === 0, 'sync_wiki_index exits 0 when adding new domain feature');
    const syncData = JSON.parse(syncRes.stdout);
    assert(syncData.ok === true, 'sync_wiki_index JSON ok is true');
    assert(syncData.domain === 'billing', 'sync_wiki_index sets domain correctly');

    const updatedIndex = fs.readFileSync(indexFile, 'utf8');
    assert(updatedIndex.includes('## Domain: billing'), 'index contains new billing domain heading');
    assert(updatedIndex.includes('[Invoicing & Payments](billing/invoicing.md): Invoice generation, payment processing, and receipts.'), 'index contains formatted feature bullet link');

    // Test 6: In-place idempotent update
    const updateRes = run(SYNC, [
      '--wiki-dir', wikiDir,
      '--domain', 'billing',
      '--feature', 'invoicing',
      '--title', 'Invoicing & Payments',
      '--description', 'Updated: invoice generation with tax calculation.',
      '--json',
    ]);
    assert(updateRes.status === 0, 'sync_wiki_index exits 0 when updating existing feature');
    const postUpdateIndex = fs.readFileSync(indexFile, 'utf8');
    assert(postUpdateIndex.includes('Updated: invoice generation with tax calculation.'), 'description updated in place');
    const bulletMatches = postUpdateIndex.match(/\[Invoicing & Payments\]\(billing\/invoicing\.md\)/g);
    assert(bulletMatches && bulletMatches.length === 1, 'feature link is not duplicated');
  }

  // Test 7: AC1 & AC2 Frontmatter & Load banner verification
  {
    const skillPath = path.join(REPO_ROOT, '.agents/skills/ws-wiki/SKILL.md');
    assert(fs.existsSync(skillPath), 'AC1: ws-wiki/SKILL.md exists');
    const content = fs.readFileSync(skillPath, 'utf8');
    assert(/name:\s*ws-wiki/.test(content), 'AC1: frontmatter contains name: ws-wiki');
    assert(/invocation_names:\s*\n\s*-\s*ws-wiki\s*\n\s*-\s*wiki/.test(content), 'AC1: frontmatter contains invocation names ws-wiki and wiki');
    assert(/version:\s*0\.4\.\d+/.test(content), 'AC1: frontmatter contains matching version');
    assert(content.includes('> When this skill is loaded, output "ws-wiki loaded."'), 'AC2: body outputs load banner "ws-wiki loaded."');
  }

  // Test 8: AC14 & AC15 Lifecycle and Schema verification
  {
    const stepDispatchPath = path.join(REPO_ROOT, '.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md');
    const stepDispatch = fs.readFileSync(stepDispatchPath, 'utf8');
    assert(stepDispatch.includes('ws-wiki') && stepDispatch.includes('sync'), 'AC14: STEP-DISPATCH.md includes ws-wiki sync in post-close lifecycle');

    const liteSkillPath = path.join(REPO_ROOT, '.agents/skills/ws-spec-to-pr-lite/SKILL.md');
    const liteSkill = fs.readFileSync(liteSkillPath, 'utf8');
    assert(liteSkill.includes('ws-wiki') && liteSkill.includes('sync'), 'AC14: ws-spec-to-pr-lite SKILL.md includes ws-wiki sync in post-close lifecycle');

    const schemaPath = path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/config.schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    assert(schema.properties?.plans?.properties?.wikiDir !== undefined, 'AC15: config.schema.json defines plans.wikiDir');
    assert(schema.properties.plans.properties.wikiDir.default === '.agents/specs/wiki', 'AC15: plans.wikiDir default is .agents/specs/wiki');
  }

  // Test 9: AC17 Catalog & Autoload registration
  {
    const catalogPath = path.join(REPO_ROOT, 'CATALOG.md');
    const catalog = fs.readFileSync(catalogPath, 'utf8');
    assert(catalog.includes('ws-wiki') && catalog.includes('.agents/skills/ws-wiki/SKILL.md'), 'AC17: CATALOG.md registers ws-wiki');

    const runtimeCatalogPath = path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/CATALOG.md');
    const runtimeCatalog = fs.readFileSync(runtimeCatalogPath, 'utf8');
    assert(runtimeCatalog.includes('ws-wiki') && runtimeCatalog.includes('.agents/skills/ws-wiki/SKILL.md'), 'AC17: runtime/CATALOG.md registers ws-wiki');
    assert(runtimeCatalog.includes('`workflows` = 47'), 'AC17: runtime/CATALOG.md scope note has workflows = 47');

    const autoloadPath = path.join(REPO_ROOT, '.agents/skills/ws-shared/autoload.md');
    const autoload = fs.readFileSync(autoloadPath, 'utf8');
    assert(autoload.includes('ws-wiki'), 'AC17: autoload.md registers ws-wiki');
    assert(autoload.includes('{wikiDir} living domain pages'), 'AC17: autoload.md diagram uses {wikiDir}');

    const runtimeAutoloadPath = path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/autoload.md');
    const runtimeAutoload = fs.readFileSync(runtimeAutoloadPath, 'utf8');
    assert(runtimeAutoload.includes('ws-wiki'), 'AC17: runtime/autoload.md registers ws-wiki');
    assert(runtimeAutoload.includes('{wikiDir} living domain pages'), 'AC17: runtime/autoload.md diagram uses {wikiDir}');
  }

  // Test 10: NS3 & NS4 Negative Scenarios Gate Coverage
  {
    const skillPath = path.join(REPO_ROOT, '.agents/skills/ws-wiki/SKILL.md');
    const skillContent = fs.readFileSync(skillPath, 'utf8');
    const syncCompanion = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'SYNC.md'), 'utf8');
    assert(syncCompanion.includes('user-gate') && syncCompanion.includes('Cancel') && syncCompanion.includes('STOP'), 'NS3: Cancel in review gate terminates ws-wiki without modifying files');
    assert(skillContent.includes('ws-shared/config.json') && skillContent.includes('ws-configure-project'), 'NS4: Missing project configuration triggers entry check gate');
  }

  // Test 11: Slug safety and out-of-wiki containment
  {
    // sync_wiki_index rejects unsafe/traversal feature slug
    const resBadSlug = run(SYNC, ['--wiki-dir', wikiDir, '--domain', 'identity', '--feature', '../../bad-slug']);
    assert(resBadSlug.status !== 0, 'sync_wiki_index rejects unsafe traversal feature slug');

    // sync_wiki_index rejects --file escaping wikiDir
    const resBadFile = run(SYNC, ['--wiki-dir', wikiDir, '--domain', 'identity', '--feature', 'safe-feature', '--file', '../../escape.md']);
    assert(resBadFile.status !== 0, 'sync_wiki_index rejects --file escaping wikiDir');

    // validate_wiki flags relative links escaping wikiDir
    const escapeIndexContent = `# Project Living Feature Wiki\n\n## Domain: identity\n\n- [Escaping](identity/../../escape.md): Outside wiki.\n`;
    fs.writeFileSync(indexFile, escapeIndexContent, 'utf8');
    const resValEscape = run(VALIDATE, ['--wiki-dir', wikiDir, '--json']);
    assert(resValEscape.status === 1, 'validate_wiki fails when link target escapes wiki directory');
    const dataValEscape = JSON.parse(resValEscape.stdout);
    assert(dataValEscape.errors.some((e) => e.includes('escapes wiki directory')), 'error mentions link target escapes wiki directory');

    // Restore index
    fs.writeFileSync(
      indexFile,
      `# Project Living Feature Wiki\n\n## Domain: identity\n\n- [User Management](identity/user-management.md): User account onboarding and lifecycle.\n`,
      'utf8',
    );
  }

  // Test 12: Orchestrator dependency closures and {wikiDir} token documentation
  {
    const binDepsPath = path.join(REPO_ROOT, 'bin/skill-dependencies.json');
    const binDeps = JSON.parse(fs.readFileSync(binDepsPath, 'utf8'));
    assert(binDeps.dependencies?.['ws-spec-to-pr']?.includes('ws-wiki'), 'bin/skill-dependencies.json: ws-spec-to-pr includes ws-wiki');
    assert(binDeps.dependencies?.['ws-spec-to-pr-lite']?.includes('ws-wiki'), 'bin/skill-dependencies.json: ws-spec-to-pr-lite includes ws-wiki');

    const runtimeDepsPath = path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/skill-dependencies.json');
    const runtimeDeps = JSON.parse(fs.readFileSync(runtimeDepsPath, 'utf8'));
    assert(runtimeDeps.dependencies?.['ws-spec-to-pr']?.includes('ws-wiki'), 'runtime/skill-dependencies.json: ws-spec-to-pr includes ws-wiki');
    assert(runtimeDeps.dependencies?.['ws-spec-to-pr-lite']?.includes('ws-wiki'), 'runtime/skill-dependencies.json: ws-spec-to-pr-lite includes ws-wiki');

    const toolsPath = path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/tools.md');
    const tools = fs.readFileSync(toolsPath, 'utf8');
    assert(tools.includes('{wikiDir}') && tools.includes('plans.wikiDir'), 'tools.md Path tokens table documents {wikiDir}');

    const configResPath = path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/config-resolution.md');
    const configRes = fs.readFileSync(configResPath, 'utf8');
    assert(configRes.includes('{wikiDir}') && configRes.includes('plans.wikiDir'), 'config-resolution.md documents {wikiDir}');

    const skillPath = path.join(REPO_ROOT, '.agents/skills/ws-wiki/SKILL.md');
    const skill = fs.readFileSync(skillPath, 'utf8');
    assert(skill.includes('{wikiDir}'), 'ws-wiki SKILL.md uses {wikiDir}');
    assert(!skill.includes('{specsDir}/wiki/'), 'ws-wiki SKILL.md does not hardcode {specsDir}/wiki/');
  }

  // Test 13: Markdown metacharacters sanitization and rejection
  {
    // sync_wiki_index sanitizes brackets and newlines in title and description
    const resSanitized = run(SYNC, [
      '--wiki-dir', wikiDir,
      '--domain', 'identity',
      '--feature', 'user-management',
      '--title', 'A]B\n- [Evil](evil.md)',
      '--description', 'Multi\r\nline\ndescription',
    ]);
    assert(resSanitized.status === 0, 'sync_wiki_index handles title/description with brackets and newlines');
    const idxContent = fs.readFileSync(indexFile, 'utf8');
    assert(!idxContent.includes('[Evil]'), 'injected link neutralized in title');
    assert(idxContent.includes('AB'), 'brackets removed from title');
    assert(idxContent.includes('Multi line description'), 'newlines collapsed in description');

    // sync_wiki_index sanitizes brackets in description
    const resDescSanitized = run(SYNC, [
      '--wiki-dir', wikiDir,
      '--domain', 'identity',
      '--feature', 'user-management',
      '--description', 'See [auth](login.md) documentation',
    ]);
    assert(resDescSanitized.status === 0, 'sync_wiki_index handles description with brackets');
    const idxDescContent = fs.readFileSync(indexFile, 'utf8');
    assert(!idxDescContent.includes('[auth]'), 'injected link neutralized in description');
    assert(idxDescContent.includes('See auth(login.md) documentation'), 'brackets stripped from description');

    // validate_wiki succeeds on sanitized index
    const resValSanitized = run(VALIDATE, ['--wiki-dir', wikiDir, '--json']);
    assert(resValSanitized.status === 0, 'validate_wiki succeeds on index with sanitized entries');

    // sync_wiki_index rejects linkPath with markdown metacharacters
    const resBadMetachars = run(SYNC, [
      '--wiki-dir', wikiDir,
      '--domain', 'identity',
      '--feature', 'user-management',
      '--file', 'identity/bad)name.md',
    ]);
    assert(resBadMetachars.status !== 0, 'sync_wiki_index rejects --file with closing paren');

    // Restore index
    fs.writeFileSync(
      indexFile,
      `# Project Living Feature Wiki\n\n## Domain: identity\n\n- [User Management](identity/user-management.md): User account onboarding and lifecycle.\n`,
      'utf8',
    );
  }

  // Test 14: GUI Config Editor & Config Wizard wikiDir synchronization
  {
    const guiScriptPath = path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1');
    const guiScript = fs.readFileSync(guiScriptPath, 'utf8');
    assert(guiScript.includes("Key 'wikiDir'") && guiScript.includes('.agents/specs/wiki'), 'Edit-WorkflowSkillsConfig.ps1 binds plans.wikiDir');

    const configSkillPath = path.join(REPO_ROOT, '.agents/skills/ws-configure-project/SKILL.md');
    const configSkill = fs.readFileSync(configSkillPath, 'utf8');
    assert(configSkill.includes('plans.wikiDir'), 'ws-configure-project SKILL.md documents plans.wikiDir default');
  }

  // Test 15: list_wiki_sweep_specs ordering, filters, and CLI guards
  {
    const sweepTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-wiki-sweep-'));
    try {
      const specsDir = path.join(sweepTmp, '.agents', 'specs');
      const wikiDir = path.join(specsDir, 'wiki');
      fs.mkdirSync(wikiDir, { recursive: true });
      fs.writeFileSync(path.join(wikiDir, 'index.wiki.md'), '# wiki\n', 'utf8');
      fs.writeFileSync(path.join(specsDir, '0002-beta.spec.md'), '---\nslug: beta\n---\n', 'utf8');
      fs.writeFileSync(path.join(specsDir, '0001-alpha.spec.md'), '---\nslug: alpha\n---\n', 'utf8');
      fs.writeFileSync(path.join(specsDir, 'legacy.spec.md'), '---\nslug: legacy\n---\n', 'utf8');
      fs.writeFileSync(path.join(specsDir, '0001-legacy.spec.md'), '---\nslug: legacy\n---\n', 'utf8');
      fs.writeFileSync(path.join(specsDir, '0003-alpha.context.md'), 'context only\n', 'utf8');

      const res = run(LIST_SWEEP, ['--repo-root', sweepTmp, '--json']);
      assert(res.status === 0, 'list_wiki_sweep_specs exits 0 with ambiguous slug warning');
      const data = JSON.parse(res.stdout);
      assert(Array.isArray(data.specs), 'list_wiki_sweep_specs returns specs array');
      assert(data.specs.length === 2, 'ambiguous legacy slug omitted; alpha and beta remain');
      assert(data.specs[0].slug === 'alpha' && data.specs[0].prefix === 1, 'NNNN specs sorted ascending');
      assert(data.specs[1].slug === 'beta' && data.specs[1].prefix === 2, 'second prefixed spec follows');
      assert(data.errors.some((e) => e.includes('Ambiguous spec of record for "legacy"')), 'dual slug recorded in errors');

      const emptySpecs = path.join(sweepTmp, 'empty-specs');
      fs.mkdirSync(emptySpecs, { recursive: true });
      const emptyRes = run(LIST_SWEEP, ['--repo-root', sweepTmp, '--specs-dir', emptySpecs, '--json']);
      assert(emptyRes.status === 0, 'empty specs dir succeeds with processed 0');
      const emptyData = JSON.parse(emptyRes.stdout);
      assert(emptyData.specs.length === 0, 'empty specs dir returns empty queue');

      const helpRes = run(LIST_SWEEP, ['--help']);
      assert(helpRes.status === 0, '--help exits 0');

      const badFlagRes = run(LIST_SWEEP, ['--not-a-flag']);
      assert(badFlagRes.status === 2, 'unknown flag exits non-zero');

      const escapeRes = run(LIST_SWEEP, ['--repo-root', sweepTmp, '--specs-dir', '../../outside', '--json']);
      assert(escapeRes.status === 1, 'specs-dir outside repo root fails closed');
    } finally {
      fs.rmSync(sweepTmp, { recursive: true, force: true });
    }
  }

  // Test 16: sweep/from-code subcommands documented in SKILL router and CATALOG
  {
    const skillPath = path.join(REPO_ROOT, '.agents/skills/ws-wiki/SKILL.md');
    const skill = fs.readFileSync(skillPath, 'utf8');
    const initCompanion = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'INIT.md'), 'utf8');
    assert(skill.includes('/ws-wiki sweep'), 'SKILL documents /ws-wiki sweep');
    assert(skill.includes('first-time') && skill.includes('backfill'), 'SKILL documents sweep aliases');
    assert(skill.includes('/ws-wiki from-code'), 'SKILL documents /ws-wiki from-code');
    assert(skill.includes('reverse') && skill.includes('reconstruct'), 'SKILL documents from-code aliases');
    assert(skill.includes('list_wiki_sweep_specs.cjs'), 'SKILL documents sweep list helper');
    assert(skill.includes('list_wiki_from_code_areas.cjs'), 'SKILL documents from-code area helper');
    assert(skill.includes('INIT.md') && skill.includes('FROM-CODE.md'), 'SKILL links companion procedures');
    assert(initCompanion.includes('Post-init offer'), 'INIT.md documents post-init gate');

    const catalogPath = path.join(REPO_ROOT, 'CATALOG.md');
    const catalog = fs.readFileSync(catalogPath, 'utf8');
    assert(catalog.includes('first-time spec sweep'), 'CATALOG task router mentions first-time spec sweep');
    assert(catalog.includes('from-code genesis'), 'CATALOG mentions from-code genesis');
  }

  // Test 17: list_wiki_feature_pages order, exclusions, JSON shape (AC4)
  {
    const verifyTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-wiki-verify-'));
    try {
      const vWiki = path.join(verifyTmp, '.agents', 'specs', 'wiki');
      fs.mkdirSync(path.join(vWiki, 'billing'), { recursive: true });
      fs.mkdirSync(path.join(vWiki, 'identity'), { recursive: true });
      fs.writeFileSync(path.join(vWiki, 'index.wiki.md'), '# index\n', 'utf8');
      fs.writeFileSync(path.join(vWiki, 'billing', 'invoicing.md'), '# Inv\n', 'utf8');
      fs.writeFileSync(path.join(vWiki, 'identity', 'user-management.md'), '# UM\n', 'utf8');
      fs.writeFileSync(path.join(vWiki, 'root-page.md'), '# Root\n', 'utf8');
      fs.writeFileSync(path.join(vWiki, 'sweep.state.json'), '{"status":"completed"}', 'utf8');
      fs.writeFileSync(path.join(vWiki, 'identity', 'stale.state.json.md'), '# stale\n', 'utf8');
      fs.mkdirSync(path.join(vWiki, 'nested'), { recursive: true });
      fs.writeFileSync(path.join(vWiki, 'nested', 'index.wiki.md'), '# nested index as feature\n', 'utf8');

      const res = run(LIST_VERIFY, ['--repo-root', verifyTmp, '--json']);
      assert(res.status === 0, 'list_wiki_feature_pages exits 0 on populated wiki');
      const data = JSON.parse(res.stdout);
      assert(data.ok === true, 'verify enumerator JSON ok is true');
      assert(Array.isArray(data.pages), 'verify enumerator returns pages array');
      assert(Array.isArray(data.errors), 'verify enumerator returns errors array');
      const files = data.pages.map((p) => p.file);
      assert(!files.some((f) => f.endsWith('index.wiki.md') && f.endsWith('.agents/specs/wiki/index.wiki.md')), 'root index.wiki.md excluded');
      assert(files.some((f) => f.endsWith('nested/index.wiki.md')), 'nested index.wiki.md lists as a feature page');
      assert(!files.some((f) => f.includes('stale.state.json')), '*.state.json.md edge excluded');
      assert(!files.some((f) => f.endsWith('.state.json')), '*.state.json excluded');
      const sorted = [...files].sort();
      assert(JSON.stringify(files) === JSON.stringify(sorted), 'pages sorted POSIX lexicographic');
      const rootRow = data.pages.find((p) => p.file.endsWith('root-page.md'));
      assert(rootRow && rootRow.domain === '' && rootRow.feature === 'root-page', 'domain "" for root-level pages');
      const umRow = data.pages.find((p) => p.file.endsWith('identity/user-management.md'));
      assert(umRow && umRow.domain === 'identity' && umRow.feature === 'user-management', 'domain/feature derived from wiki-relative path');
      assert(data.pages.every((p) => typeof p.file === 'string' && typeof p.domain === 'string' && typeof p.feature === 'string'), 'page rows carry file/domain/feature strings');
    } finally {
      fs.rmSync(verifyTmp, { recursive: true, force: true });
    }
  }

  // Test 18: verify enumerator CLI guards (AC5, NS2, NS3, NS11)
  {
    const guardTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-wiki-guard-'));
    try {
      const gWiki = path.join(guardTmp, '.agents', 'specs', 'wiki');
      fs.mkdirSync(gWiki, { recursive: true });
      fs.writeFileSync(path.join(gWiki, 'index.wiki.md'), '# index\n', 'utf8');

      const escapeRes = run(LIST_VERIFY, ['--repo-root', guardTmp, '--wiki-dir', '../../outside', '--json']);
      assert(escapeRes.status !== 0, 'NS2: --wiki-dir outside repo root fails closed');

      const badFlagRes = run(LIST_VERIFY, ['--not-a-flag']);
      assert(badFlagRes.status === 2, 'NS3: unknown flag exits 2');

      const specsDirRes = run(LIST_VERIFY, ['--specs-dir', 'whatever']);
      assert(specsDirRes.status === 2, 'AC5: --specs-dir rejected as unknown with exit 2');

      const leftoverRes = run(LIST_VERIFY, ['stray-token']);
      assert(leftoverRes.status === 2, 'AC5: leftover positional token rejected before readdir');

      const helpRes = run(LIST_VERIFY, ['--help']);
      assert(helpRes.status === 0, 'AC5: --help exits 0');
      assert(!fs.existsSync(path.join(guardTmp, '--help')), 'AC5: --help is never a filename');
    } finally {
      fs.rmSync(guardTmp, { recursive: true, force: true });
    }
  }

  // Test 19: Phase 2 verify and Phase 3 apply strings in SKILL router and CATALOG (AC1, AC18)
  {
    const skillPath = path.join(REPO_ROOT, '.agents/skills/ws-wiki/SKILL.md');
    const skill = fs.readFileSync(skillPath, 'utf8');
    const phase2 = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'PHASE-2-VERIFY.md'), 'utf8');
    const phase3 = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'PHASE-3-APPLY.md'), 'utf8');
    assert(skill.includes('Phase 1') && skill.includes('sweep/backfill'), 'AC1: SKILL names Phase 1 as sweep/backfill');
    assert(skill.includes('Phase 2') && skill.includes('wiki-vs-code'), 'AC1: SKILL names Phase 2 as wiki-vs-code statement verify');
    assert(skill.includes('Phase 3') && skill.includes('findings plan'), 'AC1: SKILL names Phase 3 as findings plan plus batch apply');
    assert(skill.includes('/ws-wiki verify') && skill.includes('audit') && skill.includes('check-code'), 'AC1: SKILL documents verify aliases');
    assert(skill.includes('/ws-wiki apply') && skill.includes('reconcile') && skill.includes('phase-3'), 'AC1: SKILL documents apply aliases');
    assert(skill.includes('list_wiki_feature_pages.cjs'), 'AC4: SKILL documents verify enumerator usage');
    assert(phase2.includes('list_wiki_feature_pages.cjs'), 'PHASE-2-VERIFY documents verify enumerator usage');
    assert(!/(Cursor|Claude|VS ?Code|Visual Studio|JetBrains|Windsurf|Copilot)/.test(skill), 'AC18: no host product names in skill router');

    const catalogPath = path.join(REPO_ROOT, 'CATALOG.md');
    const catalog = fs.readFileSync(catalogPath, 'utf8');
    assert(catalog.includes('Phase 2') && catalog.includes('verify'), 'AC18: CATALOG mentions Phase 2 wiki-vs-code verify');
    assert(catalog.includes('Phase 3') && catalog.includes('plan/apply'), 'AC18: CATALOG mentions Phase 3 plan/apply');

    const runtimeCatalogPath = path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/CATALOG.md');
    const runtimeCatalog = fs.readFileSync(runtimeCatalogPath, 'utf8');
    assert(runtimeCatalog.includes('Phase 2') && runtimeCatalog.includes('verify'), 'AC18: runtime CATALOG mentions Phase 2 verify');
    assert(runtimeCatalog.includes('Phase 3') && runtimeCatalog.includes('plan/apply'), 'AC18: runtime CATALOG mentions Phase 3 plan/apply');

    const hostPattern = /(Cursor|Claude|VS ?Code|Visual Studio|JetBrains|Windsurf|Copilot)/;
    for (const name of ['SKILL.md', 'INIT.md', 'FROM-CODE.md', 'PHASE-1-SWEEP.md', 'PHASE-2-VERIFY.md', 'PHASE-3-APPLY.md', 'SYNC.md', 'UPDATE.md']) {
      const body = fs.readFileSync(path.join(WIKI_SKILL_DIR, name), 'utf8');
      assert(!hostPattern.test(body), `AC18: no host product names in ${name}`);
    }

    const scriptsDir = path.join(REPO_ROOT, '.agents/skills/ws-wiki/scripts');
    for (const name of fs.readdirSync(scriptsDir)) {
      if (!name.endsWith('.cjs')) continue;
      const body = fs.readFileSync(path.join(scriptsDir, name), 'utf8');
      assert(!hostPattern.test(body), `AC18: no host product names in script ${name}`);
    }
    const verifyHelper = fs.readFileSync(path.join(scriptsDir, 'list_wiki_feature_pages.cjs'), 'utf8');
    assert(!/fetch\s*\(/.test(verifyHelper) && !/require\(['"]https?/.test(verifyHelper) && !/from\s+['"]https?:/.test(verifyHelper), 'NS10: verify helper performs no network fetch');
    const fromCodeHelper = fs.readFileSync(path.join(scriptsDir, 'list_wiki_from_code_areas.cjs'), 'utf8');
    assert(!/fetch\s*\(/.test(fromCodeHelper), 'NS8: from-code helper performs no network fetch');
    assert(phase3.includes('Update feature {title} to reflect current wiki statement: {statement}'), 'AC13: PHASE-3-APPLY carries exact code-directed spec template');
    assert(phase3.includes('source: local'), 'AC13: PHASE-3-APPLY pins source local for code-directed specs');
  }

  // Test 20: empty pages, dry-run purity, resume and apply STOP prose (AC8, AC15, AC16, NS1, NS4)
  {
    const emptyTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-wiki-empty-'));
    try {
      const eWiki = path.join(emptyTmp, '.agents', 'specs', 'wiki');
      fs.mkdirSync(eWiki, { recursive: true });
      fs.writeFileSync(path.join(eWiki, 'index.wiki.md'), '# Project Living Feature Wiki\n', 'utf8');

      const res = run(LIST_VERIFY, ['--repo-root', emptyTmp, '--json']);
      assert(res.status === 0, 'AC16: index-only wiki lists successfully');
      const data = JSON.parse(res.stdout);
      assert(data.ok === true && data.pages.length === 0, 'AC16: empty feature set returns findings 0 shape');

      const valRes = run(VALIDATE, ['--wiki-dir', eWiki, '--json']);
      assert(valRes.status === 0, 'AC16: validate still runs on index-only wiki');

      // Dry-run purity: enumerator is read-only, writes no checkpoint or specs
      const before = fs.readdirSync(eWiki).sort();
      const pageFile = path.join(eWiki, 'identity-page.md');
      fs.writeFileSync(pageFile, '# P\n', 'utf8');
      const mtimeBefore = fs.statSync(pageFile).mtimeMs;
      const listRes = run(LIST_VERIFY, ['--repo-root', emptyTmp, '--json']);
      assert(listRes.status === 0, 'AC8: queue listing succeeds without writes');
      assert(fs.statSync(pageFile).mtimeMs === mtimeBefore, 'NS4: page mtime unchanged after queue listing');
      assert(!fs.existsSync(path.join(eWiki, 'verify.state.json')), 'NS4: no verify.state.json written by listing');
      assert(JSON.stringify(fs.readdirSync(eWiki).sort()) === JSON.stringify([...before, 'identity-page.md'].sort()), 'NS4: no new spec or checkpoint files from listing');
    } finally {
      fs.rmSync(emptyTmp, { recursive: true, force: true });
    }

    const skillPath = path.join(REPO_ROOT, '.agents/skills/ws-wiki/SKILL.md');
    const skill = fs.readFileSync(skillPath, 'utf8');
    const sweepCompanion = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'PHASE-1-SWEEP.md'), 'utf8');
    const verifyCompanion = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'PHASE-2-VERIFY.md'), 'utf8');
    const applyCompanion = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'PHASE-3-APPLY.md'), 'utf8');
    const fromCodeCompanion = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'FROM-CODE.md'), 'utf8');
    assert(skill.includes('run `/ws-wiki init` first'), 'NS1: SKILL router documents missing-index STOP');
    assert(fromCodeCompanion.includes('run `/ws-wiki init` first'), 'NS1: FROM-CODE documents missing-index STOP');
    assert(verifyCompanion.includes('--dry-run') && verifyCompanion.includes('verify.state.json'), 'AC8: PHASE-2 documents --dry-run purity (no verify.state.json or specs)');
    assert(verifyCompanion.includes('--resume') && verifyCompanion.includes('lastFile'), 'AC15: PHASE-2 documents --resume continues after lastFile');
    assert(verifyCompanion.includes('--force'), 'AC15: PHASE-2 documents --force restart');
    assert(applyCompanion.includes('/ws-wiki apply') && applyCompanion.includes('status: audited'), 'AC15: PHASE-3 documents apply-without-audit STOP');
    assert(applyCompanion.includes('status` to `completed'), 'AC15: PHASE-3 documents completed close');
    assert(verifyCompanion.includes('verify.state.json') && verifyCompanion.includes('completedPages'), 'AC14: PHASE-2 documents checkpoint schema');
    assert(verifyCompanion.includes('must not stage this file'), 'AC14: PHASE-2 forbids staging checkpoint in product commits');
    assert(sweepCompanion.includes('Run Phase 2 wiki-vs-code audit (Recommended)'), 'AC2: PHASE-1 documents post-sweep Phase 2 offer');
    assert(verifyCompanion.includes('Walk pages in helper order, one page at a time'), 'AC6: PHASE-2 documents sequential walk in helper order');
    assert(verifyCompanion.includes('Classify each statement `confirmed`'), 'AC7: PHASE-2 documents four-class classification');
    assert(verifyCompanion.includes('Every statement needs at least one evidence pointer'), 'AC7: PHASE-2 requires evidence pointer per statement');
    assert(verifyCompanion.includes('After the last page set checkpoint `status` to `audited`'), 'AC9: PHASE-2 documents audited finish');
    assert(verifyCompanion.includes('Zero actionable findings skips the gate'), 'AC9: PHASE-2 documents zero-actionable skips Phase 3 gate');
    assert(applyCompanion.includes('Present every `differs` and `absent` finding'), 'AC10: PHASE-3 documents findings plan rows');
    assert(applyCompanion.includes('Update wiki (Recommended)'), 'AC11: PHASE-3 documents truth-gate Update wiki recommended');
    assert(applyCompanion.includes('Apply scheduled wiki edits in one pass'), 'AC12: PHASE-3 documents wiki batch apply');
    assert(sweepCompanion.includes('Skip writes no verify artifacts'), 'NS5: PHASE-1 documents post-sweep Skip writes nothing');
    assert(verifyCompanion.includes('Skip writes no wiki or spec updates'), 'NS6: PHASE-2 documents post-verify Skip writes nothing');
    assert(applyCompanion.includes('Undecided findings stay `pending`'), 'NS8: PHASE-3 documents pending on truth-gate Cancel');
    assert(applyCompanion.includes('assertContained') && applyCompanion.includes('no write leaves `{wikiDir}`'), 'NS9: PHASE-3 documents assertContained no-escape writers');
    assert(fromCodeCompanion.includes('--dry-run') && fromCodeCompanion.includes('from-code.state.json'), 'AC12: FROM-CODE documents dry-run purity');
    assert(fromCodeCompanion.includes('Start merge reconstruction (Recommended)'), 'AC9: FROM-CODE documents merge start gate');
    assert(fromCodeCompanion.includes('Overwrite existing wiki from code'), 'NS6: FROM-CODE documents overwrite confirm gate');
    assert(fromCodeCompanion.includes('do not drop existing Business Rules'), 'NS5: FROM-CODE documents merge preserve rules');
  }

  // Test 21: list_wiki_from_code_areas ordering, skip-empty, CLI guards, companions (AC6–AC8, AC16)
  {
    const companions = ['INIT.md', 'FROM-CODE.md', 'PHASE-1-SWEEP.md', 'PHASE-2-VERIFY.md', 'PHASE-3-APPLY.md', 'SYNC.md', 'UPDATE.md'];
    for (const name of companions) {
      assert(fs.existsSync(path.join(WIKI_SKILL_DIR, name)), `AC3: companion ${name} exists`);
    }

    const res = run(LIST_FROM_CODE, ['--repo-root', REPO_ROOT, '--json']);
    assert(res.status === 0, 'list_wiki_from_code_areas exits 0 on workflow-skills repo');
    const data = JSON.parse(res.stdout);
    assert(data.ok === true, 'from-code helper JSON ok is true');
    assert(Array.isArray(data.areas), 'from-code helper returns areas array');
    assert(Array.isArray(data.skipped), 'from-code helper returns skipped array');
    assert(Array.isArray(data.errors), 'from-code helper returns errors array');
    const ids = data.areas.map((a) => a.id);
    const canonical = ['structure', 'frontend', 'backend', 'ci-cd', 'docs', 'domains', 'quality', 'ship', 'git-surface'];
    const presentCanonical = ids.filter((id) => canonical.includes(id));
    assert(JSON.stringify(presentCanonical) === JSON.stringify([...presentCanonical].sort((a, b) => canonical.indexOf(a) - canonical.indexOf(b))), 'areas follow canonical id order');
    const gitSurface = data.areas.find((a) => a.id === 'git-surface');
    assert(gitSurface && Array.isArray(gitSurface.paths) && gitSurface.paths.length === 0, 'git-surface always in areas with paths: []');
    assert(!data.skipped.some((row) => row.id === 'git-surface'), 'git-surface never appears in skipped');
    assert(data.areas.every((a) => typeof a.id === 'string' && typeof a.title === 'string' && Array.isArray(a.paths)), 'area rows carry id/title/paths');

    const emptyFrontendTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-wiki-fromcode-'));
    try {
      const hub = path.join(emptyFrontendTmp, '.agents', 'skills', 'ws-shared');
      fs.mkdirSync(hub, { recursive: true });
      fs.writeFileSync(
        path.join(hub, 'config.json'),
        JSON.stringify({
          stack: {
            frontend: { sourceDir: '' },
            backend: { srcDir: 'src-missing', testProject: 'tests-missing' },
          },
          reviews: { dir: '.agents/reviews-missing' },
          plans: { wikiDir: '.agents/specs/wiki' },
        }),
        'utf8',
      );
      fs.writeFileSync(path.join(emptyFrontendTmp, 'README.md'), '# readme\n', 'utf8');
      const emptyRes = run(LIST_FROM_CODE, ['--repo-root', emptyFrontendTmp, '--json']);
      assert(emptyRes.status === 0, 'NS7: helper succeeds when frontend has no paths');
      const emptyData = JSON.parse(emptyRes.stdout);
      assert(!emptyData.areas.some((a) => a.id === 'frontend'), 'NS7: empty frontend omitted from areas');
      assert(emptyData.skipped.some((row) => row.id === 'frontend' && row.reason === 'no candidate paths'), 'NS7: empty frontend recorded in skipped');

      const guardTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-wiki-fromcode-guard-'));
      try {
        const hub = path.join(guardTmp, '.agents', 'skills', 'ws-shared');
        fs.mkdirSync(hub, { recursive: true });
        fs.writeFileSync(
          path.join(hub, 'config.json'),
          JSON.stringify({ reviews: { dir: '../../outside-escape' }, stack: { frontend: { sourceDir: '' }, backend: {} }, plans: {} }),
          'utf8',
        );
        const escapeRes = run(LIST_FROM_CODE, ['--repo-root', guardTmp, '--json']);
        assert(escapeRes.status === 0, 'NS2: helper exits 0 when escape paths are skipped');
        const escapeData = JSON.parse(escapeRes.stdout);
        const allPaths = escapeData.areas.flatMap((a) => a.paths);
        assert(!allPaths.some((p) => p.includes('outside-escape')), 'NS2: paths escaping repo root are not collected');

        const badFlagRes = run(LIST_FROM_CODE, ['--not-a-flag']);
        assert(badFlagRes.status === 2, 'NS3: unknown flag exits 2');

        const specsDirRes = run(LIST_FROM_CODE, ['--specs-dir', 'whatever']);
        assert(specsDirRes.status === 2, 'AC7: --specs-dir rejected as unknown with exit 2');

        const leftoverRes = run(LIST_FROM_CODE, ['stray-token']);
        assert(leftoverRes.status === 2, 'AC7: leftover positional token rejected');

        const helpRes = run(LIST_FROM_CODE, ['--help']);
        assert(helpRes.status === 0, 'AC7: --help exits 0');
        assert(!fs.existsSync(path.join(guardTmp, '--help')), 'AC7: --help is never a filename');
      } finally {
        fs.rmSync(guardTmp, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(emptyFrontendTmp, { recursive: true, force: true });
    }

    const initCompanion = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'INIT.md'), 'utf8');
    assert(initCompanion.includes('Run from-code reconstruction (Recommended)'), 'AC14: INIT recommends from-code when zero specs');
    assert(initCompanion.includes('Run first-time spec sweep (Recommended)'), 'AC14: INIT recommends sweep when specs exist');

    const binDepsPath = path.join(REPO_ROOT, 'bin/skill-dependencies.json');
    const binDeps = JSON.parse(fs.readFileSync(binDepsPath, 'utf8'));
    assert(!Object.prototype.hasOwnProperty.call(binDeps.dependencies || {}, 'ws-wiki-from-code'), 'AC1: no ws-wiki-from-code packaged skill');
  }

  // Test 22: verbosity gate + conditional template (us-324)
  {
    const skill = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'SKILL.md'), 'utf8');
    assert(skill.includes('verbosity') && skill.includes('condensed') && skill.includes('detailed'), 'us-324: SKILL documents verbosity condensed/detailed');
    assert(skill.includes('## Feature') && skill.includes('## How it works') && skill.includes('Third-party services'), 'us-324: SKILL documents new conditional template');
    assert(skill.includes('VERBOSITY-EXAMPLE'), 'us-324: SKILL links before/after verbosity example');
    assert(skill.includes('from-code.state.json') && skill.includes('plans.wiki.verbosity'), 'us-324: SKILL documents verbosity persistence');

    const fromCode = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'FROM-CODE.md'), 'utf8');
    assert(fromCode.includes('Verbosity gate') && fromCode.includes('Condensed (Recommended)') && fromCode.includes('Detailed'), 'us-324: FROM-CODE verbosity gate reachable');
    assert(fromCode.includes('autoMode') && fromCode.includes('condensed') && fromCode.includes('from-code.state.json'), 'us-324: FROM-CODE autoMode condensed + persistence');
    const sweep = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'PHASE-1-SWEEP.md'), 'utf8');
    assert(sweep.includes('Verbosity gate') && sweep.includes('sweep.state.json'), 'us-324: SWEEP verbosity gate + checkpoint');
    const sync = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'SYNC.md'), 'utf8');
    assert(sync.includes('verbosity') && sync.includes('from-code.state.json') && sync.includes('plans.wiki.verbosity'), 'us-324: SYNC resolves persisted verbosity');
    assert(sync.includes('Apply wiki updates (Recommended)') && sync.includes('Cancel') && sync.includes('STOP'), 'us-324: SYNC review gate still fail-closed on Cancel');
    const update = fs.readFileSync(path.join(WIKI_SKILL_DIR, 'UPDATE.md'), 'utf8');
    assert(update.includes('verbosity') && update.includes('condensed'), 'us-324: UPDATE honors persisted verbosity');

    const examplePath = path.join(WIKI_SKILL_DIR, 'references', 'VERBOSITY-EXAMPLE.md');
    assert(fs.existsSync(examplePath), 'us-324: VERBOSITY-EXAMPLE.md exists');
    const example = fs.readFileSync(examplePath, 'utf8');
    assert(example.includes('Condensed') && example.includes('Detailed'), 'us-324: example shows both styles');
    assert(!example.includes('## Third-party services'), 'us-324: detailed example omits inapplicable conditionals with no placeholder heading');

    const schema = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/config.schema.json'), 'utf8'));
    assert(schema.properties?.plans?.properties?.wiki?.properties?.verbosity?.default === 'condensed', 'us-324: schema plans.wiki.verbosity defaults condensed');
    assert(schema.properties.plans.properties.wiki.properties.verbosity.enum.includes('detailed'), 'us-324: schema verbosity enum includes detailed');

    const gui = fs.readFileSync(path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1'), 'utf8');
    assert(gui.includes("plans.wiki") && gui.includes("verbosity") && gui.includes("condensed"), 'us-324: GUI binds plans.wiki.verbosity');

    // Validator fixtures: new full, new omit-conditional, legacy warn-compat, new malformed, old malformed
    const fixTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-wiki-324-'));
    try {
      const fixWiki = path.join(fixTmp, '.agents', 'specs', 'wiki');
      fs.mkdirSync(path.join(fixWiki, 'billing'), { recursive: true });
      fs.writeFileSync(path.join(fixWiki, 'index.wiki.md'), '# index\n\n## Domain: billing\n\n- [New](billing/new.md): New template.\n- [Omit](billing/omit.md): Omit conditional.\n- [Old](billing/old.md): Legacy.\n', 'utf8');
      fs.writeFileSync(path.join(fixWiki, 'billing', 'new.md'), '# New\n\n## Feature\nF.\n\n## How it works\nH.\n\n## Backend\nB.\n\n## Frontend\nF.\n\n## Third-party services\nT.\n', 'utf8');
      fs.writeFileSync(path.join(fixWiki, 'billing', 'omit.md'), '# Omit\n\n## Feature\nF.\n\n## How it works\nH.\n\n## Backend\nB only; Frontend omitted as pure backend job.\n', 'utf8');
      fs.writeFileSync(path.join(fixWiki, 'billing', 'old.md'), '# Old\n\n## Feature Overview\nO.\n\n## Business Rules & Logic\nB.\n\n## Technical Architecture\nT.\n', 'utf8');
      const res = run(VALIDATE, ['--wiki-dir', fixWiki, '--json']);
      assert(res.status === 0, 'us-324: validator passes new + omit + legacy fixtures');
      const data = JSON.parse(res.stdout);
      assert(data.ok === true && data.errors.length === 0, 'us-324: no errors for mixed new/legacy wiki');
      assert(data.warnings.some((w) => w.includes('Legacy template') && w.includes('old.md')), 'us-324: legacy page warns (warn-only migration)');
      assert(!data.warnings.some((w) => w.includes('omit.md')), 'us-324: conditional omit produces no warning');

      // New malformed: missing How it works
      fs.writeFileSync(path.join(fixWiki, 'billing', 'bad-new.md'), '# Bad\n\n## Feature\nF.\n\n## Backend\nB.\n', 'utf8');
      const resBad = run(VALIDATE, ['--wiki-dir', fixWiki, '--json']);
      assert(resBad.status === 1, 'us-324: validator fails new page missing How it works');
      const dataBad = JSON.parse(resBad.stdout);
      assert(dataBad.errors.some((e) => e.includes('How it works')), 'us-324: error names missing How it works');
      fs.unlinkSync(path.join(fixWiki, 'billing', 'bad-new.md'));

      // New-complete plus one stray legacy heading warns as mixed (warn-only migration)
      fs.writeFileSync(path.join(fixWiki, 'billing', 'hybrid.md'), '# Hybrid\n\n## Feature\nF.\n\n## How it works\nH.\n\n## Backend\nB.\n\n## Business Rules & Logic\nLeftover.\n', 'utf8');
      const resHybrid = run(VALIDATE, ['--wiki-dir', fixWiki, '--json']);
      assert(resHybrid.status === 0, 'us-324: validator passes new-complete plus stray legacy heading with warning only');
      const dataHybrid = JSON.parse(resHybrid.stdout);
      assert(dataHybrid.warnings.some((w) => w.includes('Mixed template') && w.includes('hybrid.md')), 'us-324: hybrid page warns mixed template');
      fs.unlinkSync(path.join(fixWiki, 'billing', 'hybrid.md'));

      // normalizeVerbosity fail-closed (CJS require via subprocess for Windows-safe paths)
      const normRes = cp.spawnSync(process.execPath, ['-e', `const v=require(${JSON.stringify(VALIDATE)});console.log(JSON.stringify([v.normalizeVerbosity('detailed'),v.normalizeVerbosity('verbose'),v.normalizeVerbosity(undefined)]))`], { cwd: REPO_ROOT, encoding: 'utf8' });
      assert(normRes.status === 0, 'us-324: normalizeVerbosity subprocess exits 0');
      const normVals = JSON.parse(normRes.stdout);
      assert(normVals[0] === 'detailed', 'us-324: normalizeVerbosity keeps detailed');
      assert(normVals[1] === 'condensed', 'us-324: unknown verbosity fails closed to condensed');
      assert(normVals[2] === 'condensed', 'us-324: missing verbosity defaults condensed');
    } finally {
      fs.rmSync(fixTmp, { recursive: true, force: true });
    }
  }

} finally {
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {}
}

if (failures > 0) {
  console.error(`\n❌ ${failures} test(s) failed in test-wiki.js`);
  process.exit(1);
} else {
  console.log('\n✅ All ws-wiki tests passed successfully.');
  process.exit(0);
}
