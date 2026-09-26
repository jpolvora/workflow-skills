#!/usr/bin/env node
'use strict';

// append_changelog.cjs — idempotent changelog entry writer for ws-changelog.
//
// Inserts one `### [date] Agent:` entry block directly under the `# Changelog`
// header of the resolved changelog file. Re-running with the identical
// Prompt/Done/Result block is a no-op (exact-block dedupe); past entries are
// never rewritten or reordered, so concurrent writers only ever prepend their
// own entry above foreign ones.
//
// Usage: node append_changelog.cjs --prompt <text> --done <text> --result <text>
//   [--agent <id>] [--date <YYYY-MM-DD HH:MM>] [--repo-root <dir>] [--json]

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
  const candidates = [];
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
  candidates.push(packaged);
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

function parseArgs(argv) {
  const options = { agent: null, date: null, repoRoot: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      process.stdout.write('Usage: append_changelog.cjs --prompt <text> --done <text> --result <text> [--agent <id>] [--date <YYYY-MM-DD HH:MM>] [--repo-root <dir>] [--json]\n');
      process.exit(0);
    } else if (arg === '--prompt') options.prompt = argv[++index];
    else if (arg === '--done') options.done = argv[++index];
    else if (arg === '--result') options.result = argv[++index];
    else if (arg === '--agent') options.agent = argv[++index];
    else if (arg === '--date') options.date = argv[++index];
    else if (arg === '--repo-root') options.repoRoot = argv[++index];
    else if (arg === '--json') options.json = true;
    else if (arg.startsWith('--prompt=')) options.prompt = arg.slice('--prompt='.length);
    else if (arg.startsWith('--done=')) options.done = arg.slice('--done='.length);
    else if (arg.startsWith('--result=')) options.result = arg.slice('--result='.length);
    else if (arg.startsWith('--agent=')) options.agent = arg.slice('--agent='.length);
    else if (arg.startsWith('--date=')) options.date = arg.slice('--date='.length);
    else if (arg.startsWith('--repo-root=')) options.repoRoot = arg.slice('--repo-root='.length);
    else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  for (const key of ['prompt', 'done', 'result']) {
    if (options[key] == null || String(options[key]).trim() === '') {
      throw new Error(`missing required --${key}`);
    }
  }
  return options;
}

function resolveChangelogFile(context) {
  const config = context.config || {};
  const configured = config.rules && typeof config.rules.changelogFile === 'string'
    && config.rules.changelogFile.trim()
    ? config.rules.changelogFile.trim()
    : 'CHANGELOG.md';
  const configuredAbs = path.resolve(context.repoRoot, configured);
  let configuredHasEntries = false;
  if (fs.existsSync(configuredAbs)) {
    configuredHasEntries = /^### \[/m.test(fs.readFileSync(configuredAbs, 'utf8'));
  }
  if (!configuredHasEntries) {
    // Legacy fallback lives under the resolved hub root (relocatable via
    // pathTokens.sharedDir), never a hardcoded '.ws'.
    const legacyAbs = path.join(context.sharedDir, 'CHANGELOG.md');
    if (fs.existsSync(legacyAbs) && /^### \[/m.test(fs.readFileSync(legacyAbs, 'utf8'))) {
      return legacyAbs;
    }
  }
  return configuredAbs;
}

function oneLine(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function appendChangelog(options) {
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const file = resolveChangelogFile(context);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const stamp = options.date && String(options.date).trim()
    ? String(options.date).trim()
    : (() => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    })();
  const agent = options.agent && String(options.agent).trim() ? String(options.agent).trim() : 'agent';
  const block = [
    `### [${stamp}] Agent: ${agent}`,
    `- **Prompt**: ${oneLine(options.prompt)}`,
    `- **Done**: ${oneLine(options.done)}`,
    `- **Result**: ${oneLine(options.result)}`,
  ].join('\n');

  let existing = '';
  if (fs.existsSync(file)) existing = fs.readFileSync(file, 'utf8');
  // Exact-block dedupe: the same Prompt/Done/Result body already recorded.
  const body = block.split('\n').slice(1).join('\n');
  const escaped = body.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(escaped.replace(/\n/g, '\\r?\\n')).test(existing)) {
    return { ok: true, skipped: 'duplicate-block', file: toRepoRelative(context.repoRoot, file) };
  }
  // Preserve the file's dominant line ending: a CRLF worktree file must not be
  // rewritten to LF on append. Build with LF, then re-emit the original EOL.
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  let nextLf;
  if (!existing) {
    nextLf = `# Changelog\n\n${block}\n`;
  } else {
    const lines = existing.split(/\r?\n/);
    const headerIndex = lines.findIndex((line) => /^# Changelog\s*$/.test(line));
    if (headerIndex === -1) {
      nextLf = `# Changelog\n\n${block}\n\n${lines.join('\n').trimEnd()}\n`;
    } else {
      lines.splice(headerIndex + 1, 0, '', block);
      nextLf = `${lines.join('\n').trimEnd()}\n`;
    }
  }
  const next = eol === '\n' ? nextLf : nextLf.replace(/\n/g, eol);
  // Atomic write so a concurrent reader never sees a torn file.
  const tempFile = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempFile, next, 'utf8');
  fs.renameSync(tempFile, file);
  return { ok: true, file: toRepoRelative(context.repoRoot, file) };
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = appendChangelog(options);
    if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
    else if (result.skipped) process.stdout.write(`changelog: skipped (${result.skipped})\n`);
    else process.stdout.write(`changelog: appended to ${result.file}\n`);
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exit(error.message.startsWith('unknown argument') || error.message.startsWith('missing required') ? 2 : 1);
  }
}

module.exports = { appendChangelog };
