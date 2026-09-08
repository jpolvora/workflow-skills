/**
 * US-288: unpackaged spec-memo companions stay off installer membership
 * and out of Always-applied / Layer SoT literals.
 * Run: node test/test-external-companion-skills.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const PYTHON = process.env.PYTHON || 'python';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function loadGraph(rel) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));
}

function alwaysAppliedIds(text) {
  const section = text.split('## Always-applied')[1] || '';
  const until = section.split(/\n## /)[0];
  const ids = [];
  for (const line of until.split('\n')) {
    const m = line.match(/^\| `([a-z0-9-]+)` \|/);
    if (m) ids.push(m[1]);
  }
  return ids;
}

function layerBlock(catalog) {
  const cut = catalog.indexOf('## Task router');
  return cut === -1 ? catalog : catalog.slice(0, cut);
}

const binGraph = loadGraph('bin/skill-dependencies.json');
const sharedGraph = loadGraph('.agents/skills/ws-shared/runtime/skill-dependencies.json');
for (const graph of [binGraph, sharedGraph]) {
  const packaged = new Set([
    ...(graph.packages?.workflows?.skills || []),
    ...(graph.packages?.extra?.skills || []),
  ]);
  assert(!packaged.has('ws-memo'), 'ws-memo must not be in workflows/extra packages');
  assert(
    !packaged.has('ws-session-tracking'),
    'ws-session-tracking must not be in workflows/extra packages',
  );
  const external = (graph.externalSkills || []).map((item) =>
    typeof item === 'string' ? item : item.id,
  );
  assert(external.includes('ws-memo'), 'externalSkills must include ws-memo');
  assert(
    external.includes('ws-session-tracking'),
    'externalSkills must include ws-session-tracking',
  );
}

const autoload = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-shared/runtime/autoload.md'),
  'utf8',
);
const alwaysIds = alwaysAppliedIds(autoload);
assert(!alwaysIds.includes('ws-memo'), 'Always-applied must not list ws-memo');
assert(
  !alwaysIds.includes('ws-session-tracking'),
  'Always-applied must not list ws-session-tracking',
);
assert(
  autoload.includes('## External companion skills'),
  'autoload.md needs External companion skills section',
);

const configurePy = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-configure-project/scripts/configure_autoload.py'),
  'utf8',
);
assert(
  configurePy.includes('drop_external_companion_members'),
  'configure_autoload.py must drop external companions from Always-applied writes',
);
assert(
  !/DEFAULT_ALWAYS_APPLIED[\s\S]*ws-memo/.test(configurePy),
  'DEFAULT_ALWAYS_APPLIED must not include ws-memo',
);

const consumerCatalog = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-shared/runtime/CATALOG.md'),
  'utf8',
);
assert(
  !consumerCatalog.includes('../../../bin/skill-dependencies.json'),
  'consumer CATALOG membership must not use ../../../bin/skill-dependencies.json',
);
assert(
  /Membership is \[`skill-dependencies.json`\]\(skill-dependencies.json\)/.test(consumerCatalog),
  'consumer CATALOG membership should link same-folder skill-dependencies.json',
);

for (const rel of ['CATALOG.md', '.agents/skills/ws-shared/runtime/CATALOG.md']) {
  const catalog = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  const layers = layerBlock(catalog);
  assert(
    !layers.includes('.agents/skills/ws-memo/SKILL.md'),
    `${rel} Layer tables must not cite SoT ws-memo path`,
  );
  assert(
    !layers.includes('.agents/skills/ws-session-tracking/SKILL.md'),
    `${rel} Layer tables must not cite SoT ws-session-tracking path`,
  );
  assert(
    /ws-memo.*external/s.test(catalog),
    `${rel} task router must mark ws-memo as external`,
  );
}

const phases = fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-check-harness/PHASES.md'),
  'utf8',
);
assert(phases.includes('External companion skills'), 'PHASES.md documents external companions');
assert(phases.includes('externalSkills'), 'PHASES.md references externalSkills');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-ext-companion-'));
try {
  const skillsRoot = path.join(tmp, '.agents', 'skills');
  fs.mkdirSync(path.join(skillsRoot, 'ws-memo'), { recursive: true });
  fs.writeFileSync(path.join(skillsRoot, 'ws-memo', 'SKILL.md'), '---\nname: ws-memo\n---\n', 'utf8');
  fs.mkdirSync(path.join(skillsRoot, 'ws-session-tracking'), { recursive: true });
  fs.writeFileSync(
    path.join(skillsRoot, 'ws-session-tracking', 'SKILL.md'),
    '---\nname: ws-session-tracking\n---\n',
    'utf8',
  );
  const update = cp.spawnSync(process.execPath, [path.join(repoRoot, 'bin/cli.js'), 'update', '--yes'], {
    cwd: tmp,
    encoding: 'utf8',
    timeout: 120000,
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  const manifestPath = path.join(skillsRoot, 'ws-shared', 'installed-skills.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const listed = manifest.skills || [];
    assert(!listed.includes('ws-memo'), `bootstrap must not track ws-memo: ${listed.join(',')}`);
    assert(
      !listed.includes('ws-session-tracking'),
      `bootstrap must not track ws-session-tracking: ${listed.join(',')}`,
    );
  } else {
    assert(
      update.status === 0 || /No matching skills|No skills directory/i.test(`${update.stdout}${update.stderr}`),
      `update should skip or write hub; status=${update.status}\n${update.stdout}\n${update.stderr}`,
    );
  }

  const poisoned = path.join(tmp, 'poison-autoload');
  fs.mkdirSync(path.join(poisoned, '.agents', 'skills', 'ws-shared', 'runtime'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, '.agents/skills/ws-shared/runtime/autoload.md'),
    path.join(poisoned, '.agents/skills/ws-shared/autoload.md'),
  );
  fs.copyFileSync(
    path.join(repoRoot, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
    path.join(poisoned, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
  );
  let text = fs.readFileSync(path.join(poisoned, '.agents/skills/ws-shared/autoload.md'), 'utf8');
  if (!text.includes('| `ws-memo` | `{skillsRoot}/ws-memo/SKILL.md` | Session start |')) {
    text = text.replace(
      '| `ws-megabrain` | `{skillsRoot}/ws-megabrain/SKILL.md` |',
      '| `ws-memo` | `{skillsRoot}/ws-memo/SKILL.md` | Session start |\n| `ws-megabrain` | `{skillsRoot}/ws-megabrain/SKILL.md` |',
    );
  }
  fs.writeFileSync(path.join(poisoned, '.agents/skills/ws-shared/autoload.md'), text, 'utf8');
  assert(text.includes('| `ws-memo` | `{skillsRoot}/ws-memo/SKILL.md` | Session start |'), 'poison insert failed');
  const script = path.join(
    repoRoot,
    '.agents/skills/ws-configure-project/scripts/configure_autoload.py',
  );
  const checkArgs = ['--check', '--json', '--repo-root', poisoned];
  let check = { status: 1, stdout: '', stderr: '' };
  for (const spec of [
    { cmd: PYTHON, prefix: [] },
    { cmd: 'py', prefix: ['-3'] },
    { cmd: 'python3', prefix: [] },
    { cmd: 'python', prefix: [] },
  ]) {
    if (!spec.cmd) continue;
    const attempt = cp.spawnSync(spec.cmd, [...spec.prefix, script, ...checkArgs], {
      encoding: 'utf8',
    });
    if (attempt.stdout && attempt.stdout.trim().startsWith('{')) {
      check = attempt;
      break;
    }
  }
  assert(
    check.stdout && check.stdout.trim().startsWith('{'),
    `configure_autoload --check JSON missing\n${check.stderr}\n${check.stdout}`,
  );
  const payload = JSON.parse(check.stdout || '{}');
  const findings = payload.check?.findings || payload.findings || [];
  const messages = findings.map((f) => f.message || '').join('\n');
  assert(
    /external companion `ws-memo`/i.test(messages),
    `configure_autoload --check should warn when Always-applied lists ws-memo\n${messages}\n${check.stderr}`,
  );
  assert(
    !/Always-applied skill `ws-memo` missing/i.test(messages),
    `external companion must not also get Install/missing-skill guidance\n${messages}`,
  );

  const rootArgs = ['--write-root-agents', '--repo-root', poisoned];
  let wroteRoot = { status: 1, stdout: '', stderr: '' };
  for (const spec of [
    { cmd: PYTHON, prefix: [] },
    { cmd: 'py', prefix: ['-3'] },
    { cmd: 'python3', prefix: [] },
    { cmd: 'python', prefix: [] },
  ]) {
    if (!spec.cmd) continue;
    const attempt = cp.spawnSync(spec.cmd, [...spec.prefix, script, ...rootArgs], {
      encoding: 'utf8',
    });
    if (attempt.status === 0) {
      wroteRoot = attempt;
      break;
    }
    wroteRoot = attempt;
  }
  assert(
    wroteRoot.status === 0,
    `write-root-agents failed\n${wroteRoot.stderr}\n${wroteRoot.stdout}`,
  );
  const rootAgents = fs.readFileSync(path.join(poisoned, 'AGENTS.md'), 'utf8');
  assert(
    !/\| `ws-memo` \|/.test(rootAgents),
    'write-root-agents must drop poisoned external Always-applied rows',
  );
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('test-external-companion-skills: ok');
