/**
 * SCM provider intent parity (GitHub ↔ Azure DevOps).
 * Run: node test/test-provider-parity.js
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SKILLS = path.join(REPO, '.agents/skills');
const CONTRACT = path.join(SKILLS, 'ws-shared/scm-provider-contract.md');

let failures = 0;

function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

function read(abs) {
  return fs.readFileSync(abs, 'utf8');
}

function sectionAfterHeading(md, heading) {
  const re = new RegExp(`^## ${heading}\\s*$`, 'm');
  const m = re.exec(md);
  if (!m) return '';
  const start = m.index + m[0].length;
  const rest = md.slice(start);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

function firstColumnBacktickIds(markdownChunk) {
  const ids = [];
  for (const line of markdownChunk.split('\n')) {
    const match = line.match(/^\|\s*`([a-z][a-z0-9-]*)`\s*\|/);
    if (match) ids.push(match[1]);
  }
  return ids;
}

function firstColumnSkillFolders(markdownChunk) {
  const ids = [];
  for (const line of markdownChunk.split('\n')) {
    const match = line.match(/^\|\s*`?(ws-[a-z0-9-]+)`?\s*\|/);
    if (match) ids.push(match[1]);
  }
  return ids;
}

function intentHeadings(md) {
  const ids = [];
  const re = /^## `([a-z][a-z0-9-]*)`\s*$/gm;
  let m;
  while ((m = re.exec(md)) !== null) ids.push(m[1]);
  return ids;
}

function skillTableIntents(skillMd) {
  return firstColumnBacktickIds(sectionAfterHeading(skillMd, 'Intent contract'));
}

function allowlistRows(contractMd) {
  const chunk = sectionAfterHeading(contractMd, 'Provider-specific allowlist');
  const rows = [];
  for (const line of chunk.split('\n')) {
    const match = line.match(/^\|\s*`([a-z][a-z0-9-]*)`\s*\|\s*`([^`]+)`\s*\|/);
    if (match) rows.push({ intent: match[1], allowedOn: match[2].trim() });
  }
  return rows;
}

function allowedOn(rows, intent, skillId) {
  return rows.some(
    (row) =>
      row.intent === intent &&
      (row.allowedOn === skillId || row.allowedOn === skillId.replace(/^ws-/, '')),
  );
}

const contractMd = read(CONTRACT);
assert(fs.existsSync(CONTRACT), 'scm-provider-contract.md exists');

const required = firstColumnBacktickIds(sectionAfterHeading(contractMd, 'Required intents'));
assert(required.length >= 9, `required intents count >= 9 (got ${required.length})`);
for (const id of [
  'validate-auth',
  'fetch-to-spec',
  'create-pr',
  'list-threads',
  'check-pr-status',
  'resolve-thread',
  'merge-pr',
  'sweep-prior-work',
  'comment-issue',
]) {
  assert(required.includes(id), `required includes ${id}`);
}

const implementers = firstColumnSkillFolders(
  sectionAfterHeading(contractMd, 'SCM implementers'),
);
assert(
  implementers.includes('ws-github-provider') &&
    implementers.includes('ws-azure-devops-provider'),
  'contract lists both SCM implementers',
);

const allowlist = allowlistRows(contractMd);
const declared = {};

for (const skillId of implementers) {
  const skillPath = path.join(SKILLS, skillId, 'SKILL.md');
  const intentsPath = path.join(SKILLS, skillId, 'INTENTS.md');
  assert(fs.existsSync(skillPath), `${skillId}/SKILL.md exists`);
  assert(fs.existsSync(intentsPath), `${skillId}/INTENTS.md exists`);
  const skillMd = read(skillPath);
  const intentsMd = read(intentsPath);
  const tableIds = skillTableIntents(skillMd);
  const headingIds = intentHeadings(intentsMd);
  declared[skillId] = { tableIds, headingIds };

  assert(/scm-provider-contract\.md/.test(skillMd), `${skillId} SKILL.md links scm-provider-contract.md`);
  assert(/scm-provider-contract\.md/.test(intentsMd), `${skillId} INTENTS.md links scm-provider-contract.md`);

  for (const id of required) {
    assert(tableIds.includes(id), `${skillId} SKILL.md table has ${id}`);
    assert(headingIds.includes(id), `${skillId} INTENTS.md heading has ${id}`);
  }

  const combined = `${skillMd}\n${intentsMd}`;
  assert(/silent/i.test(combined) && /fallback/i.test(combined), `${skillId} documents no silent fallback`);
  assert(/specsDir/.test(combined), `${skillId} documents specsDir spec path`);
  assert(
    /workingBranch/.test(combined) || /delete/.test(combined),
    `${skillId} documents working-branch delete rule`,
  );
  assert(/dry-run/.test(intentsMd), `${skillId} INTENTS.md documents dry-run for mutating intents`);
  assert(/[Rr]euse/.test(intentsMd), `${skillId} INTENTS.md documents reuse open PR`);
}

const gh = new Set(declared['ws-github-provider'].tableIds);
const ado = new Set(declared['ws-azure-devops-provider'].tableIds);
const union = new Set([...gh, ...ado]);
for (const intent of union) {
  if (required.includes(intent)) continue;
  const inGh = gh.has(intent);
  const inAdo = ado.has(intent);
  if (inGh && inAdo) {
    assert(true, `extra intent ${intent} present on both SCM providers`);
    continue;
  }
  if (inGh && !inAdo) {
    assert(
      allowedOn(allowlist, intent, 'ws-github-provider'),
      `intent ${intent} is GitHub-only; add Azure mapping or an allowlist row`,
    );
  }
  if (inAdo && !inGh) {
    assert(
      allowedOn(allowlist, intent, 'ws-azure-devops-provider'),
      `intent ${intent} is Azure-only; add GitHub mapping or an allowlist row`,
    );
  }
}

const ghScript = path.join(SKILLS, 'ws-github-provider/scripts/resolve_thread.cjs');
const ghDry = spawnSync(
  process.execPath,
  [ghScript, '--dry-run', 'thread-parity', 'parity note'],
  { encoding: 'utf8', cwd: REPO },
);
assert(ghDry.status === 0, 'GitHub resolve_thread.cjs --dry-run exits 0');
assert(/\[dry-run\]/.test(ghDry.stdout || ''), 'GitHub resolve_thread.cjs --dry-run prints dry-run (no GraphQL)');

const adoScript = path.join(SKILLS, 'ws-azure-devops-provider/scripts/fix_pr_azure_context.py');
const adoHelp = spawnSync('python', [adoScript, 'resolve-thread', '--help'], {
  encoding: 'utf8',
  cwd: REPO,
});
assert(adoHelp.status === 0, 'Azure resolve-thread --help exits 0');
assert(
  /--dry-run/.test(`${adoHelp.stdout || ''}${adoHelp.stderr || ''}`),
  'Azure resolve-thread documents --dry-run',
);

const { HUB_WHITELIST } = await import(pathToFileURL(path.join(REPO, 'bin/install-rules.js')).href);
assert(
  HUB_WHITELIST.includes('scm-provider-contract.md'),
  'HUB_WHITELIST includes scm-provider-contract.md',
);

if (failures) {
  console.error(`\n${failures} provider-parity check(s) failed.`);
  process.exit(1);
}
console.log('\nAll provider-parity checks passed.');
