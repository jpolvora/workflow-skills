/**
 * Fixture coverage for ws-multi-spec list_pending_specs.cjs.
 * Run: node test/test-list-pending-specs.js
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SCRIPT = path.join(
  REPO,
  '.agents/skills/ws-multi-spec/scripts/list_pending_specs.cjs',
);

function run(args, cwd = REPO) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    cwd,
  });
}

const help = run(['--help']);
assert.strictEqual(help.status, 0, '--help exits 0');
assert.match(help.stderr, /--specs-dir/, '--help prints usage');

const unknown = run(['--specs-dir', 'x', '--nope']);
assert.strictEqual(unknown.status, 2, 'unknown flag exits 2');
assert.match(unknown.stderr, /unknown argument/, 'unknown flag message');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-pending-'));
const specs = path.join(tmp, 'specs');
const plans = path.join(tmp, 'plans');
fs.mkdirSync(path.join(specs, 'nested'), { recursive: true });
fs.mkdirSync(path.join(plans, 'shipped-one'), { recursive: true });

fs.writeFileSync(
  path.join(specs, 'index.PRD'),
  `# Spec Index

## 7. Feature map by phase

### Phase 4: Delivery
- [x] Shipped feature (\`spec: shipped-one.spec.md\`)
- [~] Partial feature (\`spec: partial-one.spec.md\`)
- [ ] Todo feature (\`spec: todo-one.spec.md\`)

## 8. Next specs

| # | Spec | Status | Target Phase | Notes |
|---|------|--------|--------------|-------|
| 1 | \`shipped-one\` | \`[x]\` done | Phase 4 | Seed |
| 2 | \`partial-one\` | \`[~]\` partial | Phase 4 | Open |
| 3 | \`todo-one\` | \`[ ]\` todo | Phase 4 | Open |

Open Next-spec: \`todo-one\`, \`partial-one\`.

## 9. Inbox

- Idea

## 10. Done log

| Date | Slug | Title | PR / Commit |
|------|------|-------|-------------|
| 2026-08-22 | \`shipped-one\` | Shipped feature | Implemented |
`,
  'utf8',
);

function writeSpec(dir, slug, extraFm = '', fileBase = slug) {
  fs.writeFileSync(
    path.join(dir, `${fileBase}.spec.md`),
    `---
slug: ${slug}
title: ${slug}
${extraFm}---

# ${slug}
`,
    'utf8',
  );
}

writeSpec(specs, 'shipped-one');
writeSpec(specs, 'partial-one');
writeSpec(specs, 'todo-one');
writeSpec(specs, 'untracked-one');
fs.writeFileSync(
  path.join(specs, 'nested', 'step-00-nested.spec.md'),
  `---
slug: nested
---

# nested copy
`,
  'utf8',
);

const listed = run([
  '--specs-dir',
  specs,
  '--plans-dir',
  plans,
  '--repo-root',
  tmp,
]);
assert.strictEqual(listed.status, 0, 'list exits 0');
const json = JSON.parse(listed.stdout);
assert.deepStrictEqual(
  json.pending.map((r) => r.slug).sort(),
  ['partial-one', 'todo-one', 'untracked-one'],
  'pending is unfinished only',
);
assert.ok(
  json.omitted.some((r) => r.slug === 'shipped-one' && r.reason === 'index-done'),
  'index [x] omitted',
);
assert.ok(
  json.omitted.some((r) => r.reason === 'step-00-copy'),
  'step-00 copy omitted',
);
assert.strictEqual(
  json.pending.find((r) => r.slug === 'untracked-one').status,
  'untracked',
  'untracked status',
);
assert.strictEqual(
  json.pending.find((r) => r.slug === 'partial-one').status,
  'partial',
  'partial status',
);

const noIndexDir = path.join(tmp, 'bare-specs');
fs.mkdirSync(noIndexDir);
writeSpec(noIndexDir, 'only-spec');
fs.writeFileSync(
  path.join(noIndexDir, 'step-00-only-spec.spec.md'),
  '---\nslug: only-spec\n---\n',
  'utf8',
);
const noIndex = run(['--specs-dir', noIndexDir, '--repo-root', tmp]);
assert.strictEqual(noIndex.status, 0, 'missing index exits 0');
const noIndexJson = JSON.parse(noIndex.stdout);
assert.deepStrictEqual(
  noIndexJson.pending.map((r) => r.slug),
  ['only-spec'],
  'missing index keeps spec of record',
);
assert.ok(
  noIndexJson.omitted.some((r) => r.reason === 'step-00-copy'),
  'missing index still drops step-00',
);

const mergedOnly = path.join(tmp, 'merged-specs');
const mergedPlans = path.join(tmp, 'merged-plans');
fs.mkdirSync(mergedOnly);
fs.mkdirSync(path.join(mergedPlans, 'done-local'), { recursive: true });
writeSpec(mergedOnly, 'done-local');
fs.writeFileSync(
  path.join(mergedPlans, 'done-local', 'step-08-done-local.result.md'),
  'Delivery cites a merged PR #12\n',
  'utf8',
);
const merged = run([
  '--specs-dir',
  mergedOnly,
  '--plans-dir',
  mergedPlans,
  '--repo-root',
  tmp,
]);
const mergedJson = JSON.parse(merged.stdout);
assert.strictEqual(mergedJson.pending.length, 0, 'merged result omits pending');
assert.ok(
  mergedJson.omitted.some(
    (r) => r.slug === 'done-local' && r.reason === 'already-implemented',
  ),
  'local merged result reason',
);

const prCiteOnly = path.join(tmp, 'pr-cite-specs');
const prCitePlans = path.join(tmp, 'pr-cite-plans');
fs.mkdirSync(prCiteOnly);
fs.mkdirSync(path.join(prCitePlans, 'done-pr'), { recursive: true });
writeSpec(prCiteOnly, 'done-pr');
fs.writeFileSync(
  path.join(prCitePlans, 'done-pr', 'step-08-done-pr.result.md'),
  '**Ship evidence:** PR #238 https://example.test/pull/238\n',
  'utf8',
);
const prCite = run([
  '--specs-dir',
  prCiteOnly,
  '--plans-dir',
  prCitePlans,
  '--repo-root',
  tmp,
]);
const prCiteJson = JSON.parse(prCite.stdout);
assert.strictEqual(prCiteJson.pending.length, 1, 'open PR # in step-08 stays pending');
assert.ok(
  prCiteJson.pending.some((r) => r.slug === 'done-pr'),
  'unmerged PR cite is not already-implemented',
);

const completedOnly = path.join(tmp, 'completed-specs');
const completedPlans = path.join(tmp, 'completed-plans');
fs.mkdirSync(completedOnly);
fs.mkdirSync(path.join(completedPlans, 'done-complete'), { recursive: true });
writeSpec(completedOnly, 'done-complete');
fs.writeFileSync(
  path.join(completedPlans, 'done-complete', 'step-08-done-complete.result.md'),
  '---\nstatus: completed\n---\nDelivery finished.\n',
  'utf8',
);
const completed = run([
  '--specs-dir',
  completedOnly,
  '--plans-dir',
  completedPlans,
  '--repo-root',
  tmp,
]);
const completedJson = JSON.parse(completed.stdout);
assert.strictEqual(completedJson.pending.length, 1, 'status completed alone stays pending');
assert.ok(
  completedJson.pending.some((r) => r.slug === 'done-complete'),
  'implementation closed without merge is not already-implemented',
);
assert.ok(
  !completedJson.omitted.some(
    (r) => r.slug === 'done-complete' && r.reason === 'already-implemented',
  ),
  'status completed in step-08 does not omit spec',
);

const blockedDir = path.join(tmp, 'blocked-specs');
const blockedPlans = path.join(tmp, 'blocked-plans');
fs.mkdirSync(blockedDir);
fs.mkdirSync(path.join(blockedPlans, 'blocked-one'), { recursive: true });
writeSpec(blockedDir, 'blocked-one');
fs.writeFileSync(
  path.join(blockedPlans, 'blocked-one', 'step-08-blocked-one.result.md'),
  'Ship blocked: not merged PR yet\nstatus: completed pending review\n',
  'utf8',
);
const blocked = run([
  '--specs-dir',
  blockedDir,
  '--plans-dir',
  blockedPlans,
  '--repo-root',
  tmp,
]);
const blockedJson = JSON.parse(blocked.stdout);
assert.strictEqual(blockedJson.pending.length, 1, 'negated merge prose stays pending');
assert.ok(
  blockedJson.pending.some((r) => r.slug === 'blocked-one'),
  'not merged PR / status completed pending review is not already-implemented',
);

const splitDir = path.join(tmp, 'split-specs');
fs.mkdirSync(splitDir);
fs.writeFileSync(
  path.join(splitDir, 'index.PRD'),
  '- [x] Closed feature (`spec: my-feature.spec.md`)\n',
  'utf8',
);
writeSpec(splitDir, 'other-slug', '', 'my-feature');
const split = run(['--specs-dir', splitDir, '--repo-root', tmp]);
const splitJson = JSON.parse(split.stdout);
assert.strictEqual(splitJson.pending.length, 0, 'filename slug vs frontmatter still index-done');
assert.ok(
  splitJson.omitted.some(
    (r) => r.slug === 'other-slug' && r.reason === 'index-done',
  ),
  'index lookup uses file slug when frontmatter diverges',
);

console.log('test-list-pending-specs: ok');
