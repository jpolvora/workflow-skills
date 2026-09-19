/**
 * Consumer-hub relocation sweep (us-351 AC2): the only live
 * `.agents/skills/ws-shared` references left in tracked files are upstream
 * package sources of truth (SoT), global-hub fallbacks, one-time relocation
 * logic, and byte-locked history. Any new consumer-resolved reference fails.
 */
import { spawnSync } from 'child_process';
import utils from './harness-test-utils.cjs';

const { assert, repoRoot } = utils;

const PATTERNS = ['.agents/skills/ws-shared', '.agents\\skills\\ws-shared'];

// History / run artifacts: contracts of record, never rewritten.
const SKIP_DIRS = [
  '.agents/plans/',
  '.agents/specs/',
  '.agents/codereviews/',
  '.cursor/',
  'specs/',
  '.ws/memory/',
  '.agents/skills/ws-fix-pr/runs/',
];
const SKIP_FILES = new Set([
  'CHANGELOG.md',
  'MEMORY.md',
  '.ws/CHANGELOG.md',
  '.ws/MEMORY.md',
]);
// Wiki sources stay live: SoT runtime citations below still apply there.
const KEEP_DIRS = ['.agents/specs/wiki/'];

function skipped(file) {
  if (SKIP_FILES.has(file)) return true;
  if (KEEP_DIRS.some((dir) => file.startsWith(dir))) return false;
  return SKIP_DIRS.some((dir) => file.startsWith(dir));
}

// { file, substr, reason } — file matches exactly or as a dir prefix
// when it ends with '/'. Every entry must match >= 1 hit (no rot).
const ALLOW = [
  // --- Upstream SoT skill content ---
  { file: '.agents/skills/ws-check-harness/PHASES.md', substr: 'retired hub folders', reason: 'harness retired-folder map already routes the old consumer hub to .ws' },
  { file: '.agents/skills/ws-check-harness/scripts/check_harness_links.cjs', substr: 'hubText = ', reason: 'link checker covers SoT and installed-hub targets' },
  { file: '.agents/skills/ws-check-workflows/scripts/check_workflows.py', substr: 'skill-dependencies.json', reason: 'SoT packaged graph path in message' },
  { file: '.agents/skills/ws-shared/runtime/CATALOG.md', substr: 'skill-dependencies.json', reason: 'SoT packaged graph prose' },
  { file: '.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1', substr: "Join-Path $root '.agents/skills/ws-shared/", reason: 'upstream SoT fallback resolution' },
  { file: '.ws/AGENTS.md', substr: 'authoring source of truth at', reason: 'upstream SoT pointer for package authors' },
  // --- Root hub docs (SoT links + global fallback) ---
  { file: 'AGENTS.md', substr: '.agents/skills/ws-shared/', reason: 'SoT links and paths in upstream authoring hub' },
  { file: 'AGENTS.md', substr: '$HOME/.agents/skills/ws-shared', reason: 'global hub templates/fallback (unchanged by project relocation)' },
  { file: 'CATALOG.md', substr: '.agents/skills/ws-shared/', reason: 'SoT links and paths in upstream catalog' },
  { file: 'FEATURES.md', substr: '.agents/skills/ws-shared/', reason: 'SoT links and paths in feature inventory' },
  { file: 'README.md', substr: '.agents/skills/ws-shared/', reason: 'SoT links and paths in human install narrative' },
  { file: 'README.md', substr: '.agents\\skills\\ws-shared', reason: 'SoT batch-launcher path in Windows snippet' },
  { file: 'STACK.md', substr: '.agents/skills/ws-shared/', reason: 'SoT seed/launcher prose in upstream stack companion' },
  { file: 'package.json', substr: '.agents/skills/ws-shared/runtime/scripts/', reason: 'SoT desktop GUI launcher script' },
  // --- One-time relocation logic ---
  { file: 'bin/cli.js', substr: "'.agents/skills/ws-shared'", reason: 'legacy-hub detection and token migration comparisons' },
  // --- SoT runtime/template reads (scripts + tests) ---
  { file: 'bin/', substr: '.agents/skills/ws-shared/runtime/scripts/', reason: 'SoT helper requires in packaged binaries' },
  { file: 'scripts/', substr: '.agents/skills/ws-shared/runtime/scripts/', reason: 'SoT helper requires in benchmark harness' },
  { file: 'test/', substr: '.agents/skills/ws-shared/runtime', reason: 'SoT runtime reads in tests (consumer runtime lives at .ws/runtime/)' },
  { file: 'test/', substr: '.agents/skills/ws-shared/templates/', reason: 'SoT template reads in tests' },
  { file: 'test/', substr: '.agents/skills/ws-shared/AGENTS.md', reason: 'SoT hub doc packaged assertion in tests' },
  { file: 'test/', substr: "path.join(repoRoot, '.agents/skills/ws-shared', target)", reason: 'SoT mirror-link existence check in tests' },
  { file: 'test/', substr: "path.join(parentDir, '.agents/skills/ws-shared', slug)", reason: 'promoted-skill nesting guard in install tests' },
  { file: 'test/', substr: '!.agents/skills/ws-shared/', reason: 'inverted files[] assertion (relocated hub needs no exclusion)' },
  { file: 'test/', substr: "= path.join(REPO, '.agents/skills/ws-shared');", reason: 'SoT hub const for runtime/template reads in tests' },
  // --- SoT provenance citations in generated docs ---
  { file: 'docs/', substr: 'ws-shared/runtime/', reason: 'SoT runtime source citations in site/wiki output' },
  { file: '.agents/specs/wiki/', substr: 'ws-shared/runtime/', reason: 'SoT runtime source citations in wiki sources' },
  // --- Repo mechanics ---
  { file: '.gitattributes', substr: 'eol=lf', reason: 'line-ending attribute, not a path reference' },
  { file: '.gitignore', substr: 'SoT tracks runtime/ and templates/', reason: 'comment describing the upstream SoT layout' },
  { file: 'test/test-shared-hub-paths.js', substr: 'ws-shared', reason: "sweep's own patterns and allowlist literals" },
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

const hits = [...collect(PATTERNS[0]), ...collect(PATTERNS[1])];
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
  `live files reference the retired consumer hub path:\n${unlisted.join('\n')}`,
);

const unused = ALLOW.filter((entry, i) => used[i] === 0);
assert.strictEqual(
  unused.length,
  0,
  `stale allowlist entries (no longer referenced):\n${unused.map((e) => `${e.file} :: ${e.substr}`).join('\n')}`,
);

console.log(`test-shared-hub-paths: ok (${hits.length} residual hits allowlisted)`);
