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

function applyPatch(targetFile, patchContent) {
  const original = fs.readFileSync(targetFile, 'utf8');
  const lines = original.split('\n');
  const patchLines = patchContent.split('\n');
  for (const line of patchLines) {
    if (line.startsWith('-') && !line.startsWith('---')) {
      const content = line.slice(1);
      const idx = lines.findIndex((l) => l === content || l === content.replace(/\r$/, ''));
      if (idx >= 0) lines.splice(idx, 1);
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      lines.push(line.slice(1));
    }
  }
  fs.writeFileSync(targetFile, lines.join('\n'), 'utf8');
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

    for (const relPath of targetPaths) {
      const src = path.join(sandboxRoot, relPath);
      if (!fs.existsSync(src)) continue;
      const scratchFile = path.join(scratchDir, relPath);
      copyFileSync(src, scratchFile);
      injected += 1;

      const invertPath = oracle.invertPatch
        ? path.join(sandboxRoot, oracle.invertPatch)
        : path.join(paths.fixturesRoot, oracle.fixtureId, 'invert.patch');

      if (fs.existsSync(invertPath)) {
        const patch = fs.readFileSync(invertPath, 'utf8');
        applyPatch(scratchFile, patch);
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
