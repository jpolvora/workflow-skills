/**
 * Autoload configure + harness expectations (shared-autoload-md AC9).
 * Run: node test/test-autoload-configure.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(
  REPO_ROOT,
  '.agents/skills/ws-configure-project/scripts/configure_autoload.py',
);
const PYTHON = process.env.PYTHON || 'python';

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
      /* ignore */
    }
  }
}

function runPy(args, opts = {}) {
  const result = cp.spawnSync(PYTHON, ['-X', 'utf8', SCRIPT, ...args], {
    encoding: 'utf8',
    cwd: opts.cwd || REPO_ROOT,
    env: { ...process.env, ...(opts.env || {}) },
  });
  return result;
}

function seedConsumerTree(root, { withLocalSkills = true, withAutoload = true } = {}) {
  const shared = path.join(root, '.agents', 'skills', 'ws-shared');
  fs.mkdirSync(shared, { recursive: true });
  const template = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-shared/autoload.md'),
    'utf8',
  );
  if (withAutoload) {
    fs.writeFileSync(path.join(shared, 'autoload.md'), template, 'utf8');
  }
  fs.writeFileSync(
    path.join(shared, 'AGENTS.md'),
    '# Shared hub\n\nOn-demand defaults.\n',
    'utf8',
  );

  const skills = [
    'ws-senior-developer',
    'ws-self-learning',
    'ws-patterns',
    'ws-changelog',
    'ws-fable-method',
    'ws-tdah',
  ];
  if (withLocalSkills) {
    for (const id of skills) {
      const d = path.join(root, '.agents', 'skills', id);
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'SKILL.md'), `# ${id}\n`, 'utf8');
    }
  }
  return { shared, skills };
}

function parseJsonOut(result) {
  if (result.status !== 0 && !result.stdout) {
    fail(`script failed: ${result.stderr || result.error}`);
    return null;
  }
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    fail(`bad json: ${e.message}\n${result.stdout}`);
    return null;
  }
}

// --- tests ---

{
  const { HUB_WHITELIST } = await import(
    pathToFileURL(path.join(REPO_ROOT, 'bin', 'install-rules.js')).href
  );
  assert(HUB_WHITELIST.includes('autoload.md'), 'HUB_WHITELIST includes autoload.md');
}

{
  const root = mkTmp('ws-autoload-local-');
  seedConsumerTree(root, { withLocalSkills: true });
  const result = runPy([
    '--repo-root',
    root,
    '--write-autoload',
    '--write-root-agents',
    '--json',
  ]);
  const data = parseJsonOut(result);
  if (data) {
    const autoText = fs.readFileSync(
      path.join(root, '.agents/skills/ws-shared/autoload.md'),
      'utf8',
    );
    const rootText = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    assert(
      autoText.includes('.agents/skills/ws-senior-developer/SKILL.md'),
      'local install emits .agents/skills paths in autoload.md',
    );
    assert(
      rootText.includes('autoload.md') && rootText.includes('ws-shared/AGENTS.md'),
      'root AGENTS.md references shared hub + autoload.md',
    );
    assert(
      !/[A-Za-z]:\\/.test(autoText) && !/[A-Za-z]:\\/.test(rootText),
      'no Windows absolute paths in emitted markdown',
    );
    assert(
      !/\/Users\//.test(autoText) && !/\/Users\//.test(rootText),
      'no /Users absolute paths in emitted markdown',
    );
    assert(
      !/[A-Za-z]:\//.test(autoText) && !/[A-Za-z]:\//.test(rootText),
      'no Windows forward-slash absolute paths in emitted markdown',
    );
    assert(
      !/\/opt\//.test(autoText) && !/\/opt\//.test(rootText),
      'no /opt absolute paths in emitted markdown',
    );
    assert(
      autoText.includes('`ws-patterns`') &&
        !autoText.includes('ws-patterns-backend') &&
        !autoText.includes('ws-patterns-frontend'),
      '--section patterns / --write-autoload emits ws-patterns only',
    );
    const alwaysTable =
      (autoText.match(
        /\| Skill \| Path \| Trigger \|\r?\n\|[-| ]+\|\r?\n((?:\|[^\r\n]*\|\r?\n)+)/,
      ) || [])[1] || '';
    assert(
      alwaysTable.length > 0 && !/`ws-task-lifecycle`/.test(alwaysTable),
      'AC49: omitted autoloadTaskLifecycle → --write-autoload does not add ws-task-lifecycle',
    );
  }
}

{
  const root = mkTmp('ws-autoload-global-');
  const globalRoot = mkTmp('ws-autoload-global-skills-');
  seedConsumerTree(root, { withLocalSkills: false });
  for (const id of [
    'ws-senior-developer',
    'ws-self-learning',
    'ws-patterns',
    'ws-changelog',
    'ws-fable-method',
    'ws-tdah',
  ]) {
    const d = path.join(globalRoot, id);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'SKILL.md'), `# ${id}\n`, 'utf8');
  }
  const result = runPy([
    '--repo-root',
    root,
    '--global-skills-root',
    globalRoot,
    '--write-autoload',
    '--write-root-agents',
    '--emit-paths',
    '--json',
  ]);
  const data = parseJsonOut(result);
  if (data) {
    const paths = (data.skills || []).map((s) => s.path);
    assert(
      paths.every((p) => p.startsWith('{globalSkillsRoot}/')),
      'global-only install emits {globalSkillsRoot} token paths',
    );
    const autoText = fs.readFileSync(
      path.join(root, '.agents/skills/ws-shared/autoload.md'),
      'utf8',
    );
    assert(
      autoText.includes('{globalSkillsRoot}/ws-tdah/SKILL.md'),
      'autoload.md stores global token path',
    );
    assert(!path.isAbsolute(paths[0].replace(/\{[^}]+\}/g, 'x')), 'token paths are not absolute');
  }
}

{
  const root = mkTmp('ws-autoload-nocheck-');
  seedConsumerTree(root, { withLocalSkills: true });
  // no root AGENTS.md
  const result = runPy(['--repo-root', root, '--check', '--json']);
  const data = parseJsonOut(result);
  if (data) {
    assert(result.status === 0, 'check exits 0 without root AGENTS.md');
    assert(data.check?.ok === true, 'check ok when autoload paths resolve locally');
    assert(data.check?.rootAgentsPresent === false, 'root AGENTS.md absence is OK');
  }
}

{
  const root = mkTmp('ws-autoload-missing-');
  seedConsumerTree(root, { withLocalSkills: false });
  const emptyGlobal = mkTmp('ws-autoload-empty-global-');
  const result = runPy([
    '--repo-root',
    root,
    '--global-skills-root',
    emptyGlobal,
    '--check',
    '--json',
  ]);
  const data = parseJsonOut(result);
  if (data) {
    const warnings = (data.check?.findings || []).filter((f) => f.severity === 'warning');
    assert(warnings.length >= 1, 'missing Always-applied skills → warning findings');
    assert(
      warnings.some((w) => /missing/i.test(w.message)),
      'warning suggests missing skill',
    );
  }
}

{
  const phases = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-check-harness/PHASES.md'),
    'utf8',
  );
  const skill = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-check-harness/SKILL.md'),
    'utf8',
  );
  assert(
    /autoload\.md/.test(phases) && /intentional consumer root override/i.test(phases),
    'PHASES.md documents autoload dual-hub override',
  );
  assert(
    /autoload\.md/.test(skill) && /Missing root `AGENTS\.md` is OK/i.test(skill),
    'ws-check-harness SKILL.md: missing root OK + autoload override',
  );
  assert(
    /Install mode.*upstream/i.test(skill) &&
      /Skills scan root/i.test(skill) &&
      /\.agents\/skills/.test(skill) &&
      !/Skills scan root.*src\/skills/i.test(skill),
    'ws-check-harness SKILL.md: upstream Skills scan root is .agents/skills (not src/skills)',
  );
  assert(
    /Install mode.*consumer/i.test(phases) &&
      /Ignore stray `src\/skills`/i.test(phases),
    'PHASES.md: consumer mode ignores stray src/skills',
  );
  const cfg = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-configure-project/SKILL.md'),
    'utf8',
  );
  assert(
    /--section autoload/.test(cfg) && /configure_autoload\.py/.test(cfg),
    'ws-configure-project documents --section autoload + helper',
  );
  const harnessEvals = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, '.agents/skills/ws-check-harness/evals/evals.json'),
      'utf8',
    ),
  );
  assert(
    (harnessEvals.evals || []).some(
      (e) =>
        /Install mode: upstream/i.test(e.expected_output || '') &&
        /\.agents\/skills/.test(e.expected_output || ''),
    ),
    'ws-check-harness evals cover upstream Install mode + .agents/skills scan root',
  );
  assert(
    (harnessEvals.evals || []).some((e) =>
      /Install mode: consumer/i.test(e.expected_output || ''),
    ),
    'ws-check-harness evals cover consumer Install mode',
  );
}

{
  const root = mkTmp('ws-autoload-protect-');
  seedConsumerTree(root, { withLocalSkills: true });
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Custom consumer hub\n', 'utf8');
  const blocked = runPy([
    '--repo-root',
    root,
    '--write-root-agents',
    '--json',
  ]);
  assert(blocked.status !== 0, 'refuses overwrite of non-generated root AGENTS.md');
  const forced = runPy([
    '--repo-root',
    root,
    '--write-root-agents',
    '--force',
    '--json',
  ]);
  const data = parseJsonOut(forced);
  if (data) {
    const text = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    assert(
      text.includes('<!-- generated by configure_autoload.py -->'),
      'forced write stamps generated marker',
    );
    assert(
      fs.existsSync(path.join(root, 'AGENTS.md.bak')),
      'forced overwrite creates AGENTS.md.bak',
    );
  }
}

{
  // Yes path + pre-existing non-generated root: refuse before persisting defaults.autoload
  const root = mkTmp('ws-autoload-yes-refuse-');
  seedConsumerTree(root, { withLocalSkills: true });
  seedConfigExample(root);
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Product-owned root hub\n', 'utf8');
  const refused = runPy([
    '--repo-root',
    root,
    '--set-autoload',
    'true',
    '--write-autoload',
    '--write-root-agents',
    '--json',
  ]);
  assert(refused.status !== 0, 'AC11: Yes+non-generated root refuses without --force');
  const cfgPath = path.join(root, '.agents/skills/ws-shared/config.json');
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    assert(
      cfg.defaults?.autoload !== true,
      'AC11: refused Yes path does not leave defaults.autoload true',
    );
  } else {
    ok('AC11: refused Yes path left config.json absent (flag not persisted)');
  }
  const check = runPy(['--repo-root', root, '--check', '--json']);
  const checkData = parseJsonOut(check);
  if (checkData) {
    assert(
      checkData.check?.effectiveAutoload === false,
      'AC11: effectiveAutoload false after refused Yes path',
    );
    assert(check.status === 0, 'AC11: check OK after refused Yes (flag not true)');
  }
}

{
  // Preserve consumer-customized Always-applied membership + triggers; only refresh paths.
  const root = mkTmp('ws-autoload-preserve-');
  seedConsumerTree(root, { withLocalSkills: true });
  const autoPath = path.join(root, '.agents/skills/ws-shared/autoload.md');
  let autoText = fs.readFileSync(autoPath, 'utf8');
  autoText = autoText.replace(
    /(\| Skill \| Path \| Trigger \|\r?\n\|[-| ]+\|\r?\n)(?:\|.*\|\r?\n)+/,
    '$1| `ws-tdah` | `{skillsRoot}/ws-tdah/SKILL.md` | Custom trigger keep me |\n| `ws-changelog` | `{skillsRoot}/ws-changelog/SKILL.md` | Custom changelog trigger |\n',
  );
  fs.writeFileSync(autoPath, autoText, 'utf8');
  // Ensure only those two skills exist so path emission stays valid.
  for (const id of ['ws-tdah', 'ws-changelog']) {
    const d = path.join(root, '.agents', 'skills', id);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'SKILL.md'), `# ${id}\n`, 'utf8');
  }
  const result = runPy(['--repo-root', root, '--write-autoload', '--json']);
  const data = parseJsonOut(result);
  if (data) {
    const after = fs.readFileSync(autoPath, 'utf8');
    assert(
      after.includes('Custom trigger keep me') && after.includes('Custom changelog trigger'),
      'write-autoload preserves custom triggers',
    );
    assert(
      after.includes('ws-tdah') && after.includes('ws-changelog'),
      'write-autoload preserves custom membership',
    );
    const tableOnly = after.slice(
      after.indexOf('| Skill | Path | Trigger |'),
      after.search(/\r?\n## /),
    );
    assert(
      !/`ws-senior-developer`/.test(tableOnly),
      'write-autoload does not reintroduce default skills when customized',
    );
    assert(
      /ws-senior-developer/.test(after),
      'write-autoload keeps non-table mentions of default skills intact',
    );
    assert(
      after.includes('.agents/skills/ws-tdah/SKILL.md'),
      'write-autoload refreshes portable local paths for preserved rows',
    );
    assert(data.autoload?.preservedMembership === true, 'reports preservedMembership');
  }
}

{
  // Swapped skill/path must warn even when both skills exist and path is portable.
  const root = mkTmp('ws-autoload-mismatch-');
  seedConsumerTree(root, { withLocalSkills: true });
  const autoPath = path.join(root, '.agents/skills/ws-shared/autoload.md');
  let autoText = fs.readFileSync(autoPath, 'utf8');
  autoText = autoText.replace(
    /(\| Skill \| Path \| Trigger \|\r?\n\|[-| ]+\|\r?\n)(?:\|.*\|\r?\n)+/,
    '$1| `ws-tdah` | `.agents/skills/ws-changelog/SKILL.md` | Every prompt |\n',
  );
  fs.writeFileSync(autoPath, autoText, 'utf8');
  const result = runPy(['--repo-root', root, '--check', '--json']);
  const data = parseJsonOut(result);
  if (data) {
    const warnings = (data.check?.findings || []).filter((f) => f.severity === 'warning');
    assert(
      warnings.some((w) => /different skill/i.test(w.message)),
      'check warns when Always-applied path targets a different skill id',
    );
  }
}

{
  // Absolute-path detection covers Windows forward-slash and POSIX /opt roots.
  const root = mkTmp('ws-autoload-abspath-');
  seedConsumerTree(root, { withLocalSkills: true });
  const autoPath = path.join(root, '.agents/skills/ws-shared/autoload.md');
  let autoText = fs.readFileSync(autoPath, 'utf8');
  autoText = autoText.replace(
    /(\| Skill \| Path \| Trigger \|\r?\n\|[-| ]+\|\r?\n)(?:\|.*\|\r?\n)+/,
    [
      '$1| `ws-tdah` | `C:/Users/me/.agents/skills/ws-tdah/SKILL.md` | Every prompt |',
      '| `ws-changelog` | `/opt/agents/skills/ws-changelog/SKILL.md` | Every prompt |',
      '',
    ].join('\n'),
  );
  fs.writeFileSync(autoPath, autoText, 'utf8');
  const result = runPy(['--repo-root', root, '--check', '--json']);
  const data = parseJsonOut(result);
  if (data) {
    assert(result.status !== 0, 'check exits non-zero on absolute paths');
    assert(data.check?.ok === false, 'check.ok false when absolute paths present');
    const criticals = (data.check?.findings || []).filter((f) => f.severity === 'critical');
    assert(
      criticals.some((c) => /Absolute filesystem path/i.test(c.message)),
      'check reports critical for C:/ and /opt absolute paths',
    );
  }
}

function seedConfigExample(root) {
  const shared = path.join(root, '.agents', 'skills', 'ws-shared');
  fs.mkdirSync(shared, { recursive: true });
  fs.copyFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-shared/config.json.example'),
    path.join(shared, 'config.json.example'),
  );
}

{
  // AC11 (1): omitted / missing config → effective false
  const rootMissing = mkTmp('ws-autoload-eff-missing-');
  seedConsumerTree(rootMissing, { withLocalSkills: true });
  const checkMissing = runPy(['--repo-root', rootMissing, '--check', '--json']);
  const dataMissing = parseJsonOut(checkMissing);
  if (dataMissing) {
    assert(
      dataMissing.check?.effectiveAutoload === false,
      'AC11: missing config → effectiveAutoload false',
    );
    assert(checkMissing.status === 0, 'AC11: missing config + missing root check exits 0');
  }

  const rootOmitted = mkTmp('ws-autoload-eff-omitted-');
  seedConsumerTree(rootOmitted, { withLocalSkills: true });
  seedConfigExample(rootOmitted);
  const cfgPath = path.join(rootOmitted, '.agents/skills/ws-shared/config.json');
  const example = JSON.parse(
    fs.readFileSync(
      path.join(rootOmitted, '.agents/skills/ws-shared/config.json.example'),
      'utf8',
    ),
  );
  if (example.defaults && 'autoload' in example.defaults) {
    delete example.defaults.autoload;
  }
  fs.writeFileSync(cfgPath, JSON.stringify(example, null, 2) + '\n', 'utf8');
  const checkOmitted = runPy(['--repo-root', rootOmitted, '--check', '--json']);
  const dataOmitted = parseJsonOut(checkOmitted);
  if (dataOmitted) {
    assert(
      dataOmitted.check?.effectiveAutoload === false,
      'AC11: omitted defaults.autoload → effectiveAutoload false',
    );
  }
}

{
  // AC11 (2): set true + root
  const root = mkTmp('ws-autoload-set-true-');
  seedConsumerTree(root, { withLocalSkills: true });
  seedConfigExample(root);
  const result = runPy([
    '--repo-root',
    root,
    '--set-autoload',
    'true',
    '--write-autoload',
    '--write-root-agents',
    '--json',
  ]);
  const data = parseJsonOut(result);
  if (data) {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(root, '.agents/skills/ws-shared/config.json'), 'utf8'),
    );
    assert(cfg.defaults?.autoload === true, 'AC11: --set-autoload true writes defaults.autoload');
    assert(fs.existsSync(path.join(root, 'AGENTS.md')), 'AC11: true path writes root AGENTS.md');
    assert(
      fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8').includes('autoload.md'),
      'AC11: root AGENTS.md references autoload.md',
    );
    const check = runPy(['--repo-root', root, '--check', '--json']);
    const checkData = parseJsonOut(check);
    if (checkData) {
      assert(checkData.check?.effectiveAutoload === true, 'AC11: effectiveAutoload true after set');
      assert(check.status === 0 && checkData.check?.ok === true, 'AC11: check OK when true + root');
    }
  }
}

{
  // AC11 (3): set false without requiring root
  const root = mkTmp('ws-autoload-set-false-');
  seedConsumerTree(root, { withLocalSkills: true });
  seedConfigExample(root);
  const result = runPy(['--repo-root', root, '--set-autoload', 'false', '--json']);
  const data = parseJsonOut(result);
  if (data) {
    const cfg = JSON.parse(
      fs.readFileSync(path.join(root, '.agents/skills/ws-shared/config.json'), 'utf8'),
    );
    assert(cfg.defaults?.autoload === false, 'AC11: --set-autoload false writes defaults.autoload');
    assert(!fs.existsSync(path.join(root, 'AGENTS.md')), 'AC11: false path does not require root');
  }
}

{
  // AC11 (4): check critical when true + missing/incomplete root
  const rootMissing = mkTmp('ws-autoload-true-noroot-');
  seedConsumerTree(rootMissing, { withLocalSkills: true });
  seedConfigExample(rootMissing);
  runPy(['--repo-root', rootMissing, '--set-autoload', 'true', '--json']);
  const checkMissing = runPy(['--repo-root', rootMissing, '--check', '--json']);
  const dataMissing = parseJsonOut(checkMissing);
  if (dataMissing) {
    assert(checkMissing.status !== 0, 'AC11: true + missing root → non-zero exit');
    assert(dataMissing.check?.ok === false, 'AC11: true + missing root → check.ok false');
    assert(
      (dataMissing.check?.findings || []).some(
        (f) => f.severity === 'critical' && /missing/i.test(f.message),
      ),
      'AC11: critical when true + missing root',
    );
  }

  const rootIncomplete = mkTmp('ws-autoload-true-incomplete-');
  seedConsumerTree(rootIncomplete, { withLocalSkills: true });
  seedConfigExample(rootIncomplete);
  runPy(['--repo-root', rootIncomplete, '--set-autoload', 'true', '--json']);
  fs.writeFileSync(path.join(rootIncomplete, 'AGENTS.md'), '# Custom hub without autoload ref\n', 'utf8');
  const checkIncomplete = runPy(['--repo-root', rootIncomplete, '--check', '--json']);
  const dataIncomplete = parseJsonOut(checkIncomplete);
  if (dataIncomplete) {
    assert(checkIncomplete.status !== 0, 'AC11: true + incomplete root → non-zero exit');
    assert(
      (dataIncomplete.check?.findings || []).some(
        (f) => f.severity === 'critical' && /autoload\.md/i.test(f.message),
      ),
      'AC11: critical when true + root lacks autoload.md instruction',
    );
  }
}

{
  // AC11 (5): check OK when false + missing root
  const root = mkTmp('ws-autoload-false-noroot-');
  seedConsumerTree(root, { withLocalSkills: true });
  seedConfigExample(root);
  runPy(['--repo-root', root, '--set-autoload', 'false', '--json']);
  const check = runPy(['--repo-root', root, '--check', '--json']);
  const data = parseJsonOut(check);
  if (data) {
    assert(data.check?.effectiveAutoload === false, 'AC11: effectiveAutoload false after set false');
    assert(check.status === 0 && data.check?.ok === true, 'AC11: false + missing root check OK');
    assert(data.check?.rootAgentsPresent === false, 'AC11: root still absent when false');
  }
}

{
  // AC49: explicit false → --write-autoload does not add ws-task-lifecycle
  const root = mkTmp('ws-autoload-tl-false-');
  seedConsumerTree(root, { withLocalSkills: true });
  seedConfigExample(root);
  const example = JSON.parse(
    fs.readFileSync(
      path.join(root, '.agents/skills/ws-shared/config.json.example'),
      'utf8',
    ),
  );
  example.defaults = { ...(example.defaults || {}), autoloadTaskLifecycle: false };
  fs.writeFileSync(
    path.join(root, '.agents/skills/ws-shared/config.json'),
    JSON.stringify(example, null, 2) + '\n',
    'utf8',
  );
  const result = runPy(['--repo-root', root, '--write-autoload', '--json']);
  const data = parseJsonOut(result);
  if (data) {
    const autoText = fs.readFileSync(
      path.join(root, '.agents/skills/ws-shared/autoload.md'),
      'utf8',
    );
    const alwaysTable =
      (autoText.match(
        /\| Skill \| Path \| Trigger \|\r?\n\|[-| ]+\|\r?\n((?:\|[^\r\n]*\|\r?\n)+)/,
      ) || [])[1] || '';
    assert(
      result.status === 0 &&
        alwaysTable.length > 0 &&
        !/`ws-task-lifecycle`/.test(alwaysTable),
      'AC49: autoloadTaskLifecycle false → --write-autoload does not add ws-task-lifecycle',
    );
  }
}

{
  // AC50: true → --write-autoload includes ws-task-lifecycle
  const root = mkTmp('ws-autoload-tl-true-');
  seedConsumerTree(root, { withLocalSkills: true });
  seedConfigExample(root);
  const skillDir = path.join(root, '.agents', 'skills', 'ws-task-lifecycle');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# ws-task-lifecycle\n', 'utf8');
  const result = runPy([
    '--repo-root',
    root,
    '--set-autoload-task-lifecycle',
    'true',
    '--write-autoload',
    '--json',
  ]);
  const data = parseJsonOut(result);
  if (data) {
    const autoText = fs.readFileSync(
      path.join(root, '.agents/skills/ws-shared/autoload.md'),
      'utf8',
    );
    const cfg = JSON.parse(
      fs.readFileSync(path.join(root, '.agents/skills/ws-shared/config.json'), 'utf8'),
    );
    const alwaysTable =
      (autoText.match(
        /\| Skill \| Path \| Trigger \|\r?\n\|[-| ]+\|\r?\n((?:\|[^\r\n]*\|\r?\n)+)/,
      ) || [])[1] || '';
    assert(
      result.status === 0 && /`ws-task-lifecycle`/.test(alwaysTable),
      'AC50: autoloadTaskLifecycle true → --write-autoload includes ws-task-lifecycle',
    );
    assert(
      autoText.includes('.agents/skills/ws-task-lifecycle/SKILL.md'),
      'AC50: local stub emits .agents/skills path for ws-task-lifecycle',
    );
    assert(
      cfg.defaults?.autoloadTaskLifecycle === true && cfg.defaults?.autoload !== true,
      'AC47: --set-autoload-task-lifecycle true does not set defaults.autoload true',
    );
  }
}

cleanup();

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll autoload configure tests passed.');
