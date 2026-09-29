#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function globalSkillsRoot(options = {}) {
  const fromOpt = options.globalSkillsRoot;
  if (fromOpt && String(fromOpt).trim()) return path.resolve(String(fromOpt).trim());
  const fromEnv = process.env.WORKFLOW_SKILLS_GLOBAL_DIR;
  if (fromEnv && String(fromEnv).trim()) return path.resolve(String(fromEnv).trim());
  return path.join(os.homedir(), '.agents', 'skills');
}

function contained(root, candidate) {
  const base = path.resolve(root);
  const full = path.resolve(candidate);
  const rel = path.relative(base, full);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function reject(rel) {
  const error = new Error(`rejected skill path: ${rel}`);
  error.code = 'ERESOLVE_SKILL_PATH';
  throw error;
}

function resolveSkillFile(repoRoot, repoRelativePath, options = {}) {
  const rel = String(repoRelativePath || '').replace(/\\/g, '/').trim();
  if (!rel || path.isAbsolute(rel) || path.win32.isAbsolute(rel)) reject(rel);
  const segments = rel.split('/').filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === '..' || segment === '.')) reject(rel);

  const root = path.resolve(repoRoot);
  const local = path.resolve(root, ...segments);
  if (!contained(root, local)) reject(rel);

  if (fs.existsSync(local)) {
    if (fs.lstatSync(local).isSymbolicLink()) {
      const error = new Error(`refusing symlink for skill path: ${rel}`);
      error.code = 'ERESOLVE_SKILL_LINK';
      throw error;
    }
    return { root: 'local', path: local };
  }

  const globalRoot = globalSkillsRoot(options);
  const globalSegments = rel.startsWith('.agents/skills/')
    ? segments.slice(2)
    : segments;
  const globalPath = path.resolve(globalRoot, ...globalSegments);
  if (!contained(globalRoot, globalPath)) reject(rel);
  if (!fs.existsSync(globalPath)) {
    const error = new Error(`missing skill path: ${rel}`);
    error.code = 'ERESOLVE_SKILL_MISSING';
    throw error;
  }
  return { root: 'global', path: globalPath };
}

function parseArgs(argv) {
  const out = { repoRoot: process.cwd(), filePath: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--repo-root') out.repoRoot = argv[++i];
    else if (token === '--path') out.filePath = argv[++i];
    else throw new Error(`unknown argument: ${token}`);
  }
  if (!out.filePath) throw new Error('--path is required');
  return out;
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = resolveSkillFile(args.repoRoot, args.filePath);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { resolveSkillFile };
