#!/usr/bin/env node
/**
 * ws-spec-memo — read-only preflight / health check.
 * Usage: node check_spec_memo.cjs --repo-root <path> [--json]
 */

const fs = require('fs');
const path = require('path');
// Managed runtime loads from its skills installation: the project-local
// skills tree ({skillsRoot}/ws-shared) or the global skills tree
// ({globalSkillsRoot}/ws-shared, override via WORKFLOW_SKILLS_GLOBAL_DIR).
// An explicit WORKFLOW_SKILLS_SHARED_DIR selects the shared hub root
// (<hub>/runtime/scripts is used). The project consumer hub (<repo>/.ws)
// holds only local config variable files (config.json, STACK.md, memory,
// changelog) and is not a managed-runtime source.
const HUB_SCRIPTS_DIR = (() => {
  const packaged = path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'scripts');
  const candidates = [packaged];
  const explicitShared = process.env.WORKFLOW_SKILLS_SHARED_DIR;
  if (explicitShared && String(explicitShared).trim()) {
    candidates.unshift(path.join(path.resolve(String(explicitShared).trim()), 'runtime', 'scripts'));
  }
  try {
    candidates.push(path.resolve(process.cwd(), '.agents', 'skills', 'ws-shared', 'runtime', 'scripts'));
  } catch {
    // Ignore cwd resolution failures; remaining candidates still apply.
  }
  const globalDir = process.env.WORKFLOW_SKILLS_GLOBAL_DIR;
  const globalRoot = globalDir && String(globalDir).trim()
    ? path.resolve(String(globalDir).trim())
    : path.join(require('os').homedir(), '.agents', 'skills');
  candidates.push(path.join(globalRoot, 'ws-shared', 'runtime', 'scripts'));
  for (const candidate of [...new Set(candidates)]) {
    try {
      require.resolve(path.join(candidate, 'resolve_consumer_root.cjs'));
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return packaged;
})();
const { spawnSync } = require('child_process');
const { spawnCliSync } = require(path.join(HUB_SCRIPTS_DIR, 'cli_spawn.cjs'));
const {
  resolveConsumerContext,
  resolveConfiguredPath,
  resolveGlobalSkillsRoot,
  resolveMemoryPaths,
  resolveMemoryRouting,
  toRepoRelative,
} = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

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

function resolveSpecMemoRuntimeSkill(repoRoot, skillId) {
  const localSkillsRoot = path.join(repoRoot, '.agents', 'skills');
  const local = path.join(localSkillsRoot, skillId, 'SKILL.md');
  if (pathExists(local)) {
    return {
      installed: true,
      skillPath: toRepoRelative(repoRoot, local, { allowOutside: true }),
    };
  }
  const global = path.join(resolveGlobalSkillsRoot(), skillId, 'SKILL.md');
  if (pathExists(global)) {
    return { installed: true, skillPath: `${skillId}/SKILL.md (global install)` };
  }
  const hintById = {
    'ws-memo':
      'Load /ws-memo (spec-memo package). If missing: /ws-memo install_skills (global or product) or copy from spec-memo .agents/skills/ws-memo/; then use /ws-memo for vault memory ops.',
    'ws-session-tracking':
      'Load /ws-session-tracking (spec-memo package). install_skills defaults include it with ws-memo; use for prompt/session/activity via MCP prompt — not ws-activity-report plan timesheets.',
  };
  return {
    installed: false,
    skillPath: `.agents/skills/${skillId}/SKILL.md`,
    hint: hintById[skillId] || `Load /${skillId} from the spec-memo package (install_skills).`,
  };
}

function detectCli(cliSetting) {
  const raw = (cliSetting || 'memo').trim();
  const parts = raw.split(/\s+/);
  const bin = parts[0];
  const binArgs = parts.slice(1);
  const probe = spawnCliSync(bin, [...binArgs, '--help'], {
    encoding: 'utf8',
  });
  return {
    command: raw,
    available: probe.status === 0 || (probe.stdout || '').includes('memo'),
    helpExit: probe.status,
  };
}

function scanPollution(repoRoot, memoryLocations, plansDirAbs) {
  const findings = [];
  const checks = [
    ...memoryLocations.flatMap((loc) => [
      { abs: loc.indexFile, kind: 'memory-index' },
      { abs: loc.entriesDir, kind: 'memory-dir' },
    ]),
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
  const run = spawnCliSync(bin, [...binArgs, 'doctor', '--json'], {
    encoding: 'utf8',
    cwd: repoRoot,
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
    lines.push('', '## Runtime handoff (spec-memo skills)');
    lines.push(`- MCP server expected: ${report.runtimeHandoff.mcpServerName}`);
    lines.push(`- ws-memo skill: ${report.runtimeHandoff.wsMemo.installed ? 'installed' : 'missing'} (${report.runtimeHandoff.wsMemo.skillPath})`);
    lines.push(
      `- ws-session-tracking skill: ${report.runtimeHandoff.wsSessionTracking.installed ? 'installed' : 'missing'} (${report.runtimeHandoff.wsSessionTracking.skillPath})`,
    );
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
  const memoryPaths = resolveMemoryPaths({ repoRoot, sharedDir: ctx.sharedDir, config });
  const memoryLocations = memoryPaths.dir === memoryPaths.legacyDir
    ? [{ indexFile: memoryPaths.indexFile, entriesDir: memoryPaths.entriesDir }]
    : [
        { indexFile: memoryPaths.indexFile, entriesDir: memoryPaths.entriesDir },
        { indexFile: memoryPaths.legacyIndexFile, entriesDir: memoryPaths.legacyEntriesDir },
      ];
  const pollution = scanPollution(repoRoot, memoryLocations, plansDirAbs);
  const vaultReady = cli.available && doctor.ok;
  const vaultActive = memoryRouting.enableSpecMemoIntegration;
  const healthy = vaultActive ? vaultReady : true;

  const wsMemo = resolveSpecMemoRuntimeSkill(repoRoot, 'ws-memo');
  const wsSessionTracking = resolveSpecMemoRuntimeSkill(repoRoot, 'ws-session-tracking');
  const mcpServerName = specMemo.mcpServerName || 'spec-memo';
  const runtimeWarnings = [];
  if (vaultActive) {
    if (!wsMemo.installed) {
      runtimeWarnings.push(
        'ws-memo skill not found — load /ws-memo install_skills (or copy from spec-memo .agents/skills/ws-memo/); vault memory ops use /ws-memo, not ws-spec-memo.',
      );
    }
    if (!wsSessionTracking.installed) {
      runtimeWarnings.push(
        'ws-session-tracking skill not found — /ws-memo install_skills installs it with ws-memo; use for prompt/session/activity (MCP prompt). Plan-folder Spec-to-PR timesheets stay on ws-activity-report.',
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
      ? { mcpServerName, wsMemo, wsSessionTracking, warnings: runtimeWarnings }
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
