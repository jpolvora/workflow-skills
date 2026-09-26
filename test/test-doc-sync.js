import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, run } = utils;
const catalog = fs.readFileSync(path.join(repoRoot, 'CATALOG.md'), 'utf8');
const skills = fs.readdirSync(path.join(repoRoot, '.agents/skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'ws-shared' && fs.existsSync(path.join(repoRoot, '.agents/skills', entry.name, 'SKILL.md')))
  .map((entry) => entry.name);
for (const skill of skills) assert.match(catalog, new RegExp(`\\\`${skill}\\\``), `catalog includes ${skill}`);
const runtimeCatalog = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/CATALOG.md'), 'utf8');
const runtimeHub = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/AGENTS.md'), 'utf8');
const runtimeHubText = `${runtimeCatalog}\n${runtimeHub}`;
for (const skill of skills) assert.ok(runtimeHubText.includes(`\`${skill}\``), `runtime hub routes ${skill}`);
const configPath = path.join(repoRoot, '.ws/config.json');
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : {};
const featuresMdEnabled = config.tracking?.featuresMdEnabled !== false;
const requiredDocs = [
  'README.md',
  'CATALOG.md',
  'docs/index.html',
  '.ws/AGENTS.md',
  '.agents/skills/ws-shared/runtime/CATALOG.md',
  '.agents/skills/ws-shared/runtime/CROSS-PLATFORM.md',
];
if (featuresMdEnabled) requiredDocs.splice(1, 0, 'FEATURES.md');
for (const relative of requiredDocs) {
  assert.doesNotMatch(fs.readFileSync(path.join(repoRoot, relative), 'utf8'), /^(?:<{7}|={7}|>{7})/m, `${relative} has no conflict marker`);
}
const writeSpec = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-write/SKILL.md'), 'utf8');
assert.match(writeSpec, /Standalone `index\.PRD` gate/, 'write-spec standalone index.PRD gate');
assert.match(writeSpec, /Add to index\.PRD \(Recommended\)/, 'write-spec index.PRD recommended option');
const specIndex = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-index/SKILL.md'), 'utf8');
assert.match(specIndex, /### 4\. `track`/, 'spec-index track mode');
const site = fs.readFileSync(path.join(repoRoot, 'docs/index.html'), 'utf8');
const siteStyles = fs.readFileSync(path.join(repoRoot, 'docs/assets/css/style.css'), 'utf8');
assert.doesNotMatch(site, /id="dependency-graph"|href="#dependency-graph"/, 'landing page omits dependency graph section and links');
assert.doesNotMatch(site, /id="roadmap"|href="#roadmap"/, 'landing page omits roadmap section and links');
assert.doesNotMatch(site, /class="hero-announcement"/, 'landing page omits specialized subagents announcement');
assert.doesNotMatch(site, /Verification advances only at a ledger-derived score/, 'landing page omits redundant verification sentence');
assert.doesNotMatch(site, /id="to-top"/, 'landing page omits scroll-to-top control');
assert.match(siteStyles, /#site-sidebar\s*\{\s*position: fixed;/, 'desktop site sidebar is fixed');
const desktopContentRule = siteStyles.match(/#content\s*\{([^}]*)\}/)?.[1] || '';
const desktopTocRule = siteStyles.match(/#page-toc\s*\{([^}]*)\}/)?.[1] || '';
const tabletStyles = siteStyles.slice(siteStyles.lastIndexOf('@media (max-width: 1280px)'), siteStyles.lastIndexOf('@media (max-width: 1100px)'));
const tabletContentRule = tabletStyles.match(/#content\s*\{([^}]*)\}/)?.[1] || '';
const mobileStyles = siteStyles.slice(siteStyles.lastIndexOf('@media (max-width: 900px)'), siteStyles.lastIndexOf('@media (max-width: 768px)'));
const mobileContentRule = mobileStyles.match(/#content\s*\{([^}]*)\}/)?.[1] || '';
assert.match(desktopContentRule, /grid-column:\s*2;/, 'desktop content stays in the center grid column');
assert.match(desktopTocRule, /grid-column:\s*3;/, 'desktop table of contents stays in the right grid column');
assert.match(tabletContentRule, /grid-column:\s*2;/, 'tablet content stays clear of the fixed sidebar');
assert.match(mobileContentRule, /grid-column:\s*auto;/, 'mobile content returns to document flow');
for (const heading of [
  'Context budgets and progressive disclosure',
  'AC ledger and derived scoring',
  'Atomic Node state runtime',
  'Telemetry and deterministic reporting',
  'Gate granularity and adaptive convergence',
  'Definition of Ready and TDD',
  'Dual memory routing',
]) assert.match(site, new RegExp(heading), `site documents ${heading}`);
const build = run(path.join(repoRoot, 'bin/build-site.js'), ['--check']);
assert.strictEqual(build.status, 0, build.stderr);
const pkgVersion = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version;
assert.match(site, new RegExp(pkgVersion.replace(/\./g, '\\.')), `site includes package version ${pkgVersion}`);
const taskLifecycle = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-task-lifecycle/SKILL.md'), 'utf8');
assert.match(taskLifecycle, /featuresMdEnabled/, 'task-lifecycle honors tracking.featuresMdEnabled');
// Hub autoload contract paths: keyword-map prose must use the managed
// skills-install runtime token, and the generated consumer mirror must carry
// project-relative skills-install prefixes on managed-hub sibling links so
// every relative target resolves.
const runtimeAutoload = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/autoload.md'), 'utf8');
const mirrorAutoload = fs.readFileSync(path.join(repoRoot, '.ws/autoload.md'), 'utf8');
assert.match(runtimeAutoload, /\{skillsRoot\}\/ws-shared\/runtime\/scm-provider-contract\.md/, 'runtime autoload keyword-map prose uses the managed runtime token');
assert.doesNotMatch(runtimeAutoload, /\{sharedDir\}\/runtime\//, 'runtime autoload never resolves through {sharedDir}/runtime');
assert.match(mirrorAutoload, /\{skillsRoot\}\/ws-shared\/runtime\/scm-provider-contract\.md/, 'mirror autoload keyword-map prose uses the managed runtime token');
for (const bare of ['](tools.md)', '](AGENTS.md)', '](scm-provider-contract.md)', '](gates.md)']) {
  assert.ok(!mirrorAutoload.includes(bare), `mirror autoload has no bare ${bare}`);
}
assert.ok(!mirrorAutoload.includes('](runtime/'), 'mirror autoload never links a .ws/runtime copy');
for (const target of ['runtime/tools.md', 'runtime/AGENTS.md', 'runtime/scm-provider-contract.md', 'runtime/gates.md']) {
  assert.ok(fs.existsSync(path.join(repoRoot, '.agents/skills/ws-shared', target)), `mirror link target exists in skills-tree runtime: ${target}`);
}
// Shipped skill docs must not link the package README through a SoT-depth
// relative path: after install it resolves to the consumer root, or nowhere
// on a global install. Link the repository URL instead.
// ws-spec-index/INDEX-TEMPLATE.md is the deliberate exception — its links are
// evaluated after the template is copied into the consumer {specsDir}, so
// they intentionally target the consumer root.
const readmeLinkOffenders = [];
const walkSkillDocs = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'runs' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSkillDocs(full);
    } else if (entry.name.endsWith('.md')) {
      const text = fs.readFileSync(full, 'utf8');
      for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        const target = match[1].split('#')[0].split('?')[0];
        if (target.includes('../') && /(^|[\\/])README\.md$/.test(target)) {
          readmeLinkOffenders.push(full);
          break;
        }
      }
    }
  }
};
walkSkillDocs(path.join(repoRoot, '.agents/skills'));
const allowedReadmeLinks = new Set(['.agents/skills/ws-spec-index/INDEX-TEMPLATE.md']);
for (const offender of readmeLinkOffenders) {
  const rel = path.relative(repoRoot, offender).split(path.sep).join('/');
  assert.ok(allowedReadmeLinks.has(rel), `skill doc links package README via relative path: ${rel}`);
}
console.log('test-doc-sync: ok');
