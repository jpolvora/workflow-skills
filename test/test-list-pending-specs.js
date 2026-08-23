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

function writeSpec(dir, slug, extraFm = '') {
  fs.writeFileSync(
    path.join(dir, `${slug}.spec.md`),
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

console.log('test-list-pending-specs: ok');
