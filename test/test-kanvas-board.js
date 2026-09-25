/**
 * ws-kanvas board contract: six columns, card shape, server behavior.
 * Run: node test/test-kanvas-board.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import cp from 'child_process';
import nodeAssert from 'node:assert';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
assert.deepStrictEqual = nodeAssert.deepStrictEqual;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const collectPath = path.join(repoRoot, '.agents/skills/ws-kanvas/scripts/collect.cjs');
const serverPath = path.join(repoRoot, '.agents/skills/ws-kanvas/scripts/server.cjs');
const { collectBoard, getCard, isValidSlug } = require(collectPath);
const { createServer, resolveRoots, LOOPBACK, start } = require(serverPath);

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

// Import must be side-effect free (no listen on require).
const probe = cp.spawnSync(process.execPath, ['-e', `require(${JSON.stringify(collectPath)});require(${JSON.stringify(serverPath)});process.stdout.write('import-ok');`], { encoding: 'utf8' });
assert(probe.status === 0 && probe.stdout.trim() === 'import-ok', 'skill scripts import with no side effects');

// --- Fixture tree: one spec per column rule ---
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kanvas-'));
const specsDir = path.join(root, 'specs');
const plansDir = path.join(root, 'plans');
const indexPath = path.join(specsDir, 'index.PRD');

function spec(slug, title, acCount) {
  const acs = Array.from({ length: acCount }, (_, i) => `- AC${i + 1}: behavior ${i + 1}`).join('\n');
  write(path.join(specsDir, `${slug}.spec.md`), `---\nslug: ${slug}\ntitle: "${title}"\n---\n\n## Acceptance Criteria\n\n${acs}\n`);
}
spec('backlog-only', 'Backlog only', 2);
spec('sprint-card', 'Sprint card', 1);
spec('dev-card', 'Dev card', 3);
spec('staging-card', 'Staging card', 1);
spec('prod-card', 'Prod card', 2);
spec('legacy-ship', 'Legacy ship', 1);
spec('ghost-ship', 'Ghost ship', 1);
spec('old-faithful', 'Old faithful', 1);
spec('alt-order', 'Alt order', 1);
spec('nested-child', 'Nested child', 1);
spec('dusty-arch', 'Dusty arch', 1);
spec('orphan-child', 'Orphan child', 1);
spec('dead-card', 'Dead card', 1);
write(path.join(specsDir, 'BAD_SLUG.spec.md'), '---\nslug: BAD_SLUG\ntitle: Bad\n---\n');
spec('bom-card', 'Bom card', 1);
{
  const bomFile = path.join(specsDir, 'bom-card.spec.md');
  fs.writeFileSync(bomFile, '\uFEFF' + fs.readFileSync(bomFile, 'utf8'), 'utf8');
}
write(indexPath, `# Fixture index

## 8. Next specs

- [ ] Sprint card (\`spec: sprint-card.spec.md\`)


| 2 | \`dev-card\` | \`[ ]\` todo | Phase 2 | Dev card |
| 3 | \`staging-card\` | \`[ ]\` todo | Phase 2 | Staging card |
| 4 | \`prod-card\` | \`[x]\` done | Phase 3 | Prod card |
| 5 | \`legacy-ship\` | \`[x]\` done | Phase 1 | Legacy ship |
| 6 | \`ghost-ship\` | \`[x]\` done | Phase 1 | Ghost ship |
| 7 | \`[x]\` done | \`alt-order\` | Phase 2 | Alt order |

- [ ] Nested feature
  - **spec:** \`nested-child.spec.md\`

- [x] Stale parent
| 8 | \`table-filler\` | \`[ ]\` todo | Phase 9 | Filler |
  - **spec:** \`orphan-child.spec.md\`

## 10. Done log

| Date | Slug | Title | PR / Commit |
|------|------|-------|-------------|
| 2026-09-25 | \`prod-card\` | Prod card | https://example.com/pr/1
| 2026-09-24 | \`legacy-ship\` | Legacy ship | Implemented
| 2026-09-24 | \`alt-order\` | Alt order | https://example.com/pr/9

## Archive

| Slug | Outcome | Last state | PR / Commit | Summary |
|------|---------|------------|-------------|---------|
| \`old-faithful\` | failed | active | none | Old |
| \`dusty-arch\` | dropped | active | none | Dusty |
`);
fs.mkdirSync(path.join(plansDir, 'sprint-card'), { recursive: true });
write(path.join(plansDir, 'dev-card', 'dev-card.state.md'), '---\nstatus: active\ncurrentStep: 4\n---\n# state\n');
write(path.join(plansDir, 'staging-card', 'step-08-staging-card.result.md'), '# result\nshipped\n');
write(path.join(plansDir, 'dead-card', 'dead-card.state.md'), '---\nstatus: cancelled\n---\n# state\n');
write(path.join(plansDir, 'ghost-ship', 'step-08-ghost-ship.result.md'), '# result\nshipped\n');

const board = collectBoard({ specsDir, plansDir, indexPath });
assert(Array.isArray(board.cards) && board.cards.length === 14, `fourteen fixture cards (got ${board.cards.length})`);
const bySlug = Object.fromEntries(board.cards.map((c) => [c.slug, c]));
assert(!bySlug['BAD_SLUG'], 'malformed slug file is skipped');
assert(bySlug['backlog-only'].column === 'backlog', 'AC2: plan-less untracked spec lands in Backlog');
assert(bySlug['sprint-card'].column === 'sprint', 'tracked todo + run dir lands in Sprint');
assert(bySlug['dev-card'].column === 'development', 'active state lands in Development');
assert(bySlug['staging-card'].column === 'staging', 'step-08 without done mark lands in Staging');
assert(bySlug['prod-card'].column === 'production', 'done mark + Done-log entry lands in Production');
assert(bySlug['legacy-ship'].column === 'production', 'E1: done mark + legacy Implemented row stays in Production');
assert(bySlug['ghost-ship'].column === 'backlog', 'E1: done mark without any Done-log row is not Production, even with a step-08 record (staging guard)');
assert(bySlug['dusty-arch'].column === 'abandoned', 'Archive dropped alias lands in Abandoned');
assert(bySlug['orphan-child'].indexStatus === 'untracked', 'stale parent checkbox does not leak across a table boundary');
assert(bySlug['old-faithful'].column === 'abandoned', 'Archive dropped row lands in Abandoned without a plan dir');
assert(bySlug['alt-order'].column === 'production', 'live status-first dialect lands in Production');
assert(bySlug['nested-child'].column === 'backlog', 'nested feature-map form tracks as todo');
assert(bySlug['nested-child'].indexStatus === 'todo', 'nested feature-map inherits the parent checkbox');
assert(bySlug['dead-card'].column === 'abandoned', 'cancelled state lands in Abandoned');
assert(bySlug['dev-card'].planStep === 4 && bySlug['dev-card'].planStatus === 'active', 'plan step/status surface on card');
assert(bySlug['prod-card'].evidence === 'https://example.com/pr/1', 'Done-log PR URL surfaces as evidence');
assert(bySlug['prod-card'].acCount === 2 && bySlug['prod-card'].phase === 'Phase 3', 'AC count and phase surface on card');
assert(bySlug['prod-card'].indexStatus === 'done' && bySlug['sprint-card'].indexStatus === 'todo', 'index status values');
assert(bySlug['backlog-only'].indexStatus === 'untracked', 'unindexed spec is untracked');
assert(bySlug['backlog-only'].links.plan === null, 'plan-less card has null plan link');
assert(bySlug['dev-card'].links.spec.endsWith('.spec.md'), 'spec link points at the spec file');
assert.deepStrictEqual(
  board.columns.map((c) => [c.id, c.count]),
  [['backlog', 5], ['sprint', 1], ['development', 1], ['staging', 1], ['production', 3], ['abandoned', 3]],
  'all six columns with per-column counts',
);

// AC7 snapshot: stable shape minus volatile fields.
assert(/^\d{4}-\d{2}-\d{2}T/.test(board.generatedAt), 'generatedAt is an ISO timestamp');
const snapshot = board.cards.map(({ links, ...rest }) => rest);
assert.deepStrictEqual(snapshot, [
  { slug: 'alt-order', title: 'Alt order', column: 'production', indexStatus: 'done', phase: 'Phase 2', acCount: 1, planStep: null, planStatus: null, evidence: 'https://example.com/pr/9' },
  { slug: 'backlog-only', title: 'Backlog only', column: 'backlog', indexStatus: 'untracked', phase: null, acCount: 2, planStep: null, planStatus: null, evidence: null },
  { slug: 'bom-card', title: 'Bom card', column: 'backlog', indexStatus: 'untracked', phase: null, acCount: 1, planStep: null, planStatus: null, evidence: null },
  { slug: 'dead-card', title: 'Dead card', column: 'abandoned', indexStatus: 'untracked', phase: null, acCount: 1, planStep: null, planStatus: 'cancelled', evidence: null },
  { slug: 'dev-card', title: 'Dev card', column: 'development', indexStatus: 'todo', phase: 'Phase 2', acCount: 3, planStep: 4, planStatus: 'active', evidence: null },
  { slug: 'dusty-arch', title: 'Dusty arch', column: 'abandoned', indexStatus: 'untracked', phase: null, acCount: 1, planStep: null, planStatus: null, evidence: null },
  { slug: 'ghost-ship', title: 'Ghost ship', column: 'backlog', indexStatus: 'done', phase: 'Phase 1', acCount: 1, planStep: null, planStatus: null, evidence: null },
  { slug: 'legacy-ship', title: 'Legacy ship', column: 'production', indexStatus: 'done', phase: 'Phase 1', acCount: 1, planStep: null, planStatus: null, evidence: null },
  { slug: 'nested-child', title: 'Nested child', column: 'backlog', indexStatus: 'todo', phase: null, acCount: 1, planStep: null, planStatus: null, evidence: null },
  { slug: 'old-faithful', title: 'Old faithful', column: 'abandoned', indexStatus: 'untracked', phase: null, acCount: 1, planStep: null, planStatus: null, evidence: null },
  { slug: 'orphan-child', title: 'Orphan child', column: 'backlog', indexStatus: 'untracked', phase: null, acCount: 1, planStep: null, planStatus: null, evidence: null },
  { slug: 'prod-card', title: 'Prod card', column: 'production', indexStatus: 'done', phase: 'Phase 3', acCount: 2, planStep: null, planStatus: null, evidence: 'https://example.com/pr/1' },
  { slug: 'sprint-card', title: 'Sprint card', column: 'sprint', indexStatus: 'todo', phase: null, acCount: 1, planStep: null, planStatus: null, evidence: null },
  { slug: 'staging-card', title: 'Staging card', column: 'staging', indexStatus: 'todo', phase: 'Phase 2', acCount: 1, planStep: null, planStatus: null, evidence: null },
], 'AC7 card snapshot');

// Typed lookups: unknown and traversal slugs never leak paths or stacks.
assert(getCard(board, 'no-such-spec').error.code === 'not-found', 'unknown slug is typed not-found');
assert(getCard(board, '../../package').error.code === 'not-found', 'traversal slug is typed not-found');
assert(!isValidSlug('../../package') && isValidSlug('prod-card'), 'slug validator accepts only safe slugs');
assert(JSON.stringify(getCard(board, 'nope')).indexOf(root) === -1, 'not-found payload leaks no filesystem path');

// AC8: missing inputs yield an empty board with named warnings, never a crash.
const empty = collectBoard({ specsDir: path.join(root, 'no-specs'), plansDir: path.join(root, 'no-plans'), indexPath: path.join(root, 'no-index.PRD') });
assert(empty.cards.length === 0, 'missing inputs yield an empty board');
assert(empty.warnings.some((w) => w.code === 'specs-dir-missing'), 'missing specs dir warns by name');
assert(empty.warnings.some((w) => w.code === 'plans-dir-missing'), 'missing plans dir warns by name');
assert(empty.warnings.some((w) => w.code === 'index-missing'), 'missing index warns by name');

// AC6: zero new runtime dependencies for this feature.
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
assert(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0, 'no new package.json runtime dependencies');

// AC9: dependency-graph registration + integrity gate.
const graph = JSON.parse(fs.readFileSync(path.join(repoRoot, 'bin/skill-dependencies.json'), 'utf8'));
assert(Array.isArray(graph.dependencies['ws-kanvas']), 'ws-kanvas is registered in skill-dependencies.json');
assert(graph.packages.workflows.skills.includes('ws-kanvas'), 'ws-kanvas ships in the workflows package');
const integrity = cp.spawnSync(process.execPath, ['bin/generate-skill-integrity.js', '--check'], { cwd: repoRoot, encoding: 'utf8' });
assert(integrity.status === 0, `verify-integrity passes with the new skill (${(integrity.stderr || '').trim()})`);

// AC10: the packed tarball contains the skill tree (allowlist check).
const pack = cp.spawnSync('npm', ['pack', '--dry-run'], { cwd: repoRoot, encoding: 'utf8', shell: true });
const packList = (pack.stdout || '') + (pack.stderr || '');
for (const f of ['.agents/skills/ws-kanvas/SKILL.md', '.agents/skills/ws-kanvas/scripts/collect.cjs', '.agents/skills/ws-kanvas/scripts/server.cjs', '.agents/skills/ws-kanvas/refs/board.html']) {
  assert(packList.includes(f.replace(/\//g, path.sep)) || packList.includes(f), `pack includes ${f}`);
}

// Invalid ports reject through the CLI handler path instead of throwing synchronously.
await nodeAssert.rejects(start({ args: { port: 'abc' } }), /Invalid port/, 'start rejects on a bad port');
{
  const bad = cp.spawnSync(process.execPath, [serverPath, '--port', 'abc'], { encoding: 'utf8' });
  assert(bad.status === 1, 'bad port exits 1');
  assert(/kanvas: Invalid port: abc/.test(bad.stderr), 'bad port prints the single-line diagnostic');
  assert(!/at\s+\S+:\d+/.test(bad.stderr), 'bad port prints no stack trace');
}

// Server behavior over the fixture tree.
function get(port, route, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: LOOPBACK, port, path: route, method }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

const server = createServer(resolveRoots({ specsDir, plansDir, index: indexPath }));
await new Promise((resolve) => server.listen(0, LOOPBACK, resolve));
const port = server.address().port;
try {
  assert(server.address().address === '127.0.0.1', 'AC6: server binds loopback only');
  const page = await get(port, '/');
  assert(page.status === 200 && page.body.includes('Kanvas board') && page.body.includes('api/board'), 'GET / serves the board page');
  const api = await get(port, '/api/board');
  assert(api.status === 200 && JSON.parse(api.body).cards.length === 14, 'GET /api/board returns the fixture board');
  const card = await get(port, '/api/card?slug=prod-card');
  assert(card.status === 200 && JSON.parse(card.body).card.column === 'production', 'AC4: card endpoint returns the popup payload');
  const missing = await get(port, '/api/card?slug=no-such-spec');
  const missingBody = JSON.parse(missing.body);
  assert(missing.status === 404 && missingBody.error.code === 'not-found', 'AC5: unknown slug is typed not-found over HTTP');
  assert(missing.body.indexOf(root) === -1 && !/at\s+\S+:\d+/.test(missing.body), 'AC5: no path leak or stack trace');
  const traversal = await get(port, '/api/card?slug=..%2F..%2Fpackage');
  assert(traversal.status === 400, 'traversal slug is rejected before any fs read');
  const post = await get(port, '/api/board', 'POST');
  assert(post.status === 405, 'non-GET routes get 405 (read-only server)');
  const put = await get(port, '/api/card?slug=prod-card', 'DELETE');
  assert(put.status === 405, 'DELETE gets 405');

  // AC11: consumer custom dirs resolve from the hub config (no hardcoded paths).
  const consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'kanvas-consumer-'));
  const customSpecs = path.join(consumer, 'custom-specs');
  const customPlans = path.join(consumer, 'custom-plans');
  fs.mkdirSync(path.join(consumer, '.ws'), { recursive: true });
  write(path.join(consumer, '.ws', 'config.json'), JSON.stringify({ plans: { specsDir: 'custom-specs', dir: 'custom-plans' } }));
  write(path.join(customSpecs, 'hello-world.spec.md'), '---\nslug: hello-world\ntitle: "Hello"\n---\n\n## Acceptance Criteria\n\n- AC1: hi\n');
  const consumerRoots = resolveRoots({ config: path.join(consumer, '.ws', 'config.json') });
  const consumerBoard = collectBoard({ specsDir: consumerRoots.specsDir, plansDir: consumerRoots.plansDir });
  assert(consumerBoard.cards.length === 1 && consumerBoard.cards[0].slug === 'hello-world', 'AC11: config-resolved custom dirs render the board');
  fs.writeFileSync(path.join(consumer, '.ws', 'config.json'), '\uFEFF' + JSON.stringify({ plans: { specsDir: 'custom-specs', dir: 'custom-plans' } }), 'utf8');
  const bomRoots = resolveRoots({ config: path.join(consumer, '.ws', 'config.json') });
  assert(bomRoots.specsDir === consumerRoots.specsDir, 'AC11: BOM-prefixed hub config still resolves');
  write(path.join(consumer, '.ws', 'config.json'), JSON.stringify({ plans: {} }));
  const defaultRoots = resolveRoots({ config: path.join(consumer, '.ws', 'config.json') });
  assert(defaultRoots.specsDir === path.join(consumer, '.agents', 'specs'), 'AC11: omitted keys fall back to the consumer root, not the cwd');
  assert(defaultRoots.plansDir === path.join(consumer, '.agents', 'plans'), 'AC11: omitted plans dir falls back to the consumer root');
  fs.rmSync(consumer, { recursive: true, force: true });
} finally {
  await new Promise((resolve) => server.close(resolve));
}

fs.rmSync(root, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\ntest-kanvas-board: ${failures} failure(s)`);
  process.exit(1);
}
console.log('test-kanvas-board: ok');
