/**
 * AC1/AC8 smoke for infer_human_timing.py
 * Run: node test/test-infer-human-timing.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(
  REPO_ROOT,
  '.agents/skills/ws-activity-report/scripts/infer_human_timing.py',
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

function runPython(args, cwd = REPO_ROOT) {
  return cp.spawnSync('python', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
}

function testScriptExists() {
  console.log('\n--- testScriptExists ---');
  assert(fs.existsSync(SCRIPT), 'infer_human_timing.py exists');
  const check = runPython(['-m', 'py_compile', SCRIPT]);
  assert(check.status === 0, 'infer_human_timing.py compiles');
}

function testHumanGteAgentRunning() {
  console.log('\n--- testHumanGteAgentRunning ---');
  const usDir = mkTmp('ws-ar-timing-');
  const runtimeDir = path.join(usDir, '.runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });

  const start = '2026-08-12T10:00:00Z';
  const end = '2026-08-12T11:00:00Z';

  fs.writeFileSync(
    path.join(usDir, 'fixture.state.md'),
    `---\nstartedAt: "${start}"\nupdatedAt: "2026-08-12T10:20:00Z"\n---\n`,
    'utf8',
  );

  const transcript = path.join(runtimeDir, 'transcript.jsonl');
  const lines = [
    { type: 'USER_INPUT', timestamp: '2026-08-12T10:05:00Z' },
    { type: 'agent_tool', timestamp: '2026-08-12T10:06:00Z' },
    { type: 'agent_tool', timestamp: '2026-08-12T10:25:00Z' },
    { type: 'USER_INPUT', timestamp: '2026-08-12T10:40:00Z' },
    { type: 'agent_tool', timestamp: '2026-08-12T10:41:00Z' },
  ];
  fs.writeFileSync(
    transcript,
    lines.map((o) => JSON.stringify(o)).join('\n') + '\n',
    'utf8',
  );

  const res = runPython([
    SCRIPT,
    usDir,
    '--start-iso',
    start,
    '--end-iso',
    end,
  ]);
  assert(res.status === 0, `script exit 0 (stderr: ${res.stderr?.trim()})`);

  let payload;
  try {
    payload = JSON.parse(res.stdout.trim());
  } catch {
    fail(`invalid JSON: ${res.stdout}`);
    return;
  }

  assert(payload.ok === true, 'ok true');
  assert(
    typeof payload.humanSeconds === 'number',
    'humanSeconds present',
  );
  assert(
    typeof payload.agentRunningSeconds === 'number',
    'agentRunningSeconds present',
  );
  assert(
    payload.agentWaitSeconds === undefined,
    'agentWaitSeconds not emitted',
  );

  if (payload.agentRunningSeconds > 0) {
    assert(
      payload.humanSeconds >= payload.agentRunningSeconds,
      `humanSeconds (${payload.humanSeconds}) >= agentRunningSeconds (${payload.agentRunningSeconds})`,
    );
  }
}

function main() {
  testScriptExists();
  testHumanGteAgentRunning();
  cleanup();
  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll infer_human_timing tests passed.');
}

main();
