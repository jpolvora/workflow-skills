/**
 * Consumer vs upstream hub separation (spec 0066 AC4/AC7/AC8/AC9/AC12).
 * Run: node test/test-hub-separation.js
 */
import fs from 'fs';
import os from 'os';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, run } = utils;
const CHECKER = path.join(repoRoot, '.agents', 'skills', 'ws-check-harness', 'scripts', 'check_hub_separation.cjs');
const SOT_HUB = path.join(repoRoot, '.agents', 'skills', 'ws-shared', 'runtime', 'AGENTS.md');
const SOT_CATALOG = path.join(repoRoot, '.agents', 'skills', 'ws-shared', 'runtime', 'CATALOG.md');

const DENYLIST = [
  'Upstream session contract',
  'Global vs local',
  'Skill SoT',
  'generate-integrity',
  'build-site:bump',
  'Upstream Maintainers',
  'Upstream developer workflow',
  'Before ship PR',
];

const tmpRoots = [];

function mkConsumerHub(extra = '') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-hub-sep-'));
  tmpRoots.push(root);
  const dir = path.join(root, '.ws', 'runtime');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), `${fs.readFileSync(SOT_HUB, 'utf8')}${extra}`, 'utf8');
  return root;
}

function check(repoRootDir, mode, env) {
  const args = ['--json', '--repo-root', repoRootDir];
  if (mode) args.push('--mode', mode);
  // Pin an empty global dir by default so fixtures resolve locally instead of
  // auditing the machine-global install.
  const pinned = { WORKFLOW_SKILLS_GLOBAL_DIR: path.join(repoRootDir, 'no-global'), ...(env || {}) };
  const result = run(CHECKER, args, { env: pinned });
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  return { result, report };
}

try {
  // AC7: SoT consumer hub passes the upstream gate with zero critical findings.
  const clean = check(repoRoot, 'upstream');
  assert.strictEqual(clean.result.status, 0, clean.result.stderr || JSON.stringify(clean.report && clean.report.findings));
  assert.ok(clean.report && clean.report.ok, 'SoT hub separation report is ok');

  // AC7 fail-closed: injected upstream instruction is critical.
  const dirty = mkConsumerHub('\nRun npm run generate-integrity before ship.\n');
  const flagged = check(dirty, 'consumer');
  assert.strictEqual(flagged.result.status, 1, 'injected upstream phrase exits 1');
  assert.ok(
    flagged.report && flagged.report.findings.some((row) => row.kind === 'upstream-phrase' && row.phrase === 'generate-integrity'),
    'injected phrase reported as upstream-phrase',
  );

  // AC8: missing consumer banner is critical.
  const noBanner = mkConsumerHub();
  const bannerStripped = fs.readFileSync(path.join(noBanner, '.ws', 'runtime', 'AGENTS.md'), 'utf8')
    .split('\n')
    .filter((line) => !/you are in the consumer hub/i.test(line))
    .join('\n');
  fs.writeFileSync(path.join(noBanner, '.ws', 'runtime', 'AGENTS.md'), bannerStripped, 'utf8');
  const bannerResult = check(noBanner, 'consumer');
  assert.strictEqual(bannerResult.result.status, 1, 'missing banner exits 1');
  assert.ok(
    bannerResult.report && bannerResult.report.findings.some((row) => row.kind === 'missing-consumer-banner'),
    'missing banner reported',
  );

  // AC8: reintroduced upstream authoring heading is critical.
  const drifted = mkConsumerHub('\n### Upstream developer workflow (this repo only)\n');
  const driftResult = check(drifted, 'consumer');
  assert.strictEqual(driftResult.result.status, 1, 'upstream heading exits 1');
  assert.ok(
    driftResult.report && driftResult.report.findings.some((row) => row.kind === 'upstream-heading'),
    'upstream heading reported',
  );

  // AC12: consumer-only tree (no root AGENTS.md) resolves to the shared hub only.
  const consumerOnly = mkConsumerHub();
  const consumerResult = check(consumerOnly, 'consumer');
  assert.strictEqual(consumerResult.result.status, 0, consumerResult.result.stderr || 'consumer-only tree passes without root AGENTS.md');
  assert.ok(!fs.existsSync(path.join(consumerOnly, 'AGENTS.md')), 'fixture has no root AGENTS.md');
  const hubText = fs.readFileSync(path.join(consumerOnly, '.ws', 'runtime', 'AGENTS.md'), 'utf8');
  for (const phrase of ['Skill SoT', 'Global vs local', 'Upstream session contract']) {
    assert.ok(!hubText.includes(phrase), `consumer hub does not surface ${phrase}`);
  }

  // AC7/AC8: global-hybrid resolution audits the effective runtime hub, not the thin pointer.
  const hybridRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-hub-sep-hybrid-'));
  tmpRoots.push(hybridRoot);
  const globalRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-hub-sep-global-'));
  tmpRoots.push(globalRoot);
  fs.mkdirSync(path.join(hybridRoot, '.ws'), { recursive: true });
  fs.writeFileSync(path.join(hybridRoot, '.ws', 'AGENTS.md'), '# Consumer pointer\n\n> You are in the consumer hub.\n', 'utf8');
  const globalRuntime = path.join(globalRoot, 'ws-shared', 'runtime');
  fs.mkdirSync(globalRuntime, { recursive: true });
  fs.writeFileSync(
    path.join(globalRuntime, 'AGENTS.md'),
    `${fs.readFileSync(SOT_HUB, 'utf8')}\nRun npm run generate-integrity before ship.\n`,
    'utf8',
  );
  const hybrid = check(hybridRoot, 'consumer', { WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot });
  assert.strictEqual(hybrid.result.status, 1, 'contaminated global runtime exits 1');
  assert.ok(
    JSON.parse(hybrid.result.stdout).findings.some((row) => row.kind === 'upstream-phrase'),
    'global runtime contamination reported',
  );

  // Fail closed: a missing effective hub is critical in consumer mode.
  const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-hub-sep-empty-'));
  tmpRoots.push(emptyRoot);
  const missing = check(emptyRoot, 'consumer');
  assert.strictEqual(missing.result.status, 1, 'missing hub exits 1 in consumer mode');
  assert.ok(JSON.parse(missing.result.stdout).findings.some((row) => row.kind === 'hub-missing'), 'missing hub reported');

  // Local-first: a contaminated skills-tree runtime wins over a clean legacy installed copy.
  const localFirstRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-hub-sep-localfirst-'));
  tmpRoots.push(localFirstRoot);
  const legacyRuntime = path.join(localFirstRoot, '.ws', 'runtime');
  fs.mkdirSync(legacyRuntime, { recursive: true });
  fs.writeFileSync(path.join(legacyRuntime, 'AGENTS.md'), fs.readFileSync(SOT_HUB, 'utf8'), 'utf8');
  const treeRuntime = path.join(localFirstRoot, '.agents', 'skills', 'ws-shared', 'runtime');
  fs.mkdirSync(treeRuntime, { recursive: true });
  fs.writeFileSync(
    path.join(treeRuntime, 'AGENTS.md'),
    `${fs.readFileSync(SOT_HUB, 'utf8')}\nRun npm run generate-integrity before ship.\n`,
    'utf8',
  );
  const localFirst = check(localFirstRoot, 'consumer');
  assert.strictEqual(localFirst.result.status, 1, 'contaminated skills-tree runtime exits 1');
  assert.ok(
    JSON.parse(localFirst.result.stdout).hub.endsWith('.agents/skills/ws-shared/runtime/AGENTS.md'),
    'skills-tree runtime is the audited hub',
  );

  // Explicit shared-dir override is audited when it is the effective source.
  const overrideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-hub-sep-override-'));
  tmpRoots.push(overrideRoot);
  const customShared = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-hub-sep-custom-'));
  tmpRoots.push(customShared);
  const customRuntime = path.join(customShared, 'runtime');
  fs.mkdirSync(customRuntime, { recursive: true });
  fs.writeFileSync(
    path.join(customRuntime, 'AGENTS.md'),
    `${fs.readFileSync(SOT_HUB, 'utf8')}\nRun npm run build-site:bump before ship.\n`,
    'utf8',
  );
  const overridden = check(overrideRoot, 'consumer', { WORKFLOW_SKILLS_SHARED_DIR: customShared });
  assert.strictEqual(overridden.result.status, 1, 'contaminated shared-dir override exits 1');
  assert.ok(
    JSON.parse(overridden.result.stdout).findings.some((row) => row.kind === 'upstream-phrase'),
    'override contamination reported',
  );

  // AC4: consumer CATALOG keeps no upstream-only sections; root keeps them.
  const catalog = fs.readFileSync(SOT_CATALOG, 'utf8');
  for (const phrase of ['Before ship PR', 'Upstream developer workflow', 'generate-integrity', 'build-site:bump']) {
    assert.ok(!catalog.includes(phrase), `consumer CATALOG lacks upstream-only ${phrase}`);
  }
  assert.ok(catalog.includes('## Task router'), 'consumer CATALOG keeps the task router');
  for (const anchor of ['#development-commands-this-repo', '#review--audit-commands']) {
    assert.ok(!catalog.includes(anchor), `consumer CATALOG must not link to removed upstream anchor ${anchor}`);
  }
  const slugify = (heading) => heading.toLowerCase().replace(/[^a-z0-9 _-]/g, '').trim().replace(/\s+/g, '-');
  const headings = new Set(
    catalog.split('\n').filter((line) => /^#{1,6}\s/.test(line)).map((line) => slugify(line.replace(/^#{1,6}\s+/, ''))),
  );
  for (const match of catalog.matchAll(/\]\(#(.*?)\)/g)) {
    assert.ok(headings.has(match[1]), `consumer CATALOG anchor #${match[1]} resolves to a heading in the same file`);
  }
  assert.ok(catalog.includes('## External dependencies'), 'consumer CATALOG keeps the dependencies mirror');
  const rootCatalog = fs.readFileSync(path.join(repoRoot, 'CATALOG.md'), 'utf8');
  assert.ok(rootCatalog.includes('Before ship PR'), 'root CATALOG remains the upstream inventory SoT');

  // AC9: size cap is enforced here as well as in test-context-budget.js.
  const bytes = Buffer.byteLength(hubText.replace(/\r\n?/g, '\n'), 'utf8');
  assert.ok(bytes <= 14000, `SoT consumer hub is ${bytes} B (cap 14000)`);

  console.log('test-hub-separation: ok');
} finally {
  for (const dir of tmpRoots) fs.rmSync(dir, { recursive: true, force: true });
}
