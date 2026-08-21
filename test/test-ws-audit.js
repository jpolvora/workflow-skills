/**
 * Smoke tests for ws-audit (AC1-AC12 helpers, suggestions, disposable scripts).
 * Run: node test/test-ws-audit.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const AUDIT = path.join(
  REPO_ROOT,
  '.agents/skills/ws-audit/scripts/audit_log.js',
);

const tmpRoots = [];
let failures = 0;

function fail(msg) {
  console.error(`FAIL ${msg}`);
  failures += 1;
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}

function cleanup() {
  for (const dir of tmpRoots) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function runNode(args, cwd = REPO_ROOT) {
  return cp.spawnSync(process.execPath, [AUDIT, ...args], {
    cwd,
    encoding: 'utf-8',
  });
}

function main() {
  assert(fs.existsSync(AUDIT), 'audit_log.js exists');
  assert(
    fs.existsSync(path.join(REPO_ROOT, '.agents/skills/ws-audit/SKILL.md')),
    'SKILL.md exists',
  );

  const example = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-shared/config.json.example'),
    'utf-8',
  );
  assert(example.includes('"enableAuditing"'), 'config example has enableAuditing');

  const schema = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-shared/config.schema.json'),
    'utf-8',
  );
  assert(schema.includes('"enableAuditing"'), 'config schema has enableAuditing');

  const deps = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'bin/skill-dependencies.json'), 'utf-8'),
  );
  assert(
    deps.dependencies['ws-ship-pr']?.includes('ws-audit'),
    'ws-ship-pr declares ws-audit dependency',
  );
  assert(
    deps.dependencies['ws-goal-fix-pr']?.includes('ws-audit'),
    'ws-goal-fix-pr declares ws-audit dependency',
  );
  assert(
    deps.dependencies['ws-fix-pr']?.includes('ws-audit'),
    'ws-fix-pr declares ws-audit dependency',
  );
  assert(
    deps.dependencies['ws-spec-to-pr']?.includes('ws-audit'),
    'ws-spec-to-pr declares ws-audit dependency',
  );

  // Test Python fix_pr_azure_context argument parsing before and after subcommand
  const pythonScript = path.join(
    REPO_ROOT,
    '.agents/skills/ws-azure-devops-provider/scripts/fix_pr_azure_context.py',
  );
  if (fs.existsSync(pythonScript)) {
    const pythonBin = ['python', 'python3'].find((bin) => {
      const probe = cp.spawnSync(bin, ['--version'], { encoding: 'utf-8' });
      return !probe.error && probe.status === 0;
    });

    if (!pythonBin) {
      console.warn('python not found; skipping fix_pr_azure_context argparse regression check');
    } else {
      const pyRes = cp.spawnSync(
        pythonBin,
        [
          pythonScript,
          'collect',
          '--pr-id',
          '909',
          '--repo-root',
          REPO_ROOT,
          '--output',
          path.join(mkTmp('py-out-'), 'test.json'),
        ],
        { cwd: REPO_ROOT, encoding: 'utf-8' },
      );
      assert(!pyRes.error, 'python execution succeeded without spawn error');
      // Even if Azure API auth fails in test environment, argparse must not fail with "unrecognized arguments"
      assert(
        !pyRes.stderr.includes('unrecognized arguments'),
        'fix_pr_azure_context argparse accepts --repo-root after subcommand',
      );
    }
  }

  const resolveMissing = runNode(['resolve', '--config', path.join(mkTmp('no-cfg-'), 'nope.json')]);
  assert(resolveMissing.status === 0, 'resolve exits 0');
  const resolved = JSON.parse(resolveMissing.stdout.trim());
  assert(resolved.enableAuditing === false, 'resolve false when config missing');

  const usDir = mkTmp('ws-audit-');
  const init = runNode([
    'init',
    '--us-dir',
    usDir,
    '--slug',
    'test-slug',
    '--workflow-id',
    'test-slug-20260101T000000Z',
  ]);
  assert(init.status === 0, 'init exits 0');
  const { session } = JSON.parse(init.stdout);
  assert(session.logPath && fs.existsSync(session.logPath), 'log file created');

  let sessionJson = JSON.stringify(session);

  // Check has-suggestions is initially false
  const initSuggestions = runNode(['has-suggestions', '--session', sessionJson]);
  assert(initSuggestions.status === 0, 'has-suggestions exits 0');
  const initSugState = JSON.parse(initSuggestions.stdout);
  assert(initSugState.hasSuggestions === false, 'has-suggestions false initially');

  // Append error finding
  const appendError = runNode([
    'append',
    '--session',
    sessionJson,
    '--finding',
    JSON.stringify({
      step: '4',
      skill: 'ws-implement-tasks',
      category: 'script',
      severity: 'error',
      summary: 'missing python launcher',
      evidence: 'exit 127',
      recovered: true,
    }),
  ]);
  assert(appendError.status === 0, 'append error exits 0');
  let currentSession = JSON.parse(appendError.stdout).session;
  sessionJson = JSON.stringify(currentSession);

  const hasErr = runNode(['has-errors', '--session', sessionJson]);
  assert(hasErr.status === 0, 'has-errors exits 0');
  const errState = JSON.parse(hasErr.stdout);
  assert(errState.hasErrors === true, 'has-errors true after error finding');

  const draft = runNode(['draft-issue', '--session', sessionJson]);
  assert(draft.status === 0, 'draft-issue exits 0');
  const draftObj = JSON.parse(draft.stdout);
  assert(draftObj.draft.title.includes('runtime-audit'), 'draft title prefix');
  assert(draftObj.draft.body.includes('missing python launcher'), 'draft body has finding');

  // Append disposable script finding
  const appendDisposable = runNode([
    'append',
    '--session',
    sessionJson,
    '--finding',
    JSON.stringify({
      step: '2',
      skill: 'ws-implement-tasks',
      category: 'disposable-script',
      severity: 'suggestion',
      summary: 'generated scratch script for test log regex parsing',
      language: 'python',
      targetAbstraction: 'ws-test-log-parser',
      recommendation: 'Pre-generate test log extraction helper in upstream package',
      evidence: 'python scratch/parse_logs.py',
    }),
  ]);
  assert(appendDisposable.status === 0, 'append disposable-script exits 0');
  currentSession = JSON.parse(appendDisposable.stdout).session;
  sessionJson = JSON.stringify(currentSession);

  // Append performance finding
  const appendPerf = runNode([
    'append',
    '--session',
    sessionJson,
    '--finding',
    JSON.stringify({
      step: '3',
      skill: 'ws-verify-plan',
      category: 'performance',
      severity: 'suggestion',
      summary: 'unbuffered full repository search executed 4 times',
      recommendation: 'Cache search results across step verification gates',
      evidence: 'grep -rn across entire root',
    }),
  ]);
  assert(appendPerf.status === 0, 'append performance exits 0');
  currentSession = JSON.parse(appendPerf.stdout).session;
  sessionJson = JSON.stringify(currentSession);

  // Append correctness finding
  const appendCorr = runNode([
    'append',
    '--session',
    sessionJson,
    '--finding',
    JSON.stringify({
      step: '6',
      skill: 'ws-code-review',
      category: 'correctness',
      severity: 'unusual',
      summary: 'unhandled deprecation warning in test runner output',
      evidence: 'DeprecationWarning: punycode is deprecated',
      recommendation: 'Upgrade dependencies to remove deprecated module warnings',
    }),
  ]);
  assert(appendCorr.status === 0, 'append correctness exits 0');
  currentSession = JSON.parse(appendCorr.stdout).session;
  sessionJson = JSON.stringify(currentSession);

  // Verify has-suggestions is true
  const hasSug = runNode(['has-suggestions', '--session', sessionJson]);
  assert(hasSug.status === 0, 'has-suggestions exits 0');
  const sugState = JSON.parse(hasSug.stdout);
  assert(sugState.hasSuggestions === true, 'has-suggestions true after suggestion findings');
  assert(sugState.suggestionCount >= 3, 'suggestionCount >= 3');

  // Verify draft-suggestions-issue
  const draftSug = runNode(['draft-suggestions-issue', '--session', sessionJson]);
  assert(draftSug.status === 0, 'draft-suggestions-issue exits 0');
  const sugDraftObj = JSON.parse(draftSug.stdout);
  assert(sugDraftObj.draft.title.includes('upstream-suggestion'), 'suggestion draft title prefix');
  assert(
    sugDraftObj.draft.body.includes('Disposable Script Opportunities'),
    'suggestion body has disposable scripts section',
  );
  assert(
    sugDraftObj.draft.body.includes('ws-test-log-parser'),
    'suggestion body mentions target abstraction',
  );
  assert(
    sugDraftObj.draft.body.includes('Performance Bottlenecks'),
    'suggestion body has performance section',
  );

  // Verify draft-issue with --type suggestion
  const draftTypeSug = runNode(['draft-issue', '--session', sessionJson, '--type', 'suggestion']);
  assert(draftTypeSug.status === 0, 'draft-issue --type suggestion exits 0');
  const typeSugDraftObj = JSON.parse(draftTypeSug.stdout);
  assert(typeSugDraftObj.draft.title.includes('upstream-suggestion'), 'type suggestion title');

  // Verify file-based contract and --upstream override
  const sessionFile = path.join(usDir, `.audit-session-${currentSession.slug}.json`);
  assert(fs.existsSync(sessionFile), 'session file exists on disk');

  const fileSug = runNode(['has-suggestions', '--session-file', sessionFile]);
  assert(fileSug.status === 0 && JSON.parse(fileSug.stdout).hasSuggestions === true, 'has-suggestions via --session-file');

  const fileDraftSug = runNode([
    'draft-suggestions-issue',
    '--session-file',
    sessionFile,
    '--upstream',
    'custom/upstream-repo',
  ]);
  assert(fileDraftSug.status === 0, 'draft-suggestions-issue via --session-file exits 0');
  const fileDraftObj = JSON.parse(fileDraftSug.stdout);
  assert(fileDraftObj.draft.upstream === 'custom/upstream-repo', 'draft-suggestions-issue honors --upstream');

  // Verify append via --finding-file
  const findingFile = path.join(usDir, '.finding-test.json');
  fs.writeFileSync(
    findingFile,
    JSON.stringify({
      step: '7',
      skill: 'ws-testing',
      category: 'optimization',
      severity: 'suggestion',
      summary: 'parallelize independent test files',
      recommendation: 'Enable test concurrency across suites',
    }),
    'utf-8',
  );
  const appendFileRes = runNode([
    'append',
    '--session-file',
    sessionFile,
    '--finding-file',
    findingFile,
  ]);
  assert(appendFileRes.status === 0, 'append via --session-file and --finding-file exits 0');
  currentSession = JSON.parse(appendFileRes.stdout).session;
  sessionJson = JSON.stringify(currentSession);

  // Verify draft-issue with --type all
  const draftTypeAll = runNode(['draft-issue', '--session-file', sessionFile, '--type', 'all']);
  assert(draftTypeAll.status === 0, 'draft-issue --type all exits 0');
  const typeAllObj = JSON.parse(draftTypeAll.stdout);
  assert(typeAllObj.draft.title.includes('error(s)'), 'type all title has errors and suggestions');
  assert(typeAllObj.draft.body.includes('## Execution Errors'), 'type all body has errors section');
  assert(typeAllObj.draft.body.includes('## Improvement & Tooling Opportunities'), 'type all body has suggestions section');

  // Finalize via --session-file
  const fin = runNode(['finalize', '--session-file', sessionFile]);
  assert(fin.status === 0, 'finalize exits 0');
  const finalizedSession = JSON.parse(fin.stdout).session;
  assert(finalizedSession.disposableScriptCount === 1, 'disposableScriptCount is 1');
  assert(finalizedSession.suggestionCount >= 4, 'suggestionCount recorded in session');

  // Verify finalize idempotence (calling finalize a second time does not duplicate content)
  const logTextBeforeSecondFin = fs.readFileSync(currentSession.logPath, 'utf-8');
  const finSecond = runNode(['finalize', '--session-file', sessionFile]);
  assert(finSecond.status === 0, 'second finalize exits 0');
  const logTextAfterSecondFin = fs.readFileSync(currentSession.logPath, 'utf-8');
  assert(logTextBeforeSecondFin === logTextAfterSecondFin, 'finalize is idempotent (log text identical)');

  const logText = logTextAfterSecondFin;
  assert(logText.includes('recovered:** true'), 'log contains recovered flag');
  assert(
    logText.includes('## Improvement Opportunities & Reusable Tooling'),
    'log has improvement opportunities section',
  );
  assert(
    logText.includes('disposable-script'),
    'log contains disposable-script category entry',
  );
  assert(
    logText.includes('disposable scripts detected:** 1'),
    'log summary contains disposable scripts detected total',
  );
  assert(logText.includes('## Summary'), 'log has summary section');

  const portableUsDir = fs.mkdtempSync(path.join(REPO_ROOT, '.tmp-audit-portable-'));
  tmpRoots.push(portableUsDir);
  const portableInit = runNode([
    'init',
    '--us-dir',
    portableUsDir,
    '--slug',
    'portable-slug',
  ]);
  assert(portableInit.status === 0, 'portable init exits 0');
  const portableSessionFile = path.join(portableUsDir, '.audit-session-portable-slug.json');
  const portableDisk = JSON.parse(fs.readFileSync(portableSessionFile, 'utf-8'));
  assert(!path.isAbsolute(portableDisk.usDir), 'persisted usDir is repo-relative');
  assert(!path.isAbsolute(portableDisk.logPath), 'persisted logPath is repo-relative');
  assert(!/^[A-Za-z]:/.test(portableDisk.usDir), 'persisted usDir has no drive letter');
  assert(!portableDisk.usDir.includes('\\'), 'persisted usDir uses posix separators');
  assert(!portableDisk.logPath.includes('\\'), 'persisted logPath uses posix separators');
  const portableReloaded = runNode(['has-errors', '--session-file', portableSessionFile]);
  assert(portableReloaded.status === 0, 'reload relative session file exits 0');

  const tokenUsDir = '.tmp-audit-rel-us';
  const tokenAbs = path.join(REPO_ROOT, tokenUsDir);
  tmpRoots.push(tokenAbs);
  const fromNestedCwd = fs.mkdtempSync(path.join(REPO_ROOT, '.tmp-audit-from-cwd-'));
  tmpRoots.push(fromNestedCwd);
  const relTokenInit = runNode(
    ['init', '--us-dir', tokenUsDir, '--slug', 'rel-token-slug'],
    fromNestedCwd,
  );
  assert(relTokenInit.status === 0, 'init with repo-relative us-dir from nested cwd exits 0');
  const tokenSessionFile = path.join(tokenAbs, '.audit-session-rel-token-slug.json');
  assert(fs.existsSync(tokenSessionFile), 'session created under repo-root token path');
  assert(
    !fs.existsSync(path.join(fromNestedCwd, tokenUsDir, '.audit-session-rel-token-slug.json')),
    'session is not created under the nested cwd',
  );
  const tokenDisk = JSON.parse(fs.readFileSync(tokenSessionFile, 'utf-8'));
  assert(tokenDisk.usDir === tokenUsDir, 'persisted usDir keeps the repo-relative token');
  const tokenReloaded = runNode(['has-errors', '--session-file', tokenSessionFile], REPO_ROOT);
  assert(tokenReloaded.status === 0, 'reload token session from repo root exits 0');

  const resolveFromNested = runNode(['resolve'], fromNestedCwd);
  assert(resolveFromNested.status === 0, 'resolve from nested cwd exits 0');
  const nestedResolve = JSON.parse(resolveFromNested.stdout.trim());
  assert(
    nestedResolve.enableAuditing === true,
    'resolve without --config from nested cwd reads repo-root config',
  );

  cleanup();
  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll ws-audit smoke tests passed.');
}

main();


