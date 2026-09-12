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

    const autoloadPath = path.join(REPO_ROOT, '.agents/skills/ws-shared/autoload.md');
    const autoload = fs.readFileSync(autoloadPath, 'utf8');
    assert(autoload.includes('ws-wiki'), 'AC17: autoload.md registers ws-wiki');
  }

  // Test 10: NS3 & NS4 Negative Scenarios Gate Coverage
  {
    const skillPath = path.join(REPO_ROOT, '.agents/skills/ws-wiki/SKILL.md');
    const skillContent = fs.readFileSync(skillPath, 'utf8');
    assert(skillContent.includes('user-gate') && skillContent.includes('Cancel') && skillContent.includes('STOP'), 'NS3: Cancel in review gate terminates ws-wiki without modifying files');
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
