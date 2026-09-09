#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  resolveConsumerContext,
  resolveConfiguredPath,
  resolveMinVerifyScore,
  toRepoRelative,
} = require('../../ws-shared/runtime/scripts/resolve_consumer_root.cjs');

const MUTATING_STEPS = new Set([0, 1, 2, 3, 4, 6, 7, 8]);
const DEFAULT_INTERVAL_SECONDS = 10;

function parseArgs(argv) {
  const options = { transcriptRoots: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
    if (key === 'transcriptRoot') {
      options.transcriptRoots.push(argv[++index]);
      continue;
    }
    if (['json', 'watch'].includes(key) && (index + 1 >= argv.length || argv[index + 1].startsWith('--'))) {
      options[key] = true;
      continue;
    }
    options[key] = argv[++index];
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

function parseScalar(value) {
  const raw = String(value).trim();
  if (raw === '[]') return [];
  if (raw === '{}') return {};
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null' || raw === '~') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return raw.slice(1, -1).split(',').map((item) => parseScalar(item)).filter((item) => item !== '');
  }
  return raw.replace(/^(['"])(.*)\1$/, '$2');
}

function readState(file) {
  const jsonFile = file.endsWith('.state.json') ? file : file.replace(/\.state\.md$/, '.state.json');
  const json = readJson(jsonFile);
  if (json) return { state: json, stateFile: jsonFile };
  const markdown = file.endsWith('.state.md') ? file : file.replace(/\.state\.json$/, '.state.md');
  if (!fs.existsSync(markdown)) return { state: null, stateFile: file };
  const text = fs.readFileSync(markdown, 'utf8').replace(/\r\n?/g, '\n');
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
  const state = {};
  for (const line of (match?.[1] || '').split('\n')) {
    const item = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (item) state[item[1]] = parseScalar(item[2]);
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

function expectedArtifacts(state, workflowDir, minVerifyScore) {
  const slug = state.slug || state.us || path.basename(workflowDir);
  const expected = [];
  const add = (name, reason) => expected.push({
    path: toRepoRelative(workflowDir, path.join(workflowDir, name), { allowOutside: true }),
    name,
    reason,
    present: fs.existsSync(path.join(workflowDir, name)),
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
  if (Number(state.currentStep) > 5 && Number(state.verificationScore) < minVerifyScore) {
    expected.push({
      path: toRepoRelative(workflowDir, workflowDir, { allowOutside: true }),
      name: 'scoreAndRefine',
      reason: `Step 5 score must reach ${minVerifyScore} before Step 6`,
      present: false,
    });
  }
  return expected;
}

function addFinding(findings, severity, code, message, evidence = []) {
  const key = `${severity}:${code}:${message}`;
  if (findings.some((item) => `${item.severity}:${item.code}:${item.message}` === key)) return;
  findings.push({ severity, code, message, evidence });
}

function classifyWorkflow(state, workflowDir, telemetry, minVerifyScore) {
  const findings = [];
  const missing = expectedArtifacts(state, workflowDir, minVerifyScore).filter((item) => !item.present);
  for (const artifact of missing) {
    addFinding(findings, 'critical', 'missing-artifact', `${artifact.name} is missing (${artifact.reason})`, [artifact.path]);
  }
  if (Number(state.currentStep) > 5 && Number(state.verificationScore) < minVerifyScore) {
    addFinding(
      findings,
      'critical',
      'step-drift',
      `currentStep is ${state.currentStep} while verificationScore is ${state.verificationScore || 'missing'} below ${minVerifyScore}`,
      [toRepoRelative(workflowDir, workflowDir, { allowOutside: true })],
    );
  }
  for (const event of telemetry.events) {
    if (event.packageVersion === 'unknown') {
      addFinding(findings, 'warning', 'package-version-unknown', 'Telemetry event has packageVersion "unknown"', []);
    }
    if (event.type === 'finish' && event.substep === 'scoreAndRefine') continue;
    const touched = event.filesTouched || {};
    const hasTouched = ['created', 'modified', 'deleted'].some((key) => Array.isArray(touched[key]) && touched[key].length);
    if (event.type === 'finish' && event.step !== 5 && MUTATING_STEPS.has(Number(event.step)) && event.skipReason === null && !hasTouched) {
      addFinding(findings, 'warning', 'empty-files-touched', `Completed mutating Step ${event.step} reported no filesTouched`, []);
    }
  }
  for (const error of telemetry.errors) {
    addFinding(findings, 'warning', 'telemetry-parse-error', 'Telemetry contains an unreadable line', [error]);
  }
  return findings;
}

function scanTranscriptRoots(context, roots) {
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
  for (const file of files.slice(0, 5000)) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8').slice(0, 2_000_000);
    } catch {
      continue;
    }
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
  return { filesScanned: Math.min(files.length, 5000), findings };
}

function snapshot(options) {
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const plansDir = resolveConfiguredPath(context.repoRoot, context.config?.plans?.dir, '.agents/plans');
  const minVerifyScore = resolveMinVerifyScore(context.config);
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
    const findings = classifyWorkflow(state, workflowDir, telemetry, minVerifyScore);
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
      expectedArtifacts: expectedArtifacts(state, workflowDir, minVerifyScore),
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
  const transcript = scanTranscriptRoots(context, transcriptRoots);
  const findings = [...workflows.flatMap((workflow) => workflow.findings), ...transcript.findings];
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repoRoot: '.',
    plansDir: toRepoRelative(context.repoRoot, plansDir, { allowOutside: true }),
    workflowCount: workflows.length,
    activeCount: workflows.filter((workflow) => ['active', 'blocked', 'in_progress'].includes(workflow.status)).length,
    findings,
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

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: node monitor_snapshot.cjs [--repo-root DIR] [--slug SLUG] [--workflow-id ID] [--transcript-root DIR] [--report FILE] [--json] [--watch --interval SEC --iterations N]\n');
    return;
  }
  const iterations = options.watch
    ? (options.iterations === undefined ? 0 : Math.max(1, Number(options.iterations)))
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

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}

module.exports = {
  parseArgs,
  expectedArtifacts,
  classifyWorkflow,
  markdownReport,
  snapshot,
};
