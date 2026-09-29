/**
 * ws-check-workflows autoMode contract: with autoMode ON the orchestrator must
 * be unattended (internal-checkpoint no-yield plus the canonical stop list),
 * and with autoMode OFF it must gate per step boundary or per gateGranularity.
 * us-458 AC7/AC8.
 * Run: node test/test-check-workflows-automode.js
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, '.agents/skills/ws-check-workflows/scripts/check_workflows.cjs');
const gatesPath = path.join(repoRoot, '.agents/skills/ws-shared/runtime/gates.md');
const stdPath = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/SKILL.md');
const litePath = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/SKILL.md');

const goodGates = fs.readFileSync(gatesPath, 'utf8');
const goodStd = fs.readFileSync(stdPath, 'utf8');
const goodLite = fs.readFileSync(litePath, 'utf8');

// Run only checkAutoModeContract() against stubbed gate/orch texts so the
// regression is deterministic and does not depend on the rest of the tree.
function autoModeFindings({ gates = goodGates, std = goodStd, lite = goodLite } = {}) {
  const realExists = fs.existsSync;
  const realRead = fs.readFileSync;
  const overrides = new Map([
    [gatesPath, gates],
    [stdPath, std],
    [litePath, lite],
  ]);
  fs.existsSync = (p) => overrides.has(path.resolve(String(p))) || realExists(p);
  fs.readFileSync = (p, enc) => {
    const key = path.resolve(String(p));
    return overrides.has(key) ? overrides.get(key) : realRead(p, enc);
  };
  try {
    delete require.cache[require.resolve(script)];
    const { WorkflowChecker } = require(script);
    const checker = new WorkflowChecker();
    checker.checkAutoModeContract();
    return checker.issues.filter((i) => i.category === 'autoMode Contract');
  } finally {
    fs.existsSync = realExists;
    fs.readFileSync = realRead;
  }
}

const criticals = (result) => result.filter((i) => i.severity === 'CRITICAL');

function assertClean(label, result) {
  const bad = criticals(result);
  if (bad.length) throw new Error(`${label}: expected no autoMode findings, got ${JSON.stringify(bad.map((i) => i.message))}`);
}

function assertFlags(label, result, needle) {
  const bad = criticals(result);
  if (!bad.length) throw new Error(`${label}: expected a CRITICAL autoMode finding`);
  if (!bad.some((i) => needle.test(i.message))) {
    throw new Error(`${label}: no finding matched ${needle}; got ${JSON.stringify(bad.map((i) => i.message))}`);
  }
}

// The current tree satisfies both the ON (unattended) and OFF (gated) contracts.
assertClean('baseline (autoMode ON and OFF contract present)', autoModeFindings());

// autoMode ON regression: the internal-checkpoint no-yield clause removed.
assertFlags(
  'autoMode ON without internal-checkpoint clause',
  autoModeFindings({ gates: goodGates.replace(/internal checkpoint/gi, 'a step boundary') }),
  /internal checkpoint/i,
);

// autoMode OFF regression: the gateGranularity cadence removed.
assertFlags(
  'autoMode OFF without gateGranularity cadence',
  autoModeFindings({ gates: goodGates.replace(/gateGranularity/g, 'gateDensity') }),
  /gate/i,
);

// An orchestrator duplicating the canonical stop list is rejected.
assertFlags(
  'orchestrator duplicating the stop list',
  autoModeFindings({ std: `${goodStd}\n## Only valid autoMode stops\n| a | b |\n` }),
  /duplicate/i,
);

console.log('PASS: test-check-workflows-automode (us-458 AC7, AC8)');
