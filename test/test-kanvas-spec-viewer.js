/**
 * ws-kanvas spec viewer: GET /api/spec contract, path confinement, renderer subset, XSS escape.
 * Run: node test/test-kanvas-spec-viewer.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import nodeAssert from 'node:assert';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
assert.deepStrictEqual = nodeAssert.deepStrictEqual;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const collectPath = path.join(repoRoot, '.agents/skills/ws-kanvas/scripts/collect.cjs');
const serverPath = path.join(repoRoot, '.agents/skills/ws-kanvas/scripts/server.cjs');
const boardPath = path.join(repoRoot, '.agents/skills/ws-kanvas/refs/board.html');
const { readSpecMarkdown, isInsideSpecsDir } = require(collectPath);
const { start } = require(serverPath);

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

// --- Fixture tree ---
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kanvas-spec-'));
const specsDir = path.join(root, 'specs');
const plansDir = path.join(root, 'plans');
const indexPath = path.join(specsDir, 'index.PRD');
const SPEC_BODY = '# Viewer card\n\nBody text with **bold**.\n';
write(path.join(specsDir, 'viewer-card.spec.md'), `---\nslug: viewer-card\ntitle: "Viewer card"\n---\n\n${SPEC_BODY}`);
write(path.join(specsDir, 'bom-card.spec.md'), '\uFEFF---\nslug: bom-card\ntitle: "Bom card"\n---\n\nBOM body.\n');
write(indexPath, '# Fixture index\n');
fs.mkdirSync(plansDir, { recursive: true });

function get(port, route) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: route, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}
function post(port, route, payload) {
  const data = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: route, method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end(data);
  });
}

const { server, url } = await start({ args: { specsDir, plansDir, index: indexPath, port: '0' }, onReady: () => {} });
const port = new URL(url).port;
try {
  // --- V2: endpoint contract ---
  {
    const res = await get(port, '/api/spec?slug=viewer-card');
    assert(res.status === 200, 'known slug returns 200');
    const payload = JSON.parse(res.body);
    assert(payload.slug === 'viewer-card', 'payload echoes the slug');
    assert(typeof payload.path === 'string' && payload.path.endsWith('.spec.md'), 'payload carries the spec path');
    assert(payload.markdown === fs.readFileSync(path.join(specsDir, 'viewer-card.spec.md'), 'utf8'), 'markdown equals the file text');
  }
  {
    const res = await get(port, '/api/spec?slug=bom-card');
    const payload = JSON.parse(res.body);
    assert(res.status === 200 && !payload.markdown.startsWith('\uFEFF'), 'BOM is stripped from markdown');
  }
  {
    const res = await get(port, '/api/spec?slug=no-such-card');
    const payload = JSON.parse(res.body);
    assert(res.status === 404, 'unknown slug is non-200');
    assert(payload.error && payload.error.code === 'not-found', 'unknown slug yields typed not-found');
    assert(!('markdown' in payload), 'error responses carry no markdown');
  }
  {
    const res = await get(port, '/api/spec');
    assert(res.status === 400, 'missing slug is 400');
  }

  // --- V3: traversal battery (endpoint + helper level) ---
  for (const slug of ['..%2F..%2Fetc%2Fpasswd', '..%2F..%2Fviewer-card', '%2Fetc%2Fpasswd', '..\\..\\win', 'a%2Fb']) {
    const res = await get(port, `/api/spec?slug=${slug}`);
    const payload = JSON.parse(res.body);
    assert(res.status !== 200 && payload.error && !('markdown' in payload), `traversal slug refused: ${slug}`);
  }
  for (const slug of ['../viewer-card', '/etc/passwd', '..\\viewer-card', 'a/b']) {
    const result = readSpecMarkdown({ specsDir, plansDir, indexPath }, slug);
    assert(result.error && !('markdown' in result), `helper refuses traversal input: ${slug}`);
  }
  assert(isInsideSpecsDir(specsDir, path.join(specsDir, 'viewer-card.spec.md')) === true, 'inside probe accepts a real spec');
  assert(isInsideSpecsDir(specsDir, path.join(root, 'outside.txt')) === false, 'inside probe refuses an outside path');
  assert(isInsideSpecsDir(specsDir, path.join(specsDir, 'missing.spec.md')) === false, 'inside probe refuses a missing file');

  // --- V3: linked-escape fixture ---
  {
    const outside = path.join(root, 'outside');
    write(path.join(outside, 'evil.spec.md'), '---\nslug: evil-card\ntitle: "Evil"\n---\n\nescaped\n');
    let linkMade = false;
    try {
      if (process.platform === 'win32') {
        fs.symlinkSync(outside, path.join(specsDir, 'evil-link'), 'junction');
      } else {
        fs.symlinkSync(path.join(outside, 'evil.spec.md'), path.join(specsDir, 'evil.spec.md'));
      }
      linkMade = true;
    } catch {
      console.log('SKIP linked-escape fixture (cannot create links here)');
    }
    if (linkMade) {
      const res = await get(port, '/api/spec?slug=evil-card');
      const payload = JSON.parse(res.body);
      const refused = res.status !== 200 && payload.error && !('markdown' in payload);
      assert(refused, 'symlinked escape is refused with a typed error and no content');
      if (process.platform === 'win32') {
        assert(payload.error && payload.error.code === 'not-found', 'junction escape is refused at discovery (no card, no read)');
      }
      assert(isInsideSpecsDir(specsDir, path.join(specsDir, 'evil-link', 'evil.spec.md')) === false
        || isInsideSpecsDir(specsDir, path.join(specsDir, 'evil.spec.md')) === false,
        'inside probe refuses the linked escape directly');
    }
  }

  // --- V6: existing contracts unchanged ---
  {
    const boardRes = await get(port, '/api/board');
    const board = JSON.parse(boardRes.body);
    assert(boardRes.status === 200 && Array.isArray(board.columns) && Array.isArray(board.cards), 'board contract keeps columns and cards');
    const cardRes = await get(port, '/api/card?slug=viewer-card');
    const card = JSON.parse(cardRes.body);
    assert(cardRes.status === 200 && card.card && card.card.slug === 'viewer-card', 'card contract keeps the AC7 shape');
    const moveRes = await post(port, '/api/move', { slug: 'x' });
    assert(moveRes.status === 400, 'move contract keeps body validation');
  }
} finally {
  server.close();
}

// --- V4/V5: renderer subset + escape (extracted from board.html, DOM-free) ---
const page = fs.readFileSync(boardPath, 'utf8');
const startMark = '// __KANVAS_MD_RENDERER_START__';
const endMark = '// __KANVAS_MD_RENDERER_END__';
assert(page.includes(startMark) && page.includes(endMark), 'renderer extraction markers exist');
const rendererSrc = page.slice(page.indexOf(startMark), page.indexOf(endMark));
const renderMarkdown = new Function(`${rendererSrc}; return renderMarkdown;`)();
{
  const md = '# Title\n\n## Sub\n\nPara with **bold** and *em* and `code` and [link](https://example.com/x).\n\n- item one\n- item two\n\n1. first\n2. second\n\n```js\nconst x = 1;\n```\n';
  const out = renderMarkdown(md);
  assert(out.includes('<h1>Title</h1>'), 'renderer emits h1');
  assert(out.includes('<h2>Sub</h2>'), 'renderer emits h2');
  assert(out.includes('<strong>bold</strong>'), 'renderer emits strong');
  assert(out.includes('<em>em</em>'), 'renderer emits em');
  assert(out.includes('<code>code</code>'), 'renderer emits inline code');
  assert(out.includes('<a href="https://example.com/x">link</a>'), 'renderer emits links');
  assert(out.includes('<ul>') && out.includes('<li>item one</li>'), 'renderer emits unordered lists');
  assert(out.includes('<ol>') && out.includes('<li>first</li>'), 'renderer emits ordered lists');
  assert(out.includes('<p>Para with'), 'renderer emits paragraphs');
  assert(out.includes('<pre><code class="language-js">'), 'renderer emits fenced code blocks');
}
{
  const out = renderMarkdown('<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[click](javascript:alert(1))\n');
  assert(!out.includes('<script'), 'injected script tag never survives');
  assert(!out.includes('<img'), 'injected img tag never survives');
  assert(out.includes('&lt;script&gt;'), 'injected tags render as escaped visible text');
  assert(!out.includes('javascript:'), 'script-scheme link URLs are dropped');
  assert(out.includes('click'), 'unsafe link keeps its label text');
}
{
  const out = renderMarkdown('[mail](mailto:a@b.c) [frag](#sec) [rel](docs/x.md)\n');
  assert(out.includes('<a href="mailto:a@b.c">mail</a>'), 'mailto links are allowed');
  assert(out.includes('<a href="#sec">frag</a>'), 'fragment links are allowed');
  assert(out.includes('<a href="docs/x.md">rel</a>'), 'relative links are allowed');
}

// --- V1: toggle wiring present in the page ---
for (const needle of ['specSection()', 'id="spec-toggle"', 'Show spec', 'Hide spec', 'aria-expanded',
  'api/spec?slug=', 'id="spec-view"', 'Spec unavailable:', 'renderMarkdown(result.payload.markdown)']) {
  assert(page.includes(needle), `page wires the spec viewer: ${needle}`);
}
assert(page.includes('window.__kanvasRenderMarkdown'), 'renderer is exposed for automation');

// --- V7: stdlib-only requires, self-contained page ---
for (const file of [collectPath, serverPath]) {
  const src = fs.readFileSync(file, 'utf8');
  const reqs = [...src.matchAll(/require\((['"])([^'"]+)\1\)/g)].map((m) => m[2]);
  const bad = reqs.filter((r) => !(r.startsWith('node:') || r.startsWith('./') || r.startsWith('../') || ['fs', 'http', 'path', 'os', 'url', 'util'].includes(r)));
  assert(reqs.length > 0 && bad.length === 0, `${path.basename(file)} requires stdlib plus relative helpers only`);
}
assert(!/<script[^>]+src=["']https?:/.test(page), 'board page loads no remote scripts');

if (failures > 0) {
  console.error(`\ntest-kanvas-spec-viewer: ${failures} failure(s)`);
  process.exitCode = 1;
} else {
  console.log('test-kanvas-spec-viewer: ok');
}
