/**
 * Canonical version.json contract (replaces per-skill frontmatter version stamping).
 * Run: node test/test-skill-frontmatter.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  assertVersionProjectionsMatch,
  bumpCanonicalPatch,
  readCanonicalVersion,
  writeCanonicalVersion,
} from '../bin/canonical-version.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const canonical = readCanonicalVersion(repo);
assert(/^\d+\.\d+\.\d+$/.test(canonical), 'canonical semver');
assertVersionProjectionsMatch(repo, canonical);

const sampleSkill = path.join(repo, '.agents', 'skills', 'ws-plan-write', 'SKILL.md');
const skillText = fs.readFileSync(sampleSkill, 'utf8');
assert(!/^version:\s/m.test(skillText.split('---')[1] || ''), 'sample SKILL.md has no version frontmatter');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-canonical-'));
try {
  const vPath = path.join(tmp, '.agents', 'skills', 'ws-shared', 'version.json');
  fs.mkdirSync(path.dirname(vPath), { recursive: true });
  writeCanonicalVersion(tmp, '1.0.0');
  fs.writeFileSync(
    path.join(tmp, 'package.json'),
    JSON.stringify({ name: 'fixture', version: '1.0.0' }, null, 2),
  );
  assert(readCanonicalVersion(tmp) === '1.0.0', 'read from fixture');
  const bumped = bumpCanonicalPatch(tmp);
  assert(bumped.to === '1.0.1', 'patch bump');
  assert(readCanonicalVersion(tmp) === '1.0.1', 'bump persisted');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('All canonical-version checks passed.');
