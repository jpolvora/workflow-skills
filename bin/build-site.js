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

    // Detect header row — all cells are plain (no backticks) or dashed
    if (cells.some(c => /^-+$/.test(c))) { inTable = true; continue; }
    if (!inTable && cells.length >= 3) {
      const allPlain = cells.every(c => !c.includes('`') && !/^-+$/.test(c));
      if (allPlain) { headerCols = cells.length; inTable = true; continue; }
    }

    if (!inTable) continue;

    // Find the skill cell — it's the one with backticks containing a name
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
for (let i = 0; i < layerSections.length; i++) {
  const sec = layerSections[i];
  const end = i + 1 < layerSections.length ? layerSections[i + 1].start : agentsMd.length;
  const block = agentsMd.slice(sec.start, end);

  for (const row of parseTableRows(block)) {
    skillLayerMap[row.name] = {
      layerNumber: sec.number,
      layerName: sec.name,
      description: row.description,
    };
  }
}

// --- 2. Scan skills directories ---
const skillsDir = path.join(root, '.agents', 'skills');
const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
const skillDirs = entries
  .filter(e => e.isDirectory())
  .map(e => e.name);

const skills = [];
const noLayer = [];

for (const dir of skillDirs) {
  const skMd = path.join(skillsDir, dir, 'SKILL.md');
  let name = dir;
  let description = '';
  let version = '';

  if (fs.existsSync(skMd)) {
    const content = fs.readFileSync(skMd, 'utf-8');
    const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fm) {
      const raw = fm[1];
      const n = raw.match(/^name:\s*(.+)$/m);
      if (n) name = n[1].trim();
      const d = raw.match(/^description:\s*(?:"([^"]*)"|'([^']*)'|>\s*(.*?)$)/m);
      if (d) description = (d[1] || d[2] || d[3] || '').trim();
      const v = raw.match(/^version:\s*(.+)$/m);
      if (v) version = v[1].trim();
    }
  }

  const info = skillLayerMap[name];
  if (info) {
    skills.push({ name, description: description || info.description, version, layerNumber: info.layerNumber, layerName: info.layerName });
  } else {
    noLayer.push(name);
    skills.push({ name, description: description || '', version, layerNumber: '', layerName: 'Outros' });
  }
}

// --- 3. Group by layer ---
const layerPriority = ['Layer 0','Layer 1','Layer 2','Layer 3','Layer 4','Layer 5'];
const groups = {};
for (const s of skills) {
  const key = s.layerNumber || 'outros';
  if (!groups[key]) groups[key] = { name: s.layerName, skills: [] };
  groups[key].skills.push(s);
}

const sorted = Object.entries(groups).sort(([a], [b]) => {
  const ai = layerPriority.indexOf(a);
  const bi = layerPriority.indexOf(b);
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
});

// --- 4. Generate catalog HTML ---
let catalogHtml = '';
for (const [key, layer] of sorted) {
  const count = layer.skills.length;
  catalogHtml += `  <!-- ${key || 'outros'} -->\n`;
  catalogHtml += `  <div class="layer">\n`;
  catalogHtml += `    <h3>${key ? `${key} — ` : ''}${layer.name} <span class="count">(${count})</span></h3>\n`;
  catalogHtml += `    <div class="skill-grid">\n`;
  for (const sk of layer.skills) {
    catalogHtml += `      <div class="skill-card">\n`;
    catalogHtml += `        <div class="name">${sk.name}</div>\n`;
    catalogHtml += `        <div class="desc">${sk.description || '(sem descrição)'}</div>\n`;
    catalogHtml += `      </div>\n`;
  }
  catalogHtml += `    </div>\n`;
  catalogHtml += `  </div>\n`;
}

// --- 5. Rewrite index.html ---
const indexPath = path.join(root, 'docs', 'index.html');
let html = fs.readFileSync(indexPath, 'utf-8');

// Update badge count
html = html.replace(
  /(<span class="badge">)\d+( skills<\/span>)/,
  `$1${skills.length}$2`
);

// Replace catalog section
const catStart = html.indexOf('<section id="catalogo">');
const catEnd = html.indexOf('</section>', catStart) + '</section>'.length;

const newSection =
`<section id="catalogo">
  <h2>Catálogo de Skills</h2>

${catalogHtml}</section>`;

html = html.slice(0, catStart) + newSection + html.slice(catEnd);

fs.writeFileSync(indexPath, html);

// --- 6. Report ---
const layerCount = sorted.filter(([k]) => k && k !== 'outros').length;
console.log(`✅ Site updated: ${skills.length} skills across ${layerCount} layers`);
if (noLayer.length) {
  console.log(`⚠️  Skills not mapped in AGENTS.md layer tables: ${noLayer.join(', ')}`);
}
