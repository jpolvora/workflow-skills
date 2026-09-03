#!/usr/bin/env node

/**
 * Regenerate docs/index.html from AGENTS.md + skills.
 *
 * Version contract (single source of truth = package.json):
 * - Default: stamp footer from package.json.version (no bump). Safe for CI.
 * - --bump: patch-bump package.json, then stamp footer. Use only for intentional releases.
 * Never bump in GitHub Actions site deploy — that used to write footer+1 while
 * only committing docs/, leaving install/--version/--check one patch behind the site.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rewriteSkillMarkdown } from './skill-frontmatter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const shouldBump = args.includes('--bump');
const shouldCheck = args.includes('--check');
const unknownArgs = args.filter((arg) => !['--bump', '--check'].includes(arg));
if (unknownArgs.length || (shouldBump && shouldCheck)) {
  console.error('Usage: node bin/build-site.js [--bump|--check]');
  process.exit(1);
}

// --- Version (package.json is canonical) ---
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;
let siteVersion = currentVersion;

if (shouldBump) {
  const versionParts = currentVersion.split('.').map(Number);
  if (versionParts.length !== 3 || versionParts.some((n) => Number.isNaN(n))) {
    console.error(`Invalid package.json version "${currentVersion}" (expected x.y.z)`);
    process.exit(1);
  }
  versionParts[2] += 1;
  siteVersion = versionParts.join('.');
  pkg.version = siteVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Bumping package.json version: ${currentVersion} -> ${siteVersion}`);

  // Keep skill frontmatter + skill-dependencies packageVersion in lockstep with package.json
  const skillRoot = path.join(root, '.agents', 'skills');
  let skillVerUpdates = 0;
  for (const ent of fs.readdirSync(skillRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const skillMd = path.join(skillRoot, ent.name, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;
    const text = fs.readFileSync(skillMd, 'utf-8');
    const next = rewriteSkillMarkdown(text, siteVersion);
    if (next && next !== text) {
      fs.writeFileSync(skillMd, next);
      skillVerUpdates += 1;
    }
  }
  console.log(`Synced version: ${siteVersion} into ${skillVerUpdates} SKILL.md frontmatter(s)`);

  for (const rel of [
    path.join(root, 'bin', 'skill-dependencies.json'),
    path.join(root, '.agents', 'skills', 'ws-shared', 'skill-dependencies.json'),
  ]) {
    if (!fs.existsSync(rel)) continue;
    const deps = JSON.parse(fs.readFileSync(rel, 'utf-8'));
    deps.packageVersion = siteVersion;
    fs.writeFileSync(rel, JSON.stringify(deps, null, 2) + '\n');
    console.log(`Synced packageVersion in ${path.relative(root, rel)}`);
  }
} else {
  console.log(`Using package.json version: ${siteVersion} (pass --bump to patch-bump)`);
}

// --- 1. Parse the bounded catalog companion ---
const catalogPath = path.join(root, 'CATALOG.md');
const agentsMd = fs.readFileSync(catalogPath, 'utf-8').replace(/\r\n?/g, '\n');
if (/^(?:<{7}|={7}|>{7})/m.test(agentsMd)) {
  console.error('CATALOG.md contains merge-conflict markers');
  process.exit(1);
}
const featuresMd = fs.readFileSync(path.join(root, 'FEATURES.md'), 'utf-8');
if (/^(?:<{7}|={7}|>{7})/m.test(featuresMd)) {
  console.error('FEATURES.md contains merge-conflict markers');
  process.exit(1);
}

const layerSections = [];
const layerHeaderRe = /^### (Layer \d+) — (.+)$/gm;
let m;
while ((m = layerHeaderRe.exec(agentsMd)) !== null) {
  layerSections.push({
    number: m[1],
    name: m[2].trim(),
    start: m.index,
  });
}

/** Skill ids from a table cell (`foo` or `foo` / `bar`); skip paths and non-id tokens. */
function extractSkillIdsFromCell(cell) {
  const ids = [];
  const re = /`([^`]+)`/g;
  let m;
  while ((m = re.exec(cell)) !== null) {
    const token = m[1].trim();
    if (/^[\w][\w.-]*$/.test(token) && !token.startsWith('.')) {
      ids.push(token);
    }
  }
  return ids;
}

function parseTableRows(block) {
  const lines = block.split('\n');
  const rows = [];
  let inTable = false;

  for (const line of lines) {
    if (!line.startsWith('|')) { inTable = false; continue; }

    const cells = line.split('|').slice(1, -1).map(c => c.trim());

    if (cells.some(c => /^-+$/.test(c))) { inTable = true; continue; }
    if (!inTable && cells.length >= 3) {
      const allPlain = cells.every(c => !c.includes('`') && !/^-+$/.test(c));
      if (allPlain) { inTable = true; continue; }
    }

    if (!inTable) continue;

    const desc = cells[cells.length - 1].replace(/^["']|["']$/g, '').trim();
    let rowAdded = false;

    for (let c = 0; c < cells.length - 1; c++) {
      const ids = extractSkillIdsFromCell(cells[c]);
      if (ids.length === 0) continue;
      for (const skillName of ids) {
        rows.push({ name: skillName, description: desc });
        rowAdded = true;
      }
      if (rowAdded) break;
    }
  }
  return rows;
}

const skillLayerMap = {};
const seenNames = new Set();
for (let i = 0; i < layerSections.length; i++) {
  const sec = layerSections[i];
  const end = i + 1 < layerSections.length ? layerSections[i + 1].start : agentsMd.indexOf('\n---\n', sec.start);
  const block = agentsMd.slice(sec.start, end);

  for (const row of parseTableRows(block)) {
    if (!seenNames.has(row.name)) {
      seenNames.add(row.name);
      skillLayerMap[row.name] = {
        layerNumber: sec.number,
        layerName: sec.name,
        description: row.description,
      };
    }
  }
}

// --- 1.5. Parse skill dependencies to identify standard vs lite workflows ---
const depMapPath = path.join(root, 'bin', 'skill-dependencies.json');
let standardDeps = new Set();
let liteDeps = new Set();
let directDepsMap = {};

if (fs.existsSync(depMapPath)) {
  try {
    const depMap = JSON.parse(fs.readFileSync(depMapPath, 'utf-8'));
    directDepsMap = depMap.dependencies || {};

    function getTransitiveDeps(rootSkill) {
      const result = new Set([rootSkill]);
      const queue = [rootSkill];
      while (queue.length > 0) {
        const current = queue.shift();
        const currentDeps = directDepsMap[current] || [];
        for (const d of currentDeps) {
          if (!result.has(d)) {
            result.add(d);
            queue.push(d);
          }
        }
      }
      return result;
    }

    standardDeps = getTransitiveDeps('ws-spec-to-pr');
    liteDeps = getTransitiveDeps('ws-spec-to-pr-lite');
  } catch (err) {
    console.error(`Warning: Failed to parse skill-dependencies.json: ${err.message}`);
  }
}

// --- 2. Scan skills directories (top-level only; ws-shared/ is config hub, not skills) ---
const skillsDir = path.join(root, '.agents', 'skills');
const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
const skillDirs = entries
  .filter(e => e.isDirectory() && e.name !== 'ws-shared')
  .map(e => e.name);
const skillFiles = entries
  .filter(e => e.isFile() && e.name.endsWith('.md'))
  .map(e => e.name.replace(/\.md$/, ''));

function findSkillMdPath(dirSlug) {
  const candidates = [
    path.join(skillsDir, dirSlug, 'SKILL.md'),
    path.join(skillsDir, dirSlug + '.md'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return '';
}

function readFrontmatter(filePath) {
  if (!fs.existsSync(filePath)) return { name: '', description: '', version: '' };
  const content = fs.readFileSync(filePath, 'utf-8');
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return { name: '', description: '', version: '' };
  const raw = fm[1];
  const nameMatch = raw.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : '';

  // Handle >-, >, |, |- style YAML descriptions
  let description = '';
  const descMatch = raw.match(/^description:\s*(?:"([^"]*)"|'([^']*)')\s*$/m);
  if (descMatch) {
    description = (descMatch[1] || descMatch[2] || '').trim();
  } else {
    // Folded/block scalar — collect subsequent indented lines
    const lines = raw.split('\n');
    let inDesc = false;
    const descLines = [];
    for (const line of lines) {
      if (line.startsWith('description:')) {
        inDesc = true;
        const after = line.slice('description:'.length).trim();
        if (after && !after.startsWith('>') && !after.startsWith('|')) {
          descLines.push(after);
        }
      } else if (inDesc) {
        if (line.startsWith(' ') || line.startsWith('\t')) {
          const trimmed = line.trim();
          if (trimmed) descLines.push(trimmed);
        } else {
          break;
        }
      }
    }
    description = descLines.join(' ').replace(/\s+/g, ' ').trim();
  }

  const v = raw.match(/^version:\s*(.+)$/m);
  const version = v ? v[1].trim() : '';
  return { name, description, version };
}

// Merge, keeping directories first (files overwrite dir names when both exist)
const allSkillSlugs = [...new Set([...skillDirs, ...skillFiles])];

const skills = [];

for (const slug of allSkillSlugs) {
  const actualPath = findSkillMdPath(slug);
  const content = actualPath ? fs.readFileSync(actualPath, 'utf-8') : '';
  const relPath = actualPath ? path.relative(root, actualPath).replace(/\\/g, '/') : '';


  const fm = readFrontmatter(actualPath || '');
  const name = fm.name || slug;
  const description = fm.description;
  const version = fm.version;

  // Match by frontmatter name first, fall back to slug
  let info = skillLayerMap[name];
  if (!info) info = skillLayerMap[slug];

  if (info) {
    skills.push({ name, slug, description, version, layerNumber: info.layerNumber, layerName: info.layerName, path: relPath });
  }
}

// --- 3. Group by layer ---
const layerPriority = ['Layer 0','Layer 1','Layer 2','Layer 3','Layer 4','Layer 5'];
const groups = {};
for (const s of skills) {
  const key = s.layerNumber;
  if (!groups[key]) groups[key] = { name: s.layerName, skills: [] };
  groups[key].skills.push(s);
}

const sorted = Object.entries(groups).sort(([a], [b]) => {
  const ai = layerPriority.indexOf(a);
  const bi = layerPriority.indexOf(b);
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
});

const totalSkills = sorted
  .filter(([k]) => layerPriority.includes(k))
  .reduce((sum, [, layer]) => sum + layer.skills.length, 0);

// --- 4. Generate catalog HTML (English) ---
let catalogHtml = '';
for (const [key, layer] of sorted) {
  const count = layer.skills.length;
  const layerSlug = key.toLowerCase().replace(/\s+/g, '-');
  catalogHtml += `  <!-- ${key} -->\n`;
  catalogHtml += `  <div class="layer" data-layer-id="${layerSlug}">\n`;
  catalogHtml += `    <div class="layer-header">\n`;
  catalogHtml += `      <h3><span class="layer-tag">${key}</span> — ${layer.name}</h3>\n`;
  catalogHtml += `      <span class="count">${count} skills</span>\n`;
  catalogHtml += `    </div>\n`;
  catalogHtml += `    <div class="skill-grid">\n`;
  for (const sk of layer.skills) {
    if (!sk.description) continue;
    
    let badgesHtml = '';
    const isFull = standardDeps.has(sk.slug);
    const isLite = liteDeps.has(sk.slug);
    if (isFull || isLite) {
      badgesHtml += `        <div class="skill-badges">\n`;
      if (isFull) {
        badgesHtml += `          <span class="skill-badge full">full</span>\n`;
      }
      if (isLite) {
        badgesHtml += `          <span class="skill-badge lite">lite</span>\n`;
      }
      badgesHtml += `        </div>\n`;
    }

    const rawDeps = directDepsMap[sk.slug] || directDepsMap[sk.name] || [];
    let depsHtml = '';
    if (rawDeps.length > 0) {
      const depPills = rawDeps.map(dep => `<span class="dep-pill" data-dep="${dep}">${dep}</span>`).join('');
      depsHtml = `<div class="skill-deps-wrap"><div class="deps-heading">Dependencies (${rawDeps.length}):</div><div class="deps-list">${depPills}</div></div>`;
    } else {
      depsHtml = `<div class="skill-deps-wrap"><div class="deps-heading">Dependencies:</div><div class="deps-list"><span class="dep-pill none">none</span></div></div>`;
    }

    catalogHtml += `      <div class="skill-card" data-path="${sk.path}" data-name="${sk.name.toLowerCase()}" data-slug="${sk.slug.toLowerCase()}" data-desc="${sk.description.toLowerCase()}" data-deps="${rawDeps.join(' ').toLowerCase()}" data-layer="${layerSlug}" data-full="${isFull}" data-lite="${isLite}">\n`;
    catalogHtml += `        <div class="skill-card-top">\n`;
    catalogHtml += `          <div class="name">${sk.name}</div>\n`;
    catalogHtml += badgesHtml;
    catalogHtml += `        </div>\n`;
    catalogHtml += `        <div class="desc">${sk.description}</div>\n`;
    catalogHtml += `        <div class="skill-card-bottom">\n`;
    catalogHtml += `          ${depsHtml}\n`;
    if (sk.path) {
      catalogHtml += `          <a class="view-skill" href="#" data-path="${sk.path}">View skill <span class="arrow">&rarr;</span></a>\n`;
    }
    catalogHtml += `        </div>\n`;
    catalogHtml += `      </div>\n`;
  }
  catalogHtml += `    </div>\n`;
  catalogHtml += `  </div>\n`;
}

// --- 5. Rewrite index.html ---
const indexPath = path.join(root, 'docs', 'index.html');
let html = fs.readFileSync(indexPath, 'utf-8');

const efficiencyFeatureBlock = `  <!-- efficiency-verifiability:start -->
    <div class="role-matrix-card">
      <div class="role-card-header">
        <div class="role-card-icon">KB</div>
        <h4 class="role-card-title">Context budgets and progressive disclosure</h4>
      </div>
      <p class="role-card-desc">Dispatches use bounded subagent contracts and indexed plan slices: an 18 KB fixed preamble, a 4 KB matched MEMORY slice, and a configurable 32 KB total context budget.</p>
    </div>
    <div class="role-matrix-card">
      <div class="role-card-header">
        <div class="role-card-icon">AC</div>
        <h4 class="role-card-title">AC ledger and derived scoring</h4>
      </div>
      <p class="role-card-desc">A machine-readable acceptance-criteria ledger links evidence, tasks, files, tests, findings, and sabotage outcomes. Standard Step 5 derives its score from that ledger, so agents cannot author or override it.</p>
    </div>
    <div class="role-matrix-card">
      <div class="role-card-header">
        <div class="role-card-icon">N</div>
        <h4 class="role-card-title">Atomic Node state runtime</h4>
      </div>
      <p class="role-card-desc">Portable Node helpers write <code>{workflow-id}.state.json</code> first, render <code>.state.md</code>, and publish derived <code>run.json</code>, <code>run.md</code>, step handoff JSON, plans-index, and progress artifacts for reliable resume and inspection.</p>
    </div>
    <div class="role-matrix-card">
      <div class="role-card-header">
        <div class="role-card-icon">T</div>
        <h4 class="role-card-title">Telemetry and deterministic reporting</h4>
      </div>
      <p class="role-card-desc">Per-step JSONL telemetry captures lifecycle, gate, skip, revision, and timing evidence. Aggregate and report commands summarize audit counts and median elapsed time by pipeline and step.</p>
    </div>
    <div class="role-matrix-card">
      <div class="role-card-header">
        <div class="role-card-icon">G</div>
        <h4 class="role-card-title">Gate granularity and adaptive convergence</h4>
      </div>
      <p class="role-card-desc">Choose step or phase gates, with phase mode capped at five blocking decisions. Adaptive polling uses observed check and thread state while preserving fail-closed verification and review convergence.</p>
    </div>
  <!-- efficiency-verifiability:end -->
`;
html = html.replace(
  /  <!-- efficiency-verifiability:start -->[\s\S]*?  <!-- efficiency-verifiability:end -->\r?\n?/,
  ''
);
const featuresStart = html.indexOf('<section id="features">');
const featuresEnd = html.indexOf('</section>', featuresStart);
const featuresGrid = html.indexOf('<div class="role-matrix-grid">', featuresStart);
const featuresInsertAt = html.indexOf('\n', featuresGrid) + 1;
if (featuresStart < 0 || featuresEnd < '</section>'.length || featuresGrid < 0 || featuresGrid > featuresEnd || featuresInsertAt <= 0) {
  console.error('docs/index.html is missing the features grid');
  process.exit(1);
}
html = html.slice(0, featuresInsertAt) + efficiencyFeatureBlock + html.slice(featuresInsertAt);

// Remove Portuguese section entirely
const catPtStart = html.indexOf('<section id="catalogo">');
if (catPtStart !== -1) {
  const catPtEnd = html.indexOf('</section>', catPtStart) + '</section>'.length;
  // Remove everything from the section to just before the next section or install section
  // Find next section start or EOF
  const restAfter = html.slice(catPtEnd).search(/\n<section\s/) ;
  const endIdx = restAfter !== -1 ? catPtEnd + restAfter : catPtEnd;
  html = html.slice(0, catPtStart) + html.slice(endIdx);
}

// Replace English catalog section
const catStart = html.indexOf('<section id="catalog">');
const catEnd = html.indexOf('</section>', catStart) + '</section>'.length;

const startComment = html.slice(0, catStart).lastIndexOf('<!--') !== -1 ? html.slice(0, catStart).lastIndexOf('<!--') : catStart;
const newSection =
`<section id="catalog">
  <div class="catalog-header-wrap">
    <div>
      <h2>Skill Catalog</h2>
      <p class="section-subtitle">Discover every shipped skill. Search by name, layer, or full vs lite.</p>
    </div>
    <div class="catalog-stats">
      <span class="catalog-counter"><strong id="visible-skills-count">${totalSkills || 30}</strong> skills available</span>
    </div>
  </div>

  <div class="catalog-controls">
    <div class="search-box">
      <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input type="text" id="skill-search" placeholder="Search skills by name, keyword, or description... (Press '/' to focus)" aria-label="Search skills">
      <button type="button" id="search-clear" class="search-clear" aria-label="Clear search">&times;</button>
    </div>
    <div class="filter-pills" id="filter-pills">
      <button type="button" class="filter-pill active" data-filter="all">All Skills</button>
      <button type="button" class="filter-pill" data-filter="layer-0">Layer 0 (Harness)</button>
      <button type="button" class="filter-pill" data-filter="layer-1">Layer 1 (Engineering standards)</button>
      <button type="button" class="filter-pill" data-filter="layer-2">Layer 2 (Pipeline + providers)</button>
      <!-- No layer-3 pill: Layer 3 is Discovery (reserved) with zero shipped skills; providers live in layer-2 -->
      <button type="button" class="filter-pill" data-filter="layer-4">Layer 4 (Audit)</button>
      <button type="button" class="filter-pill" data-filter="layer-5">Layer 5 (Utility)</button>
      <button type="button" class="filter-pill" data-filter="full">Full Profile</button>
      <button type="button" class="filter-pill" data-filter="lite">Lite Profile</button>
    </div>
  </div>

  <div id="catalog-layers-wrap">
${catalogHtml}  </div>
  <div id="no-results" class="no-results hidden">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg>
    <h3>No matching skills found</h3>
    <p>Try searching for another keyword or clear filters.</p>
    <button type="button" id="reset-search-btn" class="btn-secondary">Reset Search & Filters</button>
  </div>
</section>`;

if (catStart < 0 || catEnd < '</section>'.length) {
  console.error('docs/index.html is missing the catalog section');
  process.exit(1);
}
html = html.slice(0, catStart) + newSection + html.slice(catEnd);

// --- Installation packages section (from skill-dependencies.json) ---
let packagesHtml = '';
if (fs.existsSync(depMapPath)) {
  const depMap = JSON.parse(fs.readFileSync(depMapPath, 'utf-8'));
  const pkgs = depMap.packages || {};
  const full = pkgs.full || {};
  const workflows = pkgs.workflows || {};
  const extra = pkgs.extra || {};
  const wfCount = Array.isArray(workflows.skills) ? workflows.skills.length : 0;
  const exCount = Array.isArray(extra.skills) ? extra.skills.length : 0;
  const wfPreview = Array.isArray(workflows.skills)
    ? workflows.skills.slice(0, 8).map((s) => `<code>${s}</code>`).join(', ') +
      (workflows.skills.length > 8 ? `, … (+${workflows.skills.length - 8})` : '')
    : '';
  const exPreview = Array.isArray(extra.skills)
    ? extra.skills.map((s) => `<code>${s}</code>`).join(', ')
    : '';

  packagesHtml = `<section id="install-packages">
  <div class="section-header">
    <h2>Installation Packages</h2>
    <p class="section-subtitle">Flexible installation presets powered by <code>bin/skill-dependencies.json</code> dependency graph.</p>
  </div>

  <div class="packages-grid">
    <div class="package-card">
      <div class="package-badge-wrap">
        <span class="package-shortcut">Shortcut: <code>${full.shortcut || 'f'}</code></span>
      </div>
      <h4>Full Package</h4>
      <p class="package-desc">${full.label || 'Full package'} — selects every installable top-level skill and initializes the <code>ws-shared/</code> config/docs hub.</p>
      <div class="package-features">
        <div class="pkg-feat"><span>✓</span> Every top-level skill</div>
        <div class="pkg-feat"><span>✓</span> Full <code>ws-shared/</code> config & docs hub</div>
        <div class="pkg-feat"><span>✓</span> Best for complete team environments</div>
      </div>
    </div>

    <div class="package-card featured">
      <div class="package-featured-badge">RECOMMENDED</div>
      <div class="package-badge-wrap">
        <span class="package-shortcut">Shortcut: <code>${workflows.shortcut || 'w'}</code></span>
      </div>
      <h4>Workflows Package</h4>
      <p class="package-desc">${workflows.label || 'Workflows package'} — ${wfCount} skills (orchestrators, pipeline, providers, harness, promoted utilities) plus the <code>ws-shared/</code> hub.</p>
      <div class="package-preview">
        <strong>Included core skills:</strong> ${wfPreview}
      </div>
    </div>

    <div class="package-card">
      <div class="package-badge-wrap">
        <span class="package-shortcut">Shortcut: <code>${extra.shortcut || 'e'}</code></span>
      </div>
      <h4>Extra Package</h4>
      <p class="package-desc">${extra.label || 'Extra package'} — ${exCount} optional authoring/review skills. Does not install workflow orchestrators or hub by default.</p>
      <div class="package-preview">
        <strong>Includes:</strong> ${exPreview}
      </div>
    </div>
  </div>
</section>

`;
}

if (packagesHtml) {
  if (html.includes('<section id="install-packages">')) {
    html = html.replace(
      /<section id="install-packages">[\s\S]*?<\/section>/,
      packagesHtml.trim()
    );
  } else if (html.includes('<section id="install">')) {
    html = html.replace(
      '<section id="install">',
      `${packagesHtml.trim()}\n\n<section id="install">`
    );
  }
}

// Update badge count
html = html.replace(
  /(<span class="badge">)\d+( skills<\/span>)/,
  `$1${totalSkills}$2`
);

const layerCount = sorted.filter(([k]) => k).length;
html = html.replace(
  /(<span class="badge">)\d+( layers<\/span>)/,
  `$1${layerCount}$2`
);

// Stamp footer from package.json (same version consumers see via --version / --check)
html = html.replace(
  /(<footer>\s*<p>MIT &mdash; <a href="https:\/\/github.com\/jpolvora\/workflow-skills"[^>]*>jpolvora\/workflow-skills<\/a>)( &mdash; v\d+\.\d+\.\d+)?(.*?\s*<\/p>\s*<\/footer>)/s,
  `$1 &mdash; v${siteVersion} &mdash; Developed by <a href="https://jpolvora.github.io/" target="_blank" rel="noopener">Jone Polvora</a></p>\n</footer>`
);

html = html.replace(/\r\n?/g, '\n');
if (/^(?:<{7}|={7}|>{7})/m.test(html)) {
  console.error('generated docs/index.html contains merge-conflict markers');
  process.exit(1);
}
const currentHtml = fs.readFileSync(indexPath, 'utf8').replace(/\r\n?/g, '\n');
const changed = currentHtml !== html;
if (shouldCheck && changed) {
  console.error('docs/index.html is stale; run node bin/build-site.js');
  process.exit(1);
}
if (!shouldCheck && changed) fs.writeFileSync(indexPath, html, 'utf8');

// --- 6. Report ---
console.log(`${shouldCheck ? 'Site is current' : changed ? 'Site updated' : 'Site unchanged'}: ${totalSkills} skills across ${layerCount} layers`);
