/**
 * Smoke tests for ws-audit (AC1, AC9, AC10 helpers).
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

  const sessionJson = JSON.stringify(session);
  const append = runNode([
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
  assert(append.status === 0, 'append exits 0');
  const { session: sessionAfterAppend } = JSON.parse(append.stdout);
  const sessionAfterJson = JSON.stringify(sessionAfterAppend);

  const hasErr = runNode(['has-errors', '--session', sessionAfterJson]);
  assert(hasErr.status === 0, 'has-errors exits 0');
  const errState = JSON.parse(hasErr.stdout);
  assert(errState.hasErrors === true, 'has-errors true after error finding');

  const draft = runNode(['draft-issue', '--session', sessionAfterJson]);
  assert(draft.status === 0, 'draft-issue exits 0');
  const draftObj = JSON.parse(draft.stdout);
  assert(draftObj.draft.title.includes('runtime-audit'), 'draft title prefix');
  assert(draftObj.draft.body.includes('missing python launcher'), 'draft body has finding');

  const fin = runNode(['finalize', '--session', sessionAfterJson]);
  assert(fin.status === 0, 'finalize exits 0');
  const logText = fs.readFileSync(sessionAfterAppend.logPath, 'utf-8');
  assert(logText.includes('recovered:** true'), 'log contains recovered flag');
  assert(logText.includes('## Summary'), 'log has summary section');

  cleanup();
  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll ws-audit smoke tests passed.');
}

main();
