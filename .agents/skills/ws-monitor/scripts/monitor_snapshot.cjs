#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
// us-351: managed runtime loads from its installed location: the upstream
// package / global skills tree (<skills>/ws-shared) or the project consumer
// hub (<repo>/.ws). Mirrors resolveConsumerContext runtimeSource precedence.
const HUB_SCRIPTS_DIR = (() => {
  const packaged = path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'scripts');
  try {
    require.resolve(path.join(packaged, 'resolve_consumer_root.cjs'));
    return packaged;
  } catch {
    return path.resolve(__dirname, '..', '..', '..', '..', '.ws', 'runtime', 'scripts');
  }
})();
const { spawnSync } = require('child_process');
const {
  resolveConsumerContext,
  resolveConfiguredPath,
  resolveMinVerifyScore,
  resolveResolvedContext,
  resolveMemoryRouting,
  resolveEffectiveMemoryPaths,
  toRepoRelative,
} = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));
const { parseFrontmatter } = require(path.join(HUB_SCRIPTS_DIR, 'workflow_state.cjs'));

const MUTATING_STEPS = new Set([0, 1, 2, 3, 4, 6, 7, 8]);
const DEFAULT_INTERVAL_SECONDS = 10;

// us-356: bounded, read-only host transcript access. Host specifics are
// adapter data (see references/host-adapters.md), never portable contract.
const TRANSCRIPT_LIMITS = {
  maxBytesPerFile: 262144, // 256KB tail per file — recent window only, no full-history scans
  maxFilesPerTick: 200,
  maxTotalBytes: 4 * 1024 * 1024,
  maxMsPerTick: 2000,
  stallWindowMs: 10 * 60 * 1000, // session idle beyond this while active = stall evidence
};
const SQLITE_FAMILY = /\.(db|sqlite|sqlite3|vscdb)$/i;

function getHostHome(config) {
  const override = config?.monitor?.hostHome;
  if (typeof override === 'string' && override.trim()) return override;
  return os.homedir();
}

// Per-OS default session locations per host adapter. Resolved lazily so no
// host store is touched unless the caller opts in via --discover-host-transcripts.
// us-356: Muse Code sessions live under the XDG data dir
// (~/.local/share/muse/sessions/YYYY/MM/DD/<session-id>/session.jsonl),
// never under ~/.claude. Honor $XDG_DATA_HOME when set.
function resolveMuseSessionsRoot(posixHome) {
  const xdg = typeof process.env.XDG_DATA_HOME === 'string' ? process.env.XDG_DATA_HOME.trim() : '';
  const base = xdg ? xdg.replace(/\\/g, '/').replace(/\/+$/, '') : `${posixHome}/.local/share`;
  return `${base}/muse/sessions`;
}

// us-356: Muse nests sessions YYYY/MM/DD/<session-id>/ under its root.
// Expand to the recent session dirs (bounded slice, newest first) instead
// of walking the whole tree; fall back to the root when the layout differs.
function expandMuseSessionDirs(root, limit = 50) {
  const found = [];
  const listDirs = (dir) => {
    try {
      return fs.readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => b.name.localeCompare(a.name))
        .map((entry) => entry.name);
    } catch {
      return [];
    }
  };
  for (const year of listDirs(root)) {
    if (found.length >= limit) break;
    for (const month of listDirs(path.join(root, year))) {
      if (found.length >= limit) break;
      for (const day of listDirs(path.join(root, year, month))) {
        if (found.length >= limit) break;
        for (const session of listDirs(path.join(root, year, month, day))) {
          if (found.length >= limit) break;
          found.push(path.join(root, year, month, day, session));
        }
      }
    }
  }
  return found;
}

function getHostAdapters(platform = process.platform, home = os.homedir()) {
  const posixHome = String(home).replace(/\\/g, '/');
  const appData = platform === 'win32'
    ? `${posixHome}/AppData/Roaming`
    : platform === 'darwin'
      ? `${posixHome}/Library/Application Support`
      : `${posixHome}/.config`;
  return [
    {
      id: 'cursor',
      storeKind: 'sqlite',
      locations: [
        { locationClass: 'user', path: `${appData}/Cursor/User/workspaceStorage` },
      ],
      matchers: ['.cursor', 'cursor'],
    },
    {
      id: 'opencode',
      storeKind: 'file',
      locations: [
        { locationClass: 'user', path: `${posixHome}/.opencode/sessions` },
      ],
      matchers: ['.opencode'],
    },
    {
      id: 'antigravity',
      storeKind: 'file',
      locations: [
        { locationClass: 'user', path: `${posixHome}/.gemini/antigravity-ide/brain` },
      ],
      matchers: ['antigravity', '.gemini', '.system_generated'],
    },
    {
      id: 'muse',
      storeKind: 'file',
      locations: [
        { locationClass: 'user', path: resolveMuseSessionsRoot(posixHome) },
      ],
      matchers: ['.local/share/muse', '/muse/sessions', 'session.jsonl'],
    },
  ];
}

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9\-_]{8,}/g,
  /gh[pousr]_[A-Za-z0-9]{8,}/g,
  /xox[bpas]-[A-Za-z0-9\-]{8,}/g,
  /AKIA[A-Z0-9]{16}/g,
  /Bearer\s+[A-Za-z0-9\-._~+/=]{8,}/gi,
  /api[_-]?key\s*[:=]\s*['"]?[^'"\s,}]{4,}['"]?/gi,
  /client[_-]?secret\s*[:=]\s*['"]?[^'"\s,}]{4,}['"]?/gi,
  /password\s*[:=]\s*['"]?[^'"\s,}]{4,}['"]?/gi,
];

function sanitizeTranscriptText(text, home = os.homedir()) {
  let redacted = String(text || '');
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  if (home) redacted = redacted.split(home).join('<home>');
  redacted = redacted.replace(/[A-Za-z]:\\Users\\[^\\/:*?"<>|]+/g, '<home>');
  return redacted;
}

function sanitizeReportPath(reportPath, home = os.homedir()) {
  let sanitized = String(reportPath || '');
  if (home) sanitized = sanitized.split(home).join('~');
  sanitized = sanitized.replace(/[A-Za-z]:\\Users\\[^\\/:*?"<>|]+/g, '~');
  return sanitized;
}

// Strictly read-only, bounded tail read. SQLite-family stores (Cursor
// workspaceStorage, other app databases) are copy-then-read through a temp
// copy so a live WAL database is never locked or modified. Returns
// { text, bytesRead, reason } — reason is set when the store is unreadable.
function readBoundedTailText(file, maxBytes = TRANSCRIPT_LIMITS.maxBytesPerFile) {
  const base = path.basename(String(file)).toLowerCase();
  const isDatabase = SQLITE_FAMILY.test(base) || base.endsWith('-wal') || base.endsWith('-shm');
  let target = file;
  let tempCopy = null;
  try {
    if (isDatabase) {
      tempCopy = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-')), 'snapshot-copy');
      fs.copyFileSync(file, tempCopy);
      target = tempCopy;
    }
    const handle = fs.openSync(target, 'r');
    try {
      const stat = fs.fstatSync(handle);
      const size = stat.size;
      const start = Math.max(0, size - maxBytes);
      const length = Math.min(size, maxBytes);
      const buffer = Buffer.alloc(length);
      fs.readSync(handle, buffer, 0, length, start);
      return { text: buffer.toString('utf8'), bytesRead: length, reason: null };
    } finally {
      fs.closeSync(handle);
    }
  } catch (error) {
    return { text: null, bytesRead: 0, reason: error.message };
  } finally {
    if (tempCopy) {
      try {
        fs.rmSync(path.dirname(tempCopy), { recursive: true, force: true });
      } catch {
        // Temp cleanup is best-effort; the source store is never affected.
      }
    }
  }
}

function normalizeCorrelationKey(value) {
  return String(value || '').toLowerCase().replace(/\\/g, '/').trim();
}

function guessTranscriptAdapter(file) {
  const lowered = normalizeCorrelationKey(file);
  for (const adapter of getHostAdapters()) {
    if (adapter.matchers.some((matcher) => lowered.includes(matcher))) return adapter.id;
  }
  return 'custom-root';
}

function parseArgs(argv) {
  const options = { transcriptRoots: [] };
  const requireValue = (index, token) => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${token} requires a value`);
    }
    return value;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--vault') {
      options.checkVault = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
    if (key === 'transcriptRoot') {
      options.transcriptRoots.push(requireValue(index, token));
      index += 1;
      continue;
    }
    if (['json', 'watch', 'discoverHostTranscripts', 'checkVault'].includes(key) && (index + 1 >= argv.length || argv[index + 1].startsWith('--'))) {
      options[key] = true;
      continue;
    }
    options[key] = requireValue(index, token);
    index += 1;
  }
  return options;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function isNonEmptyFile(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

function parseMultiSpecTable(content) {
  if (!content) return [];
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('|') && l.endsWith('|'));
  if (lines.length < 2) return [];
  const headerIndex = lines.findIndex((l) => /\|\s*#\s*\|\s*slug\s*\|/i.test(l));
  if (headerIndex === -1 || headerIndex + 2 > lines.length) return [];
  const headers = lines[headerIndex]
    .split('|')
    .slice(1, -1)
    .map((h) => h.trim().toLowerCase());
  const items = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const cols = lines[i].split('|').slice(1, -1).map((c) => c.trim());
    if (cols.length === 0 || cols.every((c) => c === '' || c.startsWith('-'))) continue;
    const item = {};
    headers.forEach((h, idx) => {
      const val = cols[idx] !== undefined ? cols[idx] : '';
      if (h === '#' || h === 'index') item.index = Number(val) || val;
      else if (h === 'slug') item.slug = val;
      else if (h === 'specpath') item.specPath = val;
      else if (h === 'flowmode') item.flowMode = val;
      else if (h === 'status') item.status = val;
      else if (h === 'prnumber') item.prNumber = val || null;
      else if (h === 'prurl') item.prUrl = val || null;
      else if (h === 'reason') item.reason = val || null;
      else if (h === 'updatedat') item.updatedAt = val || null;
      else item[h] = val;
    });
    if (item.slug) items.push(item);
  }
  return items;
}

function readState(file) {
  const jsonFile = file.endsWith('.state.json') ? file : file.replace(/\.state\.md$/, '.state.json');
  const json = readJson(jsonFile);
  if (json) return { state: json, stateFile: jsonFile };
  const markdown = file.endsWith('.state.md') ? file : file.replace(/\.state\.json$/, '.state.md');
  if (!fs.existsSync(markdown)) return { state: null, stateFile: file };
  let state = {};
  try {
    const parsed = parseFrontmatter(fs.readFileSync(markdown, 'utf8'));
    state = parsed.data || {};
    if (state.workflowType === 'ws-spec-multi' && (!Array.isArray(state.items) || state.items.length === 0)) {
      state.items = parseMultiSpecTable(parsed.body || parsed.content || '');
    }
  } catch {
    // Keep malformed legacy state files observable without aborting the snapshot.
  }
  return { state, stateFile: markdown };
}

function listStateFiles(plansDir) {
  if (!fs.existsSync(plansDir)) return [];
  let directories;
  try {
    directories = fs.readdirSync(plansDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(plansDir, entry.name));
  } catch {
    return [];
  }
  const files = [];
  for (const directory of directories) {
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    const jsonFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.state.json'))
      .map((entry) => entry.name);
    const mdFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.state.md'))
      .map((entry) => entry.name);

    for (const jf of jsonFiles) {
      files.push(path.join(directory, jf));
    }
    for (const mf of mdFiles) {
      const base = mf.slice(0, -('.state.md'.length));
      if (!jsonFiles.includes(`${base}.state.json`)) {
        files.push(path.join(directory, mf));
      }
    }
  }
  return files;
}

function readTelemetry(file) {
  if (!fs.existsSync(file)) return { events: [], errors: [] };
  const events = [];
  const errors = [];
  for (const [index, line] of fs.readFileSync(file, 'utf8').split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      errors.push(`line ${index + 1}: ${error.message}`);
    }
  }
  return { events, errors };
}

function skippedReason(state, step) {
  return (Array.isArray(state?.skippedSteps) ? state.skippedSteps : [])
    .find((item) => Number(item?.step) === step)?.reason || '';
}

function isCompleted(state, step) {
  return (Array.isArray(state?.completedSteps) ? state.completedSteps : [])
    .map(Number)
    .includes(step);
}

function expectedArtifacts(state, workflowDir, minVerifyScore, repoRoot = workflowDir) {
  const slug = state.slug || state.us || path.basename(workflowDir);
  const expected = [];
  const add = (name, reason) => expected.push({
    path: toRepoRelative(repoRoot, path.join(workflowDir, name), { allowOutside: true }),
    name,
    reason,
    present: isNonEmptyFile(path.join(workflowDir, name)),
  });
  if (Number(state.currentStep) >= 1 || isCompleted(state, 0)) add(`step-00-${slug}.spec.md`, 'Step 0 completed');
  if (Number(state.currentStep) >= 2 || isCompleted(state, 1)) add(`step-01-${slug}.plan.md`, 'Step 1 completed');
  const interviewRan = skippedReason(state, 2) !== 'interview-not-required';
  if (interviewRan && (Number(state.currentStep) >= 3 || isCompleted(state, 2))) {
    add(`step-02-${slug}.plan-interview.md`, 'Step 2 interview completed');
    add(`step-02-${slug}.plan.refined.md`, 'Step 2 interview completed');
  }
  // A dag-disabled Step 3 skip is the designed sequential shape (no stubs written):
  // grandfathered, never an exec-artifact signal. Only a true completion needs the file.
  const step3SkippedDagDisabled = skippedReason(state, 3) === 'dag-disabled';
  if (!step3SkippedDagDisabled && (Number(state.currentStep) >= 4 || isCompleted(state, 3))) {
    add(`step-03-${slug}.plan.exec.md`, 'Step 3 completed');
  }
  if (Number(state.currentStep) >= 6 || isCompleted(state, 5)) add(`step-05-${slug}.plan.report.md`, 'Step 5 completed');
  if (Number(state.currentStep) >= 7 || isCompleted(state, 6)) add(`step-06-${slug}.review.md`, 'Step 6 completed');
  const testingSkipped = ['testing-disabled', 'no-test-surface'].includes(skippedReason(state, 7));
  if (!testingSkipped && (Number(state.currentStep) >= 8 || isCompleted(state, 7))) {
    add(`step-07-${slug}.testing.report.md`, 'Step 7 completed');
  }
  if (Number(state.currentStep) >= 9 || isCompleted(state, 8)) add(`step-08-${slug}.result.md`, 'Step 8 completed');
  return expected;
}

function addFinding(findings, severity, code, message, evidence = []) {
  const key = `${severity}:${code}:${message}`;
  if (findings.some((item) => `${item.severity}:${item.code}:${item.message}` === key)) return;
  findings.push({ severity, code, message, evidence });
}

function classifyWorkflow(state, workflowDir, telemetry, minVerifyScore, repoRoot = workflowDir, config = null) {
  const findings = [];
  const missing = expectedArtifacts(state, workflowDir, minVerifyScore, repoRoot).filter((item) => !item.present);
  for (const artifact of missing) {
    const code = artifact.name.endsWith('.plan.exec.md') ? 'missing-exec-artifact' : 'missing-artifact';
    addFinding(findings, 'critical', code, `${artifact.name} is missing (${artifact.reason})`, [artifact.path]);
  }
  if (Number(state.currentStep) > 5 && Number(state.verificationScore) < minVerifyScore) {
    addFinding(
      findings,
      'critical',
      'step-drift',
      `currentStep is ${state.currentStep} while verificationScore is ${state.verificationScore || 'missing'} below ${minVerifyScore}`,
      [toRepoRelative(repoRoot, workflowDir, { allowOutside: true })],
    );
  }
  for (const event of telemetry.events) {
    if (event.packageVersion === 'unknown') {
      addFinding(findings, 'warning', 'package-version-unknown', 'Telemetry event has packageVersion "unknown"', []);
    }
    if (event.type === 'finish' && event.substep === 'scoreAndRefine') continue;
    const rawTouched = event.filesTouched ?? event.files_touched;
    const touched = Array.isArray(rawTouched) ? { created: rawTouched } : (rawTouched || {});
    const hasTouched = ['created', 'modified', 'deleted'].some((key) => Array.isArray(touched[key]) && touched[key].length);
    // An explicit no-op declaration (finish --noop) is the only completed-with-empty
    // shape that stays silent; any skipReason also suppresses (skipped steps are not completions).
    if (event.type === 'finish' && event.step !== 5 && MUTATING_STEPS.has(Number(event.step)) && event.skipReason == null && event.noop == null && !hasTouched) {
      addFinding(findings, 'warning', 'empty-files-touched', `Completed mutating Step ${event.step} reported no filesTouched`, []);
    }
  }
  for (const error of telemetry.errors) {
    addFinding(findings, 'warning', 'telemetry-parse-error', 'Telemetry contains an unreadable line', [error]);
  }

  // Check dispatch provenance against specialized subagent expectations (Issues #315 & #316)
  const specSub = config?.defaults?.specializedSubagents;
  if (specSub?.enabled === true) {
    const hostBinding = state.hostBinding;
    // Host has named agent binding when explicitly verified or configured
    const hasNamedBinding = hostBinding?.supportsNamedAgents === true ||
      (hostBinding && hostBinding.namedAgentTool && hostBinding.namedAgentTool !== 'none');
    // If the host supports named agents, but dispatches fell back to generic:
    if (hasNamedBinding && Array.isArray(state.stepDispatches)) {
      for (const dispatch of state.stepDispatches) {
        if (dispatch.agentType && dispatch.agentType.startsWith('generic:')) {
          addFinding(
            findings,
            'warning',
            'generic-dispatch',
            `Step ${dispatch.step} dispatch used generic subagent (${dispatch.agentType}) where named projection was expected`,
            [toRepoRelative(repoRoot, path.join(workflowDir, `${state.slug || 'workflow'}.state.json`), { allowOutside: true })],
          );
        }
      }
    }
  }

  return findings;
}

function classifyMultiSpecWorkflow(state, stateFile, repoRoot = '.') {
  const findings = [];
  const items = Array.isArray(state.items) ? state.items : [];
  const runStatus = state.status || 'active';
  const inProgressItems = items.filter((item) => item.status === 'in_progress');
  const pendingItems = items.filter((item) => item.status === 'pending');
  const failedItems = items.filter((item) => item.status === 'failed');

  if (runStatus === 'active' && items.length > 0 && inProgressItems.length === 0 && pendingItems.length === 0) {
    addFinding(
      findings,
      'info',
      'multi-spec-idle',
      `Multi-spec run ${state.runId || path.basename(stateFile)} is active but has no pending or in_progress specs`,
      [toRepoRelative(repoRoot, stateFile, { allowOutside: true })],
    );
  }
  for (const item of failedItems) {
    addFinding(
      findings,
      'warning',
      'multi-spec-failed-item',
      `Multi-spec spec "${item.slug}" failed (${item.reason || 'unspecified failure'})`,
      [toRepoRelative(repoRoot, stateFile, { allowOutside: true })],
    );
  }
  if (inProgressItems.length > 1) {
    addFinding(
      findings,
      'warning',
      'multi-spec-concurrency',
      `Multi-spec run has multiple in_progress items (${inProgressItems.map((i) => i.slug).join(', ')}); sequential execution expected`,
      [toRepoRelative(repoRoot, stateFile, { allowOutside: true })],
    );
  }
  return findings;
}

function getGitContext(repoRoot) {
  const run = (args) => {
    try {
      const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8', timeout: 5000 });
      if (result.status !== 0) return null;
      return String(result.stdout || '').trim() || null;
    } catch {
      return null;
    }
  };
  return {
    branch: run(['rev-parse', '--abbrev-ref', 'HEAD']),
    head: run(['rev-parse', 'HEAD']),
    topLevel: run(['rev-parse', '--show-toplevel']),
  };
}

function detectContextMismatch(state, gitContext, repoRoot = '.') {
  const findings = [];
  const stateBranch = state.branch || state.workingBranch || null;
  if (stateBranch && gitContext?.branch && stateBranch !== gitContext.branch) {
    addFinding(
      findings,
      'critical',
      'context-mismatch',
      `state branch ${stateBranch} differs from active branch ${gitContext.branch}`,
      [toRepoRelative(repoRoot, repoRoot, { allowOutside: true })],
    );
  }
  const stateHead = state.headSha || state.head || null;
  if (stateHead && gitContext?.head && stateHead !== gitContext.head) {
    addFinding(
      findings,
      'warning',
      'context-mismatch',
      'state HEAD differs from active HEAD; the observed state may come from another checkout',
      [],
    );
  }
  const stateWorktree = state.worktreePath || state.worktree || null;
  if (stateWorktree && gitContext?.topLevel && path.resolve(stateWorktree) !== path.resolve(gitContext.topLevel)) {
    addFinding(
      findings,
      'warning',
      'context-mismatch',
      'state worktree differs from the active checkout; monitor may be reading the main checkout while a worktree is active',
      [],
    );
  }
  return findings;
}

function maxTelemetryFinishStep(telemetry) {
  let max = -1;
  for (const event of telemetry.events || []) {
    if (event.type === 'finish' && Number.isFinite(Number(event.step))) {
      max = Math.max(max, Number(event.step));
    }
  }
  return max;
}

function detectStaleState(state, workflowDir, telemetry, stateFile, repoRoot = workflowDir) {
  const findings = [];
  const currentStep = Number(state.currentStep);
  const maxFinish = maxTelemetryFinishStep(telemetry);
  // Telemetry advanced beyond the selected state file: the monitor must not
  // report the older step as current without a warning.
  if (Number.isFinite(currentStep) && maxFinish > currentStep) {
    addFinding(
      findings,
      'critical',
      'stale-state',
      `telemetry advanced to step ${maxFinish} while state reports step ${currentStep}; selected state file is stale`,
      [toRepoRelative(repoRoot, stateFile, { allowOutside: true })],
    );
  }
  // State file older than telemetry with advancing events: likely polling a
  // stale copy after a config/branch/worktree change mid-run.
  try {
    const stateMtime = fs.statSync(stateFile).mtimeMs;
    const telemetryFile = path.join(workflowDir, 'telemetry.jsonl');
    if (fs.existsSync(telemetryFile)) {
      const telemetryMtime = fs.statSync(telemetryFile).mtimeMs;
      if (telemetryMtime > stateMtime + 5000 && maxFinish >= currentStep && telemetry.events.length > 0) {
        addFinding(
          findings,
          'warning',
          'stale-state',
          'telemetry is newer than the selected state file; re-resolve before reporting the step as current',
          [toRepoRelative(repoRoot, telemetryFile, { allowOutside: true })],
        );
      }
    }
  } catch {
    // Stat failures stay observable via missing-artifact, not here.
  }
  // Newer sibling state evidence in the same workflow dir (revision race).
  try {
    const entries = fs.readdirSync(workflowDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.state.json'))
      .map((entry) => path.join(workflowDir, entry.name));
    if (entries.length > 1) {
      const revisions = entries.map((file) => {
        try {
          const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
          return { file, revision: Number(parsed.revision || 0) };
        } catch {
          return { file, revision: -1 };
        }
      });
      const newest = revisions.reduce((a, b) => (b.revision > a.revision ? b : a));
      if (newest.file !== stateFile && newest.revision > Number(state.revision || 0)) {
        addFinding(
          findings,
          'warning',
          'stale-state',
          `newer state evidence exists at revision ${newest.revision}; selected file may be stale`,
          [toRepoRelative(repoRoot, newest.file, { allowOutside: true })],
        );
      }
    }
  } catch {
    // Ignore directory scan failures here.
  }
  return findings;
}

function queryMemoryVault(context, options = {}) {
  const result = {
    enabled: false,
    backend: 'none',
    activeWorkflows: [],
    records: [],
    findings: [],
    error: null,
  };
  const routing = resolveMemoryRouting(context.config);
  if (routing.enableSpecMemoIntegration) {
    result.enabled = true;
    result.backend = 'spec-memo-vault';
    const cliRaw = (context.config?.specMemo?.cli || 'memo').trim();
    const parts = cliRaw.split(/\s+/);
    const bin = parts[0];
    const binArgs = parts.slice(1);
    try {
      const probe = spawnSync(bin, [...binArgs, 'search', '--kinds', 'state', '--status', 'active', '--cwd', context.repoRoot, '--json'], {
        encoding: 'utf8',
        shell: process.platform === 'win32',
        timeout: 5000,
      });
      if (probe.status === 0 && probe.stdout) {
        try {
          const parsed = JSON.parse(probe.stdout);
          const records = Array.isArray(parsed) ? parsed : (parsed.hits || parsed.records || []);
          result.records = records;
          for (const rec of records) {
            result.activeWorkflows.push({
              id: rec.id,
              slug: rec.slug || rec.id,
              title: rec.title || rec.slug || rec.id,
              status: rec.status || 'active',
              updatedAt: rec.updatedAt || rec.updated_at || null,
            });
          }
        } catch {
          // Non-json stdout
        }
      } else if (probe.status !== 0 && probe.error) {
        result.error = probe.error.message;
      }
    } catch (err) {
      result.error = err.message;
    }
  } else if (routing.enableMemoryFiles) {
    result.enabled = true;
    result.backend = 'local-memory-files';
    const memoryDir = resolveEffectiveMemoryPaths({
      repoRoot: context.repoRoot,
      sharedDir: context.sharedDir,
      config: context.config,
    }).entriesDir;
    if (fs.existsSync(memoryDir)) {
      try {
        const entries = fs.readdirSync(memoryDir).filter((f) => f.endsWith('.md'));
        for (const entry of entries.slice(0, 50)) {
          const text = fs.readFileSync(path.join(memoryDir, entry), 'utf8');
          if (/workflow|active|in_progress|ws-spec/i.test(text)) {
            result.records.push({
              file: toRepoRelative(context.repoRoot, path.join(memoryDir, entry), { allowOutside: true }),
            });
          }
        }
      } catch {
        // ignore
      }
    }
  }
  return result;
}

function resolveCandidateTranscriptRoots(context, explicitRoots = [], options = {}) {
  const roots = [];
  if (Array.isArray(context.config?.monitor?.transcriptRoots)) {
    roots.push(...context.config.monitor.transcriptRoots);
  }
  if (Array.isArray(explicitRoots)) {
    roots.push(...explicitRoots);
  }
  // Workspace candidate roots (local to repoRoot)
  const workspaceCandidates = [
    path.join(context.repoRoot, '.agents', 'transcripts'),
    path.join(context.repoRoot, '.cursor', 'transcripts'),
    path.join(context.repoRoot, '.cursor', 'chats'),
    path.join(context.repoRoot, '.opencode', 'transcripts'),
    path.join(context.repoRoot, '.opencode', 'sessions'),
    path.join(context.repoRoot, '.opencode', 'logs'),
    path.join(context.repoRoot, '.system_generated', 'logs'),
    // Generic repo-local candidate (content-correlated, not adapter-gated);
    // kept after the Claude-to-Muse adapter rename for existing checkouts.
    path.join(context.repoRoot, '.claude', 'sessions'),
  ];
  for (const candidate of workspaceCandidates) {
    if (fs.existsSync(candidate)) {
      roots.push(candidate);
    }
  }
  // Host user-level roots (us-356): strictly opt-in. Without the flag (or the
  // config equivalent) no host store is probed — zero host-store reads.
  const checkHostRoots = options.discoverHostTranscripts || context.config?.monitor?.discoverHostTranscripts;
  if (checkHostRoots) {
    const home = getHostHome(context.config);
    for (const adapter of getHostAdapters(process.platform, home)) {
      for (const location of adapter.locations) {
        const resolved = path.normalize(location.path);
        if (adapter.id === 'antigravity' && fs.existsSync(resolved)) {
          try {
            const convos = fs.readdirSync(resolved, { withFileTypes: true })
              .filter((d) => d.isDirectory())
              .map((d) => path.join(resolved, d.name, '.system_generated', 'logs'))
              .filter((p) => fs.existsSync(p));
            roots.push(...convos.slice(0, 10));
          } catch {
            // ignore
          }
          continue;
        }
        if (adapter.id === 'muse' && fs.existsSync(resolved)) {
          const sessions = expandMuseSessionDirs(resolved, 50);
          roots.push(...(sessions.length > 0 ? sessions : [resolved]));
          continue;
        }
        if (fs.existsSync(resolved)) roots.push(resolved);
      }
    }
  }
  return [...new Set(roots.filter(Boolean).map((r) => path.isAbsolute(r) ? r : path.resolve(context.repoRoot, r)))];
}

function scanTranscriptRoots(context, roots, filter = {}) {
  // us-356: per-tick budget (time/read caps, recent-window tails only).
  const startedAt = Date.now();
  // us-356: collapse host-private paths against the configured host home,
  // not just the OS home, so isolated homes never leak into output.
  const hostHome = getHostHome(context?.config);
  const findings = [];
  const files = [];
  const visit = (directory, depth = 0) => {
    if (depth > 6 || files.length >= TRANSCRIPT_LIMITS.maxFilesPerTick || !fs.existsSync(directory)) return;
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= TRANSCRIPT_LIMITS.maxFilesPerTick) break;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full, depth + 1);
      else if (/\.(jsonl|log|txt|md|db|sqlite3?|vscdb)$/i.test(entry.name)) files.push(full);
    }
  };
  for (const root of roots) visit(root);
  let filesScanned = 0;
  let bytesRead = 0;
  let capped = files.length >= TRANSCRIPT_LIMITS.maxFilesPerTick;
  const scannedFiles = [];
  const repoRootResolved = path.resolve(context.repoRoot);
  for (const file of files) {
    if (Date.now() - startedAt > TRANSCRIPT_LIMITS.maxMsPerTick || bytesRead >= TRANSCRIPT_LIMITS.maxTotalBytes) {
      capped = true;
      break;
    }
    // Correlate on the raw tail, then sanitize before any pattern matching so
    // tokens, prompt content, and host-private paths never drive reporting.
    const read = readBoundedTailText(file);
    if (read.text === null) continue;
    const rawText = read.text;
    if (filter && (filter.workflowId || filter.slug)) {
      const matchesWf = Boolean(filter.workflowId && (file.includes(filter.workflowId) || rawText.includes(filter.workflowId)));
      const matchesSlug = Boolean(filter.slug && (file.includes(filter.slug) || rawText.includes(filter.slug)));
      const pass = filter.workflowId && filter.slug
        ? (matchesWf && matchesSlug)
        : (matchesWf || matchesSlug);
      if (!pass) continue;
    }
    const text = sanitizeTranscriptText(rawText, hostHome);
    filesScanned += 1;
    bytesRead += read.bytesRead;
    let mtimeMs = null;
    try {
      mtimeMs = fs.statSync(file).mtimeMs;
    } catch {
      // mtime is liveness-only; unreadable stats stay observable via scan, not here.
    }
    scannedFiles.push({ file, mtimeMs, tail: text.slice(-8000) });
    const evidence = sanitizeReportPath(toRepoRelative(context.repoRoot, file, { allowOutside: true }), hostHome);
    if (/ENOENT|build_dispatch_context/i.test(text)) {
      addFinding(findings, 'critical', 'hybrid-path-resolution', 'Transcript contains a missing-skill or dispatch-context path failure', [evidence]);
    }
    if (/unsupported.{0,32}model|invalid.{0,32}model|model.{0,32}(reject|not available)/i.test(text)) {
      addFinding(findings, 'warning', 'model-fallback', 'Transcript contains a rejected or unavailable model identifier', [evidence]);
    }
    if (/turn[_ -]ended/i.test(text)) {
      addFinding(findings, 'warning', 'turn-ended', 'Transcript contains a turn-ended signal before the workflow handoff', [evidence]);
    }
    if (/fatal error|unhandled rejection|exception in subagent/i.test(text)) {
      addFinding(findings, 'warning', 'subagent-error', 'Transcript contains an unhandled error or exception trace', [evidence]);
    }
    if (/generic.{0,20}(subagent|dispatch)/i.test(text)) {
      const specSub = context.config?.defaults?.specializedSubagents;
      const capabilityFile = path.join(context.sharedDir || '', 'host-capabilities.json');
      let capabilities = null;
      try {
        capabilities = fs.existsSync(capabilityFile) ? JSON.parse(fs.readFileSync(capabilityFile, 'utf8')) : null;
      } catch {
        // ignore
      }
      const hostBinding = capabilities?.binding || (capabilities && typeof capabilities === 'object' ? Object.values(capabilities)[0]?.binding : null);
      const hasNamedBinding = hostBinding?.supportsNamedAgents === true ||
        (hostBinding && hostBinding.namedAgentTool && hostBinding.namedAgentTool !== 'none');
      if (specSub?.enabled === true && hasNamedBinding) {
        addFinding(findings, 'warning', 'generic-dispatch', 'Transcript contains a generic dispatch where a named projection was expected', [evidence]);
      }
    }
  }
  const hostStoreReads = scannedFiles.filter((item) => !path.resolve(item.file).startsWith(repoRootResolved)).length;
  return {
    filesScanned,
    findings,
    files: scannedFiles,
    bytesRead,
    elapsedMs: Date.now() - startedAt,
    capped,
    hostStoreReads,
  };
}

// us-356: session-to-workflow correlation over already-scanned tails.
// Keys are normalized (case, separators) before matching to avoid false
// stall signals. Never touches the host store beyond the bounded scan above.
function resolveTranscriptSource(workflow, scannedFiles, discoveryEnabled, repoRoot) {
  if (!discoveryEnabled) {
    return { status: 'transcript-unavailable', reason: 'discovery-disabled' };
  }
  const keys = [workflow.slug, workflow.workflowId]
    .map(normalizeCorrelationKey)
    .filter((key) => key && key !== 'ws-spec-multi');
  const repoRootResolved = path.resolve(repoRoot);
  const candidates = (scannedFiles || []).filter((item) => {
    const haystack = normalizeCorrelationKey(item.file + String.fromCharCode(10) + item.tail);
    return keys.some((key) => haystack.includes(key));
  });
  if (candidates.length === 0) {
    return { status: 'transcript-unavailable', reason: 'no-matching-session' };
  }
  candidates.sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));
  const best = candidates[0];
  return {
    status: 'available',
    adapter: guessTranscriptAdapter(best.file),
    locationClass: path.resolve(best.file).startsWith(repoRootResolved) ? 'workspace' : 'user',
    sessionMtime: best.mtimeMs ? new Date(best.mtimeMs).toISOString() : null,
  };
}

function snapshot(options) {
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const plansDir = resolveConfiguredPath(context.repoRoot, context.config?.plans?.dir, '.agents/plans');
  const minVerifyScore = resolveMinVerifyScore(context.config);
  const gitContext = getGitContext(context.repoRoot);
  const resolvedContext = resolveResolvedContext({
    repoRoot: options.repoRoot,
    scriptFile: __filename,
    workflowId: options.workflowId || null,
    slug: options.slug || null,
  });
  const contextFindings = [];
  if (context.configError) {
    addFinding(
      contextFindings,
      'critical',
      'config-unreadable',
      `local config present but unreadable; refusing silent global fallback: ${context.configError}`,
      [resolvedContext.configPath],
    );
  }
  let stateFiles = listStateFiles(plansDir);
  if (options.slug) {
    stateFiles = stateFiles.filter((file) => {
      if (path.basename(path.dirname(file)) === options.slug) return true;
      const loaded = readState(file);
      const st = loaded.state;
      if (!st) return false;
      if (st.slug === options.slug || st.us === options.slug) return true;
      if (Array.isArray(st.items) && st.items.some((item) => item.slug === options.slug)) return true;
      return false;
    });
  }
  const workflows = [];
  for (const file of stateFiles) {
    const loaded = readState(file);
    const state = loaded.state;
    if (!state) continue;
    if (options.workflowId && String(state.workflowId) !== String(options.workflowId) && String(state.runId) !== String(options.workflowId)) {
      continue;
    }
    const workflowDir = path.dirname(loaded.stateFile);
    const isMultiSpec = state.workflowType === 'ws-spec-multi';

    if (isMultiSpec) {
      const items = Array.isArray(state.items) ? state.items : [];
      const inProgressItems = items.filter((item) => item.status === 'in_progress');
      const pendingItems = items.filter((item) => item.status === 'pending');
      const shippedItems = items.filter((item) => item.status === 'shipped');
      const failedItems = items.filter((item) => item.status === 'failed');
      const skippedItems = items.filter((item) => item.status === 'skipped');
      const findings = classifyMultiSpecWorkflow(state, loaded.stateFile, context.repoRoot);
      findings.push(...detectContextMismatch(state, gitContext, context.repoRoot));
      workflows.push({
        workflowId: state.runId || state.workflowId || path.basename(loaded.stateFile, loaded.stateFile.endsWith('.state.json') ? '.state.json' : '.state.md'),
        slug: state.slug || 'ws-spec-multi',
        pipeline: 'ws-spec-multi',
        status: state.status || 'unknown',
        currentStep: null,
        multiSpec: {
          runId: state.runId || null,
          baseBranch: state.baseBranch || null,
          itemCount: items.length,
          activeItem: inProgressItems[0] || null,
          pendingCount: pendingItems.length,
          shippedCount: shippedItems.length,
          failedCount: failedItems.length,
          skippedCount: skippedItems.length,
          items,
        },
        completedSteps: [],
        stepStatus: {},
        verificationScore: null,
        minVerifyScore,
        currentModel: null,
        configuredModel: null,
        statePath: toRepoRelative(context.repoRoot, loaded.stateFile, { allowOutside: true }),
        telemetry: {
          path: null,
          eventCount: 0,
          parseErrors: [],
          lastEvent: null,
        },
        expectedArtifacts: [],
        findings,
      });
      continue;
    }

    const telemetry = readTelemetry(path.join(workflowDir, 'telemetry.jsonl'));
    const findings = classifyWorkflow(state, workflowDir, telemetry, minVerifyScore, context.repoRoot, context.config);
    findings.push(...detectStaleState(state, workflowDir, telemetry, loaded.stateFile, context.repoRoot));
    findings.push(...detectContextMismatch(state, gitContext, context.repoRoot));
    const batonRaw = state.baton && typeof state.baton === 'object' ? state.baton : null;
    workflows.push({
      workflowId: state.workflowId || path.basename(loaded.stateFile, '.state.md'),
      slug: state.slug || state.us || path.basename(workflowDir),
      pipeline: state.workflowType || 'unknown',
      status: state.status || 'unknown',
      currentStep: Number(state.currentStep),
      completedSteps: state.completedSteps || [],
      stepStatus: state.stepStatus || {},
      verificationScore: state.verificationScore ?? null,
      minVerifyScore,
      currentModel: state.currentModel || null,
      configuredModel: state.configuredModel || null,
      baton: {
        holder: batonRaw?.holder || null,
        step: Number.isInteger(batonRaw?.step) ? batonRaw.step : Number(state.currentStep),
        leaseUntil: batonRaw?.leaseUntil || null,
        revision: Number.isInteger(batonRaw?.revision) ? batonRaw.revision : 0,
      },
      mappedRunner: context.config?.defaults?.stepRunners?.[String(Number(state.currentStep))] || null,
      statePath: toRepoRelative(context.repoRoot, loaded.stateFile, { allowOutside: true }),
      telemetry: {
        path: toRepoRelative(context.repoRoot, path.join(workflowDir, 'telemetry.jsonl'), { allowOutside: true }),
        eventCount: telemetry.events.length,
        parseErrors: telemetry.errors,
        lastEvent: telemetry.events.at(-1) || null,
      },
      expectedArtifacts: expectedArtifacts(state, workflowDir, minVerifyScore, context.repoRoot),
      findings,
    });
  }

  const memoryVault = queryMemoryVault(context, options);
  if (memoryVault.enabled && memoryVault.activeWorkflows.length > 0) {
    const diskSlugs = new Set(workflows.map((w) => w.slug));
    for (const mw of memoryVault.activeWorkflows) {
      if (mw.slug && !diskSlugs.has(mw.slug) && mw.status === 'active') {
        addFinding(
          memoryVault.findings,
          'info',
          'vault-unreconciled-workflow',
          `Memory vault records active workflow "${mw.slug}" but no matching plan state was found on disk`,
          [],
        );
      }
    }
  }

  const transcriptRoots = resolveCandidateTranscriptRoots(context, options.transcriptRoots, options);
  const hostHome = getHostHome(context.config);
  const transcript = scanTranscriptRoots(context, transcriptRoots, {
    workflowId: options.workflowId || null,
    slug: options.slug || null,
  });

  // us-356: transcript source per workflow + worker-session liveness.
  const discoveryEnabled = Boolean(options.discoverHostTranscripts || context.config?.monitor?.discoverHostTranscripts);
  const snapshotNow = Date.now();
  for (const workflow of workflows) {
    if (workflow.multiSpec) {
      workflow.transcriptSource = null;
      continue;
    }
    workflow.transcriptSource = resolveTranscriptSource(
      { slug: workflow.slug, workflowId: workflow.workflowId },
      transcript.files,
      discoveryEnabled,
      context.repoRoot,
    );
    const source = workflow.transcriptSource;
    const isActive = ['active', 'blocked', 'in_progress'].includes(workflow.status);
    if (source.status === 'available' && isActive && source.sessionMtime) {
      const idleMs = snapshotNow - Date.parse(source.sessionMtime);
      if (Number.isFinite(idleMs) && idleMs > TRANSCRIPT_LIMITS.stallWindowMs) {
        addFinding(
          workflow.findings,
          'warning',
          'worker-session-stall',
          'worker session shows no recent activity while the workflow is active (possible stall)',
          [],
        );
      }
    }
  }

  for (const scanned of transcript.files) delete scanned.tail;
  const findings = [
    ...contextFindings,
    ...workflows.flatMap((workflow) => workflow.findings),
    ...memoryVault.findings,
    ...transcript.findings,
  ];

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repoRoot: '.',
    plansDir: toRepoRelative(context.repoRoot, plansDir, { allowOutside: true }),
    workflowCount: workflows.length,
    activeCount: workflows.filter((workflow) => ['active', 'blocked', 'in_progress'].includes(workflow.status)).length,
    findings,
    resolvedContext,
    gitContext: { branch: gitContext.branch, head: gitContext.head ? `${String(gitContext.head).slice(0, 12)}…` : null },
    memoryVault: {
      enabled: memoryVault.enabled,
      backend: memoryVault.backend,
      activeWorkflows: memoryVault.activeWorkflows,
      findings: memoryVault.findings,
    },
    transcript: {
      roots: transcriptRoots.map((root) => sanitizeReportPath(toRepoRelative(context.repoRoot, root, { allowOutside: true }), hostHome)),
      filesScanned: transcript.filesScanned,
      bytesRead: transcript.bytesRead,
      elapsedMs: transcript.elapsedMs,
      capped: transcript.capped,
      hostStoreReads: transcript.hostStoreReads,
    },
    workflows,
  };
}

function markdownReport(report) {
  const lines = [
    '# Workflow monitor report',
    '',
    `Generated: ${report.generatedAt}`,
    `Workflows: ${report.workflowCount} (${report.activeCount} active)`,
    '',
    '## Findings',
    '',
  ];
  if (!report.findings.length) lines.push('none');
  else {
    for (const finding of report.findings) {
      const evidence = finding.evidence?.length ? ` Evidence: ${finding.evidence.join(', ')}` : '';
      lines.push(`- **${finding.severity.toUpperCase()}** \`${finding.code}\`: ${finding.message}.${evidence}`);
    }
  }

  if (report.memoryVault && report.memoryVault.enabled) {
    lines.push('', '## Memory Vault', '');
    lines.push(`- Backend: ${report.memoryVault.backend}`);
    lines.push(`- Active workflows in vault: ${report.memoryVault.activeWorkflows.length ? report.memoryVault.activeWorkflows.map((w) => w.slug || w.id).join(', ') : 'none'}`);
  }

  lines.push('', '## Workflows', '');
  if (!report.workflows.length) lines.push('No workflow state files found under the configured plans directory.');
  for (const workflow of report.workflows) {
    if (workflow.pipeline === 'ws-spec-multi' && workflow.multiSpec) {
      const ms = workflow.multiSpec;
      lines.push(
        `### ${workflow.workflowId} (Multi-spec Batch)`,
        '',
        `- Status: ${workflow.status}`,
        `- Pipeline: ${workflow.pipeline}`,
        `- Base branch: ${ms.baseBranch || 'unspecified'}`,
        `- Queue progress: ${ms.shippedCount} shipped / ${ms.itemCount} total (${ms.pendingCount} pending, ${ms.failedCount} failed, ${ms.skippedCount} skipped)`,
        `- Active spec: ${ms.activeItem ? `${ms.activeItem.slug} [${ms.activeItem.flowMode || 'auto'}]` : 'none'}`,
        `- State: \`${workflow.statePath}\``,
        '',
        'Queue items:',
      );
      for (const item of ms.items) {
        const mark = item.status === 'shipped' ? '[x]' : item.status === 'in_progress' ? '[~]' : item.status === 'failed' ? '[!]' : '[ ]';
        const pr = item.prNumber ? ` (PR ${item.prNumber})` : '';
        const reason = item.reason ? ` - ${item.reason}` : '';
        lines.push(`- ${mark} ${item.slug} (${item.status})${pr}${reason}`);
      }
      lines.push('');
      continue;
    }

    lines.push(
      `### ${workflow.workflowId}`,
      '',
      `- Status: ${workflow.status}`,
      `- Pipeline: ${workflow.pipeline}`,
      `- Current step: ${workflow.currentStep}`,
      `- Verification score: ${workflow.verificationScore ?? 'missing'} / ${workflow.minVerifyScore}`,
      `- Baton: ${workflow.baton?.holder || 'free'} (step ${workflow.baton?.step ?? workflow.currentStep}, lease ${workflow.baton?.leaseUntil || 'none'})`,
      `- Mapped runner: ${workflow.mappedRunner || 'single-host'}`,
      `- State: \`${workflow.statePath}\``,
      `- Telemetry events: ${workflow.telemetry.eventCount}`,
    '- Transcript: ' + (workflow.transcriptSource ? workflow.transcriptSource.status : 'unknown') + (workflow.transcriptSource && workflow.transcriptSource.adapter ? ' via ' + workflow.transcriptSource.adapter + ' (' + workflow.transcriptSource.locationClass + ')' : ' (' + ((workflow.transcriptSource && workflow.transcriptSource.reason) || 'unknown') + ')'),
      '',
      'Expected artifacts:',
    );
    for (const artifact of workflow.expectedArtifacts) {
      lines.push(`- ${artifact.present ? '[x]' : '[ ]'} \`${artifact.path}\``);
    }
    lines.push('');
  }
  lines.push(
    '## Transcript scan',
    '',
    `- Roots: ${report.transcript.roots.length ? report.transcript.roots.join(', ') : 'none configured'}`,
    `- Files scanned: ${report.transcript.filesScanned} (${report.transcript.bytesRead} bytes, ${report.transcript.elapsedMs}ms, host-store reads: ${report.transcript.hostStoreReads}${report.transcript.capped ? ', capped' : ''})`,
    '',
    '## Upstream filing guardrail',
    '',
    'Reports may contain consumer-local paths. Before filing an upstream issue, remove repository names, paths, hostnames, tracker ids, transcripts, secrets, and customer data; describe only the generic failure class and reproducible contract.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function sleep(seconds) {
  const milliseconds = Math.max(0, Number(seconds) * 1000);
  if (!milliseconds) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function requirePositiveInteger(value, token) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${token} requires a positive integer`);
  }
  return number;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: node monitor_snapshot.cjs [--repo-root DIR] [--slug SLUG] [--workflow-id ID] [--transcript-root DIR] [--discover-host-transcripts] [--vault] [--report FILE] [--json] [--watch --interval SEC --iterations N]\n');
    return;
  }
  if (options.watch && options.iterations === undefined) {
    throw new Error('--watch requires --iterations <count> for a bounded run');
  }
  if (options.interval !== undefined) {
    options.interval = requirePositiveInteger(options.interval, '--interval');
  }
  if (options.watch) {
    options.iterations = requirePositiveInteger(options.iterations, '--iterations');
  }
  const iterations = options.watch
    ? options.iterations
    : 1;
  let count = 0;
  do {
    const report = snapshot(options);
    if (options.report) {
      const reportPath = path.isAbsolute(options.report)
        ? options.report
        : path.resolve(options.repoRoot || process.cwd(), options.report);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, markdownReport(report), 'utf8');
    }
    process.stdout.write(options.json ? `${JSON.stringify(report)}\n` : markdownReport(report));
    count += 1;
    if (iterations === 0 || count < iterations) sleep(options.interval || DEFAULT_INTERVAL_SECONDS);
  } while (iterations === 0 || count < iterations);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  parseArgs,
  expectedArtifacts,
  classifyWorkflow,
  classifyMultiSpecWorkflow,
  parseMultiSpecTable,
  queryMemoryVault,
  resolveCandidateTranscriptRoots,
  detectStaleState,
  detectContextMismatch,
  getGitContext,
  maxTelemetryFinishStep,
  markdownReport,
  snapshot,
  scanTranscriptRoots,
  TRANSCRIPT_LIMITS,
  getHostAdapters,
  getHostHome,
  sanitizeTranscriptText,
  sanitizeReportPath,
  readBoundedTailText,
  resolveTranscriptSource,
  guessTranscriptAdapter,
  resolveMuseSessionsRoot,
  expandMuseSessionDirs,
};
