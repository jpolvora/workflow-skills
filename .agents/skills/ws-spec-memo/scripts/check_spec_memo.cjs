#!/usr/bin/env node
/**
 * ws-spec-memo — read-only preflight / health check.
 * Usage: node check_spec_memo.cjs --repo-root <path> [--json]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  resolveConsumerContext,
  resolveConfiguredPath,
  resolveGlobalSkillsRoot,
  resolveMemoryRouting,
  toRepoRelative,
} = require('../../ws-shared/scripts/resolve_consumer_root.cjs');

const SCRIPT_FILE = __filename;

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

function pathExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function resolveWsMemoSkill(repoRoot) {
  const localSkillsRoot = path.join(repoRoot, '.agents', 'skills');
  const local = path.join(localSkillsRoot, 'ws-memo', 'SKILL.md');
  if (pathExists(local)) {
    return {
      installed: true,
      skillPath: toRepoRelative(repoRoot, local, { allowOutside: true }),
    };
  }
  const global = path.join(resolveGlobalSkillsRoot(), 'ws-memo', 'SKILL.md');
  if (pathExists(global)) {
    return { installed: true, skillPath: 'ws-memo/SKILL.md (global install)' };
  }
  return {
    installed: false,
    skillPath: '.agents/skills/ws-memo/SKILL.md',
    hint: 'Copy from spec-memo .agents/skills/ws-memo/ or install beside other ws-* skills; then use /ws-memo for runtime ops.',
  };
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

function scanPollution(repoRoot, sharedDirAbs, plansDirAbs) {
  const findings = [];
  const checks = [
    { abs: path.join(sharedDirAbs, 'MEMORY.md'), kind: 'memory-index' },
    { abs: path.join(sharedDirAbs, 'memory'), kind: 'memory-dir' },
    { abs: plansDirAbs, kind: 'plans-dir' },
  ];
  for (const c of checks) {
    if (!pathExists(c.abs)) continue;
    const rel = toRepoRelative(repoRoot, c.abs, { allowOutside: true });
    const stat = fs.statSync(c.abs);
    if (c.kind === 'plans-dir' && stat.isDirectory()) {
      const entries = fs.readdirSync(c.abs);
      if (entries.length > 0) findings.push({ path: rel, kind: c.kind, note: `${entries.length} entries` });
    } else if (c.kind === 'memory-dir' && stat.isDirectory()) {
      const entries = fs.readdirSync(c.abs).filter((e) => !e.startsWith('.'));
      if (entries.length > 0) findings.push({ path: rel, kind: c.kind, note: `${entries.length} entries` });
    } else if (c.kind === 'memory-index' && stat.isFile()) {
      const content = fs.readFileSync(c.abs, 'utf8');
      if (/^### \[/m.test(content)) {
        findings.push({ path: rel, kind: c.kind, note: 'compiled traps' });
      }
    }
  }
  return findings;
}

function runDoctor(cliCommand, repoRoot) {
  const parts = cliCommand.trim().split(/\s+/);
  const bin = parts[0];
  const binArgs = parts.slice(1);
  const run = spawnSync(bin, [...binArgs, 'doctor', '--json'], {
    encoding: 'utf8',
    cwd: repoRoot,
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
    `enableMemoryFiles: ${report.config.enableMemoryFiles}`,
    `enableSpecMemoIntegration: ${report.config.enableSpecMemoIntegration}`,
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
  if (report.config.enableSpecMemoIntegration && !report.config.enableMemoryFiles && report.pollution.length > 0) {
    lines.push('', 'Recommendation: run `/ws-spec-memo import` then `memo hook install` or `/ws-cleanup`.');
  }
  if (report.runtimeHandoff) {
    lines.push('', '## Runtime handoff (ws-memo)');
    lines.push(`- MCP server expected: ${report.runtimeHandoff.mcpServerName}`);
    lines.push(`- ws-memo skill: ${report.runtimeHandoff.wsMemo.installed ? 'installed' : 'missing'} (${report.runtimeHandoff.wsMemo.skillPath})`);
    if (report.runtimeHandoff.warnings.length > 0) {
      report.runtimeHandoff.warnings.forEach((w) => lines.push(`- Warning: ${w}`));
    }
  }
  console.log(lines.join('\n'));
}

function main() {
  const args = parseArgs(process.argv);
  const ctx = resolveConsumerContext({ repoRoot: args.repoRoot, scriptFile: SCRIPT_FILE });
  const repoRoot = ctx.repoRoot;
  const config = ctx.config || {};
  const specMemo = config.specMemo || {};
  const memoryRouting = resolveMemoryRouting(config);
  const plansDirAbs = resolveConfiguredPath(repoRoot, config.plans && config.plans.dir, '.agents/plans');

  const cli = detectCli(specMemo.cli);
  const doctor = cli.available
    ? runDoctor(specMemo.cli || 'memo', repoRoot)
    : { ok: false, error: 'CLI not available' };
  const pollution = scanPollution(repoRoot, ctx.sharedDir, plansDirAbs);
  const vaultReady = cli.available && doctor.ok;
  const vaultActive = memoryRouting.enableSpecMemoIntegration;
  const healthy = vaultActive ? vaultReady : true;

  const wsMemo = resolveWsMemoSkill(repoRoot);
  const mcpServerName = specMemo.mcpServerName || 'spec-memo';
  const runtimeWarnings = [];
  if (vaultActive) {
    if (!wsMemo.installed) {
      runtimeWarnings.push(
        'ws-memo skill not found — copy from spec-memo .agents/skills/ws-memo/; runtime ops use /ws-memo, not ws-spec-memo.',
      );
    }
    runtimeWarnings.push(
      `Register MCP server "${mcpServerName}" in the agent host (stdio: ${specMemo.cli || 'memo'} serve).`,
    );
  }

  const report = {
    ok: healthy,
    repoRoot,
    sharedDir: toRepoRelative(repoRoot, ctx.sharedDir, { allowOutside: true }),
    config: {
      enabled: specMemo.enabled === true,
      enableMemoryFiles: memoryRouting.enableMemoryFiles,
      enableSpecMemoIntegration: memoryRouting.enableSpecMemoIntegration,
      mode: memoryRouting.enableSpecMemoIntegration
        ? (memoryRouting.enableMemoryFiles ? 'hybrid' : (specMemo.mode || 'vault'))
        : (memoryRouting.enableMemoryFiles ? 'local' : 'disabled'),
      cli: specMemo.cli || 'memo',
      bootstrapOnSession: specMemo.bootstrapOnSession !== false,
      writeBlockHook: specMemo.writeBlockHook === true,
      mcpServerName,
    },
    cli,
    doctor,
    vault: { ok: doctor.ok, error: doctor.error || null },
    pollution,
    runtimeHandoff: vaultActive
      ? { mcpServerName, wsMemo, warnings: runtimeWarnings }
      : null,
    configPath: pathExists(ctx.configPath)
      ? toRepoRelative(repoRoot, ctx.configPath, { allowOutside: true })
      : null,
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printHuman(report);
  }

  if (!healthy) process.exit(1);
}

main();
