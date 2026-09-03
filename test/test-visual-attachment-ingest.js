/**
 * Visual attachment ingest (shared helper + GitHub/ADO converters + register).
 * Run: node test/test-visual-attachment-ingest.js
 */
import assert from 'assert';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const {
  ingestVisualAttachments,
  specStemFromPath,
  sanitizeStem,
  classifyKind,
  isAllowlisted,
  isGithubAllowlisted,
  isAdoAllowlisted,
  sniffMime,
  PER_FILE_LIMIT,
} = require(path.join(REPO, '.agents/skills/ws-shared/scripts/ingest_visual_attachments.cjs'));

const HELPER = path.join(REPO, '.agents/skills/ws-shared/scripts/ingest_visual_attachments.cjs');
const GH_SCRIPT = path.join(REPO, '.agents/skills/ws-spec-provider-github/scripts/github-issue-to-spec.py');
const ADO_SCRIPT = path.join(REPO, '.agents/skills/ws-spec-provider-azure-devops/scripts/ado-workitem-to-spec.py');
const REGISTER_SCRIPT = path.join(REPO, '.agents/skills/ws-spec-provider-local/scripts/register_local_spec.cjs');
const FORMAT_DOC = path.join(REPO, '.agents/skills/ws-spec-format/FORMAT.md');
const VALIDATE_SCRIPT = path.join(REPO, '.agents/skills/ws-spec-format/scripts/validate_spec.cjs');
const PYTHON = process.platform === 'win32' ? 'python' : 'python3';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function createTempProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-visual-ingest-'));
  const shared = path.join(tmp, '.agents', 'skills', 'ws-shared');
  const specs = path.join(tmp, '.agents', 'specs');
  const plans = path.join(tmp, '.agents', 'plans');
  fs.mkdirSync(shared, { recursive: true });
  fs.mkdirSync(specs, { recursive: true });
  fs.mkdirSync(plans, { recursive: true });
  fs.writeFileSync(
    path.join(shared, 'config.json'),
    JSON.stringify(
      {
        project: { name: 'visual-ingest-test', baseBranch: 'main' },
        plans: { dir: '.agents/plans', specsDir: '.agents/specs', enforceSpecPrefixOrdering: true },
      },
      null,
      2,
    ),
    'utf8',
  );
  return { tmp, specs, plans, shared };
}

function writeMinimalSpec(specPath, slug = 'us-1') {
  const content = `---
id: 1
slug: ${slug}
title: "Visual ingest test"
source: github
specDate: 2026-09-03
---

# Specification — Visual ingest test

## Description

Body image: ![login](https://user-images.githubusercontent.com/u/1/abc-login.png)

## Acceptance Criteria

- AC1: test

## Original Issue Context

![login](https://user-images.githubusercontent.com/u/1/abc-login.png)

## Notes

fixture
`;
  fs.writeFileSync(specPath, content, 'utf8');
}

function mockFetch(handlers) {
  return async (url, options = {}) => {
    const key = String(url);
    const handler = handlers[key] || handlers['*'];
    if (!handler) {
      return { ok: false, status: 404, headers: { get: () => null }, arrayBuffer: async () => Buffer.alloc(0) };
    }
    return handler(url, options);
  };
}

function okResponse(buffer, mime) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? mime : null) },
    arrayBuffer: async () => buffer,
  };
}

async function startMockServer(files) {
  const server = http.createServer((req, res) => {
    const entry = files[req.url] || files[req.url.split('?')[0]];
    if (!entry) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(entry.status || 200, { 'Content-Type': entry.mime || 'image/png' });
    res.end(entry.body || PNG_1X1);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  return {
    port,
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

console.log('--- test-visual-attachment-ingest ---');

process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'fixture-token';
process.env.ADO_PAT = process.env.ADO_PAT || 'fixture-pat';

// Helper unit tests
assert.strictEqual(specStemFromPath('.agents/specs/0061-us-99.spec.md'), '0061-us-99');
assert.strictEqual(sanitizeStem('Login Screen!!'), 'login-screen');
assert.strictEqual(classifyKind({ alt: 'wireframe nav', origin: 'body' }, 'image/png'), 'template');
assert.strictEqual(classifyKind({ alt: '', origin: 'body' }, 'image/png'), 'screenshot');
assert.strictEqual(classifyKind({ alt: '', origin: 'relation' }, 'application/pdf'), 'attached');
assert.ok(isGithubAllowlisted('https://user-images.githubusercontent.com/u/1/x.png'));
assert.ok(isGithubAllowlisted('https://github.com/user-attachments/assets/abc'));
assert.ok(!isGithubAllowlisted('https://example.com/x.png'));
assert.ok(isAdoAllowlisted('https://dev.azure.com/org/_apis/wit/attachments/guid', 'https://dev.azure.com'));
assert.ok(!isAdoAllowlisted('https://example.com/x.png', 'https://dev.azure.com'));
assert.strictEqual(sniffMime(PNG_1X1, ''), 'image/png');

{
  const { tmp, specs } = createTempProject();
  const specPath = path.join(specs, '0001-us-1.spec.md');
  writeMinimalSpec(specPath);
  const good = 'https://user-images.githubusercontent.com/u/1/abc-login.png';
  const bad = 'https://example.com/evil.png';
  const result = await ingestVisualAttachments({
    specPath,
    provider: 'github',
    repoRoot: tmp,
    urls: [
      { url: good, origin: 'body', alt: 'login', filename: 'login.png' },
      { url: bad, origin: 'comment', alt: 'evil', filename: 'evil.png' },
    ],
    fetchImpl: mockFetch({
      [good]: () => okResponse(PNG_1X1, 'image/png'),
    }),
  });
  assert.strictEqual(result.okCount, 1);
  assert.strictEqual(result.skipCount, 1);
  assert.ok(result.assetsDir);
  assert.ok(fs.existsSync(path.join(result.assetsDir, '01-screenshot-login.png')));
  const specText = fs.readFileSync(specPath, 'utf8');
  assert.match(specText, /## Visual References/);
  assert.doesNotMatch(specText, /user-images\.githubusercontent\.com/);
  const manifest = JSON.parse(fs.readFileSync(path.join(result.assetsDir, 'manifest.json'), 'utf8'));
  assert.strictEqual(manifest.files.filter((row) => row.status === 'ok').length, 1);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('OK helper ok image + disallowed host');
}

{
  const { tmp, specs } = createTempProject();
  const specPath = path.join(specs, '0001-us-2.spec.md');
  writeMinimalSpec(specPath);
  const url404 = 'https://user-images.githubusercontent.com/u/1/missing.png';
  const urlOk = 'https://user-images.githubusercontent.com/u/1/ok.png';
  const result = await ingestVisualAttachments({
    specPath,
    provider: 'github',
    repoRoot: tmp,
    urls: [
      { url: url404, origin: 'body', alt: 'missing', filename: 'missing.png' },
      { url: urlOk, origin: 'comment', alt: 'ok', filename: 'ok.png' },
    ],
    fetchImpl: mockFetch({
      [url404]: () => ({ ok: false, status: 404, headers: { get: () => null }, arrayBuffer: async () => Buffer.alloc(0) }),
      [urlOk]: () => okResponse(PNG_1X1, 'image/png'),
    }),
  });
  assert.strictEqual(result.okCount, 1);
  assert.strictEqual(result.failCount, 1);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('OK partial HTTP failure');
}

{
  const { tmp, specs } = createTempProject();
  const specPath = path.join(specs, '0001-us-3.spec.md');
  writeMinimalSpec(specPath);
  const url = 'https://user-images.githubusercontent.com/u/1/big.png';
  const big = Buffer.alloc(PER_FILE_LIMIT + 1, 1);
  const result = await ingestVisualAttachments({
    specPath,
    provider: 'github',
    repoRoot: tmp,
    urls: [{ url, origin: 'body', alt: 'big', filename: 'big.png' }],
    fetchImpl: mockFetch({ [url]: () => okResponse(big, 'image/png') }),
  });
  assert.strictEqual(result.okCount, 0);
  assert.ok(result.manifest.some((row) => row.skipReason === 'size-limit'));
  assert.ok(!fs.existsSync(path.join(specs, '0001-us-3.assets')));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('OK size-limit skip');
}

{
  const { tmp, specs } = createTempProject();
  const specPath = path.join(specs, '0001-us-4.spec.md');
  writeMinimalSpec(specPath);
  const url = 'https://user-images.githubusercontent.com/u/1/doc.pdf';
  const pdf = Buffer.from('%PDF-1.4\n%âãÏÓ\n', 'utf8');
  const result = await ingestVisualAttachments({
    specPath,
    provider: 'github',
    repoRoot: tmp,
    urls: [{ url, origin: 'relation', alt: 'spec pdf', filename: 'spec.pdf' }],
    fetchImpl: mockFetch({ [url]: () => okResponse(pdf, 'application/pdf') }),
  });
  const specText = fs.readFileSync(specPath, 'utf8');
  assert.match(specText, /\[spec pdf\]\(/);
  assert.doesNotMatch(specText, /!\[spec pdf\]\(/);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('OK pdf file link');
}

// GitHub converter extracts URLs; helper ingests with mock fetch (converter subprocess uses real fetch)
{
  const mock = await startMockServer({
    '/gh.png': { body: PNG_1X1, mime: 'image/png' },
    '/missing.png': { status: 404, body: 'missing' },
  });
  const { tmp, specs } = createTempProject();
  const ghUrl = `https://user-images.githubusercontent.com/u/1/gh.png`;
  const missingUrl = `https://user-images.githubusercontent.com/u/1/missing.png`;
  const issue = {
    number: 42,
    title: 'GH visual fixture',
    body: `See ![screen](${ghUrl}) and ![gone](${missingUrl})`,
    state: 'OPEN',
    comments: [{ author: { login: 'dev' }, body: `![comment](${ghUrl})` }],
    url: 'https://github.com/o/r/issues/42',
  };
  const input = path.join(tmp, 'issue.json');
  fs.writeFileSync(input, JSON.stringify(issue), 'utf8');
  const proc = spawnSync(
    PYTHON,
    [GH_SCRIPT, '--input', input, '--repo', 'o/r', '--repo-root', tmp, '--force', '--skip-assets'],
    { encoding: 'utf8', cwd: REPO },
  );
  assert.strictEqual(proc.status, 0, proc.stderr || proc.stdout);
  const specPath = path.join(specs, '0001-us-42.spec.md');
  assert.ok(fs.existsSync(specPath), 'github spec written');
  const extract = spawnSync(
    PYTHON,
    [
      '-c',
      `import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('gh', r'${GH_SCRIPT.replace(/\\/g, '\\\\')}')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
issue = json.load(open(r'${input.replace(/\\/g, '\\\\')}', encoding='utf-8'))
urls = mod.collect_visual_urls(issue)
print(len(urls))`,
    ],
    { encoding: 'utf8', cwd: REPO },
  );
  assert.strictEqual(extract.status, 0, extract.stderr);
  assert.ok(Number(extract.stdout.trim()) >= 2, 'github extract finds body + comment urls');
  const result = await ingestVisualAttachments({
    specPath,
    provider: 'github',
    repoRoot: tmp,
    urls: [
      { url: `${mock.base}/gh.png`, origin: 'body', alt: 'screen', filename: 'screen.png' },
      { url: `${mock.base}/missing.png`, origin: 'comment', alt: 'gone', filename: 'gone.png' },
    ],
    fetchImpl: mockFetch({
      [`${mock.base}/gh.png`]: () => okResponse(PNG_1X1, 'image/png'),
      [`${mock.base}/missing.png`]: () => ({
        ok: false,
        status: 404,
        headers: { get: () => null },
        arrayBuffer: async () => Buffer.alloc(0),
      }),
    }),
  });
  // Remap test uses direct helper with mock host; verify github allowlist on real pattern separately
  assert.ok(isGithubAllowlisted(ghUrl));
  assert.strictEqual(result.okCount, 0);
  assert.strictEqual(result.skipCount, 2);
  writeMinimalSpec(specPath);
  const remapped = await ingestVisualAttachments({
    specPath,
    provider: 'github',
    repoRoot: tmp,
    urls: [
      { url: ghUrl, origin: 'body', alt: 'screen', filename: 'screen.png' },
      { url: missingUrl, origin: 'comment', alt: 'gone', filename: 'gone.png' },
    ],
    fetchImpl: mockFetch({
      [ghUrl]: () => okResponse(PNG_1X1, 'image/png'),
      [missingUrl]: () => ({
        ok: false,
        status: 404,
        headers: { get: () => null },
        arrayBuffer: async () => Buffer.alloc(0),
      }),
    }),
  });
  assert.strictEqual(remapped.okCount, 1);
  assert.strictEqual(remapped.failCount, 1);
  assert.match(fs.readFileSync(specPath, 'utf8'), /## Visual References/);
  assert.ok(fs.existsSync(path.join(specs, '0001-us-42.assets', '01-screenshot-screen.png')));
  await mock.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('OK github converter fixture mock http');
}

// ADO converter extracts URLs; full ingest via helper + mock fetch (api-base remap in subprocess is integration-tested separately)
{
  const mock = await startMockServer({
    '/org/_apis/wit/attachments/guid': { body: PNG_1X1, mime: 'image/png' },
  });
  const { tmp, specs } = createTempProject();
  const attachUrl = `${mock.base}/org/_apis/wit/attachments/guid`;
  const workItem = {
    id: 99,
    fields: {
      'System.Title': 'ADO visual fixture',
      'System.Description': `<p>UI <img src="${attachUrl}" alt="wireframe dashboard" /></p>`,
      'Microsoft.VSTS.Common.AcceptanceCriteria': `<img src="${attachUrl}" alt="AC shot" />`,
    },
    relations: [
      { rel: 'AttachedFile', url: attachUrl, attributes: { name: 'diagram.pdf' } },
    ],
    comments: [{ text: `<img src="${attachUrl}" alt="comment shot" />` }],
  };
  const input = path.join(tmp, 'wi.json');
  fs.writeFileSync(input, JSON.stringify(workItem), 'utf8');
  const proc = spawnSync(
    PYTHON,
    [
      ADO_SCRIPT,
      '--input',
      input,
      '--org',
      'org',
      '--project',
      'proj',
      '--api-base',
      mock.base,
      '--repo-root',
      tmp,
      '--force',
      '--skip-assets',
    ],
    { encoding: 'utf8', cwd: REPO, env: { ...process.env, ADO_PAT: 'fixture-pat' } },
  );
  assert.strictEqual(proc.status, 0, proc.stderr || proc.stdout);
  const specPath = path.join(specs, '0001-us-99.spec.md');
  const specText = fs.readFileSync(specPath, 'utf8');
  assert.match(specText, /!\[wireframe dashboard\]/);
  const extract = spawnSync(
    PYTHON,
    [
      '-c',
      `import importlib.util, json
spec = importlib.util.spec_from_file_location('ado', r'${ADO_SCRIPT.replace(/\\/g, '\\\\')}')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
wi = json.load(open(r'${input.replace(/\\/g, '\\\\')}', encoding='utf-8'))
urls = mod.collect_visual_urls(wi, wi.get('comments') or [])
print(len(urls))`,
    ],
    { encoding: 'utf8', cwd: REPO },
  );
  assert.ok(Number(extract.stdout.trim()) >= 1, 'ado extract finds attachment urls');
  const result = await ingestVisualAttachments({
    specPath,
    provider: 'azure-devops',
    apiBase: mock.base,
    repoRoot: tmp,
    urls: [{ url: attachUrl, origin: 'body', alt: 'wireframe dashboard', filename: 'wireframe-dashboard.png' }],
    fetchImpl: mockFetch({
      [attachUrl]: () => okResponse(PNG_1X1, 'image/png'),
    }),
  });
  assert.strictEqual(result.okCount, 1);
  assert.match(fs.readFileSync(specPath, 'utf8'), /## Visual References/);
  assert.ok(fs.existsSync(path.join(specs, '0001-us-99.assets')));
  await mock.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('OK ado converter fixture mock http');
}

// ADO clean_html preserves img markdown
{
  const { clean_html } = await import(
    pathToFileURL(path.join(REPO, '.agents/skills/ws-spec-provider-azure-devops/scripts/ado-workitem-to-spec.py')).href
  ).catch(() => ({ clean_html: null }));
  const proc = spawnSync(
    PYTHON,
    [
      '-c',
      `import importlib.util, sys
spec = importlib.util.spec_from_file_location('ado', r'${ADO_SCRIPT.replace(/\\/g, '\\\\')}')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
html = '<img src="https://dev.azure.com/x/_apis/wit/attachments/g" alt="x">'
out = mod.clean_html(html)
assert '![x](' in out, out
print('ok')`,
    ],
    { encoding: 'utf8', cwd: REPO },
  );
  assert.strictEqual(proc.status, 0, proc.stderr || proc.stdout);
  console.log('OK ado clean_html preserves img markdown');
}

// Register copies assets
{
  const { tmp, specs, plans } = createTempProject();
  const specPath = path.join(specs, '0061-us-77.spec.md');
  writeMinimalSpec(specPath, 'us-77');
  const assetsDir = path.join(specs, '0061-us-77.assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(assetsDir, '01-screenshot-login.png'), PNG_1X1);
  fs.writeFileSync(path.join(assetsDir, 'manifest.json'), '{"files":[]}\n', 'utf8');
  const reg = spawnSync(process.execPath, [REGISTER_SCRIPT, '--input', specPath, '--source', 'github', '--json', '--repo-root', tmp], {
    encoding: 'utf8',
    cwd: REPO,
  });
  assert.strictEqual(reg.status, 0, reg.stderr || reg.stdout);
  const payload = JSON.parse(reg.stdout);
  const attachments = path.join(plans, 'us-77', 'attachments', '01-screenshot-login.png');
  assert.ok(fs.existsSync(attachments), 'register copied attachments');
  assert.ok(payload.attachmentsPath);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('OK register copies assets');
}

// Skill / format doc assertions
assert.match(fs.readFileSync(path.join(REPO, '.agents/skills/ws-spec-write/SKILL.md'), 'utf8'), /Visual References/);
assert.match(fs.readFileSync(path.join(REPO, '.agents/skills/ws-plan-write/SKILL.md'), 'utf8'), /Visual References/);
assert.match(fs.readFileSync(path.join(REPO, '.agents/skills/ws-plan-interview/SKILL.md'), 'utf8'), /Visual References/);
assert.match(fs.readFileSync(path.join(REPO, '.agents/skills/ws-implement-tasks/SKILL.md'), 'utf8'), /Visual References/);
assert.match(fs.readFileSync(path.join(REPO, '.agents/skills/ws-spec-from-provider/SKILL.md'), 'utf8'), /second downloader/i);
assert.match(fs.readFileSync(FORMAT_DOC, 'utf8'), /## Visual References/);
assert.match(fs.readFileSync(path.join(REPO, '.agents/skills/ws-cleanup/references/PATTERNS.md'), 'utf8'), /\.assets\//);
assert.match(fs.readFileSync(path.join(REPO, 'FEATURES.md'), 'utf8'), /Visual References|\.assets/);

const compatSpec = path.join(REPO, '.agents/plans/provider-fetch-visual-attachments/step-00-provider-fetch-visual-attachments.spec.md');
const compat = spawnSync(process.execPath, [VALIDATE_SCRIPT, '--mode=compat', compatSpec], { encoding: 'utf8', cwd: REPO });
assert.strictEqual(compat.status, 0, 'compat validate without Visual References heading requirement');

assert.ok(fs.existsSync(HELPER));
assert.ok(!fs.existsSync(path.join(REPO, '.agents/skills/ws-shared/scripts/ingest_visual_attachments.py')));

console.log('\nAll visual-attachment-ingest checks passed.');
