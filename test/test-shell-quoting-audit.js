/**
 * Smoke tests for check_shell_quoting.cjs and extract_frontmatter_field.cjs.
 * Run: node test/test-shell-quoting-audit.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CHECK = path.join(
  REPO_ROOT,
  '.agents/skills/ws-check-harness/scripts/check_shell_quoting.cjs',
);
const EXTRACT = path.join(
  REPO_ROOT,
  '.agents/skills/ws-shared/scripts/extract_frontmatter_field.cjs',
);

let failures = 0;

function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

function main() {
  assert(fs.existsSync(CHECK), 'check_shell_quoting.cjs exists');
  assert(fs.existsSync(EXTRACT), 'extract_frontmatter_field.cjs exists');

  const clean = cp.spawnSync(process.execPath, [CHECK, '--json', '--repo-root', REPO_ROOT], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
  });
  assert(clean.status === 0, 'repo skills tree has no nested-quote dash-c hits');
  const cleanPayload = JSON.parse(clean.stdout.trim());
  assert(cleanPayload.ok === true, 'check_shell_quoting json ok=true');
  assert(cleanPayload.findingCount === 0, 'findingCount is 0 on clean tree');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-shell-quote-'));
  const skillDir = path.join(tmp, '.agents', 'skills', 'ws-fixture');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    [
      '---',
      'name: ws-fixture',
      'description: fixture',
      '---',
      '',
      '```bash',
      'python -c "import re; m=re.search(r^[\\"\']?, t)"',
      '```',
      '',
    ].join('\n'),
    'utf8',
  );

  const dirty = cp.spawnSync(
    process.execPath,
    [CHECK, '--json', '--repo-root', tmp, '--skills-root', '.agents/skills'],
    { cwd: tmp, encoding: 'utf-8' },
  );
  assert(dirty.status === 1, 'fixture with nested-quote python -c exits 1');
  const dirtyPayload = JSON.parse(dirty.stdout.trim());
  assert(dirtyPayload.findingCount >= 1, 'fixture reports at least one finding');
  assert(
    dirtyPayload.findings.some((f) => /dash-c|quote/i.test(f.reason)),
    'finding reason mentions quote/dash-c',
  );

  const sample = path.join(tmp, 'sample.spec.md');
  fs.writeFileSync(
    sample,
    ['---', 'slug: fix-pr-proactive-class-sweep', 'title: "Demo"', '---', '', '# Spec', ''].join(
      '\n',
    ),
    'utf8',
  );
  const extracted = cp.spawnSync(
    process.execPath,
    [EXTRACT, '--file', sample, '--field', 'slug'],
    { encoding: 'utf-8' },
  );
  assert(extracted.status === 0, 'extract_frontmatter_field exits 0');
  assert(
    extracted.stdout.trim().startsWith('fix-pr-proactive-class-sweep |'),
    'extract prints slug | basename',
  );

  const missing = cp.spawnSync(
    process.execPath,
    [EXTRACT, '--file', sample, '--field', 'workflowId'],
    { encoding: 'utf-8' },
  );
  assert(missing.status === 0, 'extract missing field exits 0');
  assert(missing.stdout.trim().startsWith('? |'), 'missing field prints ?');

  fs.rmSync(tmp, { recursive: true, force: true });

  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll shell-quoting audit smoke tests passed.');
}

main();
