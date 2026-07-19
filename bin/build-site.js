#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// --- Version Bumping ---
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;
const versionParts = currentVersion.split('.').map(Number);
versionParts[2] += 1; // Bump patch version
const newVersion = versionParts.join('.');
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Bumping package.json version: ${currentVersion} -> ${newVersion}`);

// --- 1. Parse AGENTS.md layer tables ---
const agentsMd = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf-8');

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

function parseTableRows(block) {
  const lines = block.split('\n');
  const rows = [];
  let inTable = false;
  let headerCols = 0;

  for (const line of lines) {
    if (!line.startsWith('|')) { inTable = false; continue; }

    const cells = line.split('|').slice(1, -1).map(c => c.trim());

    if (cells.some(c => /^-+$/.test(c))) { inTable = true; continue; }
    if (!inTable && cells.length >= 3) {
      const allPlain = cells.every(c => !c.includes('`') && !/^-+$/.test(c));
      if (allPlain) { headerCols = cells.length; inTable = true; continue; }
    }

    if (!inTable) continue;

    let skillName = '';
    let desc = '';
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const m = cell.match(/^`([^`]+)`$/);
      if (m && /^[\w.-]+$/.test(m[1]) && !m[1].startsWith('.')) {
        skillName = m[1];
        desc = cells[cells.length - 1];
        break;
      }
    }

    if (skillName) {
      rows.push({ name: skillName, description: desc.replace(/^["']|["']$/g, '').trim() });
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
// --- 2. Scan skills directories (top-level only; shared/ is config hub, not skills) ---
const skillsDir = path.join(root, '.agents', 'skills');
const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
const skillDirs = entries
  .filter(e => e.isDirectory() && e.name !== 'shared')
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
    skills.push({ name, description, version, layerNumber: info.layerNumber, layerName: info.layerName, path: relPath });
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

// --- 4. Generate catalog HTML (English) ---
let catalogHtml = '';
for (const [key, layer] of sorted) {
  const count = layer.skills.length;
  catalogHtml += `  <!-- ${key} -->\n`;
  catalogHtml += `  <div class="layer">\n`;
  catalogHtml += `    <h3>${key} — ${layer.name} <span class="count">(${count})</span></h3>\n`;
  catalogHtml += `    <div class="skill-grid">\n`;
  for (const sk of layer.skills) {
    if (!sk.description) continue;
    catalogHtml += `      <div class="skill-card" data-path="${sk.path}">\n`;
    catalogHtml += `        <div class="name">${sk.name}</div>\n`;
    catalogHtml += `        <div class="desc">${sk.description}</div>\n`;
    if (sk.path) {
      catalogHtml += `        <a class="view-skill" href="#" data-path="${sk.path}">View skill</a>\n`;
    }
    catalogHtml += `      </div>\n`;
  }
  catalogHtml += `    </div>\n`;
  catalogHtml += `  </div>\n`;
}

// --- 5. Rewrite index.html ---
const indexPath = path.join(root, 'docs', 'index.html');
let html = fs.readFileSync(indexPath, 'utf-8');

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
  <h2>Skill Catalog</h2>

${catalogHtml}</section>`;

html = html.slice(0, catStart) + newSection + html.slice(catEnd);

// --- Installation packages section (from skill-dependencies.json) ---
const depMapPath = path.join(root, 'bin', 'skill-dependencies.json');
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
  <h2>Installation packages</h2>
  <p>
    The interactive installer (<code>npx --yes github:jpolvora/workflow-skills</code>) supports package shortcuts
    and skill-by-skill selection. Membership and install-time dependencies are defined in
    <code>bin/skill-dependencies.json</code> (update the map whenever the installer graph changes).
  </p>
  <p>
    Full / Workflows installs also ensure the <code>shared/</code> hub (templates + preserved consumer data).
    Workflow artifact paths come from consumer <code>config.json</code> (defaults under <code>.agents/plans</code> /
    <code>.agents/codereviews</code>). Optional host pointer files are consumer-owned — not required by skills.
    Packaged <code>.agents/AGENTS.md</code> includes portable <a href="https://github.com/jpolvora/workflow-skills/blob/main/.agents/AGENTS.md#external-dependencies">External dependencies</a>
    so consumers are not dead-ended when the root hub omits that section.
  </p>
  <div class="install-steps">
    <div class="install-step">
      <h4>Full package (<code>${full.shortcut || 'f'}</code>)</h4>
      <p>${full.label || 'Full package'} — selects every installable top-level skill and installs the <code>shared/</code> config/docs hub.</p>
    </div>
    <div class="install-step">
      <h4>Workflows package (<code>${workflows.shortcut || 'w'}</code>)</h4>
      <p>${workflows.label || 'Workflows package'} — ${wfCount} skills (orchestrators, pipeline, providers, harness, promoted utilities) plus the <code>shared/</code> hub. Does not force Extra-only skills.</p>
      <p>Includes: ${wfPreview}</p>
    </div>
    <div class="install-step">
      <h4>Extra package (<code>${extra.shortcut || 'e'}</code>)</h4>
      <p>${extra.label || 'Extra package'} — ${exCount} optional authoring/review skills. Does not install workflow orchestrators or the hub by default.</p>
      <p>Includes: ${exPreview}</p>
    </div>
    <div class="install-step">
      <h4>Individual selection</h4>
      <p>Toggle skills by number. Selecting a skill also selects its transitive install dependencies from the map. Deselecting a skill does <strong>not</strong> cascade-deselect dependencies.</p>
    </div>
  </div>
</section>

`;
}

const installStart = html.indexOf('<section id="install">');
if (installStart !== -1) {
  // Replace existing install-packages section if present, else insert before #install
  const existingPkgs = html.indexOf('<section id="install-packages">');
  if (existingPkgs !== -1) {
    const existingEnd = html.indexOf('</section>', existingPkgs) + '</section>'.length;
    html = html.slice(0, existingPkgs) + packagesHtml + html.slice(existingEnd);
  } else {
    html = html.slice(0, installStart) + packagesHtml + html.slice(installStart);
  }
}

// Update badge count
const totalSkills = sorted
  .filter(([k]) => layerPriority.includes(k))
  .reduce((sum, [, layer]) => sum + layer.skills.length, 0);

html = html.replace(
  /(<span class="badge">)\d+( skills<\/span>)/,
  `$1${totalSkills}$2`
);

const layerCount = sorted.filter(([k]) => k).length;
html = html.replace(
  /(<span class="badge">)\d+( layers<\/span>)/,
  `$1${layerCount}$2`
);

// Replace version in footer
html = html.replace(
  /(<footer>\s*<p>MIT &mdash; <a href="https:\/\/github.com\/jpolvora\/workflow-skills">jpolvora\/workflow-skills<\/a>)( &mdash; v\d+\.\d+\.\d+)?(\s*<\/p>\s*<\/footer>)/,
  `$1 &mdash; v${newVersion}$3`
);

fs.writeFileSync(indexPath, html);

// --- 6. Report ---
console.log(`✅ Site updated: ${totalSkills} skills across ${layerCount} layers`);
