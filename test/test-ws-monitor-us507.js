/**
 * us-507: ws-monitor state-less run discovery — a plan directory that holds
 * canonical step artifacts but no `*.state.json` / `*.state.md` must be reported
 * as a `run-without-state` finding and counted, instead of being invisible.
 * Run: node test/test-ws-monitor-us507.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, '.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');
const require = createRequire(import.meta.url);
const monitor = require(script);

const tempRoots = [];
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function check(condition, message) {
  if (!condition) fail(message);
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function writeJson(file, value) {
  write(file, `${JSON.stringify(value, null, 2)}\n`);
}

function makeRoot(label) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `ws-monitor-us507-${label}-`));
  tempRoots.push(root);
  writeJson(path.join(root, '.ws/config.json'), {
    project: { name: 'us507-test', baseBranch: 'main' },
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: { minVerifyScore: 9 },
    specMemo: { enabled: false, enableMemoryFiles: false, enableSpecMemoIntegration: false },
    monitor: { discoverHostTranscripts: false },
  });
  return root;
}

function run(root, args) {
  return cp.spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
}

function runJson(root, args) {
  const result = run(root, [...args, '--json']);
  if (result.status !== 0) {
    throw new Error(`monitor snapshot failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  const line = String(result.stdout).trim().split(/\r?\n/).filter(Boolean).at(-1);
  return JSON.parse(line);
}

function setMtime(file, secondsAgo) {
  const when = new Date(Date.now() - secondsAgo * 1000);
  fs.utimesSync(file, when, when);
}

function fixtureDir(root, slug) {
  const dir = path.join(root, '.agents/plans', slug);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function treeListing(root) {
  const entries = [];
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const absolute = path.join(dir, entry.name);
      const rel = path.join(prefix, entry.name);
      const stat = fs.statSync(absolute);
      entries.push(`${rel}|${entry.isDirectory() ? 'd' : 'f'}|${stat.size}|${Math.round(stat.mtimeMs)}`);
      if (entry.isDirectory()) walk(absolute, rel);
    }
  };
  walk(root, '');
  return entries.join('\n');
}

try {
  // --- AC1/AC3/AC4/AC7/AC12: a fresh state-less run is reported and counted ---
  {
    const root = makeRoot('fresh');
    const dir = fixtureDir(root, 'demo');
    write(path.join(dir, 'step-00-demo.spec.md'), '# demo spec\n');
    write(path.join(dir, 'step-01-demo.plan.md'), '# demo plan\n');
    setMtime(path.join(dir, 'step-00-demo.spec.md'), 120);
    setMtime(path.join(dir, 'step-01-demo.plan.md'), 30); // newest

    const report = runJson(root, ['--slug', 'demo']);
    check(report.workflowCount === 1, `AC1 expected workflowCount 1, got ${report.workflowCount}`);
    check(report.activeCount === 1, `AC8 expected activeCount 1 for a fresh state-less run, got ${report.activeCount}`);
    const wf = report.workflows[0];
    check(wf && wf.stateless === true, 'AC1/AC12 state-less record carries stateless: true');
    check(wf && wf.slug === 'demo', `AC12 slug resolves by directory name (got ${wf && wf.slug})`);
    check(wf && wf.statePath === null, 'AC12 statePath is null for a state-less run');
    check(wf && wf.currentStep === null, 'AC12 currentStep is null (unknown)');
    check(wf && wf.verificationScore === null, 'AC12 verificationScore is null (unknown)');
    check(wf && wf.status === 'active', `AC8 fresh state-less run is active (got ${wf && wf.status})`);

    const findings = report.findings.filter((finding) => finding.code === 'run-without-state');
    check(findings.length === 1, `AC3 expected one run-without-state finding, got ${findings.length}`);
    check(findings[0].severity === 'warning', `AC4 fresh state-less run is warning, got ${findings[0].severity}`);
    check(
      findings[0].evidence.some((item) => item.endsWith('step-01-demo.plan.md')),
      `AC3 evidence names the newest step artifact (got ${JSON.stringify(findings[0].evidence)})`,
    );
    check(
      findings[0].evidence.every((item) => !path.isAbsolute(item)),
      'AC3 evidence is repo-relative',
    );

    const md = run(root, ['--slug', 'demo']).stdout;
    check(md.includes('Workflows: 1'), 'AC7 markdown reports the run in the header');
    check(!md.includes('No workflow state files found'), 'AC7 empty-discovery line is suppressed');
    check(md.includes('`run-without-state`'), 'AC7 markdown carries the finding');
    check(md.includes('state-less run'), 'AC12 markdown identifies the state-less run');
  }

  // --- AC5/AC9: a stale state-less run stays visible as info and is not active ---
  {
    const root = makeRoot('stale');
    const dir = fixtureDir(root, 'abandoned');
    write(path.join(dir, 'step-00-abandoned.spec.md'), '# spec\n');
    setMtime(path.join(dir, 'step-00-abandoned.spec.md'), 3600); // 1h old > default 600s window

    const report = runJson(root, ['--slug', 'abandoned']);
    check(report.workflowCount === 1, `AC9 stale run stays visible (workflowCount ${report.workflowCount})`);
    check(report.activeCount === 0, `AC9 stale run is not counted active (got ${report.activeCount})`);
    const wf = report.workflows[0];
    check(wf && wf.status === 'stale', `AC9 stale state-less status is stale (got ${wf && wf.status})`);
    const findings = report.findings.filter((finding) => finding.code === 'run-without-state');
    check(findings.length === 1 && findings[0].severity === 'info', 'AC5 stale run is info');

    const watch = run(root, ['--slug', 'abandoned', '--watch', '--interval', '1', '--until-terminal']);
    check(watch.status === 0, `AC9 --until-terminal terminates on a stale state-less run (status ${watch.status})`);
  }

  // --- AC6: freshness window comes from the effective stall window ---
  {
    const root = makeRoot('window');
    const dir = fixtureDir(root, 'w');
    write(path.join(dir, 'step-00-w.spec.md'), '# w\n');
    setMtime(path.join(dir, 'step-00-w.spec.md'), 30); // 30s old

    const wide = runJson(root, ['--slug', 'w', '--stall-window', '600']);
    check(wide.activeCount === 1, 'AC6 30s-old run is fresh under the 600s window');
    check(
      wide.findings.find((finding) => finding.code === 'run-without-state').severity === 'warning',
      'AC6 fresh under the default window is warning',
    );

    const narrow = runJson(root, ['--slug', 'w', '--stall-window', '1']);
    check(narrow.activeCount === 0, 'AC6 30s-old run is stale under a 1s window');
    check(
      narrow.findings.find((finding) => finding.code === 'run-without-state').severity === 'info',
      'AC6 stale under the narrowed window is info',
    );

    check(monitor.statelessFreshness(600000, 600000) === true, 'AC6 boundary: age == window is fresh');
    check(monitor.statelessFreshness(600001, 600000) === false, 'AC6 boundary: age > window is stale');
  }

  // --- AC8: a fresh state-less run keeps an unattended --until-terminal watch open ---
  {
    const root = makeRoot('watch');
    const dir = fixtureDir(root, 'live');
    write(path.join(dir, 'step-00-live.spec.md'), '# live\n');
    setMtime(path.join(dir, 'step-00-live.spec.md'), 5);

    const watch = cp.spawnSync(
      process.execPath,
      [script, '--slug', 'live', '--watch', '--interval', '1', '--until-terminal'],
      { cwd: root, encoding: 'utf8', timeout: 3000 },
    );
    check(Boolean(watch.error), 'AC8 a fresh state-less run does not let --until-terminal exit on the first tick');
  }

  // --- AC2/AC13/AC14: no state and no top-level step artifact is not a run ---
  {
    const root = makeRoot('none');
    const empty = fixtureDir(root, 'empty');
    write(path.join(empty, 'notes.md'), '# not a run\n');
    const nestedOnly = fixtureDir(root, 'nestedonly');
    write(path.join(nestedOnly, 'worktrees', 'x', 'step-00-x.spec.md'), '# nested\n');
    const prefixed = fixtureDir(root, 'prefixed');
    write(path.join(prefixed, 'xstep-00-prefixed.spec.md'), '# not canonical\n');

    const report = runJson(root, []);
    check(report.workflowCount === 0, `AC2/AC14 no run for artifact-less or nested-only dirs (got ${report.workflowCount})`);
    check(
      report.findings.filter((finding) => finding.code === 'run-without-state').length === 0,
      'AC2 no run-without-state finding without a canonical top-level artifact',
    );

    check(monitor.isStepArtifactName('step-00-demo.spec.md'), 'AC13 canonical step artifact matches');
    check(monitor.isStepArtifactName('step-05b-demo.fresh-verify.md'), 'AC13 step-05b artifact matches');
    check(!monitor.isStepArtifactName('notes.md'), 'AC13 a plain file is not activity');
    check(!monitor.isStepArtifactName('xstep-00-demo.spec.md'), 'AC13 a non-prefix name is not activity');
    check(!monitor.isStepArtifactName('step-0-demo.spec.md'), 'AC13 a one-digit step is not the canonical class');
  }

  // --- AC14: nested artifacts never count as top-level activity ---
  {
    const root = makeRoot('nested');
    const dir = fixtureDir(root, 'mixed');
    write(path.join(dir, 'step-00-mixed.spec.md'), '# top-level\n');
    write(path.join(dir, 'worktrees', 'mixed', 'step-00-mixed.spec.md'), '# nested\n');

    const report = runJson(root, ['--slug', 'mixed']);
    const wf = report.workflows[0];
    check(wf && wf.expectedArtifacts.length === 1, `AC14 only the top-level artifact counts (got ${wf && wf.expectedArtifacts.length})`);
  }

  // --- AC10: a state file routes the directory through the existing state path ---
  {
    const root = makeRoot('stated');
    const dir = fixtureDir(root, 'hasstate');
    write(path.join(dir, 'step-00-hasstate.spec.md'), '# spec\n');
    writeJson(path.join(dir, 'uswf-hasstate.state.json'), {
      stateVersion: 3,
      workflowId: 'uswf-hasstate',
      slug: 'hasstate',
      workflowType: 'standard',
      status: 'active',
      currentStep: 0,
      completedSteps: [],
      skippedSteps: [],
      stepStatus: {},
    });
    const report = runJson(root, ['--slug', 'hasstate']);
    check(
      report.findings.filter((finding) => finding.code === 'run-without-state').length === 0,
      'AC10 a state-backed directory never raises run-without-state',
    );
    check(report.workflows.some((workflow) => !workflow.stateless && workflow.slug === 'hasstate'), 'AC10 state path still classifies the run');

    // Malformed state: presence (not parse success) is the discriminator.
    const broken = fixtureDir(root, 'broken');
    write(path.join(broken, 'step-00-broken.spec.md'), '# spec\n');
    write(path.join(broken, 'uswf-broken.state.json'), '{ "stateVersion": 3, trunc');
    const brokenReport = runJson(root, ['--slug', 'broken']);
    check(
      brokenReport.findings.filter((finding) => finding.code === 'run-without-state').length === 0,
      'AC10 a malformed state file still suppresses run-without-state',
    );
  }

  // --- AC11: selection rules for a state-less directory ---
  {
    const root = makeRoot('select');
    const dir = fixtureDir(root, 'demo');
    write(path.join(dir, 'step-00-demo.spec.md'), '# demo\n');

    check(runJson(root, ['--slug', 'demo']).workflowCount === 1, 'AC11 --slug resolves the state-less run by directory name');
    check(runJson(root, ['--slug', 'other']).workflowCount === 0, 'AC11 --slug for a different directory matches nothing');
    const byId = runJson(root, ['--workflow-id', 'uswf-demo-1']);
    check(byId.workflowCount === 0, 'AC11 --workflow-id never selects a state-less directory');
    check(
      byId.findings.filter((finding) => finding.code === 'run-without-state').length === 0,
      'AC11 --workflow-id emits no state-less finding',
    );
  }

  // --- AC15: non-directory and unreadable plans-root entries are skipped ---
  {
    const root = makeRoot('entries');
    write(path.join(root, '.agents/plans/index.json'), '{}\n');
    const dir = fixtureDir(root, 'sibling');
    write(path.join(dir, 'step-00-sibling.spec.md'), '# sibling\n');
    const denied = fixtureDir(root, 'denied');
    try {
      fs.chmodSync(denied, 0o000);
    } catch {
      // chmod is best-effort on Windows; the skip path is still exercised.
    }

    const report = runJson(root, []);
    check(report.workflowCount === 1, `AC15 a sibling state-less run is still reported (got ${report.workflowCount})`);
    check(
      report.findings.some((finding) => finding.code === 'run-without-state'),
      'AC15 findings for other runs are not suppressed',
    );
    check(monitor.listStatelessRuns(path.join(root, '.agents/plans'), root).length === 1, 'AC15 listStatelessRuns skips the file entry');
  }

  // --- AC17: DEFECT_CONTRACTS carries run-without-state and the proposal names it ---
  {
    check(
      monitor.DEFECT_CONTRACTS['run-without-state'] && monitor.DEFECT_CONTRACTS['run-without-state'].contract,
      'AC17 DEFECT_CONTRACTS gains run-without-state',
    );
    check(monitor.DEFECT_CONTRACTS['missing-child-state'], 'AC16 missing-child-state contract is unchanged');
    check(
      !/generic/i.test(monitor.defectContractFor('run-without-state').contract),
      'AC17 the contract is specific, not the generic fallback',
    );

    const root = makeRoot('issue');
    const dir = fixtureDir(root, 'demo');
    write(path.join(dir, 'step-00-demo.spec.md'), '# demo\n');
    const report = runJson(root, ['--slug', 'demo', '--open-issue', '--dry-run']);
    check(report.issueProposal && report.issueProposal.codes.includes('run-without-state'), 'AC17 the issue proposal names run-without-state');
  }

  // --- AC18: detection is read-only ---
  {
    const root = makeRoot('readonly');
    const dir = fixtureDir(root, 'demo');
    write(path.join(dir, 'step-00-demo.spec.md'), '# demo\n');
    write(path.join(dir, 'step-01-demo.plan.md'), '# plan\n');
    const before = treeListing(root);
    for (let i = 0; i < 2; i += 1) run(root, ['--slug', 'demo', '--json']);
    const after = treeListing(root);
    check(before === after, 'AC18 a plain snapshot leaves the plans tree byte-identical');
  }

  // --- AC19: documentation names the signal with its freshness rule ---
  {
    const skill = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-monitor/SKILL.md'), 'utf8');
    const actionableLine = skill.split('\n').find((line) => line.includes('**Actionable signals:**')) || '';
    check(actionableLine.includes('run-without-state'), 'AC19 actionable-signals list names run-without-state');
    const signalMap = skill.split('## Signal map')[1] || '';
    const signalRow = signalMap.split('\n').find((line) => line.includes('run-without-state')) || '';
    check(signalRow.includes('run-without-state') && /warning/i.test(signalRow), 'AC19 signal map lists run-without-state with a severity');
    check(/stall window/i.test(signalRow), 'AC19 signal map carries the freshness-to-severity rule');
  }

  // --- AC16 regression anchor: the multi-spec suite still passes unchanged ---
  {
    const us388 = cp.spawnSync(process.execPath, [path.join(repoRoot, 'test/test-ws-monitor-us388.js')], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    check(us388.status === 0, `AC16 test-ws-monitor-us388.js still passes (status ${us388.status}: ${us388.stderr || us388.stdout})`);
  }
} finally {
  for (const root of tempRoots) {
    try {
      fs.chmodSync(root, 0o777);
    } catch {
      // best effort
    }
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
}

if (failures > 0) {
  console.error(`test-ws-monitor-us507: ${failures} failure(s)`);
  process.exit(1);
}
console.log('test-ws-monitor-us507: ok');
