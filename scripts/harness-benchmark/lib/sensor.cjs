'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { gitPorcelain } = require('./judge-checks.cjs');

function copyFileSync(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function parseUnifiedHunks(patchContent) {
  const lines = patchContent.replace(/\r\n/g, '\n').split('\n');
  const hunks = [];
  let index = 0;
  while (index < lines.length) {
    const header = lines[index].match(/^@@(?: -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@)?/);
    if (!header || !lines[index].startsWith('@@')) {
      index += 1;
      continue;
    }
    const oldStart = header[1] ? Number(header[1]) : null;
    const oldCount = header[2] != null ? Number(header[2]) : (header[1] ? 1 : null);
    index += 1;
    const oldLines = [];
    const newLines = [];
    while (index < lines.length) {
      const line = lines[index];
      if (line.startsWith('@@') || line.startsWith('diff ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
        break;
      }
      if (oldCount != null && oldLines.length >= oldCount && (line.startsWith(' ') || line.startsWith('-'))) {
        break;
      }
      if (line.startsWith('+') && !line.startsWith('+++')) {
        newLines.push(line.slice(1));
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        oldLines.push(line.slice(1));
      } else if (line.startsWith(' ')) {
        oldLines.push(line.slice(1));
        newLines.push(line.slice(1));
      } else if (line === '\\ No newline at end of file') {
        // ignore
      }
      index += 1;
    }
    hunks.push({ oldStart, oldLines, newLines });
  }
  return hunks;
}

function indexOfLines(haystack, needle) {
  if (!needle.length) return -1;
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return start;
  }
  return -1;
}

function applyPatch(targetFile, patchContent) {
  const original = fs.readFileSync(targetFile, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const fileLines = original.split(/\r?\n/);
  const hunks = parseUnifiedHunks(patchContent);
  if (!hunks.length) throw new Error(`no unified hunks in patch for ${targetFile}`);
  for (const hunk of hunks.slice().reverse()) {
    let idx = -1;
    if (hunk.oldStart != null && hunk.oldLines.length) {
      idx = hunk.oldStart - 1;
      const slice = fileLines.slice(idx, idx + hunk.oldLines.length);
      if (slice.join('\n') !== hunk.oldLines.join('\n')) {
        idx = indexOfLines(fileLines, hunk.oldLines);
      }
    } else {
      idx = indexOfLines(fileLines, hunk.oldLines);
    }
    if (idx < 0) throw new Error(`hunk mismatch applying patch to ${targetFile}`);
    fileLines.splice(idx, hunk.oldLines.length, ...hunk.newLines);
  }
  fs.writeFileSync(targetFile, fileLines.join(newline), 'utf8');
}

function resolveInvertPatch(oracle, sandboxRoot, fixturesRoot) {
  const fixtureId = oracle.fixtureId || '';
  const candidates = [
    oracle.invertPatch && path.join(sandboxRoot, oracle.invertPatch),
    oracle.invertPatch && path.join(fixturesRoot, fixtureId, path.basename(oracle.invertPatch)),
    path.join(fixturesRoot, fixtureId, 'invert.patch'),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function copySensorAssets(sandboxRoot, scratchDir, oracle) {
  const rels = new Set([
    ...(oracle.sensorPaths || []),
    ...(oracle.expectedOutputPaths || []),
    oracle.testFile,
    'package.json',
  ].filter(Boolean));
  for (const rel of rels) {
    const src = path.join(sandboxRoot, rel);
    if (fs.existsSync(src)) copyFileSync(src, path.join(scratchDir, rel));
  }
}

function runTestCommand(command, cwd) {
  const result = spawnSync(command, {
    cwd,
    encoding: 'utf8',
    shell: true,
  });
  return result.status;
}

function runSensor(sandboxRoot, oracle, paths) {
  const hasInvert = fs.existsSync(path.join(paths.fixturesRoot, oracle.fixtureId || '', 'invert.patch'))
    || (oracle.invertPatch && fs.existsSync(path.join(sandboxRoot, oracle.invertPatch)));
  const needsSensor = hasInvert || oracle.sabotage === true;
  if (!needsSensor) {
    return {
      required: false,
      injected: 0,
      killed: 0,
      porcelainOk: true,
      verdict: 'SKIP',
      discrimination: null,
    };
  }

  const prePorcelain = gitPorcelain(sandboxRoot);
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-sensor-'));
  let injected = 0;
  let killed = 0;

  try {
    const testNames = oracle.expectedTestNames || [];
    const targetPaths = oracle.sensorPaths || oracle.expectedOutputPaths || [];
    const invertPath = resolveInvertPatch(oracle, sandboxRoot, paths.fixturesRoot);

    for (const relPath of targetPaths) {
      copySensorAssets(sandboxRoot, scratchDir, oracle);
      const src = path.join(sandboxRoot, relPath);
      if (!fs.existsSync(src)) continue;
      const scratchFile = path.join(scratchDir, relPath);
      copyFileSync(src, scratchFile);
      injected += 1;

      if (invertPath) {
        applyPatch(scratchFile, fs.readFileSync(invertPath, 'utf8'));
      }

      const testCmd = oracle.sensorTestCommand || (testNames.length ? `node --test ${oracle.testFile || relPath.replace(/\.cjs$/, '.test.cjs')}` : 'exit 1');
      const exitCode = runTestCommand(testCmd, scratchDir);
      if (exitCode !== 0) killed += 1;
    }

    if (oracle.sabotage === true && paths.runSabotageScript && fs.existsSync(paths.runSabotageScript)) {
      for (const relPath of targetPaths) {
        const result = spawnSync('python', [
          paths.runSabotageScript,
          '--test', oracle.sensorTestCommand || 'exit 1',
          '--paths', relPath,
          '--invert-patch', oracle.invertPatch || 'invert.patch',
          '--repo-root', scratchDir,
        ], { cwd: scratchDir, encoding: 'utf8' });
        if (result.status === 0) killed += 1;
        injected += 1;
      }
    }
  } finally {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }

  const postPorcelain = gitPorcelain(sandboxRoot);
  const porcelainOk = prePorcelain === postPorcelain;
  const allKilled = injected > 0 && killed === injected;
  const verdict = porcelainOk && allKilled ? 'PASS' : 'FAIL';
  const discrimination = injected ? Math.round((killed / injected) * 10) : 10;

  return {
    required: true,
    injected,
    killed,
    porcelainOk,
    verdict,
    discrimination,
  };
}

module.exports = { runSensor, applyPatch, gitPorcelain };
