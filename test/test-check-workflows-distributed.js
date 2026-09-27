/**
 * ws-check-workflows workflow registry: the distributed workflow is recognized
 * and simulated without regression, an unknown id fails closed, and the
 * coordinator lives only under the distributed skill (AC2, AC13, AC15; NS6).
 * Run: node test/test-check-workflows-distributed.js
 */
import cp from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, '.agents/skills/ws-check-workflows/scripts/check_workflows.cjs');

function run(args) {
  return cp.spawnSync(process.execPath, [script, ...args], { cwd: repoRoot, encoding: 'utf8' });
}

// AC13: distributed workflow is a registered id and simulates without regression.
const known = run(['--workflow', 'ws-spec-to-pr-distributed']);
if (known.status !== 0) {
  throw new Error(`known distributed workflow should pass: ${known.stdout}${known.stderr}`);
}
if (!/Distributed \(`ws-spec-to-pr-distributed`\)/.test(known.stdout)) {
  throw new Error('simulation report lacks the distributed workflow section');
}

// AC13 / NS6: an unknown workflow id fails closed and names the id.
const unknown = run(['--workflow', 'definitely-not-a-flow']);
if (unknown.status === 0) throw new Error('unknown workflow id must fail closed');
if (!/definitely-not-a-flow/.test(`${unknown.stdout}${unknown.stderr}`)) {
  throw new Error('unknown workflow id is not named in the output');
}

// AC2 / AC15: the coordinator exists only under the distributed skill.
const distributedCoordinator = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-distributed/scripts/step_coordinator.cjs');
const staleCoordinator = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs');
if (!fs.existsSync(distributedCoordinator)) throw new Error('distributed coordinator is missing');
if (fs.existsSync(staleCoordinator)) throw new Error('stale coordinator still exists under ws-spec-to-pr');

console.log('PASS: test-check-workflows-distributed (AC2, AC13, AC15; NS6)');
