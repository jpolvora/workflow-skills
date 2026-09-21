/**
 * ws-patterns-generator: skill body, seed script, graph registration,
 * installer exemption, autoload carve-out, and harness tolerance.
 * Run: node test/test-ws-patterns-generator.js
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillDir = path.join(root, '.agents/skills/ws-patterns-generator');
const skillMd = path.join(skillDir, 'SKILL.md');
const seedCjs = path.join(skillDir, 'scripts/seed_generated_skill.cjs');
const binGraphPath = path.join(root, 'bin/skill-dependencies.json');
const sharedGraphPath = path.join(root, '.agents/skills/ws-shared/runtime/skill-dependencies.json');
const configureCjs = path.join(root, '.agents/skills/ws-configure-project/scripts/configure_autoload.cjs');
const catalogPath = path.join(root, 'CATALOG.md');

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

function readFrontmatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  assert(m !== null, 'SKILL.md frontmatter markers');
  return m ? m[1] : '';
}

function runNode(args, options = {}) {
  return cp.spawnSync(process.execPath, args, { encoding: 'utf8', ...options });
}

function makeFixture(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function rmFixture(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// --- AC1: skill body -------------------------------------------------------
assert(fs.existsSync(skillMd), 'SKILL.md exists');
const skill = fs.existsSync(skillMd) ? fs.readFileSync(skillMd, 'utf8') : '';
if (skill) {
  const front = readFrontmatter(skill);
  assert(/^name: ws-patterns-generator$/m.test(front), 'frontmatter name');
  const pkgVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  const binGraph = JSON.parse(fs.readFileSync(binGraphPath, 'utf8'));
  const sharedGraph = JSON.parse(fs.readFileSync(sharedGraphPath, 'utf8'));
  assert(binGraph.packageVersion === pkgVersion, 'bin packageVersion matches package.json');
  assert(sharedGraph.packageVersion === pkgVersion, 'shared packageVersion matches package.json');
  const ver = (front.match(/^version:\s*"?([^"\n]+)"?$/m) || [])[1];
  assert(ver === pkgVersion, `frontmatter version matches packageVersion (${ver})`);
  assert(/invocation_names:[\s\S]*?ws-patterns-generator/.test(front), 'invocation names cover ws-patterns-generator');
  const lines = skill.split('\n');
  const h1 = lines.findIndex((l) => l === '# ws-patterns-generator');
  assert(h1 !== -1, '# ws-patterns-generator heading');
  const afterH1 = lines.slice(h1 + 1).find((l) => l.trim() !== '');
  assert(
    afterH1 === '> When this skill is loaded, output "ws-patterns-generator loaded."',
    'loaded banner directly under heading',
  );
  const stepIdx = lines
    .map((l, i) => (/^\d+\.\s+\*\*/.test(l) ? i : -1))
    .filter((i) => i !== -1);
  assert(stepIdx.length > 0, `numbered steps found (${stepIdx.length})`);
  const missingDone = stepIdx.filter((si, k) => {
    const end = k + 1 < stepIdx.length ? stepIdx[k + 1] : lines.length;
    return !lines.slice(si, end).some((l) => /Done when:/.test(l));
  });
  assert(missingDone.length === 0, 'every numbered step has Done when:');
}

// --- AC2: graph membership + integrity + catalog ---------------------------
{
  const binGraph = JSON.parse(fs.readFileSync(binGraphPath, 'utf8'));
  const sharedGraph = JSON.parse(fs.readFileSync(sharedGraphPath, 'utf8'));
  for (const [label, graph] of [['bin', binGraph], ['shared', sharedGraph]]) {
    assert(graph.packages.workflows.skills.includes('ws-patterns-generator'), `${label} workflows package`);
    const deps = graph.dependencies['ws-patterns-generator'] || [];
    for (const id of ['ws-configure-project', 'ws-self-learning', 'ws-changelog', 'ws-secrets-leak-review']) {
      assert(deps.includes(id), `${label} dep ${id}`);
    }
    const external = graph.externalSkills || [];
    const gen = external.find((e) => (typeof e === 'string' ? e : e.id) === 'ws-project-patterns');
    assert(gen !== undefined, `${label} externalSkills lists ws-project-patterns`);
    assert(gen && gen.generatorManaged === true, `${label} ws-project-patterns flagged generatorManaged`);
  }
  const check = runNode([path.join(root, 'bin/generate-skill-integrity.js'), '--check'], { cwd: root });
  assert(check.status === 0, `integrity --check exit 0${check.status === 0 ? '' : `: ${check.stderr}`}`);
  const catalog = fs.readFileSync(catalogPath, 'utf8');
  assert(catalog.includes('ws-patterns-generator'), 'CATALOG inventory/router rows');
}

// --- AC3: seed script behavior ---------------------------------------------
const MARKER = 'UNIQUE_MARKER_378_ALPHA';
if (fs.existsSync(seedCjs)) {
  const fixture = makeFixture('ws-pg-seed-');
  try {
    fs.writeFileSync(path.join(fixture, 'README.md'), `# fixture\n${MARKER}\n`, 'utf8');
    const r1 = runNode([seedCjs, '--repo-root', fixture], { cwd: root });
    assert(r1.status === 0, `seed exit 0 (got ${r1.status}: ${r1.stderr || ''})`);
    const genBody = path.join(fixture, '.ws/ws-project-patterns/SKILL.md');
    assert(fs.existsSync(genBody), 'seed writes generated body');
    assert(
      !fs.existsSync(path.join(fixture, '.agents/skills/ws-project-patterns')),
      'seed never writes the generated body into a skills root',
    );
    const body = fs.existsSync(genBody) ? fs.readFileSync(genBody, 'utf8') : '';
    assert((body.match(/^## /gm) || []).length >= 3, 'skeleton has headings');
    assert(body.includes('stop ws-project-patterns'), 'skeleton documents opt-out');
    assert(!body.includes(MARKER), 'skeleton has zero project claims');
    const before = body;
    const r2 = runNode([seedCjs, '--repo-root', fixture], { cwd: root });
    assert(r2.status === 0, 'seed rerun exit 0');
    assert(fs.readFileSync(genBody, 'utf8') === before, 'seed rerun byte-identical');
    fs.writeFileSync(genBody, 'SENTINEL-KEPT\n', 'utf8');
    const r3 = runNode([seedCjs, '--repo-root', fixture], { cwd: root });
    assert(r3.status === 0, 'seed over existing exit 0');
    assert(fs.readFileSync(genBody, 'utf8') === 'SENTINEL-KEPT\n', 'seed never overwrites existing body');
    const dry = makeFixture('ws-pg-dry-');
    try {
      const r4 = runNode([seedCjs, '--repo-root', dry, '--dry-run'], { cwd: root });
      assert(r4.status === 0, 'seed --dry-run exit 0');
      assert(!fs.existsSync(path.join(dry, '.ws/ws-project-patterns/SKILL.md')), '--dry-run writes nothing');
      assert(/planned|would write|dry-run/i.test(r4.stdout), '--dry-run reports planned write');
    } finally {
      rmFixture(dry);
    }
    // AC1: a configured pathTokens.sharedDir relocates the hub root.
    const customHub = makeFixture('ws-pg-customhub-');
    try {
      fs.mkdirSync(path.join(customHub, '.ws'), { recursive: true });
      fs.writeFileSync(
        path.join(customHub, '.ws/config.json'),
        JSON.stringify({ pathTokens: { sharedDir: 'custom-hub' } }),
        'utf8',
      );
      const r5 = runNode([seedCjs, '--repo-root', customHub], { cwd: root });
      assert(r5.status === 0, `seed honors pathTokens.sharedDir (got ${r5.status}: ${r5.stderr || ''})`);
      assert(
        fs.existsSync(path.join(customHub, 'custom-hub/ws-project-patterns/SKILL.md')),
        'seed writes under the configured sharedDir',
      );
      assert(
        !fs.existsSync(path.join(customHub, '.ws/ws-project-patterns/SKILL.md')),
        'seed does not fall back to .ws when sharedDir is configured',
      );
    } finally {
      rmFixture(customHub);
    }
    const bad1 = runNode([seedCjs, '--repo-root', path.join(fixture, 'nope')], { cwd: root });
    assert(bad1.status !== 0, 'seed rejects missing --repo-root');
    const fileAsRoot = path.join(fixture, 'README.md');
    const bad2 = runNode([seedCjs, '--repo-root', fileAsRoot], { cwd: root });
    assert(bad2.status !== 0, 'seed rejects file --repo-root');
    const bad3 = runNode([seedCjs], { cwd: root });
    assert(bad3.status !== 0, 'seed requires --repo-root');
  } finally {
    rmFixture(fixture);
  }
  // Symlink containment: a hub root linked outside the repo must be refused;
  // a link staying inside the repo still seeds.
  {
    const repo = makeFixture('ws-pg-sym-');
    const outside = makeFixture('ws-pg-out-');
    try {
      fs.mkdirSync(path.join(repo, '.ws'), { recursive: true });
      const linkPath = path.join(repo, '.ws');
      let linked = false;
      try {
        fs.symlinkSync(outside, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
        linked = true;
      } catch (e) {
        console.log(`NOTE symlink-containment test skipped: ${e.code || e.message}`);
      }
      if (linked) {
        const r = runNode([seedCjs, '--repo-root', repo], { cwd: root });
        assert(r.status !== 0, `seed refuses symlinked hub root (got ${r.status})`);
        assert(/outside the repo skills root/.test(r.stderr || ''), 'refusal message names containment');
        assert(!fs.existsSync(path.join(outside, 'ws-project-patterns/SKILL.md')), 'no write escapes through symlink');
        fs.rmSync(linkPath, { recursive: true, force: true });
        const inner = path.join(repo, 'linked-hub');
        fs.mkdirSync(inner, { recursive: true });
        fs.symlinkSync(inner, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
        const r2 = runNode([seedCjs, '--repo-root', repo], { cwd: root });
        assert(r2.status === 0, `seed allows in-repo symlinked hub root (got ${r2.status}: ${r2.stderr || ''})`);
        assert(fs.existsSync(path.join(inner, 'ws-project-patterns/SKILL.md')), 'in-repo link seeds through');
      }
    } finally {
      rmFixture(repo);
      rmFixture(outside);
    }
  }
  // Symlink containment, linked generated-skill dir (PR #383 thread 2): a link
  // at the generated skill's own parent must be resolved before the gate, and
  // the write refused when it points outside the repo.
  {
    const repo = makeFixture('ws-pg-childsym-');
    const outside = makeFixture('ws-pg-childout-');
    try {
      fs.mkdirSync(path.join(repo, '.ws'), { recursive: true });
      const linkPath = path.join(repo, '.ws/ws-project-patterns');
      let linked = false;
      try {
        fs.symlinkSync(outside, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
        linked = true;
      } catch (e) {
        console.log(`NOTE linked-generated-dir test skipped: ${e.code || e.message}`);
      }
      if (linked) {
        const r = runNode([seedCjs, '--repo-root', repo], { cwd: root });
        assert(r.status !== 0, `seed refuses symlinked generated dir (got ${r.status})`);
        assert(/outside the repo skills root/.test(r.stderr || ''), 'refusal message names containment');
        assert(!fs.existsSync(path.join(outside, 'SKILL.md')), 'no write escapes through linked generated dir');
        fs.rmSync(linkPath, { recursive: true, force: true });
        const inner = path.join(repo, 'patterns-inside');
        fs.mkdirSync(inner, { recursive: true });
        fs.symlinkSync(inner, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
        const r2 = runNode([seedCjs, '--repo-root', repo], { cwd: root });
        assert(r2.status === 0, `seed allows in-repo linked generated dir (got ${r2.status}: ${r2.stderr || ''})`);
        assert(fs.existsSync(path.join(inner, 'SKILL.md')), 'in-repo child link seeds through');
      }
    } finally {
      rmFixture(repo);
      rmFixture(outside);
    }
  }
  // Dangling leaf symlink (PR #383 thread 3): SKILL.md linked to a non-existent
  // external path must be refused and must never be created outside the repo.
  {
    const repo = makeFixture('ws-pg-leafsym-');
    const outside = makeFixture('ws-pg-leafout-');
    try {
      const generatedDir = path.join(repo, '.ws/ws-project-patterns');
      fs.mkdirSync(generatedDir, { recursive: true });
      const linkPath = path.join(generatedDir, 'SKILL.md');
      const escaped = path.join(outside, 'escaped.md');
      let linked = false;
      try {
        fs.symlinkSync(escaped, linkPath, 'file');
        linked = true;
      } catch (e) {
        console.log(`NOTE dangling-leaf test skipped: ${e.code || e.message}`);
      }
      if (linked) {
        const r = runNode([seedCjs, '--repo-root', repo], { cwd: root });
        assert(r.status !== 0, `seed refuses dangling leaf symlink (got ${r.status})`);
        assert(/outside the repo skills root/.test(r.stderr || ''), 'refusal message names containment');
        assert(!fs.existsSync(escaped), 'no file created outside through dangling leaf');
        fs.rmSync(linkPath, { force: true });
        const inner = path.join(repo, 'leaf-inside.md');
        fs.writeFileSync(inner, 'keep\n', 'utf8');
        fs.symlinkSync(inner, linkPath, 'file');
        const r2 = runNode([seedCjs, '--repo-root', repo], { cwd: root });
        assert(r2.status === 0, `seed allows in-repo leaf symlink (got ${r2.status}: ${r2.stderr || ''})`);
        assert(fs.readFileSync(inner, 'utf8') === 'keep\n', 'in-repo leaf target untouched');
      }
    } finally {
      rmFixture(repo);
      rmFixture(outside);
    }
  }
} else {
  assert(false, 'seed_generated_skill.cjs exists');
}

// --- AC3: installer exclusion ----------------------------------------------
{
  const cli = fs.readFileSync(path.join(root, 'bin/cli.js'), 'utf8');
  assert(cli.includes('excludeExternalSkillIds(listInstallableSkills(targetSkillsDir))'), 'disk scan excludes external ids');
  assert(/scanInstalledSkillsOnDisk\(\)/.test(cli), 'manifest paths consult disk scan');
  const consumer = makeFixture('ws-pg-consumer-');
  try {
    const skillsDir = path.join(consumer, '.agents/skills');
    fs.mkdirSync(path.join(skillsDir, 'ws-tdah'), { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'ws-tdah/SKILL.md'), '# ws-tdah\n', 'utf8');
    fs.mkdirSync(path.join(skillsDir, 'ws-project-patterns'), { recursive: true });
    const sentinel = '# ws-project-patterns\nSENTINEL-BYTES-378\n';
    fs.writeFileSync(path.join(skillsDir, 'ws-project-patterns/SKILL.md'), sentinel, 'utf8');
    fs.mkdirSync(path.join(skillsDir, 'ws-shared/runtime'), { recursive: true });
    fs.copyFileSync(sharedGraphPath, path.join(skillsDir, 'ws-shared/runtime/skill-dependencies.json'));
    fs.mkdirSync(path.join(consumer, '.ws'), { recursive: true });
    fs.writeFileSync(
      path.join(consumer, '.ws/installed-skills.json'),
      JSON.stringify({ skills: ['ws-tdah'], selected: ['ws-tdah'] }),
      'utf8',
    );
    const un = runNode([path.join(root, 'bin/cli.js'), 'uninstall', '--skills', 'ws-tdah', '--yes'], {
      cwd: consumer,
    });
    assert(un.status === 0, `fixture uninstall exit 0 (got ${un.status}: ${un.stderr || ''})`);
    assert(!fs.existsSync(path.join(skillsDir, 'ws-tdah')), 'uninstalled skill removed');
    assert(
      fs.existsSync(path.join(skillsDir, 'ws-project-patterns/SKILL.md')) &&
        fs.readFileSync(path.join(skillsDir, 'ws-project-patterns/SKILL.md'), 'utf8') === sentinel,
      'generated tree preserved byte-identical',
    );
    const manifest = JSON.parse(fs.readFileSync(path.join(consumer, '.ws/installed-skills.json'), 'utf8'));
    assert(!(manifest.skills || []).includes('ws-project-patterns'), 'generated id stays out of manifest');
  } finally {
    rmFixture(consumer);
  }
}

// --- AC4: autoload carve-out -------------------------------------------------
function writeAutoloadFixture(dir, rows) {
  const table = ['| Skill | Path | Trigger |', '|-------|------|---------|', ...rows].join('\n');
  const doc = ['# Autoload (fixture)', '', '## Always-applied skills', '', table, '', '## Optional skills', ''].join('\n');
  fs.mkdirSync(path.join(dir, '.ws'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ws/autoload.md'), doc, 'utf8');
  fs.mkdirSync(path.join(dir, 'bin'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'bin/skill-dependencies.json'),
    JSON.stringify({
      externalSkills: [
        { id: 'ws-memo', sourcePackage: 'spec-memo' },
        { id: 'ws-project-patterns', sourcePackage: 'consumer', generatorManaged: true },
      ],
    }),
    'utf8',
  );
}
function autoloadRowIds(doc) {
  return doc.split('\n').filter((l) => /^\| `ws-[a-z0-9-]+` \|/.test(l)).map((l) => l.match(/`([^`]+)`/)[1]);
}
{
  const fx = makeFixture('ws-pg-autoload-');
  try {
    fs.mkdirSync(path.join(fx, '.ws/ws-project-patterns'), { recursive: true });
    fs.writeFileSync(path.join(fx, '.ws/ws-project-patterns/SKILL.md'), '# ws-project-patterns\n', 'utf8');
    writeAutoloadFixture(fx, [
      '| `ws-tdah` | `.agents/skills/ws-tdah/SKILL.md` | Every prompt |',
      '| `ws-memo` | `{globalSkillsRoot}/ws-memo/SKILL.md` | Vault ops |',
      '| `ws-project-patterns` | `.ws/ws-project-patterns/SKILL.md` | Project patterns |',
    ]);
    const w1 = runNode([configureCjs, '--write-autoload', '--repo-root', fx], { cwd: root });
    assert(w1.status === 0, `configure --write-autoload exit 0 (got ${w1.status}: ${w1.stderr || ''})`);
    const after = fs.readFileSync(path.join(fx, '.ws/autoload.md'), 'utf8');
    const ids = autoloadRowIds(after);
    assert(ids.includes('ws-project-patterns'), 'generated row preserved when tree exists');
    assert(ids.filter((i) => i === 'ws-project-patterns').length === 1, 'generated row never duplicated');
    assert(
      after.includes('`.ws/ws-project-patterns/SKILL.md`'),
      'generated row points at the hub path',
    );
    assert(!ids.includes('ws-memo'), 'ws-memo rows still dropped');
    const w2 = runNode([configureCjs, '--write-autoload', '--repo-root', fx], { cwd: root });
    assert(w2.status === 0, 'configure rerun exit 0');
    const twice = autoloadRowIds(fs.readFileSync(path.join(fx, '.ws/autoload.md'), 'utf8'));
    assert(twice.filter((i) => i === 'ws-project-patterns').length === 1, 'rerun keeps single row');
    fs.rmSync(path.join(fx, '.ws/ws-project-patterns'), { recursive: true, force: true });
    const w3 = runNode([configureCjs, '--write-autoload', '--repo-root', fx], { cwd: root });
    assert(w3.status === 0, 'configure after tree removal exit 0');
    assert(!autoloadRowIds(fs.readFileSync(path.join(fx, '.ws/autoload.md'), 'utf8')).includes('ws-project-patterns'), 'row dropped when tree absent');
  } finally {
    rmFixture(fx);
  }
  const fxc = makeFixture('ws-pg-check-');
  try {
    fs.mkdirSync(path.join(fxc, '.ws/ws-project-patterns'), { recursive: true });
    fs.writeFileSync(path.join(fxc, '.ws/ws-project-patterns/SKILL.md'), '# ws-project-patterns\n', 'utf8');
    writeAutoloadFixture(fxc, [
      '| `ws-memo` | `{globalSkillsRoot}/ws-memo/SKILL.md` | Vault ops |',
      '| `ws-project-patterns` | `.ws/ws-project-patterns/SKILL.md` | Project patterns |',
    ]);
    const chk = runNode([configureCjs, '--check', '--repo-root', fxc, '--json'], { cwd: root });
    assert(chk.status === 0, `configure --check exit 0 (got ${chk.status})`);
    const findings = (JSON.parse(chk.stdout).check || {}).findings || [];
    const msgs = findings.map((f) => f.message || '').join('\n');
    assert(!msgs.includes('ws-project-patterns'), 'check raises no finding for managed row');
    assert(msgs.includes('ws-memo'), 'check still flags unpackaged companion row');
  } finally {
    rmFixture(fxc);
  }
  // Custom pathTokens.sharedDir: the autoload row must live under the configured hub.
  const fxh = makeFixture('ws-pg-customhub-autoload-');
  try {
    fs.mkdirSync(path.join(fxh, '.ws'), { recursive: true });
    fs.writeFileSync(
      path.join(fxh, '.ws/config.json'),
      JSON.stringify({ pathTokens: { sharedDir: 'custom-hub' } }),
      'utf8',
    );
    fs.mkdirSync(path.join(fxh, 'custom-hub/ws-project-patterns'), { recursive: true });
    fs.writeFileSync(path.join(fxh, 'custom-hub/ws-project-patterns/SKILL.md'), '# ws-project-patterns\n', 'utf8');
    fs.mkdirSync(path.join(fxh, 'bin'), { recursive: true });
    fs.writeFileSync(
      path.join(fxh, 'bin/skill-dependencies.json'),
      JSON.stringify({
        externalSkills: [
          { id: 'ws-memo', sourcePackage: 'spec-memo' },
          { id: 'ws-project-patterns', sourcePackage: 'consumer', generatorManaged: true },
        ],
      }),
      'utf8',
    );
    fs.writeFileSync(
      path.join(fxh, 'custom-hub/autoload.md'),
      ['# Autoload (fixture)', '', '## Always-applied skills', '', '| Skill | Path | Trigger |', '|-------|------|---------|', '| `ws-project-patterns` | `custom-hub/ws-project-patterns/SKILL.md` | Project patterns |', '', '## Optional skills', ''].join('\n'),
      'utf8',
    );
    const wc = runNode([configureCjs, '--write-autoload', '--repo-root', fxh], { cwd: root });
    assert(wc.status === 0, `configure --write-autoload honors sharedDir (got ${wc.status}: ${wc.stderr || ''})`);
    const hubRow = fs.readFileSync(path.join(fxh, 'custom-hub/autoload.md'), 'utf8');
    assert(hubRow.includes('`custom-hub/ws-project-patterns/SKILL.md`'), 'row rewritten under the configured hub');
    assert(!fs.existsSync(path.join(fxh, '.ws/autoload.md')), 'configure never writes .ws/autoload.md when sharedDir is configured');
    const cchk = runNode([configureCjs, '--check', '--repo-root', fxh, '--json'], { cwd: root });
    const cfinds = (JSON.parse(cchk.stdout).check || {}).findings || [];
    assert(
      !cfinds.some((f) => (f.message || '').includes('ws-project-patterns')),
      'custom-hub row is not flagged by --check',
    );
    const wr = runNode([configureCjs, '--write-root-agents', '--repo-root', fxh], { cwd: root });
    assert(wr.status === 0, `configure --write-root-agents honors sharedDir (got ${wr.status}: ${wr.stderr || ''})`);
    const rootAg = fs.readFileSync(path.join(fxh, 'AGENTS.md'), 'utf8');
    assert(rootAg.includes('custom-hub/autoload.md'), 'root AGENTS.md points at the configured hub autoload');
    assert(!rootAg.includes('(.ws/autoload.md)'), 'root AGENTS.md never links the default hub when sharedDir is configured');
  } finally {
    rmFixture(fxh);
  }
  // Global-hybrid: an explicit --global-skills-root must still resolve the
  // generator-managed id from the global dependency graph.
  const fxg = makeFixture('ws-pg-globalhub-');
  const groutex = makeFixture('ws-pg-globalroot-');
  try {
    fs.mkdirSync(path.join(groutex, 'ws-shared/runtime'), { recursive: true });
    fs.copyFileSync(sharedGraphPath, path.join(groutex, 'ws-shared/runtime/skill-dependencies.json'));
    fs.mkdirSync(path.join(fxg, '.ws/ws-project-patterns'), { recursive: true });
    fs.writeFileSync(path.join(fxg, '.ws/ws-project-patterns/SKILL.md'), '# ws-project-patterns\n', 'utf8');
    fs.writeFileSync(
      path.join(fxg, '.ws/autoload.md'),
      ['# Autoload (fixture)', '', '## Always-applied skills', '', '| Skill | Path | Trigger |', '|-------|------|---------|', '| `ws-project-patterns` | `.ws/ws-project-patterns/SKILL.md` | Project patterns |', '', '## Optional skills', ''].join('\n'),
      'utf8',
    );
    const gr = runNode([configureCjs, '--write-autoload', '--repo-root', fxg, '--global-skills-root', groutex], { cwd: root });
    assert(gr.status === 0, `global-hybrid --write-autoload exit 0 (got ${gr.status}: ${gr.stderr || ''})`);
    const gtext = fs.readFileSync(path.join(fxg, '.ws/autoload.md'), 'utf8');
    assert(gtext.includes('`.ws/ws-project-patterns/SKILL.md`'), 'global-hybrid run keeps the hub row');
    assert(
      !/\{skillsRoot\}\/ws-project-patterns/.test(gtext),
      'global-hybrid run never emits a skillsRoot token for the generated row',
    );
  } finally {
    rmFixture(fxg);
    rmFixture(groutex);
  }
  // A nested configured hub must render links relative to the hub directory.
  const fxn = makeFixture('ws-pg-nestedhub-');
  try {
    fs.mkdirSync(path.join(fxn, '.ws'), { recursive: true });
    fs.writeFileSync(
      path.join(fxn, '.ws/config.json'),
      JSON.stringify({ pathTokens: { sharedDir: 'config/hub' } }),
      'utf8',
    );
    fs.mkdirSync(path.join(fxn, 'config/hub/ws-project-patterns'), { recursive: true });
    fs.writeFileSync(path.join(fxn, 'config/hub/ws-project-patterns/SKILL.md'), '# ws-project-patterns\n', 'utf8');
    fs.mkdirSync(path.join(fxn, '.agents/skills/ws-shared/runtime'), { recursive: true });
    fs.writeFileSync(path.join(fxn, '.agents/skills/ws-shared/runtime/tools.md'), '# tools\n', 'utf8');
    fs.writeFileSync(
      path.join(fxn, '.agents/skills/ws-shared/runtime/autoload.md'),
      [
        '# Autoload (template)',
        '',
        '## Always-applied skills',
        '',
        '| Skill | Path | Trigger |',
        '|-------|------|---------|',
        '| `ws-tdah` | `{skillsRoot}/ws-tdah/SKILL.md` | Every prompt |',
        '',
        '[runtime tools](runtime/tools.md)',
        '[skill](../ws-tdah/SKILL.md)',
        '',
        '## Optional skills',
        '',
      ].join('\n'),
      'utf8',
    );
    fs.mkdirSync(path.join(fxn, '.agents/skills/ws-tdah'), { recursive: true });
    fs.writeFileSync(path.join(fxn, '.agents/skills/ws-tdah/SKILL.md'), '# ws-tdah\n', 'utf8');
    fs.mkdirSync(path.join(fxn, 'bin'), { recursive: true });
    fs.writeFileSync(
      path.join(fxn, 'bin/skill-dependencies.json'),
      JSON.stringify({ externalSkills: [{ id: 'ws-project-patterns', sourcePackage: 'consumer', generatorManaged: true }] }),
      'utf8',
    );
    const rn = runNode([configureCjs, '--write-autoload', '--repo-root', fxn], { cwd: root });
    assert(rn.status === 0, `nested hub --write-autoload exit 0 (got ${rn.status}: ${rn.stderr || ''})`);
    const hubDir = path.join(fxn, 'config/hub');
    const nestedText = fs.readFileSync(path.join(hubDir, 'autoload.md'), 'utf8');
    const links = [...nestedText.matchAll(/\]\(([^)]+)\)/g)]
      .map((m) => m[1])
      .filter((l) => !l.startsWith('{') && !/^https?:/.test(l));
    const broken = links.filter((l) => !fs.existsSync(path.resolve(hubDir, l.split('#')[0])));
    assert(broken.length === 0, `nested hub links resolve from the hub dir: ${broken.join(', ')}`);
    const rr = runNode([configureCjs, '--write-autoload', '--repo-root', fxn], { cwd: root });
    assert(
      rr.status === 0 && fs.readFileSync(path.join(hubDir, 'autoload.md'), 'utf8') === nestedText,
      'nested hub render converges on rerun',
    );
  } finally {
    rmFixture(fxn);
  }
  // A configured hub that escapes the repository must never receive writes.
  const fxe = makeFixture('ws-pg-escapehub-');
  try {
    fs.mkdirSync(path.join(fxe, '.ws'), { recursive: true });
    fs.writeFileSync(
      path.join(fxe, '.ws/config.json'),
      JSON.stringify({ pathTokens: { sharedDir: '..' } }),
      'utf8',
    );
    writeAutoloadFixture(fxe, ['| `ws-tdah` | `.agents/skills/ws-tdah/SKILL.md` | Every prompt |']);
    const outsideDir = path.resolve(fxe, '..');
    const outsideAutoload = path.join(outsideDir, 'autoload.md');
    const hadOutside = fs.existsSync(outsideAutoload);
    const we = runNode([configureCjs, '--write-autoload', '--repo-root', fxe], { cwd: root });
    assert(we.status === 0, `escaping sharedDir does not crash (got ${we.status}: ${we.stderr || ''})`);
    if (!hadOutside) {
      assert(!fs.existsSync(outsideAutoload), 'no autoload written outside the repo through sharedDir');
    }
    assert(fs.existsSync(path.join(fxe, '.ws/autoload.md')), 'writes fail closed to the default in-repo hub');
    const echk = runNode([configureCjs, '--check', '--repo-root', fxe, '--json'], { cwd: root });
    const efinds = (JSON.parse(echk.stdout).check || {}).findings || [];
    assert(
      efinds.some((f) => /resolves outside the repository/.test(f.message || '')),
      'check reports the escaping sharedDir as critical',
    );
  } finally {
    rmFixture(fxe);
  }

  const fxs = makeFixture('ws-pg-linkedbody-');
  const outdir = makeFixture('ws-pg-linkedbody-out-');
  try {
    const outsideTarget = path.join(outdir, 'body.md');
    fs.writeFileSync(outsideTarget, '# external\n', 'utf8');
    writeAutoloadFixture(fxs, ['| `ws-project-patterns` | `.ws/ws-project-patterns/SKILL.md` | Project patterns |']);
    fs.mkdirSync(path.join(fxs, '.ws/ws-project-patterns'), { recursive: true });
    let linked = false;
    try {
      fs.symlinkSync(outsideTarget, path.join(fxs, '.ws/ws-project-patterns/SKILL.md'), 'file');
      linked = true;
    } catch (e) {
      console.log(`NOTE linked hub body test skipped: ${e.code || e.message}`);
    }
    if (linked) {
      const schk = runNode([configureCjs, '--check', '--repo-root', fxs, '--json'], { cwd: root });
      const sfinds = (JSON.parse(schk.stdout).check || {}).findings || [];
      assert(
        sfinds.some((f) => (f.message || '').includes('ws-project-patterns')),
        'check flags a hub body linked outside the repo',
      );
    }
  } finally {
    rmFixture(fxs);
    rmFixture(outdir);
  }
  // A same-name row outside the configured hub must be rejected.
  const fxw = makeFixture('ws-pg-wrongpath-');
  try {
    fs.mkdirSync(path.join(fxw, '.ws/ws-project-patterns'), { recursive: true });
    fs.writeFileSync(path.join(fxw, '.ws/ws-project-patterns/SKILL.md'), '# ws-project-patterns\n', 'utf8');
    writeAutoloadFixture(fxw, [
      '| `ws-project-patterns` | `../unrelated/ws-project-patterns/SKILL.md` | Project patterns |',
    ]);
    const wchk = runNode([configureCjs, '--check', '--repo-root', fxw, '--json'], { cwd: root });
    const wfinds = (JSON.parse(wchk.stdout).check || {}).findings || [];
    assert(
      wfinds.some((f) => /must point at the configured shared hub/.test(f.message || '')),
      'check rejects a same-name row outside the hub',
    );
  } finally {
    rmFixture(fxw);
  }
  assert(skill.includes('stop ws-project-patterns'), 'generator documents opt-out');
  assert(/first run|seed/i.test(skill) && /append/i.test(skill), 'generator appends autoload row at seed');
}

// --- AC5/AC6/AC7/AC8/AC12: protocol rules -----------------------------------
assert(/--dry-run[\s\S]{0,400}?writes nothing|without writing any file/.test(skill), 'dry-run rule');
assert(/tolerat/i.test(skill) && /missing/i.test(skill), 'missing-source tolerance rule');
assert(/`added`/.test(skill) && /`rewrote`/.test(skill) && /`unchanged`/.test(skill), 'summary labels');
assert(/evidence pointer/i.test(skill), 'evidence pointer rule');
assert(/byte-identical|idempotent/i.test(skill), 'idempotency rule');
assert(/changelog/i.test(skill), 'changelog rule');

// --- AC9: secrets ------------------------------------------------------------
{
  const secretRe = /ghp_[A-Za-z0-9]{10,}|BEGIN (RSA )?PRIVATE KEY|AKIA[0-9A-Z]{16}|xox[bap]-/;
  for (const p of [skillMd, seedCjs]) {
    if (fs.existsSync(p)) assert(!secretRe.test(fs.readFileSync(p, 'utf8')), `no secret patterns in ${path.basename(p)}`);
  }
  assert(/anonymiz/i.test(skill), 'anonymization rule');
  const scan = runNode(
    [path.join(root, '.agents/skills/ws-secrets-leak-review/scripts/secrets_scanner.cjs')],
    { cwd: root },
  );
  assert(scan.status === 0, `secrets scan exit 0 (got ${scan.status})`);
}

// --- AC10: portable prose ------------------------------------------------------
{
  const hostRe = /\bcursor\b|\bvscode\b|\bvisual studio\b|\bcopilot\b|\bwindsurf\b|\bantigravity\b|\bzed\b|\bcodex cli\b|\bgemini cli\b/i;
  const hit = skill.match(hostRe);
  assert(hit === null, `no host product names${hit ? `: ${hit[0]}` : ''}`);
  assert(skill.includes('{skillsRoot}'), 'path tokens used');
  assert(skill.includes('user-gate'), 'user-gate vocabulary');
}

// --- AC11: script invariants ---------------------------------------------------
{
  const dirEntries = fs.existsSync(skillDir) ? fs.readdirSync(skillDir, { recursive: true }) : [];
  assert(!dirEntries.some((e) => String(e).endsWith('.py')), 'no .py under new skill');
  if (fs.existsSync(seedCjs)) {
    const scan = runNode(
      [path.join(root, '.agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs'), '--stack', 'typescript-node', '--files', seedCjs, '--json'],
      { cwd: root },
    );
    assert(scan.status === 0, `invariant scan exit 0 (got ${scan.status}: ${scan.stderr || scan.stdout})`);
  }
}

// --- AC13: harness checks ------------------------------------------------------
for (const check of ['check_duplicates.cjs', 'check_harness_links.cjs', 'check_hub_separation.cjs', 'check_shell_quoting.cjs', 'check_unique_runtime.cjs']) {
  const r = runNode(
    [path.join(root, '.agents/skills/ws-check-harness/scripts', check), '--repo-root', root],
    { cwd: root },
  );
  assert(r.status === 0, `${check} exit 0${r.status === 0 ? '' : `: ${(r.stdout || '') + (r.stderr || '')}`.slice(0, 400)}`);
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll ws-patterns-generator checks passed.');
