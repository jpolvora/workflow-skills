import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

console.log('Running pattern consult & memory enforcement tests...');

// 1. Check PROTOCOLS.md Base Prompt Prefix
const protocolsPath = path.join(REPO_ROOT, '.agents', 'skills', 'ws-spec-to-pr', 'PROTOCOLS.md');
const protocolsContent = fs.readFileSync(protocolsPath, 'utf8');
assert(
  protocolsContent.includes('config.json.defaults.patternsFrontend'),
  'PROTOCOLS.md must reference defaults.patternsFrontend'
);
assert(
  protocolsContent.includes('config.json.defaults.patternsBackend'),
  'PROTOCOLS.md must reference defaults.patternsBackend'
);
assert(
  protocolsContent.includes('{sharedDir}/frontend.md'),
  'PROTOCOLS.md must reference {sharedDir}/frontend.md'
);
assert(
  protocolsContent.includes('{sharedDir}/backend.md'),
  'PROTOCOLS.md must reference {sharedDir}/backend.md'
);
assert(
  protocolsContent.includes('pattern_consult'),
  'PROTOCOLS.md must require pattern_consult in step-output'
);
assert(
  protocolsContent.includes('memory_consult'),
  'PROTOCOLS.md must require memory_consult in step-output'
);
console.log('✅ PROTOCOLS.md Base Prompt Prefix assertions passed');

// 2. Check ws-spec-to-pr-lite SKILL.md
const liteSkillPath = path.join(REPO_ROOT, '.agents', 'skills', 'ws-spec-to-pr-lite', 'SKILL.md');
const liteSkillContent = fs.readFileSync(liteSkillPath, 'utf8');
assert(
  liteSkillContent.includes('Patterns & MEMORY Consult'),
  'ws-spec-to-pr-lite/SKILL.md must define Patterns & MEMORY Consult invariant'
);
assert(
  liteSkillContent.includes('patternsFrontend'),
  'ws-spec-to-pr-lite/SKILL.md must check patternsFrontend'
);
assert(
  liteSkillContent.includes('patternsBackend'),
  'ws-spec-to-pr-lite/SKILL.md must check patternsBackend'
);
console.log('✅ ws-spec-to-pr-lite SKILL.md assertions passed');

// 3. Check ws-implement-tasks SKILL.md
const implementPath = path.join(REPO_ROOT, '.agents', 'skills', 'ws-implement-tasks', 'SKILL.md');
const implementContent = fs.readFileSync(implementPath, 'utf8');
assert(
  implementContent.includes('Detect layers & consult pattern files'),
  'ws-implement-tasks/SKILL.md must include layer detection & pattern consult step'
);
assert(
  implementContent.includes('pattern_consult:'),
  'ws-implement-tasks/SKILL.md step-output must include pattern_consult'
);
assert(
  implementContent.includes('memory_consult:'),
  'ws-implement-tasks/SKILL.md step-output must include memory_consult'
);
console.log('✅ ws-implement-tasks SKILL.md assertions passed');

// 4. Check ws-write-plan SKILL.md
const writePlanPath = path.join(REPO_ROOT, '.agents', 'skills', 'ws-write-plan', 'SKILL.md');
const writePlanContent = fs.readFileSync(writePlanPath, 'utf8');
assert(
  writePlanContent.includes('defaults.patternsFrontend'),
  'ws-write-plan/SKILL.md must reference defaults.patternsFrontend'
);
assert(
  writePlanContent.includes('defaults.patternsBackend'),
  'ws-write-plan/SKILL.md must reference defaults.patternsBackend'
);
console.log('✅ ws-write-plan SKILL.md assertions passed');

// 5. Check ws-code-review SKILL.md
const codeReviewPath = path.join(REPO_ROOT, '.agents', 'skills', 'ws-code-review', 'SKILL.md');
const codeReviewContent = fs.readFileSync(codeReviewPath, 'utf8');
assert(
  !codeReviewContent.includes('MEMORY.md → ## Review Patterns'),
  'ws-code-review/SKILL.md must not reference non-existent ## Review Patterns heading'
);
assert(
  codeReviewContent.includes('Sweep known patterns & MEMORY'),
  'ws-code-review/SKILL.md must sweep compiled MEMORY entries'
);
assert(
  codeReviewContent.includes('frontend.md'),
  'ws-code-review/SKILL.md must consult frontend.md'
);
assert(
  codeReviewContent.includes('backend.md'),
  'ws-code-review/SKILL.md must consult backend.md'
);
console.log('✅ ws-code-review SKILL.md assertions passed');

// 6. Check config.schema.json & config.json.example definitions
const schemaPath = path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'config.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
assert.strictEqual(
  schema.properties.defaults.properties.patternsFrontend.type,
  'boolean',
  'config.schema.json defaults.patternsFrontend must be boolean'
);
assert.strictEqual(
  schema.properties.defaults.properties.patternsFrontend.default,
  true,
  'config.schema.json defaults.patternsFrontend must default to true'
);
assert.strictEqual(
  schema.properties.defaults.properties.patternsBackend.type,
  'boolean',
  'config.schema.json defaults.patternsBackend must be boolean'
);
assert.strictEqual(
  schema.properties.defaults.properties.patternsBackend.default,
  true,
  'config.schema.json defaults.patternsBackend must default to true'
);

const examplePath = path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'config.json.example');
const example = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
assert.strictEqual(
  example.defaults.patternsFrontend,
  true,
  'config.json.example defaults.patternsFrontend must be true'
);
assert.strictEqual(
  example.defaults.patternsBackend,
  true,
  'config.json.example defaults.patternsBackend must be true'
);
console.log('✅ config.schema.json and config.json.example assertions passed');

// 7. Test check_memory_conflict.py CLI execution & conflict detection
const scriptPath = path.join(REPO_ROOT, '.agents', 'skills', 'ws-spec-to-pr', 'scripts', 'check_memory_conflict.py');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-pattern-consult-'));
try {
  const mockPlanPath = path.join(tempDir, 'mock.plan.md');
  fs.writeFileSync(mockPlanPath, `---
slug: mock-task
---
## 2. Technical Design & Architecture
Layer: Api, Core, Web
Files: src/Web/Controllers/OrderController.cs
`, 'utf8');

  const mockMemoryPath = path.join(tempDir, 'MEMORY.md');
  fs.writeFileSync(mockMemoryPath, `# Knowledge Hub

## Anti-Regression Traps

### [TRAP-001] OrderController Concurrency
- **Severity**: High
- **Module**: OrderController
- **Layer**: Web
- **Symptoms**: Race conditions during parallel order placement.
- **Root Cause**: Non-atomic state mutation.
- **Fix**: Use distributed locking.
- **Verification**: Concurrency stress tests.
`, 'utf8');

  // Test trap detection with explicit --memory -> Exit code 2
  const trapResult = spawnSync('python', [scriptPath, mockPlanPath, '--memory', mockMemoryPath, '--json'], {
    encoding: 'utf8',
  });
  assert.strictEqual(trapResult.status, 2, 'check_memory_conflict.py must exit 2 when traps overlap');
  const trapParsed = JSON.parse(trapResult.stdout);
  assert(trapParsed.results.traps.length > 0, 'Results must identify overlapping trap');
  assert(trapParsed.results.traps[0].title.includes('TRAP-001'), 'Trap title must contain TRAP-001');

  // Exercise dynamic {sharedDir} resolution via --shared-dir (AC3)
  const sharedDirResult = spawnSync('python', [scriptPath, mockPlanPath, '--shared-dir', tempDir, '--json'], {
    encoding: 'utf8',
  });
  assert.strictEqual(sharedDirResult.status, 2, 'check_memory_conflict.py must resolve MEMORY.md from --shared-dir and detect traps');
  const sharedParsed = JSON.parse(sharedDirResult.stdout);
  assert.strictEqual(sharedParsed.memory_path, path.join(tempDir, 'MEMORY.md'), 'memory_path must resolve under --shared-dir');
  assert(sharedParsed.results.traps.length > 0, 'Results must identify overlapping trap via --shared-dir');

  // Exercise dynamic {sharedDir} resolution via --repo-root hub discovery (AC3)
  const repoRootFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-conflict-repo-'));
  try {
    const sharedHubDir = path.join(repoRootFixture, '.agents', 'skills', 'ws-shared');
    fs.mkdirSync(sharedHubDir, { recursive: true });
    fs.copyFileSync(mockMemoryPath, path.join(sharedHubDir, 'MEMORY.md'));
    const repoRootResult = spawnSync('python', [scriptPath, mockPlanPath, '--repo-root', repoRootFixture, '--json'], {
      encoding: 'utf8',
    });
    assert.strictEqual(repoRootResult.status, 2, 'check_memory_conflict.py must resolve MEMORY.md from --repo-root and detect traps');
    const repoParsed = JSON.parse(repoRootResult.stdout);
    assert.strictEqual(repoParsed.memory_path, path.join(sharedHubDir, 'MEMORY.md'), 'memory_path must resolve under --repo-root hub');
  } finally {
    fs.rmSync(repoRootFixture, { recursive: true, force: true });
  }

  // Test clean plan -> Exit code 0
  const cleanPlanPath = path.join(tempDir, 'clean.plan.md');
  fs.writeFileSync(cleanPlanPath, `---
slug: clean-task
---
## 2. Technical Design & Architecture
Layer: Infrastructure
Files: src/Infrastructure/Logging/AppLogger.cs
`, 'utf8');

  const cleanResult = spawnSync('python', [scriptPath, cleanPlanPath, '--memory', mockMemoryPath, '--json'], {
    encoding: 'utf8',
  });
  assert.strictEqual(cleanResult.status, 0, 'check_memory_conflict.py must exit 0 when no traps overlap');
  const cleanParsed = JSON.parse(cleanResult.stdout);
  assert.strictEqual(cleanParsed.results.traps.length, 0);

  console.log('✅ check_memory_conflict.py mock plan & trap assertions passed');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('\nAll pattern consult & memory enforcement tests PASSED successfully!');
