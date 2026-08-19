import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

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

// 6. Test check_memory_conflict.py CLI execution
const scriptPath = path.join(REPO_ROOT, '.agents', 'skills', 'ws-spec-to-pr', 'scripts', 'check_memory_conflict.py');

// Test with plan file
const samplePlanPath = path.join(REPO_ROOT, '.agents', 'plans', 'us-217', 'step-01-us-217.plan.md');
if (fs.existsSync(samplePlanPath)) {
  const result = execFileSync('python', [scriptPath, samplePlanPath, '--json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const parsed = JSON.parse(result);
  assert(parsed.plan_keywords, 'JSON output must contain plan_keywords');
  assert(parsed.results, 'JSON output must contain results');
  assert(parsed.memory_path, 'JSON output must contain resolved memory_path');
  console.log('✅ check_memory_conflict.py CLI test passed');
}

console.log('\nAll pattern consult & memory enforcement tests PASSED successfully!');
