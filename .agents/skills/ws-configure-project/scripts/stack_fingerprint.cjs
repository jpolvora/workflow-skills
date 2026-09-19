#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
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
const { resolveConsumerContext, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const MARKERS = [
  'package.json',
  'pyproject.toml',
  'requirements.txt',
  'go.mod',
  'Cargo.toml',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'global.json',
  'docker-compose.yml',
  'compose.yml',
];

function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) positional.push(argv[index]);
    else options[argv[index].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++index];
  }
  return { command: positional[0] || 'check', options };
}

function fingerprint(repoRoot) {
  const hash = crypto.createHash('sha256');
  const files = [];
  for (const marker of MARKERS) {
    const file = path.join(repoRoot, marker);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    const content = fs.readFileSync(file);
    hash.update(`${marker}\0${content.length}\0`);
    hash.update(content);
    files.push(marker);
  }
  return { value: hash.digest('hex'), files };
}

function frontmatter(text) {
  const match = text.replace(/\r\n?/g, '\n').match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: text.replace(/\r\n?/g, '\n') };
  const data = {};
  for (const line of match[1].split('\n')) {
    const split = line.indexOf(':');
    if (split > 0) data[line.slice(0, split).trim()] = line.slice(split + 1).trim();
  }
  return { data, body: text.replace(/\r\n?/g, '\n').slice(match[0].length) };
}

function write(file, data, body) {
  const content = `---\n${Object.entries(data).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}: ${value}`).join('\n')}\n---\n${body.replace(/^\n*/, '\n')}`;
  const temporary = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, content, 'utf8');
  fs.renameSync(temporary, file);
}

function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!['check', 'write'].includes(command)) throw new Error('command must be check or write');
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const configured = context.config?.rules?.stackFile || '.ws/STACK.md';
  const stackFile = path.resolve(context.repoRoot, options.stackFile || configured);
  const current = fingerprint(context.repoRoot);
  const parsed = fs.existsSync(stackFile) ? frontmatter(fs.readFileSync(stackFile, 'utf8')) : { data: {}, body: '# Stack\n' };
  const matches = parsed.data.stackFingerprint === current.value;
  if (command === 'write') {
    fs.mkdirSync(path.dirname(stackFile), { recursive: true });
    write(stackFile, { ...parsed.data, stackFingerprint: current.value, stackFingerprintVersion: 1 }, parsed.body);
  }
  process.stdout.write(`${JSON.stringify({
    command,
    stackPath: toRepoRelative(context.repoRoot, stackFile),
    fingerprint: current.value,
    markerFiles: current.files,
    matches,
    skipDetection: command === 'check' && matches,
  }, null, 2)}\n`);
  if (command === 'check' && !matches) process.exitCode = 2;
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
