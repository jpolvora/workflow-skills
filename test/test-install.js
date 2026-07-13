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
  /config\.json$/
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
    '.agents/skills/spec-to-pr/config.schema.json',
    '.agents/skills/spec-to-pr/config.json.example',
    '.agents/skills/spec-to-pr/spec-to-pr-run-test.md',
    '.agents/skills/spec-to-pr/SKILL.md',
    // Spec-source / SCM provider skills (packed under .agents/skills/)
    '.agents/skills/github-provider/SKILL.md',
    '.agents/skills/azure-devops-provider/SKILL.md',
    '.agents/skills/local-spec-provider/SKILL.md'
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(parentDir, rel))) fail(`Missing required file: ${rel}`);
  }
  const artifacts = fs.readFileSync(path.join(parentDir, '.agents/skills/spec-to-pr/ARTIFACTS.md'), 'utf8');
  if (!artifacts.includes('step-00-{slug}.spec.md')) fail('ARTIFACTS.md missing canonical step-00 spec name');
  if (!artifacts.includes('07-integration-validation')) fail('ARTIFACTS.md missing Step 11 ownership');
  // AC9: legacy converter paths must remain (thin shims → provider canonical scripts)
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
    path.join(parentDir, '.agents/skills/spec-to-pr/extra-skills/goal-loop/SKILL.md'),
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
    fs.readFileSync(path.join(parentDir, '.agents/skills/spec-to-pr/config.json.example'), 'utf8')
  );
  if (!example.project?.workingBranch) fail('config.json.example missing project.workingBranch');
  if (!example.plans?.dir) fail('config.json.example missing plans.dir');
  if (!example.providers?.active) fail('config.json.example missing providers.active');
  if (!example.providers?.scm) fail('config.json.example missing providers.scm');
  ok('Canonicity + contract files present (providers + converter shims)');
}

// 1. Clean test/.agents directory
console.log('\nCleaning target test/.agents/ directory...');
const targetAgentsDir = path.resolve(__dirname, '.agents');
if (fs.existsSync(targetAgentsDir)) {
  fs.rmSync(targetAgentsDir, { recursive: true, force: true });
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

child.on('close', (code) => {
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
    plans: { dir: '.cursor/plans' },
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
      s === 'taste-skill' ||
      s === 'mobile-first-design' ||
      s === 'write-a-skill'
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
    '07-integration-validation',
    '11-ship-pr',
    'github-provider',
    'azure-devops-provider',
    'local-spec-provider'
  ].filter((s) => !installedAfter.includes(s));
  if (missingPipeline.length) {
    fail(`Pipeline/provider skills missing after update: ${missingPipeline.join(', ')}`);
  }
  for (const name of ['github-provider', 'azure-devops-provider', 'local-spec-provider']) {
    if (!fs.existsSync(path.join(testSkillsDir, name, 'SKILL.md'))) {
      fail(`Provider SKILL.md missing after install/update: ${name}/SKILL.md`);
    }
  }
  // AC9 shims must ship to consumers
  for (const rel of [
    path.join('spec-to-pr', 'scripts', 'github-issue-to-spec.py'),
    path.join('spec-to-pr', 'scripts', 'ado-workitem-to-spec.py')
  ]) {
    if (!fs.existsSync(path.join(testSkillsDir, rel))) {
      fail(`Converter shim missing in consumer install: ${rel}`);
    }
  }
  ok(`Pipeline + provider skills present (${installedAfter.length} dirs; source has ${sourceSkills.length})`);
  // --- Phase 2b: rename migration us-workflow → spec-to-pr ---
  console.log('\n[Phase 2b] Migrate legacy us-workflow folder on update...');
  const legacyDir = path.join(testSkillsDir, 'us-workflow');
  const modernDir = path.join(testSkillsDir, 'spec-to-pr');
  const legacyMarker = {
    project: { name: 'legacy-migrated-project', baseBranch: 'main' },
    plans: { dir: '.cursor/plans' },
    verification: { backendBuild: 'echo legacy' },
    _legacyMarker: 'from-us-workflow'
  };
  if (fs.existsSync(modernDir)) {
    fs.rmSync(legacyDir, { recursive: true, force: true });
    fs.renameSync(modernDir, legacyDir);
    fs.writeFileSync(path.join(legacyDir, 'config.json'), JSON.stringify(legacyMarker, null, 2), 'utf8');
  } else {
    fail('spec-to-pr missing before rename-migration test');
  }

  const migrateUpdate = cp.spawnSync(
    'npx',
    useLocal ? ['workflow-skills', 'update'] : ['-y', 'github:jpolvora/workflow-skills', 'update'],
    { cwd: __dirname, shell: true, encoding: 'utf8' }
  );
  if (migrateUpdate.status !== 0) {
    console.error(migrateUpdate.stdout);
    console.error(migrateUpdate.stderr);
    fail(`rename migration update failed with code ${migrateUpdate.status}`);
  }
  if (fs.existsSync(legacyDir)) fail('legacy us-workflow folder still present after migration');
  if (!fs.existsSync(modernDir)) fail('spec-to-pr not created by migration');
  const migratedCfg = JSON.parse(fs.readFileSync(path.join(modernDir, 'config.json'), 'utf8'));
  if (migratedCfg._legacyMarker !== 'from-us-workflow') {
    fail('config.json from us-workflow was not preserved during migration');
  }
  ok('us-workflow → spec-to-pr migration preserves config.json');

  // --- Phase 3: packed file smoke (local only) ---
  if (useLocal) {
    const schemaInTest = path.join(testSkillsDir, 'spec-to-pr', 'config.schema.json');
    const artifactsInTest = path.join(testSkillsDir, 'spec-to-pr', 'ARTIFACTS.md');
    if (!fs.existsSync(schemaInTest)) fail('config.schema.json not installed into consumer');
    if (!fs.existsSync(artifactsInTest)) fail('ARTIFACTS.md not installed into consumer');
    ok('schema + ARTIFACTS shipped to consumer');
  }

  console.log('\n✅ Success! Install, canonicity, self-overwrite, update+config preserve, rename migration all passed.');
  process.exit(0);
});
