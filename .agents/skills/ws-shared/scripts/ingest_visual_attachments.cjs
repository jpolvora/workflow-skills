'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { fetchRetry } = require('./http_retry.cjs');

const PER_FILE_LIMIT = 10 * 1024 * 1024;
const RUN_LIMIT = 50 * 1024 * 1024;
const TIMEOUT_MS = 30_000;

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const DISALLOWED_MIME = new Set([
  'image/svg+xml',
  'text/html',
  'application/xhtml+xml',
  'application/x-msdownload',
  'application/x-executable',
  'application/octet-stream',
]);

const EXT_BY_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const GITHUB_HOSTS = new Set([
  'user-images.githubusercontent.com',
  'private-user-images.githubusercontent.com',
  'objects.githubusercontent.com',
]);

function parseArgs(argv) {
  const options = {
    specPath: null,
    urlsJson: null,
    provider: null,
    apiBase: 'https://dev.azure.com',
    authEnv: 'ADO_PAT',
    skipAssets: false,
    json: false,
    repoRoot: process.cwd(),
    fetchRemapFile: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      options.help = true;
      return options;
    }
    if (token === '--spec-path') options.specPath = argv[++i];
    else if (token === '--urls-json') options.urlsJson = argv[++i];
    else if (token === '--provider') options.provider = argv[++i];
    else if (token === '--api-base') options.apiBase = argv[++i];
    else if (token === '--auth-env') options.authEnv = argv[++i];
    else if (token === '--repo-root') options.repoRoot = argv[++i];
    else if (token === '--skip-assets') options.skipAssets = true;
    else if (token === '--json') options.json = true;
    else if (token === '--fetch-remap-file') options.fetchRemapFile = argv[++i];
    else if (token.startsWith('--spec-path=')) options.specPath = token.slice('--spec-path='.length);
    else if (token.startsWith('--urls-json=')) options.urlsJson = token.slice('--urls-json='.length);
    else if (token.startsWith('--provider=')) options.provider = token.slice('--provider='.length);
    else if (token.startsWith('--api-base=')) options.apiBase = token.slice('--api-base='.length);
    else if (token.startsWith('--auth-env=')) options.authEnv = token.slice('--auth-env='.length);
    else if (token.startsWith('--repo-root=')) options.repoRoot = token.slice('--repo-root='.length);
    else if (token.startsWith('--fetch-remap-file=')) options.fetchRemapFile = token.slice('--fetch-remap-file='.length);
    else throw new Error(`unknown argument: ${token}`);
  }
  return options;
}

function specStemFromPath(specPath) {
  const base = path.basename(specPath);
  return base.replace(/\.spec\.md$/i, '');
}

function sanitizeStem(value) {
  const raw = String(value || 'asset')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();
  const stem = raw || 'asset';
  return stem.length > 48 ? stem.slice(0, 48) : stem;
}

function isImageMime(mime) {
  return typeof mime === 'string' && mime.startsWith('image/');
}

function classifyKind(item, mime) {
  const hay = `${item.alt || ''} ${item.filename || ''}`.toLowerCase();
  if (/\b(screenshot|print)\b/.test(hay)) return 'screenshot';
  if (/\b(template|mock|wireframe)\b/.test(hay)) return 'template';
  if (/\b(example|sample)\b/.test(hay)) return 'example';
  if (isImageMime(mime) || (!mime && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(item.url || ''))) {
    return 'screenshot';
  }
  const origin = item.origin || 'body';
  if (origin === 'comment') return 'comment';
  if (origin === 'relation') return 'attached';
  return 'inline';
}

function stripQuerySecrets(urlString) {
  try {
    const parsed = new URL(urlString);
    parsed.search = '';
    parsed.hash = '';
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return String(urlString).split('?')[0].split('#')[0];
  }
}

function sourceHost(urlString) {
  try {
    return new URL(urlString).host;
  } catch {
    return '';
  }
}

function isGithubAllowlisted(urlString) {
  try {
    const parsed = new URL(urlString);
    if (GITHUB_HOSTS.has(parsed.host)) return true;
    if (parsed.host === 'github.com' && parsed.pathname.startsWith('/user-attachments/')) return true;
    return false;
  } catch {
    return false;
  }
}

function normalizeApiBase(apiBase) {
  try {
    const parsed = new URL(apiBase);
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return String(apiBase || '').replace(/\/+$/, '').toLowerCase();
  }
}

const ADO_HOST_SUFFIXES = ['dev.azure.com', 'visualstudio.com'];

function isAdoAttachmentHost(host) {
  const h = String(host || '').toLowerCase();
  return ADO_HOST_SUFFIXES.some((suffix) => h === suffix || h.endsWith(`.${suffix}`));
}

function isAdoAllowlisted(urlString, apiBase) {
  try {
    const parsed = new URL(urlString);
    if (!parsed.pathname.includes('/_apis/wit/attachments/')) return false;
    const base = normalizeApiBase(apiBase);
    if (base) {
      const hostBase = `${parsed.protocol}//${parsed.host}`.toLowerCase();
      if (hostBase === base) return true;
    }
    return isAdoAttachmentHost(parsed.host);
  } catch {
    return false;
  }
}

function resolveFetchUrl(urlString, fetchRemapFile = null) {
  const file = fetchRemapFile || process.env.WS_VISUAL_INGEST_FETCH_REMAP_FILE;
  if (file) {
    try {
      const map = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
      const mapped = map[urlString];
      if (process.env.WS_INGEST_DEBUG) {
        process.stderr.write(
          `remap lookup url=${JSON.stringify(urlString)} keys=${JSON.stringify(Object.keys(map))} hit=${Boolean(mapped)}\n`,
        );
      }
      if (mapped) return mapped;
    } catch (err) {
      if (process.env.WS_INGEST_DEBUG) {
        process.stderr.write(`remap error: ${err.message} file=${file}\n`);
      }
    }
  }
  const raw = process.env.WS_VISUAL_INGEST_FETCH_REMAP;
  if (!raw) return urlString;
  try {
    const map = JSON.parse(raw);
    if (map[urlString]) return map[urlString];
  } catch {
    // ignore invalid remap JSON
  }
  return urlString;
}

function isAllowlisted(urlString, provider, apiBase) {
  if (provider === 'github') return isGithubAllowlisted(urlString);
  if (provider === 'azure-devops') return isAdoAllowlisted(urlString, apiBase);
  return false;
}

function sniffMime(buffer, headerMime) {
  const header = String(headerMime || '').split(';')[0].trim().toLowerCase();
  if (header && ALLOWED_MIME.has(header)) return header;
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer.length >= 6 && buffer.slice(0, 6).toString('ascii') === 'GIF89a') return 'image/gif';
  if (buffer.length >= 6 && buffer.slice(0, 6).toString('ascii') === 'GIF87a') return 'image/gif';
  if (buffer.length >= 12 && buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  if (buffer.length >= 5 && buffer.slice(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (header) return header;
  return '';
}

function extFromMimeOrUrl(mime, urlString) {
  if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  try {
    const parsed = new URL(urlString);
    const ext = path.extname(parsed.pathname);
    if (ext && ext.length <= 8) return ext.toLowerCase();
  } catch {
    // ignore
  }
  return '.bin';
}

function resolveGithubToken() {
  const envToken =
    process.env.AGENTIC_CODE_REVIEWERS_GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN;
  if (envToken) return envToken;
  try {
    return execSync('gh auth token', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

function resolveAdoPat(authEnv) {
  for (const key of [authEnv, 'ADO_PAT', 'AZURE_DEVOPS_PAT']) {
    if (!key) continue;
    const value = process.env[key];
    if (value && String(value).trim()) return String(value).trim();
  }
  return null;
}

function authHeaders(provider, authEnv) {
  if (provider === 'github') {
    const token = resolveGithubToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  if (provider === 'azure-devops') {
    const pat = resolveAdoPat(authEnv);
    if (!pat) return {};
    const encoded = Buffer.from(`:${pat}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }
  return {};
}

function repoRelative(fromRoot, absPath) {
  const rel = path.relative(path.resolve(fromRoot), path.resolve(absPath)).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..')) return absPath.replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function insertVisualReferences(specText, section) {
  const marker = '\n## Original Issue Context\n';
  const idx = specText.indexOf(marker);
  if (idx !== -1) {
    const after = idx + marker.length;
    const rest = specText.slice(after);
    const nextHeading = rest.search(/\n## [^\n#]/);
    const insertAt = nextHeading === -1 ? specText.length : after + nextHeading;
    return `${specText.slice(0, insertAt).replace(/\s*$/, '')}\n\n${section}\n${specText.slice(insertAt)}`;
  }
  const notesMarker = '\n## Notes\n';
  const notesIdx = specText.indexOf(notesMarker);
  if (notesIdx !== -1) {
    return `${specText.slice(0, notesIdx).replace(/\s*$/, '')}\n\n${section}\n${specText.slice(notesIdx)}`;
  }
  return `${specText.replace(/\s*$/, '')}\n\n${section}\n`;
}

function rewriteSpecUrls(specText, replacements) {
  let next = specText;
  for (const [remote, local] of replacements) {
    next = next.split(remote).join(local);
    const noQuery = stripQuerySecrets(remote);
    if (noQuery !== remote) next = next.split(noQuery).join(local);
  }
  return next;
}

function buildVisualReferencesSection(rows, assetsDirRel) {
  const lines = ['## Visual References', ''];
  for (const row of rows) {
    const caption = row.caption || row.kind || 'reference';
    const relPath = `${assetsDirRel}/${row.localPath}`.replace(/\\/g, '/');
    if (row.mime === 'application/pdf') lines.push(`[${caption}](${relPath})`);
    else lines.push(`![${caption}](${relPath})`);
    lines.push('');
  }
  lines.push('| path | kind | origin | caption |');
  lines.push('|------|------|--------|---------|');
  for (const row of rows) {
    const relPath = `${assetsDirRel}/${row.localPath}`.replace(/\\/g, '/');
    lines.push(`| ${relPath} | ${row.kind} | ${row.origin} | ${row.caption || ''} |`);
  }
  return lines.join('\n');
}

async function ingestVisualAttachments(options) {
  const {
    specPath,
    urls = [],
    provider,
    apiBase = 'https://dev.azure.com',
    authEnv = 'ADO_PAT',
    skipAssets = false,
    fetchImpl = fetch,
    repoRoot = process.cwd(),
    headersOverride = undefined,
    fetchRemapFile = null,
  } = options;

  if (!specPath) throw new Error('specPath is required');
  if (!provider) throw new Error('provider is required');

  const specAbs = path.resolve(specPath);
  const specDir = path.dirname(specAbs);
  const specStem = specStemFromPath(specAbs);
  const assetsDirAbs = path.join(specDir, `${specStem}.assets`);
  const assetsDirRel = repoRelative(repoRoot, assetsDirAbs).replace(/\\/g, '/');

  const manifest = [];
  let runBytes = 0;
  let okCount = 0;
  let skipCount = 0;
  let failCount = 0;
  let seq = 0;

  if (skipAssets) {
    for (const item of urls) {
      manifest.push({
        localPath: '',
        kind: classifyKind(item, ''),
        origin: item.origin || 'body',
        status: 'skipped',
        skipReason: 'skip-assets',
        sha256: '',
        bytes: 0,
        mime: '',
        sourceHost: sourceHost(item.url || ''),
        sourceUrl: stripQuerySecrets(item.url || ''),
      });
      skipCount += 1;
    }
    return {
      assetsDir: null,
      manifest,
      okCount,
      skipCount,
      failCount,
      specPath: specAbs,
    };
  }

  const headers = headersOverride !== undefined ? headersOverride : authHeaders(provider, authEnv);
  const replacements = [];

  for (const item of urls) {
    const url = String(item.url || '').trim();
    const row = {
      localPath: '',
      kind: 'inline',
      origin: item.origin || 'body',
      status: 'skipped',
      skipReason: '',
      sha256: '',
      bytes: 0,
      mime: '',
      sourceHost: sourceHost(url),
      sourceUrl: stripQuerySecrets(url),
      caption: item.caption || item.alt || item.filename || '',
    };

    if (!url) {
      row.skipReason = 'disallowed-host';
      skipCount += 1;
      manifest.push(row);
      continue;
    }

    if (!isAllowlisted(url, provider, apiBase)) {
      row.skipReason = 'disallowed-host';
      skipCount += 1;
      manifest.push(row);
      continue;
    }

    if (!Object.keys(headers).length) {
      row.status = 'skipped';
      row.skipReason = 'missing-auth';
      skipCount += 1;
      manifest.push(row);
      continue;
    }

    const fetchUrl = resolveFetchUrl(url, fetchRemapFile);
    if (process.env.WS_INGEST_DEBUG) {
      process.stderr.write(`fetching ${fetchUrl}\n`);
    }
    let response;
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
      response = await fetchRetry(
        fetchUrl,
        { headers, signal: controller ? controller.signal : undefined },
        { fetchImpl, attempts: 1 },
      );
      if (timer) clearTimeout(timer);
    } catch {
      row.status = 'failed';
      failCount += 1;
      manifest.push(row);
      continue;
    }

    if (!response.ok) {
      row.status = 'failed';
      failCount += 1;
      manifest.push(row);
      continue;
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > PER_FILE_LIMIT || runBytes + contentLength > RUN_LIMIT) {
      row.skipReason = 'size-limit';
      skipCount += 1;
      manifest.push(row);
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > PER_FILE_LIMIT || runBytes + buffer.length > RUN_LIMIT) {
      row.skipReason = 'size-limit';
      skipCount += 1;
      manifest.push(row);
      continue;
    }

    const mime = sniffMime(buffer, response.headers.get('content-type'));
    row.mime = mime;
    row.kind = classifyKind(item, mime);

    if (!mime || DISALLOWED_MIME.has(mime) || !ALLOWED_MIME.has(mime)) {
      row.skipReason = 'disallowed-type';
      skipCount += 1;
      manifest.push(row);
      continue;
    }

    seq += 1;
    const nn = String(seq).padStart(2, '0');
    const stem = sanitizeStem(item.alt || item.filename || item.caption || 'asset');
    const ext = extFromMimeOrUrl(mime, url);
    const fileName = `${nn}-${row.kind}-${stem}${ext}`;
    row.localPath = fileName;
    row.bytes = buffer.length;
    row.sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    row.status = 'ok';
    row.skipReason = '';
    runBytes += buffer.length;
    okCount += 1;
    row._buffer = buffer;
    manifest.push(row);
    replacements.push([url, `${assetsDirRel}/${fileName}`.replace(/\\/g, '/')]);
  }

  if (!okCount) {
    return {
      assetsDir: null,
      manifest,
      okCount,
      skipCount,
      failCount,
      specPath: specAbs,
    };
  }

  fs.mkdirSync(assetsDirAbs, { recursive: true });
  for (const row of manifest.filter((entry) => entry.status === 'ok')) {
    const filePath = path.join(assetsDirAbs, row.localPath);
    fs.writeFileSync(filePath, row._buffer);
    delete row._buffer;
  }

  const okRows = manifest.filter((entry) => entry.status === 'ok');
  let specText = fs.readFileSync(specAbs, 'utf8');
  specText = rewriteSpecUrls(specText, replacements);
  const section = buildVisualReferencesSection(okRows, assetsDirRel);
  specText = insertVisualReferences(specText, section);
  fs.writeFileSync(specAbs, specText, 'utf8');
  fs.writeFileSync(
    path.join(assetsDirAbs, 'manifest.json'),
    `${JSON.stringify({ files: manifest }, null, 2)}\n`,
    'utf8',
  );

  return {
    assetsDir: assetsDirAbs,
    manifest,
    okCount,
    skipCount,
    failCount,
    specPath: specAbs,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'Usage: ingest_visual_attachments.cjs --spec-path <file> --urls-json <file> --provider github|azure-devops [--api-base URL] [--auth-env NAME] [--skip-assets] [--json]\n',
    );
    return;
  }
  if (!args.specPath || !args.urlsJson || !args.provider) {
    throw new Error('--spec-path, --urls-json, and --provider are required');
  }
  if (args.fetchRemapFile) {
    process.env.WS_VISUAL_INGEST_FETCH_REMAP_FILE = path.resolve(args.fetchRemapFile);
  }
  const urls = JSON.parse(fs.readFileSync(path.resolve(args.urlsJson), 'utf8'));
  const repoRoot = path.resolve(args.repoRoot || process.cwd());
  if (process.env.WS_INGEST_DEBUG) {
    process.stderr.write(
      `ingest cli fetchRemapFile=${args.fetchRemapFile} resolved=${args.fetchRemapFile ? path.resolve(args.fetchRemapFile) : ''} exists=${args.fetchRemapFile ? fs.existsSync(path.resolve(args.fetchRemapFile)) : false}\n`,
    );
  }
  const result = await ingestVisualAttachments({
    specPath: args.specPath,
    urls,
    provider: args.provider,
    apiBase: args.apiBase,
    authEnv: args.authEnv,
    skipAssets: args.skipAssets,
    repoRoot,
    fetchRemapFile: args.fetchRemapFile,
  });

  if (args.json) {
    process.stdout.write(`${JSON.stringify({
      assetsDir: result.assetsDir ? path.relative(repoRoot, result.assetsDir).replace(/\\/g, '/') : null,
      okCount: result.okCount,
      skipCount: result.skipCount,
      failCount: result.failCount,
    }, null, 2)}\n`);
  } else if (result.assetsDir) {
    process.stdout.write(`Assets written to: ${path.relative(repoRoot, result.assetsDir).replace(/\\/g, '/')}\n`);
  } else {
    process.stdout.write(`Skipped: ${result.skipCount}, failed: ${result.failCount}\n`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  ingestVisualAttachments,
  parseArgs,
  specStemFromPath,
  sanitizeStem,
  classifyKind,
  isAllowlisted,
  isGithubAllowlisted,
  isAdoAllowlisted,
  resolveFetchUrl,
  sniffMime,
  ALLOWED_MIME,
  PER_FILE_LIMIT,
  RUN_LIMIT,
};
