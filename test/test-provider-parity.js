/**
 * SCM provider intent parity (GitHub ↔ Azure DevOps).
 * Run: node test/test-provider-parity.js
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SKILLS = path.join(REPO, '.agents/skills');
const CONTRACT = path.join(SKILLS, 'ws-shared/runtime/scm-provider-contract.md');

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
assert(
  /hash-only/i.test(contractMd),
  'scm-provider-contract resolve-thread rejects hash-only comments',
);
assert(
  /Visual References|\.assets/i.test(contractMd),
  'scm-provider-contract fetch-to-spec documents visual ingest',
);
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
  implementers.includes('ws-spec-provider-github') &&
    implementers.includes('ws-spec-provider-azure-devops'),
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
  const fetchSection = sectionAfterHeading(intentsMd, '`fetch-to-spec`');
  assert(
    /assets|Visual References/i.test(fetchSection),
    `${skillId} INTENTS.md fetch-to-spec documents assets sidecar or Visual References`,
  );
}

const gh = new Set(declared['ws-spec-provider-github'].tableIds);
const ado = new Set(declared['ws-spec-provider-azure-devops'].tableIds);
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
      allowedOn(allowlist, intent, 'ws-spec-provider-github'),
      `intent ${intent} is GitHub-only; add Azure mapping or an allowlist row`,
    );
  }
  if (inAdo && !inGh) {
    assert(
      allowedOn(allowlist, intent, 'ws-spec-provider-azure-devops'),
      `intent ${intent} is Azure-only; add GitHub mapping or an allowlist row`,
    );
  }
}

const GOOD_RESOLUTION_NOTE =
  'Fixed in 3dc20274.\n\nloadList() now preloads row actions so the Edit button is visible before opening the extra-actions menu.';
const THIN_RESOLUTION_NOTE = 'Corrigido em 3dc20274.';
const THIN_RESOLUTION_ERROR = /must describe the correction/;

const ghScript = path.join(SKILLS, 'ws-spec-provider-github/scripts/resolve_thread.cjs');
const ghDry = spawnSync(
  process.execPath,
  [ghScript, '--dry-run', 'thread-parity', GOOD_RESOLUTION_NOTE],
  { encoding: 'utf8', cwd: REPO },
);
assert(ghDry.status === 0, 'GitHub resolve_thread.cjs --dry-run exits 0');
assert(/\[dry-run\]/.test(ghDry.stdout || ''), 'GitHub resolve_thread.cjs --dry-run prints dry-run (no GraphQL)');
assert(
  /preloads row actions/.test(ghDry.stdout || ''),
  'GitHub resolve-thread dry-run keeps the correction summary',
);

const ghDryModel = spawnSync(
  process.execPath,
  [ghScript, '--dry-run', '--model', 'composer-2.5', 'thread-parity', GOOD_RESOLUTION_NOTE],
  { encoding: 'utf8', cwd: REPO },
);
assert(ghDryModel.status === 0, 'GitHub resolve_thread.cjs --dry-run --model exits 0');
assert(
  /---\nLLM model: composer-2\.5/.test(ghDryModel.stdout || ''),
  'GitHub resolve-thread appends LLM model footer',
);
assert(
  /preloads row actions/.test(ghDryModel.stdout || ''),
  'GitHub resolve-thread with --model still includes the correction summary',
);

const ghThin = spawnSync(
  process.execPath,
  [ghScript, '--dry-run', '--model', 'composer-2.5', 'thread-parity', THIN_RESOLUTION_NOTE],
  { encoding: 'utf8', cwd: REPO },
);
assert(ghThin.status !== 0, 'GitHub resolve-thread rejects hash-only comments');
assert(
  THIN_RESOLUTION_ERROR.test(`${ghThin.stdout || ''}${ghThin.stderr || ''}`),
  'GitHub hash-only reject names the correction requirement',
);

const METADATA_ONLY_NOTE =
  'defectClass: missing-null-check\nsourcesConsulted: MEMORY.md\nproactiveFixed: src/foo.ts\nproactiveSkipped: none';
const ghMeta = spawnSync(
  process.execPath,
  [ghScript, '--dry-run', 'thread-parity', METADATA_ONLY_NOTE],
  { encoding: 'utf8', cwd: REPO },
);
assert(ghMeta.status !== 0, 'GitHub resolve-thread rejects metadata-only comments');
assert(
  THIN_RESOLUTION_ERROR.test(`${ghMeta.stdout || ''}${ghMeta.stderr || ''}`),
  'GitHub metadata-only reject names the correction requirement',
);

const FILLER_RESOLUTION_NOTE = 'x'.repeat(40);
const ghFiller = spawnSync(
  process.execPath,
  [ghScript, '--dry-run', 'thread-parity', FILLER_RESOLUTION_NOTE],
  { encoding: 'utf8', cwd: REPO },
);
assert(ghFiller.status !== 0, 'GitHub resolve-thread rejects filler-only comments');
assert(
  THIN_RESOLUTION_ERROR.test(`${ghFiller.stdout || ''}${ghFiller.stderr || ''}`),
  'GitHub filler-only reject names the correction requirement',
);

const adoScript = path.join(SKILLS, 'ws-spec-provider-azure-devops/scripts/fix_pr_azure_context.cjs');

const adoHelp = spawnSync(process.execPath, [adoScript, 'resolve-thread', '--help'], {
  encoding: 'utf8',
  cwd: REPO,
});
assert(adoHelp.status === 0, 'Azure resolve-thread --help exits 0');
assert(
  /--dry-run/.test(`${adoHelp.stdout || ''}${adoHelp.stderr || ''}`),
  'Azure resolve-thread documents --dry-run',
);

const adoDryNoModel = spawnSync(
  process.execPath,
  [
    adoScript,
    'resolve-thread',
    '--dry-run',
    '--pr-id',
    '1',
    '--thread-id',
    '1',
    '--comment',
    GOOD_RESOLUTION_NOTE,
  ],
  { encoding: 'utf8', cwd: REPO },
);
assert(adoDryNoModel.status === 0, 'Azure resolve-thread --dry-run works without --model');
assert(
  !/required|cannot be empty/i.test(`${adoDryNoModel.stdout || ''}${adoDryNoModel.stderr || ''}`),
  'Azure --model is optional host metadata',
);
assert(
  /preloads row actions/.test(adoDryNoModel.stdout || ''),
  'Azure resolve-thread dry-run keeps the correction summary',
);

const adoDryModel = spawnSync(
  process.execPath,
  [
    adoScript,
    'resolve-thread',
    '--dry-run',
    '--pr-id',
    '1',
    '--thread-id',
    '1',
    '--comment',
    GOOD_RESOLUTION_NOTE,
    '--model',
    'composer-2.5',
  ],
  { encoding: 'utf8', cwd: REPO },
);
assert(adoDryModel.status === 0, 'Azure resolve-thread --dry-run --model exits 0');
assert(
  /---\\nLLM model: composer-2\.5/.test(adoDryModel.stdout || ''),
  'Azure resolve-thread appends LLM model footer',
);
assert(
  /preloads row actions/.test(adoDryModel.stdout || ''),
  'Azure resolve-thread with --model still includes the correction summary',
);

const adoThin = spawnSync(
  process.execPath,
  [
    adoScript,
    'resolve-thread',
    '--dry-run',
    '--pr-id',
    '1',
    '--thread-id',
    '1',
    '--comment',
    THIN_RESOLUTION_NOTE,
    '--model',
    'composer-2.5',
  ],
  { encoding: 'utf8', cwd: REPO },
);
assert(adoThin.status !== 0, 'Azure resolve-thread rejects hash-only comments');
assert(
  THIN_RESOLUTION_ERROR.test(`${adoThin.stdout || ''}${adoThin.stderr || ''}`),
  'Azure hash-only reject names the correction requirement',
);

const adoMeta = spawnSync(
  process.execPath,
  [
    adoScript,
    'resolve-thread',
    '--dry-run',
    '--pr-id',
    '1',
    '--thread-id',
    '1',
    '--comment',
    METADATA_ONLY_NOTE,
  ],
  { encoding: 'utf8', cwd: REPO },
);
assert(adoMeta.status !== 0, 'Azure resolve-thread rejects metadata-only comments');
assert(
  THIN_RESOLUTION_ERROR.test(`${adoMeta.stdout || ''}${adoMeta.stderr || ''}`),
  'Azure metadata-only reject names the correction requirement',
);

const adoFiller = spawnSync(
  process.execPath,
  [
    adoScript,
    'resolve-thread',
    '--dry-run',
    '--pr-id',
    '1',
    '--thread-id',
    '1',
    '--comment',
    FILLER_RESOLUTION_NOTE,
  ],
  { encoding: 'utf8', cwd: REPO },
);
assert(adoFiller.status !== 0, 'Azure resolve-thread rejects filler-only comments');
assert(
  THIN_RESOLUTION_ERROR.test(`${adoFiller.stdout || ''}${adoFiller.stderr || ''}`),
  'Azure filler-only reject names the correction requirement',
);

const delegated = required.filter((id) => id !== 'validate-auth' && id !== 'fetch-to-spec');
const localSkill = read(path.join(SKILLS, 'ws-spec-provider-local/SKILL.md'));
assert(/providers\.scm/.test(localSkill), 'ws-spec-provider-local delegates PR intents to providers.scm');
assert(localSkill.includes('scm: "local"'), 'ws-spec-provider-local rejects scm local');
for (const id of delegated) {
  assert(localSkill.includes(`\`${id}\``) || localSkill.includes(id), `ws-spec-provider-local documents delegate ${id}`);
}

const sweepFlags = ['--issue', '--keywords', '--files', '--dry-run', '--repo-root'];
const commentFlags = ['--id', '--body-file', '--body', '--dry-run', '--repo-root'];
const sweepKeys = ['status', 'provider', 'issue', 'keywords', 'pullRequests', 'commits', 'repoRoot'];
const rowAliases = ['number', 'pullRequestId', 'title', 'state', 'status', 'nativeStatus', 'url', 'headRefName', 'sourceRefName', 'searchQuery', 'searchText'];

for (const skillId of ['ws-spec-provider-github', 'ws-spec-provider-azure-devops']) {
  const sweepSrc = read(path.join(SKILLS, skillId, 'scripts/sweep_prior_work.cjs'));
  const commentSrc = read(path.join(SKILLS, skillId, 'scripts/comment_issue.cjs'));
  const intentsMd = read(path.join(SKILLS, skillId, 'INTENTS.md'));
  for (const flag of sweepFlags) {
    assert(sweepSrc.includes(flag), `${skillId} sweep_prior_work.cjs has ${flag}`);
  }
  const dry = spawnSync(
    process.execPath,
    [path.join(SKILLS, skillId, 'scripts/sweep_prior_work.cjs'), '--dry-run', '--keywords', 'parity'],
    { encoding: 'utf8', cwd: REPO },
  );
  assert(dry.status === 0, `${skillId} sweep_prior_work.cjs --dry-run exits 0`);
  let envelope = null;
  try {
    envelope = JSON.parse(dry.stdout || '{}');
  } catch {
    envelope = null;
  }
  assert(envelope, `${skillId} sweep --dry-run prints JSON`);
  for (const key of sweepKeys) {
    assert(envelope && Object.hasOwn(envelope, key), `${skillId} sweep JSON envelope has ${key}`);
  }
  // Live envelopes may be empty without auth; row aliases are asserted on
  // synthesized rows below (AC10), never silently skipped (NS7).
  assert(envelope && Array.isArray(envelope.pullRequests), `${skillId} sweep envelope pullRequests is an array`);
  for (const flag of commentFlags) {
    assert(commentSrc.includes(flag), `${skillId} comment_issue.cjs has ${flag}`);
  }
  assert(commentSrc.includes('skipped'), `${skillId} comment_issue.cjs skips null tracker id`);
  if (skillId === 'ws-spec-provider-azure-devops') {
    assert(
      commentSrc.includes('7.1-preview.4'),
      'ADO comment_issue.cjs uses WIT Comments api-version=7.1-preview.4',
    );
    assert(
      !commentSrc.includes('?api-version=7.1"'),
      'ADO comment_issue.cjs does not POST comments with ga api-version=7.1',
    );
    assert(
      commentSrc.includes('posted.commentId'),
      'ADO comment_issue.cjs reads WIT commentId before fallback id',
    );
    for (const flag of ['--org', '--project', '--api-base', '--pat-env']) {
      assert(commentSrc.includes(flag), `ADO comment_issue.cjs has ${flag}`);
    }
  }
  for (const term of ['diff-regression', 'baseline', 'infra-flake']) {
    assert(intentsMd.includes(term), `${skillId} INTENTS.md check-pr-status has ${term}`);
  }
  assert(/user-gate/.test(intentsMd), `${skillId} INTENTS.md sweep exact-open-PR user-gate`);
  assert(
    /hash-only/i.test(intentsMd),
    `${skillId} INTENTS.md resolve-thread rejects hash-only comments`,
  );
}

const ghThreads = read(path.join(SKILLS, 'ws-spec-provider-github/scripts/fetch_threads.cjs'));
const adoThreads = read(path.join(SKILLS, 'ws-spec-provider-azure-devops/scripts/fix_pr_azure_context.cjs'));
assert(ghThreads.includes('activeThreads'), 'GitHub fetch_threads.cjs returns activeThreads');
assert(adoThreads.includes('activeThreads'), 'Azure collect returns activeThreads');


const requireSweep = createRequire(import.meta.url);
const adoSweep = requireSweep(path.join(SKILLS, 'ws-spec-provider-azure-devops/scripts/sweep_prior_work.cjs'));
const prRow = adoSweep.prRow(
  {
    pullRequestId: 9,
    title: 't',
    status: 'active',
    sourceRefName: 'refs/heads/feat/x',
    url: 'https://dev.azure.com/o/p/_apis/git/repositories/r/pullRequests/9',
    _links: { web: { href: 'https://dev.azure.com/o/p/_git/r/pullrequest/9' } },
  },
  'q',
);
assert(!String(prRow.url || '').includes('/_apis/'), 'ADO sweep url must be web UI, not REST');
assert(prRow.url === 'https://dev.azure.com/o/p/_git/r/pullrequest/9', 'ADO sweep url uses _links.web.href');
assert(prRow.state === 'OPEN', 'ADO state uses GitHub OPEN vocabulary');
assert(prRow.status === 'OPEN', 'ADO status matches normalized state (GitHub parity)');
assert(prRow.nativeStatus === 'active', 'ADO nativeStatus preserves the provider value');
assert(prRow.searchQuery === 'q' && prRow.searchText === 'q', 'ADO search aliases match');
assert(prRow.headRefName === 'feat/x', 'ADO headRefName is a bare branch');
assert(prRow.sourceRefName === 'feat/x', 'ADO sourceRefName is a bare branch');

// AC10: PR-row aliases asserted on synthesized rows (no network/auth
// dependency). An empty envelope fails instead of skipping assertions (NS7).
const ghSweep = requireSweep(path.join(SKILLS, 'ws-spec-provider-github/scripts/sweep_prior_work.cjs'));
function requirePullRequests(env) {
  if (!env || !Array.isArray(env.pullRequests) || env.pullRequests.length === 0) {
    throw new Error('empty pullRequests envelope: row assertions require synthesized rows');
  }
  return env.pullRequests;
}
let threwEmpty = false;
try {
  requirePullRequests({ pullRequests: [] });
} catch {
  threwEmpty = true;
}
assert(threwEmpty, 'empty pullRequests envelope fails instead of skipping row assertions (NS7)');
const synthRows = requirePullRequests({
  pullRequests: [
    ghSweep.ghPrRow({ number: 7, title: 'synth', state: 'OPEN', url: 'https://github.com/o/r/pull/7', headRefName: 'feat/y' }, 'synth q'),
    adoSweep.prRow({ pullRequestId: 9, title: 'synth', status: 'active', sourceRefName: 'refs/heads/feat/y', url: '', _links: { web: { href: 'https://dev.azure.com/o/p/_git/r/pullrequest/9' } } }, 'synth q'),
  ],
});
for (const row of synthRows) {
  for (const key of rowAliases) {
    assert(Object.hasOwn(row, key), `synthesized PR row has alias ${key}`);
  }
  assert(row.status === row.state, 'synthesized PR row status matches state');
  assert(row.searchQuery === row.searchText, 'synthesized PR row search aliases match');
}
assert(
  JSON.stringify(Object.keys(synthRows[0]).sort()) === JSON.stringify(Object.keys(synthRows[1]).sort()),
  'GitHub and ADO sweep PR rows share identical field names'
);

for (const skillId of ['ws-spec-provider-github', 'ws-spec-provider-azure-devops']) {
  const skip = spawnSync(
    process.execPath,
    [path.join(SKILLS, skillId, 'scripts/comment_issue.cjs'), '--id', 'null', '--body', 'x'],
    { encoding: 'utf8', cwd: REPO },
  );
  assert(skip.status === 0, `${skillId} comment_issue.cjs --id null exits 0`);
  assert(/skipped/.test(skip.stdout || ''), `${skillId} comment_issue.cjs --id null prints skipped`);
}

const adoOverride = spawnSync(
  process.execPath,
  [
    path.join(SKILLS, 'ws-spec-provider-azure-devops', 'scripts/comment_issue.cjs'),
    '--org',
    '7focus',
    '--project',
    'MarchanteERP',
    '--id',
    '2817',
    '--api-base',
    'https://dev.azure.com',
    '--pat-env',
    'ADO_PAT',
    '--body',
    'x',
    '--dry-run',
  ],
  { encoding: 'utf8', cwd: REPO },
);
assert(
  adoOverride.status === 0,
  `ADO comment_issue.cjs accepts org/project overrides (got ${adoOverride.status}): ${adoOverride.stderr || adoOverride.stdout}`,
);
assert(!/unrecognized arguments/.test(adoOverride.stderr || ''), 'ADO comment_issue.cjs does not reject --org/--project');
assert(/dry-run/.test(adoOverride.stdout || ''), 'ADO comment_issue.cjs --dry-run with overrides prints dry-run');

const adoOverrideEnv = { ...process.env };
delete adoOverrideEnv.ADO_PAT;
delete adoOverrideEnv.AZURE_DEVOPS_PAT;
const adoOverrideMutating = spawnSync(
  process.execPath,
  [
    path.join(SKILLS, 'ws-spec-provider-azure-devops', 'scripts/comment_issue.cjs'),
    '--org',
    'parity-org',
    '--project',
    'parity-project',
    '--id',
    '1',
    '--body',
    'x',
  ],
  { encoding: 'utf8', cwd: REPO, env: adoOverrideEnv },
);
assert(
  adoOverrideMutating.status === 1,
  `ADO comment_issue.cjs mutating overrides exit 1 (got ${adoOverrideMutating.status}): ${adoOverrideMutating.stderr || adoOverrideMutating.stdout}`,
);
assert(
  /Missing PAT/i.test(adoOverrideMutating.stderr || ''),
  'CLI org/project overrides must reach validate_auth on mutating path',
);
assert(
  !/Missing issueTrackers\.azureDevOps org\/project/i.test(adoOverrideMutating.stderr || ''),
  'CLI overrides should satisfy org/project when config tracker fields are empty',
);

const { HUB_WHITELIST } = await import(pathToFileURL(path.join(REPO, 'bin/install-rules.js')).href);
assert(
  HUB_WHITELIST.includes('runtime'),
  'HUB_WHITELIST includes manifest runtime root for scm-provider-contract.md',
);

if (failures) {
  console.error(`\n${failures} provider-parity check(s) failed.`);
  process.exit(1);
}
console.log('\nAll provider-parity checks passed.');
