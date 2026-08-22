/**
 * Session lease tests (AC5–AC10, AC14–AC16, AC19).
 * Run: node test/test-session-lease.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/session_lease.cjs');
const SCHEMA = path.join(REPO, '.agents/skills/ws-shared/session-lease.schema.json');
const SHARED = path.join(REPO, '.agents/skills/ws-shared');

let failures = 0;
const tmpRoots = [];

function ok(msg) {
  console.log(`OK ${msg}`);
}
function fail(msg) {
  console.error(`FAIL ${msg}`);
  failures += 1;
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

function run(args) {
  return cp.spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO,
    encoding: 'utf8',
  });
}

function writeConfig(dir, defaults) {
  const file = path.join(dir, 'config.json');
  fs.writeFileSync(
    file,
    JSON.stringify(
      { defaults: defaults || {}, plans: { dir: path.join(dir, 'plans').replace(/\\/g, '/') } },
      null,
      2,
    ),
  );
  return file;
}

function main() {
  assert(fs.existsSync(SCRIPT), 'session_lease.cjs exists');
  assert(fs.existsSync(SCHEMA), 'session-lease.schema.json exists');

  const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8'));
  for (const key of [
    'leaseId',
    'slug',
    'workflowId',
    'status',
    'heartbeatAt',
    'expiresAt',
    'pid',
    'worktreePath',
  ]) {
    assert(schema.required.includes(key), `schema requires ${key}`);
  }
  assert(
    JSON.stringify(schema.properties.status.enum) ===
      JSON.stringify(['active', 'paused', 'completed', 'cancelled', 'failed', 'stale']),
    'schema status enum',
  );

  assert(
    fs.readFileSync(path.join(SHARED, 'config.json.example'), 'utf8').includes('"sessionLeases"'),
    'config example has sessionLeases',
  );
  assert(
    fs.readFileSync(path.join(SHARED, 'config.schema.json'), 'utf8').includes('"sessionLeases"'),
    'config schema has sessionLeases',
  );

  const omitted = mkTmp('lease-omit-');
  const omitCfg = writeConfig(omitted, {});
  const resolveOmit = run(['resolve', '--config', omitCfg]);
  assert(resolveOmit.status === 0, 'resolve omitted exits 0');
  assert(
    JSON.parse(resolveOmit.stdout).sessionLeases === true,
    'omitted config defaults sessionLeases on',
  );

  const off = mkTmp('lease-off-');
  const offCfg = writeConfig(off, { sessionLeases: false });
  assert(
    JSON.parse(run(['resolve', '--config', offCfg]).stdout).sessionLeases === false,
    'explicit false disables',
  );

  const root = mkTmp('lease-acq-');
  const plans = path.join(root, 'plans');
  fs.mkdirSync(plans, { recursive: true });
  const cfg = writeConfig(root, {});

  const a1 = run([
    'acquire',
    '--slug',
    'demo',
    '--plans-dir',
    plans,
    '--config',
    cfg,
    '--worktree',
    root,
  ]);
  assert(a1.status === 0, 'first acquire exits 0');
  const first = JSON.parse(a1.stdout);
  assert(first.ok && first.created, 'first acquire created');
  assert(first.lease.status === 'active', 'lease status active');
  assert(
    fs.existsSync(path.join(plans, '.runtime', 'leases', `${first.lease.leaseId}.json`)),
    'lease file under .runtime/leases',
  );
  assert(
    fs.existsSync(path.join(plans, '.runtime', 'leases', 'slug-demo.lock')),
    'slug lock file exists',
  );

  const a2 = run([
    'acquire',
    '--slug',
    'demo',
    '--plans-dir',
    plans,
    '--config',
    cfg,
    '--worktree',
    root,
  ]);
  assert(a2.status === 1, 'second acquire same slug exits non-zero');
  assert(JSON.parse(a2.stdout).conflict === 'same-slug', 'conflict=same-slug');

  const a3 = run([
    'acquire',
    '--slug',
    'demo',
    '--lease-id',
    first.lease.leaseId,
    '--plans-dir',
    plans,
    '--config',
    cfg,
    '--worktree',
    root,
  ]);
  assert(a3.status === 0, 're-acquire same leaseId refreshes');
  const refreshed = JSON.parse(a3.stdout);
  assert(refreshed.refreshed === true, 'refreshed flag');

  const hb = run([
    'heartbeat',
    '--lease-id',
    first.lease.leaseId,
    '--plans-dir',
    plans,
    '--config',
    cfg,
  ]);
  assert(hb.status === 0, 'heartbeat exits 0');
  const afterHb = JSON.parse(hb.stdout).lease;
  assert(afterHb.heartbeatAt >= refreshed.lease.heartbeatAt, 'heartbeatAt refreshed');
  assert(afterHb.expiresAt >= refreshed.lease.expiresAt, 'expiresAt refreshed');

  const rel = run([
    'release',
    '--lease-id',
    first.lease.leaseId,
    '--status',
    'completed',
    '--plans-dir',
    plans,
    '--config',
    cfg,
  ]);
  assert(rel.status === 0, 'release exits 0');
  const relOut = JSON.parse(rel.stdout);
  assert(relOut.lease.status === 'completed', 'release marks completed');
  assert(relOut.slugLockRemoved === true, 'release removes slug lock');
  assert(
    !fs.existsSync(path.join(plans, '.runtime', 'leases', 'slug-demo.lock')),
    'slug lock gone after release',
  );

  // Re-acquire for prune / git-lock coverage
  const a4 = run([
    'acquire',
    '--slug',
    'demo',
    '--plans-dir',
    plans,
    '--config',
    cfg,
    '--worktree',
    root,
  ]);
  assert(a4.status === 0, 're-acquire after release exits 0');
  const second = JSON.parse(a4.stdout);

  const leasePath = path.join(plans, '.runtime', 'leases', `${second.lease.leaseId}.json`);
  const leaseObj = JSON.parse(fs.readFileSync(leasePath, 'utf8'));
  leaseObj.expiresAt = new Date(Date.now() - 1000).toISOString();
  fs.writeFileSync(leasePath, JSON.stringify(leaseObj, null, 2));
  const pruned = run(['prune', '--plans-dir', plans, '--config', cfg]);
  assert(pruned.status === 0, 'prune exits 0');
  const pruneOut = JSON.parse(pruned.stdout);
  assert(
    pruneOut.pruned.some((p) => p.leaseId === second.lease.leaseId),
    'prune lists lease',
  );
  assert(JSON.parse(fs.readFileSync(leasePath, 'utf8')).status === 'stale', 'expired lease marked stale');
  assert(
    !fs.existsSync(path.join(plans, '.runtime', 'leases', 'slug-demo.lock')),
    'slug lock removed',
  );

  const g1 = run([
    'git-lock',
    '--plans-dir',
    plans,
    '--config',
    cfg,
    '--holder',
    'owner-a',
    '--wait-ms',
    '200',
  ]);
  assert(g1.status === 0, 'git-lock acquire exits 0');
  assert(fs.existsSync(path.join(plans, '.runtime', 'git.lock')), 'git.lock exists');
  const g2 = run([
    'git-lock',
    '--plans-dir',
    plans,
    '--config',
    cfg,
    '--holder',
    'owner-b',
    '--wait-ms',
    '300',
  ]);
  assert(g2.status === 1, 'git-lock wait timeout exits non-zero');
  assert(JSON.parse(g2.stdout).conflict === 'git-lock-timeout', 'git-lock-timeout conflict');
  assert(
    run(['git-unlock', '--plans-dir', plans, '--config', cfg, '--holder', 'owner-a']).status === 0,
    'git-unlock exits 0',
  );

  assert(!fs.existsSync(path.join(REPO, '.ws.pid')), 'no tracked repo-root .ws.pid');
  assert(
    !fs.readFileSync(SCRIPT, 'utf8').includes('index.json'),
    'script does not reference index.json as lock SoT',
  );

  cleanup();
  if (failures) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll session-lease tests passed.');
}

main();
