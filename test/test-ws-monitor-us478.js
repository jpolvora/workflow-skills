/**
 * us-478: `buildIssueProposal` must sanitize the proposed issue body by
 * construction and label its summary counts by unit. Two defects share the
 * builder:
 *   1. the body embedded a host `Session id: <uuid>` line and echoed the raw
 *      `--session-id <uuid>` while a `Body anonymized` checklist claimed it was
 *      clean; and
 *   2. the summary counted distinct slugs as workflows, contradicting the
 *      report header which counts runs.
 * Run: node test/test-ws-monitor-us478.js
 *
 * Test names (referenced by the AC ledger):
 * - us-478 AC1 session id omitted from body
 * - us-478 AC2 command redaction placeholder
 * - us-478 AC3 no session id omits metadata line
 * - us-478 AC4 summary labels run and slug units
 * - us-478 AC5 session id value redacted
 * - us-478 AC6 checklist checked only when clean
 * - us-478 NS1 supplied session id absent
 * - us-478 NS2 no session id omits metadata line
 * - us-478 NS3 shared slug uses run count
 */
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, '.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');
const require = createRequire(import.meta.url);
const { buildIssueProposal } = require(script);

const SESSION_ID = 'abc-123';
const context = {
  config: {
    providers: { scm: 'github' },
    project: { name: 'us478-test' },
  },
};
const findings = [
  { severity: 'critical', code: 'missing-artifact', message: 'missing artifact fixture' },
  { severity: 'info', code: 'unrelated', message: 'not actionable' },
];

function proposal({ sessionId, workflows }) {
  const result = buildIssueProposal(context, workflows, findings, {
    openIssue: true,
    sessionId,
    agent: 'us478-test-agent',
    slug: 'us-478',
  });
  if (!result || typeof result.body !== 'string') {
    throw new Error('us-478: buildIssueProposal returned no body');
  }
  return result;
}

function line(body, needle) {
  return body.split('\n').find((entry) => entry.includes(needle)) || '';
}

// AC1 + AC5 + NS1: the raw session id must never appear anywhere in the body.
{
  const { body } = proposal({ sessionId: SESSION_ID, workflows: [{ slug: 'a' }] });
  if (body.includes(SESSION_ID)) {
    throw new Error('us-478 AC1 session id omitted from body: raw id leaked into body');
  }
}

// AC2: a supplied session id renders the reproduction flag as a literal placeholder.
{
  const { body } = proposal({ sessionId: SESSION_ID, workflows: [{ slug: 'a' }] });
  if (!body.includes('--session-id <redacted>')) {
    throw new Error(`us-478 AC2 command redaction placeholder: ${JSON.stringify(line(body, 'Command:'))}`);
  }
  if (!/Session id: <redacted>/.test(body)) {
    throw new Error('us-478 AC5 session id value redacted: metadata line must show the redaction token');
  }
}

// AC3 + NS2: no supplied session id omits the metadata line and the flag entirely.
{
  const { body } = proposal({ sessionId: null, workflows: [{ slug: 'a' }] });
  if (/Session id:/.test(body)) {
    throw new Error('us-478 AC3 no session id omits metadata line: metadata line present without a session id');
  }
  if (line(body, 'Command:').includes('--session-id')) {
    throw new Error('us-478 NS2 no session id omits metadata line: command still echoes --session-id');
  }
}

// AC4 + NS3: two runs sharing one slug report a run count distinct from the slug count.
{
  const { body } = proposal({
    sessionId: null,
    workflows: [{ slug: 'shared' }, { slug: 'shared' }],
  });
  const summary = line(body, 'actionable finding');
  if (!/across 2 run\(s\) \(1 distinct slug\(s\)\)/.test(summary)) {
    throw new Error(`us-478 AC4 summary labels run and slug units: ${JSON.stringify(summary)}`);
  }
  if (/across 1 run/.test(summary)) {
    throw new Error('us-478 NS3 shared slug uses run count: slug count reused as the run count');
  }
  if (!/1 actionable finding\(s\)/.test(summary)) {
    throw new Error(`us-478 AC4 summary labels run and slug units: finding count missing: ${JSON.stringify(summary)}`);
  }
}

// AC6: the anonymization checklist is ticked only when the body carries no identifier.
{
  const { body } = proposal({ sessionId: SESSION_ID, workflows: [{ slug: 'a' }] });
  const checklist = line(body, 'Body anonymized');
  if (!/^- \[x\]/.test(checklist)) {
    throw new Error(`us-478 AC6 checklist checked only when clean: ${JSON.stringify(checklist)}`);
  }
  if (body.includes(SESSION_ID)) {
    throw new Error('us-478 AC6 checklist checked only when clean: body still carries the session id');
  }
}

console.log('test-ws-monitor-us478: ok');
