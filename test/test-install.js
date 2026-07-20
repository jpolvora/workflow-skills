import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDir = path.resolve(__dirname, '..');

const useLocal = process.argv.includes('--local');
const rootSkillsDir = path.resolve(__dirname, '../.agents/skills');
const testSkillsDir = path.resolve(__dirname, '.agents/skills');

const ignoredPatterns = [
  /__pycache__/,
  /[\\/]runs([\\/]|$)/,
  /\.gitignore$/,
  /\.npmignore$/,
  /config\.json$/,
  /(^|[\\/])shared[\\/]STACK\.md$/,
  /(^|[\\/])shared[\\/]stack\.md$/,
  /(^|[\\/])shared[\\/]MEMORY\.md$/,
  /(^|[\\/])shared[\\/]CHANGELOG\.md$/,
  /(^|[\\/])shared[\\/]installed-skills\.json$/,
  /(^|[\\/])shared[\\/]skill-integrity-local\.json$/,
  /(^|[\\/])shared[\\/]memory([\\/]|$)/,
  /(^|[\\/])shared[\\/]MEMORY\.md\.template$/,
  /(^|[\\/])shared[\\/]CHANGELOG\.md\.template$/,
  /(^|[\\/])self-learning[\\/]MEMORY\.md$/,
  /(^|[\\/])self-learning[\\/]memory([\\/]|$)/
];

function getFilesRecursive(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push({ path: filePath, isDir: true });
      results = results.concat(getFilesRecursive(filePath));
    } else {
      results.push({ path: filePath, isDir: false });
    }
  }
  return results;
}

function shouldInclude(relPath) {
  const parts = relPath.split(path.sep);
  if (parts.length < 2) return false;
  return !ignoredPatterns.some((pattern) => pattern.test(relPath));
}

function listSkillDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) =>
    fs.statSync(path.join(dir, name)).isDirectory()
  );
}

function resolveTarball() {
  const tgzFiles = fs
    .readdirSync(parentDir)
    .filter((f) => f.startsWith('workflow-skills-') && f.endsWith('.tgz'))
    .sort();
  // Prefer exact package version when available
  let pkgVersion = '0.0.1';
  try {
    pkgVersion = JSON.parse(fs.readFileSync(path.join(parentDir, 'package.json'), 'utf8')).version;
  } catch {
    /* ignore */
  }
  const preferred = `workflow-skills-${pkgVersion}.tgz`;
  const match = tgzFiles.find((f) => f === preferred) || tgzFiles[tgzFiles.length - 1];
  return match ? path.join(parentDir, match) : '';
}

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

console.log('============================================================');
console.log('  Workflow Skills - Installation Test Suite');
console.log('============================================================');
console.log(`Mode:          ${useLocal ? 'Local (development release)' : 'Remote (github:jpolvora/workflow-skills)'}`);
console.log(`Source Skills: ${rootSkillsDir}`);
console.log(`Test Skills:   ${testSkillsDir}`);
console.log('------------------------------------------------------------');

// --- Phase 0: self-overwrite guard (source CLI) ---
console.log('\n[Phase 0] Self-overwrite protection...');
{
  const cliPath = path.join(parentDir, 'bin', 'cli.js');
  const result = cp.spawnSync(process.execPath, [cliPath], {
    cwd: parentDir,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' }
  });
  if (result.status === 0) {
    fail('Self-overwrite guard failed: CLI exited 0 when cwd is package root');
  }
  const combined = `${result.stdout || ''}${result.stderr || ''}`;
  if (!/Refusing to install into the workflow-skills source repository/i.test(combined)) {
    fail(`Self-overwrite guard missing expected error message. Output:\n${combined}`);
  }
  ok('CLI refuses install when cwd is package root');
}

// --- Phase 0b: dry-run / canonicity contract files ---
console.log('\n[Phase 0b] Canonicity + dry-run contract files...');
{
  const required = [
    '.agents/skills/spec-to-pr/ARTIFACTS.md',
    '.agents/skills/shared/config.schema.json',
    '.agents/skills/shared/config.json.example',
    '.agents/skills/shared/tools.md',
    '.agents/skills/shared/STACK.md.example',
    '.agents/skills/shared/MEMORY.md.template',
    '.agents/skills/shared/CHANGELOG.md.template',
    '.agents/skills/shared/setup.md',
    '.agents/skills/spec-to-pr/spec-to-pr-run-test.md',
    '.agents/skills/spec-to-pr/SKILL.md',
    '.agents/skills/check-harness/SKILL.md',
    '.agents/skills/shared/AGENTS.md',
    // Spec-source / SCM provider skills (packed under .agents/skills/)
    '.agents/skills/github-provider/SKILL.md',
    '.agents/skills/azure-devops-provider/SKILL.md',
    '.agents/skills/local-spec-provider/SKILL.md',
    // Promoted top-level skills + dependency map
    'bin/skill-dependencies.json',
    '.agents/skills/caveman/SKILL.md',
    '.agents/skills/gabarito/SKILL.md',
    '.agents/skills/karpathy-guidelines/SKILL.md',
    '.agents/skills/spec-format/SKILL.md',
    '.agents/skills/goal-loop/SKILL.md',
    '.agents/skills/self-learning/SKILL.md',
    '.agents/skills/changelog/SKILL.md'
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(parentDir, rel))) fail(`Missing required file: ${rel}`);
  }
  // Promoted skills must not remain nested under shared/
  for (const slug of [
    'caveman',
    'gabarito',
    'karpathy-guidelines',
    'spec-format',
    'goal-loop',
    'self-learning',
    'changelog'
  ]) {
    if (fs.existsSync(path.join(parentDir, '.agents/skills/shared', slug))) {
      fail(`Promoted skill still nested under shared/: ${slug}`);
    }
  }
  const depMap = JSON.parse(
    fs.readFileSync(path.join(parentDir, 'bin/skill-dependencies.json'), 'utf8')
  );
  if (!depMap.packages?.workflows?.skills?.includes('spec-to-pr')) {
    fail('skill-dependencies.json workflows package missing spec-to-pr');
  }
  if (depMap.packages?.extra?.skills?.includes('spec-to-pr')) {
    fail('skill-dependencies.json Extra must not include workflow orchestrators');
  }
  const artifacts = fs.readFileSync(path.join(parentDir, '.agents/skills/spec-to-pr/ARTIFACTS.md'), 'utf8');
  if (!artifacts.includes('step-00-{slug}.spec.md')) fail('ARTIFACTS.md missing canonical step-00 spec name');
  if (!artifacts.includes('ws-testing')) fail('ARTIFACTS.md missing Step 7 Testing ownership');
  // AC9: converter shims under orch paths forward to provider canonical scripts
  if (!fs.existsSync(path.join(parentDir, '.agents/skills/spec-to-pr/scripts/github-issue-to-spec.py'))) {
    fail('Missing github-issue-to-spec.py shim under spec-to-pr/scripts');
  }
  if (!fs.existsSync(path.join(parentDir, '.agents/skills/spec-to-pr/scripts/ado-workitem-to-spec.py'))) {
    fail('Missing ado-workitem-to-spec.py shim under spec-to-pr/scripts');
  }
  if (
    !fs.existsSync(
      path.join(parentDir, '.agents/skills/github-provider/scripts/github-issue-to-spec.py')
    )
  ) {
    fail('Missing canonical github-issue-to-spec.py under github-provider/scripts');
  }
  if (
    !fs.existsSync(
      path.join(parentDir, '.agents/skills/azure-devops-provider/scripts/ado-workitem-to-spec.py')
    )
  ) {
    fail('Missing canonical ado-workitem-to-spec.py under azure-devops-provider/scripts');
  }
  // local-spec-provider scripts (AC1)
  for (const rel of [
    '.agents/skills/local-spec-provider/scripts/detect_specs_dir.py',
    '.agents/skills/local-spec-provider/scripts/register_local_spec.py'
  ]) {
    if (!fs.existsSync(path.join(parentDir, rel))) fail(`Missing local-spec script: ${rel}`);
  }
  // 09-fix-pr → provider thread/context shims (AC9)
  for (const rel of [
    '.agents/skills/09-fix-pr/scripts/fetch_threads.cjs',
    '.agents/skills/09-fix-pr/scripts/resolve_thread.cjs',
    '.agents/skills/09-fix-pr/scripts/fix_pr_azure_context.py'
  ]) {
    if (!fs.existsSync(path.join(parentDir, rel))) fail(`Missing 09-fix-pr shim: ${rel}`);
  }
  // AC11: committed integrity manifest must match current tree + package.json version
  {
    const gen = cp.spawnSync(
      process.execPath,
      [path.join(parentDir, 'bin', 'generate-skill-integrity.js'), '--check'],
      {
        cwd: parentDir,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0' },
        timeout: 120000,
      }
    );
    if (gen.status !== 0) {
      console.error(`${gen.stdout || ''}${gen.stderr || ''}`);
      fail(`bin/skill-integrity.json stale or packageVersion mismatch (generate-skill-integrity.js --check exited ${gen.status})`);
    }
    ok('skill-integrity.json matches tree (generate --check)');
  }
  // Cheap shim --help / usage smoke: proves parents[2] / relative forward resolves
  {
    const py = process.platform === 'win32' ? 'python' : 'python3';
    const shimHelps = [
      [py, '.agents/skills/spec-to-pr/scripts/github-issue-to-spec.py', '--help'],
      [py, '.agents/skills/spec-to-pr/scripts/ado-workitem-to-spec.py', '--help'],
      [py, '.agents/skills/09-fix-pr/scripts/fix_pr_azure_context.py', '--help']
    ];
    for (const [bin, rel, flag] of shimHelps) {
      const r = cp.spawnSync(bin, [path.join(parentDir, rel), flag], {
        encoding: 'utf8',
        cwd: parentDir
      });
      if (r.status !== 0) {
        fail(`Shim --help failed (${rel}): status=${r.status}\n${r.stderr || r.stdout}`);
      }
    }
    // CJS shims have no --help; missing args → Usage from canonical (exit 1) proves forward
    for (const rel of [
      '.agents/skills/09-fix-pr/scripts/resolve_thread.cjs',
      '.agents/skills/09-fix-pr/scripts/fetch_threads.cjs'
    ]) {
      const r = cp.spawnSync(process.execPath, [path.join(parentDir, rel)], {
        encoding: 'utf8',
        cwd: parentDir
      });
      const out = `${r.stdout || ''}${r.stderr || ''}`;
      if (r.status === 0) fail(`Expected usage exit from ${rel}, got 0`);
      if (!/Usage:/i.test(out)) {
        fail(`Shim forward smoke failed for ${rel} (no Usage output):\n${out}`);
      }
    }
    ok('Shim --help / usage forward smoke passed');
  }
  if (!artifacts.includes('azure-devops') && !artifacts.includes('Azure DevOps')) {
    fail('ARTIFACTS.md must document Azure DevOps entry');
  }
  if (!artifacts.includes('Hand-written') && !artifacts.includes('hand-written')) {
    fail('ARTIFACTS.md must document hand-written/local spec entry');
  }
  // Provider SKILL.md smoke: frontmatter name + dual-mode sections
  const providerSkills = [
    'github-provider',
    'azure-devops-provider',
    'local-spec-provider'
  ];
  for (const name of providerSkills) {
    const body = fs.readFileSync(
      path.join(parentDir, `.agents/skills/${name}/SKILL.md`),
      'utf8'
    );
    if (!body.includes(`name: ${name}`)) {
      fail(`${name}/SKILL.md missing frontmatter name: ${name}`);
    }
    if (!/Standalone Mode/i.test(body) || !/Workflow Mode/i.test(body)) {
      fail(`${name}/SKILL.md must document Standalone Mode and Workflow Mode`);
    }
  }
  const goalLoop = fs.readFileSync(
    path.join(parentDir, '.agents/skills/goal-loop/SKILL.md'),
    'utf8'
  );
  if (/[>] ?\/tmp\//.test(goalLoop) || /\/tmp\/goal-loop/.test(goalLoop)) {
    fail('goal-loop must not write sentinels under /tmp');
  }
  const skill = fs.readFileSync(path.join(parentDir, '.agents/skills/spec-to-pr/SKILL.md'), 'utf8');
  if (/specs\/\{slug\}\.spec\.md/.test(skill) && !/mirror/i.test(skill)) {
    // brainstorm must not treat specs/ as sole canonical
    console.warn('Warning: SKILL.md still mentions specs/{slug}.spec.md — verify mirror-only wording');
  }
  if (!skill.includes('ARTIFACTS.md')) fail('SKILL.md must link ARTIFACTS.md');
  const agents = fs.readFileSync(path.join(parentDir, 'AGENTS.md'), 'utf8');
  if (/04-implement-tasks` \| Steps 5, 10, 11/.test(agents)) {
    fail('AGENTS.md still maps Step 11 to 04-implement-tasks');
  }
  const example = JSON.parse(
    fs.readFileSync(path.join(parentDir, '.agents/skills/shared/config.json.example'), 'utf8')
  );
  if (!example.project?.workingBranch) fail('config.json.example missing project.workingBranch');
  if (!example.plans?.dir) fail('config.json.example missing plans.dir');
  if (!example.providers?.active) fail('config.json.example missing providers.active');
  if (!example.providers?.scm) fail('config.json.example missing providers.scm');
  if (
    example.rules?.karpathyGuidelines &&
    example.rules.karpathyGuidelines.includes('shared/karpathy')
  ) {
    fail('config.json.example karpathyGuidelines still points at shared/ path');
  }
  ok('Canonicity + contract files present (providers + converter shims)');
}

  // --- Phase 0c: CLI help ---
  console.log('\n[Phase 0c] CLI --help...');
  {
    const cliPath = path.join(parentDir, 'bin', 'cli.js');
    const help = cp.spawnSync(process.execPath, [cliPath, '--help'], {
      cwd: path.join(parentDir, 'test'),
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    if (help.status !== 0) fail(`CLI --help exited ${help.status}`);
    const out = `${help.stdout || ''}${help.stderr || ''}`;
    if (!/update --include-new/i.test(out) || !/AGENTS\.md/i.test(out)) {
      fail(`CLI --help missing expected usage hints.\n${out}`);
    }
    if (!/\bf\b.*Full/i.test(out) || !/\bw\b.*Workflows/i.test(out) || !/\be\b.*Extra/i.test(out)) {
      fail(`CLI --help missing package shortcuts f/w/e.\n${out}`);
    }
    if (!/skill-dependencies\.json/i.test(out)) {
      fail(`CLI --help missing skill-dependencies.json note.\n${out}`);
    }
    if (!/npx --yes github:jpolvora\/workflow-skills/i.test(out)) {
      fail(`CLI --help missing canonical npx --yes github: form.\n${out}`);
    }
    if (!/\binstall\b/i.test(out) || !/--yes/i.test(out)) {
      fail(`CLI --help missing install / --yes usage.\n${out}`);
    }
    if (/workflow-skills@latest/i.test(out) || /workflow-skills@main/i.test(out)) {
      fail(`CLI --help must not recommend github:…@latest or @main.\n${out}`);
    }
    if (!/128/i.test(out)) {
      fail(`CLI --help missing exit-128 / @latest troubleshooting note.\n${out}`);
    }
    if (!/config\.json/i.test(out) || !/\.agents\/plans/i.test(out)) {
      fail(`CLI --help missing consumer config / .agents/plans artifact-path notes.\n${out}`);
    }
    if (!/uninstall/i.test(out) || !/installed-skills\.json/i.test(out)) {
      fail(`CLI --help missing uninstall / installed-skills.json notes.\n${out}`);
    }
    ok('CLI --help documents update, install --yes, packages, AGENTS.md, and portable artifact paths (no @latest)');
  }

// 1. Clean test/.agents directory and prior root leftovers
console.log('\nCleaning target test/.agents/ directory...');
const targetAgentsDir = path.resolve(__dirname, '.agents');
if (fs.existsSync(targetAgentsDir)) {
  fs.rmSync(targetAgentsDir, { recursive: true, force: true });
}
for (const seed of ['CHANGELOG.md']) {
  const p = path.join(__dirname, seed);
  if (fs.existsSync(p)) fs.rmSync(p, { force: true });
}

const tgzPath = resolveTarball();

if (useLocal) {
  if (!tgzPath) {
    fail('No .tgz package found in parent folder. Did you run npm pack?');
  }
  console.log(`Found package tarball: ${tgzPath}`);
  console.log('Installing local package pack in test environment...');
  const installResult = cp.spawnSync('npm', ['install', tgzPath], {
    cwd: __dirname,
    shell: true,
    stdio: 'inherit'
  });
  if (installResult.status !== 0) {
    fail('npm install of packed tarball failed.');
  }
}

const command = 'npx';
const args = useLocal ? ['workflow-skills'] : ['-y', 'github:jpolvora/workflow-skills'];

console.log(`\nSpawning installer: ${command} ${args.join(' ')}`);
const child = cp.spawn(command, args, {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'inherit'],
  shell: true
});

let selectAllSent = false;
let installSent = false;

child.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(data);

  if (output.includes('Select action or toggle') && !selectAllSent) {
    selectAllSent = true;
    console.log("\n[Test Automation] Sending 'a' to select all skills...");
    child.stdin.write('a\n');
  } else if (output.includes('Select action or toggle') && selectAllSent && !installSent) {
    installSent = true;
    console.log("\n[Test Automation] Sending 'y' to confirm installation...");
    child.stdin.write('y\n');
  }
});

child.on('close', async (code) => {
  if (tgzPath && fs.existsSync(tgzPath)) {
    console.log(`Cleaning up local pack file: ${tgzPath}`);
    try {
      fs.rmSync(tgzPath, { force: true });
    } catch (err) {
      console.warn(`Warning: failed to clean up pack file: ${err.message}`);
    }
  }

  if (code !== 0) {
    fail(`Installer process exited with error code ${code}`);
  }

  console.log('\n------------------------------------------------------------');
  console.log('Installation finished. Starting tree verification...');
  console.log('------------------------------------------------------------');

  if (!fs.existsSync(rootSkillsDir)) fail(`Source skills directory not found at: ${rootSkillsDir}`);
  if (!fs.existsSync(testSkillsDir)) fail(`Target skills directory not found at: ${testSkillsDir}`);

  const rootFiles = getFilesRecursive(rootSkillsDir)
    .map((item) => ({
      relPath: path.relative(rootSkillsDir, item.path),
      isDir: item.isDir
    }))
    .filter((item) => shouldInclude(item.relPath))
    .sort((a, b) => a.relPath.localeCompare(b.relPath));

  const testFiles = getFilesRecursive(testSkillsDir)
    .map((item) => ({
      relPath: path.relative(testSkillsDir, item.path),
      isDir: item.isDir
    }))
    .filter((item) => shouldInclude(item.relPath))
    .sort((a, b) => a.relPath.localeCompare(b.relPath));

  const rootPaths = rootFiles.map((f) => f.relPath);
  const testPaths = testFiles.map((f) => f.relPath);

  let mismatch = false;
  const missingInTest = rootPaths.filter((p) => !testPaths.includes(p));
  if (missingInTest.length > 0) {
    console.error('\n❌ Mismatch: Missing files/directories in target installation:');
    missingInTest.forEach((p) => console.error(`  - ${p}`));
    mismatch = true;
  }
  const extraInTest = testPaths.filter((p) => !rootPaths.includes(p));
  if (extraInTest.length > 0) {
    console.error('\n❌ Mismatch: Extra unexpected files/directories in target installation:');
    extraInTest.forEach((p) => console.error(`  + ${p}`));
    mismatch = true;
  }

  const commonFiles = rootFiles.filter((f) => !f.isDir && testPaths.includes(f.relPath));
  let contentMismatchCount = 0;
  for (const file of commonFiles) {
    const rootFileContent = fs.readFileSync(path.join(rootSkillsDir, file.relPath), 'utf8').replace(/\r\n/g, '\n');
    const testFileContent = fs.readFileSync(path.join(testSkillsDir, file.relPath), 'utf8').replace(/\r\n/g, '\n');
    if (rootFileContent !== testFileContent) {
      if (contentMismatchCount < 5) {
        console.error(`❌ Content mismatch in file: ${file.relPath}`);
      }
      contentMismatchCount++;
      mismatch = true;
    }
  }
  if (contentMismatchCount > 5) {
    console.error(`❌ ... and ${contentMismatchCount - 5} more content mismatch(es).`);
  }

  if (mismatch) {
    console.error('\n❌ Directory verification failed.');
    if (!useLocal) {
      console.log('\n💡 Note: remote install may lag local changes. Prefer:');
      console.log('  npm run tests -- --local');
    }
    process.exit(1);
  }

  ok('Tree + content match after install');

  // --- Phase 2: config.json preserve on update ---
  console.log('\n[Phase 2] Update preserves config.json...');
  const usConfigDir = path.join(testSkillsDir, 'spec-to-pr');
  const consumerConfig = path.join(usConfigDir, 'config.json');
  const marker = {
    project: { name: 'consumer-marker-project', baseBranch: 'main', workingBranch: 'feature/x' },
    plans: { dir: '.agents/plans' },
    verification: { backendBuild: 'echo consumer-config-preserved' },
    _testMarker: 'preserve-me-do-not-overwrite'
  };
  fs.writeFileSync(consumerConfig, JSON.stringify(marker, null, 2), 'utf8');

  // Plain `update` only refreshes skills already present. New upstream skill folders
  // (e.g. github-provider, azure-devops-provider, local-spec-provider) require
  // `npx github:jpolvora/workflow-skills update --include-new` (or interactive install).
  const sourceSkills = listSkillDirs(rootSkillsDir);
  const installedBefore = listSkillDirs(testSkillsDir);
  // Prefer removing a provider skill so --include-new coverage matches consumer upgrades
  const removable = installedBefore.find(
    (s) =>
      s === 'local-spec-provider' ||
      s === 'github-provider' ||
      s === 'azure-devops-provider' ||
      s === 'secrets-leak-review' ||
      s === 'write-a-skill' ||
      s === 'show-harness'
  );
  let removedForIncludeNew = null;
  if (removable) {
    fs.rmSync(path.join(testSkillsDir, removable), { recursive: true, force: true });
    removedForIncludeNew = removable;
    console.log(`Temporarily removed '${removable}' to test update --include-new`);
  }

  const updateArgs = useLocal
    ? ['workflow-skills', 'update', '--include-new']
    : ['-y', 'github:jpolvora/workflow-skills', 'update', '--include-new'];
  const updateResult = cp.spawnSync('npx', updateArgs, {
    cwd: __dirname,
    shell: true,
    encoding: 'utf8'
  });
  if (updateResult.status !== 0) {
    console.error(updateResult.stdout);
    console.error(updateResult.stderr);
    fail(`update --include-new failed with code ${updateResult.status}`);
  }

  if (!fs.existsSync(consumerConfig)) fail('config.json missing after update');
  const after = JSON.parse(fs.readFileSync(consumerConfig, 'utf8'));
  if (after._testMarker !== 'preserve-me-do-not-overwrite') {
    fail('config.json was overwritten on update (marker lost)');
  }
  if (after.project?.name !== 'consumer-marker-project') {
    fail('config.json project.name not preserved on update');
  }
  ok('config.json preserved across update');

  if (removedForIncludeNew) {
    if (!fs.existsSync(path.join(testSkillsDir, removedForIncludeNew))) {
      fail(`update --include-new did not restore skill '${removedForIncludeNew}'`);
    }
    ok(`update --include-new reinstalled '${removedForIncludeNew}'`);
  } else {
    console.log('⏭ Skipped include-new restore assert (no removable candidate skill)');
  }

  // Ensure upstream skills still covered (pipeline + providers)
  const installedAfter = listSkillDirs(testSkillsDir);
  const missingPipeline = [
    'spec-to-pr',
    '00-write-spec',
    '04-implement-tasks',
    '07-testing',
    '08-ship-pr',
    'check-harness',
    'github-provider',
    'azure-devops-provider',
    'local-spec-provider'
  ].filter((s) => !installedAfter.includes(s));
  if (missingPipeline.length) {
    fail(`Pipeline/provider skills missing after update: ${missingPipeline.join(', ')}`);
  }
  if (!fs.existsSync(path.join(testSkillsDir, 'check-harness', 'SKILL.md'))) {
    fail('check-harness/SKILL.md missing after install/update');
  }
  const packagedAgents = path.join(__dirname, '.agents', 'AGENTS.md');
  if (fs.existsSync(packagedAgents)) {
    fail('Installer must not copy .agents/AGENTS.md into consumer projects');
  }
  const sharedAgents = path.join(testSkillsDir, 'shared', 'AGENTS.md');
  if (!fs.existsSync(sharedAgents)) {
    fail('shared/AGENTS.md not installed into consumer test/.agents/skills/shared/');
  }
  const sharedAgentsBody = fs.readFileSync(sharedAgents, 'utf8');
  if (!/External dependencies/i.test(sharedAgentsBody)) {
    fail('Consumer shared/AGENTS.md missing External dependencies section');
  }
  if (!/Skill loading \(mandatory\)/i.test(sharedAgentsBody)) {
    fail('Consumer shared/AGENTS.md missing Skill loading section');
  }
  if (!/check-harness/i.test(sharedAgentsBody) || !/check-workflows/i.test(sharedAgentsBody)) {
    fail('Consumer shared/AGENTS.md must route check-harness and check-workflows');
  }
  ok('check-harness + shared/AGENTS.md hub shipped to consumer (no .agents/AGENTS.md)');
  for (const name of ['github-provider', 'azure-devops-provider', 'local-spec-provider']) {
    if (!fs.existsSync(path.join(testSkillsDir, name, 'SKILL.md'))) {
      fail(`Provider SKILL.md missing after install/update: ${name}/SKILL.md`);
    }
  }
  // AC9 shims + local-spec scripts must ship to consumers
  for (const rel of [
    path.join('spec-to-pr', 'scripts', 'github-issue-to-spec.py'),
    path.join('spec-to-pr', 'scripts', 'ado-workitem-to-spec.py'),
    path.join('local-spec-provider', 'scripts', 'detect_specs_dir.py'),
    path.join('local-spec-provider', 'scripts', 'register_local_spec.py'),
    path.join('09-fix-pr', 'scripts', 'fetch_threads.cjs'),
    path.join('09-fix-pr', 'scripts', 'resolve_thread.cjs'),
    path.join('09-fix-pr', 'scripts', 'fix_pr_azure_context.py')
  ]) {
    if (!fs.existsSync(path.join(testSkillsDir, rel))) {
      fail(`Provider/shim script missing in consumer install: ${rel}`);
    }
  }
  // Consumer-side cheap shim forward smoke (installed tree)
  {
    const py = process.platform === 'win32' ? 'python' : 'python3';
    const helpShim = path.join(testSkillsDir, 'spec-to-pr', 'scripts', 'github-issue-to-spec.py');
    const helpResult = cp.spawnSync(py, [helpShim, '--help'], {
      encoding: 'utf8',
      cwd: path.join(__dirname)
    });
    if (helpResult.status !== 0) {
      fail(
        `Consumer shim --help failed: status=${helpResult.status}\n${helpResult.stderr || helpResult.stdout}`
      );
    }
    const cjsShim = path.join(testSkillsDir, '09-fix-pr', 'scripts', 'resolve_thread.cjs');
    const cjsResult = cp.spawnSync(process.execPath, [cjsShim], {
      encoding: 'utf8',
      cwd: path.join(__dirname)
    });
    const cjsOut = `${cjsResult.stdout || ''}${cjsResult.stderr || ''}`;
    if (cjsResult.status === 0 || !/Usage:/i.test(cjsOut)) {
      fail(`Consumer CJS shim forward smoke failed:\n${cjsOut}`);
    }
    ok('Consumer shim forward smoke passed');
  }
  ok(`Pipeline + provider skills present (${installedAfter.length} dirs; source has ${sourceSkills.length})`);
  // --- Phase 3: packed file smoke (local only) ---
  if (useLocal) {
    const schemaInTest = path.join(testSkillsDir, 'shared', 'config.schema.json');
    const artifactsInTest = path.join(testSkillsDir, 'spec-to-pr', 'ARTIFACTS.md');
    if (!fs.existsSync(schemaInTest)) fail('config.schema.json not installed into consumer');
    if (!fs.existsSync(artifactsInTest)) fail('ARTIFACTS.md not installed into consumer');
    ok('schema + ARTIFACTS shipped to consumer');
  }

  // --- Phase 4: promoted skills top-level layout ---
  console.log('\n[Phase 4] Promoted skills install as top-level folders...');
  {
    for (const slug of [
      'caveman',
      'gabarito',
      'karpathy-guidelines',
      'spec-format',
      'goal-loop',
      'self-learning',
      'changelog'
    ]) {
      if (!fs.existsSync(path.join(testSkillsDir, slug, 'SKILL.md'))) {
        fail(`Promoted skill missing at top-level: ${slug}/SKILL.md`);
      }
      if (fs.existsSync(path.join(testSkillsDir, 'shared', slug))) {
        fail(`Promoted skill still nested under shared/ in consumer: ${slug}`);
      }
    }
    if (!fs.existsSync(path.join(testSkillsDir, 'shared', 'config.json.example'))) {
      fail('shared/ hub missing config.json.example after install');
    }
    if (fs.existsSync(path.join(testSkillsDir, 'shared', 'self-learning'))) {
      fail('shared/self-learning should not exist after promotion');
    }
    ok('Promoted skills top-level; shared/ is hub-only');
  }

  // --- Phase 6: Workflows package membership (no Extra-only) ---
  console.log('\n[Phase 6] Workflows package install membership...');
  {
    const pkgDir = path.join(__dirname, '.pkg-workflows');
    fs.rmSync(pkgDir, { recursive: true, force: true });
    fs.mkdirSync(pkgDir, { recursive: true });
    const cliPath = path.join(parentDir, 'bin', 'cli.js');
    const pkgInstall = await new Promise((resolve) => {
      const child = cp.spawn(process.execPath, [cliPath], {
        cwd: pkgDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '0' }
      });
      let stdout = '';
      let stderr = '';
      let packageSent = false;
      let installSent = false;
      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        if (chunk.includes('Select action or toggle') && !packageSent) {
          packageSent = true;
          child.stdin.write('w\n');
        } else if (chunk.includes('Select action or toggle') && packageSent && !installSent) {
          installSent = true;
          child.stdin.write('y\n');
        }
      });
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      child.on('close', (status) => resolve({ status, stdout, stderr }));
    });
    if (pkgInstall.status !== 0) {
      console.error(pkgInstall.stdout);
      console.error(pkgInstall.stderr);
      fail(`Workflows package install exited ${pkgInstall.status}`);
    }
    const pkgSkills = path.join(pkgDir, '.agents', 'skills');
    if (!fs.existsSync(path.join(pkgSkills, 'spec-to-pr', 'SKILL.md'))) {
      fail('Workflows package did not install spec-to-pr');
    }
    if (!fs.existsSync(path.join(pkgSkills, 'caveman', 'SKILL.md'))) {
      fail('Workflows package did not install promoted caveman');
    }
    if (!fs.existsSync(path.join(pkgSkills, 'shared', 'config.json.example'))) {
      fail('Workflows package did not install shared/ hub');
    }
    if (fs.existsSync(path.join(pkgSkills, 'security-review'))) {
      fail('Workflows package must not install Extra-only security-review');
    }
    fs.rmSync(pkgDir, { recursive: true, force: true });
    ok('Workflows package installs workflows+hub without Extra-only skills');
  }

  // --- Phase 7: dependency auto-select (goal-fix-pr → goal-loop) ---
  console.log('\n[Phase 7] Dependency auto-select on individual toggle...');
  {
    const depDir = path.join(__dirname, '.pkg-deps');
    fs.rmSync(depDir, { recursive: true, force: true });
    fs.mkdirSync(depDir, { recursive: true });
    const cliPath = path.join(parentDir, 'bin', 'cli.js');
    const installable = listSkillDirs(rootSkillsDir)
      .filter((n) => n !== 'shared' && fs.existsSync(path.join(rootSkillsDir, n, 'SKILL.md')))
      .sort((a, b) => a.localeCompare(b));
    const idx = installable.indexOf('goal-fix-pr');
    if (idx < 0) fail('goal-fix-pr not in installable skill list');
    const num = String(idx + 1);
    const depInstall = await new Promise((resolve) => {
      const child = cp.spawn(process.execPath, [cliPath], {
        cwd: depDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '0' }
      });
      let stdout = '';
      let stderr = '';
      let toggleSent = false;
      let installSent = false;
      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        if (chunk.includes('Select action or toggle') && !toggleSent) {
          toggleSent = true;
          child.stdin.write(`${num}\n`);
        } else if (chunk.includes('Select action or toggle') && toggleSent && !installSent) {
          installSent = true;
          child.stdin.write('y\n');
        }
      });
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      child.on('close', (status) => resolve({ status, stdout, stderr }));
    });
    if (depInstall.status !== 0) {
      console.error(depInstall.stdout);
      console.error(depInstall.stderr);
      fail(`Dep auto-select install exited ${depInstall.status}`);
    }
    const depSkills = path.join(depDir, '.agents', 'skills');
    if (!fs.existsSync(path.join(depSkills, 'goal-fix-pr', 'SKILL.md'))) {
      fail('goal-fix-pr not installed after toggle');
    }
    if (!fs.existsSync(path.join(depSkills, 'goal-loop', 'SKILL.md'))) {
      fail('goal-loop not auto-selected as dependency of goal-fix-pr');
    }
    if (!fs.existsSync(path.join(depSkills, '09-fix-pr', 'SKILL.md'))) {
      fail('09-fix-pr not auto-selected as dependency of goal-fix-pr');
    }
    fs.rmSync(depDir, { recursive: true, force: true });
    ok('Selecting goal-fix-pr auto-selects goal-loop + 09-fix-pr');
  }

  // --- Phase 8: non-interactive install --yes (config preserve, no overwrite prompts) ---
  console.log('\n[Phase 8] Non-interactive install --full/--package/--skills --yes...');
  {
    const cliPath = path.join(parentDir, 'bin', 'cli.js');
    const niDir = path.join(__dirname, '.pkg-noninteractive');
    fs.rmSync(niDir, { recursive: true, force: true });
    fs.mkdirSync(niDir, { recursive: true });

    // Seed an existing skill + custom config.json to overwrite
    const seedSkill = path.join(niDir, '.agents', 'skills', 'spec-to-pr');
    fs.mkdirSync(seedSkill, { recursive: true });
    fs.writeFileSync(path.join(seedSkill, 'SKILL.md'), '# stale seed\n', 'utf8');
    const seedConfig = {
      _testMarker: 'install-yes-preserve-me',
      project: { name: 'ni-consumer' }
    };
    fs.writeFileSync(path.join(seedSkill, 'config.json'), JSON.stringify(seedConfig, null, 2), 'utf8');

    // Also seed shared hub config
    const seedShared = path.join(niDir, '.agents', 'skills', 'shared');
    fs.mkdirSync(seedShared, { recursive: true });
    const hubMarker = { _hubMarker: 'shared-config-preserve', project: { name: 'hub-ni' } };
    fs.writeFileSync(path.join(seedShared, 'config.json'), JSON.stringify(hubMarker, null, 2), 'utf8');

    const fullInstall = cp.spawnSync(
      process.execPath,
      [cliPath, 'install', '--package', 'workflows', '--yes'],
      {
        cwd: niDir,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0' },
        timeout: 120000
      }
    );
    const fullOut = `${fullInstall.stdout || ''}${fullInstall.stderr || ''}`;
    if (fullInstall.status !== 0) {
      console.error(fullOut);
      fail(`install --package workflows --yes exited ${fullInstall.status}`);
    }
    if (/Overwrite\?/i.test(fullOut) || /Overwrite \d+ existing/i.test(fullOut)) {
      fail(`Non-interactive install must not prompt for overwrite.\n${fullOut}`);
    }
    if (!fs.existsSync(path.join(niDir, '.agents', 'skills', 'spec-to-pr', 'SKILL.md'))) {
      fail('install --package workflows --yes did not refresh spec-to-pr');
    }
    if (!fs.existsSync(path.join(niDir, '.agents', 'skills', 'caveman', 'SKILL.md'))) {
      fail('install --package workflows --yes missing promoted caveman');
    }
    const afterSkillCfg = JSON.parse(
      fs.readFileSync(path.join(niDir, '.agents', 'skills', 'spec-to-pr', 'config.json'), 'utf8')
    );
    if (afterSkillCfg._testMarker !== 'install-yes-preserve-me') {
      fail('skill config.json not preserved on install --yes');
    }
    const afterHubCfg = JSON.parse(
      fs.readFileSync(path.join(niDir, '.agents', 'skills', 'shared', 'config.json'), 'utf8')
    );
    if (afterHubCfg._hubMarker !== 'shared-config-preserve') {
      fail('shared/config.json not preserved on install --yes');
    }
    ok('install --package workflows --yes refreshes skills and preserves config.json');

    // --skills + transitive deps
    const skillsDir2 = path.join(__dirname, '.pkg-ni-skills');
    fs.rmSync(skillsDir2, { recursive: true, force: true });
    fs.mkdirSync(skillsDir2, { recursive: true });
    const skillsInstall = cp.spawnSync(
      process.execPath,
      [cliPath, 'install', '--skills', 'goal-fix-pr', '--yes'],
      {
        cwd: skillsDir2,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0' },
        timeout: 120000
      }
    );
    const skillsOut = `${skillsInstall.stdout || ''}${skillsInstall.stderr || ''}`;
    if (skillsInstall.status !== 0) {
      console.error(skillsOut);
      fail(`install --skills goal-fix-pr --yes exited ${skillsInstall.status}`);
    }
    const sRoot = path.join(skillsDir2, '.agents', 'skills');
    if (!fs.existsSync(path.join(sRoot, 'goal-fix-pr', 'SKILL.md'))) {
      fail('--skills install missing goal-fix-pr');
    }
    if (!fs.existsSync(path.join(sRoot, 'goal-loop', 'SKILL.md'))) {
      fail('--skills install missing transitive goal-loop');
    }
    if (!fs.existsSync(path.join(sRoot, '09-fix-pr', 'SKILL.md'))) {
      fail('--skills install missing transitive 09-fix-pr');
    }
    fs.rmSync(skillsDir2, { recursive: true, force: true });
    ok('install --skills applies transitive deps without prompts');

    // Non-TTY without --yes must fail fast
    const noYes = cp.spawnSync(process.execPath, [cliPath, 'install', '--full'], {
      cwd: niDir,
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0' },
      timeout: 30000
    });
    if (noYes.status === 0) {
      fail('install --full without --yes on non-TTY must exit non-zero');
    }
    const noYesOut = `${noYes.stdout || ''}${noYes.stderr || ''}`;
    if (!/--yes/i.test(noYesOut)) {
      fail(`install without --yes error should mention --yes.\n${noYesOut}`);
    }
    ok('install without --yes on non-TTY exits with guidance');

    fs.rmSync(niDir, { recursive: true, force: true });
  }

  // --- Phase 9: consumer MEMORY isolation under shared/ ---
  console.log('\n[Phase 9] Consumer shared/MEMORY.md isolation...');
  {
    const memDir = path.join(__dirname, '.pkg-memory');
    fs.rmSync(memDir, { recursive: true, force: true });
    fs.mkdirSync(memDir, { recursive: true });
    const cliPath = path.join(parentDir, 'bin', 'cli.js');

    const fresh = cp.spawnSync(
      process.execPath,
      [cliPath, 'install', '--skills', 'self-learning', '--yes'],
      {
        cwd: memDir,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0' },
        timeout: 120000
      }
    );
    if (fresh.status !== 0) {
      console.error(`${fresh.stdout || ''}${fresh.stderr || ''}`);
      fail(`self-learning install for MEMORY isolation exited ${fresh.status}`);
    }
    const destMem = path.join(memDir, '.agents', 'skills', 'shared', 'MEMORY.md');
    const destStack = path.join(memDir, '.agents', 'skills', 'shared', 'STACK.md');
    const destConfig = path.join(memDir, '.agents', 'skills', 'shared', 'config.json');
    const destChangelog = path.join(memDir, '.agents', 'skills', 'shared', 'CHANGELOG.md');
    const destRootAgents = path.join(memDir, 'AGENTS.md');
    if (!fs.existsSync(destMem)) fail('Fresh install must seed shared/MEMORY.md');
    if (!fs.existsSync(destStack)) fail('Fresh install must seed shared/STACK.md');
    if (!fs.existsSync(destConfig)) fail('Fresh install must seed shared/config.json');
    if (!fs.existsSync(destChangelog)) fail('Fresh install must seed shared/CHANGELOG.md');
    if (fs.existsSync(destRootAgents)) {
      fail('Installer must not write consumer root AGENTS.md');
    }
    const seeded = fs.readFileSync(destMem, 'utf8');
    if (/Trap Avoided|Promote Shared Installer|Curl install-skills/i.test(seeded)) {
      fail('Upstream hub MEMORY.md content leaked into consumer install');
    }
    if (!/# Memory - Anti-Regression Knowledge/.test(seeded)) {
      fail('Seeded MEMORY.md missing expected empty template header');
    }
    const seededConfig = fs.readFileSync(destConfig, 'utf8');
    if (!/"\$schema"/.test(seededConfig) || !/"providers"/.test(seededConfig)) {
      fail('Seeded config.json missing expected schema/providers from example');
    }
    const memEntries = path.join(memDir, '.agents', 'skills', 'shared', 'memory');
    if (fs.existsSync(memEntries)) {
      const leaked = fs.readdirSync(memEntries).filter((n) => n.endsWith('.md'));
      if (leaked.length > 0) {
        fail(`Upstream memory/*.md leaked to consumer: ${leaked.join(', ')}`);
      }
    }
    ok('Fresh install seeds config.json, MEMORY.md, CHANGELOG.md, STACK.md under shared/ only (no root AGENTS.md)');

    const marker = '### [2099-01-01] Consumer local trap\n- **Trap Avoided**: keep me\n';
    fs.writeFileSync(destMem, `# Memory - Anti-Regression Knowledge\n\n---\n\n${marker}`);
    fs.mkdirSync(memEntries, { recursive: true });
    const consumerEntry = path.join(memEntries, '2099-01-01-consumer-local.md');
    fs.writeFileSync(consumerEntry, '### [2099-01-01] Consumer local trap\n');
    fs.writeFileSync(destStack, '# Consumer STACK\nkeep-me\n');
    fs.writeFileSync(destConfig, '{\n  "project": { "name": "consumer-preserve-me" }\n}\n');
    fs.writeFileSync(destChangelog, '# Changelog\n\nkeep-changelog\n');
    // Consumer-owned root file must remain untouched by update
    fs.writeFileSync(destRootAgents, '# AGENTS.md\n\nkeep-root-pointer\n');

    const upd = cp.spawnSync(process.execPath, [cliPath, 'update'], {
      cwd: memDir,
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0' },
      timeout: 120000
    });
    if (upd.status !== 0) {
      console.error(`${upd.stdout || ''}${upd.stderr || ''}`);
      fail(`update after MEMORY seed exited ${upd.status}`);
    }
    const after = fs.readFileSync(destMem, 'utf8');
    if (!after.includes('Consumer local trap')) {
      fail('Consumer shared/MEMORY.md was overwritten on update');
    }
    if (!fs.existsSync(consumerEntry)) {
      fail('Consumer shared/memory/*.md entry was removed on update');
    }
    if (!fs.readFileSync(destStack, 'utf8').includes('keep-me')) {
      fail('Consumer shared/STACK.md was overwritten on update');
    }
    if (!fs.readFileSync(destConfig, 'utf8').includes('consumer-preserve-me')) {
      fail('Consumer shared/config.json was overwritten on update');
    }
    if (!fs.readFileSync(destChangelog, 'utf8').includes('keep-changelog')) {
      fail('Consumer shared/CHANGELOG.md was overwritten on update');
    }
    if (!fs.readFileSync(destRootAgents, 'utf8').includes('keep-root-pointer')) {
      fail('Installer must not overwrite consumer root AGENTS.md on update');
    }
    fs.rmSync(memDir, { recursive: true, force: true });
    ok('Update preserves shared consumer data and never rewrites root AGENTS.md');
  }

  // --- Phase 10: installed-skills.json + uninstall cascade ---
  console.log('\n[Phase 10] installed-skills.json + uninstall cascade...');
  {
    const uDir = path.join(__dirname, '.pkg-uninstall');
    fs.rmSync(uDir, { recursive: true, force: true });
    fs.mkdirSync(uDir, { recursive: true });
    const cliPath = path.join(parentDir, 'bin', 'cli.js');

    const inst = cp.spawnSync(
      process.execPath,
      [cliPath, 'install', '--skills', 'goal-fix-pr', '--yes'],
      {
        cwd: uDir,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0' },
        timeout: 120000,
      }
    );
    if (inst.status !== 0) {
      console.error(`${inst.stdout || ''}${inst.stderr || ''}`);
      fail(`goal-fix-pr install for uninstall test exited ${inst.status}`);
    }

    const manifestPath = path.join(
      uDir,
      '.agents',
      'skills',
      'shared',
      'installed-skills.json'
    );
    if (!fs.existsSync(manifestPath)) {
      fail('install must write shared/installed-skills.json');
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const need of ['goal-fix-pr', '09-fix-pr', 'goal-loop']) {
      if (!manifest.skills.includes(need)) {
        fail(`installed-skills.json missing ${need}: ${manifest.skills.join(',')}`);
      }
    }
    if (!manifest.selected || !manifest.selected.includes('goal-fix-pr')) {
      fail(`installed-skills.json selected roots should include goal-fix-pr: ${JSON.stringify(manifest.selected)}`);
    }
    if (manifest.selected.includes('09-fix-pr') || manifest.selected.includes('goal-loop')) {
      fail(`deps should not be selected roots: ${JSON.stringify(manifest.selected)}`);
    }
    ok('install writes installed-skills.json with transitive deps');

    const markerCfg = path.join(uDir, '.agents', 'skills', 'shared', 'config.json');
    fs.writeFileSync(
      markerCfg,
      JSON.stringify({ project: { name: 'uninstall-preserve-me' } }, null, 2)
    );

    const un = cp.spawnSync(
      process.execPath,
      [cliPath, 'uninstall', '--skills', 'goal-loop', '--yes'],
      {
        cwd: uDir,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0' },
        timeout: 120000,
      }
    );
    if (un.status !== 0) {
      console.error(`${un.stdout || ''}${un.stderr || ''}`);
      fail(`uninstall goal-loop exited ${un.status}`);
    }

    const skillsRoot = path.join(uDir, '.agents', 'skills');
    if (fs.existsSync(path.join(skillsRoot, 'goal-loop'))) {
      fail('uninstall did not remove goal-loop');
    }
    if (fs.existsSync(path.join(skillsRoot, 'goal-fix-pr'))) {
      fail('uninstall goal-loop must cascade-remove goal-fix-pr');
    }
    // 09-fix-pr may remain if nothing else needed it — goal-fix-pr cascade should leave
    // 09-fix-pr as orphan unless keep set still needs it. After removing goal-fix-pr+goal-loop,
    // 09-fix-pr is orphan → should be removed by forward orphan pass.
    if (fs.existsSync(path.join(skillsRoot, '09-fix-pr'))) {
      fail('uninstall cascade should remove orphan 09-fix-pr');
    }

    const afterManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (afterManifest.skills.includes('goal-loop') || afterManifest.skills.includes('goal-fix-pr')) {
      fail(`manifest still lists removed skills: ${afterManifest.skills.join(',')}`);
    }
    if (!fs.existsSync(markerCfg)) {
      fail('uninstall must preserve shared/config.json');
    }
    const cfg = JSON.parse(fs.readFileSync(markerCfg, 'utf8'));
    if (cfg.project?.name !== 'uninstall-preserve-me') {
      fail('uninstall overwrote shared/config.json');
    }
    ok('uninstall cascades dependents/orphans and preserves shared/config.json');

    fs.rmSync(uDir, { recursive: true, force: true });
  }

  // --- Phase 11: skill integrity (checksums) ---
  console.log('\n[Phase 11] Skill integrity checksums...');
  {
    const { pathToFileURL } = await import('url');
    const {
      listInstallableSkills,
      loadJson,
      buildUpstreamManifest,
      stableStringify,
      evaluateVersionAndDigestCheck,
    } = await import(pathToFileURL(path.join(parentDir, 'bin', 'skill-integrity-lib.js')).href);
    const { HUB_WHITELIST, CONSUMER_OWNED_HUB_FILES } = await import(
      pathToFileURL(path.join(parentDir, 'bin', 'install-rules.js')).href
    );

    const manifestPath = path.join(parentDir, 'bin', 'skill-integrity.json');
    const manifest = loadJson(manifestPath);
    const pkgVersion = JSON.parse(
      fs.readFileSync(path.join(parentDir, 'package.json'), 'utf8')
    ).version;
    const skillIds = listInstallableSkills(path.join(parentDir, '.agents', 'skills'));

    // AC1: covers all installable skills; hub whitelist; no consumer-owned
    if (skillIds.length !== Object.keys(manifest.skills).length) {
      fail(`Manifest skill count ${Object.keys(manifest.skills).length} != installable ${skillIds.length}`);
    }
    for (const id of skillIds) {
      if (!manifest.skills[id]) fail(`Manifest missing skill ${id}`);
    }
    for (const rel of Object.keys(manifest.hub?.files || {})) {
      const top = rel.split('/')[0];
      if (!HUB_WHITELIST.includes(top) && !HUB_WHITELIST.includes(rel)) {
        fail(`Hub file not on whitelist: ${rel}`);
      }
      if (CONSUMER_OWNED_HUB_FILES.has(rel) || CONSUMER_OWNED_HUB_FILES.has(top)) {
        fail(`Consumer-owned path hashed in hub: ${rel}`);
      }
    }
    if (!manifest.hub?.files?.['hub.gitignore']) {
      fail('Hub manifest must include hub.gitignore (packable stand-in for consumer .gitignore)');
    }
    ok('integrity manifest covers installable skills + hub whitelist');

    // AC2 / AC3: digests + idempotent regenerate
    for (const id of skillIds) {
      const entry = manifest.skills[id];
      if (!entry.files || !entry.skillDigest) fail(`Skill ${id} missing files/skillDigest`);
      if (!/^[0-9a-f]{64}$/.test(entry.skillDigest)) fail(`skillDigest not lowercase hex: ${id}`);
    }
    if (!/^[0-9a-f]{64}$/.test(manifest.fullPackageDigest)) {
      fail('fullPackageDigest not lowercase hex');
    }
    if (manifest.packageVersion !== pkgVersion) {
      fail(`packageVersion ${manifest.packageVersion} != package.json ${pkgVersion}`);
    }
    const regenerated = buildUpstreamManifest(parentDir, pkgVersion);
    if (stableStringify(regenerated) !== fs.readFileSync(manifestPath, 'utf8')) {
      fail('Generator not idempotent vs committed skill-integrity.json');
    }
    ok('skill/full digests present; generator idempotent');

    // AC10: digest changes when an included file changes (compute without writing)
    const tamperSkill = 'caveman';
    const skillMd = path.join(parentDir, '.agents', 'skills', tamperSkill, 'SKILL.md');
    const original = fs.readFileSync(skillMd);
    try {
      fs.writeFileSync(skillMd, Buffer.concat([original, Buffer.from('\n# integrity-tamper\n')]));
      const changed = buildUpstreamManifest(parentDir, pkgVersion);
      if (changed.fullPackageDigest === manifest.fullPackageDigest) {
        fail('fullPackageDigest did not change after editing included file');
      }
      if (changed.skills[tamperSkill].skillDigest === manifest.skills[tamperSkill].skillDigest) {
        fail('skillDigest did not change after editing included file');
      }
    } finally {
      fs.writeFileSync(skillMd, original);
    }
    ok('fullPackageDigest changes when included file changes');

    // AC9: evaluateVersionAndDigestCheck labels mismatch
    {
      const mismatch = evaluateVersionAndDigestCheck({
        localVersion: '1.0.0',
        remoteVersion: '1.0.0',
        localDigest: 'a'.repeat(64),
        remoteDigest: 'b'.repeat(64),
        remoteDigestAvailable: true,
      });
      if (mismatch.exitCode !== 1) fail('digest mismatch with equal version should exit 1');
      if (!mismatch.lines.some((l) => /fullPackageDigest:\s*mismatch/.test(l))) {
        fail(`missing fullPackageDigest: mismatch label\n${mismatch.lines.join('\n')}`);
      }
      const match = evaluateVersionAndDigestCheck({
        localVersion: '1.0.0',
        remoteVersion: '1.0.0',
        localDigest: 'a'.repeat(64),
        remoteDigest: 'a'.repeat(64),
        remoteDigestAvailable: true,
      });
      if (match.exitCode !== 0) fail('matching digests should exit 0');
      if (!match.lines.some((l) => /fullPackageDigest:\s*match/.test(l))) {
        fail('missing fullPackageDigest match line');
      }
      const unreachable = evaluateVersionAndDigestCheck({
        localVersion: '1.0.0',
        remoteVersion: '1.0.0',
        localDigest: 'a'.repeat(64),
        remoteDigest: null,
        remoteDigestAvailable: false,
      });
      if (unreachable.exitCode !== 0) {
        fail('unreachable remote digest alone must not fail');
      }
    }
    ok('--check digest evaluation labels match/mismatch');

    // AC12: help + README mention integrity
    const cliPath = path.join(parentDir, 'bin', 'cli.js');
    const help = cp.spawnSync(process.execPath, [cliPath, '--help'], {
      cwd: parentDir,
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    const helpOut = `${help.stdout || ''}${help.stderr || ''}`;
    if (!/integrity/i.test(helpOut) || !/--force-integrity/.test(helpOut)) {
      fail(`--help missing integrity / --force-integrity\n${helpOut}`);
    }
    const readme = fs.readFileSync(path.join(parentDir, 'README.md'), 'utf8');
    if (!/integrity/i.test(readme) || !/trust/i.test(readme)) {
      fail('README Safety/install must document integrity and trust boundary');
    }
    ok('help and README mention integrity');

    // AC4–AC8: install abort, force, local record, audit, selective, consumer-owned
    const iDir = path.join(__dirname, '.pkg-integrity');
    fs.rmSync(iDir, { recursive: true, force: true });
    fs.mkdirSync(iDir, { recursive: true });

    // AC4: source mismatch aborts without copy (tamper a file in the selected closure)
    const closureSkillMd = path.join(parentDir, '.agents', 'skills', 'goal-loop', 'SKILL.md');
    const closureBackup = fs.readFileSync(closureSkillMd);
    try {
      fs.writeFileSync(
        closureSkillMd,
        Buffer.concat([closureBackup, Buffer.from('\n# source-mismatch\n')])
      );
      const bad = cp.spawnSync(
        process.execPath,
        [cliPath, 'install', '--skills', 'goal-fix-pr', '--yes'],
        {
          cwd: iDir,
          encoding: 'utf8',
          env: { ...process.env, FORCE_COLOR: '0' },
          timeout: 120000,
        }
      );
      if (bad.status === 0) fail('install should fail on source mismatch');
      if (fs.existsSync(path.join(iDir, '.agents', 'skills', 'goal-fix-pr'))) {
        fail('source mismatch must not copy skill dirs');
      }
      if (!/source package mismatch/i.test(`${bad.stdout || ''}${bad.stderr || ''}`)) {
        fail(`expected source mismatch message\n${bad.stdout || ''}${bad.stderr || ''}`);
      }
      ok('install aborts on source mismatch without copy');

      const forced = cp.spawnSync(
        process.execPath,
        [cliPath, 'install', '--skills', 'goal-fix-pr', '--yes', '--force-integrity'],
        {
          cwd: iDir,
          encoding: 'utf8',
          env: { ...process.env, FORCE_COLOR: '0' },
          timeout: 120000,
        }
      );
      if (forced.status !== 0) {
        console.error(`${forced.stdout || ''}${forced.stderr || ''}`);
        fail(`--force-integrity install exited ${forced.status}`);
      }
      if (!fs.existsSync(path.join(iDir, '.agents', 'skills', 'goal-fix-pr'))) {
        fail('--force-integrity should install despite source mismatch');
      }
      ok('--force-integrity overrides source mismatch');
    } finally {
      fs.writeFileSync(closureSkillMd, closureBackup);
    }

    // Clean reinstall for remaining scenarios
    fs.rmSync(iDir, { recursive: true, force: true });
    fs.mkdirSync(iDir, { recursive: true });
    const clean = cp.spawnSync(
      process.execPath,
      [cliPath, 'install', '--package', 'workflows', '--yes'],
      {
        cwd: iDir,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0' },
        timeout: 180000,
      }
    );
    if (clean.status !== 0) {
      console.error(`${clean.stdout || ''}${clean.stderr || ''}`);
      fail(`workflows install for integrity tests exited ${clean.status}`);
    }
    const localRecord = path.join(
      iDir,
      '.agents',
      'skills',
      'shared',
      'skill-integrity-local.json'
    );
    if (!fs.existsSync(localRecord)) fail('post-install must write skill-integrity-local.json');
    const local = JSON.parse(fs.readFileSync(localRecord, 'utf8'));
    if (!local.verifiedAt || !local.installedClosureDigest || !local.skills) {
      fail('local integrity record missing required fields');
    }
    const memPath = path.join(iDir, '.agents', 'skills', 'shared', 'MEMORY.md');
    const cfgPath = path.join(iDir, '.agents', 'skills', 'shared', 'config.json');
    const cfgBefore = fs.readFileSync(cfgPath, 'utf8');
    ok('post-install writes local integrity record');

    // Post-verify must not bless a failed tree: extra unmanaged file → update fails,
    // prior skill-integrity-local.json must stay unchanged (so audit still fails).
    {
      const priorLocal = fs.readFileSync(localRecord, 'utf8');
      const extraPath = path.join(iDir, '.agents', 'skills', 'caveman', 'integrity-extra.txt');
      fs.writeFileSync(extraPath, 'not-in-manifest\n');
      const upd = cp.spawnSync(process.execPath, [cliPath, 'update'], {
        cwd: iDir,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0' },
        timeout: 180000,
      });
      if (upd.status === 0) {
        fail('update should fail post-verify when unmanaged extra file remains in skill tree');
      }
      if (!/consumer tree mismatch/i.test(`${upd.stdout || ''}${upd.stderr || ''}`)) {
        fail(
          `expected consumer mismatch on extra file\n${upd.stdout || ''}${upd.stderr || ''}`
        );
      }
      const afterFail = fs.readFileSync(localRecord, 'utf8');
      if (afterFail !== priorLocal) {
        fail('post-verify failure must not rewrite skill-integrity-local.json from actual digests');
      }
      const auditExtra = cp.spawnSync(process.execPath, [cliPath, 'integrity'], {
        cwd: iDir,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0' },
        timeout: 60000,
      });
      if (auditExtra.status === 0) {
        fail('integrity audit must still fail while extra unmanaged file remains');
      }
      fs.unlinkSync(extraPath);
      const restore = cp.spawnSync(process.execPath, [cliPath, 'update'], {
        cwd: iDir,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0' },
        timeout: 180000,
      });
      if (restore.status !== 0) {
        console.error(`${restore.stdout || ''}${restore.stderr || ''}`);
        fail('failed to restore clean tree after extra-file post-verify test');
      }
    }
    ok('post-verify failure does not bless bad local integrity record');

    // AC6: mutate managed skill → integrity fails
    const managedSkill = path.join(iDir, '.agents', 'skills', 'caveman', 'SKILL.md');
    fs.appendFileSync(managedSkill, '\n# mutated-after-install\n');
    const auditFail = cp.spawnSync(process.execPath, [cliPath, 'integrity'], {
      cwd: iDir,
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0' },
      timeout: 60000,
    });
    if (auditFail.status === 0) fail('integrity should fail after managed file mutation');
    if (!/caveman\/SKILL\.md/i.test(`${auditFail.stdout || ''}${auditFail.stderr || ''}`)) {
      fail(`integrity should report mutated path\n${auditFail.stdout || ''}${auditFail.stderr || ''}`);
    }
    // restore for further checks
    const srcSkill = fs.readFileSync(
      path.join(parentDir, '.agents', 'skills', 'caveman', 'SKILL.md')
    );
    fs.writeFileSync(managedSkill, srcSkill);
    ok('integrity audit fails on managed file mutation');

    // AC8: consumer-owned edits do not fail integrity
    fs.appendFileSync(memPath, '\n# consumer memory edit\n');
    fs.writeFileSync(
      cfgPath,
      JSON.stringify({ ...JSON.parse(cfgBefore), project: { name: 'integrity-consumer' } }, null, 2)
    );
    const auditOk = cp.spawnSync(process.execPath, [cliPath, 'integrity'], {
      cwd: iDir,
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0' },
      timeout: 60000,
    });
    if (auditOk.status !== 0) {
      console.error(`${auditOk.stdout || ''}${auditOk.stderr || ''}`);
      fail('integrity must ignore consumer-owned MEMORY.md/config.json edits');
    }
    if (!fs.readFileSync(memPath, 'utf8').includes('consumer memory edit')) {
      fail('test setup failed to edit MEMORY.md');
    }
    ok('consumer-owned edits ignored by integrity');

    // AC7: selective install — Extra-only skill absence is not a failure
    const sDir = path.join(__dirname, '.pkg-integrity-sel');
    fs.rmSync(sDir, { recursive: true, force: true });
    fs.mkdirSync(sDir, { recursive: true });
    const sel = cp.spawnSync(
      process.execPath,
      [cliPath, 'install', '--skills', 'goal-fix-pr', '--yes'],
      {
        cwd: sDir,
        encoding: 'utf8',
        env: { ...process.env, FORCE_COLOR: '0' },
        timeout: 120000,
      }
    );
    if (sel.status !== 0) {
      console.error(`${sel.stdout || ''}${sel.stderr || ''}`);
      fail(`selective goal-fix-pr install exited ${sel.status}`);
    }
    if (fs.existsSync(path.join(sDir, '.agents', 'skills', 'write-a-skill'))) {
      fail('selective install should not include write-a-skill');
    }
    const selAudit = cp.spawnSync(process.execPath, [cliPath, 'integrity'], {
      cwd: sDir,
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0' },
      timeout: 60000,
    });
    if (selAudit.status !== 0) {
      console.error(`${selAudit.stdout || ''}${selAudit.stderr || ''}`);
      fail('selective integrity audit should pass without Extra-only skills');
    }
    const selOut = `${selAudit.stdout || ''}${selAudit.stderr || ''}`;
    if (/write-a-skill/.test(selOut)) {
      fail('selective audit must not report missing write-a-skill');
    }
    ok('selective closure integrity ignores non-installed skills');

    fs.rmSync(iDir, { recursive: true, force: true });
    fs.rmSync(sDir, { recursive: true, force: true });
  }

  console.log('\n✅ Success! Install, canonicity, self-overwrite, update+config preserve, packages, deps, non-interactive --yes, MEMORY isolation, uninstall, and integrity all passed.');
  process.exit(0);
});
