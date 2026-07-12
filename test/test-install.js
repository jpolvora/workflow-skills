import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const useLocal = process.argv.includes('--local');
const rootSkillsDir = path.resolve(__dirname, '../.agents/skills');
const testSkillsDir = path.resolve(__dirname, '.agents/skills');

console.log("============================================================");
console.log("  Workflow Skills - Installation Test Suite");
console.log("============================================================");
console.log(`Mode:          ${useLocal ? 'Local (development release)' : 'Remote (github:jpolvora/workflow-skills)'}`);
console.log(`Source Skills: ${rootSkillsDir}`);
console.log(`Test Skills:   ${testSkillsDir}`);
console.log("------------------------------------------------------------");

// 1. Clean test/.agents directory
console.log("Cleaning target test/.agents/ directory...");
const targetAgentsDir = path.resolve(__dirname, '.agents');
if (fs.existsSync(targetAgentsDir)) {
  fs.rmSync(targetAgentsDir, { recursive: true, force: true });
}

const parentDir = path.resolve(__dirname, '..');
const tgzFiles = fs.readdirSync(parentDir).filter(f => f.startsWith('workflow-skills-') && f.endsWith('.tgz'));
const tgzName = tgzFiles[0];
const tgzPath = tgzName ? path.join(parentDir, tgzName) : '';

if (useLocal) {
  if (!tgzPath) {
    console.error("❌ Error: No .tgz package found in parent folder. Did you run npm pack?");
    process.exit(1);
  }
  console.log(`Found package tarball: ${tgzPath}`);
  console.log(`Installing local package pack (${tgzName}) in test environment...`);
  const installResult = cp.spawnSync('npm', ['install', tgzPath], {
    cwd: __dirname,
    shell: true,
    stdio: 'inherit'
  });
  if (installResult.status !== 0) {
    console.error("❌ Error: npm install of packed tarball failed.");
    process.exit(1);
  }
}

// 2. Select command and arguments
const command = 'npx';
const args = useLocal ? ['workflow-skills'] : ['-y', 'github:jpolvora/workflow-skills'];

console.log(`Spawning installer: ${command} ${args.join(' ')}`);
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

  if (output.includes("Select action or toggle") && !selectAllSent) {
    selectAllSent = true;
    console.log("\n[Test Automation] Sending 'a' to select all skills...");
    child.stdin.write("a\n");
  } else if (output.includes("Select action or toggle") && selectAllSent && !installSent) {
    installSent = true;
    console.log("\n[Test Automation] Sending 'y' to confirm installation...");
    child.stdin.write("y\n");
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
    console.error(`\n❌ Installer process exited with error code ${code}`);
    process.exit(1);
  }

  console.log("\n------------------------------------------------------------");
  console.log("Installation finished successfully. Starting verification...");
  console.log("------------------------------------------------------------");

  if (!fs.existsSync(rootSkillsDir)) {
    console.error(`❌ Source skills directory not found at: ${rootSkillsDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(testSkillsDir)) {
    console.error(`❌ Target skills directory not found at: ${testSkillsDir}`);
    process.exit(1);
  }

  // 3. Helper to recursively find files and directories
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

  const ignoredPatterns = [
    /__pycache__/,
    /[\\/]runs([\\/]|$)/,
    /\.gitignore$/,
    /config\.json$/
  ];

  function shouldInclude(relPath) {
    // Only include files/directories inside actual skill subfolders
    const parts = relPath.split(path.sep);
    if (parts.length < 2) {
      return false; // Skip files directly under .agents/skills/ (like check-harness.md)
    }
    // Skip ignored patterns (caches, configurations, runs)
    return !ignoredPatterns.some(pattern => pattern.test(relPath));
  }

  const rootFiles = getFilesRecursive(rootSkillsDir)
    .map(item => ({
      relPath: path.relative(rootSkillsDir, item.path),
      isDir: item.isDir
    }))
    .filter(item => shouldInclude(item.relPath))
    .sort((a, b) => a.relPath.localeCompare(b.relPath));

  const testFiles = getFilesRecursive(testSkillsDir)
    .map(item => ({
      relPath: path.relative(testSkillsDir, item.path),
      isDir: item.isDir
    }))
    .filter(item => shouldInclude(item.relPath))
    .sort((a, b) => a.relPath.localeCompare(b.relPath));

  const rootPaths = rootFiles.map(f => f.relPath);
  const testPaths = testFiles.map(f => f.relPath);

  let mismatch = false;

  // Find missing in test
  const missingInTest = rootPaths.filter(p => !testPaths.includes(p));
  if (missingInTest.length > 0) {
    console.error("\n❌ Mismatch: Missing files/directories in target installation:");
    missingInTest.forEach(p => console.error(`  - ${p}`));
    mismatch = true;
  }

  // Find extra in test
  const extraInTest = testPaths.filter(p => !rootPaths.includes(p));
  if (extraInTest.length > 0) {
    console.error("\n❌ Mismatch: Extra unexpected files/directories in target installation:");
    extraInTest.forEach(p => console.error(`  + ${p}`));
    mismatch = true;
  }

  // Compare file contents for shared files
  const commonFiles = rootFiles.filter(f => !f.isDir && testPaths.includes(f.relPath));
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
    console.error("\n❌ Directory verification failed.");
    if (!useLocal) {
      console.log("\n💡 Note: You are running the remote installation test.");
      console.log("If you have local uncommitted changes, they won't match the remote repository.");
      console.log("Run the local installer test instead to check local changes:");
      console.log("  npm run tests -- --local");
    }
    process.exit(1);
  }

  console.log("\n✅ Success! All files, directories, and file contents match perfectly!");
  process.exit(0);
});
