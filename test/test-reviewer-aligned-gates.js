/**
 * Test suite for Reviewer-Aligned Implementation Gates (Spec 0067).
 * Validates AC1 through AC8.
 * Run: node test/test-reviewer-aligned-gates.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const NODE = process.execPath;

const SCAN_SCRIPT = path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'scripts', 'scan_stack_invariants.cjs');
const AC_LEDGER_SCRIPT = path.join(REPO_ROOT, '.agents', 'skills', 'ws-spec-to-pr', 'scripts', 'ac_ledger.cjs');
const AUTO_CONFIG_SCRIPT = path.join(REPO_ROOT, '.agents', 'skills', 'ws-configure-project', 'scripts', 'auto_configure.cjs');

const tmpDirs = [];
let failures = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures += 1;
}

function ok(msg) {
  console.log(`ok: ${msg}`);
}

function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}

function cleanup() {
  for (const dir of tmpDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

try {
  console.log('--- AC1: Structured stacks catalog & whitelist & config schema ---');
  const stacksDir = path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'stacks');
  const expectedStacks = ['abp-angular.md', 'typescript-node.md', 'nextjs-react.md', 'php-laravel.md'];
  for (const file of expectedStacks) {
    const fullPath = path.join(stacksDir, file);
    assert(fs.existsSync(fullPath), `Stack file exists: ${file}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(content.includes('Anti-Patterns') && content.includes('Review Checklist'), `${file} has required sections`);
  }

  const installRulesPath = path.join(REPO_ROOT, 'bin', 'install-rules.js');
  const installRulesContent = fs.readFileSync(installRulesPath, 'utf8');
  assert(installRulesContent.includes("'stacks'"), 'bin/install-rules.js HUB_WHITELIST includes stacks');

  const configSchema = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'config.schema.json'), 'utf8'));
  assert(configSchema.properties.verification.properties.localReviewCommand !== undefined, 'config.schema.json defines verification.localReviewCommand');
  assert(configSchema.properties.preview.properties.localReviewCommand !== undefined, 'config.schema.json defines preview.localReviewCommand');

  const configExample = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'config.json.example'), 'utf8'));
  assert(configExample.verification.localReviewCommand !== undefined, 'config.json.example includes verification.localReviewCommand');

  console.log('--- AC2: ws-spec-write & ws-spec-format stack invariant injection ---');
  const specWriteContent = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-spec-write', 'SKILL.md'), 'utf8');
  assert(/stack invariants/i.test(specWriteContent) && /negative & failing test scenarios/i.test(specWriteContent), 'ws-spec-write documents stack invariants in DoR & negative scenarios');

  const specFormatContent = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-spec-format', 'SKILL.md'), 'utf8');
  assert(/stack invariants/i.test(specFormatContent) && /negative & failing test scenarios/i.test(specFormatContent), 'ws-spec-format documents stack invariants');

  console.log('--- AC3: ws-plan-write & ws-plan-interview verification plan ---');
  const planTemplateContent = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-plan-write', 'references', 'PLAN-TEMPLATE.md'), 'utf8');
  assert(planTemplateContent.includes('## 6. Stack & Security Invariants Verification Plan'), 'PLAN-TEMPLATE.md contains Section 6 Stack & Security Invariants Verification Plan');

  const planWriteContent = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-plan-write', 'SKILL.md'), 'utf8');
  assert(planWriteContent.includes('Stack & Security Invariants Verification Plan'), 'ws-plan-write SKILL.md mandates Section 6');

  const planInterviewContent = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-plan-interview', 'SKILL.md'), 'utf8');
  assert(planInterviewContent.includes('Stack & Security Invariants Verification Plan'), 'ws-plan-interview SKILL.md audits Section 6');

  console.log('--- AC4: scan_stack_invariants.cjs pre-completion static scan ---');
  // 1. abp-angular violations
  const abpTmp = mkTmp('ws-abp-');
  fs.writeFileSync(path.join(abpTmp, 'bad.cs'), 'public async Task BadMethod() { var res = DoWork().Result; }\n');
  fs.writeFileSync(path.join(abpTmp, 'button.component.html'), '<button (click)="submit()">Submit</button>\n');
  const abpRes = cp.spawnSync(NODE, [SCAN_SCRIPT, '--repo-root', abpTmp, '--stack', 'abp-angular', '--json'], { encoding: 'utf8' });
  assert(abpRes.status === 1, 'scan_stack_invariants exits 1 on ABP violations');
  const abpJson = JSON.parse(abpRes.stdout);
  assert(abpJson.violations.some((v) => (v.rule || v.id || '').includes('sync-over-async')), 'ABP sync-over-async detected');
  assert(abpJson.violations.some((v) => (v.rule || v.id || '').includes('abp-permission')), 'ABP button permission missing detected');

  // 2. typescript-node violations
  const tsTmp = mkTmp('ws-ts-');
  fs.writeFileSync(path.join(tsTmp, 'bad.ts'), 'const x = (data as any).foo;\n');
  const tsRes = cp.spawnSync(NODE, [SCAN_SCRIPT, '--repo-root', tsTmp, '--stack', 'typescript-node', '--json'], { encoding: 'utf8' });
  assert(tsRes.status === 1, 'scan_stack_invariants exits 1 on TS any violation');
  const tsJson = JSON.parse(tsRes.stdout);
  assert(tsJson.violations.some((v) => (v.rule || v.id || '').includes('any')), 'TS unchecked any detected');

  // 3. Clean files pass
  const cleanTmp = mkTmp('ws-clean-');
  fs.writeFileSync(path.join(cleanTmp, 'good.ts'), 'const x: unknown = 42;\n');
  const cleanRes = cp.spawnSync(NODE, [SCAN_SCRIPT, '--repo-root', cleanTmp, '--stack', 'typescript-node', '--json'], { encoding: 'utf8' });
  assert(cleanRes.status === 0, 'scan_stack_invariants exits 0 on clean code');
  const cleanJson = JSON.parse(cleanRes.stdout);
  assert(cleanJson.passed === true && cleanJson.violations.length === 0, 'clean scan has 0 violations');

  const implementTasksContent = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-implement-tasks', 'SKILL.md'), 'utf8');
  assert(implementTasksContent.includes('stack-invariant-scan: pass | fail'), 'ws-implement-tasks documents stack-invariant-scan');

  console.log('--- AC5: ac_ledger.cjs linking & score capping ---');
  const ledgerTmp = mkTmp('ws-ledger-');
  fs.mkdirSync(path.join(ledgerTmp, '.agents', 'skills', 'ws-shared'), { recursive: true });
  fs.writeFileSync(path.join(ledgerTmp, '.agents', 'skills', 'ws-shared', 'config.json'), JSON.stringify({
    verification: {},
    plans: { dir: '.agents/plans' },
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  fs.writeFileSync(path.join(ledgerTmp, 'feature.spec.md'), '## Acceptance Criteria\n- AC1: Do work.\n');
  fs.writeFileSync(path.join(ledgerTmp, 'code.js'), 'export const a = 1;\n');
  fs.writeFileSync(path.join(ledgerTmp, 'bad.cs'), 'public void M() {}\n');

  // init ledger
  const initRes = cp.spawnSync(NODE, [AC_LEDGER_SCRIPT, 'init', '--spec', 'feature.spec.md', '--output', 'ledger.json', '--workflow-id', 'wf1', '--slug', 'feat', '--repo-root', ledgerTmp], { encoding: 'utf8' });
  assert(initRes.status === 0, `ac_ledger init succeeds: ${initRes.stderr}`);

  // link basic evidence
  const linkRes = cp.spawnSync(NODE, [AC_LEDGER_SCRIPT, 'link', '--ledger', 'ledger.json', '--event-id', 'ev1', '--ac', 'AC1', '--status', 'Implemented', '--file', 'code.js:L1-L1', '--repo-root', ledgerTmp], { encoding: 'utf8' });
  assert(linkRes.status === 0, `ac_ledger link succeeds: ${linkRes.stderr}`);

  // link critical invariant violation
  const linkViol = cp.spawnSync(NODE, [AC_LEDGER_SCRIPT, 'link', '--ledger', 'ledger.json', '--event-id', 'ev-viol', '--ac', 'AC1', '--invariant-violation', JSON.stringify({
    rule: 'ABP-SYNC-ASYNC',
    severity: 'Critical',
    state: 'open',
    evidence: 'bad.cs:L1-L1',
    description: 'Found .Result call in async method',
  }), '--repo-root', ledgerTmp], { encoding: 'utf8' });
  assert(linkViol.status === 0, `ac_ledger link with --invariant-violation succeeds: ${linkViol.stderr}`);

  // score boundary step5
  const scoreRes = cp.spawnSync(NODE, [AC_LEDGER_SCRIPT, 'score', '--ledger', 'ledger.json', '--boundary', 'step5', '--repo-root', ledgerTmp], { encoding: 'utf8' });
  assert(scoreRes.status === 0, `ac_ledger score succeeds: ${scoreRes.stderr}`);
  const scoreJson = JSON.parse(scoreRes.stdout);
  assert(scoreJson.score <= 7, `Critical invariant violation caps score at 7 (got ${scoreJson.score})`);
  assert(scoreJson.knownDefect === true, 'Critical invariant violation sets knownDefect: true');
  assert(scoreJson.invariantViolations && scoreJson.invariantViolations.length === 1, 'score reports invariantViolations');

  const planVerifyContent = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-plan-verify', 'SKILL.md'), 'utf8');
  assert(planVerifyContent.includes('Stack Invariant Audit') && planVerifyContent.includes('--invariant-violation'), 'ws-plan-verify documents Stack Invariant Audit and linking');

  console.log('--- AC6: ws-code-review two-phase adversarial model ---');
  const codeReviewContent = fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-code-review', 'SKILL.md'), 'utf8');
  assert(/Phase 1: Triage/i.test(codeReviewContent) && /Phase 2: Adversarial Investigation/i.test(codeReviewContent), 'ws-code-review documents Two-Phase Adversarial Investigation');
  assert(codeReviewContent.includes('Read Evidence') && codeReviewContent.includes('Executable Failure Scenario') && codeReviewContent.includes('Missing Protection') && codeReviewContent.includes('Discards'), 'ws-code-review documents 4-part Proof of Exploitability');
  assert(codeReviewContent.includes('Stack Invariant Compliance'), 'ws-code-review documents Stack Invariant Compliance');

  console.log('--- AC7: ws-code-review localReviewCommand dry-run adapter gate ---');
  assert(codeReviewContent.includes('localReviewCommand') && codeReviewContent.includes('--dry-run'), 'ws-code-review documents localReviewCommand dry-run gate');

  console.log('--- AC8: auto_configure.cjs initial framework traps in MEMORY.md ---');
  // 1. ABP Angular detection
  const abpProj = mkTmp('ws-auto-abp-');
  fs.mkdirSync(path.join(abpProj, '.agents', 'skills', 'ws-shared'), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'config.json.example'), path.join(abpProj, '.agents', 'skills', 'ws-shared', 'config.json.example'));
  fs.writeFileSync(path.join(abpProj, 'package.json'), JSON.stringify({ name: 'my-abp-app', scripts: { test: 'dotnet test' }, dependencies: { '@abp/ng.core': '^7.0.0' } }));
  const abpAuto = cp.spawnSync(NODE, [AUTO_CONFIG_SCRIPT, '--repo-root', abpProj, '--json'], { encoding: 'utf8' });
  assert(abpAuto.status === 0, `auto_configure for ABP succeeds: ${abpAuto.stderr}`);
  const abpAutoJson = JSON.parse(abpAuto.stdout);
  assert(abpAutoJson.detectedFramework === 'abp-angular', 'detected ABP Angular framework');
  assert(abpAutoJson.trapsSeeded === true, 'trapsSeeded is true for ABP Angular');
  const abpMemory = fs.readFileSync(path.join(abpProj, '.agents', 'skills', 'ws-shared', 'MEMORY.md'), 'utf8');
  assert(abpMemory.includes('ABP / Angular: Avoid sync-over-async'), 'ABP traps present in MEMORY.md');

  // Idempotency check: running again does not duplicate
  const abpAuto2 = cp.spawnSync(NODE, [AUTO_CONFIG_SCRIPT, '--repo-root', abpProj, '--json'], { encoding: 'utf8' });
  const abpAutoJson2 = JSON.parse(abpAuto2.stdout);
  assert(abpAutoJson2.trapsSeeded === false, 'trapsSeeded is false when already present');
  const abpMemory2 = fs.readFileSync(path.join(abpProj, '.agents', 'skills', 'ws-shared', 'MEMORY.md'), 'utf8');
  const matches = (abpMemory2.match(/ABP \/ Angular: Avoid sync-over-async/g) || []).length;
  assert(matches === 1, 'ABP trap block is not duplicated in MEMORY.md');

  // 2. Next.js React detection
  const nextProj = mkTmp('ws-auto-next-');
  fs.mkdirSync(path.join(nextProj, '.agents', 'skills', 'ws-shared'), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'config.json.example'), path.join(nextProj, '.agents', 'skills', 'ws-shared', 'config.json.example'));
  fs.writeFileSync(path.join(nextProj, 'package.json'), JSON.stringify({ name: 'my-next-app', scripts: { test: 'npm test' }, dependencies: { 'next': '^14.0.0' } }));
  const nextAuto = cp.spawnSync(NODE, [AUTO_CONFIG_SCRIPT, '--repo-root', nextProj, '--json'], { encoding: 'utf8' });
  assert(nextAuto.status === 0, `auto_configure for Next.js succeeds: ${nextAuto.stderr}`);
  const nextAutoJson = JSON.parse(nextAuto.stdout);
  assert(nextAutoJson.detectedFramework === 'nextjs-react', 'detected Next.js framework');
  const nextMemory = fs.readFileSync(path.join(nextProj, '.agents', 'skills', 'ws-shared', 'MEMORY.md'), 'utf8');
  assert(nextMemory.includes('Next.js / React: Prevent client credential leak'), 'Next.js traps present in MEMORY.md');

  // 3. PHP Laravel detection
  const phpProj = mkTmp('ws-auto-php-');
  fs.mkdirSync(path.join(phpProj, '.agents', 'skills', 'ws-shared'), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'config.json.example'), path.join(phpProj, '.agents', 'skills', 'ws-shared', 'config.json.example'));
  fs.writeFileSync(path.join(phpProj, 'package.json'), JSON.stringify({ name: 'my-php-app', scripts: { test: 'php artisan test' } }));
  fs.writeFileSync(path.join(phpProj, 'composer.json'), JSON.stringify({ name: 'vendor/my-laravel-app' }));
  const phpAuto = cp.spawnSync(NODE, [AUTO_CONFIG_SCRIPT, '--repo-root', phpProj, '--json'], { encoding: 'utf8' });
  assert(phpAuto.status === 0, `auto_configure for PHP succeeds: ${phpAuto.stderr}`);
  const phpAutoJson = JSON.parse(phpAuto.stdout);
  assert(phpAutoJson.detectedFramework === 'php-laravel', 'detected PHP Laravel framework');
  const phpMemory = fs.readFileSync(path.join(phpProj, '.agents', 'skills', 'ws-shared', 'MEMORY.md'), 'utf8');
  assert(phpMemory.includes('PHP / Laravel: Enforce policy authorization'), 'PHP traps present in MEMORY.md');

  // 4. TypeScript / Node detection
  const tsProj = mkTmp('ws-auto-ts-');
  fs.mkdirSync(path.join(tsProj, '.agents', 'skills', 'ws-shared'), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'config.json.example'), path.join(tsProj, '.agents', 'skills', 'ws-shared', 'config.json.example'));
  fs.writeFileSync(path.join(tsProj, 'package.json'), JSON.stringify({ name: 'my-ts-app', scripts: { test: 'npm test' }, devDependencies: { 'typescript': '^5.0.0' } }));
  const tsAuto = cp.spawnSync(NODE, [AUTO_CONFIG_SCRIPT, '--repo-root', tsProj, '--json'], { encoding: 'utf8' });
  assert(tsAuto.status === 0, `auto_configure for TS succeeds: ${tsAuto.stderr}`);
  const tsAutoJson = JSON.parse(tsAuto.stdout);
  assert(tsAutoJson.detectedFramework === 'typescript-node', 'detected TS Node framework');
  const tsMemory = fs.readFileSync(path.join(tsProj, '.agents', 'skills', 'ws-shared', 'MEMORY.md'), 'utf8');
  assert(tsMemory.includes('TypeScript / Node: Avoid unchecked any'), 'TS traps present in MEMORY.md');

} finally {
  cleanup();
}

if (failures > 0) {
  console.error(`\nCompleted with ${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nAll reviewer-aligned implementation gate tests passed successfully.');
}
