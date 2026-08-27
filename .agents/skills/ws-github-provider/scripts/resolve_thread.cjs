const fs = require('fs');
const { fetchRetry } = require('../../ws-shared/scripts/http_retry.cjs');

const RESOLUTION_MARKER = '<!-- resolution-reply -->';
const MODEL_FOOTER_PREFIX = 'LLM model:';
const MIN_RESOLUTION_SUBSTANCE_CHARS = 40;
const THIN_RESOLUTION_ERROR =
  'resolve-thread: comment must describe the correction (what changed and why), not only a commit hash or LLM model footer.';
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;
const HASH_STATUS_PREFIX_RE =
  /^(?:corrigido|fixed|resolved|closed|done)(?:\s+(?:em|in|at|no))?(?:\s+commit)?[:\s]+[0-9a-f]{7,40}\.?\s*/i;
const SHA_ONLY_RE = /^[0-9a-f]{7,40}\.?$/i;
const METADATA_LINE_RE =
  /^(?:defectClass|sourcesConsulted|proactiveFixed|proactiveSkipped)\s*:/i;

function loadDotEnv() {
  if (!fs.existsSync('.env')) return;
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    process.env[key] = value.trim();
  }
}

function resolveToken() {
  const envToken =
    process.env.AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN;
  if (envToken) return envToken;

  try {
    const { execSync } = require('child_process');
    const token = execSync('gh auth token', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (token) return token;
  } catch (_err) {
    // gh CLI token retrieval unavailable
  }

  return null;
}

function appendModelFooter(body, model) {
  const text = String(body || '').trimEnd();
  const id = String(model || '').trim();
  if (!id) return text;
  if (text.toLowerCase().includes(MODEL_FOOTER_PREFIX.toLowerCase())) return text;
  return `${text}\n\n---\n${MODEL_FOOTER_PREFIX} ${id}`;
}

function resolutionCommentSubstance(comment) {
  let text = String(comment || '').replace(HTML_COMMENT_RE, '');
  text = text.replace(/\n---\s*\nLLM model:[\s\S]*$/i, '');
  text = text.replace(/^LLM model:\s*.+$/gim, '');
  const parts = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || line === '---' || line === '-') continue;
    if (METADATA_LINE_RE.test(line)) continue;
    line = line.replace(HASH_STATUS_PREFIX_RE, '').trim();
    if (!line || SHA_ONLY_RE.test(line)) continue;
    parts.push(line);
  }
  return parts.join(' ');
}

function assertResolutionNote(note) {
  if (resolutionCommentSubstance(note).length < MIN_RESOLUTION_SUBSTANCE_CHARS) {
    console.error(THIN_RESOLUTION_ERROR);
    process.exit(1);
  }
}

function buildResolutionBody(note, model) {
  const explanation = String(note || '').trim();
  const base = [RESOLUTION_MARKER, '', explanation].join('\n');
  return appendModelFooter(base, model);
}

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  let model = '';
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') continue;
    if (arg === '--model') {
      model = argv[i + 1] || '';
      i += 1;
      continue;
    }
    positional.push(arg);
  }
  return { dryRun, model, threadId: positional[0], note: positional[1] };
}

async function main() {
  loadDotEnv();

  const { dryRun, model, threadId, note } = parseArgs(process.argv.slice(2));

  if (!threadId) {
    console.error(
      'Usage: node resolve_thread.cjs <THREAD_ID> "<resolution note>" [--model <id>] [--dry-run]',
    );
    process.exit(1);
  }

  assertResolutionNote(note);
  const body = buildResolutionBody(note, model);

  if (dryRun) {
    console.log(`[dry-run] would resolve thread ${threadId} (no GraphQL).`);
    console.log(body);
    process.exit(0);
  }

  const token = resolveToken();
  if (!token) {
    console.error(
      'Error: Set AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN, GITHUB_TOKEN, or GH_TOKEN.',
    );
    process.exit(1);
  }

  const query = `
    mutation ResolveAndReply($threadId: ID!, $body: String!) {
      addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: $threadId, body: $body }) {
        comment { id }
      }
      resolveReviewThread(input: { threadId: $threadId }) {
        thread { id isResolved }
      }
    }
  `;

  const response = await fetchRetry('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'fix-pr-cooperative',
    },
    body: JSON.stringify({ query, variables: { threadId, body } }),
  });

  if (!response.ok) {
    console.error(`GitHub API failed: ${response.status} ${await response.text()}`);
    process.exit(1);
  }

  const result = await response.json();
  if (result.errors) {
    console.error('GraphQL errors:', JSON.stringify(result.errors, null, 2));
    process.exit(1);
  }

  const isResolved = result.data?.resolveReviewThread?.thread?.isResolved;
  if (isResolved) {
    console.log(`Resolved thread ${threadId} (cooperative resolution-reply posted).`);
  } else {
    console.error('Failed to resolve thread:', JSON.stringify(result.data, null, 2));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
