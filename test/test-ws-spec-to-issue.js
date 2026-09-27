/**
 * ws-spec-to-issue skill + helper contract tests.
 * Run: node test/test-ws-spec-to-issue.js
 */
import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot, temp, run, write } = utils;

const skillFile = path.join(repoRoot, '.agents/skills/ws-spec-to-issue/SKILL.md');
const helper = path.join(repoRoot, '.agents/skills/ws-spec-to-issue/scripts/run_spec_to_issue.cjs');

// 1. Skill frontmatter / banner / no version stamp.
assert.ok(fs.existsSync(skillFile), 'SKILL.md exists');
const skill = fs.readFileSync(skillFile, 'utf8');
assert.match(skill, /^name:\s*ws-spec-to-issue/m, 'frontmatter name');
assert.ok(!/^version:\s/m.test(skill.split('---')[1] || ''), 'no version frontmatter');
assert.match(skill, /^disable-model-invocation:\s*true/m, 'disable-model-invocation true');
for (const alias of ['spec-to-issue', 'ws-spec-to-issue']) {
  assert.ok(skill.includes(`- ${alias}`), `invocation_names includes ${alias}`);
}
assert.match(skill, /> When this skill is loaded, output "ws-spec-to-issue loaded\."/, 'loaded banner');

// 2. Registration in both dependency manifests.
const depsBin = JSON.parse(fs.readFileSync(path.join(repoRoot, 'bin/skill-dependencies.json'), 'utf8'));
const depsShared = JSON.parse(fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/skill-dependencies.json'), 'utf8'));
for (const [label, deps] of [['bin', depsBin], ['ws-shared', depsShared]]) {
  assert.ok(deps.packages.workflows.skills.includes('ws-spec-to-issue'), `${label} workflows package includes ws-spec-to-issue`);
  assert.ok('ws-spec-to-issue' in deps.dependencies, `${label} dependencies map has ws-spec-to-issue`);
  assert.ok(deps.dependencies['ws-spec-to-issue'].includes('ws-spec-write'), `${label} dependency names ws-spec-write`);
  assert.ok(deps.dependencies['ws-spec-manager'].includes('ws-spec-to-issue'), `${label} manager routes ws-spec-to-issue`);
}

// 3. Helper --help documents the dry-run contract.
const help = run(helper, ['--help']);
assert.strictEqual(help.status, 0, help.stderr);
assert.match(help.stdout, /--dry-run/, 'help documents --dry-run');
assert.match(help.stdout, /--title/, 'help documents --title');

function makeRoot(prefix, config) {
  const root = temp(prefix);
  write(path.join(root, '.ws/config.json'), JSON.stringify(config));
  return root;
}

function treeSnapshot(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      out.push(path.relative(root, full).replace(/\\/g, '/'));
      if (entry.isDirectory()) walk(full);
    }
  };
  walk(root);
  return out.sort();
}

// 4. GitHub dry-run resolves the tracker and prints the payload.
const ghRoot = makeRoot('ws-spec-to-issue-gh-', { providers: { active: 'github' } });
const ghRun = run(helper, ['--title', 'Add export', '--body', 'Add an export button.', '--dry-run', '--repo-root', ghRoot]);
assert.strictEqual(ghRun.status, 0, ghRun.stderr);
const ghPayload = JSON.parse(ghRun.stdout);
assert.strictEqual(ghPayload.status, 'dry-run', 'github dry-run status');
assert.strictEqual(ghPayload.provider, 'github', 'github provider resolved');
assert.match(ghPayload.body, /Add an export button\./, 'body echoed');

// 5. Azure DevOps dry-run via project.repoUrl host + explicit type.
const adoRoot = makeRoot('ws-spec-to-issue-ado-', { project: { repoUrl: 'https://dev.azure.com/org/project' } });
const adoRun = run(helper, ['--title', 'Add export', '--body', 'Add an export button.', '--dry-run', '--repo-root', adoRoot]);
assert.strictEqual(adoRun.status, 0, adoRun.stderr);
const adoPayload = JSON.parse(adoRun.stdout);
assert.strictEqual(adoPayload.provider, 'azure-devops', 'ado provider resolved from repoUrl');
assert.strictEqual(adoPayload.type, 'User Story', 'ado default work-item type');

// 6. providers.active local with no tracker fallback STOPs and writes nothing.
const localRoot = makeRoot('ws-spec-to-issue-local-', { providers: { active: 'local' } });
const before = treeSnapshot(localRoot);
const localRun = run(helper, ['--title', 'Idea', '--body', 'Something.', '--dry-run', '--repo-root', localRoot]);
assert.notStrictEqual(localRun.status, 0, 'local with no tracker exits non-zero');
assert.match(localRun.stderr, /No active tracker/, 'named tracker error');
assert.deepStrictEqual(treeSnapshot(localRoot), before, 'no local artifact written on stop');

// 7. Anonymization guard fails closed on an absolute path.
const leakRoot = makeRoot('ws-spec-to-issue-leak-', { providers: { active: 'github' } });
const leakRun = run(helper, ['--title', 'CI', '--body', 'move C:\\Users\\jdoe\\secret\\deploy.ps1 into CI', '--dry-run', '--repo-root', leakRoot]);
assert.strictEqual(leakRun.status, 2, 'absolute path rejected');
assert.match(leakRun.stderr, /absolute-windows-path/, 'guard names the leak class');
assert.deepStrictEqual(treeSnapshot(leakRoot), ['.ws', '.ws/config.json'], 'guard writes nothing');

console.log('test-ws-spec-to-issue: ok');
