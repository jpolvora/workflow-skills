#!/usr/bin/env node
'use strict';

/**
 * ws-kanvas server: loopback-only, read-only board server over the collector.
 *
 * Node 22 stdlib only (`node:http`, `node:fs`, `node:path`). Serves the
 * self-contained page plus two GET JSON endpoints. No POST/PUT/DELETE routes
 * exist; any non-GET request gets 405. Binds 127.0.0.1 only.
 */

const fs = require('fs');
const http = require('node:http');
const path = require('node:path');

const { collectBoard, getCard, isValidSlug } = require('./collect.cjs');

const DEFAULT_PORT = 4173;
const LOOPBACK = '127.0.0.1';
const REF_PATH = path.join(__dirname, '..', 'refs', 'board.html');

function resolverRoot() {
  // Consumer root single-sourced from the shared resolver; the cwd when
  // ws-shared is absent (skill installed standalone).
  try {
    const hub = hubModule();
    if (hub) {
      const ctx = hub.resolveConsumerContext({ repoRoot: process.cwd() });
      if (ctx && typeof ctx.repoRoot === 'string' && ctx.repoRoot) return path.resolve(ctx.repoRoot);
    }
  } catch {
    // Fall through to the cwd default below.
  }
  return path.resolve(process.cwd());
}

function hubModule() {
  // Shared resolver single-sources hub semantics (relocatable sharedDir,
  // WORKFLOW_SKILLS_SHARED_DIR). Null when the skill is installed
  // standalone without ws-shared; callers degrade gracefully.
  try {
    return require('../../ws-shared/runtime/scripts/resolve_consumer_root.cjs');
  } catch {
    return null;
  }
}

function hubSegmentName(parsedConfig) {
  // Hub directory name, most specific first: the config self-description
  // (pathTokens.sharedDir), then the shared resolver, else unknown.
  const selfDescribed = parsedConfig && parsedConfig.pathTokens && parsedConfig.pathTokens.sharedDir;
  if (typeof selfDescribed === 'string' && selfDescribed.trim()) {
    return path.basename(path.resolve(selfDescribed.trim()));
  }
  try {
    const hub = hubModule();
    if (hub) return path.basename(hub.sharedDir(process.cwd()));
  } catch {
    // Fall through to unknown below.
  }
  return null;
}

function rootForConfig(configFile, parsedConfig, resolverRoot) {
  // The config file selects WHICH config to read. The consumer root is its
  // directory minus one hub segment: the resolver-sourced (or
  // self-described) hub name, or any dot-directory. A config with no
  // recognizable hub segment falls back to the resolver root when inside
  // the repo, else to the config directory itself. Never the bare cwd.
  const cfg = path.resolve(configFile);
  let dir = path.dirname(cfg);
  const seg = path.basename(dir);
  const hubName = hubSegmentName(parsedConfig);
  if ((hubName && seg === hubName) || seg.startsWith('.')) return path.dirname(dir);
  const rel = path.relative(resolverRoot, cfg);
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return resolverRoot;
  return dir;
}

function readConfigPaths(configFile) {
  // Consumer hub config: plans.specsDir / plans.dir resolve relative to the
  // consumer root, unless absolute. The root is always returned so omitted
  // keys fall back to `<root>/.agents/specs` and `<root>/.agents/plans`.
  let raw;
  try {
    raw = fs.readFileSync(path.resolve(configFile), 'utf8');
  } catch {
    return { root: rootForConfig(configFile, null, process.cwd()) };
  }
  let config;
  try {
    config = JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch {
    return { root: rootForConfig(configFile, null, process.cwd()) };
  }
  const repoRoot = resolverRoot();
  const root = rootForConfig(configFile, config, repoRoot);
  const out = { root };
  const specsDir = config?.plans?.specsDir;
  const plansDir = config?.plans?.dir;
  if (typeof specsDir === 'string' && specsDir.trim()) {
    out.specsDir = path.isAbsolute(specsDir) ? specsDir : path.join(root, specsDir);
  }
  if (typeof plansDir === 'string' && plansDir.trim()) {
    out.plansDir = path.isAbsolute(plansDir) ? plansDir : path.join(root, plansDir);
  }
  return out;
}

function parseArgs(argv) {
  const args = { specsDir: undefined, plansDir: undefined, index: undefined, port: undefined, config: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--specs-dir') args.specsDir = argv[(i += 1)];
    else if (a === '--plans-dir') args.plansDir = argv[(i += 1)];
    else if (a === '--index') args.index = argv[(i += 1)];
    else if (a === '--port') args.port = argv[(i += 1)];
    else if (a === '--config') args.config = argv[(i += 1)];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: server.cjs [--specs-dir DIR] [--plans-dir DIR] [--index FILE] [--config FILE] [--port N]');
      console.log('  Serves the kanvas board on 127.0.0.1 (default port 4173, KANVAS_PORT override).');
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return args;
}

function resolveRoots(args) {
  const fromConfig = args.config ? readConfigPaths(args.config) : {};
  const root = fromConfig.root;
  const specsDir = args.specsDir || fromConfig.specsDir || (root ? path.join(root, '.agents', 'specs') : undefined);
  const plansDir = args.plansDir || fromConfig.plansDir || (root ? path.join(root, '.agents', 'plans') : undefined);
  return { specsDir, plansDir, index: args.index };
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

function createServer(roots) {
  return http.createServer((req, res) => {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { code: 'method-not-allowed', message: 'Read-only server: GET only.' } }));
      return;
    }
    let url;
    try {
      url = new URL(req.url, 'http://127.0.0.1');
    } catch {
      sendJson(res, 400, { error: { code: 'bad-request', message: 'Unparseable request path.' } });
      return;
    }
    if (url.pathname === '/') {
      let html;
      try {
        html = fs.readFileSync(REF_PATH, 'utf8');
      } catch {
        sendJson(res, 500, { error: { code: 'page-missing', message: 'Board page asset is unavailable.' } });
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    if (url.pathname === '/api/board') {
      sendJson(res, 200, collectBoard({ specsDir: roots.specsDir, plansDir: roots.plansDir, indexPath: roots.index }));
      return;
    }
    if (url.pathname === '/api/card') {
      const slug = url.searchParams.get('slug') || '';
      if (!isValidSlug(slug)) {
        sendJson(res, 400, { error: { code: 'not-found', message: 'Unknown card slug.' } });
        return;
      }
      const board = collectBoard({ specsDir: roots.specsDir, plansDir: roots.plansDir, indexPath: roots.index });
      const result = getCard(board, slug);
      if (result.error) {
        sendJson(res, 404, result);
        return;
      }
      sendJson(res, 200, result);
      return;
    }
    sendJson(res, 404, { error: { code: 'not-found', message: 'Unknown path.' } });
  });
}

async function start({ args = {}, onReady = null } = {}) {
  const roots = resolveRoots(args);
  const portRaw = args.port || process.env.KANVAS_PORT || String(DEFAULT_PORT);
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${portRaw}`);
  }
  const server = createServer(roots);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, LOOPBACK, () => {
      const url = `http://${LOOPBACK}:${server.address().port}/`;
      if (!onReady) console.log(`kanvas board: ${url}`);
      else onReady(url);
      resolve({ server, url });
    });
  });
}

module.exports = { createServer, resolveRoots, readConfigPaths, start, DEFAULT_PORT, LOOPBACK };

if (require.main === module) {
  start({ args: parseArgs(process.argv.slice(2)) }).catch((err) => {
    console.error(`kanvas: ${err.message}`);
    process.exitCode = 1;
  });
}
