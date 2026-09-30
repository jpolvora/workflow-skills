/**
 * us-473: ws-monitor `detectContextMismatch` must scope the branch comparison to
 * non-terminal runs. A terminal run whose recorded branch differs from the live
 * checkout is historical drift (info); a non-terminal run still reports critical,
 * and the finding message names the run status used for the decision. The
 * state-HEAD and state-worktree comparisons and the finding code stay unchanged.
 * Run: node test/test-ws-monitor-us473.js
 */
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, '.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');
const require = createRequire(import.meta.url);
const { detectContextMismatch } = require(script);

const checkout = { branch: 'develop', head: 'aaaa1111', topLevel: '/repo' };

function branchFinding(findings) {
  return findings.find((finding) => finding.code === 'context-mismatch'
    && /differs from active branch/.test(finding.message));
}

function activeState(overrides = {}) {
  return {
    workflowId: 'us-473-20260930T225523Z',
    slug: 'us-473',
    workflowType: 'standard',
    status: 'active',
    currentStep: 4,
    completedSteps: [0, 1, 3],
    skippedSteps: [],
    branch: 'feature/us-473',
    ...overrides,
  };
}

// AC1 / NS2 / testActiveRunBranchMismatchStaysCritical: non-terminal mismatch is critical.
{
  const finding = branchFinding(detectContextMismatch(activeState(), checkout, '/repo'));
  if (!finding || finding.severity !== 'critical') {
    throw new Error(`active run branch mismatch must stay critical, got ${JSON.stringify(finding)}`);
  }
}

// AC3 / testBranchMismatchMessageNamesStatus: the message names the run status.
{
  const finding = branchFinding(detectContextMismatch(activeState(), checkout, '/repo'));
  if (!finding || !finding.message.includes('active')) {
    throw new Error(`message must name the run status, got ${JSON.stringify(finding?.message)}`);
  }
}

// AC2 / NS1 / testTerminalRunBranchMismatchIsInfo: a completed run mismatch is info, not critical.
{
  const terminal = activeState({ status: 'completed', currentStep: 8, completedSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8], endedAt: '2026-09-29T00:00:00Z' });
  const finding = branchFinding(detectContextMismatch(terminal, checkout, '/repo'));
  if (!finding || finding.severity !== 'info') {
    throw new Error(`terminal run branch mismatch must be info, got ${JSON.stringify(finding)}`);
  }
  if (!finding.message.includes('completed')) {
    throw new Error(`terminal message must name the run status, got ${JSON.stringify(finding.message)}`);
  }
}

// AC2: every terminal status set used by the monitor downgrades to info.
for (const status of ['cancelled', 'failed', 'superseded', 'stopped']) {
  const finding = branchFinding(detectContextMismatch(activeState({ status, endedAt: '2026-09-29T00:00:00Z' }), checkout, '/repo'));
  if (!finding || finding.severity !== 'info') {
    throw new Error(`terminal status ${status} must report the branch mismatch as info, got ${JSON.stringify(finding)}`);
  }
}

// AC2: a terminal-shaped run still reporting `active` is derived terminal -> info.
{
  const shaped = activeState({
    status: 'active',
    currentStep: 8,
    completedSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    stepStatus: { 0: 'completed', 1: 'completed', 2: 'skipped', 3: 'completed', 4: 'completed', 5: 'completed', 6: 'completed', 7: 'skipped', 8: 'completed' },
  });
  const finding = branchFinding(detectContextMismatch(shaped, checkout, '/repo'));
  if (!finding || finding.severity !== 'info') {
    throw new Error(`terminal-shaped run must be info, got ${JSON.stringify(finding)}`);
  }
}

// AC5 / NS3 / testMatchingBranchNoFinding: matching branch emits no branch finding.
{
  const finding = branchFinding(detectContextMismatch(activeState({ branch: 'develop' }), checkout, '/repo'));
  if (finding) throw new Error(`matching branch must not emit a branch finding, got ${JSON.stringify(finding)}`);
}

// AC4 / testHeadWorktreeComparisonsUnchanged: HEAD/worktree findings keep warning severity and message.
{
  const state = activeState({ branch: 'develop', headSha: 'bbbb2222', worktreePath: '/other' });
  const findings = detectContextMismatch(state, checkout, '/repo');
  const head = findings.find((finding) => finding.message.includes('state HEAD differs from active HEAD'));
  const worktree = findings.find((finding) => finding.message.includes('state worktree differs from the active checkout'));
  if (!head || head.severity !== 'warning') throw new Error(`state-HEAD finding must stay warning, got ${JSON.stringify(head)}`);
  if (!worktree || worktree.severity !== 'warning') throw new Error(`state-worktree finding must stay warning, got ${JSON.stringify(worktree)}`);
}

// AC6 / testContextMismatchCodeMappingUnchanged: code stays `context-mismatch` (mapping untouched).
{
  const finding = branchFinding(detectContextMismatch(activeState(), checkout, '/repo'));
  if (!finding || finding.code !== 'context-mismatch') {
    throw new Error('finding code must remain context-mismatch');
  }
}

console.log('test-ws-monitor-us473: ok');
