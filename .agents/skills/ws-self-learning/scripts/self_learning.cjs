#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  resolveConsumerContext,
  toRepoRelative,
} = require('../../ws-shared/scripts/resolve_consumer_root.cjs');

const FIELD_DEFS = [
  { key: 'layer', names: ['Layer'] },
  { key: 'module', names: ['Module'] },
  { key: 'severity', names: ['Severity'] },
  { key: 'pathPattern', names: ['PathPattern', 'Path Pattern', 'PathPatterns', 'Path', 'Paths'] },
  { key: 'scenario', names: ['Scenario / Context', 'Scenario/Context', 'Context', 'Scenario'] },
  { key: 'doNot', names: ['DO NOT', 'Do Not', 'DO_NOT', 'Trap Avoided'] },
  { key: 'instead', names: ['INSTEAD DO', 'Instead Do', 'INSTEAD_DO', 'Solution'] },
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--compile' || token === '-c') args.compile = true;
    else if (token === '--query' || token === '-q') args.query = argv[++i];
    else if (token === '--match-paths' || token === '-m') {
      args.matchPaths = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) args.matchPaths.push(argv[++i]);
    }     else if (token === '--repo-root') args.repoRoot = argv[++i];
    else if (token === '--help' || token === '-h') args.help = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  if (args.help) return args;
  if (![args.compile, args.query, args.matchPaths].filter(Boolean).length) {
    throw new Error('choose --compile, --query, or --match-paths');
  }
  return args;
}

function unwrapTicks(value) {
  return String(value || '').replace(/^`|`$/g, '');
}

function fieldLabelRe(names) {
  const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  // Accept both `- **Name**: value` and `- **Name:** value`.
  return new RegExp(`^- \\*\\*(?:${escaped})(?::\\*\\*|\\*\\*:)\\s*(.*)$`, 'i');
}

function parseFields(text) {
  const values = {
    layer: '',
    module: '',
    severity: '',
    pathPattern: '',
    scenario: '',
    doNot: '',
    instead: '',
  };
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    let matched = null;
    for (const def of FIELD_DEFS) {
      const hit = line.trim().match(fieldLabelRe(def.names));
      if (hit) {
        matched = { key: def.key, value: hit[1].trim() };
        break;
      }
    }
    if (matched) {
      current = matched.key;
      values[current] = matched.value;
      continue;
    }
    if (!line.trim()) {
      current = null;
      continue;
    }
    if (current && !line.startsWith('#') && !/^\s*[-*]\s/.test(line)) {
      values[current] = `${values[current]} ${line.trim()}`.trim();
    }
  }
  return values;
}

function emptyEntry(file, errors, text = '') {
  return {
    file: path.basename(file),
    date: '1970-01-01',
    title: path.basename(file, '.md'),
    layer: '',
    module: '',
    severity: '',
    pathPattern: '',
    scenario: '',
    doNot: '',
    instead: '',
    text,
    errors,
  };
}

function parseEntry(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  } catch (error) {
    return emptyEntry(file, [`unreadable (${error.message})`]);
  }
  const header = text.match(/^###\s+\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/m);
  const fields = parseFields(text);
  const errors = [];
  if (!header) errors.push('missing ### [YYYY-MM-DD] heading');
  if (!fields.doNot) errors.push('missing DO NOT (or Trap Avoided)');
  if (!fields.instead) errors.push('missing INSTEAD DO (or Solution)');
  return {
    file: path.basename(file),
    date: header?.[1] || '1970-01-01',
    title: header?.[2]?.trim() || path.basename(file, '.md'),
    layer: unwrapTicks(fields.layer),
    module: unwrapTicks(fields.module),
    severity: unwrapTicks(fields.severity),
    pathPattern: unwrapTicks(fields.pathPattern),
    scenario: fields.scenario,
    doNot: fields.doNot,
    instead: fields.instead,
    text,
    errors,
  };
}

function listMemoryFiles(memoryDir) {
  if (!fs.existsSync(memoryDir)) return [];
  return fs.readdirSync(memoryDir)
    .filter((name) => name.toLowerCase().endsWith('.md') && !name.startsWith('.'))
    .map((name) => path.join(memoryDir, name));
}

function entries(memoryDir) {
  return listMemoryFiles(memoryDir)
    .map((file) => parseEntry(file))
    .sort((a, b) => b.date.localeCompare(a.date) || b.title.localeCompare(a.title));
}

function compile(context, memoryDir, output) {
  fs.mkdirSync(memoryDir, { recursive: true });
  const loaded = entries(memoryDir);
  const invalid = loaded.filter((entry) => entry.errors.length);
  if (invalid.length) {
    for (const entry of invalid) {
      process.stderr.write(`ERROR: ${entry.file}: ${entry.errors.join('; ')}\n`);
    }
    throw new Error(`refusing to compile: ${invalid.length} invalid memory file(s)`);
  }
  const header = [
    '# Memory - Anti-Regression Knowledge',
    '',
    'This file is auto-generated by the `ws-self-learning` skill. DO NOT edit this file directly.',
    'To add new learnings, create a separate markdown file under `{sharedDir}/memory/` and run:',
    '  node {skillsRoot}/ws-self-learning/scripts/self_learning.cjs --compile',
    '',
    '---',
  ];
  const blocks = loaded.map((entry) => [
    `### [${entry.date}] ${entry.title}`,
    entry.layer && `- **Layer**: \`${entry.layer}\``,
    entry.module && `- **Module**: \`${entry.module}\``,
    entry.severity && `- **Severity**: \`${entry.severity}\``,
    entry.pathPattern && `- **PathPattern**: \`${entry.pathPattern}\``,
    entry.scenario && `- **Scenario / Context**: ${entry.scenario}`,
    entry.doNot && `- **DO NOT**: ${entry.doNot}`,
    entry.instead && `- **INSTEAD DO**: ${entry.instead}`,
  ].filter(Boolean).join('\n'));
  fs.writeFileSync(output, `${header.join('\n')}\n\n${blocks.join('\n\n')}\n`, 'utf8');
  process.stdout.write(`Compiled ${blocks.length} memory entries into ${toRepoRelative(context.repoRoot, output, { allowOutside: true })}\n`);
}

function globMatch(pattern, value) {
  const expression = pattern
    .replace(/\\/g, '/')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\0')
    .replace(/\*/g, '[^/]*')
    .replace(/\0/g, '.*');
  return new RegExp(`^${expression}$`, 'i').test(value);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('Usage: self_learning.cjs --compile | --query <text> | --match-paths <paths...> [--repo-root DIR]\n');
    return;
  }
  const context = resolveConsumerContext({ repoRoot: args.repoRoot, scriptFile: __filename, skillId: 'ws-self-learning' });
  const memoryDir = path.join(context.sharedDir, 'memory');
  const output = path.join(context.sharedDir, 'MEMORY.md');
  if (args.compile) return compile(context, memoryDir, output);

  const all = entries(memoryDir);
  const matches = args.query
    ? all.filter((entry) => entry.text.toLowerCase().includes(args.query.toLowerCase()))
    : all.filter((entry) => {
        const patterns = entry.pathPattern.split(/[,;]/).map((item) => item.trim().replace(/^`|`$/g, '')).filter(Boolean);
        return args.matchPaths.some((candidate) => patterns.some((pattern) => globMatch(pattern, candidate.replace(/\\/g, '/')) || candidate.includes(pattern)));
      });
  if (!matches.length) {
    process.stdout.write('No matching memory entries found.\n');
    return;
  }
  for (const entry of matches) {
    process.stdout.write(`[${entry.date}] ${entry.title} (${entry.file})\n`);
    process.stdout.write(`Severity=${entry.severity || 'unspecified'} PathPattern=${entry.pathPattern || 'n/a'}\n`);
    process.stdout.write(`DO NOT: ${entry.doNot || 'n/a'}\nINSTEAD DO: ${entry.instead || 'n/a'}\n`);
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
