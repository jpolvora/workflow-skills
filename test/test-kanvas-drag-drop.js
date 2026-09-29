/**
 * ws-kanvas drag-and-drop / POST /api/move contract.
 * Run: node test/test-kanvas-drag-drop.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import cp from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const serverPath = path.join(repoRoot, '.agents/skills/ws-kanvas/scripts/server.cjs');
const movePath = path.join(repoRoot, '.agents/skills/ws-kanvas/scripts/move.cjs');
const { createServer, resolveRoots, LOOPBACK } = require(serverPath);
const { moveCard, treeHash, executeMove } = require(movePath);

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kanvas-move-'));
const specsDir = path.join(root, 'specs');
const plansDir = path.join(root, 'plans');
const indexPath = path.join(specsDir, 'index.PRD');

function spec(slug, title) {
  write(path.join(specsDir, `${slug}.spec.md`), `---\nslug: ${slug}\ntitle: "${title}"\n---\n\n## Acceptance Criteria\n\n- AC1: x\n`);
}

spec('move-backlog', 'Move backlog');
spec('move-sprint', 'Move sprint');
spec('move-dev', 'Move dev');
spec('move-prod', 'Move prod');
spec('move-abandon', 'Move abandon');
spec('move-tracked', 'Move tracked');

write(indexPath, `# index

## 8. Next specs

| 1 | \`move-dev\` | \`[ ]\` todo | Phase 1 | Move dev |
| 2 | \`move-prod\` | \`[ ]\` todo | Phase 1 | Move prod |
| 3 | \`move-tracked\` | \`[ ]\` todo | Phase 1 | Move tracked |

`);
fs.mkdirSync(path.join(plansDir, 'move-dev'), { recursive: true });
write(path.join(plansDir, 'move-dev', 'move-dev.state.md'), '---\nstatus: pending\ncurrentStep: 1\n---\n# state\n');
fs.mkdirSync(path.join(plansDir, 'move-prod'), { recursive: true });
write(path.join(plansDir, 'move-prod', 'step-08-move-prod.result.md'), '# shipped\n');

const roots = { specsDir, plansDir, index: indexPath };

function post(port, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      host: LOOPBACK,
      port,
      path: '/api/move',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'content-length': Buffer.byteLength(data) },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Validation matrix
const badSlug = moveCard(roots, { slug: '../../pkg', toColumn: 'sprint' });
assert(badSlug.status === 400, 'traversal slug rejected before fs');
const unknown = moveCard(roots, { slug: 'no-such', toColumn: 'sprint' });
assert(unknown.status === 404 && unknown.error.code === 'not-found', 'unknown slug is 404');
const badCol = moveCard(roots, { slug: 'move-backlog', toColumn: 'nope' });
assert(badCol.status === 400, 'unknown toColumn is 400');

const beforeSprint = treeHash({ specsDir, plansDir, indexPath });
const sprintRes = moveCard(roots, { slug: 'move-backlog', toColumn: 'sprint' });
assert(sprintRes.status === 200 && sprintRes.writer === 'index-track', 'backlog→sprint tracks index');
const indexAfter = fs.readFileSync(indexPath, 'utf8');
assert(indexAfter.includes('move-backlog'), 'index row added for sprint track');

const hashBeforeStaging = treeHash({ specsDir, plansDir, indexPath });
const stagingRes = moveCard(roots, { slug: 'move-backlog', toColumn: 'staging' });
assert(stagingRes.status === 409 && stagingRes.error.reason === 'staging-not-writable', 'staging is 409');
assert(treeHash({ specsDir, plansDir, indexPath }) === hashBeforeStaging, 'staging leaves tree unchanged');

const devRes = moveCard(roots, { slug: 'move-dev', toColumn: 'development' });
assert(devRes.status === 200 && devRes.card.planStatus === 'active', 'development flips plan status');

const prodNoEvidence = moveCard(roots, { slug: 'move-sprint', toColumn: 'production' });
assert(prodNoEvidence.status === 409, 'production without evidence is 409');

const prodRes = moveCard(roots, { slug: 'move-prod', toColumn: 'production' });
assert(prodRes.status === 200 && prodRes.card.column === 'production', 'production with step-08 syncs index');

const abandonRes = moveCard(roots, { slug: 'move-abandon', toColumn: 'abandoned' });
assert(abandonRes.status === 200 && abandonRes.writer === 'archive-row', 'runless abandoned appends archive');

const trackedAbandon = moveCard(roots, { slug: 'move-tracked', toColumn: 'abandoned' });
const trackedIndex = fs.readFileSync(indexPath, 'utf8');
const archiveBody = (trackedIndex.split(/^##\s+.*archiv/im)[1] || '').split(/^##\s+/m)[0];
assert(trackedAbandon.status === 200 && trackedAbandon.writer === 'archive-row', 'tracked runless abandoned still writes');
assert(archiveBody.includes('move-tracked'), 'archive row added when slug already exists in the feature table');

const noop = moveCard(roots, { slug: 'move-prod', toColumn: 'production' });
assert(noop.status === 200 && noop.writer === 'no-op', 'same-column is idempotent no-op');

const server = createServer(resolveRoots({ specsDir, plansDir, index: indexPath }));
await new Promise((resolve) => server.listen(0, LOOPBACK, resolve));
const port = server.address().port;
try {
  const postBad = await post(port, { slug: '../../pkg', toColumn: 'sprint' });
  assert(postBad.status === 400, 'HTTP malformed slug 400');
  const postStaging = await post(port, { slug: 'move-sprint', toColumn: 'staging' });
  assert(postStaging.status === 409, 'HTTP staging 409');
  const post405 = await new Promise((resolve, reject) => {
    const req = http.request({ host: LOOPBACK, port, path: '/api/board', method: 'POST' }, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
  assert(post405 === 405, 'POST elsewhere is 405');
  const errBody = JSON.stringify(postStaging.body);
  assert(errBody.indexOf(root) === -1 && !/at\s+\S+:\d+/.test(errBody), 'error body has no path leak');
} finally {
  await new Promise((resolve) => server.close(resolve));
}

fs.rmSync(root, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\ntest-kanvas-drag-drop: ${failures} failure(s)`);
  process.exit(1);
}
console.log('test-kanvas-drag-drop: ok');
