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
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// The repository's own consumer hub config: no test in this file may target it.
const HUB_CONFIG_PATH = path.join(REPO_ROOT, '.ws', 'config.json');
const HUB_BACKUP_PATH = `${HUB_CONFIG_PATH}.bak`;

function fileSha256(file) {
  return fs.existsSync(file)
    ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    : null;
}

// Isolated invocation fixture: an editor call never reaches the live hub config.
function createTempConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-cfg-invoke-'));
  const configPath = path.join(dir, 'config.json');
  fs.copyFileSync(EXAMPLE_PATH, configPath);
  return { dir, configPath };
}

// Safely embed a path inside a PowerShell single-quoted literal: double the
// backslashes (Win32 collapses them) and escape embedded apostrophes as ''.
function toPsLiteral(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "''");
}

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

function isPowerShellAvailable() {
  if (process.env.TEST_FORCE_NO_POWERSHELL === '1') {
    return false;
  }
  const psExe = process.platform === 'win32' ? 'powershell' : 'pwsh';
  try {
    const res = cp.spawnSync(psExe, ['-NoProfile', '-Command', 'exit 0'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    return res.status === 0;
  } catch {
    return false;
  }
}

function isWindowsFormsAvailable() {
  if (process.env.TEST_FORCE_NO_WINFORMS === '1' || process.platform !== 'win32') {
    return false;
  }
  const probe = runPowerShell(`
    try {
      Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
      exit 0
    } catch {
      exit 1
    }
  `);
  return probe.status === 0;
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

// Regression baseline (AC6): the repository's own hub config and its backup must
// be byte-identical before and after every editor invocation in this suite.
// Hashing the backup (not just its presence) also catches an in-place overwrite.
const hubConfigShaBefore = fileSha256(HUB_CONFIG_PATH);
const hubBackupShaBefore = fileSha256(HUB_BACKUP_PATH);

function assertHubConfigUnchanged(stage) {
  assert.strictEqual(
    fileSha256(HUB_CONFIG_PATH),
    hubConfigShaBefore,
    `AC6: repository hub config must be byte-identical ${stage}`
  );
  assert.strictEqual(
    fileSha256(HUB_BACKUP_PATH),
    hubBackupShaBefore,
    `AC6: repository hub config backup must be byte-identical ${stage}`
  );
}

// Check PowerShell availability before executing dynamic tests
const psAvailable = isPowerShellAvailable();
if (!psAvailable) {
  console.log('\nNOTICE: Neither powershell nor pwsh is available on this system.');
  console.log('Skipping dynamic PowerShell execution tests (Tests 3-7).');
  assertHubConfigUnchanged('after static-only editor tests');
  console.log('Static tests passed cleanly.');
  process.exit(0);
}

// Test 3: PowerShell AST Syntax Parsing
console.log('Test 3: Validating PowerShell script syntax via Language AST parser...');
const astCheck = runPowerShell(`
  $errors = $null
  $tokens = $null
  $ast = [System.Management.Automation.Language.Parser]::ParseFile('${toPsLiteral(SCRIPT_PATH)}', [ref]$tokens, [ref]$errors)
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

// Test 4: Execution in -CheckOnly mode (AC1: explicit -ConfigPath; AC2: no-ConfigPath no-write)
console.log('Test 4: Executing Edit-WorkflowSkillsConfig.ps1 in -CheckOnly diagnostic mode...');
const t4 = createTempConfig();
try {
  const checkRun = runPowerShellFile(['-CheckOnly', '-ConfigPath', t4.configPath]);
  assert.strictEqual(
    checkRun.status,
    0,
    `CheckOnly execution failed with code ${checkRun.status}:\n${checkRun.stderr || checkRun.stdout}`
  );
  assert(checkRun.stdout.includes('Workflow Skills Config Editor Diagnostic'), 'Diagnostic header missing');
  assert(checkRun.stdout.includes('Validation PASSED'), 'Validation PASSED marker missing');
  assert(checkRun.stdout.includes('descriptions loaded') || checkRun.stdout.includes('entries indexed'), 'Description count missing');

  // AC2 negative probe: -CheckOnly with NO -ConfigPath must not write to the live hub.
  const noPathRun = runPowerShellFile(['-CheckOnly']);
  assert.strictEqual(
    noPathRun.status,
    0,
    `CheckOnly (no -ConfigPath) failed with code ${noPathRun.status}:\n${noPathRun.stderr || noPathRun.stdout}`
  );
  assert.strictEqual(
    fileSha256(HUB_CONFIG_PATH),
    hubConfigShaBefore,
    'AC2: -CheckOnly without -ConfigPath must not mutate the repository hub config'
  );
  assert.strictEqual(
    fileSha256(HUB_BACKUP_PATH),
    hubBackupShaBefore,
    'AC2: -CheckOnly without -ConfigPath must not create or modify .ws/config.json.bak'
  );
  console.log('  PASS: Diagnostic execution is read-only, with and without -ConfigPath.');
} finally {
  fs.rmSync(t4.dir, { recursive: true, force: true });
}

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
    . '${toPsLiteral(SCRIPT_PATH)}' -ConfigPath '${toPsLiteral(tmpConfig)}' -RepoRoot '${toPsLiteral(REPO_ROOT)}' -FunctionsOnly
    Set-ConfigValue -Path 'defaults.enableDag' -Value $false
    Set-ConfigValue -Path 'defaults.minVerifyScore' -Value 8
    Set-ConfigValue -Path 'defaults.convergence.backoff' -Value ([double]1.5)
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
  assert.strictEqual(
    typeof updatedJson.defaults.convergence.backoff,
    'number',
    'numeric scalar (convergence.backoff) must persist as a JSON number, not a quoted string'
  );
  assert.strictEqual(updatedJson.defaults.convergence.backoff, 1.5, 'convergence.backoff value must round-trip');

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
  // AC4: any backup a test creates is removed before exit, on pass and failure.
  try {
    fs.rmSync(path.join(tmpDir, 'config.json.bak'), { force: true });
  } catch {}
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
  const t6 = createTempConfig();
  try {
    const batRun = cp.spawnSync('cmd.exe', ['/c', LAUNCHER_PATH, '-CheckOnly', '-ConfigPath', t6.configPath], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    assert.strictEqual(
      batRun.status,
      0,
      `Edit-Config.bat -CheckOnly failed:\n${batRun.stderr || batRun.stdout}`
    );
    assert.strictEqual(
      fileSha256(HUB_CONFIG_PATH),
      hubConfigShaBefore,
      'AC1: bat launcher invocation must target the explicit -ConfigPath, not the hub config'
    );
  } finally {
    fs.rmSync(t6.dir, { recursive: true, force: true });
  }
} else {
  console.log('  SKIP: Edit-Config.bat execution test skipped on non-Windows platform.');
}
console.log('  PASS: Batch launcher validated.');

// Test 7: Control event simulation and robust path validation
console.log('Test 7: Validating control event handlers and defensive path routing...');
const winFormsAvailable = isWindowsFormsAvailable();

const winFormsSection = winFormsAvailable
  ? `
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
`
  : `
  # 3. WinForms control event handlers skipped (Windows Forms not available in CI/CD or non-Windows environment)
  Write-Host '  SKIP: WinForms control event simulation skipped (System.Windows.Forms not available on this platform/CI).'
`;

// AC1: the functions-only snippet loads an isolated temp config, never the hub config.
const t7 = createTempConfig();
const eventTestScript = `
  $ErrorActionPreference = 'Stop'
  . '${toPsLiteral(SCRIPT_PATH)}' -ConfigPath '${toPsLiteral(t7.configPath)}' -RepoRoot '${toPsLiteral(REPO_ROOT)}' -FunctionsOnly

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
${winFormsSection}
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
try {
  const eventRun = runPowerShell(eventTestScript);
  assert.strictEqual(
    eventRun.status,
    0,
    `Control event test failed with code ${eventRun.status}:\n${eventRun.stderr || eventRun.stdout}`
  );
  assert(eventRun.stdout.includes('OK'), 'Event handler test did not output OK');
  if (winFormsAvailable) {
    console.log('  PASS: Control events and Tag bindings validated without exception.');
  } else {
    console.log('  SKIP: WinForms control events skipped (System.Windows.Forms not available in this environment).');
    console.log('  PASS: Defensive path routing and configuration isolation validated.');
  }
} finally {
  // AC4: remove the isolated fixture on both the pass and the failure path.
  fs.rmSync(t7.dir, { recursive: true, force: true });
}

console.log('Test 8: Verifying Schema-to-GUI key parity for configured sections...');
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const guiScript = fs.readFileSync(SCRIPT_PATH, 'utf8');

const regex = /-Section\s+['"]([^'"]+)['"]\s+-Key\s+['"]([^'"]+)['"]/g;
const guiKeys = new Set();
let match;
while ((match = regex.exec(guiScript)) !== null) {
  guiKeys.add(`${match[1]}.${match[2]}`);
}

// 1. Verify all properties of 'plans' section are bound
const plansProps = Object.keys(schema.properties.plans?.properties || {});
assert(plansProps.length > 0, 'Schema plans.properties must not be empty');
for (const prop of plansProps) {
  const propSchema = schema.properties.plans.properties[prop];
  if (propSchema?.type === 'object' && propSchema?.properties) {
    for (const sub of Object.keys(propSchema.properties)) {
      assert(guiKeys.has(`plans.${prop}.${sub}`), `Missing schema property plans.${prop}.${sub} in Edit-WorkflowSkillsConfig.ps1`);
    }
    continue;
  }
  assert(guiKeys.has(`plans.${prop}`), `Missing schema property plans.${prop} in Edit-WorkflowSkillsConfig.ps1`);
}

// 2. Verify all properties of 'reviews' section are bound
const reviewsProps = Object.keys(schema.properties.reviews?.properties || {});
for (const prop of reviewsProps) {
  assert(guiKeys.has(`reviews.${prop}`), `Missing schema property reviews.${prop} in Edit-WorkflowSkillsConfig.ps1`);
}

// 2b. Verify all properties of 'preview' section are bound
const previewProps = Object.keys(schema.properties.preview?.properties || {});
for (const prop of previewProps) {
  assert(guiKeys.has(`preview.${prop}`), `Missing schema property preview.${prop} in Edit-WorkflowSkillsConfig.ps1`);
}

// 3. Verify core defaults properties
const coreDefaults = ['minVerifyScore', 'enableDag', 'verboseMode', 'enableOptionalProofOfWork', 'enableAutomaticEvidenceCollectForProofOfWork'];
for (const prop of coreDefaults) {
  assert(guiKeys.has(`defaults.${prop}`), `Missing schema property defaults.${prop} in Edit-WorkflowSkillsConfig.ps1`);
}

console.log(`  PASS: Schema-to-GUI parity validated (${guiKeys.size} bound keys, all plans/reviews/preview/defaults verified).`);

console.log('Test 9: Verifying structured schema nodes are not bound as plain string rows...');
const rowRegex = /-Section\s+['"]([^'"]+)['"]\s+-Key\s+['"]([^'"]+)['"][\s\S]*?-Type\s+['"]([^'"]+)['"]/g;
const mistyped = [];
let rowMatch;
while ((rowMatch = rowRegex.exec(guiScript)) !== null) {
  const [, section, key, rowType] = rowMatch;
  if (rowType === 'json') continue;
  if (rowType === 'array') {
    // The 'array' branch round-trips string arrays via line-split; only object
    // schemas (or non-string items) bound as 'array' would corrupt.
    let node = schema.properties || {};
    let resolved = true;
    for (const segment of [...section.split('.'), key]) {
      const props = node.properties || node;
      if (!props || typeof props !== 'object' || !(segment in props)) {
        resolved = false;
        break;
      }
      node = props[segment];
    }
    if (!resolved || !node || typeof node !== 'object') continue;
    const schemaTypes = Array.isArray(node.type) ? node.type : [node.type];
    const itemsType = node.items && !Array.isArray(node.items) ? node.items.type : undefined;
    if (schemaTypes.includes('object') || (schemaTypes.includes('array') && itemsType && itemsType !== 'string')) {
      mistyped.push(`${section}.${key} (row -Type 'array', schema type '${schemaTypes.join('|')}')`);
    }
    continue;
  }
  let node = schema.properties || {};
  let resolved = true;
  for (const segment of [...section.split('.'), key]) {
    const props = node.properties || node;
    if (!props || typeof props !== 'object' || !(segment in props)) {
      resolved = false;
      break;
    }
    node = props[segment];
  }
  if (!resolved || !node || typeof node !== 'object') continue;
  const schemaTypes = Array.isArray(node.type) ? node.type : [node.type];
  if (schemaTypes.includes('object') || schemaTypes.includes('array')) {
    mistyped.push(`${section}.${key} (row -Type '${rowType}', schema type '${schemaTypes.join('|')}')`);
  }
}
assert.strictEqual(
  mistyped.length,
  0,
  `GUI rows bind structured schema nodes as plain controls (renders/stores corrupt the value): ${mistyped.join('; ')}`
);
assert(
  guiScript.includes("$Type -eq 'json'"),
  "Add-ConfigFieldRow has no 'json' branch for object-typed config keys"
);
assert.match(
  guiScript,
  /-Key\s+['"]stepRunners['"][\s\S]*?-Type\s+['"]json['"]/,
  'defaults.stepRunners row must use -Type json'
);
assert.match(
  guiScript,
  /-Key\s+['"]runners['"][\s\S]*?-Type\s+['"]json['"]/,
  'defaults.runners row must use -Type json'
);
console.log('  PASS: No structured schema node is bound as a plain string row; baton rows use json.');

console.log('Test 9b: Verifying scalar schema types map to compatible GUI control types...');
const SCALAR_CONTROL_TYPES = {
  integer: ['int'],
  number: ['number', 'int'],
  boolean: ['bool'],
  string: ['string', 'enum', 'path-file', 'path-folder'],
};
const scalarMismatches = [];
const scalarRowRegex = /-Section\s+['"]([^'"]+)['"]\s+-Key\s+['"]([^'"]+)['"][\s\S]*?-Type\s+['"]([^'"]+)['"]/g;
let scalarMatch;
while ((scalarMatch = scalarRowRegex.exec(guiScript)) !== null) {
  const [, section, key, rowType] = scalarMatch;
  let node = schema.properties || {};
  let resolved = true;
  for (const segment of [...section.split('.'), key]) {
    const props = node.properties || node;
    if (!props || typeof props !== 'object' || !(segment in props)) {
      resolved = false;
      break;
    }
    node = props[segment];
  }
  if (!resolved || !node || typeof node !== 'object') continue;
  const schemaType = Array.isArray(node.type) ? node.type[0] : node.type;
  const allowed = SCALAR_CONTROL_TYPES[schemaType];
  if (!allowed) continue;
  if (!allowed.includes(rowType)) {
    scalarMismatches.push(`${section}.${key} (row -Type '${rowType}', schema type '${schemaType}')`);
  }
}
assert.strictEqual(
  scalarMismatches.length,
  0,
  `GUI scalar rows bind an incompatible control type (persists the wrong JSON type): ${scalarMismatches.join('; ')}`
);
assert.match(
  guiScript,
  /-Section\s+['"]defaults\.convergence['"]\s+-Key\s+['"]backoff['"][\s\S]*?-Type\s+['"]number['"]/,
  'defaults.convergence.backoff must bind -Type number (schema type number)'
);
assert(
  guiScript.includes("$Type -eq 'number'"),
  "Add-ConfigFieldRow has no 'number' branch for number-typed config keys"
);
console.log('  PASS: Scalar schema types map to compatible GUI control types (convergence.backoff is number).');

console.log('Test 10: Verifying AC8 GUI round-trip and schema parity (owner, tri-state false, karpathy default)...');
const guiKeys10 = new Set();
const keyRegex = /-Section\s+['"]([^'"]*)['"]\s+-Key\s+['"]([^'"]+)['"]/g;
let keyMatch;
while ((keyMatch = keyRegex.exec(guiScript)) !== null) {
  guiKeys10.add(keyMatch[1] ? `${keyMatch[1]}.${keyMatch[2]}` : keyMatch[2]);
}
assert(guiKeys10.has('issueTrackers.github.owner'), 'GUI must bind issueTrackers.github.owner');
assert(!guiKeys10.has('issueTrackers.github.org'), 'GUI must not persist the retired issueTrackers.github.org key');
assert(guiKeys10.has('issueTrackers.azureDevOps.apiBase'), 'GUI must bind issueTrackers.azureDevOps.apiBase');
assert(guiKeys10.has('fable.auditVerdictsBlockShip'), 'GUI must bind fable.auditVerdictsBlockShip');
assert(guiKeys10.has('rules.karpathyGuidelines'), 'GUI must bind rules.karpathyGuidelines');
assert(guiKeys10.has('ws-spec-translate-to-human.enabled'), 'GUI must bind ws-spec-translate-to-human.enabled');
assert(guiKeys10.has('ws-spec-translate-to-human.outputLanguage'), 'GUI must bind ws-spec-translate-to-human.outputLanguage');
assert.match(
  guiScript,
  /-Section\s+['"]rules['"]\s+-Key\s+['"]karpathyGuidelines['"][\s\S]*?-DefaultVal\s+['"]\.agents\/skills\/ws-senior-developer\/SKILL\.md['"]/,
  'rules.karpathyGuidelines default must be the packaged ws-senior-developer alias'
);
assert(
  !/-Section\s+['"]issueTrackers\.github['"]\s+-Key\s+['"]org['"]/.test(guiScript),
  'retired issueTrackers.github org row must be gone'
);
// Schema parity for the AC8 keys: fable tri-state enum carries boolean false.
const fableNode = schema.properties?.fable?.properties?.auditVerdictsBlockShip || {};
const fableEnum = Array.isArray(fableNode.enum) ? fableNode.enum : [];
assert(fableEnum.includes(false), 'schema fable.auditVerdictsBlockShip enum must include boolean false');
assert(!fableEnum.includes('false'), 'schema fable.auditVerdictsBlockShip enum must not include string "false"');

// Round-trip: selecting 'false' (enum display string) persists boolean false.
const tmpDir10 = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-cfg-ac8-'));
try {
  const tmpConfig10 = path.join(tmpDir10, 'config.json');
  fs.copyFileSync(EXAMPLE_PATH, tmpConfig10);
  const roundTrip = `
    . '${toPsLiteral(SCRIPT_PATH)}' -ConfigPath '${toPsLiteral(tmpConfig10)}' -RepoRoot '${toPsLiteral(REPO_ROOT)}' -FunctionsOnly
    Set-ConfigValue -Path 'fable.auditVerdictsBlockShip' -Value 'false'
    Set-ConfigValue -Path 'issueTrackers.github.owner' -Value 'acme'
    Save-ConfigurationFile
  `;
  const roundRun = runPowerShell(roundTrip);
  assert.strictEqual(
    roundRun.status,
    0,
    `AC8 round-trip save failed:\n${roundRun.stderr || roundRun.stdout}`
  );
  const roundJson = JSON.parse(fs.readFileSync(tmpConfig10, 'utf8'));
  assert.strictEqual(
    roundJson.fable.auditVerdictsBlockShip, false,
    'selecting false must persist boolean false, not string "false"'
  );
  assert.strictEqual(typeof roundJson.fable.auditVerdictsBlockShip, 'boolean', 'persisted false must be boolean');
  assert.strictEqual(roundJson.issueTrackers.github.owner, 'acme', 'owner binding must persist');
  assert(!('org' in (roundJson.issueTrackers.github || {})), 'org key must not be written');

  // Loading a config containing string "false" is rejected by the schema loader.
  const validatorPath = path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/scripts/validate_json_schema.cjs');
  const probeScript = `const { validateNode } = require(${JSON.stringify(validatorPath)});`
    + ` const schema = require(${JSON.stringify(SCHEMA_PATH)});`
    + ' const node = schema.properties.fable.properties.auditVerdictsBlockShip;'
    + ' const bad = validateNode("false", node, "fable.auditVerdictsBlockShip");'
    + ' const good = validateNode(false, node, "fable.auditVerdictsBlockShip");'
    + ' console.log(JSON.stringify({ bad: bad.length, good: good.length }));';
  const loaderProbe = cp.spawnSync(process.execPath, ['-e', probeScript], { encoding: 'utf8' });
  const probeResult = JSON.parse(loaderProbe.stdout.trim());
  assert(
    probeResult.bad > 0 && probeResult.good === 0,
    `string "false" must be rejected and boolean false accepted (got: ${loaderProbe.stdout.trim()})`
  );
  console.log('  PASS: AC8 round-trip and schema parity validated.');
} finally {
  // AC4: any backup a test creates is removed before exit, on pass and failure.
  try {
    fs.rmSync(path.join(tmpDir10, 'config.json.bak'), { force: true });
  } catch {}
  try {
    fs.rmSync(tmpDir10, { recursive: true, force: true });
  } catch {}
}

console.log('Test 11: Verifying visual-hierarchy enhancements (us-381)...');
assert(
  guiScript.includes('function Add-SectionHeader'),
  'Add-SectionHeader helper is missing from Edit-WorkflowSkillsConfig.ps1'
);
const headerCalls = guiScript.match(/Add-SectionHeader\s+-ParentPanel/g) || [];
assert(
  headerCalls.length >= 15,
  'Expected at least 15 section-header call sites, found ' + headerCalls.length
);
for (const tabId of ['project', 'verification', 'defaults', 'models', 'plans', 'rules', 'integrations']) {
  assert(
    guiScript.includes("Id = '" + tabId + "'"),
    'Tab definition Id ' + tabId + ' is missing from Populate-Sections'
  );
}
assert(
  guiScript.includes('$fc.TabIndex = $script:NextTabIndex'),
  'Sequential TabIndex wiring is missing from Add-ConfigFieldRow'
);
assert(
  guiScript.includes('$rowPanel.TabIndex = $script:NextRowIndex'),
  'Row-container TabIndex ordering is missing from Add-ConfigFieldRow'
);
assert(
  guiScript.includes('Unsaved changes - review, then Save or Apply.'),
  'Status-bar dirty indicator text is missing from Update-WindowTitle'
);
assert(
  guiScript.includes("$script:AppVersion = '1.1.0'"),
  'AppVersion 1.1.0 marker is missing'
);
const scriptLines = guiScript.split(/\r?\n/);
const mixedCalls = scriptLines.filter((l) => l.includes('Add-ConfigFieldRow') && l.includes('Add-SectionHeader'));
assert.strictEqual(
  mixedCalls.length,
  0,
  'Section-header calls must stand on their own line, never share one with Add-ConfigFieldRow: ' + mixedCalls.slice(0, 2).join(' | ')
);
const danglingSections = scriptLines.filter((l) => /^-Section\s/.test(l));
assert.strictEqual(
  danglingSections.length,
  0,
  'No continuation line may start with a bare -Section argument: ' + danglingSections.slice(0, 2).join(' | ')
);
assert(
  guiScript.includes('$script:HeaderControls'),
  'HeaderControls tracking collection is missing (theme recolor contract)'
);
assert(
  guiScript.includes("Role = 'title'") && guiScript.includes("Role = 'rule'"),
  'Header title/rule role tags are missing for Apply-ThemeToUi recolor'
);
console.log('  PASS: Section headers (' + headerCalls.length + ' groups), tab order, dirty cue, and theme recolor validated.');

console.log('Test 12: Verifying repository hub config byte-identity (AC3/AC6 regression)...');
assertHubConfigUnchanged('after all editor invocations');
assert.strictEqual(
  fileSha256(HUB_BACKUP_PATH),
  hubBackupShaBefore,
  'AC3: no leftover or modified .ws/config.json.bak may be produced by the editor tests'
);
console.log('  PASS: Repository hub config is byte-identical; no leftover backup.');

console.log('\nALL 12 POWERSHELL CONFIG EDITOR TESTS PASSED.');

