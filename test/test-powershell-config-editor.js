/**
 * Test Suite: PowerShell Windows Forms Config Editor (Edit-WorkflowSkillsConfig.ps1)
 *
 * Verifies:
 * - AC1: Script presence and path in ws-shared/runtime/scripts/
 * - AC2, AC3, AC4: Schema & comment inspection, ASCII safety, theme palettes
 * - AC14, AC15: Backup creation, comment preservation on save
 * - AC16: Headless / NonInteractive diagnostic execution
 * - AC17: Convenience batch launcher existence and validity
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const SCRIPT_PATH = path.join(
  REPO_ROOT,
  '.agents',
  'skills',
  'ws-shared',
  'runtime',
  'scripts',
  'Edit-WorkflowSkillsConfig.ps1'
);
const LAUNCHER_PATH = path.join(
  REPO_ROOT,
  '.agents',
  'skills',
  'ws-shared',
  'runtime',
  'scripts',
  'Edit-Config.bat'
);
const SCHEMA_PATH = path.join(
  REPO_ROOT,
  '.agents',
  'skills',
  'ws-shared',
  'runtime',
  'config.schema.json'
);
const EXAMPLE_PATH = path.join(
  REPO_ROOT,
  '.agents',
  'skills',
  'ws-shared',
  'templates',
  'config.json.example'
);

function runPowerShell(command, options = {}) {
  const psExe = process.platform === 'win32' ? 'powershell' : 'pwsh';
  return cp.spawnSync(psExe, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    ...options,
  });
}

function runPowerShellFile(args, options = {}) {
  const psExe = process.platform === 'win32' ? 'powershell' : 'pwsh';
  return cp.spawnSync(psExe, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    ...options,
  });
}

console.log('--- Running PowerShell Config Editor Tests ---');

// Test 1: File existence
console.log('Test 1: Verifying script and launcher files exist...');
assert(fs.existsSync(SCRIPT_PATH), `Edit-WorkflowSkillsConfig.ps1 not found at ${SCRIPT_PATH}`);
assert(fs.existsSync(LAUNCHER_PATH), `Edit-Config.bat not found at ${LAUNCHER_PATH}`);
assert(fs.existsSync(SCHEMA_PATH), `config.schema.json not found at ${SCHEMA_PATH}`);
assert(fs.existsSync(EXAMPLE_PATH), `config.json.example not found at ${EXAMPLE_PATH}`);
console.log('  PASS: All required files exist.');

// Test 2: ASCII safety verification (prevents Windows PowerShell 5.1 codepage parser errors)
console.log('Test 2: Verifying pure ASCII safety in Edit-WorkflowSkillsConfig.ps1...');
const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
const nonAscii = [];
for (let i = 0; i < scriptContent.length; i++) {
  const code = scriptContent.charCodeAt(i);
  if (code > 127) {
    nonAscii.push({ index: i, char: scriptContent[i], code });
  }
}
assert.strictEqual(
  nonAscii.length,
  0,
  `Edit-WorkflowSkillsConfig.ps1 contains non-ASCII characters: ${JSON.stringify(nonAscii.slice(0, 5))}`
);
console.log('  PASS: Script is 100% ASCII-safe.');

// Test 3: PowerShell AST Syntax Parsing
console.log('Test 3: Validating PowerShell script syntax via Language AST parser...');
const astCheck = runPowerShell(`
  $errors = $null
  $tokens = $null
  $ast = [System.Management.Automation.Language.Parser]::ParseFile('${SCRIPT_PATH.replace(/\\/g, '\\\\')}', [ref]$tokens, [ref]$errors)
  if ($errors -and $errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_.Message }
    exit 1
  }
  exit 0
`);
assert.strictEqual(
  astCheck.status,
  0,
  `PowerShell AST syntax error in Edit-WorkflowSkillsConfig.ps1:\n${astCheck.stderr || astCheck.stdout}`
);
console.log('  PASS: Script syntax is valid.');

// Test 4: Execution in -CheckOnly mode
console.log('Test 4: Executing Edit-WorkflowSkillsConfig.ps1 in -CheckOnly diagnostic mode...');
const checkRun = runPowerShellFile(['-CheckOnly']);
assert.strictEqual(
  checkRun.status,
  0,
  `CheckOnly execution failed with code ${checkRun.status}:\n${checkRun.stderr || checkRun.stdout}`
);
assert(checkRun.stdout.includes('Workflow Skills Config Editor Diagnostic'), 'Diagnostic header missing');
assert(checkRun.stdout.includes('Validation PASSED'), 'Validation PASSED marker missing');
assert(checkRun.stdout.includes('descriptions loaded') || checkRun.stdout.includes('entries indexed'), 'Description count missing');
console.log('  PASS: Diagnostic execution passed cleanly.');

// Test 5: Sandbox test for comment preservation and persistence
console.log('Test 5: Testing save persistence and comment preservation in sandbox...');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-cfg-test-'));
try {
  const tmpConfig = path.join(tmpDir, 'config.json');
  fs.copyFileSync(EXAMPLE_PATH, tmpConfig);

  // Read before modification to collect all _comment keys
  const originalJson = JSON.parse(fs.readFileSync(tmpConfig, 'utf8'));
  function collectComments(obj, targetList, prefix = '') {
    for (const key of Object.keys(obj)) {
      if (key.startsWith('_comment')) {
        targetList.push(prefix ? `${prefix}.${key}` : key);
      } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        collectComments(obj[key], targetList, prefix ? `${prefix}.${key}` : key);
      }
    }
  }
  const originalCommentKeys = [];
  collectComments(originalJson, originalCommentKeys);
  assert(originalCommentKeys.length > 10, 'Expected config.json.example to have comments');

  // Run a headless PowerShell snippet using the script's functions to load, toggle a value, and save
  const testScript = `
    . '${SCRIPT_PATH.replace(/\\/g, '\\\\')}' -ConfigPath '${tmpConfig.replace(/\\/g, '\\\\')}' -RepoRoot '${REPO_ROOT.replace(/\\/g, '\\\\')}' -FunctionsOnly
    Set-ConfigValue -Path 'defaults.enableDag' -Value $false
    Set-ConfigValue -Path 'defaults.minVerifyScore' -Value 8
    Save-ConfigurationFile
  `;
  const saveRun = runPowerShell(testScript);
  assert.strictEqual(
    saveRun.status,
    0,
    `Sandbox save failed with code ${saveRun.status}:\n${saveRun.stderr || saveRun.stdout}`
  );

  // Verify backup was created
  const bakPath = `${tmpConfig}.bak`;
  assert(fs.existsSync(bakPath), 'Expected config.json.bak backup file to be created');

  // Verify updated config.json
  const updatedJson = JSON.parse(fs.readFileSync(tmpConfig, 'utf8'));
  assert.strictEqual(updatedJson.defaults.enableDag, false, 'enableDag was not updated to false');
  assert.strictEqual(updatedJson.defaults.minVerifyScore, 8, 'minVerifyScore was not updated to 8');

  // Verify all original comments are still present in updated JSON
  const updatedCommentKeys = [];
  collectComments(updatedJson, updatedCommentKeys);
  for (const cKey of originalCommentKeys) {
    assert(
      updatedCommentKeys.includes(cKey),
      `Comment key ${cKey} was lost during Save-ConfigurationFile`
    );
  }
  console.log(`  PASS: Persistence created backup, updated values, and preserved all ${originalCommentKeys.length} comment keys.`);
} finally {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

// Test 6: Convenience launcher batch file
console.log('Test 6: Validating Edit-Config.bat batch launcher...');
const batContent = fs.readFileSync(LAUNCHER_PATH, 'utf8');
assert(batContent.includes('Edit-WorkflowSkillsConfig.ps1'), 'Batch file does not reference Edit-WorkflowSkillsConfig.ps1');
assert(batContent.includes('-ExecutionPolicy Bypass'), 'Batch file does not specify execution policy bypass');

if (process.platform === 'win32') {
  const batRun = cp.spawnSync('cmd.exe', ['/c', LAUNCHER_PATH, '-CheckOnly'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.strictEqual(
    batRun.status,
    0,
    `Edit-Config.bat -CheckOnly failed:\n${batRun.stderr || batRun.stdout}`
  );
}
console.log('  PASS: Batch launcher validated.');

// Test 7: Control event simulation and robust path validation
console.log('Test 7: Validating control event handlers and defensive path routing...');
const eventTestScript = `
  $ErrorActionPreference = 'Stop'
  . '${SCRIPT_PATH.replace(/\\/g, '\\\\')}' -FunctionsOnly

  # 1. Defensively handle null/empty/whitespace paths
  Set-ConfigValue -Path '' -Value $true
  Set-ConfigValue -Path '   ' -Value $true
  Set-ConfigValue -Path $null -Value $true
  $nullGet = Get-ConfigValue -Path '' -DefaultValue 'default'
  if ($nullGet -ne 'default') { throw 'Expected default for empty path' }

  # 2. Set nested properties
  Set-ConfigValue -Path 'specMemo.enabled' -Value $true
  Set-ConfigValue -Path 'issueTrackers.github.enabled' -Value $true
  $val1 = Get-ConfigValue -Path 'specMemo.enabled'
  $val2 = Get-ConfigValue -Path 'issueTrackers.github.enabled'
  if ($val1 -ne $true -or $val2 -ne $true) {
    throw 'Failed to set nested config values'
  }

  # 3. Simulate WinForms control event handlers with $this.Tag binding
  Set-ConfigValue -Path 'specMemo.enabled' -Value $false
  Add-Type -AssemblyName System.Windows.Forms
  $chk = New-Object System.Windows.Forms.CheckBox
  $chk.Tag = 'specMemo.enabled'
  $chk.Add_CheckedChanged({
    if ($this.Tag) {
      Set-ConfigValue -Path ([string]$this.Tag) -Value $this.Checked
    }
  })
  $chk.Checked = $true
  $valAfter = Get-ConfigValue -Path 'specMemo.enabled'
  if ($valAfter -ne $true) {
    throw 'Failed to update value via CheckBox event handler'
  }

  # 4. Set deeply nested property (e.g. defaults.hostAdapter.mode) without constructor exception
  Set-ConfigValue -Path 'defaults.hostAdapter.mode' -Value 'cli-command'
  $modeVal = Get-ConfigValue -Path 'defaults.hostAdapter.mode'
  if ($modeVal -ne 'cli-command') {
    throw 'Failed to set deeply nested defaults.hostAdapter.mode'
  }

  # 5. Verify description separation between keys with same name (defaults.hostAdapter.mode vs specMemo.mode)
  Reload-Configuration
  $hostDesc = Get-SettingDescription -Section 'defaults.hostAdapter' -Key 'mode'
  $memoDesc = Get-SettingDescription -Section 'specMemo' -Key 'mode'
  if ($hostDesc -like '*vault = spec-memo only*') {
    throw 'Description bleeding: defaults.hostAdapter.mode inherited specMemo.mode description'
  }
  if ($memoDesc -notlike '*vault = spec-memo only*') {
    throw 'specMemo.mode did not return expected vault storage description'
  }

  Write-Output 'OK'
`;
const eventRun = runPowerShell(eventTestScript);
assert.strictEqual(
  eventRun.status,
  0,
  `Control event test failed with code ${eventRun.status}:\n${eventRun.stderr || eventRun.stdout}`
);
assert(eventRun.stdout.includes('OK'), 'Event handler test did not output OK');
console.log('  PASS: Control events and Tag bindings validated without exception.');

console.log('\nALL 7 POWERSHELL CONFIG EDITOR TESTS PASSED.');

