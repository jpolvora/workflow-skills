#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  resolveConsumerContext,
  resolveConfiguredPath,
  resolveMinVerifyScore,
  resolveResolvedContext,
  toRepoRelative,
} = require('../../ws-shared/runtime/scripts/resolve_consumer_root.cjs');
const { parseFrontmatter } = require('../../ws-shared/runtime/scripts/workflow_state.cjs');

const MUTATING_STEPS = new Set([0, 1, 2, 3, 4, 6, 7, 8]);
const DEFAULT_INTERVAL_SECONDS = 10;

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
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
    if (key === 'transcriptRoot') {
      options.transcriptRoots.push(requireValue(index, token));
      index += 1;
      continue;
    }
    if (['json', 'watch'].includes(key) && (index + 1 >= argv.length || argv[index + 1].startsWith('--'))) {
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

function readState(file) {
  const jsonFile = file.endsWith('.state.json') ? file : file.replace(/\.state\.md$/, '.state.json');
  const json = readJson(jsonFile);
  if (json) return { state: json, stateFile: jsonFile };
  const markdown = file.endsWith('.state.md') ? file : file.replace(/\.state\.json$/, '.state.md');
  if (!fs.existsSync(markdown)) return { state: null, stateFile: file };
  let state = {};
  try {
    state = parseFrontmatter(fs.readFileSync(markdown, 'utf8')).data;
  } catch {
    // Keep malformed legacy state files observable without aborting the snapshot.
  }
  return { state, stateFile: markdown };
}

function listStateFiles(plansDir) {
  if (!fs.existsSync(plansDir)) return [];
  const directories = fs.readdirSync(plansDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(plansDir, entry.name));
  const files = [];
  for (const directory of directories) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const json = entries.find((entry) => entry.isFile() && entry.name.endsWith('.state.json'));
    const markdown = entries.find((entry) => entry.isFile() && entry.name.endsWith('.state.md'));
    if (json) files.push(path.join(directory, json.name));
    else if (markdown) files.push(path.join(directory, markdown.name));
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
  if (Number(state.currentStep) >= 4 || isCompleted(state, 3)) add(`step-03-${slug}.plan.exec.md`, 'Step 3 completed');
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

function classifyWorkflow(state, workflowDir, telemetry, minVerifyScore, repoRoot = workflowDir) {
  const findings = [];
  const missing = expectedArtifacts(state, workflowDir, minVerifyScore, repoRoot).filter((item) => !item.present);
  for (const artifact of missing) {
    addFinding(findings, 'critical', 'missing-artifact', `${artifact.name} is missing (${artifact.reason})`, [artifact.path]);
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
    if (event.type === 'finish' && event.step !== 5 && MUTATING_STEPS.has(Number(event.step)) && event.skipReason == null && !hasTouched) {
      addFinding(findings, 'warning', 'empty-files-touched', `Completed mutating Step ${event.step} reported no filesTouched`, []);
    }
  }
  for (const error of telemetry.errors) {
    addFinding(findings, 'warning', 'telemetry-parse-error', 'Telemetry contains an unreadable line', [error]);
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
      if (newest.file !== stateFile && newest.revision >= Number(state.revision || 0)) {
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

function scanTranscriptRoots(context, roots, filter = {}) {
  const findings = [];
  const files = [];
  const visit = (directory, depth = 0) => {
    if (depth > 6 || !fs.existsSync(directory)) return;
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full, depth + 1);
      else if (/\.(jsonl|log|txt|md)$/i.test(entry.name)) files.push(full);
    }
  };
  for (const root of roots) visit(root);
  let filesScanned = 0;
  for (const file of files.slice(0, 5000)) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8').slice(0, 2_000_000);
    } catch {
      continue;
    }
    if (filter && (filter.workflowId || filter.slug)) {
      const matchesWf = Boolean(filter.workflowId && (file.includes(filter.workflowId) || text.includes(filter.workflowId)));
      const matchesSlug = Boolean(filter.slug && (file.includes(filter.slug) || text.includes(filter.slug)));
      const pass = filter.workflowId && filter.slug
        ? (matchesWf && matchesSlug)
        : (matchesWf || matchesSlug);
      if (!pass) continue;
    }
    filesScanned += 1;
    const evidence = toRepoRelative(context.repoRoot, file, { allowOutside: true });
    if (/ENOENT|build_dispatch_context/i.test(text)) {
      addFinding(findings, 'critical', 'hybrid-path-resolution', 'Transcript contains a missing-skill or dispatch-context path failure', [evidence]);
    }
    if (/unsupported.{0,32}model|invalid.{0,32}model|model.{0,32}(reject|not available)/i.test(text)) {
      addFinding(findings, 'warning', 'model-fallback', 'Transcript contains a rejected or unavailable model identifier', [evidence]);
    }
    if (/turn[_ -]ended/i.test(text)) {
      addFinding(findings, 'warning', 'turn-ended', 'Transcript contains a turn-ended signal before the workflow handoff', [evidence]);
    }
    if (/generic.{0,20}(subagent|dispatch)/i.test(text)) {
      addFinding(findings, 'warning', 'generic-dispatch', 'Transcript contains a generic dispatch where a named projection may have been expected', [evidence]);
    }
  }
  return { filesScanned, findings };
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
  if (options.slug) stateFiles = stateFiles.filter((file) => path.basename(path.dirname(file)) === options.slug);
  const workflows = [];
  for (const file of stateFiles) {
    const loaded = readState(file);
    const state = loaded.state;
    if (!state) continue;
    if (options.workflowId && String(state.workflowId) !== String(options.workflowId)) continue;
    const workflowDir = path.dirname(loaded.stateFile);
    const telemetry = readTelemetry(path.join(workflowDir, 'telemetry.jsonl'));
    const findings = classifyWorkflow(state, workflowDir, telemetry, minVerifyScore, context.repoRoot);
    findings.push(...detectStaleState(state, workflowDir, telemetry, loaded.stateFile, context.repoRoot));
    findings.push(...detectContextMismatch(state, gitContext, context.repoRoot));
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
  const configuredRoots = Array.isArray(context.config?.monitor?.transcriptRoots)
    ? context.config.monitor.transcriptRoots
    : [];
  const transcriptRoots = [...new Set([
    ...configuredRoots,
    ...options.transcriptRoots,
  ].filter(Boolean).map((root) => path.isAbsolute(root) ? root : path.resolve(context.repoRoot, root)))];
  const transcript = scanTranscriptRoots(context, transcriptRoots, {
    workflowId: options.workflowId || null,
    slug: options.slug || null,
  });
  const findings = [...contextFindings, ...workflows.flatMap((workflow) => workflow.findings), ...transcript.findings];
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
    transcript: {
      roots: transcriptRoots.map((root) => toRepoRelative(context.repoRoot, root, { allowOutside: true })),
      filesScanned: transcript.filesScanned,
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
  lines.push('', '## Workflows', '');
  if (!report.workflows.length) lines.push('No workflow state files found under the configured plans directory.');
  for (const workflow of report.workflows) {
    lines.push(
      `### ${workflow.workflowId}`,
      '',
      `- Status: ${workflow.status}`,
      `- Pipeline: ${workflow.pipeline}`,
      `- Current step: ${workflow.currentStep}`,
      `- Verification score: ${workflow.verificationScore ?? 'missing'} / ${workflow.minVerifyScore}`,
      `- State: \`${workflow.statePath}\``,
      `- Telemetry events: ${workflow.telemetry.eventCount}`,
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
    `- Files scanned: ${report.transcript.filesScanned}`,
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
    process.stdout.write('Usage: node monitor_snapshot.cjs [--repo-root DIR] [--slug SLUG] [--workflow-id ID] [--transcript-root DIR] [--report FILE] [--json] [--watch --interval SEC --iterations N]\n');
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
  detectStaleState,
  detectContextMismatch,
  getGitContext,
  maxTelemetryFinishStep,
  markdownReport,
  snapshot,
  scanTranscriptRoots,
};
