/**
 * Consumer hub (.ws) layout and global-hybrid configure contract.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';
import { HUB_DEST_ALIASES, HUB_LAYOUT, HUB_WHITELIST, validateHubLayout } from '../bin/install-rules.js';
import { enumerateHubFiles } from '../bin/skill-integrity-lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sourceShared = path.join(repoRoot, '.agents', 'skills', 'ws-shared');
const tempRoots = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function copy(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function cleanup() {
  for (const root of tempRoots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

try {
  const validation = validateHubLayout();
  assert(validation.ok, validation.errors.join('; '));
  assert(HUB_WHITELIST.includes('runtime') && HUB_WHITELIST.includes('templates'), 'installer roots come from manifest');
  assert(
    HUB_DEST_ALIASES['templates/hub.gitignore'] === '.gitignore',
    'manifest destination alias installs hub.gitignore as .gitignore',
  );

  const hubFiles = enumerateHubFiles(sourceShared);
  assert(hubFiles['runtime/hub-layout.json'], 'integrity enumerates the layout manifest');
  assert(hubFiles['runtime/tools.md'], 'integrity enumerates runtime files');
  assert(hubFiles['templates/config.json.example'], 'integrity enumerates template files');
  assert(hubFiles['.gitignore'], 'integrity enumerates the aliased ignore file');
  assert(!hubFiles['templates/hub.gitignore'], 'integrity does not duplicate aliased source names');

  const globalRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-layout-global-'));
  const consumerRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-layout-consumer-'));
  const configureConsumerRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-layout-configure-consumer-'));
  tempRoots.push(globalRoot, consumerRoot, configureConsumerRoot);
  const globalShared = path.join(globalRoot, 'ws-shared');
  copy(
    path.join(sourceShared, 'runtime', 'scripts', 'resolve_consumer_root.cjs'),
    path.join(globalShared, 'runtime', 'scripts', 'resolve_consumer_root.cjs'),
  );
  copy(
    path.join(sourceShared, 'runtime', 'hub-layout.json'),
    path.join(globalShared, 'runtime', 'hub-layout.json'),
  );
  copy(
    path.join(sourceShared, 'runtime', 'config.schema.json'),
    path.join(globalShared, 'runtime', 'config.schema.json'),
  );
  copy(
    path.join(sourceShared, 'templates', 'config.json.example'),
    path.join(globalShared, 'templates', 'config.json.example'),
  );

  const resolver = cp.spawnSync(
    process.execPath,
    [
      '-e',
      `
        const resolver = require(${JSON.stringify(
          path.join(globalShared, 'runtime', 'scripts', 'resolve_consumer_root.cjs'),
        )});
        const context = resolver.resolveConsumerContext({
          repoRoot: ${JSON.stringify(consumerRoot)},
          scriptFile: ${JSON.stringify(path.join(globalRoot, 'ws-configure-project', 'scripts', 'auto_configure.cjs'))}
        });
        process.stdout.write(JSON.stringify({
          executionScope: context.executionScope,
          sharedDir: context.sharedDir,
          runtimeSource: context.runtimeSource,
          templateSource: context.templateSource,
          configSource: context.configSource
        }));
      `,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot },
    },
  );
  assert(resolver.status === 0, resolver.stderr || 'global resolver failed');
  const resolved = JSON.parse(resolver.stdout);
  assert(resolved.executionScope === 'global', 'global execution scope is reported');
  assert(resolved.sharedDir === path.join(consumerRoot, '.ws'), 'global execution targets consumer sharedDir');
  assert(resolved.runtimeSource === path.join(globalShared, 'runtime'), 'global runtime source is selected');
  assert(resolved.templateSource === path.join(globalShared, 'templates'), 'global template source is selected');
  assert(resolved.configSource === 'global', 'global template is the config fallback');

  const localConfig = path.join(consumerRoot, '.ws', 'config.json');
  fs.mkdirSync(path.dirname(localConfig), { recursive: true });
  fs.writeFileSync(localConfig, '{"project":{"name":"local"}}\n', 'utf8');
  const precedence = cp.spawnSync(
    process.execPath,
    [
      '-e',
      `
        const resolver = require(${JSON.stringify(
          path.join(globalShared, 'runtime', 'scripts', 'resolve_consumer_root.cjs'),
        )});
        const context = resolver.resolveConsumerContext({
          repoRoot: ${JSON.stringify(consumerRoot)},
          scriptFile: ${JSON.stringify(path.join(globalRoot, 'ws-configure-project', 'scripts', 'auto_configure.cjs'))}
        });
        process.stdout.write(JSON.stringify({ configSource: context.configSource, configPath: context.configPath }));
      `,
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot },
    },
  );
  assert(precedence.status === 0, precedence.stderr || 'local precedence resolver failed');
  const localResult = JSON.parse(precedence.stdout);
  assert(localResult.configSource === 'project', 'project config overrides global config fallback');
  assert(localResult.configPath === localConfig, 'resolver reports the project config path');

  const globalConfigureDir = path.join(globalRoot, 'ws-configure-project', 'scripts');
  copy(
    path.join(repoRoot, '.agents', 'skills', 'ws-configure-project', 'scripts', 'auto_configure.cjs'),
    path.join(globalConfigureDir, 'auto_configure.cjs'),
  );
  fs.writeFileSync(
    path.join(configureConsumerRoot, 'package.json'),
    JSON.stringify({ name: 'global-hybrid-consumer', scripts: { test: 'node --test' } }),
    'utf8',
  );
  const configure = cp.spawnSync(
    process.execPath,
    [path.join(globalConfigureDir, 'auto_configure.cjs'), '--repo-root', configureConsumerRoot, '--json'],
    {
      cwd: configureConsumerRoot,
      encoding: 'utf8',
      env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot },
    },
  );
  assert(
    configure.status === 0,
    `${configure.stderr || ''}${configure.stdout || ''}` || 'global configure failed',
  );
  const configureResult = JSON.parse(configure.stdout);
  assert(configureResult.executionScope === 'global', 'global configure reports global scope');
  assert(
    configureResult.copiedPaths.length === 1 &&
      configureResult.copiedPaths[0].endsWith('.ws/config.json'),
    'global configure reports only consumer config materialization',
  );
  const consumerShared = path.join(configureConsumerRoot, '.ws');
  assert(fs.existsSync(path.join(consumerShared, 'config.json')), 'global configure writes consumer config');
  assert(!fs.existsSync(path.join(consumerShared, 'runtime')), 'global configure does not copy runtime');
  assert(!fs.existsSync(path.join(consumerShared, 'templates')), 'global configure does not copy templates');
  assert(!fs.existsSync(path.join(consumerShared, 'MEMORY.md')), 'global configure does not create memory history');
  assert(
    configureResult.sourceControl.categories.some(
      (category) =>
        category.category === 'runtime' &&
        category.requiredToRun === true &&
        category.safeToOmit === true,
    ),
    'source-control report identifies managed runtime as required but safe to omit from commits',
  );

  const legacyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-layout-legacy-'));
  tempRoots.push(legacyRoot);
  const legacyShared = path.join(legacyRoot, '.agents', 'skills', 'ws-shared');
  const newShared = path.join(legacyRoot, '.ws');
  fs.mkdirSync(legacyShared, { recursive: true });
  const preserved = {
    'config.json': '{"toolsFile":"tools.md","project":{"name":"legacy-consumer"},"defaults":{"sessionLeases":true}}\n',
    'STACK.md': '# Legacy stack\n',
    'MEMORY.md': '# Legacy memory\n',
    'CHANGELOG.md': '# Legacy changelog\n',
  };
  for (const [name, content] of Object.entries(preserved)) {
    fs.writeFileSync(path.join(legacyShared, name), content, 'utf8');
  }
  fs.writeFileSync(path.join(legacyShared, 'tools.md'), '# legacy runtime\n', 'utf8');
  fs.writeFileSync(path.join(legacyShared, 'STACK.md.example'), '# legacy stack template\n', 'utf8');
  fs.writeFileSync(
    path.join(legacyShared, 'CATALOG.md.bak_20260907-1756'),
    '# stale hub backup\n',
    'utf8',
  );
  const install = cp.spawnSync(
    process.execPath,
    [path.join(repoRoot, 'bin', 'cli.js'), 'install', '--skills', 'ws-tdah', '--yes'],
    { cwd: legacyRoot, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' } },
  );
  assert(install.status === 0, `${install.stdout || ''}${install.stderr || ''}`);
  assert(!fs.existsSync(legacyShared), 'relocation removes the emptied legacy hub dir');
  assert(fs.existsSync(path.join(newShared, 'runtime', 'tools.md')), 'migration moves flat runtime files');
  assert(fs.existsSync(path.join(newShared, 'templates', 'config.json.example')), 'migration installs templates');
  assert(
    fs.existsSync(path.join(newShared, 'templates', 'STACK.md.example')),
    'migration moves STACK.md.example without case-alias ENOENT',
  );
  assert(!fs.existsSync(path.join(newShared, 'STACK.md.example')), 'migration removes legacy flat STACK.md.example');
  assert(!fs.existsSync(path.join(newShared, 'tools.md')), 'migration removes the legacy flat runtime file');
  assert(
    !fs.existsSync(path.join(newShared, 'CATALOG.md.bak_20260907-1756')),
    'migration prunes hub backup artifacts instead of failing',
  );
  assert(fs.existsSync(path.join(newShared, '.gitignore')), 'migration installs the aliased hub ignore file');
  const localPointer = fs.readFileSync(path.join(newShared, 'AGENTS.md'), 'utf8');
  assert(localPointer.includes('`runtime/AGENTS.md`'), 'local hub pointer links to the installed runtime contract');
  assert(
    !localPointer.includes('{globalSkillsRoot}/ws-shared/runtime/AGENTS.md'),
    'local hub pointer does not require a global-only runtime path',
  );
  const installedAutoload = fs.readFileSync(path.join(newShared, 'autoload.md'), 'utf8');
  assert(installedAutoload.includes('](runtime/tools.md)'), 'hub-root autoload rewrites runtime-relative hub links');
  assert(installedAutoload.includes('](../ws-spec-manager/SKILL.md)'), 'hub-root autoload rewrites skill-relative links');
  for (const [name, content] of Object.entries(preserved)) {
    if (name === 'config.json') {
      const cfg = JSON.parse(fs.readFileSync(path.join(newShared, name), 'utf8'));
      assert(cfg.project?.name === 'legacy-consumer', 'migration preserves consumer-owned config.json values');
      assert(cfg.toolsFile === 'runtime/tools.md', 'upgrade migrates legacy toolsFile');
      assert(cfg.$schema === './runtime/config.schema.json', 'upgrade normalizes $schema');
      assert(Boolean(cfg.pathTokens?.sharedDir), 'upgrade ensures pathTokens');
      assert(cfg.pathTokens?.sharedDir === '.ws', 'upgrade seeds pathTokens.sharedDir at the new hub root');
      assert(!('sessionLeases' in (cfg.defaults || {})), 'upgrade strips retired defaults keys');
      assert(fs.existsSync(path.join(newShared, 'config.json.bak')), 'migration creates config.json.bak');
      assert(
        fs.readFileSync(path.join(newShared, 'config.json.bak'), 'utf8') === content,
        'config.json.bak matches original pre-update content',
      );
    } else {
      assert(
        fs.readFileSync(path.join(newShared, name), 'utf8') === content,
        `migration preserves consumer-owned ${name}`,
      );
    }
  }
  fs.writeFileSync(path.join(newShared, '.gitignore'), '# stale gitignore\n', 'utf8');
  const secondInstall = cp.spawnSync(
    process.execPath,
    [path.join(repoRoot, 'bin', 'cli.js'), 'update', '--yes'],
    { cwd: legacyRoot, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' } },
  );
  assert(secondInstall.status === 0, `${secondInstall.stdout || ''}${secondInstall.stderr || ''}`);
  assert(!fs.existsSync(path.join(newShared, 'templates', 'hub.gitignore')), 'migration does not retain alias source');
  assert(
    fs.readFileSync(path.join(newShared, '.gitignore'), 'utf8').includes('config.json.bak'),
    'update refreshes managed .gitignore from template alias',
  );

  // us-351: collision (both legacy hub and .ws/ present) leaves both in place.
  const collisionRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-layout-collision-'));
  tempRoots.push(collisionRoot);
  const collisionLegacy = path.join(collisionRoot, '.agents', 'skills', 'ws-shared');
  const collisionNew = path.join(collisionRoot, '.ws');
  fs.mkdirSync(collisionLegacy, { recursive: true });
  fs.writeFileSync(path.join(collisionLegacy, 'config.json'), '{"project":{"name":"collision"}}\n', 'utf8');
  fs.mkdirSync(collisionNew, { recursive: true });
  fs.writeFileSync(path.join(collisionNew, 'config.json'), '{"project":{"name":"current"}}\n', 'utf8');
  const collisionInstall = cp.spawnSync(
    process.execPath,
    [path.join(repoRoot, 'bin', 'cli.js'), 'install', '--skills', 'ws-tdah', '--yes'],
    { cwd: collisionRoot, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' } },
  );
  assert(collisionInstall.status === 0, `${collisionInstall.stdout || ''}${collisionInstall.stderr || ''}`);
  assert(fs.existsSync(path.join(collisionLegacy, 'config.json')), 'collision leaves the legacy hub in place');
  assert(
    JSON.parse(fs.readFileSync(path.join(collisionNew, 'config.json'), 'utf8')).project?.name === 'current',
    'collision never overwrites the current .ws/ hub with legacy data',
  );

  console.log('test-ws-shared-layout: ok');
} finally {
  cleanup();
}
