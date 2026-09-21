#!/usr/bin/env node
'use strict';

// Port of check_memory_conflict.py (ws-spec-to-pr):
// check-memory-conflict -- cross-reference a plan file against MEMORY.md entries.
//
// Usage:
//   node check_memory_conflict.cjs <plan_file>
//   node check_memory_conflict.cjs <plan_file> --json
//
// Returns:
//   Exit 0: no overlaps found, or MEMORY.md is absent (consult skipped)
//   Exit 1: plan file missing
//   Exit 2: traps found that overlap the plan scope

const fs = require('fs');
const path = require('path');

const HUB_SCRIPTS_DIR = (() => {
  const packaged = path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'scripts');
  const candidates = [packaged];
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

function resolveMemoryPath(explicitMemory, explicitSharedDir, repoRoot) {
  if (explicitMemory) return path.resolve(String(explicitMemory).replace(/^~(?=$|[\\/])/, process.env.HOME || ''));
  const { resolveConsumerContext, resolveRepoRoot, sharedDir, resolveEffectiveMemoryPaths } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));
  const root = resolveRepoRoot(repoRoot, { scriptFile: __filename });
  const hub = explicitSharedDir ? path.resolve(explicitSharedDir) : sharedDir(root);
  let config = {};
  try { config = (resolveConsumerContext({ repoRoot: root, scriptFile: __filename }).config) || {}; } catch { config = {}; }
  return resolveEffectiveMemoryPaths(root, hub, config).index_file;
}

const KNOWN_MODULES = [];
const KNOWN_LAYERS = ['Core', 'Infrastructure', 'Api', 'Web', 'Tests', 'Harness', 'Domain', 'Application'];

const PATH_PREFIX_RE = /(?:\.agents\/|bin\/|docs\/|scripts\/|specs\/|test\/|tests\/|src\/|web\/)\S+/g;
const BACKTICK_PATH_RE = /`((?:\.agents\/|bin\/|docs\/|scripts\/|specs\/|test\/|tests\/|src\/|web\/)[^`]+)`/g;
const WS_SKILL_RE = /\bws-[a-z0-9]+(?:-[a-z0-9]+)*\b/gi;
const TOKEN_BOUNDARY_BEFORE = '(?<![a-z0-9])';
const TOKEN_BOUNDARY_AFTER = '(?![a-z0-9])';

function moduleNameParts(mod) {
  const parts = [];
  for (const chunk of String(mod).split(/[-\s]+/)) {
    if (!chunk) continue;
    let spaced = chunk.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    for (const p of spaced.split(/\s+/)) if (p) parts.push(p.toLowerCase());
  }
  return parts;
}

function moduleMatchPattern(mod) {
  const parts = moduleNameParts(mod).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!parts.length) return /(?!x)x/;
  const withPlural = (s) => `${s}s?`;
  if (parts.length === 1) return new RegExp(`${TOKEN_BOUNDARY_BEFORE}${withPlural(parts[0])}${TOKEN_BOUNDARY_AFTER}`);
  const pluralParts = [...parts.slice(0, -1), withPlural(parts[parts.length - 1])];
  const separated = pluralParts.join('[-\\s]?');
  const concatenated = withPlural(parts.join(''));
  return new RegExp(`${TOKEN_BOUNDARY_BEFORE}(?:${separated}|${concatenated})${TOKEN_BOUNDARY_AFTER}`);
}

function normalizeForModuleSearch(text) {
  return String(text).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').toLowerCase();
}

function textContainsModule(text, mod) {
  moduleMatchPattern(mod).lastIndex = 0;
  return moduleMatchPattern(mod).test(normalizeForModuleSearch(text));
}

function readUtf8(p) { return fs.readFileSync(p, 'utf8'); }

function cleanList(val) {
  return String(val).replace(/^`|`$/g, '').split(/[,;]/).map((v) => v.trim().replace(/^`|`$/g, '')).filter(Boolean);
}

function normalizePath(p) {
  return String(p).trim().replace(/^[`"'*]+|[`"'*]+$/g, '').replace(/\\/g, '/').replace(/[.,;:()[\]{}]+$/g, '').toLowerCase();
}
function normalizePathSimple(p) {
  return String(p).trim().replace(/^`|`$/g, '').replace(/^["']|["']$/g, '').replace(/\\/g, '/').replace(/[.,;:()[\]{}]+$/g, '').toLowerCase();
}

function moduleTokens(mod) {
  const raw = String(mod).trim().replace(/^`|`$/g, '');
  const tokens = [];
  for (const part of raw.split(/[/|,;]+/)) {
    const t = part.trim().replace(/^`|`$/g, '').trim();
    if (!t) continue;
    tokens.push(t.toLowerCase());
    for (const m of t.matchAll(new RegExp(WS_SKILL_RE.source, 'gi'))) tokens.push(m[0].toLowerCase());
    const base = t.replace(/\\/g, '/').split('/').pop().toLowerCase();
    if (base && base !== t.toLowerCase()) {
      tokens.push(base);
      if (/\.(py|cjs|js)$/.test(base)) tokens.push(base.replace(/\.(py|cjs|js)$/, ''));
    }
  }
  return [...new Set(tokens)];
}

function fnmatch(text, pattern) {
  // Minimal fnmatch: * and ? only.
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${esc}$`).test(text);
}

function pathPatternHit(planPaths, patterns, planText = '') {
  const norms = new Set([...planPaths].filter(Boolean).map(normalizePathSimple));
  const textNorm = String(planText).replace(/\\/g, '/').toLowerCase();
  for (const pattern of patterns) {
    const pat = normalizePathSimple(pattern);
    if (!pat) continue;
    const fnPat = pat.replace(/\*\*\//g, '*').replace(/\*\*/g, '*');
    for (const p of norms) {
      if (fnmatch(p, fnPat)) return true;
      if (pat.endsWith('/**') || pat.endsWith('/*')) {
        const prefix = pat.replace(/\*+$/g, '').replace(/\/+$/g, '');
        if (p === prefix || p.startsWith(prefix + '/')) return true;
      }
      const bare = pat.replace(/\/\*+$/g, '');
      if (bare && (p.startsWith(bare + '/') || p.includes(bare))) return true;
    }
    const bare = pat.replace(/\/\*+$/g, '');
    if (bare && textNorm.includes(bare)) return true;
  }
  return false;
}

function parseMemory(memoryPath) {
  const text = readUtf8(memoryPath);
  const traps = [];
  const patterns = [];
  let current = null;
  let section = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine + '\n';
    const sm = line.match(/^##\s+(Traps|Patterns)/i);
    if (sm) { section = sm[1].toLowerCase(); continue; }
    const hm = line.match(/^###\s(.+)/);
    if (hm) {
      if (current) (current.type === 'trap' ? traps : patterns).push(current);
      current = { title: hm[1].trim(), type: section === 'patterns' ? 'pattern' : 'trap', layers: [], modules: [], severity: null, path_patterns: [], text: line };
      continue;
    }
    if (!current) continue;
    current.text += line;
    let m = line.match(/-\s*\*\*Layer\*\*:\s*(.*)/);
    if (m) current.layers = cleanList(m[1]);
    m = line.match(/-\s*\*\*Module\*\*:\s*(.*)/);
    if (m) current.modules = cleanList(m[1]);
    m = line.match(/-\s*\*\*Severity\*\*:\s*(.*)/);
    if (m) current.severity = m[1].trim().replace(/^`|`$/g, '').trim();
    m = line.match(/-\s*\*\*PathPattern\*\*:\s*(.*)/);
    if (m) current.path_patterns = cleanList(m[1]);
  }
  if (current) (current.type === 'trap' ? traps : patterns).push(current);
  return { traps, patterns };
}

function extractPlanKeywords(planPath) {
  const text = readUtf8(planPath);
  const keywords = { layers: new Set(), modules: new Set(), entities: new Set(), file_paths: new Set(), us_ids: new Set() };
  for (const layer of KNOWN_LAYERS) {
    if (new RegExp(`\\b${layer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) keywords.layers.add(layer);
  }
  for (const mod of KNOWN_MODULES) {
    if (textContainsModule(text, mod)) keywords.modules.add(mod);
  }
  for (const m of text.matchAll(new RegExp(WS_SKILL_RE.source, 'gi'))) keywords.modules.add(m[0]);
  for (const m of text.matchAll(new RegExp(PATH_PREFIX_RE.source, 'g'))) {
    keywords.file_paths.add(m[0].replace(/[.,;()[\]{}*`"']+$/g, ''));
  }
  for (const m of text.matchAll(new RegExp(BACKTICK_PATH_RE.source, 'g'))) {
    keywords.file_paths.add(m[1].replace(/[.,;()[\]{}*]+$/g, ''));
  }
  for (const m of text.matchAll(/\b[A-Z][a-zA-Z0-9]+(?:Service|Controller|Request|Dto|Mapper|Provider)\b/g)) {
    keywords.entities.add(m[0]);
  }
  for (const m of text.matchAll(/(?:US|us|#)\s*(\d{3,5})/g)) keywords.us_ids.add(m[1]);
  return { layers: [...keywords.layers].sort(), modules: [...keywords.modules].sort(), entities: [...keywords.entities].sort(), file_paths: [...keywords.file_paths].sort(), us_ids: [...keywords.us_ids].sort() };
}

function crossReference(memory, plan, planText = '') {
  const planLayers = new Set(plan.layers);
  const planModuleKeys = new Set();
  for (const m of plan.modules) {
    planModuleKeys.add(m.toLowerCase().replace(/-/g, ''));
    for (const tok of moduleTokens(m)) planModuleKeys.add(tok.replace(/-/g, ''));
  }
  const planEntities = new Set(plan.entities.map((e) => e.toLowerCase()));
  const planFilePaths = new Set(plan.file_paths.map(normalizePathSimple));
  const planTextL = planText.toLowerCase().replace(/\\/g, '/');
  const results = { traps: [], patterns: [] };
  for (const entryType of ['traps', 'patterns']) {
    for (const entry of memory[entryType]) {
      const entryLayers = new Set(entry.layers);
      const entryModuleKeys = new Set();
      for (const em of entry.modules) {
        for (const tok of moduleTokens(em)) entryModuleKeys.add(tok.replace(/-/g, ''));
      }
      const layerOverlap = [...planLayers].filter((l) => entryLayers.has(l));
      const meaningfulLayers = layerOverlap.filter((l) => l !== 'Harness');
      const moduleOverlap = [...planModuleKeys].filter((k) => entryModuleKeys.has(k));
      const entityHit = [...planEntities].some((e) => entry.text.toLowerCase().includes(e));
      const pathHit = pathPatternHit(planFilePaths, entry.path_patterns || [], planText)
        || [...planFilePaths].some((p) => entry.text.toLowerCase().replace(/\\/g, '/').includes(p));
      let moduleTextHit = false;
      const matchedFromText = [];
      for (const em of entry.modules) {
        for (const tok of moduleTokens(em)) {
          if (tok.length < 3) continue;
          const esc = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (tok.startsWith('ws-')) {
            if (new RegExp(`\\b${esc}\\b`, 'i').test(planTextL)) { moduleTextHit = true; matchedFromText.push(tok); }
          } else if (planTextL.includes(tok)) { moduleTextHit = true; matchedFromText.push(tok); }
        }
      }
      const matchedModules = moduleOverlap.length ? [...moduleOverlap].sort() : [...new Set(matchedFromText)].sort();
      if (pathHit || moduleOverlap.length || moduleTextHit || entityHit || meaningfulLayers.length) {
        results[entryType].push({
          title: entry.title,
          type: entry.type,
          severity: entry.severity,
          matched_layers: [...layerOverlap].sort(),
          matched_modules: matchedModules,
          entity_match: entityHit,
          path_match: pathHit,
          force_interview: entryType === 'traps' && pathHit && ['high', 'critical'].includes(String(entry.severity || '').toLowerCase()),
        });
      }
    }
  }
  return results;
}

function formatReport(planPath, planKeywords, results) {
  const lines = [];
  lines.push('='.repeat(50));
  lines.push('  check-memory-conflict -- report');
  lines.push('='.repeat(50));
  lines.push(`Plan: ${planPath}`);
  lines.push('');
  lines.push('## Scope detected in plan');
  lines.push(`  Layers: ${planKeywords.layers.join(', ') || '(none)'}`);
  lines.push(`  Modules: ${planKeywords.modules.join(', ') || '(none)'}`);
  const entities = planKeywords.entities;
  lines.push(`  Entities/classes: ${entities.slice(0, 8).join(', ') || '(none)'}`);
  if (entities.length > 8) lines.push(`    ... +${entities.length - 8} more`);
  lines.push('');
  const total = results.traps.length + results.patterns.length;
  if (total === 0) {
    lines.push('[OK] No overlap found -- no entry in MEMORY.md');
    lines.push('   corresponds to the detected scope.');
    return lines.join('\n');
  }
  lines.push(`## Alerts (${total} related entry/entries)`);
  lines.push('');
  if (results.traps.length) {
    lines.push('### [TRAPS] (known traps)');
    for (const t of results.traps) {
      const sev = t.severity ? ` [${String(t.severity).toUpperCase()}]` : '';
      const tags = [];
      if (t.matched_layers.length) tags.push(`layer=${t.matched_layers.join(',')}`);
      if (t.matched_modules.length) tags.push(`module=${t.matched_modules.join(',')}`);
      if (t.entity_match) tags.push('entity');
      if (t.path_match) tags.push('path');
      lines.push(`  -> ${t.title}${sev}`);
      lines.push(`    match: ${tags.join(', ')}`);
    }
    lines.push('');
  }
  if (results.patterns.length) {
    lines.push('### [PATTERNS] (reusable patterns)');
    for (const p of results.patterns) {
      const tags = [];
      if (p.matched_layers.length) tags.push(`layer=${p.matched_layers.join(',')}`);
      if (p.matched_modules.length) tags.push(`module=${p.matched_modules.join(',')}`);
      if (p.entity_match) tags.push('entity');
      if (p.path_match) tags.push('path');
      lines.push(`  -> ${p.title}`);
      lines.push(`    match: ${tags.join(', ')}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function printHelp() {
  console.log('Usage: node check_memory_conflict.cjs <plan_file> [--json] [--soft-exit] [--memory FILE] [--shared-dir DIR] [--repo-root DIR]');
}

function parseArgs(argv) {
  const o = { planFile: null, json: false, softExit: false, memory: null, sharedDir: null, repoRoot: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else if (a === '--json') o.json = true;
    else if (a === '--soft-exit') o.softExit = true;
    else if (a === '--memory') o.memory = argv[++i];
    else if (a.startsWith('--memory=')) o.memory = a.slice(9);
    else if (a === '--shared-dir') o.sharedDir = argv[++i];
    else if (a.startsWith('--shared-dir=')) o.sharedDir = a.slice(13);
    else if (a === '--repo-root') o.repoRoot = argv[++i];
    else if (a.startsWith('--repo-root=')) o.repoRoot = a.slice(12);
    else if (a.startsWith('--')) { console.error(`unknown argument: ${a}`); process.exit(2); }
    else if (!o.planFile) o.planFile = a;
    else { console.error(`unexpected argument: ${a}`); process.exit(2); }
  }
  if (!o.planFile) { console.error('argument plan_file is required'); process.exit(2); }
  return o;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const planPath = path.resolve(args.planFile);
  if (!fs.existsSync(planPath)) {
    console.log(`Error: file not found: ${args.planFile}`);
    process.exit(1);
  }
  const memoryPath = resolveMemoryPath(args.memory, args.sharedDir, args.repoRoot);
  if (!fs.existsSync(memoryPath)) {
    if (args.json) {
      const plan = extractPlanKeywords(planPath);
      console.log(JSON.stringify({ plan_keywords: plan, results: { traps: [], patterns: [] }, memory_path: String(memoryPath), memory_missing: true, force_interview: false }, null, 2));
    } else {
      console.log(`Notice: MEMORY.md not found at ${memoryPath} (skipping memory conflict check)`);
    }
    process.exit(0);
  }
  const memory = parseMemory(memoryPath);
  const planText = readUtf8(planPath);
  const plan = extractPlanKeywords(planPath);
  if (args.softExit && !args.json) {
    console.error('Error: --soft-exit requires --json so force_interview is machine-readable');
    process.exit(1);
  }
  const results = crossReference(memory, plan, planText);
  const hasTraps = results.traps.length > 0;
  const forceInterview = results.traps.some((t) => t.force_interview) || (args.softExit && hasTraps);
  if (args.json) {
    console.log(JSON.stringify({ plan_keywords: plan, results, memory_path: String(memoryPath), force_interview: forceInterview }, null, 2));
  } else {
    console.log(formatReport(args.planFile, plan, results));
  }
  if (hasTraps) process.exit(args.softExit ? 0 : 2);
  process.exit(0);
}

if (require.main === module) main();
module.exports = { crossReference, extractPlanKeywords, parseMemory };
