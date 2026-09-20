#!/usr/bin/env node
'use strict';

// Upstream-only leakage gate for the consumer hub (spec 0066 AC7/AC8).
// Upstream mode: critical when the managed consumer hub reintroduces
// upstream authoring prose (denylisted phrases, upstream section headings,
// or a missing consumer identity banner). Consumer mode: same hub checks
// without requiring root AGENTS.md.

const fs = require('fs');
const path = require('path');

const SOT_HUB = ['.agents', 'skills', 'ws-shared', 'runtime', 'AGENTS.md'].join(path.sep);

// Instructional upstream-only phrases. One-line pointers that avoid these
// exact strings (e.g. "Package authoring (upstream source repo only)")
// keep passing; bodies that teach upstream workflows fail.
const DENYLIST = [
  'Upstream session contract',
  'Global vs local',
  'Skill SoT',
  'generate-integrity',
  'build-site:bump',
  'Upstream Maintainers',
  'Upstream developer workflow',
  'Before ship PR',
];

const BANNER_RE = /you are in the consumer hub/i;
const UPSTREAM_HEADING_RE = /^\s*#{1,6}\s+.*(session contract|global vs local|skill sot|before ship pr|upstream maintainers|upstream developer workflow|dogfood|generate-integrity|build-site:bump)/i;

function stripFences(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let fenced = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      out.push('');
      continue;
    }
    out.push(fenced ? '' : line);
  }
  return out;
}

function detectMode(repoRoot) {
  const markers = [path.join(repoRoot, 'bin', 'skill-dependencies.json'), path.join(repoRoot, 'bin', 'cli.js')];
  const skillsDir = path.join(repoRoot, '.agents', 'skills');
  const hasSoT =
    fs.existsSync(skillsDir) &&
    fs.readdirSync(skillsDir, { withFileTypes: true }).some(
      (entry) => entry.isDirectory() && entry.name !== 'ws-shared' && fs.existsSync(path.join(skillsDir, entry.name, 'SKILL.md')),
    );
  if (markers.every((file) => fs.existsSync(file)) && hasSoT) return 'upstream';
  return 'consumer';
}

function resolveConsumerHub(repoRoot, mode) {
  if (mode === 'upstream') return path.join(repoRoot, SOT_HUB);
  const globalRoot =
    process.env.WORKFLOW_SKILLS_GLOBAL_DIR ||
    path.join(process.env.HOME || process.env.USERPROFILE || '', '.agents', 'skills');
  // Mirror resolveHubSource / resolveConsumerContext: audit the effective runtime hub, not the thin pointer.
  const candidates = [
    path.join(repoRoot, '.ws', 'runtime', 'AGENTS.md'),
    path.join(repoRoot, '.agents', 'skills', 'ws-shared', 'runtime', 'AGENTS.md'),
    path.join(globalRoot, 'ws-shared', 'runtime', 'AGENTS.md'),
    path.join(repoRoot, '.ws', 'AGENTS.md'),
    path.join(globalRoot, 'ws-shared', 'AGENTS.md'),
  ];
  return candidates.find((file) => fs.existsSync(file)) || candidates[0];
}

function analyze(repoRoot, modeOverride) {
  const mode = modeOverride || detectMode(repoRoot);
  const hub = resolveConsumerHub(repoRoot, mode);
  const rel = path.relative(repoRoot, hub).replace(/\\/g, '/');
  const findings = [];
  if (!fs.existsSync(hub)) {
    if (mode === 'consumer') {
      findings.push({ severity: 'critical', file: rel, kind: 'hub-missing', message: 'effective consumer runtime hub not found' });
      return { ok: false, mode, hub: rel, total: findings.length, findings };
    }
    findings.push({ severity: 'warning', file: rel, kind: 'hub-missing', message: 'consumer hub not found; nothing to gate' });
    return { ok: true, mode, hub: rel, total: 0, findings };
  }
  const text = stripFences(fs.readFileSync(hub, 'utf8'));
  const lines = text.join('\n').split('\n');
  if (!BANNER_RE.test(text.join('\n'))) {
    findings.push({ severity: 'critical', file: rel, kind: 'missing-consumer-banner', message: 'consumer hub lacks an explicit consumer-identity banner' });
  }
  lines.forEach((line, index) => {
    if (UPSTREAM_HEADING_RE.test(line)) {
      findings.push({ severity: 'critical', file: rel, line: index + 1, kind: 'upstream-heading', message: line.trim().slice(0, 160) });
    }
    for (const phrase of DENYLIST) {
      if (line.includes(phrase)) {
        findings.push({ severity: 'critical', file: rel, line: index + 1, kind: 'upstream-phrase', phrase, message: line.trim().slice(0, 160) });
      }
    }
  });
  const critical = findings.filter((finding) => finding.severity === 'critical').length;
  return { ok: critical === 0, mode, hub: rel, total: findings.length, findings };
}

function main() {
  const argv = process.argv.slice(2);
  let json = false;
  let repoRoot = process.cwd();
  let mode = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--json') json = true;
    else if (argv[index] === '--repo-root') repoRoot = argv[++index];
    else if (argv[index] === '--mode') mode = argv[++index];
    else throw new Error(`unknown argument: ${argv[index]}`);
  }
  if (mode && mode !== 'upstream' && mode !== 'consumer') throw new Error(`unknown mode: ${mode}`);
  const report = analyze(path.resolve(repoRoot), mode);
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (report.ok) {
    process.stdout.write(`OK: hub separation clean (${report.mode}; ${report.hub})\n`);
  } else {
    for (const finding of report.findings) {
      process.stdout.write(`${finding.severity}: ${finding.file}${finding.line ? `:${finding.line}` : ''} [${finding.kind}] ${finding.message}\n`);
    }
  }
  process.exitCode = report.ok ? 0 : 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
