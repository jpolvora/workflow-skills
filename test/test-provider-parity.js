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

const ghDryModel = spawnSync(
  process.execPath,
  [ghScript, '--dry-run', '--model', 'composer-2.5', 'thread-parity', 'parity note'],
  { encoding: 'utf8', cwd: REPO },
);
assert(ghDryModel.status === 0, 'GitHub resolve_thread.cjs --dry-run --model exits 0');
assert(
  /---\nLLM model: composer-2\.5/.test(ghDryModel.stdout || ''),
  'GitHub resolve-thread appends LLM model footer',
);

const adoScript = path.join(SKILLS, 'ws-azure-devops-provider/scripts/fix_pr_azure_context.py');
const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
const adoHelp = spawnSync(pythonBin, [adoScript, 'resolve-thread', '--help'], {
  encoding: 'utf8',
  cwd: REPO,
});
assert(adoHelp.status === 0, 'Azure resolve-thread --help exits 0');
assert(
  /--dry-run/.test(`${adoHelp.stdout || ''}${adoHelp.stderr || ''}`),
  'Azure resolve-thread documents --dry-run',
);

const adoDryNoModel = spawnSync(
  pythonBin,
  [
    adoScript,
    'resolve-thread',
    '--dry-run',
    '--pr-id',
    '1',
    '--thread-id',
    '1',
    '--comment',
    'parity note',
  ],
  { encoding: 'utf8', cwd: REPO },
);
assert(adoDryNoModel.status === 0, 'Azure resolve-thread --dry-run works without --model');
assert(
  !/required|cannot be empty/i.test(`${adoDryNoModel.stdout || ''}${adoDryNoModel.stderr || ''}`),
  'Azure --model is optional host metadata',
);

const adoDryModel = spawnSync(
  pythonBin,
  [
    adoScript,
    'resolve-thread',
    '--dry-run',
    '--pr-id',
    '1',
    '--thread-id',
    '1',
    '--comment',
    'parity note',
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

const delegated = required.filter((id) => id !== 'validate-auth' && id !== 'fetch-to-spec');
const localSkill = read(path.join(SKILLS, 'ws-local-spec-provider/SKILL.md'));
assert(/providers\.scm/.test(localSkill), 'ws-local-spec-provider delegates PR intents to providers.scm');
assert(localSkill.includes('scm: "local"'), 'ws-local-spec-provider rejects scm local');
for (const id of delegated) {
  assert(localSkill.includes(`\`${id}\``) || localSkill.includes(id), `ws-local-spec-provider documents delegate ${id}`);
}

const sweepFlags = ['--issue', '--keywords', '--files', '--dry-run', '--repo-root'];
const commentFlags = ['--id', '--body-file', '--body', '--dry-run', '--repo-root'];
const sweepKeys = ['status', 'provider', 'issue', 'keywords', 'pullRequests', 'commits', 'repoRoot'];
const rowAliases = ['number', 'pullRequestId', 'title', 'state', 'status', 'url', 'headRefName', 'sourceRefName'];

for (const skillId of ['ws-github-provider', 'ws-azure-devops-provider']) {
  const sweepSrc = read(path.join(SKILLS, skillId, 'scripts/sweep_prior_work.py'));
  const commentSrc = read(path.join(SKILLS, skillId, 'scripts/comment_issue.py'));
  const intentsMd = read(path.join(SKILLS, skillId, 'INTENTS.md'));
  for (const flag of sweepFlags) {
    assert(sweepSrc.includes(flag), `${skillId} sweep_prior_work.py has ${flag}`);
  }
  for (const key of sweepKeys) {
    assert(sweepSrc.includes(`"${key}"`), `${skillId} sweep JSON envelope has ${key}`);
  }
  for (const key of rowAliases) {
    assert(sweepSrc.includes(`"${key}"`), `${skillId} sweep PR row has alias ${key}`);
  }
  for (const flag of commentFlags) {
    assert(commentSrc.includes(flag), `${skillId} comment_issue.py has ${flag}`);
  }
  assert(commentSrc.includes('"skipped"'), `${skillId} comment_issue.py skips null tracker id`);
  if (skillId === 'ws-azure-devops-provider') {
    assert(
      commentSrc.includes('7.1-preview.4'),
      'ADO comment_issue.py uses WIT Comments api-version=7.1-preview.4',
    );
    assert(
      !commentSrc.includes('?api-version=7.1"'),
      'ADO comment_issue.py does not POST comments with ga api-version=7.1',
    );
    assert(
      commentSrc.includes('posted.get("commentId")'),
      'ADO comment_issue.py reads WIT commentId before fallback id',
    );
    for (const flag of ['--org', '--project', '--api-base', '--pat-env']) {
      assert(commentSrc.includes(flag), `ADO comment_issue.py has ${flag}`);
    }
  }
  for (const term of ['diff-regression', 'baseline', 'infra-flake']) {
    assert(intentsMd.includes(term), `${skillId} INTENTS.md check-pr-status has ${term}`);
  }
  assert(/user-gate/.test(intentsMd), `${skillId} INTENTS.md sweep exact-open-PR user-gate`);
}

const ghThreads = read(path.join(SKILLS, 'ws-github-provider/scripts/fetch_threads.cjs'));
const adoThreads = read(path.join(SKILLS, 'ws-azure-devops-provider/scripts/fix_pr_azure_context.py'));
assert(ghThreads.includes('activeThreads'), 'GitHub fetch_threads.cjs returns activeThreads');
assert(adoThreads.includes('activeThreads'), 'Azure collect returns activeThreads');

const ghSweepDry = spawnSync(
  'python',
  [path.join(SKILLS, 'ws-github-provider/scripts/sweep_prior_work.py'), '--dry-run', '--keywords', 'parity'],
  { encoding: 'utf8', cwd: REPO },
);
assert(ghSweepDry.status === 0, 'GitHub sweep_prior_work.py --dry-run exits 0');
const adoSweepDry = spawnSync(
  'python',
  [path.join(SKILLS, 'ws-azure-devops-provider/scripts/sweep_prior_work.py'), '--dry-run', '--keywords', 'parity'],
  { encoding: 'utf8', cwd: REPO },
);
assert(adoSweepDry.status === 0, 'Azure sweep_prior_work.py --dry-run exits 0');

const adoSweepScript = path.join(SKILLS, 'ws-azure-devops-provider/scripts/sweep_prior_work.py');
const prRowProbe = spawnSync(
  pythonBin,
  ['-'],
  {
    encoding: 'utf8',
    cwd: REPO,
    env: { ...process.env, ADO_SWEEP_SCRIPT: adoSweepScript },
    input: [
      'import importlib.util, json, os',
      'path = os.environ["ADO_SWEEP_SCRIPT"]',
      'spec = importlib.util.spec_from_file_location("sweep", path)',
      'mod = importlib.util.module_from_spec(spec)',
      'spec.loader.exec_module(mod)',
      'row = mod.pr_row({',
      '  "pullRequestId": 9,',
      '  "title": "t",',
      '  "status": "active",',
      '  "sourceRefName": "refs/heads/feat/x",',
      '  "url": "https://dev.azure.com/o/p/_apis/git/repositories/r/pullRequests/9",',
      '  "_links": {"web": {"href": "https://dev.azure.com/o/p/_git/r/pullrequest/9"}},',
      '}, "q")',
      'print(json.dumps(row))',
      '',
    ].join('\n'),
  },
);
assert(prRowProbe.status === 0, 'Azure pr_row fixture exits 0');
let prRow;
try {
  prRow = JSON.parse(prRowProbe.stdout || '{}');
} catch {
  prRow = {};
}
assert(!String(prRow.url || '').includes('/_apis/'), 'ADO sweep url must be web UI, not REST');
assert(prRow.url === 'https://dev.azure.com/o/p/_git/r/pullrequest/9', 'ADO sweep url uses _links.web.href');
assert(prRow.state === 'OPEN', 'ADO state uses GitHub OPEN vocabulary');
assert(prRow.status === 'active', 'ADO status keeps native value');
assert(prRow.headRefName === 'feat/x', 'ADO headRefName is a bare branch');
assert(prRow.sourceRefName === 'feat/x', 'ADO sourceRefName is a bare branch');

for (const skillId of ['ws-github-provider', 'ws-azure-devops-provider']) {
  const skip = spawnSync(
    'python',
    [path.join(SKILLS, skillId, 'scripts/comment_issue.py'), '--id', 'null', '--body', 'x'],
    { encoding: 'utf8', cwd: REPO },
  );
  assert(skip.status === 0, `${skillId} comment_issue.py --id null exits 0`);
  assert(/skipped/.test(skip.stdout || ''), `${skillId} comment_issue.py --id null prints skipped`);
}

const adoOverride = spawnSync(
  'python',
  [
    path.join(SKILLS, 'ws-azure-devops-provider', 'scripts/comment_issue.py'),
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
  `ADO comment_issue.py accepts org/project overrides (got ${adoOverride.status}): ${adoOverride.stderr || adoOverride.stdout}`,
);
assert(!/unrecognized arguments/.test(adoOverride.stderr || ''), 'ADO comment_issue.py does not reject --org/--project');
assert(/dry-run/.test(adoOverride.stdout || ''), 'ADO comment_issue.py --dry-run with overrides prints dry-run');

const adoOverrideEnv = { ...process.env };
delete adoOverrideEnv.ADO_PAT;
delete adoOverrideEnv.AZURE_DEVOPS_PAT;
const adoOverrideMutating = spawnSync(
  'python',
  [
    path.join(SKILLS, 'ws-azure-devops-provider', 'scripts/comment_issue.py'),
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
  `ADO comment_issue.py mutating overrides exit 1 (got ${adoOverrideMutating.status}): ${adoOverrideMutating.stderr || adoOverrideMutating.stdout}`,
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
  HUB_WHITELIST.includes('scm-provider-contract.md'),
  'HUB_WHITELIST includes scm-provider-contract.md',
);

if (failures) {
  console.error(`\n${failures} provider-parity check(s) failed.`);
  process.exit(1);
}
console.log('\nAll provider-parity checks passed.');
