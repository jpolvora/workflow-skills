#!/usr/bin/env node
/**
 * ws-spec-memo — merge specMemo settings into consumer config.json.
 * Usage: node configure_spec_memo.cjs --repo-root <path> --apply [--json] [--stdin-json]
 *   Or: node configure_spec_memo.cjs --repo-root <path> --apply --enabled true --mode vault ...
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = {
    repoRoot: process.cwd(),
    apply: false,
    json: false,
    enabled: null,
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
    else if (a === '--mode') args.mode = argv[++i];
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
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
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

function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(args.repoRoot);
  const sharedDir = path.join(repoRoot, '.agents/skills/ws-shared');
  const configPath = path.join(sharedDir, 'config.json');
  const examplePath = path.join(sharedDir, 'config.json.example');

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

  const next = {
    enabled: args.enabled ?? stdin.enabled ?? prev.enabled ?? false,
    mode: args.mode ?? stdin.mode ?? prev.mode ?? 'vault',
    cli: args.cli ?? stdin.cli ?? prev.cli ?? 'memo',
    vaultRoot: stdin.vaultRoot ?? prev.vaultRoot ?? '',
    bootstrapOnSession:
      args.bootstrapOnSession ?? stdin.bootstrapOnSession ?? prev.bootstrapOnSession ?? true,
    writeBlockHook: prev.writeBlockHook ?? false,
    importOnEnable: prev.importOnEnable ?? true,
    mcpServerName: prev.mcpServerName ?? 'spec-memo',
  };

  const doImport = args.importTree ?? stdin.import ?? false;
  const doHook = args.hook ?? stdin.hook ?? false;
  const actions = [];

  if (!args.apply) {
    console.error('Error: pass --apply to write config');
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
    next.writeBlockHook = hook.status === 0;
  }

  config.specMemo = next;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  const result = {
    ok: true,
    configPath,
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
