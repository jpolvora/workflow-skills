import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { buildReviewerArgs, buildReviewerEnv, resolveReviewerConfig } = require('../bin/review-dry-run.cjs');
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

const defaults = resolveReviewerConfig({ OPENCODE_API_KEY: 'test' });
assert.equal(defaults.engine, 'opencode');
assert.equal(defaults.model, 'opencode-go/mimo-v2.6-flash');
assert.equal(defaults.variant, 'medium');

const cursor = resolveReviewerConfig({
  AGENTIC_CODE_REVIEWERS_ENGINE: 'cursor',
  AGENTIC_CODE_REVIEWERS_MODEL: 'cursor-sdk/auto',
  AGENTIC_CODE_REVIEWERS_VARIANT: 'high',
  CURSOR_API_KEY: 'test',
});
assert.equal(cursor.engine, 'cursor-sdk');
assert.equal(cursor.model, 'cursor-sdk/auto');
assert.equal(cursor.variant, 'high');

assert.throws(
  () => resolveReviewerConfig({ AGENTIC_CODE_REVIEWERS_ENGINE: 'cursor-sdk' }),
  /CURSOR_API_KEY is required/,
);
assert.throws(
  () => resolveReviewerConfig({}),
  /OPENCODE_API_KEY is required/,
);

const args = buildReviewerArgs(cursor);
assert.deepEqual(args.slice(0, 6), ['--engine', 'cursor-sdk', '--model', 'cursor-sdk/auto', '--variant', 'high']);
assert.ok(args.includes('--dry-run'));
assert.ok(!args.includes('--gh'));
const defaultEnv = buildReviewerEnv({});
assert.equal(defaultEnv.AGENTIC_CODE_REVIEWERS_TIMEOUT_MS, '1200000');
assert.equal(defaultEnv.AGENTIC_CODE_REVIEWERS_EXTRA_EXCLUDE_PATTERNS, '.agents/plans/**,.agents/specs/**');
const overriddenEnv = buildReviewerEnv({ AGENTIC_CODE_REVIEWERS_TIMEOUT_MS: '900000' });
assert.equal(overriddenEnv.AGENTIC_CODE_REVIEWERS_TIMEOUT_MS, '900000');
assert.equal(pkg.scripts['review:dry'], 'node bin/review-dry-run.cjs');

console.log('test-review-dry-run: ok');
