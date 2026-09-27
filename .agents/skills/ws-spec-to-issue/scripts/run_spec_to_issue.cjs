#!/usr/bin/env node
'use strict';

// ws-spec-to-issue: create an anonymized tracker item from a reformulated
// spec-shaped payload — without writing any local spec file or touching git.
//
// The agent reformulates the free text (ws-spec-write protocol) and anonymizes
// it, then this helper resolves the active tracker, runs the provider
// create-issue intent with the body passed through a transient --body-file
// (outside the repository, removed afterwards), and prints the created id + URL.
//
// Usage:
//   node run_spec_to_issue.cjs --title TITLE [--body-file FILE | --body TEXT]
//       [--label NAME]... [--type NAME] [--tracker github|azure-devops]
//       [--repo-root DIR] [--dry-run] [--allow-leaks]

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// Managed runtime loads from the skills installation (project-local
// <repo>/.agents/skills/ws-shared or the global tree). The project hub
// <repo>/.ws holds only local config.
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
    : path.join(os.homedir(), '.agents', 'skills');
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
const { resolveConsumerContext } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const GITHUB_TRACKER = 'github';
const ADO_TRACKER = 'azure-devops';

function printHelp() {
  console.log(`Usage: node run_spec_to_issue.cjs --title TITLE [--body-file FILE | --body TEXT] [options]

Create an anonymized tracker item (GitHub issue or ADO User Story) from a
reformulated spec-shaped payload. No local spec is written and git is untouched.

Options:
  --title TITLE        Tracker title (required)
  --body-file FILE     Payload body file (preferred; passed to the provider)
  --body TEXT          Payload body inline
  --label NAME         Label to apply (repeatable; GitHub)
  --type NAME          ADO work-item type (default "User Story")
  --tracker NAME       Force github | azure-devops (default: resolve from config)
  --repo-root DIR      Consumer repo root
  --dry-run            Print the resolved tracker, title, and body; create nothing
  --allow-leaks        Bypass the anonymization guard (records a warning)

Example:
  node run_spec_to_issue.cjs --title "Add export" --body-file payload.md --dry-run`);
}

function parseArgs(argv) {
  const options = {
    title: null, bodyFile: null, body: null, labels: [], type: 'User Story',
    tracker: null, repoRoot: null, dryRun: false, allowLeaks: false,
  };
  let hasTitle = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) {
        console.error(`argument ${arg}: expected one argument`);
        process.exit(2);
      }
      return value;
    };
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--title') {
      options.title = next();
      hasTitle = true;
    } else if (arg === '--body-file') options.bodyFile = next();
    else if (arg === '--body') options.body = next();
    else if (arg === '--label') options.labels.push(next());
    else if (arg === '--type') options.type = next();
    else if (arg === '--tracker') options.tracker = next();
    else if (arg === '--repo-root') options.repoRoot = next();
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--allow-leaks') options.allowLeaks = true;
    else if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq === -1) {
        console.error(`unknown argument: ${arg}`);
        process.exit(2);
      }
      const key = arg.slice(0, eq);
      const value = arg.slice(eq + 1);
      if (key === '--title') {
        options.title = value;
        hasTitle = true;
      } else if (key === '--body-file') options.bodyFile = value;
      else if (key === '--body') options.body = value;
      else if (key === '--label') options.labels.push(value);
      else if (key === '--type') options.type = value;
      else if (key === '--tracker') options.tracker = value;
      else if (key === '--repo-root') options.repoRoot = value;
      else {
        console.error(`unknown argument: ${arg}`);
        process.exit(2);
      }
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (!hasTitle || !String(options.title || '').trim()) {
    console.error('argument --title is required');
    process.exit(2);
  }
  return options;
}

function resolveTracker(config, override) {
  const explicit = String(override || '').trim().toLowerCase();
  if (explicit) {
    if (explicit !== GITHUB_TRACKER && explicit !== ADO_TRACKER) {
      throw new Error(`--tracker must be ${GITHUB_TRACKER} or ${ADO_TRACKER} (got "${override}")`);
    }
    return explicit;
  }
  const cfg = config || {};
  const active = String((cfg.providers && cfg.providers.active) || '').trim().toLowerCase();
  if (active === GITHUB_TRACKER || active === ADO_TRACKER) return active;
  const trackers = cfg.issueTrackers || {};
  if (trackers.github && trackers.github.enabled === true) return GITHUB_TRACKER;
  if (trackers.azureDevOps && trackers.azureDevOps.enabled === true) return ADO_TRACKER;
  const repoUrl = String((cfg.project && cfg.project.repoUrl) || '');
  if (/github\.com/i.test(repoUrl)) return GITHUB_TRACKER;
  if (/(?:dev\.azure\.com|visualstudio\.com)/i.test(repoUrl)) return ADO_TRACKER;
  throw new Error(
    'No active tracker: set providers.active to github|azure-devops, enable an issueTrackers entry, '
    + 'or set project.repoUrl (no local file was written).',
  );
}

function scanLeaks(text) {
  const patterns = [
    { id: 'absolute-windows-path', re: /[A-Za-z]:\\[^\s`"')]*/g },
    { id: 'absolute-posix-home-path', re: /(?:^|[\s(`"'])\/(?:Users|home)\/[^\s`"')]+/g },
    { id: 'unc-path', re: /\\\\[A-Za-z0-9._-]+\\[^\s`"')]*/g },
    { id: 'github-token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
    { id: 'pat-env-name', re: /\b(?:ADO_PAT|AZURE_DEVOPS_PAT)\b/g },
    { id: 'authorization-header', re: /\bAuthorization\s*:\s*\S+/gi },
    { id: 'bearer-token', re: /\bBearer\s+[A-Za-z0-9._-]{12,}/gi },
  ];
  const findings = [];
  for (const pattern of patterns) {
    const matches = String(text).match(pattern.re);
    if (matches && matches.length) {
      findings.push({ id: pattern.id, samples: matches.slice(0, 3) });
    }
  }
  return findings;
}

function providerScriptFor(context, tracker) {
  const skillId = tracker === GITHUB_TRACKER ? 'ws-spec-provider-github' : 'ws-spec-provider-azure-devops';
  const script = path.join(context.skillsRoot, skillId, 'scripts', 'create_issue.cjs');
  if (!fs.existsSync(script)) {
    throw new Error(`provider create-issue script not found for ${tracker}: ${script}`);
  }
  return script;
}

function parseProviderOutput(stdout) {
  const lines = String(stdout || '').trim().split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i]);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // keep scanning upward for a JSON line
    }
  }
  return null;
}

function readBody(args) {
  if (args.bodyFile) {
    return fs.readFileSync(args.bodyFile, 'utf8');
  }
  if (args.body !== null && args.body !== undefined) {
    return args.body;
  }
  throw new Error('Missing --body-file or --body');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  let context;
  try {
    context = resolveConsumerContext({ repoRoot: args.repoRoot, scriptFile: __filename });
  } catch (error) {
    console.error(String((error && error.message) || error));
    return 1;
  }
  if (context.configError) {
    console.error(context.configError);
    return 1;
  }

  let body;
  try {
    body = readBody(args);
  } catch (error) {
    console.error(String((error && error.message) || error));
    return 2;
  }

  let tracker;
  try {
    tracker = resolveTracker(context.config, args.tracker);
  } catch (error) {
    console.error(String((error && error.message) || error));
    return 2;
  }

  const title = args.title.trim();
  const type = String(args.type || 'User Story').trim() || 'User Story';
  const labels = args.labels.map((label) => String(label).trim()).filter(Boolean);

  const leaks = scanLeaks(`${title}\n${body}`);
  if (leaks.length && !args.allowLeaks) {
    console.error('Anonymization guard rejected the payload (absolute path or secret-shaped text):');
    for (const finding of leaks) {
      console.error(`  - ${finding.id}: ${finding.samples.join(' | ')}`);
    }
    console.error('Anonymize the payload and retry, or pass --allow-leaks to override.');
    return 2;
  }
  if (leaks.length && args.allowLeaks) {
    console.error(`warning: --allow-leaks overrides ${leaks.length} anonymization finding(s)`);
  }

  if (args.dryRun) {
    console.log(JSON.stringify({
      status: 'dry-run',
      provider: tracker,
      title,
      type: tracker === ADO_TRACKER ? type : null,
      labels,
      body: body.trim(),
    }, null, 2));
    return 0;
  }

  let providerScript;
  try {
    providerScript = providerScriptFor(context, tracker);
  } catch (error) {
    console.error(String((error && error.message) || error));
    return 1;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-to-issue-'));
  const tmpBody = path.join(tmpDir, 'payload.md');
  try {
    fs.writeFileSync(tmpBody, body, 'utf8');
    const providerArgs = tracker === GITHUB_TRACKER
      ? ['--title', title, '--body-file', tmpBody, ...labels.flatMap((label) => ['--label', label]), '--repo-root', context.repoRoot]
      : ['--title', title, '--body-file', tmpBody, '--type', type, '--repo-root', context.repoRoot];
    const proc = spawnSync(process.execPath, [providerScript, ...providerArgs], {
      cwd: context.repoRoot,
      encoding: 'utf8',
    });
    if ((proc.status ?? 1) !== 0) {
      console.error(String(proc.stderr || proc.stdout || 'provider create-issue failed').trim());
      return proc.status ?? 1;
    }
    const created = parseProviderOutput(proc.stdout) || {};
    console.log(JSON.stringify({
      status: 'ok',
      provider: tracker,
      title,
      number: created.number !== undefined ? created.number : null,
      id: created.id !== undefined ? created.id : null,
      url: created.url || null,
    }, null, 2));
    return 0;
  } finally {
    try {
      fs.unlinkSync(tmpBody);
      fs.rmdirSync(tmpDir);
    } catch {
      // Ignore cleanup failures.
    }
  }
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { parseArgs, resolveTracker, scanLeaks, parseProviderOutput };
