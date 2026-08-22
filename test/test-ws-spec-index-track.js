/**
 * Fixture coverage for ws-spec-index track_index.cjs (index.PRD mutations).
 * Run: node test/test-ws-spec-index-track.js
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO, '.agents/skills/ws-spec-index/scripts/track_index.cjs');

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    cwd: REPO,
  });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-track-'));
const specs = path.join(tmp, 'specs');
fs.mkdirSync(specs);

fs.writeFileSync(
  path.join(specs, 'index.PRD'),
  `# Spec Index

## 7. Feature map by phase

### Phase 4: Delivery
- [x] Existing feature (\`spec: existing.spec.md\`)

## 8. Next specs

| # | Spec | Status | Target Phase | Notes |
|---|------|--------|--------------|-------|
| 1 | \`existing\` | \`[x]\` done | Phase 4 | Seed row |

Open Next-spec: \`existing\`. Other new work goes to Inbox, then promote.

## 9. Inbox

- Idea

## 10. Done log

| Date | Slug | Title | PR / Commit |
|------|------|-------|-------------|
`,
  'utf8',
);

fs.writeFileSync(
  path.join(specs, 'lease-demo.spec.md'),
  `---
title: Lease demo
source: local
---

# Lease demo
`,
  'utf8',
);

const missingIdx = run(['--specs-dir', path.join(tmp, 'nope'), '--slug', 'lease-demo']);
assert.strictEqual(missingIdx.status, 0, 'missing index exits 0');
assert.strictEqual(JSON.parse(missingIdx.stdout).reason, 'index.PRD missing');

const tracked = run(['--specs-dir', specs, '--slug', 'lease-demo']);
assert.strictEqual(tracked.status, 0, 'track exits 0');
const trackedJson = JSON.parse(tracked.stdout);
assert.strictEqual(trackedJson.status, 'tracked', 'status tracked');
const after = fs.readFileSync(path.join(specs, 'index.PRD'), 'utf8');
assert.match(after, /- \[ \] Lease demo \(`spec: lease-demo\.spec\.md`\)/, 'feature map bullet');
assert.match(after, /\|\s*2\s*\|\s*`lease-demo`\s*\|/, 'next-specs row numbered');
assert.match(after, /Open Next-spec:.*`lease-demo`/, 'open next-spec lists slug');

const again = run(['--specs-dir', specs, '--slug', 'lease-demo']);
assert.strictEqual(JSON.parse(again.stdout).reason, 'already tracked');

console.log('All ws-spec-index track tests passed');
