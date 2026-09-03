import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const {
  pruneRetiredConsumerArtifacts,
  stripRetiredConfigKeys,
  STALE_LIVE_REFERENCE_PATTERNS,
  RETIRED_BARE_IDS,
  RETIRED_TO_CANONICAL,
  listRetiredManifestIds,
} = require(path.join(repoRoot, '.agents/skills/ws-shared/scripts/retired_artifacts.cjs'));

function tempDir() {
  const dir = path.join(__dirname, `.tmp-consumer-migration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

{
  const cfg = {
    defaults: {
      sessionLeases: true,
      _comment_sessionLeases: 'calls session_lease.cjs',
      enableAuditing: false,
      patternsBackend: true,
      patterns: true,
      _comment_patterns: 'patterns comment',
      autoMode: false,
    },
  };
  const { cfg: next, changed, removed } = stripRetiredConfigKeys(cfg);
  assert.strictEqual(changed, true);
  assert.ok(removed.includes('defaults.sessionLeases'));
  assert.ok(removed.includes('defaults._comment_sessionLeases'));
  assert.ok(removed.includes('defaults.patterns'));
  assert.ok(removed.includes('defaults._comment_patterns'));
  assert.strictEqual(next.defaults.autoMode, false);
  assert.strictEqual(next.defaults.sessionLeases, undefined);
  assert.strictEqual(next.defaults.patterns, undefined);
  assert.strictEqual(next.defaults._comment_patterns, undefined);
}

{
  const root = tempDir();
  try {
    const skillsDir = path.join(root, '.agents', 'skills');
    const sharedDir = path.join(skillsDir, 'ws-shared');
    fs.mkdirSync(sharedDir, { recursive: true });
    fs.writeFileSync(
      path.join(sharedDir, 'config.json'),
      `${JSON.stringify(
        {
          defaults: {
            sessionLeases: true,
            _comment_sessionLeases: 'acquire lease before bootstrap',
            _comment_patterns: 'legacy patterns comment',
            patterns: true,
          },
        },
        null,
        2,
      )}\n`,
    );
    fs.writeFileSync(path.join(sharedDir, 'session-lease.schema.json'), '{}');
    fs.writeFileSync(path.join(sharedDir, 'backend.md.template'), '# template');
    fs.writeFileSync(path.join(sharedDir, 'frontend.md.template'), '# template');
    fs.writeFileSync(
      path.join(sharedDir, 'installed-skills.json'),
      `${JSON.stringify(
        {
          version: 1,
          skills: [
            'ws-spec-to-pr',
            'ws-patterns',
            'ws-audit',
            'ws-write-spec',
            'ws-sync-spec',
            'ws-multi-spec',
            'ws-local-spec-provider',
            'ws-verify-plan',
            'ws-github-provider',
            'ws-azure-devops-provider',
            'ws-write-plan',
            'ws-update-plan-implementation',
            'ws-interview',
            'azure-devops',
            'caveman',
            'code-review',
            'fix-pr',
            'plan-us',
            'us-delivery-workflow',
          ],
          selected: [
            'ws-spec-to-pr',
            'ws-patterns',
            'ws-write-spec',
            'ws-sync-spec',
            'ws-verify-plan',
            'caveman',
            'fix-pr',
          ],
        },
        null,
        2,
      )}\n`,
    );
    fs.mkdirSync(path.join(skillsDir, 'ws-patterns'), { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'ws-patterns', 'SKILL.md'), '# retired');
    fs.mkdirSync(path.join(skillsDir, 'ws-write-spec'), { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'ws-write-spec', 'SKILL.md'), '# retired 0.3.56');
    fs.mkdirSync(path.join(skillsDir, 'ws-interview'), { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'ws-interview', 'SKILL.md'), '# retired 0.3.56');

    const logs = [];
    const result = pruneRetiredConsumerArtifacts(fs, path, {
      skillsDir,
      log: (msg) => logs.push(msg),
    });

    assert.deepStrictEqual(result.hubFiles.sort(), ['backend.md.template', 'frontend.md.template', 'session-lease.schema.json'].sort());
    assert.ok(result.configKeys.some((k) => k.includes('sessionLeases')));
    assert.ok(result.configKeys.some((k) => k.includes('_comment_patterns')));
    assert.ok(result.configKeys.some((k) => k.includes('patterns')));
    assert.deepStrictEqual(result.skillDirs.sort(), ['ws-interview', 'ws-patterns', 'ws-write-spec'].sort());
    // Bare legacy ids are manifest-prune only — never reported as removed folders.
    for (const bare of ['azure-devops', 'caveman', 'code-review', 'fix-pr', 'plan-us', 'us-delivery-workflow']) {
      assert.ok(!result.skillDirs.includes(bare), `bare id ${bare} must not be treated as a skill folder`);
    }
    assert.ok(!fs.existsSync(path.join(skillsDir, 'ws-write-spec')));
    assert.ok(!fs.existsSync(path.join(skillsDir, 'ws-interview')));
    assert.ok(!fs.existsSync(path.join(sharedDir, 'session-lease.schema.json')));
    assert.ok(!fs.existsSync(path.join(sharedDir, 'backend.md.template')));
    assert.ok(!fs.existsSync(path.join(sharedDir, 'frontend.md.template')));
    const cfg = JSON.parse(fs.readFileSync(path.join(sharedDir, 'config.json'), 'utf8'));
    assert.strictEqual(cfg.defaults.sessionLeases, undefined);
    assert.strictEqual(cfg.defaults._comment_patterns, undefined);
    assert.strictEqual(cfg.defaults.patterns, undefined);
    const manifest = JSON.parse(fs.readFileSync(path.join(sharedDir, 'installed-skills.json'), 'utf8'));
    assert.deepStrictEqual(manifest.skills, ['ws-spec-to-pr']);
    assert.deepStrictEqual(manifest.selected, ['ws-spec-to-pr']);
    // Post-prune manifest carries zero retired ids (fail-closed helper).
    assert.deepStrictEqual(listRetiredManifestIds(manifest), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  // Retired → canonical map (0.3.56 family rename) is the migration source of truth.
  assert.deepStrictEqual(RETIRED_TO_CANONICAL, {
    'ws-write-spec': 'ws-spec-write',
    'ws-sync-spec': 'ws-spec-update',
    'ws-multi-spec': 'ws-spec-multi',
    'ws-local-spec-provider': 'ws-spec-provider-local',
    'ws-verify-plan': 'ws-plan-verify',
    'ws-github-provider': 'ws-spec-provider-github',
    'ws-azure-devops-provider': 'ws-spec-provider-azure-devops',
    'ws-write-plan': 'ws-plan-write',
    'ws-update-plan-implementation': 'ws-plan-update',
    'ws-interview': 'ws-plan-interview',
  });
  assert.deepStrictEqual([...RETIRED_BARE_IDS].sort(), ['azure-devops', 'caveman', 'code-review', 'fix-pr', 'plan-us', 'us-delivery-workflow'].sort());
  // Bare legacy ids are manifest-prune only: no generic bare-word STALE
  // pattern may match them (false-positive rule — e.g. prose "fix-pr").
  for (const bare of RETIRED_BARE_IDS) {
    for (const pattern of STALE_LIVE_REFERENCE_PATTERNS) {
      assert.ok(
        !pattern.re.test(`unrelated prose mentioning ${bare} in passing`),
        `STALE pattern ${pattern.id} must not match bare word ${bare}`,
      );
    }
  }
  // Helper flags stale ids in both manifest lists.
  assert.deepStrictEqual(
    listRetiredManifestIds({ skills: ['ws-spec-to-pr', 'ws-write-spec', 'caveman'], selected: ['ws-sync-spec', 'plan-us'] }).sort(),
    ['caveman', 'plan-us', 'ws-sync-spec', 'ws-write-spec'].sort(),
  );
  assert.deepStrictEqual(listRetiredManifestIds({ skills: ['ws-spec-to-pr'], selected: ['ws-spec-to-pr'] }), []);
}

{
  const skillsRoot = path.join(repoRoot, '.agents', 'skills');
  const offenders = [];
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('ws-')) continue;
    const skillDir = path.join(skillsRoot, entry.name);
    for (const rel of ['SKILL.md', 'setup.md', 'tools.md', 'STEP-DISPATCH.md']) {
      const filePath = path.join(skillDir, rel);
      if (!fs.existsSync(filePath)) continue;
      const text = fs.readFileSync(filePath, 'utf8');
      for (const pattern of STALE_LIVE_REFERENCE_PATTERNS) {
        if (pattern.re.test(text)) {
          offenders.push(`${entry.name}/${rel}: ${pattern.id}`);
        }
      }
    }
  }
  const sharedFiles = ['setup.md', 'tools.md', 'config-resolution.md', 'autoload.md', 'AGENTS.md'];
  for (const rel of sharedFiles) {
    const filePath = path.join(skillsRoot, 'ws-shared', rel);
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, 'utf8');
    for (const pattern of STALE_LIVE_REFERENCE_PATTERNS) {
      if (pattern.re.test(text)) {
        offenders.push(`ws-shared/${rel}: ${pattern.id}`);
      }
    }
  }
  assert.strictEqual(
    offenders.length,
    0,
    `live skill/hub files still reference retired artifacts:\n${offenders.join('\n')}`,
  );

  const requiredStaleIds = [
    'defaults.patternsBackend',
    'defaults.patternsFrontend',
    'defaults.patterns',
    '_comment_patterns',
    'backend.md.template',
    'frontend.md.template',
    'ws-write-spec',
    'ws-sync-spec',
    'ws-multi-spec',
    'ws-github-provider',
    'ws-azure-devops-provider',
    'ws-local-spec-provider',
    'ws-write-plan',
    'ws-verify-plan',
    'ws-update-plan-implementation',
    'ws-interview (retired folder)',
    'ws-*-spec family violation',
  ];
  const staleIds = new Set(STALE_LIVE_REFERENCE_PATTERNS.map((pattern) => pattern.id));
  for (const id of requiredStaleIds) {
    assert.ok(staleIds.has(id), `STALE_LIVE_REFERENCE_PATTERNS missing ${id}`);
  }
}

console.log('test-consumer-migration: ok');
