#!/usr/bin/env node
'use strict';

// Port of cleanup_workflow_git.py (ws-spec-to-pr):
// cleanup_workflow_git -- Phase A mandatory git runtime cleanup for one workflow-id.
//
// Removes local uswf/{workflow-id} worktrees, tags, and branches. Never mutates
// remotes. Never deletes protected branches (main/master/develop and config
// baseBranch/workingBranch). Invoked by orch when status -> completed
// (shared by standard/lite).
//
// Usage:
//   node cleanup_workflow_git.cjs --workflow-id {id}
//   node cleanup_workflow_git.cjs --workflow-id {id} --dry-run
//   node cleanup_workflow_git.cjs --workflow-id {id} --repo /path --dirty-policy force|stop
//
// Exit codes:
//   0  CLEAN (or dry-run with intents logged)
//   1  Hard failure or dirty-policy stop
//   2  WARN leftovers remain after cleanup

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ID_OK = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const PROTECTED_DEFAULTS = new Set(['main', 'master', 'develop']);

function loadConfigProtectedBranches(repo) {
  const extra = new Set();
  const candidates = [
    path.join(String(repo), '.ws', 'config.json'),
    path.join(process.cwd(), '.ws', 'config.json'),
    path.join(String(repo), '.agents', 'skills', 'ws-shared', 'config.json'),
    path.join(process.cwd(), '.agents', 'skills', 'ws-shared', 'config.json'),
  ];
  for (const cfgPath of candidates) {
    if (!fs.existsSync(cfgPath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      const project = data.project || {};
      for (const key of ['baseBranch', 'workingBranch']) {
        const val = project[key];
        if (typeof val === 'string' && val.trim()) extra.add(val.trim());
      }
    } catch { continue; }
    break;
  }
  return extra;
}

function isProtectedBranch(name, repo) {
  if (!name) return false;
  if (PROTECTED_DEFAULTS.has(name)) return true;
  if (repo && loadConfigProtectedBranches(repo).has(name)) return true;
  return false;
}

function die(msg, code = 1) {
  console.error(`ERROR: ${msg}`);
  process.exit(code);
}

function validateWorkflowId(workflowId) {
  const wid = String(workflowId || '').trim();
  if (!wid) die('workflow-id must not be empty');
  if (wid.includes('*') || wid.includes('?') || wid.includes('[')) die(`workflow-id must not contain glob metacharacters: ${JSON.stringify(wid)}`);
  if (wid.includes('/') || wid.includes('\\') || wid.includes('..')) die(`workflow-id must not contain path separators or '..': ${JSON.stringify(wid)}`);
  if (!ID_OK.test(wid)) die(`workflow-id has invalid characters: ${JSON.stringify(wid)}`);
  return wid;
}

function git(repo, ...args) {
  return spawnSync('git', ['-C', String(repo), ...args], { encoding: 'utf8' });
}

function namespacePrefix(workflowId) { return `uswf/${workflowId}/`; }

function listTags(repo, workflowId) {
  const prefix = namespacePrefix(workflowId);
  const cp = git(repo, 'tag', '-l', `${prefix}*`);
  if (cp.status !== 0) die(`git tag -l failed: ${((cp.stderr || cp.stdout) || '').trim()}`);
  return (cp.stdout || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

function listBranches(repo, workflowId) {
  const prefix = namespacePrefix(workflowId);
  const cp = git(repo, 'branch', '--list', `${prefix}*`);
  if (cp.status !== 0) die(`git branch --list failed: ${((cp.stderr || cp.stdout) || '').trim()}`);
  const names = [];
  for (const line of (cp.stdout || '').split('\n')) {
    let name = line.trim().replace(/^\*\s*/, '').trim();
    if (name.startsWith('+ ')) name = name.slice(2).trim();
    if (name) names.push(name);
  }
  return names;
}

function parseWorktreePorcelain(text) {
  const entries = [];
  let current = {};
  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/\n$/, '');
    if (!line) {
      if (current.path) entries.push(current);
      current = {};
      continue;
    }
    if (line.startsWith('worktree ')) {
      if (current.path) entries.push(current);
      current = { path: line.slice('worktree '.length) };
    } else if (line.startsWith('HEAD ')) current.head = line.slice('HEAD '.length);
    else if (line.startsWith('branch ')) {
      const ref = line.slice('branch '.length);
      current.branch = ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : ref;
    } else if (line === 'detached') current.detached = '1';
    else if (line === 'bare') current.bare = '1';
  }
  if (current.path) entries.push(current);
  return entries;
}

function samePath(a, b) {
  const norm = (p) => path.resolve(p).toLowerCase();
  try { return norm(a) === norm(b); } catch { return a === b; }
}

function worktreeMatches(entry, workflowId, mainPath) {
  const p = entry.path || '';
  if (p && samePath(p, mainPath)) return false;
  const prefix = namespacePrefix(workflowId);
  if ((entry.branch || '').startsWith(prefix)) return true;
  const norm = p.replace(/\\/g, '/');
  const marker = `uswf/${workflowId}`;
  if (`/${norm}/`.includes(`/${marker}/`) || norm.endsWith(`/${marker}`) || norm.endsWith(marker)) return true;
  return false;
}

function listMatchingWorktrees(repo, workflowId) {
  const cp = git(repo, 'worktree', 'list', '--porcelain');
  if (cp.status !== 0) die(`git worktree list failed: ${((cp.stderr || cp.stdout) || '').trim()}`);
  const main = path.resolve(String(repo));
  return parseWorktreePorcelain(cp.stdout || '').filter((e) => worktreeMatches(e, workflowId, main));
}

function worktreeDirtyPaths(repo, wtPath) {
  const cp = spawnSync('git', ['status', '--porcelain'], { cwd: String(wtPath), encoding: 'utf8' });
  if (cp.status !== 0) return [`(status failed: ${((cp.stderr || 'unknown') || '').trim()})`];
  return (cp.stdout || '').split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
}

function currentBranch(repo) {
  const cp = git(repo, 'rev-parse', '--abbrev-ref', 'HEAD');
  if (cp.status !== 0) return null;
  const name = (cp.stdout || '').trim();
  return (!name || name === 'HEAD') ? null : name;
}

function branchCheckedOutElsewhere(repo, branch) {
  const cp = git(repo, 'worktree', 'list', '--porcelain');
  if (cp.status !== 0) return true;
  return parseWorktreePorcelain(cp.stdout || '').some((e) => e.branch === branch);
}

function removeWorktrees(repo, workflowId, { dryRun, dirtyPolicy }) {
  for (const entry of listMatchingWorktrees(repo, workflowId)) {
    const wt = entry.path;
    const dirty = worktreeDirtyPaths(repo, wt);
    if (dirty.length) {
      console.log(`DIRTY worktree ${wt}:`);
      for (const line of dirty) console.log(`  ${line}`);
      if (dirtyPolicy === 'stop') die(`dirty worktree ${wt}; refusing remove (--dirty-policy stop)`, 1);
    }
    if (dryRun) {
      console.log(`[DRY-RUN] git worktree remove --force ${wt}`);
      continue;
    }
    let cp = git(repo, 'worktree', 'remove', '--force', wt);
    if (cp.status !== 0) {
      console.log(`WARN: worktree remove failed (${((cp.stderr || cp.stdout) || '').trim()}); pruning`);
      git(repo, 'worktree', 'prune');
      const cp2 = git(repo, 'worktree', 'remove', '--force', wt);
      if (cp2.status !== 0) die(`failed to remove worktree ${wt}: ${((cp2.stderr || cp2.stdout) || '').trim()}`);
    } else {
      console.log(`Removed worktree: ${wt}`);
    }
  }
  if (!dryRun) git(repo, 'worktree', 'prune');
}

function removeTags(repo, workflowId, { dryRun }) {
  for (const tag of listTags(repo, workflowId)) {
    if (dryRun) { console.log(`[DRY-RUN] git tag -d ${tag}`); continue; }
    const cp = git(repo, 'tag', '-d', tag);
    if (cp.status !== 0) die(`failed to delete tag ${tag}: ${((cp.stderr || cp.stdout) || '').trim()}`);
    console.log(`Deleted tag: ${tag}`);
  }
}

function removeBranches(repo, workflowId, { dryRun }) {
  const head = currentBranch(repo);
  for (const branch of listBranches(repo, workflowId)) {
    if (isProtectedBranch(branch, repo)) { console.log(`SKIP branch (protected): ${branch}`); continue; }
    if (head === branch) { console.log(`SKIP branch (checked out on HEAD): ${branch}`); continue; }
    if (branchCheckedOutElsewhere(repo, branch)) { console.log(`SKIP branch (checked out in a worktree): ${branch}`); continue; }
    if (dryRun) { console.log(`[DRY-RUN] git branch -D ${branch}`); continue; }
    const cp = git(repo, 'branch', '-D', branch);
    if (cp.status !== 0) die(`failed to delete branch ${branch}: ${((cp.stderr || cp.stdout) || '').trim()}`);
    console.log(`Deleted branch: ${branch}`);
  }
}

function verify(repo, workflowId) {
  const leftovers = [];
  for (const tag of listTags(repo, workflowId)) leftovers.push(`tag:${tag}`);
  for (const entry of listMatchingWorktrees(repo, workflowId)) leftovers.push(`worktree:${entry.path}`);
  for (const branch of listBranches(repo, workflowId)) leftovers.push(`branch:${branch}`);
  return leftovers;
}

function printHelp() {
  console.log('Usage: node cleanup_workflow_git.cjs --workflow-id ID [--dry-run] [--repo DIR] [--dirty-policy force|stop]');
}

function parseArgs(argv) {
  const o = { workflowId: null, dryRun: false, repo: '.', dirtyPolicy: 'force' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else if (a === '--workflow-id') { o.workflowId = argv[++i]; }
    else if (a.startsWith('--workflow-id=')) o.workflowId = a.slice(14);
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--repo') { o.repo = argv[++i] ?? '.'; }
    else if (a.startsWith('--repo=')) o.repo = a.slice(7);
    else if (a === '--dirty-policy') { o.dirtyPolicy = argv[++i]; }
    else if (a.startsWith('--dirty-policy=')) o.dirtyPolicy = a.slice(15);
    else { console.error(`unknown argument: ${a}`); process.exit(2); }
  }
  if (!o.workflowId) { console.error('argument --workflow-id is required'); process.exit(2); }
  if (!['force', 'stop'].includes(o.dirtyPolicy)) { console.error('argument --dirty-policy: must be force|stop'); process.exit(2); }
  return o;
}

function main(argv) {
  const args = parseArgs(argv ?? process.argv.slice(2));
  const workflowId = validateWorkflowId(args.workflowId);
  const repo = path.resolve(args.repo);
  const dotGit = path.join(repo, '.git');
  let isRepo = false;
  try { isRepo = fs.existsSync(dotGit); } catch { isRepo = false; }
  if (!isRepo) {
    const cp = git(repo, 'rev-parse', '--is-inside-work-tree');
    if (cp.status !== 0 || (cp.stdout || '').trim() !== 'true') die(`not a git repository: ${repo}`);
  }
  console.log(`cleanup_workflow_git: workflow-id=${workflowId} repo=${repo}`);
  if (args.dryRun) console.log('[DRY-RUN] no git mutations will be performed');
  removeWorktrees(repo, workflowId, { dryRun: args.dryRun, dirtyPolicy: args.dirtyPolicy });
  removeTags(repo, workflowId, { dryRun: args.dryRun });
  removeBranches(repo, workflowId, { dryRun: args.dryRun });
  if (args.dryRun) {
    console.log('CLEAN (dry-run)');
    return 0;
  }
  const leftovers = verify(repo, workflowId);
  if (leftovers.length) {
    console.log(`WARN: leftover: ${leftovers.join(', ')}`);
    return 2;
  }
  console.log('CLEAN');
  return 0;
}

if (require.main === module) process.exit(main());
module.exports = { main, isProtectedBranch };
void os;
