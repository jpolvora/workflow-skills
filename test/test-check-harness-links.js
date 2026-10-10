/**
 * ws-check-harness link gate tests (safe percent-decode fallback, resolved-hub routing coverage,
 * us-497 scope-aware install-layout notes for hub binding literals).
 * Run: node test/test-check-harness-links.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join(REPO_ROOT, '.agents', 'skills', 'ws-check-harness', 'scripts', 'check_harness_links.cjs');
const REPO_RUNTIME_SCRIPTS = path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'scripts');

const tmpRoots = [];
let failures = 0;

function fail(msg) {
  console.error(`❌ ${msg}`);
  failures += 1;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}

function cleanup() {
  for (const dir of tmpRoots) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

function check(repoRoot) {
  const result = cp.spawnSync(process.execPath, [CHECKER, '--json', '--repo-root', repoRoot], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  return { result, report };
}

function brokenTargets(report) {
  return ((report && report.findings && report.findings.brokenLinks) || []).map((row) => row.target);
}

function noteTargets(report) {
  return ((report && report.installLayoutNotes) || []).map((row) => row.target);
}

/**
 * A global-only install resolves `installScope: global` from the **executing script path**, so the
 * fixture runs a copy of the checker from inside a canonical global skills root. Layout mirrors the
 * reported repro: the project root is the sandbox "home", the global install is
 * `<sandbox>/.agents/skills`, and the project hub `<sandbox>/.ws` is absent. Hub routing literals
 * such as `../../../.ws/AGENTS.md` therefore resolve exactly as they do in the field.
 */
function mkGlobalOnlySandbox() {
  const sandbox = mkTmp('ws-chk-links-global-');
  const globalRoot = path.join(sandbox, '.agents', 'skills');
  const checkerDir = path.join(globalRoot, 'ws-check-harness', 'scripts');
  fs.mkdirSync(checkerDir, { recursive: true });
  fs.copyFileSync(CHECKER, path.join(checkerDir, 'check_harness_links.cjs'));
  const hubScripts = path.join(globalRoot, 'ws-shared', 'runtime', 'scripts');
  fs.mkdirSync(hubScripts, { recursive: true });
  for (const name of ['resolve_consumer_root.cjs', 'resolve_hub_root.cjs']) {
    const source = path.join(REPO_RUNTIME_SCRIPTS, name);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(hubScripts, name));
  }
  // Routing evidence so the fixture skill is not reported as unrouted.
  fs.writeFileSync(
    path.join(globalRoot, 'ws-shared', 'runtime', 'AGENTS.md'),
    '# runtime hub fixture\n\n| `ws-demo` | `ws-demo/SKILL.md` | fixture |\n',
    'utf8',
  );
  fs.writeFileSync(path.join(sandbox, 'AGENTS.md'), '# project root fixture\n', 'utf8');
  const skillDir = path.join(globalRoot, 'ws-demo');
  fs.mkdirSync(skillDir, { recursive: true });
  return { sandbox, globalRoot, skillDir };
}

function checkGlobalSandbox(sandbox, globalRoot) {
  const checker = path.join(globalRoot, 'ws-check-harness', 'scripts', 'check_harness_links.cjs');
  const result = cp.spawnSync(process.execPath, [checker, '--json', '--repo-root', sandbox], {
    cwd: sandbox,
    encoding: 'utf8',
    env: {
      ...process.env,
      WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot,
      WORKFLOW_SKILLS_SHARED_DIR: '',
      FORCE_COLOR: '0',
    },
  });
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  return { result, report };
}

function testPercentTargetReportsInsteadOfCrashing() {
  console.log('\n--- testPercentTargetReportsInsteadOfCrashing ---');
  const fixture = mkTmp('ws-chk-links-pct-');
  fs.writeFileSync(path.join(fixture, 'AGENTS.md'), '# hub\n\nSee [doc](docs/100%-coverage.md).\n', 'utf8');
  fs.mkdirSync(path.join(fixture, '.agents', 'skills'), { recursive: true });

  const { result, report } = check(fixture);
  assert(result.status === 1, `bare % target exits 1 as a finding (${result.stderr || ''})`);
  assert(
    report && (report.findings.brokenLinks || []).some((row) => row.file === 'AGENTS.md' && /100%/.test(row.target)),
    'bare % target reported in brokenLinks with valid JSON output',
  );
}

function testResolvedHubCountsForRouting() {
  console.log('\n--- testResolvedHubCountsForRouting ---');
  const fixture = mkTmp('ws-chk-links-hub-');
  fs.writeFileSync(path.join(fixture, 'AGENTS.md'), '# root hub\n', 'utf8');
  const skillDir = path.join(fixture, '.agents', 'skills', 'ws-foo');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: ws-foo\n---\n\n# ws-foo\n', 'utf8');
  const sharedDir = path.join(fixture, '.ws');
  fs.mkdirSync(sharedDir, { recursive: true });
  fs.writeFileSync(
    path.join(sharedDir, 'AGENTS.md'),
    '# shared hub\n\n| `ws-foo` | `.agents/skills/ws-foo/SKILL.md` | fixture |\n',
    'utf8',
  );

  const { result, report } = check(fixture);
  assert(result.status === 0, `hub-only routing exits 0 (${result.stderr || JSON.stringify(report && report.findings)})`);
  assert(report && (report.findings.unrouted || []).length === 0, 'skill routed only via the consumer hub is not unrouted');
}

function testUnrelatedSkillNotAudited() {
  console.log('\n--- testUnrelatedSkillNotAudited ---');
  const fixture = mkTmp('ws-chk-links-unrelated-');
  const emptyGlobal = mkTmp('ws-chk-links-emptyglobal-');
  fs.writeFileSync(path.join(fixture, 'AGENTS.md'), '# root hub\n', 'utf8');
  const unrelated = path.join(fixture, '.agents', 'skills', 'custom-skill');
  fs.mkdirSync(unrelated, { recursive: true });
  fs.writeFileSync(path.join(unrelated, 'SKILL.md'), '# custom\n\n[missing](nope.md)\n', 'utf8');

  const isolated = cp.spawnSync(process.execPath, [CHECKER, '--json', '--repo-root', fixture], {
    cwd: fixture,
    encoding: 'utf8',
    env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: emptyGlobal },
  });
  assert(isolated.status === 0, `unrelated non-ws skill is not package content (${isolated.stderr || ''})`);
}

function testGlobalOnlySkillsRootAudited() {
  console.log('\n--- testGlobalOnlySkillsRootAudited ---');
  const fixture = mkTmp('ws-chk-links-global-');
  const globalRoot = mkTmp('ws-chk-links-globalroot-');
  fs.writeFileSync(path.join(fixture, 'AGENTS.md'), '# root hub\n', 'utf8');
  const skillDir = path.join(globalRoot, 'ws-demo');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# ws-demo\n\n[missing](does-not-exist.md)\n', 'utf8');

  const result = cp.spawnSync(process.execPath, [CHECKER, '--json', '--repo-root', fixture], {
    cwd: fixture,
    encoding: 'utf8',
    env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot },
  });
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  assert(result.status === 1, `global-only install broken link exits 1 (${result.stderr || ''})`);
  assert(
    report &&
      (report.findings.brokenLinks || []).some((row) => /ws-demo[\\/]SKILL\.md$/.test(row.file)),
    'resolved global ws-demo SKILL.md is audited',
  );
}

function testGlobalOnlyHubBindingLiteralsTolerated() {
  console.log('\n--- testGlobalOnlyHubBindingLiteralsTolerated ---');
  const { sandbox, globalRoot, skillDir } = mkGlobalOnlySandbox();
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    ['# ws-demo', '', '- [hub entry](../../../.ws/AGENTS.md)', '- [hub config](../../../.ws/config.json)', ''].join('\n'),
    'utf8',
  );
  // The installer deliberately omits {globalSkillsRoot}/ws-shared/AGENTS.md in global scope while
  // seeding ws-shared/STACK.md, whose sibling link therefore cannot resolve there.
  fs.writeFileSync(
    path.join(globalRoot, 'ws-shared', 'STACK.md'),
    '# Stack fixture\n\nSee [AGENTS.md](AGENTS.md) for the hub entrypoint.\n',
    'utf8',
  );

  const { result, report } = checkGlobalSandbox(sandbox, globalRoot);
  assert(result.status === 0, `global-only hub binding literals exit 0 (${result.stderr || JSON.stringify(report && report.findings)})`);
  assert(report && report.ok === true && report.total === 0, 'AC13: install-layout notes never count toward total/ok');
  assert(
    report && noteTargets(report).includes('../../../.ws/AGENTS.md') && noteTargets(report).includes('../../../.ws/config.json'),
    'AC12/NS8: .ws hub routing literals are install-layout notes',
  );
  assert(
    report && noteTargets(report).includes('AGENTS.md'),
    'NS6: the seeded ws-shared/STACK.md sibling link is an install-layout note',
  );
  assert(
    report && (report.installLayoutNotes || []).every((row) => row.remediation === 'ws-configure-project'),
    'AC14: every install-layout note carries the ws-configure-project remediation pointer',
  );
  assert(
    report &&
      !brokenTargets(report).includes('../../../.ws/AGENTS.md') &&
      !brokenTargets(report).includes('../../../.ws/config.json'),
    'AC23: tolerated hub binding literals never appear under findings.brokenLinks',
  );
  assert(
    report && (report.warnings || []).some((row) => /ws-configure-project/.test(row.message)),
    'AC17: an absent project hub warns and names ws-configure-project',
  );
}

function testGlobalOnlyNonBindingTargetsStayBroken() {
  console.log('\n--- testGlobalOnlyNonBindingTargetsStayBroken ---');
  const { sandbox, globalRoot, skillDir } = mkGlobalOnlySandbox();
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    [
      '# ws-demo',
      '',
      '- [hub subtree](../ws-shared/runtime/missing.md)',
      '- [absent hub target](../../../.ws/missing.md)',
      '- [traversal](../../../.ws/../../outside.md)',
      '- [encoded traversal](..%2F..%2Foutside.md)',
      '- [unrelated](does-not-exist.md)',
      '',
    ].join('\n'),
    'utf8',
  );

  const { result, report } = checkGlobalSandbox(sandbox, globalRoot);
  assert(result.status === 1, `global-only non-binding targets exit 1 (${result.stderr || ''})`);
  const targets = brokenTargets(report);
  assert(targets.includes('../ws-shared/runtime/missing.md'), 'AC20/NS5: a hub-subtree target below the binding level stays broken');
  assert(targets.includes('../../../.ws/missing.md'), 'AC21: a non-binding .ws target stays broken (no prefix exemption)');
  assert(targets.includes('../../../.ws/../../outside.md'), 'AC21/NS3: a traversal target is refused containment and stays broken');
  assert(targets.includes('..%2F..%2Foutside.md'), 'NS3: a percent-encoded traversal target is decoded and stays broken');
  assert(targets.includes('does-not-exist.md'), 'AC16/NS1: an unrelated unresolvable target stays broken');
  assert(noteTargets(report).length === 0, 'AC21: nothing in this fixture is tolerated');
}

function testGlobalOnlyUnrewrittenRuntimeSiblingStaysBroken() {
  console.log('\n--- testGlobalOnlyUnrewrittenRuntimeSiblingStaysBroken ---');
  const { sandbox, globalRoot, skillDir } = mkGlobalOnlySandbox();
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# ws-demo\n', 'utf8');
  // The genuine #493 break: a runtime sibling the installer left unrewritten. It is
  // depth-1 inside the resolved hub exactly like the tolerated hub entrypoint, so this
  // fixture is the cross-class guard (NS17): the tolerance must never absorb it.
  fs.writeFileSync(
    path.join(globalRoot, 'ws-shared', 'autoload.md'),
    '# Autoload fixture\n\nLoad via `{skillLoader}` ([canonical skill-load procedure](host-capability-tokens.md)).\n',
    'utf8',
  );

  const { result, report } = checkGlobalSandbox(sandbox, globalRoot);
  assert(result.status === 1, `AC22/NS7: an unrewritten runtime sibling exits 1 (${result.stderr || ''})`);
  assert(brokenTargets(report).includes('host-capability-tokens.md'), 'AC22/NS7: the unrewritten runtime sibling is reported under findings.brokenLinks');
  assert(!noteTargets(report).includes('host-capability-tokens.md'), 'NS17: the tolerance never absorbs the genuine #493 break');
  assert((report && report.installLayoutNotes ? report.installLayoutNotes.length : 0) === 0, 'NS17: no install-layout note is produced for the genuine break');
}

function testProjectScopeHubTargetsValidated() {
  console.log('\n--- testProjectScopeHubTargetsValidated ---');
  const fixture = mkTmp('ws-chk-links-project-');
  const emptyGlobal = mkTmp('ws-chk-links-project-global-');
  const skillDir = path.join(fixture, '.agents', 'skills', 'ws-demo');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.mkdirSync(path.join(fixture, '.ws'), { recursive: true });
  fs.writeFileSync(path.join(fixture, '.ws', 'config.json'), '{}\n', 'utf8');
  fs.writeFileSync(path.join(fixture, 'AGENTS.md'), '# root hub\n\nRoutes `ws-demo`.\n', 'utf8');
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    '# ws-demo\n\n- [hub config](../../../.ws/config.json)\n- [missing hub target](../../../.ws/missing.md)\n',
    'utf8',
  );

  const result = cp.spawnSync(process.execPath, [CHECKER, '--json', '--repo-root', fixture], {
    cwd: fixture,
    encoding: 'utf8',
    env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: emptyGlobal, WORKFLOW_SKILLS_SHARED_DIR: '', FORCE_COLOR: '0' },
  });
  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    report = null;
  }
  assert(result.status === 1, `AC15/NS2: a missing target inside a present project hub exits 1 (${result.stderr || ''})`);
  assert(brokenTargets(report).includes('../../../.ws/missing.md'), 'AC15/NS2: the missing hub target is reported under findings.brokenLinks');
  assert(!brokenTargets(report).includes('../../../.ws/config.json'), 'AC15: a target that resolves inside the present hub validates normally');
  assert((report && report.installLayoutNotes ? report.installLayoutNotes.length : 0) === 0, 'AC12: no install-layout note outside the global-only window');
}

function testHybridLayoutValidatesHubTargets() {
  console.log('\n--- testHybridLayoutValidatesHubTargets ---');
  const { sandbox, globalRoot, skillDir } = mkGlobalOnlySandbox();
  // Hybrid layout: the skills install resolves globally while a project hub is present.
  fs.mkdirSync(path.join(sandbox, '.ws'), { recursive: true });
  fs.writeFileSync(path.join(sandbox, '.ws', 'config.json'), '{}\n', 'utf8');
  fs.writeFileSync(path.join(sandbox, '.ws', 'AGENTS.md'), '# project hub fixture\n', 'utf8');
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    '# ws-demo\n\n- [hub entry](../../../.ws/AGENTS.md)\n- [hub subtree](../ws-shared/runtime/missing.md)\n',
    'utf8',
  );

  const { result, report } = checkGlobalSandbox(sandbox, globalRoot);
  assert(result.status === 1, `NS9/AC16: a hybrid layout still reports an unresolvable runtime target (${result.stderr || ''})`);
  assert(!brokenTargets(report).includes('../../../.ws/AGENTS.md'), 'AC23/NS9: the resolving hub target validates normally');
  assert(brokenTargets(report).includes('../ws-shared/runtime/missing.md'), 'NS9/AC16: ws-shared/runtime/missing.md stays broken with exit 1');
  assert((report && report.installLayoutNotes ? report.installLayoutNotes.length : 0) === 0, 'AC12: the tolerance is inactive while the project hub is present');
}

function testHumanPathEmitsInstallLayoutDiagnostics() {
  console.log('\n--- testHumanPathEmitsInstallLayoutDiagnostics ---');
  const { sandbox, globalRoot, skillDir } = mkGlobalOnlySandbox();
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    '# ws-demo\n\n- [hub entry](../../../.ws/AGENTS.md)\n',
    'utf8',
  );
  const passRun = cp.spawnSync(
    process.execPath,
    [path.join(globalRoot, 'ws-check-harness', 'scripts', 'check_harness_links.cjs'), '--repo-root', sandbox],
    { cwd: sandbox, encoding: 'utf8', env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot, WORKFLOW_SKILLS_SHARED_DIR: '', FORCE_COLOR: '0' } },
  );
  assert(passRun.status === 0, `AC14: notes-only human run exits 0 (${passRun.stderr || ''})`);
  assert(/installLayoutNote: .*\.ws\/AGENTS\.md/.test(passRun.stdout), 'AC14: the note is printed on the passing human path');
  assert(/warning: project-hub-absent/.test(passRun.stdout), 'AC17: the absent-hub warning is printed on the passing human path');
  assert(/^OK: harness links/m.test(passRun.stdout), 'AC13: a notes-only human run still reports the clean summary line');

  // Same layout with one genuine break: the diagnostics stay visible next to the finding.
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    '# ws-demo\n\n- [hub entry](../../../.ws/AGENTS.md)\n- [unrelated](does-not-exist.md)\n',
    'utf8',
  );
  const failRun = cp.spawnSync(
    process.execPath,
    [path.join(globalRoot, 'ws-check-harness', 'scripts', 'check_harness_links.cjs'), '--repo-root', sandbox],
    { cwd: sandbox, encoding: 'utf8', env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot, WORKFLOW_SKILLS_SHARED_DIR: '', FORCE_COLOR: '0' } },
  );
  assert(failRun.status === 1, `AC16: a genuine break still exits 1 on the human path (${failRun.stderr || ''})`);
  assert(/brokenLinks: .*does-not-exist\.md/.test(failRun.stdout), 'AC16: the genuine break is printed on the human path');
  assert(/installLayoutNote: .*\.ws\/AGENTS\.md/.test(failRun.stdout), 'AC14: install-layout notes stay observable next to a real finding');
  assert(/warning: project-hub-absent/.test(failRun.stdout), 'AC17: the absent-hub warning stays observable next to a real finding');
}

function testUnknownArgumentAndNoOwnScopeDetection() {
  console.log('\n--- testUnknownArgumentAndNoOwnScopeDetection ---');
  const fixture = mkTmp('ws-chk-links-args-');
  const result = cp.spawnSync(process.execPath, [CHECKER, '--json', '--repo-root', fixture, '--bogus'], {
    cwd: fixture,
    encoding: 'utf8',
  });
  assert(result.status === 1, 'NS4: an unknown extra argument exits 1');
  assert(/unknown argument/.test(`${result.stderr || ''}`), 'NS4: the unknown argument reports the existing ERROR message');

  const checkerText = fs.readFileSync(CHECKER, 'utf8');
  assert(
    !checkerText.includes('detect_install_mode'),
    'AC24: the gate adds no scope detection; it consumes the resolved executionScope',
  );
}

function main() {
  testPercentTargetReportsInsteadOfCrashing();
  testResolvedHubCountsForRouting();
  testUnrelatedSkillNotAudited();
  testGlobalOnlySkillsRootAudited();
  testGlobalOnlyHubBindingLiteralsTolerated();
  testGlobalOnlyNonBindingTargetsStayBroken();
  testGlobalOnlyUnrewrittenRuntimeSiblingStaysBroken();
  testProjectScopeHubTargetsValidated();
  testHybridLayoutValidatesHubTargets();
  testHumanPathEmitsInstallLayoutDiagnostics();
  testUnknownArgumentAndNoOwnScopeDetection();
  cleanup();
  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll check-harness link gate tests passed.');
}

main();
