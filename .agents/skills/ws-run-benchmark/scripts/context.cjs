#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function hasCli(dir) {
  return fs.existsSync(path.join(dir, 'scripts', 'harness-benchmark', 'cli.cjs'));
}

function findPackageRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (hasCli(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function parseArgs(argv) {
  const options = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
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

function fixtureMeta(fixturesRoot, fixtureId) {
  const oraclePath = path.join(fixturesRoot, fixtureId, 'oracle.json');
  const invertPath = path.join(fixturesRoot, fixtureId, 'invert.patch');
  const oracle = JSON.parse(fs.readFileSync(oraclePath, 'utf8'));
  return {
    id: fixtureId,
    orch: oracle.orch || 'lite',
    slug: oracle.slug || fixtureId.replace(/^fx-/, ''),
    size: oracle.size || '',
    hasSensor: fs.existsSync(invertPath) || oracle.sabotage === true,
  };
}

function emit(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = findPackageRoot(process.cwd());
  if (!repoRoot) {
    process.stderr.write('ERROR: cwd is not the workflow-skills package root (scripts/harness-benchmark/cli.cjs missing)\n');
    process.exitCode = 1;
    return;
  }

  const pathsLib = path.join(repoRoot, 'scripts', 'harness-benchmark', 'lib', 'paths.cjs');
  const { resolvePaths, listFixtureIds, loadOracle, loadPackageVersion } = require(pathsLib);
  const paths = resolvePaths({ repoRoot });
  const packageVersion = loadPackageVersion(paths.packageJsonPath);
  const fixtureIds = listFixtureIds(paths.fixturesRoot);

  if (options.check) {
    emit({ ok: true, repoRoot, packageVersion, fixtureCount: fixtureIds.length });
    return;
  }

  if (options.list) {
    emit({
      repoRoot,
      packageVersion,
      fixtures: fixtureIds.map((id) => fixtureMeta(paths.fixturesRoot, id)),
    });
    return;
  }

  const fixtureId = options.fixture || options._[0];
  if (!fixtureId) {
    process.stderr.write('ERROR: pass --check, --list, or --fixture <id>\n');
    process.exitCode = 1;
    return;
  }
  if (!fixtureIds.includes(fixtureId)) {
    process.stderr.write(`ERROR: unknown fixture ${fixtureId}\n`);
    process.exitCode = 1;
    return;
  }

  const oracle = loadOracle(paths.fixturesRoot, fixtureId);
  const orch = oracle.orch || 'lite';
  const orchSkill = orch === 'standard' ? 'ws-spec-to-pr' : 'ws-spec-to-pr-lite';
  const specFile = `${fixtureId}.spec.md`;
  const slug = oracle.slug || fixtureId.replace(/^fx-/, '');
  const sandbox = options.sandbox ? path.resolve(options.sandbox) : null;

  emit({
    repoRoot,
    packageVersion,
    fixtureId,
    orch,
    orchSkill,
    specFile,
    slug,
    size: oracle.size || '',
    hasSensor: fs.existsSync(path.join(paths.fixturesRoot, fixtureId, 'invert.patch')) || oracle.sabotage === true,
    snapshotName: `${packageVersion}-${fixtureId}-live`,
    cli: paths.cliScript,
    sandbox,
    prepareArgs: ['prepare', '--fixture', fixtureId],
    collectArgs: sandbox ? ['collect', '--sandbox', sandbox, '--fixture', fixtureId] : null,
  });
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
