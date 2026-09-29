/**
 * resolve_skill_path.cjs — local file first, else global skills root, never a link.
 * Run: node test/test-resolve-skill-path.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HELPER = path.resolve(__dirname, '../.agents/skills/ws-shared/runtime/scripts/resolve_skill_path.cjs');

function run(repo, filePath) {
  return cp.spawnSync(process.execPath, [HELPER, '--repo-root', repo, '--path', filePath], { encoding: 'utf8' });
}

function assert(cond, message) {
  if (!cond) {
    console.error(message);
    process.exitCode = 1;
    throw new Error(message);
  }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-skill-'));
const repo = path.join(tmp, 'repo');
const globalRoot = path.join(tmp, 'global');
fs.mkdirSync(path.join(repo, '.agents/skills/ws-local'), { recursive: true });
fs.writeFileSync(path.join(repo, '.agents/skills/ws-local/SKILL.md'), 'local\n');
fs.mkdirSync(path.join(globalRoot, 'ws-only'), { recursive: true });
fs.writeFileSync(path.join(globalRoot, 'ws-only/SKILL.md'), 'global\n');
process.env.WORKFLOW_SKILLS_GLOBAL_DIR = globalRoot;

const linkPath = path.join(repo, '.agents/skills/ws-link/SKILL.md');
fs.mkdirSync(path.dirname(linkPath), { recursive: true });
fs.symlinkSync(path.join(repo, '.agents/skills/ws-local/SKILL.md'), linkPath);
const link = run(repo, '.agents/skills/ws-link/SKILL.md');
assert(link.status !== 0, 'symlink should fail');
assert(link.stderr.includes('refusing symlink'), link.stderr);

const local = run(repo, '.agents/skills/ws-local/SKILL.md');
assert(local.status === 0, local.stderr);
const localJson = JSON.parse(local.stdout);
assert(localJson.root === 'local', 'V1:local-hit');

const remote = run(repo, '.agents/skills/ws-only/SKILL.md');
assert(remote.status === 0, remote.stderr);
const remoteJson = JSON.parse(remote.stdout);
assert(remoteJson.root === 'global', 'V2:global-fallthrough');
assert(!fs.existsSync(path.join(repo, '.agents/skills/ws-only')), 'AC2 no consumer copy');

const missing = run(repo, '.agents/skills/ws-missing/SKILL.md');
assert(missing.status !== 0, 'V3:missing should fail');
assert(missing.stderr.includes('missing skill path'), missing.stderr);
assert(!fs.existsSync(path.join(repo, '.agents/skills/ws-missing')), 'AC4 no junction');

const traversal = run(repo, '../outside/SKILL.md');
assert(traversal.status !== 0, 'V4:traversal should fail');
assert(traversal.stderr.includes('rejected skill path'), traversal.stderr);

console.log('test-resolve-skill-path: ok');
