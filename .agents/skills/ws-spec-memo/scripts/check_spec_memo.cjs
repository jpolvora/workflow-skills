#!/usr/bin/env node
/**
 * ws-spec-memo — read-only preflight / health check.
 * Usage: node check_spec_memo.cjs --repo-root <path> [--json]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = { repoRoot: process.cwd(), json: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--repo-root') {
      args.repoRoot = argv[++i] || args.repoRoot;
    } else if (a === '--help' || a === '-h') {
      console.log('Usage: node check_spec_memo.cjs --repo-root <path> [--json]');
      process.exit(0);
    }
  }
  return args;
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function pathExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function detectCli(cliSetting) {
  const raw = (cliSetting || 'memo').trim();
  const parts = raw.split(/\s+/);
  const bin = parts[0];
  const binArgs = parts.slice(1);
  const probe = spawnSync(bin, [...binArgs, '--help'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return {
    command: raw,
    available: probe.status === 0 || (probe.stdout || '').includes('memo'),
    helpExit: probe.status,
  };
}

function scanPollution(repoRoot, sharedDir, plansDir) {
  const findings = [];
  const checks = [
    { rel: path.join(sharedDir, 'MEMORY.md'), kind: 'memory-index' },
    { rel: path.join(sharedDir, 'memory'), kind: 'memory-dir' },
    { rel: plansDir, kind: 'plans-dir' },
  ];
  for (const c of checks) {
    const abs = path.join(repoRoot, c.rel);
    if (pathExists(abs)) {
      const stat = fs.statSync(abs);
      if (c.kind === 'plans-dir' && stat.isDirectory()) {
        const entries = fs.readdirSync(abs);
        if (entries.length > 0) findings.push({ path: c.rel, kind: c.kind, note: `${entries.length} entries` });
      } else if (c.kind !== 'plans-dir') {
        findings.push({ path: c.rel, kind: c.kind, note: stat.isDirectory() ? 'directory' : 'file' });
      }
    }
  }
  return findings;
}

function runDoctor(cliCommand) {
  const parts = cliCommand.trim().split(/\s+/);
  const bin = parts[0];
  const binArgs = parts.slice(1);
  const run = spawnSync(bin, [...binArgs, 'doctor', '--json'], {
    encoding: 'utf8',
    cwd: process.cwd(),
    shell: process.platform === 'win32',
  });
  if (run.status !== 0) {
    return { ok: false, error: (run.stderr || run.stdout || '').trim().slice(0, 500) };
  }
  try {
    return { ok: true, data: JSON.parse(run.stdout) };
  } catch {
    return { ok: true, raw: (run.stdout || '').trim().slice(0, 2000) };
  }
}

function printHuman(report) {
  const lines = [
    '# ws-spec-memo check',
    '',
    `Repo: ${report.repoRoot}`,
    `specMemo.enabled: ${report.config.enabled}`,
    `specMemo.mode: ${report.config.mode}`,
    '',
    '## CLI',
    `- Command: ${report.cli.command}`,
    `- Available: ${report.cli.available ? 'yes' : 'no'}`,
    '',
    '## Vault doctor',
    report.doctor.ok ? '- OK' : `- Unavailable: ${report.doctor.error || 'unknown'}`,
    '',
    '## In-repo pollution (informational when vault disabled)',
  ];
  if (report.pollution.length === 0) lines.push('- none detected');
  else report.pollution.forEach((p) => lines.push(`- ${p.path} (${p.kind}) ${p.note || ''}`));
  if (report.config.enabled && report.pollution.length > 0) {
    lines.push('', 'Recommendation: run `/ws-spec-memo import` then `memo hook install` or `/ws-cleanup`.');
  }
  console.log(lines.join('\n'));
}

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(args.repoRoot);
  const sharedDir = '.agents/skills/ws-shared';
  const configPath = path.join(repoRoot, sharedDir, 'config.json');
  const config = readJsonSafe(configPath) || {};
  const specMemo = config.specMemo || {};
  const plansDir = (config.plans && config.plans.dir) || '.agents/plans';

  const cli = detectCli(specMemo.cli);
  const doctor = cli.available ? runDoctor(specMemo.cli || 'memo') : { ok: false, error: 'CLI not available' };
  const pollution = scanPollution(repoRoot, sharedDir, plansDir);

  const report = {
    ok: true,
    repoRoot,
    config: {
      enabled: specMemo.enabled === true,
      mode: specMemo.mode || 'vault',
      cli: specMemo.cli || 'memo',
      bootstrapOnSession: specMemo.bootstrapOnSession !== false,
      writeBlockHook: specMemo.writeBlockHook === true,
    },
    cli,
    doctor,
    pollution,
    configPath: pathExists(configPath) ? configPath : null,
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printHuman(report);
  }
}

main();
