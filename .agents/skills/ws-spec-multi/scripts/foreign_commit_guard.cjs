#!/usr/bin/env node
'use strict';

/**
 * foreign_commit_guard.cjs — executable, batch-owned guard for shared-head
 * multi-spec runs where every worker ships from one branch.
 *
 * The batch records a per-dispatch baseline of the local and remote run-branch
 * tips, then compares the next dispatch against it. An unexpected advance names
 * the new commits so the master can pause (Resume / Skip / Abort) instead of
 * silently sweeping a foreign commit into the next item's PR range. At delivery
 * convergence it refuses a merge whose PR head differs from the local tip, and it
 * lists the foreign commits that ride a PR range for the PR body and audit notes.
 *
 * The guard only reads git refs. Its single write is the baseline sidecar under
 * the run's plan folder (`{plansDir}/{runId}/foreign-commits.json`). It never
 * stages, commits, pushes, resets, checks out, or cleans anything.
 *
 * Usage:
 *   node foreign_commit_guard.cjs record-baseline --run {runId}.state.md [--slug S] [--branch B] [--repo DIR] [--json]
 *   node foreign_commit_guard.cjs check-advance   --run {runId}.state.md [--slug S] [--branch B] [--repo DIR] [--json]
 *   node foreign_commit_guard.cjs check-convergence --pr-head SHA --local-tip SHA [--repo DIR] [--json]
 *   node foreign_commit_guard.cjs list-foreign --base SHA --head SHA [--own SHA,SHA] [--repo DIR] [--markdown] [--json]
 *
 * Exit codes: 0 ok/quiet/converged · 1 advance detected / mismatch (pause or refuse)
 *             2 usage error or missing baseline (fail closed).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCHEMA_VERSION = 1;
const BASELINE_NAME = 'foreign-commits.json';

function parseArgs(argv) {
  const options = {};
  const booleans = new Set(['json', 'markdown']);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
    if (booleans.has(key)) { options[key] = true; continue; }
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) throw new Error(`--${token.slice(2)} requires a value`);
    options[key] = next;
    index += 1;
  }
  return options;
}

function emit(ok, payload, options, code) {
  if (options.json) process.stdout.write(`${JSON.stringify({ ok, ...payload })}\n`);
  else if (ok) process.stdout.write(`${payload.message || payload.human || 'ok'}\n`);
  else process.stderr.write(`ERROR: ${payload.error || payload.reason || 'failed'}\n`);
  process.exitCode = code;
}

function git(repo, args) {
  return spawnSync('git', args, { cwd: repo, encoding: 'utf8', timeout: 60000 });
}

function revParse(repo, ref) {
  const result = git(repo, ['rev-parse', '--verify', `${ref}^{commit}`]);
  if (result.status !== 0) return null;
  const sha = String(result.stdout || '').trim();
  return sha || null;
}

function localTip(repo, branch) {
  return revParse(repo, `refs/heads/${branch}`) || revParse(repo, branch);
}

function remoteTip(repo, branch) {
  return revParse(repo, `refs/remotes/origin/${branch}`) || revParse(repo, `origin/${branch}`);
}

function parseFrontmatter(text) {
  const match = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!field) continue;
    data[field[1]] = field[2].trim().replace(/^["']|["']$/g, '');
  }
  return data;
}

function readRunState(runFile) {
  if (!fs.existsSync(runFile)) throw new Error(`run state not found: ${runFile}`);
  return parseFrontmatter(fs.readFileSync(runFile, 'utf8'));
}

function baselineFile(runFile) {
  return path.join(path.dirname(path.resolve(runFile)), BASELINE_NAME);
}

function loadBaseline(file) {
  if (!fs.existsSync(file)) return { schemaVersion: SCHEMA_VERSION, runId: null, branch: null, records: [] };
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.records)) {
    throw new Error(`malformed baseline store: ${file}`);
  }
  return parsed;
}

function saveBaseline(file, data) {
  JSON.parse(JSON.stringify(data));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${Date.now().toString(36)}`;
  fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
}

function resolveBranch(options, frontmatter) {
  const branch = options.branch || frontmatter.branch || frontmatter.baseBranch;
  if (!branch) throw new Error('cannot resolve run branch (pass --branch or set branch/baseBranch in run state)');
  return branch;
}

function resolveSlug(options, frontmatter) {
  const slug = options.slug || frontmatter.slug;
  if (!slug) throw new Error('cannot resolve slug (pass --slug or set slug in run state)');
  return slug;
}

function commitLines(repo, from, to) {
  if (!from || !to || from === to) return [];
  const result = git(repo, ['log', '--reverse', '--format=%H%x09%h%x09%s', `${from}..${to}`]);
  if (result.status !== 0) return [];
  return String(result.stdout || '')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [sha, short, ...subject] = line.split('\t');
      return { sha, short, subject: subject.join('\t') };
    });
}

function recordBaseline(options) {
  const repo = path.resolve(options.repo || process.cwd());
  const runFile = path.resolve(options.run);
  const frontmatter = readRunState(runFile);
  const branch = resolveBranch(options, frontmatter);
  const slug = resolveSlug(options, frontmatter);
  const file = baselineFile(runFile);

  const local = localTip(repo, branch);
  if (!local) throw new Error(`cannot resolve local tip for branch ${branch}`);
  const remote = remoteTip(repo, branch);
  const recordedAt = new Date().toISOString();

  const data = loadBaseline(file);
  data.schemaVersion = SCHEMA_VERSION;
  data.runId = frontmatter.runId || frontmatter.workflowId || data.runId || path.basename(path.dirname(runFile));
  data.branch = branch;
  data.records = data.records.filter((record) => record.slug !== slug);
  data.records.push({ slug, localTip: local, remoteTip: remote, recordedAt });
  saveBaseline(file, data);

  return {
    payload: {
      subcommand: 'record-baseline',
      slug,
      branch,
      localTip: local,
      remoteTip: remote,
      recordedAt,
      baselineFile: path.relative(process.cwd(), file).split(path.sep).join('/'),
      message: `baseline recorded for ${slug} (${branch}): local ${local.slice(0, 7)}${remote ? `, remote ${remote.slice(0, 7)}` : ', no remote'}`,
    },
    code: 0,
  };
}

function checkAdvance(options) {
  const repo = path.resolve(options.repo || process.cwd());
  const runFile = path.resolve(options.run);
  const frontmatter = readRunState(runFile);
  const branch = resolveBranch(options, frontmatter);
  const slug = resolveSlug(options, frontmatter);
  const file = baselineFile(runFile);

  const data = loadBaseline(file);
  let record = data.records.find((item) => item.slug === slug);
  // Shared-head batches compare against the previous dispatch on the one run
  // branch, not against a record keyed by the current slug. A new item in the
  // batch has no record of its own yet; fall back to the most recent dispatch
  // baseline so a foreign commit between different slugs is still detected.
  if (!record && data.records.length > 0) {
    record = data.records[data.records.length - 1];
  }
  if (!record) {
    return {
      payload: { error: `no baseline recorded for ${slug}; call record-baseline before check-advance`, reason: 'no-baseline' },
      code: 2,
    };
  }

  const currentLocal = localTip(repo, branch);
  const currentRemote = remoteTip(repo, branch);
  const localChanged = Boolean(currentLocal && record.localTip && currentLocal !== record.localTip);
  const remoteChanged = Boolean(currentRemote && record.remoteTip && currentRemote !== record.remoteTip);
  const advanced = localChanged || remoteChanged;

  if (!advanced) {
    return {
      payload: {
        subcommand: 'check-advance',
        advanced: false,
        slug,
        baselineSlug: record.slug,
        branch,
        localTip: currentLocal,
        remoteTip: currentRemote,
        local: { from: record.localTip, to: currentLocal, newCommits: [] },
        remote: { from: record.remoteTip, to: currentRemote, newCommits: [] },
        message: `no unexpected advance for ${slug} (${branch} unchanged)`,
      },
      code: 0,
    };
  }

  const newLocal = localChanged ? commitLines(repo, record.localTip, currentLocal) : [];
  const newRemote = remoteChanged ? commitLines(repo, record.remoteTip, currentRemote) : [];
  const named = [...newLocal, ...newRemote];
  return {
    payload: {
      subcommand: 'check-advance',
      advanced: true,
      slug,
      baselineSlug: record.slug,
      branch,
      reason: 'unexpected-advance',
      local: { from: record.localTip, to: currentLocal, newCommits: newLocal },
      remote: { from: record.remoteTip, to: currentRemote, newCommits: newRemote },
      newCommits: named,
      error: `unexpected advance on ${branch}: ${named.map((commit) => commit.short).join(', ') || 'tip moved'}`,
      message: `unexpected advance on ${branch}; pause (Resume/Skip/Abort)`,
    },
    code: 1,
  };
}

function checkConvergence(options) {
  const repo = path.resolve(options.repo || process.cwd());
  if (!options.prHead) throw new Error('--pr-head is required');
  const prHead = revParse(repo, options.prHead) || options.prHead;
  let tip = options.localTip;
  if (tip) tip = revParse(repo, tip) || tip;
  else if (options.run) {
    const frontmatter = readRunState(path.resolve(options.run));
    const branch = resolveBranch(options, frontmatter);
    tip = localTip(repo, branch);
  }
  if (!tip) throw new Error('--local-tip (or --run) is required to resolve the local tip');

  const converged = prHead === tip;
  if (converged) {
    return {
      payload: { subcommand: 'check-convergence', converged: true, prHead, localTip: tip, message: `PR head matches local tip (${tip.slice(0, 7)})` },
      code: 0,
    };
  }
  return {
    payload: {
      subcommand: 'check-convergence',
      converged: false,
      reason: 'pr-head-local-tip-mismatch',
      prHead,
      localTip: tip,
      error: `refusing merge: PR head ${prHead.slice(0, 7)} differs from local tip ${tip.slice(0, 7)}`,
      message: `refusing merge: PR head ${prHead.slice(0, 7)} != local tip ${tip.slice(0, 7)}`,
    },
    code: 1,
  };
}

function listForeign(options) {
  const repo = path.resolve(options.repo || process.cwd());
  if (!options.base || !options.head) throw new Error('--base and --head are required');
  const base = revParse(repo, options.base) || options.base;
  const head = revParse(repo, options.head) || options.head;
  const own = new Set(
    String(options.own || '')
      .split(',')
      .map((sha) => sha.trim())
      .filter(Boolean)
      .flatMap((sha) => [sha, revParse(repo, sha) || sha]),
  );
  const commits = commitLines(repo, base, head);
  const foreign = commits.filter((commit) => !own.has(commit.sha) && !own.has(commit.short));

  const lines = [
    '### Foreign commits in range',
    '',
    `Commits reachable from \`${head.slice(0, 7)}\` but not produced by this batch (\`${base.slice(0, 7)}..${head.slice(0, 7)}\`):`,
    '',
  ];
  if (foreign.length === 0) {
    lines.push('- none detected');
  } else {
    for (const commit of foreign) {
      lines.push(`- \`${commit.short}\` ${commit.subject} (\`${commit.sha}\`)`);
    }
  }
  const markdown = `${lines.join('\n')}\n`;

  if (options.markdown && !options.json) process.stdout.write(markdown);
  return {
    payload: {
      subcommand: 'list-foreign',
      base,
      head,
      own: [...own],
      foreign,
      markdown,
      message: foreign.length === 0 ? 'no foreign commits in range' : `${foreign.length} foreign commit(s) in range`,
    },
    code: 0,
  };
}

function main() {
  const [subcommand, ...rest] = process.argv.slice(2);
  let options;
  try {
    options = parseArgs(rest);
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 2;
    return;
  }

  try {
    let result;
    switch (subcommand) {
      case 'record-baseline': result = recordBaseline(options); break;
      case 'check-advance': result = checkAdvance(options); break;
      case 'check-convergence': result = checkConvergence(options); break;
      case 'list-foreign': result = listForeign(options); break;
      default:
        process.stderr.write('ERROR: unknown subcommand (record-baseline|check-advance|check-convergence|list-foreign)\n');
        process.exitCode = 2;
        return;
    }
    emit(result.code === 0, result.payload, options, result.code);
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = { parseArgs, commitLines, checkConvergence };
