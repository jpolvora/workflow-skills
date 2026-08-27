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
      autoMode: false,
    },
  };
  const { cfg: next, changed, removed } = stripRetiredConfigKeys(cfg);
  assert.strictEqual(changed, true);
  assert.ok(removed.includes('defaults.sessionLeases'));
  assert.ok(removed.includes('defaults._comment_sessionLeases'));
  assert.strictEqual(next.defaults.autoMode, false);
  assert.strictEqual(next.defaults.sessionLeases, undefined);
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
          },
        },
        null,
        2,
      )}\n`,
    );
    fs.writeFileSync(path.join(sharedDir, 'session-lease.schema.json'), '{}');
    fs.writeFileSync(
      path.join(sharedDir, 'installed-skills.json'),
      `${JSON.stringify(
        { version: 1, skills: ['ws-spec-to-pr', 'ws-patterns', 'ws-audit'], selected: ['ws-spec-to-pr', 'ws-patterns'] },
        null,
        2,
      )}\n`,
    );
    fs.mkdirSync(path.join(skillsDir, 'ws-patterns'), { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'ws-patterns', 'SKILL.md'), '# retired');

    const logs = [];
    const result = pruneRetiredConsumerArtifacts(fs, path, {
      skillsDir,
      log: (msg) => logs.push(msg),
    });

    assert.deepStrictEqual(result.hubFiles, ['session-lease.schema.json']);
    assert.ok(result.configKeys.some((k) => k.includes('sessionLeases')));
    assert.deepStrictEqual(result.skillDirs, ['ws-patterns']);
    assert.ok(!fs.existsSync(path.join(sharedDir, 'session-lease.schema.json')));
    const cfg = JSON.parse(fs.readFileSync(path.join(sharedDir, 'config.json'), 'utf8'));
    assert.strictEqual(cfg.defaults.sessionLeases, undefined);
    const manifest = JSON.parse(fs.readFileSync(path.join(sharedDir, 'installed-skills.json'), 'utf8'));
    assert.deepStrictEqual(manifest.skills, ['ws-spec-to-pr']);
    assert.deepStrictEqual(manifest.selected, ['ws-spec-to-pr']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

{
  const skillsRoot = path.join(repoRoot, '.agents', 'skills');
  const offenders = [];
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('ws-')) continue;
    const skillDir = path.join(skillsRoot, entry.name);
    for (const rel of ['SKILL.md', 'setup.md', 'tools.md', 'PHASES.md', 'STEP-DISPATCH.md']) {
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
}

console.log('test-consumer-migration: ok');
