#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
// Managed runtime loads from its skills installation: the project-local
// skills tree ({skillsRoot}/ws-shared) or the global skills tree
// ({globalSkillsRoot}/ws-shared, override via WORKFLOW_SKILLS_GLOBAL_DIR).
// An explicit WORKFLOW_SKILLS_SHARED_DIR selects the shared hub root
// (<hub>/runtime/scripts is used). The project consumer hub (<repo>/.ws)
// holds only local config variable files (config.json, STACK.md, memory,
// changelog) and is not a managed-runtime source.
const HUB_SCRIPTS_DIR = (() => {
  const packaged = path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'scripts');
  const candidates = [];
  const explicitShared = process.env.WORKFLOW_SKILLS_SHARED_DIR;
  if (explicitShared && String(explicitShared).trim()) {
    candidates.unshift(path.join(path.resolve(String(explicitShared).trim()), 'runtime', 'scripts'));
  }
  try {
    candidates.push(path.resolve(process.cwd(), '.agents', 'skills', 'ws-shared', 'runtime', 'scripts'));
  } catch {
    // Ignore cwd resolution failures; remaining candidates still apply.
  }
  const globalDir = process.env.WORKFLOW_SKILLS_GLOBAL_DIR;
  const globalRoot = globalDir && String(globalDir).trim()
    ? path.resolve(String(globalDir).trim())
    : path.join(require('os').homedir(), '.agents', 'skills');
  candidates.push(packaged);
  candidates.push(path.join(globalRoot, 'ws-shared', 'runtime', 'scripts'));
  for (const candidate of [...new Set(candidates)]) {
    try {
      require.resolve(path.join(candidate, 'resolve_consumer_root.cjs'));
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return packaged;
})();
const { spawnSync } = require('child_process');
const {
  resolveConsumerContext,
  toRepoRelative,
} = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));
const { acquireFileLock } = require(path.join(HUB_SCRIPTS_DIR, 'file_lock.cjs'));

const STATUS_SUBFOLDERS = ['pending', 'completed', 'archived'];

function parseArgs(argv) {
  const options = {
    repoRoot: null,
    apply: false,
    json: false,
    byStatus: false,
    slug: null,
    status: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: organize_specs.cjs [--repo-root <dir>] [--dry-run | --apply] [--by-status] [--slug <slug> --status pending|completed|archived] [--json]');
      process.exit(0);
    }
    if (arg === '--repo-root') {
      options.repoRoot = argv[++index];
    } else if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--dry-run') {
      options.apply = false;
    } else if (arg === '--by-status') {
      options.byStatus = true;
    } else if (arg === '--slug') {
      options.slug = argv[++index];
    } else if (arg === '--status') {
      options.status = argv[++index];
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg.startsWith('--repo-root=')) {
      options.repoRoot = arg.slice('--repo-root='.length);
    } else if (arg.startsWith('--slug=')) {
      options.slug = arg.slice('--slug='.length);
    } else if (arg.startsWith('--status=')) {
      options.status = arg.slice('--status='.length);
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }

  if (options.status !== null && !STATUS_SUBFOLDERS.includes(options.status)) {
    console.error(`invalid --status "${options.status}" (expected pending|completed|archived)`);
    process.exit(2);
  }
  if ((options.slug === null) !== (options.status === null)) {
    console.error('--slug and --status must be used together');
    process.exit(2);
  }
  if (options.slug !== null && options.byStatus) {
    console.error('--slug/--status cannot be combined with --by-status');
    process.exit(2);
  }

  return options;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const lines = match[1].split(/\r?\n/);
  const result = {};
  for (const line of lines) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      let val = kv[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[kv[1]] = val;
    }
  }
  return result;
}

function isGitTracked(repoRoot, relativePath) {
  const res = spawnSync('git', ['ls-files', '--error-unmatch', relativePath], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return res.status === 0;
}

function isGitTrackedDir(repoRoot, relativePath) {
  const res = spawnSync('git', ['ls-files', relativePath], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return res.status === 0 && String(res.stdout || '').trim().length > 0;
}

function getGitFirstAddDate(repoRoot, relativePath) {
  try {
    const res = spawnSync(
      'git',
      ['log', '--diff-filter=A', '--format=%aI', '-1', '--', relativePath],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      }
    );
    if (res.status === 0 && res.stdout.trim()) {
      return res.stdout.trim();
    }
  } catch {}
  return null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isGitRepo(repoRoot) {
  const res = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return res.status === 0 && String(res.stdout).trim() === 'true';
}

function gitMv(repoRoot, fromRel, toRel) {
  const res = spawnSync('git', ['mv', fromRel, toRel], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (res.status !== 0) {
    const detail = String(res.stderr || res.stdout || '').trim();
    throw new Error(`git mv failed: ${fromRel} -> ${toRel}${detail ? `: ${detail}` : ''}`);
  }
}

function overlappingDirtyTracked(repoRoot, relativePaths) {
  const unique = [...new Set(relativePaths.filter(Boolean))];
  if (!isGitRepo(repoRoot) || !unique.length) return [];
  const res = spawnSync('git', ['status', '--porcelain', '-u', '--', ...unique], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (res.status !== 0) return [];
  const dirty = [];
  for (const raw of String(res.stdout || '').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const code = raw.slice(0, 2);
    if (code === '??' || code === '!!') continue;
    if (!code.trim()) continue;
    dirty.push(raw.slice(3).trim().replace(/^"|"$/g, ''));
  }
  return dirty;
}

function toPosix(value) {
  return String(value).split(path.sep).join('/');
}

// Scan root plus known status subfolders for spec files. Every item keeps
// its specsDir-relative POSIX directory ('' for root) and file name.
function collectSpecs(specsDir, repoRoot, { includeSubfolders }) {
  const locations = includeSubfolders ? ['', ...STATUS_SUBFOLDERS] : [''];
  const specFiles = [];
  for (const location of locations) {
    const dir = location ? path.join(specsDir, location) : specsDir;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const entryNames = new Set(entries.filter((e) => e.isFile()).map((e) => e.name));
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith('.spec.md')) continue;

      const fileName = entry.name;
      const filePath = path.join(dir, fileName);
      const relPath = toRepoRelative(repoRoot, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = parseFrontmatter(content);

      const stem = fileName.replace(/\.spec\.md$/, '');
      const cleanSlug = fm.slug || stem.replace(/^\d{4}-/, '');
      const specDate = fm.specDate || null;
      const stat = fs.statSync(filePath);
      const gitAddDate = getGitFirstAddDate(repoRoot, relPath);

      // Companion context file in the same directory (exact stem, bare
      // slug, or any NNNN-{slug} variant).
      let contextFileName = null;
      const possibleContextNames = [
        `${stem}.context.md`,
        `${cleanSlug}.context.md`,
      ];
      for (const cand of possibleContextNames) {
        if (entryNames.has(cand)) {
          contextFileName = cand;
          break;
        }
      }
      if (!contextFileName) {
        const escSlug = escapeRegExp(cleanSlug);
        for (const name of entryNames) {
          if (new RegExp(`^\\d{4}-${escSlug}\\.context\\.md$`).test(name)) {
            contextFileName = name;
            break;
          }
        }
      }

      // Companion visual-assets directory in the same directory.
      let assetsDirName = null;
      try {
        if (fs.statSync(path.join(dir, `${stem}.assets`)).isDirectory()) {
          assetsDirName = `${stem}.assets`;
        }
      } catch {
        // No assets sidecar.
      }

      specFiles.push({
        dir: location,
        fileName,
        filePath,
        relPath,
        stem,
        slug: cleanSlug,
        status: fm.status || null,
        issueState: fm.issueState || null,
        specDate,
        gitAddDate,
        mtimeMs: stat.mtimeMs,
        contextFileName,
        assetsDirName,
        isTracked: isGitTracked(repoRoot, relPath),
      });
    }
  }
  return specFiles;
}

const STATUS_SYNONYMS = {
  completed: ['completed', 'done', 'delivered', 'shipped', 'closed'],
  archived: ['archived', 'cancelled', 'canceled', 'superseded', 'retired'],
  pending: ['pending', 'draft', 'todo', 'to-do', 'in-progress', 'inprogress', 'active', 'open'],
};

function normalizeStatusToken(value) {
  return String(value || '').trim().toLowerCase();
}

function mapTokenToStatus(token) {
  const t = normalizeStatusToken(token);
  for (const [status, words] of Object.entries(STATUS_SYNONYMS)) {
    if (words.includes(t)) return status;
  }
  return null;
}

// Index signals for status fallback: Done-log rows and Feature-map [x]
// mean completed; Archive-table rows mean archived.
function readIndexSignals(indexPrdPath) {
  const signals = { completed: new Set(), archived: new Set() };
  if (!indexPrdPath || !fs.existsSync(indexPrdPath)) return signals;
  const text = fs.readFileSync(indexPrdPath, 'utf8');
  const lines = text.split(/\r?\n/);
  let section = '';
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      section = heading[1].toLowerCase();
      continue;
    }
    // Slug cells: `slug` inside table rows.
    const slugCells = [...line.matchAll(/`([A-Za-z0-9][A-Za-z0-9._-]*)`/g)].map((m) => m[1]);
    // spec: references: `spec: [sub/dir/][NNNN-]slug.spec.md`.
    const specRefs = [...line.matchAll(/`spec:\s*([^`]+)`/g)].map((m) =>
      String(m[1]).trim().split('/').pop().replace(/\.spec\.md$/, '').replace(/^\d{4}-/, '')
    );
    const slugs = [...slugCells, ...specRefs];
    if (section.includes('done log') || section.includes('delivery archive')) {
      for (const slug of slugs) signals.completed.add(slug);
      continue;
    }
    if (section.includes('archive')) {
      for (const slug of slugs) signals.archived.add(slug);
      continue;
    }
    if (/^-\s*\[x\]/i.test(line.trim())) {
      for (const slug of slugs) signals.completed.add(slug);
    }
    // Next-specs status cells: | `slug` | `[x]` done | ...
    if (/\|\s*`\[x\]/i.test(line)) {
      for (const slug of slugs) signals.completed.add(slug);
    }
  }
  return signals;
}

function statusOfSpec(item, indexSignals) {
  const direct = mapTokenToStatus(item.status);
  if (direct) return direct;
  if (item.issueState) {
    const t = normalizeStatusToken(item.issueState);
    if (t === 'closed') return 'completed';
    if (t === 'open') return 'pending';
  }
  if (indexSignals.completed.has(item.slug)) return 'completed';
  if (indexSignals.archived.has(item.slug)) return 'archived';
  return 'pending';
}

function specRelOf(item) {
  return item.dir ? `${item.dir}/${item.fileName}` : item.fileName;
}

function sortChronologically(specFiles) {
  specFiles.sort((a, b) => {
    if (a.specDate && b.specDate) {
      const cmp = a.specDate.localeCompare(b.specDate);
      if (cmp !== 0) return cmp;
    } else if (a.specDate && !b.specDate) {
      return -1;
    } else if (!a.specDate && b.specDate) {
      return 1;
    }

    if (a.gitAddDate && b.gitAddDate) {
      const cmp = a.gitAddDate.localeCompare(b.gitAddDate);
      if (cmp !== 0) return cmp;
    } else if (a.gitAddDate && !b.gitAddDate) {
      return -1;
    } else if (!a.gitAddDate && b.gitAddDate) {
      return 1;
    }

    if (a.mtimeMs !== b.mtimeMs) {
      return a.mtimeMs - b.mtimeMs;
    }

    return a.fileName.localeCompare(b.fileName);
  });
}

// Default mode: chronological NNNN- prefixes for flat (root-only) boards.
function planPrefixRenames(specFiles, repoRoot, specsDir) {
  const renames = [];

  for (let i = 0; i < specFiles.length; i += 1) {
    const item = specFiles[i];
    const prefix = String(i + 1).padStart(4, '0');
    const newSpecFileName = `${prefix}-${item.slug}.spec.md`;
    const newContextFileName = item.contextFileName ? `${prefix}-${item.slug}.context.md` : null;

    if (newSpecFileName !== item.fileName) {
      renames.push({
        type: 'spec',
        slug: item.slug,
        from: item.fileName,
        to: newSpecFileName,
        isTracked: item.isTracked,
      });
    }

    if (item.contextFileName && newContextFileName !== item.contextFileName) {
      const contextRel = toRepoRelative(repoRoot, path.join(specsDir, item.contextFileName));
      renames.push({
        type: 'context',
        slug: item.slug,
        from: item.contextFileName,
        to: newContextFileName,
        isTracked: isGitTracked(repoRoot, contextRel),
      });
    }
  }

  return renames;
}

// File one item (spec + context + assets) into a status subfolder, keeping
// file names identical; only the directory changes.
function planStatusMove(item, targetStatus, repoRoot, specsDir) {
  const renames = [];
  const fromSpec = specRelOf(item);
  const toSpec = `${targetStatus}/${item.fileName}`;
  if (fromSpec === toSpec) return renames;
  renames.push({
    type: 'spec',
    slug: item.slug,
    from: fromSpec,
    to: toSpec,
    isTracked: item.isTracked,
  });
  if (item.contextFileName) {
    const fromContext = item.dir ? `${item.dir}/${item.contextFileName}` : item.contextFileName;
    const contextAbs = path.join(specsDir, ...fromContext.split('/'));
    renames.push({
      type: 'context',
      slug: item.slug,
      from: fromContext,
      to: `${targetStatus}/${item.contextFileName}`,
      isTracked: isGitTracked(repoRoot, toRepoRelative(repoRoot, contextAbs)),
    });
  }
  if (item.assetsDirName) {
    const fromAssets = item.dir ? `${item.dir}/${item.assetsDirName}` : item.assetsDirName;
    const assetsAbs = path.join(specsDir, ...fromAssets.split('/'));
    const assetsRel = toRepoRelative(repoRoot, assetsAbs);
    renames.push({
      type: 'assets',
      slug: item.slug,
      from: fromAssets,
      to: `${targetStatus}/${item.assetsDirName}`,
      isTracked: isGitTrackedDir(repoRoot, assetsRel),
    });
  }
  return renames;
}

function planByStatusRenames(specFiles, indexSignals, repoRoot, specsDir) {
  const renames = [];
  for (const item of specFiles) {
    const target = statusOfSpec(item, indexSignals);
    renames.push(...planStatusMove(item, target, repoRoot, specsDir));
  }
  return renames;
}

function applyRenames({ repoRoot, specsDir, indexPrdPath, renames }) {
  if (!renames.length) return;
  const indexRel = indexPrdPath && fs.existsSync(indexPrdPath)
    ? toRepoRelative(repoRoot, indexPrdPath)
    : null;
  const overlapPaths = [
    ...renames.map((rename) => toRepoRelative(repoRoot, path.join(specsDir, ...rename.from.split('/')))),
    ...renames.map((rename) => toRepoRelative(repoRoot, path.join(specsDir, ...rename.to.split('/')))),
    indexRel,
  ];
  const dirty = overlappingDirtyTracked(repoRoot, overlapPaths);
  if (dirty.length) {
    throw new Error(`Cannot --apply with dirty overlapping paths: ${dirty.join(', ')}`);
  }

  const movingFrom = new Set(renames.map((r) => r.from));
  for (const rename of renames) {
    const targetAbs = path.join(specsDir, ...rename.to.split('/'));
    if (fs.existsSync(targetAbs) && !movingFrom.has(rename.to)) {
      throw new Error(`Cannot rename "${rename.from}" to "${rename.to}": target already exists`);
    }
  }

  // Two-phase rename; the temp name lives in the source directory so
  // cross-directory moves never collide on basenames.
  const tempRenames = [];
  for (const rename of renames) {
    const fromAbs = path.join(specsDir, ...rename.from.split('/'));
    const fromDir = path.dirname(fromAbs);
    const tempName = `.tmp_organize_${path.basename(rename.from)}`;
    const tempAbs = path.join(fromDir, tempName);
    const fromRel = toRepoRelative(repoRoot, fromAbs);
    const tempRel = toRepoRelative(repoRoot, tempAbs);
    if (rename.isTracked) {
      gitMv(repoRoot, fromRel, tempRel);
    } else {
      fs.renameSync(fromAbs, tempAbs);
    }
    tempRenames.push({
      tempAbs,
      finalAbs: path.join(specsDir, ...rename.to.split('/')),
      isTracked: rename.isTracked,
    });
  }

  for (const item of tempRenames) {
    fs.mkdirSync(path.dirname(item.finalAbs), { recursive: true });
    if (item.isTracked) {
      gitMv(repoRoot, toRepoRelative(repoRoot, item.tempAbs), toRepoRelative(repoRoot, item.finalAbs));
    } else {
      fs.renameSync(item.tempAbs, item.finalAbs);
    }
  }

  if (indexRel) {
    // Serialize the index.PRD read-modify-write across processes.
    const release = acquireFileLock(indexPrdPath, { prefix: 'ws-index' });
    try {
      let indexPrdContent = fs.readFileSync(indexPrdPath, 'utf8');
      for (const rename of renames) {
        if (rename.type === 'spec') {
          const regex = new RegExp(`(\`spec:\\s*)${escapeRegExp(rename.from)}(\`)`, 'g');
          indexPrdContent = indexPrdContent.replace(regex, `$1${rename.to}$2`);
        }
      }
      fs.writeFileSync(indexPrdPath, indexPrdContent, 'utf8');
    } finally {
      release();
    }
  }
}

function organizeSpecs(options) {
  const context = resolveConsumerContext({
    repoRoot: options.repoRoot,
    scriptFile: __filename,
  });

  const config = context.config || {};
  const plans = config.plans || {};
  const specsRel = plans.specsDir || '.agents/specs';
  const specsDir = path.resolve(context.repoRoot, specsRel);

  const emptyResult = (mode) => ({
    ok: true,
    mode,
    dryRun: !options.apply,
    specsDir: specsRel,
    specsCount: 0,
    renames: [],
  });

  if (!fs.existsSync(specsDir)) {
    return emptyResult(options.slug != null ? 'single' : (options.byStatus ? 'by-status' : 'prefix'));
  }

  const indexPrdPath = path.join(specsDir, 'index.PRD');

  if (options.slug != null) {
    const cleanSlug = String(options.slug).replace(/^\d{4}-/, '');
    const specFiles = collectSpecs(specsDir, context.repoRoot, { includeSubfolders: true });
    const matches = specFiles.filter((item) => item.slug === cleanSlug);
    if (matches.length === 0) {
      throw new Error(`No spec found for slug "${cleanSlug}"`);
    }
    if (matches.length > 1) {
      throw new Error(
        `Ambiguous spec of record for "${cleanSlug}": ${matches.map(specRelOf).join(' and ')}`,
      );
    }
    if (options.status == null || !STATUS_SUBFOLDERS.includes(options.status)) {
      throw new Error(`invalid status "${options.status}" (expected pending|completed|archived)`);
    }
    const renames = planStatusMove(matches[0], options.status, context.repoRoot, specsDir);
    if (options.apply) {
      applyRenames({ repoRoot: context.repoRoot, specsDir, indexPrdPath, renames });
    }
    return {
      ok: true,
      mode: 'single',
      dryRun: !options.apply,
      specsDir: specsRel,
      specsCount: specFiles.length,
      renames,
    };
  }

  if (options.byStatus) {
    const specFiles = collectSpecs(specsDir, context.repoRoot, { includeSubfolders: true });
    const indexSignals = readIndexSignals(indexPrdPath);
    const renames = planByStatusRenames(specFiles, indexSignals, context.repoRoot, specsDir);
    if (options.apply) {
      applyRenames({ repoRoot: context.repoRoot, specsDir, indexPrdPath, renames });
    }
    return {
      ok: true,
      mode: 'by-status',
      dryRun: !options.apply,
      specsDir: specsRel,
      specsCount: specFiles.length,
      renames,
    };
  }

  const specFiles = collectSpecs(specsDir, context.repoRoot, { includeSubfolders: false });
  sortChronologically(specFiles);
  const renames = planPrefixRenames(specFiles, context.repoRoot, specsDir);
  if (options.apply) {
    applyRenames({ repoRoot: context.repoRoot, specsDir, indexPrdPath, renames });
  }
  return {
    ok: true,
    mode: 'prefix',
    dryRun: !options.apply,
    specsDir: specsRel,
    specsCount: specFiles.length,
    renames,
  };
}

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  try {
    const result = organizeSpecs(options);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Organize specs in ${result.specsDir} (${result.dryRun ? 'DRY-RUN' : 'APPLIED'}, mode=${result.mode}):`);
      console.log(`Found ${result.specsCount} spec(s), ${result.renames.length} rename(s) planned.`);
      for (const r of result.renames) {
        console.log(`  [${r.type}] ${r.from} -> ${r.to}`);
      }
    }
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  organizeSpecs,
  STATUS_SUBFOLDERS,
};
