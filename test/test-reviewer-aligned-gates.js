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

const SCAN_SCRIPT = path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'scripts', 'scan_stack_invariants.cjs');
const AC_LEDGER_SCRIPT = path.join(REPO_ROOT, '.agents', 'skills', 'ws-spec-to-pr', 'scripts', 'ac_ledger.cjs');
const AUTO_CONFIG_SCRIPT = path.join(REPO_ROOT, '.agents', 'skills', 'ws-configure-project', 'scripts', 'auto_configure.cjs');
const SELF_LEARNING_SCRIPT = path.join(REPO_ROOT, '.agents', 'skills', 'ws-self-learning', 'scripts', 'self_learning.cjs');

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
  const stacksDir = path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'stacks');
  const expectedStacks = ['abp-angular.md', 'typescript-node.md', 'nextjs-react.md', 'php-laravel.md'];
  for (const file of expectedStacks) {
    const fullPath = path.join(stacksDir, file);
    assert(fs.existsSync(fullPath), `Stack file exists: ${file}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(content.includes('Anti-Patterns') && content.includes('Review Checklist'), `${file} has required sections`);
  }

  const installRulesPath = path.join(REPO_ROOT, 'bin', 'install-rules.js');
  const installRulesContent = fs.readFileSync(installRulesPath, 'utf8');
  assert(installRulesContent.includes('HUB_LAYOUT'), 'bin/install-rules.js derives hub rules from HUB_LAYOUT');

  const configSchema = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'config.schema.json'), 'utf8'));
  assert(configSchema.properties.verification.properties.localReviewCommand !== undefined, 'config.schema.json defines verification.localReviewCommand');
  assert(configSchema.properties.preview.properties.localReviewCommand !== undefined, 'config.schema.json defines preview.localReviewCommand');

  const configExample = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'templates', 'config.json.example'), 'utf8'));
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

  // 4. Multi-controller endpoint authorization scoping
  const csAuthTmp = mkTmp('ws-cs-auth-');
  fs.writeFileSync(path.join(csAuthTmp, 'Controllers.cs'), [
    '[Authorize]',
    'public class SecureController : AbpController {',
    '    public async Task<int> ActionOne() { return 1; }',
    '}',
    'public class OpenController : AbpController {',
    '    public async Task<int> ActionTwo() { return 2; }',
    '}',
  ].join('\n'));
  const csAuthRes = cp.spawnSync(NODE, [SCAN_SCRIPT, '--repo-root', csAuthTmp, '--stack', 'abp-angular', '--json'], { encoding: 'utf8' });
  assert(csAuthRes.status === 1, 'scan_stack_invariants exits 1 when an unsecured controller in multi-controller file lacks authorization');
  const csAuthJson = JSON.parse(csAuthRes.stdout);
  assert(csAuthJson.violations.some((v) => v.rule === 'missing-endpoint-authorization' && v.line === 6), 'OpenController ActionTwo flagged for missing authorization');

  // 5. TS floating promise and void checks
  const fpTmp = mkTmp('ws-ts-fp-');
  fs.writeFileSync(path.join(fpTmp, 'floating.ts'), [
    'new Promise((resolve) => resolve(1));',
    'fetch("https://example.com");',
    'void new Promise((resolve) => resolve(2));',
    'const p = new Promise((resolve) => resolve(3));',
    'await fetch("https://example.com");',
  ].join('\n'));
  const fpRes = cp.spawnSync(NODE, [SCAN_SCRIPT, '--repo-root', fpTmp, '--stack', 'typescript-node', '--json'], { encoding: 'utf8' });
  assert(fpRes.status === 1, 'scan_stack_invariants exits 1 on floating promises');
  const fpJson = JSON.parse(fpRes.stdout);
  const fpViolations = fpJson.violations.filter((v) => v.rule === 'no-floating-promises');
  assert(fpViolations.length === 2, `detected exactly 2 floating promises (got ${fpViolations.length})`);
  assert(fpViolations[0].line === 1 && fpViolations[1].line === 2, 'lines 1 and 2 flagged, void/const/await lines not flagged');

  // 6. Git status porcelain parsing (unstaged ' M ...' and rename 'R  old -> new')
  const gitTmp = mkTmp('ws-git-status-');
  cp.spawnSync('git', ['init'], { cwd: gitTmp, stdio: 'ignore' });
  cp.spawnSync('git', ['config', 'user.name', 'test'], { cwd: gitTmp, stdio: 'ignore' });
  cp.spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: gitTmp, stdio: 'ignore' });
  fs.writeFileSync(path.join(gitTmp, 'clean.ts'), 'const a = 1;\n');
  fs.writeFileSync(path.join(gitTmp, 'old.ts'), 'const b = 1;\n');
  cp.spawnSync('git', ['add', '.'], { cwd: gitTmp, stdio: 'ignore' });
  cp.spawnSync('git', ['commit', '-m', 'init'], { cwd: gitTmp, stdio: 'ignore' });
  // Unstaged modification (produces ' M clean.ts')
  fs.writeFileSync(path.join(gitTmp, 'clean.ts'), 'const a = (x as any).foo;\n');
  // Staged rename (produces 'R  old.ts -> renamed.ts')
  cp.spawnSync('git', ['mv', 'old.ts', 'renamed.ts'], { cwd: gitTmp, stdio: 'ignore' });
  fs.writeFileSync(path.join(gitTmp, 'renamed.ts'), 'const b = (y as any).bar;\n');
  const gitRes = cp.spawnSync(NODE, [SCAN_SCRIPT, '--repo-root', gitTmp, '--stack', 'typescript-node', '--json'], { encoding: 'utf8' });
  assert(gitRes.status === 1, 'scan_stack_invariants discovers unstaged and renamed files via git status');
  const gitJson = JSON.parse(gitRes.stdout);
  assert(gitJson.violations.some((v) => v.file.includes('clean.ts')), 'unstaged clean.ts with leading space status discovered and scanned');
  assert(gitJson.violations.some((v) => v.file.includes('renamed.ts')), 'renamed file destination discovered and scanned');

  // 7. C# method modifier variations (virtual, override, sealed, async, custom return type)
  const csModTmp = mkTmp('ws-cs-mod-');
  fs.writeFileSync(path.join(csModTmp, 'ModifierController.cs'), [
    'public class ModifierController : AbpController {',
    '    public virtual async Task<IActionResult> ActionVirtual() { return null; }',
    '    public override async Task ActionOverride() { }',
    '    public sealed async ValueTask<int> ActionSealed() { return 1; }',
    '    [Authorize]',
    '    public async Task<int> ActionAuthorized() { return 2; }',
    '}',
  ].join('\n'));
  const csModRes = cp.spawnSync(NODE, [SCAN_SCRIPT, '--repo-root', csModTmp, '--stack', 'abp-angular', '--json'], { encoding: 'utf8' });
  assert(csModRes.status === 1, 'scan_stack_invariants exits 1 on modifier variations lacking authorize');
  const csModJson = JSON.parse(csModRes.stdout);
  const csModViolations = csModJson.violations.filter((v) => v.rule === 'missing-endpoint-authorization');
  assert(csModViolations.length === 3, `flags all 3 unauthorized modified actions (got ${csModViolations.length})`);

  // 8. Angular button [disabled] does not exempt from *abpPermission
  const ngDisTmp = mkTmp('ws-ng-dis-');
  fs.writeFileSync(path.join(ngDisTmp, 'action.component.html'), [
    '<button [disabled]="isSubmitting" (click)="submit()">Submit</button>',
    '<button *abpPermission="\'App.Create\'" (click)="create()">Create</button>',
  ].join('\n'));
  const ngDisRes = cp.spawnSync(NODE, [SCAN_SCRIPT, '--repo-root', ngDisTmp, '--stack', 'abp-angular', '--json'], { encoding: 'utf8' });
  assert(ngDisRes.status === 0, 'scan_stack_invariants exits 0 when violations are warnings only');
  const ngDisJson = JSON.parse(ngDisRes.stdout);
  const ngDisViolations = ngDisJson.violations.filter((v) => v.rule === 'angular-missing-abp-permission');
  assert(ngDisViolations.length === 1 && ngDisViolations[0].line === 1, 'flags line 1 [disabled] button, line 2 with *abpPermission passes');

  // 9. PHP Laravel read actions (index, show) flagged when unauthorized
  const phpActionsTmp = mkTmp('ws-php-actions-');
  fs.writeFileSync(path.join(phpActionsTmp, 'OrderController.php'), [
    '<?php',
    'class OrderController extends Controller {',
    '    public function index() { return Order::all(); }',
    '    public function show($id) { return Order::find($id); }',
    '    public function create() { return view("orders.create"); }',
    '    public function edit($id) { return view("orders.edit"); }',
    '    public function store() { $this->authorize("create", Order::class); }',
    '}',
  ].join('\n'));
  const phpActionsRes = cp.spawnSync(NODE, [SCAN_SCRIPT, '--repo-root', phpActionsTmp, '--stack', 'php-laravel', '--json'], { encoding: 'utf8' });
  assert(phpActionsRes.status === 1, 'scan_stack_invariants exits 1 when controller read actions lack authorization');
  const phpActionsJson = JSON.parse(phpActionsRes.stdout);
  const phpViolations = phpActionsJson.violations.filter((v) => (v.rule || '').includes('laravel-missing-authorize'));
  assert(phpViolations.length === 4, `flags index, show, create, edit lacking authorize (got ${phpViolations.length})`);

  // 10. TS floating promises with async client namespaces
  const fpNsTmp = mkTmp('ws-ts-fp-ns-');
  fs.writeFileSync(path.join(fpNsTmp, 'client-calls.ts'), [
    'axios.get("/api/users");',
    'prisma.user.findMany();',
    'db.query("SELECT 1");',
    'void axios.post("/api/users", {});',
    'await client.send();',
  ].join('\n'));
  const fpNsRes = cp.spawnSync(NODE, [SCAN_SCRIPT, '--repo-root', fpNsTmp, '--stack', 'typescript-node', '--json'], { encoding: 'utf8' });
  assert(fpNsRes.status === 1, 'scan_stack_invariants flags floating promises from async client namespaces');
  const fpNsJson = JSON.parse(fpNsRes.stdout);
  const fpNsViolations = fpNsJson.violations.filter((v) => v.rule === 'no-floating-promises');
  assert(fpNsViolations.length === 3, `detected exactly 3 floating client calls (got ${fpNsViolations.length})`);

  // 11. C# comment and string stripping eliminates false positives for sync-over-async and Guid.Empty
  const csCommentsTmp = mkTmp('ws-cs-comments-');
  fs.writeFileSync(path.join(csCommentsTmp, 'CommentsAndStrings.cs'), [
    'public class SafeService {',
    '    // Note: Do not call task.Result or task.Wait() because it blocks threads',
    '    /* Multi-line comment explaining Guid.Empty and .GetAwaiter().GetResult() */',
    '    public void LogInfo() {',
    '        _logger.LogInformation("Processing complete with no .Wait() or .Result calls");',
    '        var note = "Default Id is Guid.Empty in legacy systems";',
    '    }',
    '}',
  ].join('\n'));
  const csCommentsRes = cp.spawnSync(NODE, [SCAN_SCRIPT, '--repo-root', csCommentsTmp, '--stack', 'abp-angular', '--json'], { encoding: 'utf8' });
  assert(csCommentsRes.status === 0, 'scan_stack_invariants exits 0 when sync-over-async and Guid.Empty only appear in comments or strings');
  const csCommentsJson = JSON.parse(csCommentsRes.stdout);
  assert(csCommentsJson.violations.length === 0, `zero violations on comments and strings (got ${csCommentsJson.violations.length})`);

  // 12. PHP raw SQL injection catches concatenated bindings and query variants while allowing safe queries
  const phpSqlTmp = mkTmp('ws-php-sql-');
  fs.writeFileSync(path.join(phpSqlTmp, 'SqlTests.php'), [
    '<?php',
    'class QueryService {',
    '    public function badCalls($id, $status, $order, $alias) {',
    '        DB::raw("SELECT * FROM users WHERE id = $id");',
    '        DB::raw(\'SELECT * FROM users WHERE id = \' . $id);',
    '        DB::select(\'SELECT * FROM users WHERE id = \' . $id);',
    '        DB::select("SELECT * FROM users WHERE id = $id");',
    '        $query->whereRaw(\'status = \' . $status);',
    '        $query->whereRaw("status = $status");',
    '        $query->selectRaw(\'count(*) as \' . $alias);',
    '        $query->orderByRaw("FIELD(id, $order)");',
    '    }',
    '    public function safeCalls($id, $status, $name) {',
    '        // DB::raw("SELECT * FROM users WHERE id = $id");',
    '        # DB::select(\'SELECT * FROM users WHERE id = \' . $id);',
    '        DB::select(\'SELECT * FROM users WHERE name LIKE ?\', [\'%\' . $name . \'%\']);',
    '        $query->whereRaw(\'status = ?\', [$status]);',
    '        DB::raw(\'COUNT(*) as total\');',
    '    }',
    '}',
  ].join('\n'));
  const phpSqlRes = cp.spawnSync(NODE, [SCAN_SCRIPT, '--repo-root', phpSqlTmp, '--stack', 'php-laravel', '--json'], { encoding: 'utf8' });
  assert(phpSqlRes.status === 1, 'scan_stack_invariants exits 1 on raw SQL injection variants');
  const phpSqlJson = JSON.parse(phpSqlRes.stdout);
  const phpSqlViolations = phpSqlJson.violations.filter((v) => v.rule === 'laravel-raw-sql-injection');
  assert(phpSqlViolations.length === 8, `detected exactly 8 raw SQL injection calls (got ${phpSqlViolations.length})`);
  assert(phpSqlViolations.every((v) => v.line >= 4 && v.line <= 11), 'all flagged lines are in badCalls (lines 4-11), safeCalls and comments not flagged');

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
  const ledgerContent = JSON.parse(fs.readFileSync(path.join(ledgerTmp, 'ledger.json'), 'utf8'));
  assert(ledgerContent.invariantViolations[0].message === 'Found .Result call in async method', 'ac_ledger preserves description as message when normalizing invariant violations');

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
  fs.mkdirSync(path.join(abpProj, '.agents', 'skills', 'ws-shared', 'templates'), { recursive: true });
  fs.mkdirSync(path.join(abpProj, '.agents', 'skills', 'ws-shared', 'runtime'), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'templates', 'config.json.example'), path.join(abpProj, '.agents', 'skills', 'ws-shared', 'templates', 'config.json.example'));
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'config.schema.json'), path.join(abpProj, '.agents', 'skills', 'ws-shared', 'runtime', 'config.schema.json'));
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'hub-layout.json'), path.join(abpProj, '.agents', 'skills', 'ws-shared', 'runtime', 'hub-layout.json'));
  fs.writeFileSync(path.join(abpProj, 'package.json'), JSON.stringify({ name: 'my-abp-app', scripts: { test: 'dotnet test' }, dependencies: { '@abp/ng.core': '^7.0.0' } }));
  const abpAuto = cp.spawnSync(NODE, [AUTO_CONFIG_SCRIPT, '--repo-root', abpProj, '--json'], { encoding: 'utf8' });
  assert(abpAuto.status === 0, `auto_configure for ABP succeeds: ${abpAuto.stderr}`);
  const abpAutoJson = JSON.parse(abpAuto.stdout);
  assert(abpAutoJson.detectedFramework === 'abp-angular', 'detected ABP Angular framework');
  assert(abpAutoJson.trapsSeeded === true, 'trapsSeeded is true for ABP Angular');
  const abpMemory = fs.readFileSync(path.join(abpProj, '.agents', 'skills', 'ws-shared', 'MEMORY.md'), 'utf8');
  assert(abpMemory.includes('ABP / Angular: Avoid sync-over-async'), 'ABP traps present in MEMORY.md');
  const abpTrapFile = path.join(abpProj, '.agents', 'skills', 'ws-shared', 'memory', 'framework-trap-abp-angular.md');
  assert(fs.existsSync(abpTrapFile), 'framework trap file created under memory/ for ABP Angular');

  // Verify self_learning compile succeeds and retains the trap
  const compileRes = cp.spawnSync(NODE, [SELF_LEARNING_SCRIPT, '--compile', '--repo-root', abpProj], { encoding: 'utf8' });
  assert(compileRes.status === 0, `self_learning.cjs --compile succeeds after framework trap seeding: ${compileRes.stderr}`);
  const abpCompiledMemory = fs.readFileSync(path.join(abpProj, '.agents', 'skills', 'ws-shared', 'MEMORY.md'), 'utf8');
  assert(abpCompiledMemory.includes('ABP / Angular: Avoid sync-over-async'), 'ABP traps preserved in MEMORY.md after self_learning compile');

  // Idempotency check: running again does not duplicate
  const abpAuto2 = cp.spawnSync(NODE, [AUTO_CONFIG_SCRIPT, '--repo-root', abpProj, '--json'], { encoding: 'utf8' });
  const abpAutoJson2 = JSON.parse(abpAuto2.stdout);
  assert(abpAutoJson2.trapsSeeded === false, 'trapsSeeded is false when already present');
  const abpMemory2 = fs.readFileSync(path.join(abpProj, '.agents', 'skills', 'ws-shared', 'MEMORY.md'), 'utf8');
  const matches = (abpMemory2.match(/ABP \/ Angular: Avoid sync-over-async/g) || []).length;
  assert(matches === 1, 'ABP trap block is not duplicated in MEMORY.md');

  // 2. Next.js React detection
  const nextProj = mkTmp('ws-auto-next-');
  fs.mkdirSync(path.join(nextProj, '.agents', 'skills', 'ws-shared', 'templates'), { recursive: true });
  fs.mkdirSync(path.join(nextProj, '.agents', 'skills', 'ws-shared', 'runtime'), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'templates', 'config.json.example'), path.join(nextProj, '.agents', 'skills', 'ws-shared', 'templates', 'config.json.example'));
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'config.schema.json'), path.join(nextProj, '.agents', 'skills', 'ws-shared', 'runtime', 'config.schema.json'));
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'hub-layout.json'), path.join(nextProj, '.agents', 'skills', 'ws-shared', 'runtime', 'hub-layout.json'));
  fs.writeFileSync(path.join(nextProj, 'package.json'), JSON.stringify({ name: 'my-next-app', scripts: { test: 'npm test' }, dependencies: { 'next': '^14.0.0' } }));
  const nextAuto = cp.spawnSync(NODE, [AUTO_CONFIG_SCRIPT, '--repo-root', nextProj, '--json'], { encoding: 'utf8' });
  assert(nextAuto.status === 0, `auto_configure for Next.js succeeds: ${nextAuto.stderr}`);
  const nextAutoJson = JSON.parse(nextAuto.stdout);
  assert(nextAutoJson.detectedFramework === 'nextjs-react', 'detected Next.js framework');
  const nextMemory = fs.readFileSync(path.join(nextProj, '.agents', 'skills', 'ws-shared', 'MEMORY.md'), 'utf8');
  assert(nextMemory.includes('Next.js / React: Prevent client credential leak'), 'Next.js traps present in MEMORY.md');

  // 3. PHP Laravel detection
  const phpProj = mkTmp('ws-auto-php-');
  fs.mkdirSync(path.join(phpProj, '.agents', 'skills', 'ws-shared', 'templates'), { recursive: true });
  fs.mkdirSync(path.join(phpProj, '.agents', 'skills', 'ws-shared', 'runtime'), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'templates', 'config.json.example'), path.join(phpProj, '.agents', 'skills', 'ws-shared', 'templates', 'config.json.example'));
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'config.schema.json'), path.join(phpProj, '.agents', 'skills', 'ws-shared', 'runtime', 'config.schema.json'));
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'hub-layout.json'), path.join(phpProj, '.agents', 'skills', 'ws-shared', 'runtime', 'hub-layout.json'));
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
  fs.mkdirSync(path.join(tsProj, '.agents', 'skills', 'ws-shared', 'templates'), { recursive: true });
  fs.mkdirSync(path.join(tsProj, '.agents', 'skills', 'ws-shared', 'runtime'), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'templates', 'config.json.example'), path.join(tsProj, '.agents', 'skills', 'ws-shared', 'templates', 'config.json.example'));
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'config.schema.json'), path.join(tsProj, '.agents', 'skills', 'ws-shared', 'runtime', 'config.schema.json'));
  fs.copyFileSync(path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'hub-layout.json'), path.join(tsProj, '.agents', 'skills', 'ws-shared', 'runtime', 'hub-layout.json'));
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
