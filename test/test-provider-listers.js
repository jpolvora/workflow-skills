import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run } = utils;
const scripts = path.join(repoRoot, '.agents/skills/ws-spec-from-provider/scripts');
const issues = path.join(scripts, 'list_open_issues.cjs');
const stories = path.join(scripts, 'list_my_user_stories.cjs');

// --help exits 0 for both listers (no network, no gh).
for (const script of [issues, stories]) {
  const help = run(script, ['--help']);
  assert.strictEqual(help.status, 0, `${script}: ${help.stderr}`);
  assert.match(help.stdout, /Usage: node list_/);
}

// Invalid --limit fails fast with exit 2 (before any network).
for (const script of [issues, stories]) {
  const bad = run(script, ['--limit', 'abc']);
  assert.strictEqual(bad.status, 2, `${script}: ${bad.stdout}`);
  assert.match(bad.stderr, /invalid int value/);
}

// Missing-argument value fails with exit 2.
const dangling = run(issues, ['--limit']);
assert.strictEqual(dangling.status, 2, dangling.stderr);

// Empty repo root (no config, no PAT, no gh): fail before network with exit != 0.
const empty = temp('ws-provider-listers-');
const noCfgIssues = run(issues, ['--repo-root', empty, '--owner', 'o', '--repo', 'r', '--limit', '5']);
assert.notStrictEqual(noCfgIssues.status, 0, 'issues lister must fail without config');
assert.match(noCfgIssues.stderr, /config\.json|owner|repo|gh/i);
const noCfgStories = run(stories, ['--repo-root', empty, '--org', 'o', '--project', 'p']);
assert.notStrictEqual(noCfgStories.status, 0, 'stories lister must fail without config/PAT');
assert.match(noCfgStories.stderr, /config\.json|PAT/i);

// Unknown argument exits 2.
const unknown = run(stories, ['--bogus']);
assert.strictEqual(unknown.status, 2, unknown.stderr);

console.log('test-provider-listers: ok');
