#!/usr/bin/env node
/**
 * ws-audit — runtime audit log helper for ws-spec-to-pr* orchestrators.
 * CLI: node audit_log.js <command> [options]
 * Commands: init | append | finalize | has-errors | draft-issue | resolve
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_CATEGORIES = new Set([
  'script',
  'tool',
  'io-validation',
  'dispatch',
  'other',
]);
const VALID_SEVERITIES = new Set(['error', 'unusual', 'info']);

function usage() {
  console.log(`Usage:
  node audit_log.js resolve [--config <path>]
  node audit_log.js init --us-dir <path> --slug <slug> [--workflow-id <id>]
  node audit_log.js append --session <json> --finding <json>
  node audit_log.js finalize --session <json>
  node audit_log.js has-errors --session <json>
  node audit_log.js draft-issue --session <json> [--upstream <owner/repo>]`);
}

function readJsonArg(raw, label) {
  if (!raw) {
    console.error(`Error: --${label} required`);
    process.exit(2);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error: invalid --${label} JSON: ${e.message}`);
    process.exit(2);
  }
}

function resolveConfigPath(explicit) {
  if (explicit) return path.resolve(explicit);
  return path.resolve(process.cwd(), '.agents/skills/ws-shared/config.json');
}

function resolveUpstreamRepo() {
  const candidates = [
    path.resolve(process.cwd(), 'bin/skill-dependencies.json'),
    path.resolve(process.cwd(), '.agents/skills/ws-shared/skill-dependencies.json'),
    path.resolve(__dirname, '../../ws-shared/skill-dependencies.json'),
  ];
  for (const cand of candidates) {
    try {
      if (!fs.existsSync(cand)) continue;
      const data = JSON.parse(fs.readFileSync(cand, 'utf-8'));
      const repo = data?.upstream?.repo;
      if (repo && typeof repo === 'string' && repo.includes('/')) return repo;
    } catch {
      /* try next */
    }
  }
  return 'jpolvora/workflow-skills';
}

export function resolveEnableAuditing(configPath) {
  const p = resolveConfigPath(configPath);
  if (!fs.existsSync(p)) return false;
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const cfg = JSON.parse(raw);
    return cfg?.defaults?.enableAuditing === true;
  } catch {
    return false;
  }
}

function isoNow() {
  return new Date().toISOString();
}

function sessionPath(session) {
  return path.join(session.usDir, `.audit-session-${session.slug}.json`);
}

function logPath(session) {
  if (session.logPath) return session.logPath;
  const stamp = session.startedAt.replace(/[:.]/g, '-');
  return path.join(session.usDir, `audit-${session.slug}-${stamp}.log.md`);
}

function writeSession(session) {
  fs.mkdirSync(session.usDir, { recursive: true });
  fs.writeFileSync(sessionPath(session), JSON.stringify(session, null, 2), 'utf-8');
}

function loadSession(sessionArg) {
  const session = readJsonArg(sessionArg, 'session');
  if (!session.usDir || !session.slug) {
    console.error('Error: session must include usDir and slug');
    process.exit(2);
  }
  return session;
}

function formatFinding(f) {
  const lines = [
    `### Finding`,
    '',
    `- **timestamp:** ${f.timestamp}`,
    `- **step:** ${f.step}`,
    `- **skill:** ${f.skill ?? '(unknown)'}`,
    `- **category:** ${f.category}`,
    `- **severity:** ${f.severity}`,
    `- **recovered:** ${f.recovered === true ? 'true' : 'false'}`,
    `- **summary:** ${f.summary}`,
  ];
  if (f.evidence) {
    lines.push(`- **evidence:** ${f.evidence}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function initAudit({ usDir, slug, workflowId }) {
  const startedAt = isoNow();
  const session = {
    usDir: path.resolve(usDir),
    slug,
    workflowId: workflowId || null,
    startedAt,
    finalized: false,
    findings: [],
    logPath: path.join(
      path.resolve(usDir),
      `audit-${slug}-${startedAt.replace(/[:.]/g, '-')}.log.md`,
    ),
  };
  fs.mkdirSync(session.usDir, { recursive: true });
  const header = [
    '---',
    `slug: ${slug}`,
    `workflowId: ${workflowId || 'null'}`,
    `startedAt: ${startedAt}`,
    '---',
    '',
    '# Runtime audit log',
    '',
    `Workflow: ${slug}`,
    '',
    '## Findings',
    '',
  ].join('\n');
  fs.writeFileSync(session.logPath, header, 'utf-8');
  writeSession(session);
  return session;
}

export function appendFinding(session, finding) {
  const f = {
    timestamp: finding.timestamp || isoNow(),
    step: finding.step ?? 'other',
    skill: finding.skill ?? null,
    category: finding.category || 'other',
    severity: finding.severity || 'unusual',
    summary: finding.summary || '(no summary)',
    evidence: finding.evidence ?? null,
    recovered: finding.recovered === true,
  };
  if (!VALID_CATEGORIES.has(f.category)) {
    f.category = 'other';
  }
  if (!VALID_SEVERITIES.has(f.severity)) {
    f.severity = 'unusual';
  }
  session.findings.push(f);
  fs.appendFileSync(session.logPath, formatFinding(f), 'utf-8');
  writeSession(session);
  return f;
}

export function finalizeAudit(session) {
  const errorCount = session.findings.filter((x) => x.severity === 'error').length;
  const unusualCount = session.findings.filter((x) => x.severity === 'unusual').length;
  const footer = [
    '## Summary',
    '',
    `- **errors:** ${errorCount}`,
    `- **unusual:** ${unusualCount}`,
    `- **total findings:** ${session.findings.length}`,
    `- **finalizedAt:** ${isoNow()}`,
    '',
  ].join('\n');
  fs.appendFileSync(session.logPath, footer, 'utf-8');
  session.finalized = true;
  session.finalizedAt = isoNow();
  session.errorCount = errorCount;
  writeSession(session);
  try {
    fs.unlinkSync(sessionPath(session));
  } catch {
    /* session file optional cleanup */
  }
  return session;
}

export function hasActionableErrors(session) {
  return session.findings.some((x) => x.severity === 'error');
}

export function draftIssueBody(session, upstream = resolveUpstreamRepo()) {
  const errors = session.findings.filter((x) => x.severity === 'error');
  const title = `[runtime-audit] ${session.slug}: ${errors.length} skill execution error(s)`;
  const lines = [
    '## Summary',
    '',
    `Runtime audit wrapper recorded **${errors.length}** actionable error(s) during \`${session.slug}\` workflow execution.`,
    'Delivery may have succeeded after model recovery; skill/hub content may still be defective.',
    '',
    `**Audit log:** ${session.logPath}`,
    '',
    '## Findings (errors)',
    '',
  ];
  for (const f of errors) {
    lines.push(
      `### ${f.category} — step ${f.step}${f.skill ? ` (${f.skill})` : ''}`,
      '',
      `- **summary:** ${f.summary}`,
      `- **recovered:** ${f.recovered}`,
    );
    if (f.evidence) lines.push(`- **evidence:** ${f.evidence}`);
    lines.push('');
  }
  lines.push('## Suggested action', '', 'Fix managed skill/hub/script content in the upstream package.', '');
  return { title, body: lines.join('\n'), upstream, logPath: session.logPath };
}

function parseCli(argv) {
  const args = argv.slice(2);
  const cmd = args[0];
  const opts = {};
  for (let i = 1; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--us-dir') opts.usDir = args[++i];
    else if (a === '--slug') opts.slug = args[++i];
    else if (a === '--workflow-id') opts.workflowId = args[++i];
    else if (a === '--session') opts.session = args[++i];
    else if (a === '--finding') opts.finding = args[++i];
    else if (a === '--config') opts.config = args[++i];
    else if (a === '--upstream') opts.upstream = args[++i];
    else if (a === '--help' || a === '-h') opts.help = true;
    else {
      console.error(`Unknown arg: ${a}`);
      usage();
      process.exit(2);
    }
  }
  return { cmd, opts };
}

function main() {
  const { cmd, opts } = parseCli(process.argv);
  if (opts.help || !cmd) {
    usage();
    process.exit(cmd ? 0 : 2);
  }

  if (cmd === 'resolve') {
    const enabled = resolveEnableAuditing(opts.config);
    console.log(JSON.stringify({ enableAuditing: enabled }));
    return;
  }

  if (cmd === 'init') {
    if (!opts.usDir || !opts.slug) {
      console.error('Error: init requires --us-dir and --slug');
      process.exit(2);
    }
    const session = initAudit({
      usDir: opts.usDir,
      slug: opts.slug,
      workflowId: opts.workflowId,
    });
    console.log(JSON.stringify({ status: 'success', session }));
    return;
  }

  if (cmd === 'append') {
    const session = loadSession(opts.session);
    const finding = readJsonArg(opts.finding, 'finding');
    appendFinding(session, finding);
    console.log(JSON.stringify({ status: 'success', session }));
    return;
  }

  if (cmd === 'finalize') {
    const session = loadSession(opts.session);
    finalizeAudit(session);
    console.log(JSON.stringify({ status: 'success', session }));
    return;
  }

  if (cmd === 'has-errors') {
    const session = loadSession(opts.session);
    console.log(
      JSON.stringify({
        hasErrors: hasActionableErrors(session),
        errorCount: session.findings.filter((x) => x.severity === 'error').length,
      }),
    );
    return;
  }

  if (cmd === 'draft-issue') {
    const session = loadSession(opts.session);
    const draft = draftIssueBody(session, opts.upstream);
    console.log(JSON.stringify({ status: 'success', draft }));
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  usage();
  process.exit(2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
