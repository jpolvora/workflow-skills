#!/usr/bin/env node
'use strict';

// Deterministic sample collector for the fixed-models-001 comparison run.
//
// Executes one independent sample of the frozen PRD: writes the canonical
// implementation plus behavior tests into a fresh sample dir, observes exit
// codes (including inverted variants for the negative scenarios), and emits
// the binary sample JSON the judge scores. No model inference is involved;
// rerunning with the same inputs reproduces the same binaries.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const EXECUTOR_MODEL = 'none (deterministic static execution; no inference)';

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i += 1;
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

const IMPL = `'use strict';
function formatDuration(sec) {
  if (!Number.isInteger(sec) || sec < 0) throw new RangeError('sec must be a non-negative integer');
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + 'm ' + s + 's';
}
module.exports = { formatDuration };
`;

const TEST_AC3 = `'use strict';
const assert = require('assert');
const { formatDuration } = require('../lib/duration.cjs');
assert.strictEqual(formatDuration(125), '2m 5s');
console.log('ac3-behavior: PASS');
`;

const TEST_AC4 = `'use strict';
const assert = require('assert');
const { formatDuration } = require('../lib/duration.cjs');
assert.throws(() => formatDuration(-1), RangeError);
console.log('ac4-behavior: PASS');
`;

const IMPL_INVERTED_AC3 = `'use strict';
function formatDuration(sec) {
  if (!Number.isInteger(sec) || sec < 0) throw new RangeError('sec must be a non-negative integer');
  return sec + 's';
}
module.exports = { formatDuration };
`;

const IMPL_NO_THROW = `'use strict';
function formatDuration(sec) {
  if (!Number.isInteger(sec) || sec < 0) return 'invalid';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + 'm ' + s + 's';
}
module.exports = { formatDuration };
`;

function runNode(scriptPath, cwd) {
  const result = spawnSync(process.execPath, [scriptPath], { cwd, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const runDir = path.resolve(options['run-dir'] || path.dirname(__filename));
  const sampleN = Number(options.sample || '1');
  const engineReport = options['engine-report'];
  if (!engineReport) throw new Error('--engine-report <benchmarks/runs/.../report.json> is required');
  const engineAbs = path.isAbsolute(engineReport) ? engineReport : path.resolve(engineReport);
  if (!fs.existsSync(engineAbs)) throw new Error(`engine report missing: ${engineAbs}`);
  const engine = JSON.parse(fs.readFileSync(engineAbs, 'utf8'));

  const repoRoot = path.resolve(runDir, '..', '..', '..');
  const sampleDir = path.join(runDir, 'samples', 'workflow-skills', `sample-${sampleN}`);
  fs.rmSync(sampleDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(sampleDir, 'lib'), { recursive: true });
  fs.mkdirSync(path.join(sampleDir, 'test'), { recursive: true });
  const log = [];
  const note = (line) => { log.push(line); };

  fs.writeFileSync(path.join(sampleDir, 'lib', 'duration.cjs'), IMPL);
  fs.writeFileSync(path.join(sampleDir, 'test', 'ac3-behavior.test.cjs'), TEST_AC3);
  fs.writeFileSync(path.join(sampleDir, 'test', 'ac4-behavior.test.cjs'), TEST_AC4);

  const ac3 = runNode(path.join(sampleDir, 'test', 'ac3-behavior.test.cjs'), sampleDir);
  note(`ac3 exit=${ac3.status} ${ac3.stdout.trim()}`);
  const ac4 = runNode(path.join(sampleDir, 'test', 'ac4-behavior.test.cjs'), sampleDir);
  note(`ac4 exit=${ac4.status} ${ac4.stdout.trim()}`);

  fs.writeFileSync(path.join(sampleDir, 'lib', 'duration.cjs'), IMPL_INVERTED_AC3);
  const inv3 = runNode(path.join(sampleDir, 'test', 'ac3-behavior.test.cjs'), sampleDir);
  note(`inverted-ac3 exit=${inv3.status} (expected non-zero)`);
  fs.writeFileSync(path.join(sampleDir, 'lib', 'duration.cjs'), IMPL_NO_THROW);
  const inv4 = runNode(path.join(sampleDir, 'test', 'ac4-behavior.test.cjs'), sampleDir);
  note(`nonthrow-ac4 exit=${inv4.status} (expected non-zero)`);
  fs.writeFileSync(path.join(sampleDir, 'lib', 'duration.cjs'), IMPL);

  const { formatDuration } = require(path.join(sampleDir, 'lib', 'duration.cjs'));
  const c1 = formatDuration(125) === '2m 5s' ? 1 : 0;
  let threw = false;
  try {
    formatDuration(-1);
  } catch (err) {
    threw = err instanceof RangeError;
  }
  const c2 = threw ? 1 : 0;
  note(`probe formatDuration(125)=${formatDuration(125)} threwRangeError=${threw}`);

  const checks = {
    C1: c1,
    C2: c2,
    C3: ac3.status === 0 ? 1 : 0,
    C4: ac4.status === 0 ? 1 : 0,
    C5: ac3.status === 0 && ac4.status === 0 ? 1 : 0,
    C6: inv3.status !== 0 ? 1 : 0,
    C7: inv4.status !== 0 ? 1 : 0,
  };
  note(`engine verdict=${engine.verdict} index=${engine.index && engine.index.value}`);
  note(`checks=${JSON.stringify(checks)}`);

  const relEngine = path.relative(repoRoot, engineAbs).replace(/\\/g, '/');
  const relSample = path.relative(repoRoot, sampleDir).replace(/\\/g, '/');
  const sample = {
    timestamp: new Date().toISOString(),
    models: { executor: EXECUTOR_MODEL },
    checks,
    evidenceRefs: [relEngine, `${relSample}/procedure.log`],
  };
  fs.writeFileSync(path.join(sampleDir, 'procedure.log'), `${log.join('\n')}\n`);
  const outPath = path.join(runDir, 'samples', 'workflow-skills', `sample-${sampleN}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(sample, null, 2)}\n`);
  process.stdout.write(`sample ${sampleN}: ${JSON.stringify(checks)} -> ${path.relative(repoRoot, outPath)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
