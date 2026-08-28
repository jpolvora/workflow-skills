'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { resolvePaths, loadOracle } = require('./paths.cjs');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function prepareSandbox(options = {}) {
  const paths = resolvePaths(options);
  if (!options.fixture) throw new Error('prepare requires --fixture <id>');

  const oracle = loadOracle(paths.fixturesRoot, options.fixture);
  const sandboxRoot = options.sandbox || fs.mkdtempSync(path.join(
    options.sandboxRoot || os.tmpdir(),
    `hb-sandbox-${options.fixture}-`,
  ));

  if (fs.existsSync(paths.templateRoot)) {
    copyDir(paths.templateRoot, sandboxRoot);
  } else {
    fs.mkdirSync(sandboxRoot, { recursive: true });
  }

  const sandboxContext = require('../../../.agents/skills/ws-shared/scripts/resolve_consumer_root.cjs')
    .resolveConsumerContext({ repoRoot: sandboxRoot });
  const specsDir = require('../../../.agents/skills/ws-shared/scripts/resolve_consumer_root.cjs')
    .resolveConfiguredPath(sandboxRoot, sandboxContext.config?.plans?.specsDir, '.agents/specs');
  fs.mkdirSync(specsDir, { recursive: true });

  const specSrc = path.join(paths.fixturesRoot, options.fixture, 'spec.md');
  fs.copyFileSync(specSrc, path.join(specsDir, `${options.fixture}.spec.md`));

  const hubConfigPath = path.join(sandboxRoot, '.agents/skills/ws-shared/config.json');
  if (fs.existsSync(hubConfigPath)) {
    const config = JSON.parse(fs.readFileSync(hubConfigPath, 'utf8'));
    config.defaults = { ...(config.defaults || {}), dryRun: true, autoMode: true };
    fs.writeFileSync(hubConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  }

  if (options.install) {
    const install = spawnSync(process.execPath, [
      path.join(paths.repoRoot, 'bin/cli.js'),
      'install', '--project', sandboxRoot, '--yes',
    ], { cwd: paths.repoRoot, encoding: 'utf8' });
    if (install.status !== 0) throw new Error(`install failed: ${install.stderr}`);
  } else {
    const skillsDest = path.join(sandboxRoot, '.agents/skills');
    fs.mkdirSync(skillsDest, { recursive: true });
    copyDir(paths.context.skillsRoot, skillsDest);
  }

  const orchCmd = (oracle.orch || 'lite') === 'standard'
    ? `ws-spec-to-pr ${options.fixture}.spec.md`
    : `ws-spec-to-pr-lite ${options.fixture}.spec.md`;

  const collectCmd = `node ${paths.cliScript} collect --sandbox ${sandboxRoot} --fixture ${options.fixture}`;
  const runMd = [
    '# Harness benchmark live run',
    '',
    `Fixture: \`${options.fixture}\``,
    `Orch: \`${orchCmd}\``,
    'dryRun: true',
    'autoMode: true',
    '',
    '## Steps',
    '',
    '1. Run the orch command in this sandbox (host session).',
    `2. When finished, run: \`${collectCmd}\``,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(sandboxRoot, 'RUN.md'), runMd, 'utf8');

  return { sandboxRoot, runMd, collectCmd, oracle, paths };
}

module.exports = { prepareSandbox, copyDir };
