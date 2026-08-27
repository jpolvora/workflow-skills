#!/usr/bin/env node
/**
 * ws-spec-memo — merge specMemo settings into consumer config.json.
 * Usage: node configure_spec_memo.cjs --repo-root <path> --apply [--json] [--stdin-json]
 *   Or: node configure_spec_memo.cjs --repo-root <path> --apply --enabled true --mode vault ...
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  resolveConsumerContext,
  toRepoRelative,
} = require('../../ws-shared/scripts/resolve_consumer_root.cjs');

const SCRIPT_FILE = __filename;
const ALLOWED_MODES = new Set(['vault', 'hybrid']);

function parseArgs(argv) {
  const args = {
    repoRoot: process.cwd(),
    apply: false,
    json: false,
    enabled: null,
    enableMemoryFiles: null,
    enableSpecMemoIntegration: null,
    mode: null,
    cli: null,
    importTree: null,
    hook: null,
    bootstrapOnSession: null,
    stdinJson: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--json') args.json = true;
    else if (a === '--stdin-json') args.stdinJson = true;
    else if (a === '--repo-root') args.repoRoot = argv[++i] || args.repoRoot;
    else if (a === '--enabled') args.enabled = argv[++i] === 'true';
    else if (a === '--enable-memory-files') args.enableMemoryFiles = argv[++i] === 'true';
    else if (a === '--enable-spec-memo' || a === '--enable-spec-memo-integration') {
      args.enableSpecMemoIntegration = argv[++i] === 'true';
    } else if (a === '--mode') args.mode = argv[++i];
    else if (a === '--cli') args.cli = argv[++i];
    else if (a === '--import') args.importTree = argv[++i] === 'true';
    else if (a === '--hook') args.hook = argv[++i] === 'true';
    else if (a === '--bootstrap-on-session') args.bootstrapOnSession = argv[++i] === 'true';
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node configure_spec_memo.cjs --repo-root <path> --apply [flags]');
      process.exit(0);
    }
  }
  return args;
}

function readStdinJson() {
  const raw = fs.readFileSync(0, 'utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error: invalid --stdin-json payload (${err.message})`);
    process.exit(2);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runCmd(command, cmdArgs, cwd) {
  const parts = command.trim().split(/\s+/);
  const bin = parts[0];
  const prefix = parts.slice(1);
  const run = spawnSync(bin, [...prefix, ...cmdArgs], {
    encoding: 'utf8',
    cwd,
    shell: process.platform === 'win32',
  });
  return { status: run.status, stdout: run.stdout || '', stderr: run.stderr || '' };
}

function cliAvailable(cliSetting) {
  const parts = (cliSetting || 'memo').trim().split(/\s+/);
  const probe = spawnSync(parts[0], [...parts.slice(1), '--help'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return probe.status === 0 || (probe.stdout || '').includes('memo');
}

function main() {
  const args = parseArgs(process.argv);
  const ctx = resolveConsumerContext({ repoRoot: args.repoRoot, scriptFile: SCRIPT_FILE });
  const repoRoot = ctx.repoRoot;
  const configPath = path.join(ctx.sharedDir, 'config.json');
  const examplePath = path.join(ctx.sharedDir, 'config.json.example');

  if (!fs.existsSync(configPath)) {
    if (!fs.existsSync(examplePath)) {
      console.error('Error: config.json and config.json.example missing. Run ws-configure-project first.');
      process.exit(2);
    }
    fs.copyFileSync(examplePath, configPath);
  }

  const stdin = args.stdinJson ? readStdinJson() : {};
  const config = readJson(configPath);
  const prev = config.specMemo || {};
  const specMemoParam = args.enableSpecMemoIntegration ?? stdin.enableSpecMemoIntegration;
  const memoryFilesParam = args.enableMemoryFiles ?? stdin.enableMemoryFiles;

  let nextSpecMemo = specMemoParam;
  if (nextSpecMemo === null || nextSpecMemo === undefined) {
    if (args.enabled !== null || stdin.enabled !== undefined) {
      nextSpecMemo = Boolean(args.enabled ?? stdin.enabled);
    } else {
      nextSpecMemo = prev.enableSpecMemoIntegration ?? (prev.enabled ?? false);
    }
  } else {
    nextSpecMemo = Boolean(nextSpecMemo);
  }

  let nextMemoryFiles = memoryFilesParam;
  if (nextMemoryFiles === null || nextMemoryFiles === undefined) {
    if (!nextSpecMemo && args.enableMemoryFiles === null && stdin.enableMemoryFiles === undefined) {
      // Disabling vault restores local markdown memory unless caller explicitly sets both backends off.
      nextMemoryFiles = true;
    } else if (args.mode || stdin.mode) {
      const explicitMode = args.mode ?? stdin.mode;
      if (!ALLOWED_MODES.has(explicitMode)) {
        console.error(`Error: specMemo.mode must be vault or hybrid (got: ${explicitMode})`);
        process.exit(2);
      }
      nextMemoryFiles = (explicitMode === 'hybrid');
    } else if (prev.enableMemoryFiles !== undefined) {
      nextMemoryFiles = Boolean(prev.enableMemoryFiles);
    } else if (prev.enabled && prev.mode === 'vault') {
      nextMemoryFiles = false;
    } else {
      nextMemoryFiles = true;
    }
  } else {
    nextMemoryFiles = Boolean(nextMemoryFiles);
  }

  const mode = args.mode ?? stdin.mode ?? (nextMemoryFiles ? 'hybrid' : 'vault');
  if (!ALLOWED_MODES.has(mode)) {
    console.error(`Error: specMemo.mode must be vault or hybrid (got: ${mode})`);
    process.exit(2);
  }

  const importSpecified = args.importTree !== null || stdin.import !== undefined;
  const doImport = importSpecified ? Boolean(args.importTree ?? stdin.import) : false;
  const doHook = args.hook ?? stdin.hook ?? false;
  // When enabling without an explicit import choice, record that import did not run.
  const importOnEnable = importSpecified
    ? doImport
    : nextSpecMemo
      ? false
      : (prev.importOnEnable ?? true);

  const next = {
    enabled: nextSpecMemo,
    enableMemoryFiles: nextMemoryFiles,
    enableSpecMemoIntegration: nextSpecMemo,
    mode: nextMemoryFiles ? 'hybrid' : 'vault',
    cli: args.cli ?? stdin.cli ?? prev.cli ?? 'memo',
    vaultRoot: stdin.vaultRoot ?? prev.vaultRoot ?? '',
    bootstrapOnSession:
      args.bootstrapOnSession ?? stdin.bootstrapOnSession ?? prev.bootstrapOnSession ?? true,
    writeBlockHook: prev.writeBlockHook ?? false,
    importOnEnable,
    mcpServerName: prev.mcpServerName ?? 'spec-memo',
  };

  const actions = [];

  if (!args.apply) {
    console.error('Error: pass --apply to write config');
    process.exit(2);
  }

  if (next.enabled && !cliAvailable(next.cli)) {
    console.error('Error: cannot enable specMemo vault — CLI unavailable');
    process.exit(2);
  }

  if (next.enabled && doImport) {
    const imp = runCmd(next.cli, ['import', '--from', repoRoot], repoRoot);
    actions.push({ action: 'import', status: imp.status, stdout: imp.stdout.slice(0, 500) });
    if (imp.status !== 0) {
      console.error(imp.stderr || imp.stdout);
      process.exit(imp.status || 1);
    }
  }

  if (next.enabled && doHook) {
    const hook = runCmd(next.cli, ['hook', 'install', '--productRoot', repoRoot], repoRoot);
    actions.push({ action: 'hook-install', status: hook.status });
    if (hook.status === 0) {
      next.writeBlockHook = true;
    }
  }

  config.specMemo = next;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const result = {
    ok: true,
    configPath: toRepoRelative(repoRoot, configPath, { allowOutside: true }),
    specMemo: next,
    actions,
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log('specMemo configuration updated:');
    console.log(JSON.stringify(next, null, 2));
    if (actions.length) console.log('Actions:', JSON.stringify(actions, null, 2));
  }
}

main();
