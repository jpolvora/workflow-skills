#!/usr/bin/env node
'use strict';

// Port of secrets_scanner.sh (ws-secrets-leak-review):
// Optional CLI / pre-commit scan (interactive skill does NOT run this).
// Usage: node secrets_scanner.cjs
// Env: GIT_STAGED_ONLY=1  SECRETS_SCAN_MAX_HITS=50

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const STAGED_ONLY = process.env.GIT_STAGED_ONLY === '1';
const MAX_HITS = parseInt(process.env.SECRETS_SCAN_MAX_HITS || '50', 10) || 50;

function have(cmd) {
  // `command -v` is a shell builtin: spawn it through sh on POSIX (`where`
  // on Windows, `which` as a no-shell fallback when sh is unavailable).
  if (process.platform === 'win32') {
    return spawnSync('where', [cmd], { encoding: 'utf8' }).status === 0;
  }
  const viaSh = spawnSync('sh', ['-c', 'command -v ' + cmd], { encoding: 'utf8' });
  if (viaSh.status === 0) return true;
  return spawnSync('which', [cmd], { encoding: 'utf8' }).status === 0;
}

function repoRoot() {
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  const out = (r.stdout || '').trim();
  return r.status === 0 && out ? out : '.';
}

function runRg(args, input) {
  const r = spawnSync('rg', args, { input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return (r.stdout || '').split('\n').filter((l) => l !== '');
}

function main() {
  for (const cmd of ['rg', 'git']) {
    if (!have(cmd)) {
      console.error(`Error: '${cmd}' not found. Install ripgrep (rg) and git.`);
      process.exit(1);
    }
  }
  const root = repoRoot();
  process.chdir(root);

  const high = [];
  const medium = [];

  const appendFinding = (out, file, line, label, detail) => {
    if (file === '.' || file === '(staged-diff)' || isStaged(file, root)) {
      out.push(`${file}|${line}|${label}|${String(detail).slice(0, 80)}`);
    }
  };

  let stagedSet = null;
  const isStaged = (file) => {
    if (!STAGED_ONLY) return true;
    if (!stagedSet) {
      const r = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8' });
      stagedSet = new Set((r.stdout || '').split('\n').map((l) => l.trim()).filter(Boolean));
    }
    return stagedSet.has(file);
  };

  const collectHits = (pattern) => {
    let rows = [];
    if (STAGED_ONLY) {
      const diff = spawnSync('git', ['diff', '--cached', '-U0', '--diff-filter=ACM'], { encoding: 'utf8' });
      const added = (diff.stdout || '').split('\n').filter((l) => /^\++[^+]/.test(l) || /^^\+[^+]/.test(l));
      // Filter added lines only, then rg the pattern.
      const text = added.join('\n');
      rows = runRg(['-n', '--max-filesize', '512K', '-e', pattern], text)
        .filter((l) => !/allowlist secret/i.test(l))
        .filter((l) => !/EXAMPLE|\[REDACTED\]|wJalrXUtnFEMI\/K7MDENG/i.test(l))
        .slice(0, MAX_HITS);
    } else {
      const r = spawnSync('rg', ['-n', '--max-filesize', '512K',
        '-g', '*.env', '-g', '*.env.*', '-g', '*.json', '-g', '*.yml', '-g', '*.yaml', '-g', '*.toml',
        '-g', '*.xml', '-g', '*.ini', '-g', '*.cfg', '-g', '*.conf', '-g', '*.properties',
        '-g', '*.sh', '-g', '*.bash', '-g', '*.ps1', '-g', '*.py', '-g', '*.js', '-g', '*.jsx',
        '-g', '*.ts', '-g', '*.tsx', '-g', '*.cs', '-g', '*.java', '-g', '*.go', '-g', '*.rb',
        '-g', '*.php', '-g', '*.tf', '-g', '*.md', '-g', '*.txt',
        '-g', '!**/node_modules/**', '-g', '!**/.git/**', '-g', '!**/dist/**',
        '-g', '!**/build/**', '-g', '!**/.next/**', '-g', '!**/vendor/**',
        '-e', pattern, '.'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      rows = (r.stdout || '').split('\n').filter(Boolean)
        .filter((l) => !/allowlist secret/i.test(l))
        .slice(0, MAX_HITS);
    }
    return rows;
  };

  const consumeHits = (hits, label, level) => {
    const out = level === 'high' ? high : medium;
    if (!hits.length) return;
    if (STAGED_ONLY) {
      let n = 0;
      for (const row of hits) {
        if (!row) continue;
        n += 1;
        appendFinding(out, '(staged-diff)', String(n), label, row);
      }
      return;
    }
    for (const row of hits) {
      const m = row.match(/^([^:]+):(\d+):(.*)$/);
      if (!m) continue;
      appendFinding(out, m[1], m[2], label, m[3]);
    }
  };

  const scanPat = (pattern, label, level) => consumeHits(collectHits(pattern), label, level);

  if (STAGED_ONLY) {
    const r = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8' });
    if (!(r.stdout || '').trim()) {
      console.log('No staged files. Nothing to scan.');
      process.exit(0);
    }
  }

  console.log(`Scanning ${path.basename(process.cwd())} for secrets & leaks (bounded)...`);
  console.log('');

  scanPat('AKIA[0-9A-Z]{16}', 'AWS Access Key', 'high');
  scanPat('gh[ps]_[a-zA-Z0-9]{36,}|github_pat_[a-zA-Z0-9]{36,}', 'GitHub Token', 'high');
  scanPat('xox[bpras]-[0-9a-zA-Z-]{24,}', 'Slack Token', 'high');
  scanPat('sk-[a-zA-Z0-9]{32,}', 'API Key (sk-...)', 'high');
  scanPat('-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----', 'Private Key', 'high');
  scanPat('(postgresql|mysql|mongodb(\\+srv)?|redis|jdbc)://[^:]+:[^@]+@', 'DB Connection String', 'high');
  scanPat('Bearer\\s+[A-Za-z0-9\\-. _~+/]{40,}', 'Bearer [REDACTED]', 'medium');

  // Sensitive filenames via git inventory.
  const listR = spawnSync('git', STAGED_ONLY
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACM']
    : ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' });
  const fileList = (listR.stdout || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const checkNames = (pattern, label, level) => {
    const out = level === 'high' ? high : medium;
    const re = new RegExp(pattern);
    fileList.filter((f) => re.test(f)).slice(0, 40).forEach((f) => appendFinding(out, '.', '(exists)', label, f));
  };
  checkNames('\\.env$', '.env file', 'high');
  checkNames('\\.env\\.[^e]', '.env.* file (not .env.example)', 'high');
  checkNames('\\.pem$', 'PEM certificate/key', 'medium');
  checkNames('\\.key$', 'Private key file (.key)', 'medium');
  checkNames('\\.pfx$|\\.p12$', 'PKCS12 keystore', 'high');
  checkNames('secrets\\.ya?ml$', 'Secrets YAML file', 'high');
  checkNames('credentials\\.json$|credentials\\.toml$', 'Credentials file', 'high');
  checkNames('id_rsa$|id_ecdsa$|id_ed25519$', 'SSH private key file', 'high');

  // .gitignore warnings.
  const ignoreMissing = [];
  if (fs.existsSync('.gitignore')) {
    const gi = fs.readFileSync('.gitignore', 'utf8').split('\n').map((l) => l.replace(/\r$/, '').replace(/^\//, ''));
    for (const entry of ['.env', '.env.*', '*.pem', '*.key', '*.pfx', 'secrets.yml', 'credentials.json', '.aws/']) {
      if (!gi.includes(entry)) ignoreMissing.push(entry);
    }
  }

  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('              L E A K   S C A N   R E P O R T     ');
  console.log('══════════════════════════════════════════════════');
  console.log('');

  if (high.length === 0 && medium.length === 0) {
    console.log('No leaks detected.');
  } else {
    if (high.length) {
      console.log(`HIGH — must fix before push (${high.length})`);
      console.log('| File | Line | Type | Detail |');
      console.log('|------|------|------|--------|');
      for (const row of high) {
        const [file, line, type, detail] = row.split('|');
        console.log(`| ${file} | ${line} | ${type} | ${detail} |`);
      }
      console.log('');
    }
    if (medium.length) {
      console.log(`MEDIUM — review recommended (${medium.length})`);
      console.log('| File | Line | Type | Detail |');
      console.log('|------|------|------|--------|');
      for (const row of medium) {
        const [file, line, type, detail] = row.split('|');
        console.log(`| ${file} | ${line} | ${type} | ${detail} |`);
      }
      console.log('');
    }
  }

  if (ignoreMissing.length) {
    console.log('.gitignore warnings');
    for (const e of ignoreMissing) console.log(`- '${e}' not in .gitignore`);
  }
  console.log('');
  console.log('══════════════════════════════════════════════════');
  process.exit(0);
}

if (require.main === module) main();
module.exports = { main };
void os;
