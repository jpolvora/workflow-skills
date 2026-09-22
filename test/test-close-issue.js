/**
 * close_issue.cjs skip/dry-run contract (GitHub + ADO).
 * Run: node test/test-close-issue.js
 */
import assert from 'node:assert';
import cp from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS = path.join(REPO_ROOT, '.agents/skills');

function run(scriptRel, args, env = process.env) {
  return cp.spawnSync(process.execPath, [path.join(SKILLS, scriptRel), ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env,
  });
}

const ghScript = 'ws-spec-provider-github/scripts/close_issue.cjs';
const adoScript = 'ws-spec-provider-azure-devops/scripts/close_issue.cjs';
const require = createRequire(import.meta.url);
const { isClosedTransitionRejection } = require(path.join(SKILLS, adoScript));

assert.strictEqual(
  isClosedTransitionRejection({ status: 400, detail: 'The field System.State contains the value Closed which is not in the list of supported values' }),
  true,
  'ADO Closed rejection triggers Done fallback',
);
assert.strictEqual(
  isClosedTransitionRejection({ status: 400, detail: 'Work item 2817 does not exist' }),
  false,
  'non-transition 400 must not trigger Done fallback',
);

// GitHub: --id null -> skipped, exit 0
let res = run(ghScript, ['--id', 'null']);
assert.strictEqual(res.status, 0, `GitHub null id exits 0: ${res.stderr}`);
assert.strictEqual(JSON.parse(res.stdout).status, 'skipped', 'GitHub null id skipped');

// GitHub: --dry-run without auth must not invoke gh (dry-run returns before validateAuth)
const ghEnv = { ...process.env, PATH: '' };
res = run(ghScript, ['--id', '405', '--dry-run'], ghEnv);
assert.strictEqual(res.status, 0, `GitHub dry-run exits 0 without gh on PATH: ${res.stderr}`);
const ghDry = JSON.parse(res.stdout);
assert.strictEqual(ghDry.status, 'dry-run', 'GitHub dry-run status');
assert.strictEqual(ghDry.issueId, 405, 'GitHub dry-run issueId');

// ADO: --id null -> skipped
res = run(adoScript, ['--id', 'null']);
assert.strictEqual(res.status, 0, `ADO null id exits 0: ${res.stderr}`);
assert.strictEqual(JSON.parse(res.stdout).status, 'skipped', 'ADO null id skipped');

// ADO: --dry-run without PAT must not PATCH (dry-run returns before validateAuth)
const adoEnv = { ...process.env };
delete adoEnv.ADO_PAT;
delete adoEnv.AZURE_DEVOPS_PAT;
res = run(
  adoScript,
  ['--org', 'parity-org', '--project', 'parity-project', '--id', '2817', '--dry-run'],
  adoEnv,
);
assert.strictEqual(res.status, 0, `ADO dry-run exits 0 without PAT: ${res.stderr}`);
const adoDry = JSON.parse(res.stdout);
assert.strictEqual(adoDry.status, 'dry-run', 'ADO dry-run status');
assert.strictEqual(adoDry.workItemId, 2817, 'ADO dry-run workItemId');
assert(/System\.State/.test(adoDry.action || ''), 'ADO dry-run names state PATCH');

// NS4: mutating close without PAT STOPs with validate-auth (no silent fallback)
res = run(
  adoScript,
  ['--org', 'parity-org', '--project', 'parity-project', '--id', '2817'],
  adoEnv,
);
assert.notStrictEqual(res.status, 0, 'ADO close without PAT exits non-zero');
assert(/validate-auth/i.test(`${res.stderr}${res.stdout}`), 'ADO close without PAT names validate-auth');

// NS5: close-issue only on merge path, not Create PR (unmerged stays open)
const shipMd = fs.readFileSync(path.join(SKILLS, 'ws-ship-pr/SKILL.md'), 'utf8');
const createPr = shipMd.match(/5\. \*\*Create PR\*\*:[\s\S]*?(?=\n6\. \*\*)/)?.[0] || '';
const merge = shipMd.match(/7\. \*\*Merge\*\*:[\s\S]*?(?=\n8\. \*\*)/)?.[0] || '';
assert(createPr.length > 0 && merge.length > 0, 'ship SKILL Create PR and Merge sections found');
assert(!/`close-issue`/.test(createPr), 'Create PR path does not dispatch close-issue');
assert(/`close-issue`/.test(merge), 'Merge path dispatches close-issue');

console.log('All close-issue skip/dry-run checks passed.');
