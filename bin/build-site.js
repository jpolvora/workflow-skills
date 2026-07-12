#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

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
// --- 2. Scan skills directories and flat .md files ---
const skillsDir = path.join(root, '.agents', 'skills');
const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
const skillDirs = entries
  .filter(e => e.isDirectory())
  .map(e => e.name);
const skillFiles = entries
  .filter(e => e.isFile() && e.name.endsWith('.md'))
  .map(e => e.name.replace(/\.md$/, ''));

// Merge, keeping directories first (files overwrite dir names when both exist)
const allSkillSlugs = [...new Set([...skillDirs, ...skillFiles])];

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
          descLines.push(line.trimEnd());
        } else {
          break;
        }
      }
    }
    description = descLines.join(' ').trim();
  }

  const v = raw.match(/^version:\s*(.+)$/m);
  const version = v ? v[1].trim() : '';
  return { name, description, version };
}

const skills = [];

for (const slug of allSkillSlugs) {
  const possiblePaths = [
    path.join(skillsDir, slug, 'SKILL.md'),
    path.join(skillsDir, slug + '.md'),
  ];
  let content = '';
  let actualPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      content = fs.readFileSync(p, 'utf-8');
      actualPath = path.relative(root, p).replace(/\\/g, '/');
      break;
    }
  }

  const fm = readFrontmatter(possiblePaths.find(p => fs.existsSync(p)) || '');
  const name = fm.name || slug;
  const description = fm.description;
  const version = fm.version;

  // Match by frontmatter name first, fall back to slug
  let info = skillLayerMap[name];
  if (!info) info = skillLayerMap[slug];

  if (info) {
    skills.push({ name, description, version, layerNumber: info.layerNumber, layerName: info.layerName, path: actualPath });
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

// Update badge count
const totalSkills = sorted
  .filter(([k]) => layerPriority.includes(k))
  .reduce((sum, [, layer]) => sum + layer.skills.length, 0);

html = html.replace(
  /(<span class="badge">)\d+( skills<\/span>)/,
  `$1${totalSkills}$2`
);

fs.writeFileSync(indexPath, html);

// --- 6. Report ---
const layerCount = sorted.filter(([k]) => k).length;
console.log(`✅ Site updated: ${totalSkills} skills across ${layerCount} layers`);
