'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REVIEWER_URL = 'https://raw.githubusercontent.com/jpolvora/agentic-code-reviewers/release/run.sh';
const DEFAULT_ENGINE = 'opencode';
const DEFAULT_MODEL = 'opencode-go/mimo-v2.6-flash';
const DEFAULT_VARIANT = 'medium';
const EXTRA_EXCLUDES = '.agents/plans/**,.agents/specs/**';
const INCLUDE_PATTERNS = '**/*.md,**/*.mdc,**/*.yml,**/*.yaml,**/*.json,**/*.sh,**/*.ps1,**/*.psm1,**/*.psd1,**/*.cmd,**/*.js,**/*.ts,**/*.css,**/*.html,**/*.cjs,**/*.py,**/*.prd';

function resolveReviewerConfig(env = process.env) {
  const requestedEngine = String(env.AGENTIC_CODE_REVIEWERS_ENGINE || DEFAULT_ENGINE).trim() || DEFAULT_ENGINE;
  const engine = requestedEngine === 'cursor' || requestedEngine === 'cursor-sdk' ? 'cursor-sdk' : DEFAULT_ENGINE;
  const model = String(env.AGENTIC_CODE_REVIEWERS_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const variant = String(env.AGENTIC_CODE_REVIEWERS_VARIANT || DEFAULT_VARIANT).trim() || DEFAULT_VARIANT;
  const credential = engine === 'cursor-sdk' ? 'CURSOR_API_KEY' : 'OPENCODE_API_KEY';
  if (!String(env[credential] || '').trim()) {
    throw new Error(`${credential} is required for reviewer engine ${engine}`);
  }
  return { requestedEngine, engine, model, variant };
}

function buildReviewerArgs(config) {
  return [
    '--engine', config.engine,
    '--model', config.model,
    '--variant', config.variant,
    '--dry-run',
    '--stack', 'Custom',
    '--target-branch', 'refs/heads/main',
    '--custom-prompt', '.github/agentic-code-reviewers-prompt.md',
    '--score-min', '3',
    '--include-patterns', INCLUDE_PATTERNS,
  ];
}

function run() {
  const config = resolveReviewerConfig();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-skills-review-'));
  const runnerPath = path.join(tempRoot, 'run.sh');
  try {
    const download = spawnSync('curl', ['-fsSL', REVIEWER_URL, '-o', runnerPath], { stdio: 'inherit' });
    if (download.error) throw download.error;
    if (download.status !== 0) return download.status || 1;
    const review = spawnSync('bash', [runnerPath, ...buildReviewerArgs(config)], {
      stdio: 'inherit',
      env: {
        ...process.env,
        AGENTIC_CODE_REVIEWERS_EXTRA_EXCLUDE_PATTERNS: EXTRA_EXCLUDES,
      },
    });
    if (review.error) throw review.error;
    return review.status || 0;
  } finally {
    if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot, { recursive: true });
  }
}

module.exports = {
  buildReviewerArgs,
  resolveReviewerConfig,
  run,
};

if (require.main === module) {
  try {
    process.exitCode = run();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
