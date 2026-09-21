/**
 * Managed-runtime location sweep: `.ws/runtime` and `.ws/templates` are retired
 * consumer-hub copies. Live files may only mention them in retirement logic,
 * negative tests, and contract prose stating they are not a resolution source.
 * Any other reference fails (managed content lives in the skills install:
 * {skillsRoot}|{globalSkillsRoot}/ws-shared/{runtime,templates}).
 */
import { spawnSync } from 'child_process';
import utils from './harness-test-utils.cjs';

const { assert, repoRoot } = utils;

const PATTERNS = ['.ws/runtime', '.ws/templates', '.ws\\runtime', '.ws\\templates'];

// History / run artifacts: contracts of record, never rewritten.
const SKIP_DIRS = [
  '.agents/plans/',
  '.agents/specs/',
  '.agents/codereviews/',
  '.cursor/',
  'specs/',
  '.ws/memory/',
  'memory/',
  '.agents/skills/ws-fix-pr/runs/',
];
const SKIP_FILES = new Set([
  'CHANGELOG.md',
  'MEMORY.md',
  '.ws/CHANGELOG.md',
  '.ws/MEMORY.md',
]);
// Wiki sources stay live: managed-runtime citations below still apply there.
const KEEP_DIRS = ['.agents/specs/wiki/'];

function skipped(file) {
  if (SKIP_FILES.has(file)) return true;
  if (KEEP_DIRS.some((dir) => file.startsWith(dir))) return false;
  return SKIP_DIRS.some((dir) => file.startsWith(dir));
}

// { file, substr, reason } — file matches exactly or as a dir prefix
// when it ends with '/'. Every entry must match >= 1 hit (no rot).
const ALLOW = [
  // --- Contract prose: `.ws` never carries managed runtime/templates ---
  { file: '.agents/skills/ws-check-harness/PHASES.md', substr: '.ws/runtime', reason: 'gate contract states .ws/runtime is never a resolution source' },
  { file: '.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs', substr: '.ws/runtime', reason: 'resolver comment documenting the removed fallback' },
  { file: 'install-skills.sh', substr: '.ws/runtime', reason: 'shim banner states managed content is never installed to .ws/runtime' },
  // --- Retirement logic ---
  { file: 'bin/cli.js', substr: '.ws/runtime', reason: 'installer retires .ws/runtime copies and documents the ban' },
  { file: 'bin/cli.js', substr: '.ws/templates', reason: 'installer retires .ws/templates copies and documents the ban' },
  // --- Negative/regression tests pinning the invariant ---
  { file: 'test/test-doc-sync.js', substr: '.ws/runtime', reason: 'mirror-autoload negative assertion message' },
  { file: 'test/test-autoload-configure.js', substr: '.ws/runtime', reason: 'global-only autoload negative assertion message' },
  { file: 'test/test-hub-separation.js', substr: '.ws/runtime', reason: 'gate fixtures prove .ws/runtime is never audited or resolved' },
  { file: 'test/test-install.js', substr: '.ws/runtime', reason: 'fresh-install negative assertion and message' },
  { file: 'test/test-local-first-precedence.js', substr: '.ws/runtime', reason: 'stale-copy fixture proving skills-tree precedence' },
  { file: 'test/test-ws-shared-layout.js', substr: '.ws/runtime', reason: 'migration fixture proves the hub pointer never links a retired copy' },
  { file: 'test/test-skills-runtime-resolution.js', substr: '.ws/runtime', reason: 'fail-closed fixtures for the removed fallback' },
  { file: 'test/test-bootstrap-runtime.js', substr: '.ws/runtime', reason: 'banned-directory negative fixture proving fail-closed' },
  { file: 'test/test-shared-hub-paths.js', substr: '.ws/runtime', reason: "sweep's own patterns and allowlist literals" },
  { file: 'test/test-shared-hub-paths.js', substr: '.ws/templates', reason: "sweep's own patterns and allowlist literals" },
];

function collect(pattern) {
  const found = spawnSync('git', ['grep', '-n', '--fixed-strings', pattern, '--', '.'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.ok(found.status === 0 || found.status === 1, `git grep failed for ${pattern}: ${found.stderr}`);
  const hits = [];
  if (found.status === 1) return hits;
  for (const line of found.stdout.split('\n')) {
    if (!line) continue;
    const idx = line.indexOf(':');
    const rest = line.slice(idx + 1);
    const lineNo = rest.slice(0, rest.indexOf(':'));
    const file = line.slice(0, idx);
    const text = rest.slice(lineNo.length + 1);
    if (!skipped(file)) hits.push({ file, lineNo, text });
  }
  return hits;
}

const hits = PATTERNS.flatMap((pattern) => collect(pattern));
const used = new Array(ALLOW.length).fill(0);
const unlisted = [];
for (const hit of hits) {
  let ok = false;
  ALLOW.forEach((entry, i) => {
    const scope = entry.file.endsWith('/') ? hit.file.startsWith(entry.file) : hit.file === entry.file;
    if (scope && hit.text.includes(entry.substr)) {
      ok = true;
      used[i] += 1;
    }
  });
  if (!ok) unlisted.push(`${hit.file}:${hit.lineNo}: ${hit.text.slice(0, 160)}`);
}

assert.strictEqual(
  unlisted.length,
  0,
  `live files reference the retired .ws/runtime or .ws/templates copies:\n${unlisted.join('\n')}`,
);

const unused = ALLOW.filter((entry, i) => used[i] === 0);
assert.strictEqual(
  unused.length,
  0,
  `stale allowlist entries (no longer referenced):\n${unused.map((e) => `${e.file} :: ${e.substr}`).join('\n')}`,
);

console.log(`test-shared-hub-paths: ok (${hits.length} residual hits allowlisted)`);
