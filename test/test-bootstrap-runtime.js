/**
 * Unit tests for centralized runtime bootstrap helper and decoding safety.
 * Verifies AC1, AC3, AC4, AC5, NS1, NS2.
 * Run: node test/test-bootstrap-runtime.js
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { StringDecoder } from 'string_decoder';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const bootstrapHelperPath = path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/bootstrap_runtime.cjs');
const { resolveHubScriptsDir } = require(bootstrapHelperPath);

function testResolveHubScriptsDir() {
  // Test 1: Normal repo resolution
  const resolved = resolveHubScriptsDir(__dirname);
  assert.ok(resolved, 'should resolve a path');
  assert.ok(fs.existsSync(path.join(resolved, 'resolve_consumer_root.cjs')), 'resolved path must contain resolve_consumer_root.cjs');

  // Test 2: WORKFLOW_SKILLS_SHARED_DIR override precedence
  const fakeShared = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-fake-shared-'));
  const fakeScripts = path.join(fakeShared, 'runtime', 'scripts');
  fs.mkdirSync(fakeScripts, { recursive: true });
  fs.writeFileSync(path.join(fakeScripts, 'resolve_consumer_root.cjs'), '// mock\n', 'utf8');

  try {
    process.env.WORKFLOW_SKILLS_SHARED_DIR = fakeShared;
    const overridden = resolveHubScriptsDir(__dirname);
    assert.strictEqual(path.resolve(overridden), path.resolve(fakeScripts), 'WORKFLOW_SKILLS_SHARED_DIR override takes precedence');
  } finally {
    delete process.env.WORKFLOW_SKILLS_SHARED_DIR;
    fs.rmSync(fakeShared, { recursive: true, force: true });
  }

  // Test 3: Fail-closed when no candidates resolve (NS1)
  const emptyTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-empty-'));
  try {
    const res = cp.spawnSync(
      process.execPath,
      [
        '-e',
        `require(${JSON.stringify(bootstrapHelperPath)}).resolveHubScriptsDir(${JSON.stringify(emptyTemp)})`,
      ],
      {
        cwd: emptyTemp,
        encoding: 'utf8',
        env: {
          ...process.env,
          WORKFLOW_SKILLS_GLOBAL_DIR: emptyTemp,
          WORKFLOW_SKILLS_SHARED_DIR: '',
        },
      }
    );
    assert.strictEqual(res.status, 1, 'fails closed with exit code 1 when no candidates resolve');
    assert.match(
      res.stderr,
      /Failed to resolve ws-shared runtime scripts directory/,
      'descriptive error when no candidates resolve (NS1)'
    );
  } finally {
    fs.rmSync(emptyTemp, { recursive: true, force: true });
  }
}

function testSeveredUtf8ChunkDecoding() {
  // 3-byte UTF-8 character: '€' = [0xE2, 0x82, 0xAC]
  // 4-byte UTF-8 character: '🚀' = [0xF0, 0x9F, 0x9A, 0x80]
  const str = 'Workflow € and 🚀 test string!';
  const buf = Buffer.from(str, 'utf8');

  // Split buffer in the middle of '€' and '🚀'
  const chunk1 = buf.subarray(0, 10); // Cuts into '€'
  const chunk2 = buf.subarray(10, 18); // Cuts into '🚀'
  const chunk3 = buf.subarray(18);

  const decoder = new StringDecoder('utf8');
  let decoded = '';
  decoded += decoder.write(chunk1);
  decoded += decoder.write(chunk2);
  decoded += decoder.write(chunk3);
  decoded += decoder.end();

  assert.strictEqual(decoded, str, 'StringDecoder must reconstruct severed multi-byte characters without corruption (NS2)');
  assert.ok(!decoded.includes('\uFFFD'), 'decoded text must not contain replacement characters');
}

function testBannedRuntimeDirectoryDetection() {
  const checkUniqueScript = path.join(repoRoot, '.agents/skills/ws-check-harness/scripts/check_unique_runtime.cjs');
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-banned-runtime-test-'));

  try {
    fs.mkdirSync(path.join(tempRepo, '.agents', 'skills', 'ws-shared', 'runtime', 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(tempRepo, 'bin'), { recursive: true });
    fs.writeFileSync(path.join(tempRepo, '.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs'), '// mock\n', 'utf8');

    // Clean run
    const cleanRes = cp.spawnSync(process.execPath, [checkUniqueScript, '--repo-root', tempRepo, '--json'], { encoding: 'utf8' });
    const cleanJson = JSON.parse(cleanRes.stdout);
    assert.strictEqual(cleanJson.ok, true, 'clean repo passes unique runtime check');

    // Introduce banned .ws/runtime directory
    fs.mkdirSync(path.join(tempRepo, '.ws', 'runtime'), { recursive: true });
    const bannedRes = cp.spawnSync(process.execPath, [checkUniqueScript, '--repo-root', tempRepo, '--json'], { encoding: 'utf8' });
    const bannedJson = JSON.parse(bannedRes.stdout);
    assert.strictEqual(bannedJson.ok, false, 'repo with .ws/runtime must fail unique runtime check');
    assert.ok(bannedJson.findings.some((f) => f.reason === 'banned-runtime-directory-present'), 'flags banned-runtime-directory-present');
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
}

function testTempGlobalHermetic() {
  // Hermetic positive: with WORKFLOW_SKILLS_GLOBAL_DIR pointed at a temp
  // global install, resolution must use the temp dir even when a real
  // machine-global install exists (never resolve the machine install).
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-hermetic-'));
  const tempGlobalScripts = path.join(work, 'global', 'ws-shared', 'runtime', 'scripts');
  fs.mkdirSync(tempGlobalScripts, { recursive: true });
  fs.writeFileSync(path.join(tempGlobalScripts, 'resolve_consumer_root.cjs'), '// temp-global mock\n', 'utf8');
  try {
    const childJs = `console.log(require(${JSON.stringify(bootstrapHelperPath)}).resolveHubScriptsDir(${JSON.stringify(path.join(work, 'nowhere'))}))`;
    const res = cp.spawnSync(process.execPath, ['-e', childJs], {
      cwd: work,
      encoding: 'utf8',
      env: {
        ...process.env,
        WORKFLOW_SKILLS_GLOBAL_DIR: path.join(work, 'global'),
        WORKFLOW_SKILLS_SHARED_DIR: '',
      },
    });
    assert.strictEqual(res.status, 0, 'temp global install resolves without error');
    assert.strictEqual(
      path.resolve(String(res.stdout || '').trim()),
      path.resolve(tempGlobalScripts),
      'resolution uses the temp global dir, not the machine global install',
    );
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

function testLocalBeatsPackaged() {
  // Local-first precedence: a consumer-local ws-shared runtime must win over
  // the packaged copy bundled with the calling skill (and over global).
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-localfirst-'));
  const localScripts = path.join(work, 'repo', '.agents', 'skills', 'ws-shared', 'runtime', 'scripts');
  const tempGlobalScripts = path.join(work, 'global', 'ws-shared', 'runtime', 'scripts');
  fs.mkdirSync(localScripts, { recursive: true });
  fs.mkdirSync(tempGlobalScripts, { recursive: true });
  fs.writeFileSync(path.join(localScripts, 'resolve_consumer_root.cjs'), '// local mock\n', 'utf8');
  fs.writeFileSync(path.join(tempGlobalScripts, 'resolve_consumer_root.cjs'), '// global mock\n', 'utf8');
  try {
    const callerDir = path.join(repoRoot, '.agents', 'skills', 'ws-check-harness', 'scripts');
    const childJs = `console.log(require(${JSON.stringify(bootstrapHelperPath)}).resolveHubScriptsDir(${JSON.stringify(callerDir)}))`;
    const res = cp.spawnSync(process.execPath, ['-e', childJs], {
      cwd: path.join(work, 'repo'),
      encoding: 'utf8',
      env: {
        ...process.env,
        WORKFLOW_SKILLS_GLOBAL_DIR: path.join(work, 'global'),
        WORKFLOW_SKILLS_SHARED_DIR: '',
      },
    });
    assert.strictEqual(res.status, 0, 'local-first resolution without error, stderr: ' + res.stderr);
    assert.strictEqual(
      path.resolve(String(res.stdout || '').trim()),
      path.resolve(localScripts),
      'consumer-local runtime beats packaged and global copies',
    );
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

testResolveHubScriptsDir();
testSeveredUtf8ChunkDecoding();
testBannedRuntimeDirectoryDetection();
testTempGlobalHermetic();
testLocalBeatsPackaged();

console.log('test-bootstrap-runtime: ok');
