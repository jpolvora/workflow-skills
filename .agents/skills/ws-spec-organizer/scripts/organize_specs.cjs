#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  resolveConsumerContext,
  toRepoRelative,
} = require('../../ws-shared/scripts/resolve_consumer_root.cjs');

function parseArgs(argv) {
  const options = {
    repoRoot: null,
    apply: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: organize_specs.cjs [--repo-root <dir>] [--dry-run | --apply] [--json]');
      process.exit(0);
    }
    if (arg === '--repo-root') {
      options.repoRoot = argv[++index];
    } else if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--dry-run') {
      options.apply = false;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg.startsWith('--repo-root=')) {
      options.repoRoot = arg.slice('--repo-root='.length);
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
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

function organizeSpecs(options) {
  const context = resolveConsumerContext({
    repoRoot: options.repoRoot,
    scriptFile: __filename,
  });

  const config = context.config || {};
  const plans = config.plans || {};
  const specsRel = plans.specsDir || '.agents/specs';
  const specsDir = path.resolve(context.repoRoot, specsRel);

  if (!fs.existsSync(specsDir)) {
    return {
      ok: true,
      dryRun: !options.apply,
      specsDir: specsRel,
      specsCount: 0,
      renames: [],
    };
  }

  const entries = fs.readdirSync(specsDir, { withFileTypes: true });
  const specFiles = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.spec.md')) continue;

    const fileName = entry.name;
    const filePath = path.join(specsDir, fileName);
    const relPath = toRepoRelative(context.repoRoot, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(content);

    const stem = fileName.replace(/\.spec\.md$/, '');
    const cleanSlug = fm.slug || stem.replace(/^\d{4}-/, '');
    const specDate = fm.specDate || null;
    const stat = fs.statSync(filePath);
    const gitAddDate = getGitFirstAddDate(context.repoRoot, relPath);

    // Look for matching context companion
    let contextFileName = null;
    const possibleContextNames = [
      `${stem}.context.md`,
      `${cleanSlug}.context.md`,
    ];
    for (const cand of possibleContextNames) {
      if (fs.existsSync(path.join(specsDir, cand))) {
        contextFileName = cand;
        break;
      }
    }
    if (!contextFileName) {
      // Check any NNNN-{cleanSlug}.context.md
      for (const e of entries) {
        if (e.isFile() && e.name.match(new RegExp(`^\\d{4}-${cleanSlug}\\.context\\.md$`))) {
          contextFileName = e.name;
          break;
        }
      }
    }

    specFiles.push({
      fileName,
      filePath,
      relPath,
      stem,
      slug: cleanSlug,
      specDate,
      gitAddDate,
      mtimeMs: stat.mtimeMs,
      contextFileName,
      isTracked: isGitTracked(context.repoRoot, relPath),
    });
  }

  // Sort chronologically
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

  const renames = [];
  const plannedTargets = new Set();

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
    plannedTargets.add(newSpecFileName);

    if (item.contextFileName && newContextFileName !== item.contextFileName) {
      const contextRel = toRepoRelative(context.repoRoot, path.join(specsDir, item.contextFileName));
      renames.push({
        type: 'context',
        slug: item.slug,
        from: item.contextFileName,
        to: newContextFileName,
        isTracked: isGitTracked(context.repoRoot, contextRel),
      });
      plannedTargets.add(newContextFileName);
    }
  }

  // Safety check: Ensure no collision with existing files outside renames
  if (options.apply && renames.length > 0) {
    const existingFileNames = new Set(entries.filter((e) => e.isFile()).map((e) => e.name));
    const movingFrom = new Set(renames.map((r) => r.from));

    for (const rename of renames) {
      if (existingFileNames.has(rename.to) && !movingFrom.has(rename.to)) {
        throw new Error(`Cannot rename "${rename.from}" to "${rename.to}": target file already exists`);
      }
    }

    // Step 1: Use temporary names if there are circular or overlapping renames
    const tempRenames = [];
    for (const rename of renames) {
      const fromPath = path.join(specsDir, rename.from);
      const tempName = `.tmp_organize_${rename.from}`;
      const tempPath = path.join(specsDir, tempName);
      if (rename.isTracked) {
        const fromRel = toRepoRelative(context.repoRoot, fromPath);
        const tempRel = toRepoRelative(context.repoRoot, tempPath);
        const res = spawnSync('git', ['mv', fromRel, tempRel], { cwd: context.repoRoot, stdio: 'pipe' });
        if (res.status !== 0) {
          fs.renameSync(fromPath, tempPath);
        }
      } else {
        fs.renameSync(fromPath, tempPath);
      }
      tempRenames.push({
        tempName,
        tempPath,
        finalName: rename.to,
        finalPath: path.join(specsDir, rename.to),
        isTracked: rename.isTracked,
      });
    }

    // Step 2: Rename from temp to final
    for (const item of tempRenames) {
      if (item.isTracked) {
        const tempRel = toRepoRelative(context.repoRoot, item.tempPath);
        const finalRel = toRepoRelative(context.repoRoot, item.finalPath);
        const res = spawnSync('git', ['mv', tempRel, finalRel], { cwd: context.repoRoot, stdio: 'pipe' });
        if (res.status !== 0) {
          fs.renameSync(item.tempPath, item.finalPath);
        }
      } else {
        fs.renameSync(item.tempPath, item.finalPath);
      }
    }

    // Step 3: Update index.PRD if present
    const indexPrdPath = path.join(specsDir, 'index.PRD');
    if (fs.existsSync(indexPrdPath)) {
      let indexPrdContent = fs.readFileSync(indexPrdPath, 'utf8');
      for (const rename of renames) {
        if (rename.type === 'spec') {
          // Replace patterns like `spec: from.spec.md` or `from.spec.md`
          const regex = new RegExp(`(\`spec:\\s*)${rename.from}(\`)`, 'g');
          indexPrdContent = indexPrdContent.replace(regex, `$1${rename.to}$2`);
        }
      }
      fs.writeFileSync(indexPrdPath, indexPrdContent, 'utf8');
    }
  }

  return {
    ok: true,
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
      console.log(`Organize specs in ${result.specsDir} (${result.dryRun ? 'DRY-RUN' : 'APPLIED'}):`);
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
};
