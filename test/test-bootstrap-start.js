import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;
const script = path.join(repoRoot, '.agents/skills/ws-activity-report/scripts/bootstrap_start.cjs');

// --help exits 0 with usage.
const help = run(script, ['--help']);
assert.strictEqual(help.status, 0, help.stderr);
assert.match(help.stdout, /Usage: node bootstrap_start\.cjs <us_dir>/);

// Missing us_dir exits 2.
const missing = run(script, []);
assert.strictEqual(missing.status, 2, missing.stdout);
assert.match(missing.stderr, /us_dir is required/);

// Unknown flag exits 2.
const unknown = run(script, ['--wat']);
assert.strictEqual(unknown.status, 2, unknown.stderr);

// Not-a-directory exits 1 with JSON error.
const root = temp('ws-bootstrap-start-');
const notDir = write(path.join(root, 'file.txt'), 'x');
const bad = run(script, [notDir]);
assert.strictEqual(bad.status, 1, bad.stdout);
assert.strictEqual(JSON.parse(bad.stdout).error, 'not-a-directory');

// Empty directory exits 2 with no-bootstrap-candidates.
const empty = temp('ws-bootstrap-start-empty-');
const none = run(script, [empty]);
assert.strictEqual(none.status, 2, none.stdout);
assert.strictEqual(JSON.parse(none.stdout).error, 'no-bootstrap-candidates');

// Populated plan dir resolves earliest candidate with startedAt override data.
const usDir = temp('ws-bootstrap-start-full-');
write(path.join(usDir, 'step-00-demo.spec.md'), '# Demo\n');
write(path.join(usDir, 'run.state.md'), '---\nstartedAt: 2026-09-01T00:00:00Z\n---\n# state\n');
const ok = run(script, [usDir, '--json']);
assert.strictEqual(ok.status, 0, ok.stdout + ok.stderr);
const payload = JSON.parse(ok.stdout);
assert.strictEqual(payload.ok, true);
assert.ok(payload.firstFile, 'firstFile reported');
assert.ok(Array.isArray(payload.candidates) && payload.candidates.length >= 2, 'candidates listed');
assert.strictEqual(payload.startedAt, '2026-09-01T00:00:00Z');

console.log('test-bootstrap-start: ok');
