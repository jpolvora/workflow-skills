#!/usr/bin/env node
'use strict';

const { runStatic } = require('./lib/static-run.cjs');
const { prepareSandbox } = require('./lib/prepare-sandbox.cjs');
const { collectRun } = require('./lib/collect-run.cjs');
const { snapshotRun } = require('./lib/snapshot.cjs');
const { compareReports } = require('./lib/compare.cjs');

const HELP = `Harness benchmark CLI (upstream maintainer only)

Usage:
  node scripts/harness-benchmark/cli.cjs <command> [options]

Commands:
  run       Execute a benchmark run
  prepare   Create an isolated sandbox for live orch
  collect   Collect live run evidence from a sandbox
  snapshot  Promote a run report to a named baseline
  compare   Compare two reports or baselines

Global flags:
  --help    Show this help

run:
  --mode <static|live>     Run mode (required)
  --fixture <id>           Limit to one fixture (static) or target fixture (live)
  --collect-only           Live mode: skip prepare when sandbox exists
  --sandbox <path>         Sandbox path (live collect-only)
  --install                prepare: use bin/cli.js install instead of skills copy

prepare:
  --fixture <id>           Fixture id (required)
  --sandbox-root <dir>     Parent directory for temp sandbox
  --install                Tarball-fidelity install into sandbox

collect:
  --sandbox <path>         Sandbox root (required)
  --fixture <id>           Fixture id (required)

snapshot:
  --run <runId>            Run id under benchmarks/runs/
  --name <label>           Baseline filename (required)
  --from <report.json>     Alternative report source

compare:
  --from <baseline|report> Baseline label or path (required)
  --to <baseline|report>   Target report (required)
  --fail-if <file.json>    Extra failIf rules
  --allow-regression       Skip index/verifyScore regression thresholds
  --record-lessons         Write MEMORY trap on regression (default off)
`;

function parseArgs(argv) {
  const options = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i += 1;
      } else {
        options[key] = true;
      }
    } else {
      options._.push(arg);
    }
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options._.length) {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  const command = options._[0];
  if (command === 'run') {
    const mode = options.mode;
    if (!mode) throw new Error('run requires --mode static|live');
    if (mode === 'static') {
      const result = runStatic({ fixture: options.fixture, repoRoot: options.repoRoot });
      process.stdout.write(`static run complete: ${result.runId} (${result.results.length} fixtures)\n`);
      for (const item of result.results) {
        process.stdout.write(`  ${item.outputDir}\n`);
      }
      return;
    }
    if (mode === 'live') {
      if (options.collectOnly) {
        if (!options.sandbox || !options.fixture) throw new Error('live --collect-only requires --sandbox and --fixture');
        const collected = collectRun({ sandbox: options.sandbox, fixture: options.fixture });
        process.stdout.write(`collect complete: ${collected.outputDir}\n`);
        return;
      }
      if (!options.fixture) throw new Error('live run requires --fixture');
      const prepared = prepareSandbox({
        fixture: options.fixture,
        install: options.install === true,
        sandboxRoot: options.sandboxRoot,
      });
      process.stdout.write(`Sandbox: ${prepared.sandboxRoot}\n`);
      process.stdout.write(`${prepared.runMd}\n`);
      process.stdout.write(`Next: ${prepared.collectCmd}\n`);
      return;
    }
    throw new Error(`unknown mode: ${mode}`);
  }

  if (command === 'prepare') {
    const prepared = prepareSandbox({
      fixture: options.fixture,
      install: options.install === true,
      sandboxRoot: options.sandboxRoot,
      sandbox: options.sandbox,
    });
    process.stdout.write(`Sandbox: ${prepared.sandboxRoot}\n`);
    process.stdout.write(`RUN.md written with dryRun: true\n`);
    return;
  }

  if (command === 'collect') {
    const collected = collectRun({
      sandbox: options.sandbox,
      fixture: options.fixture,
    });
    process.stdout.write(`collect complete: ${collected.outputDir}\n`);
    return;
  }

  if (command === 'snapshot') {
    const snap = snapshotRun({
      run: options.run,
      from: options.from,
      name: options.name,
    });
    process.stdout.write(`baseline written: ${snap.outPath}\n`);
    return;
  }

  if (command === 'compare') {
    const result = compareReports({
      from: options.from,
      to: options.to,
      failIf: options.failIf,
      allowRegression: options.allowRegression === true,
      recordLessons: options.recordLessons === true,
    });
    if (!result.ok) process.exitCode = 1;
    return;
  }

  throw new Error(`unknown command: ${command}`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
