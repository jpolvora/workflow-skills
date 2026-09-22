import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;
const script = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/write_verification_manifest.cjs');

// --help exits 0 without touching the filesystem.
const help = run(script, ['--help']);
assert.strictEqual(help.status, 0, help.stderr);
assert.match(help.stdout, /--us-dir DIR --output FILE/);

// Missing required args exit non-zero with a clear error.
const missing = run(script, []);
assert.notStrictEqual(missing.status, 0);
assert.match(missing.stderr, /--us-dir and --output are required/);

// Temp consumer root with ledger + state: manifest written with filesHash.
const root = temp('ws-verify-manifest-');
write(path.join(root, '.ws/config.json'), JSON.stringify({ plans: { dir: '.agents/plans' } }));
const usDir = path.join(root, 'us');
write(path.join(usDir, 'ac-ledger.json'), JSON.stringify({
  aliasResults: [{ alias: 'verify', exit: 0 }],
  acceptanceCriteria: [{ id: 'AC1', status: 'Implemented', sabotage: { status: 'pass' } }],
}));
write(path.join(usDir, 'run.state.json'), JSON.stringify({
  workflowManifest: { created: ['b.js'], modified: ['a.js'], deleted: [] },
}));
const out = path.join(root, '.runtime', 'verification-manifest.json');
const res = run(script, ['--repo-root', root, '--us-dir', usDir, '--output', out]);
assert.strictEqual(res.status, 0, res.stdout + res.stderr);
const stdout = JSON.parse(res.stdout.trim().split('\n').at(-1));
assert.strictEqual(stdout.ok, true);
assert.ok(stdout.filesHash, 'filesHash reported');
const manifest = JSON.parse(utils.fs.readFileSync(out, 'utf8'));
assert.strictEqual(manifest.schemaVersion, 1);
assert.deepStrictEqual(manifest.filesTouched, { created: ['b.js'], modified: ['a.js'], deleted: [] });
assert.strictEqual(manifest.filesHash, stdout.filesHash);
assert.deepStrictEqual(manifest.aliasResults, [{ alias: 'verify', exit: 0 }]);
assert.strictEqual(manifest.sabotage, 'pass');

// Malformed ledger: manifest still records the files hash.
write(path.join(usDir, 'ac-ledger.json'), '{broken');
const res2 = run(script, ['--repo-root', root, '--us-dir', usDir, '--output', out]);
assert.strictEqual(res2.status, 0, res2.stdout + res2.stderr);

console.log('test-write-verification-manifest: ok');
