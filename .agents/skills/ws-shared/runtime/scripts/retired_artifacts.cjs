'use strict';

/**
 * Retired product artifacts (removed upstream). Used by install/update migration,
 * ws-doctor stale-config warnings, and harness forbidden-id checks.
 *
 * Removed in 0.3.37: ws-audit, defaults.enableAuditing
 * Removed in 0.3.38: ws-patterns*, session leases / git.lock, defaults.sessionLeases
 * Renamed in 0.3.56 (skill family naming, no compat dirs): ws-write-spec -> ws-spec-write,
 *   ws-sync-spec -> ws-spec-update, ws-multi-spec -> ws-spec-multi,
 *   ws-github-provider -> ws-spec-provider-github,
 *   ws-azure-devops-provider -> ws-spec-provider-azure-devops,
 *   ws-local-spec-provider -> ws-spec-provider-local, ws-write-plan -> ws-plan-write,
 *   ws-verify-plan -> ws-plan-verify, ws-update-plan-implementation -> ws-plan-update,
 *   ws-interview -> ws-plan-interview
 */

const RETIRED_HUB_FILES = [
  'session-lease.schema.json',
  'backend.md.template',
  'frontend.md.template',
];

const RETIRED_SKILL_DIRS = [
  'ws-patterns',
  'ws-patterns-backend',
  'ws-patterns-frontend',
  'ws-audit',
  'ws-write-spec',
  'ws-sync-spec',
  'ws-multi-spec',
  'ws-github-provider',
  'ws-azure-devops-provider',
  'ws-local-spec-provider',
  'ws-write-plan',
  'ws-verify-plan',
  'ws-update-plan-implementation',
  'ws-interview',
];

const RETIRED_DEFAULTS_KEYS = [
  'sessionLeases',
  'enableAuditing',
  'patternsBackend',
  'patternsFrontend',
  'patterns',
];

const RETIRED_DEFAULTS_COMMENT_KEYS = [
  '_comment_sessionLeases',
  '_comment_enableAuditing',
  '_comment_patternsBackend',
  '_comment_patternsFrontend',
  '_comment_patterns',
];

/**
 * Legacy bare install ids with no canonical target — manifest-prune only.
 * Never treated as skill folders (no fs.rmSync): these never existed as
 * `ws-*` directories, so folder removal must not touch them.
 */
const RETIRED_BARE_IDS = [
  'azure-devops',
  'caveman',
  'code-review',
  'fix-pr',
  'plan-us',
  'us-delivery-workflow',
];

/** Retired → canonical migration source of truth (0.3.56 family rename). */
const RETIRED_TO_CANONICAL = {
  'ws-write-spec': 'ws-spec-write',
  'ws-sync-spec': 'ws-spec-update',
  'ws-multi-spec': 'ws-spec-multi',
  'ws-local-spec-provider': 'ws-spec-provider-local',
  'ws-verify-plan': 'ws-plan-verify',
  'ws-github-provider': 'ws-spec-provider-github',
  'ws-azure-devops-provider': 'ws-spec-provider-azure-devops',
  'ws-write-plan': 'ws-plan-write',
  'ws-update-plan-implementation': 'ws-plan-update',
  'ws-interview': 'ws-plan-interview',
};

/** Live skill/hub bodies must not invoke these (exempt CHANGELOG + LEGACY banners). */
const STALE_LIVE_REFERENCE_PATTERNS = [
  { id: 'session_lease.cjs', re: /session_lease\.cjs/i, removedIn: '0.3.38' },
  { id: 'defaults.sessionLeases', re: /\bsessionLeases\b/, removedIn: '0.3.38' },
  { id: 'session-lease.schema.json', re: /session-lease\.schema\.json/i, removedIn: '0.3.38' },
  { id: 'git-lock (lease)', re: /session_lease\.cjs\s+git-lock|\bgit-lock\b.*session/i, removedIn: '0.3.38' },
  { id: 'ws-audit', re: /\bws-audit\b/, removedIn: '0.3.37' },
  { id: 'defaults.enableAuditing', re: /\benableAuditing\b/, removedIn: '0.3.37' },
  { id: 'ws-patterns skill', re: /\bws-patterns(?:-backend|-frontend)?\b/, removedIn: '0.3.38' },
  { id: 'defaults.patternsBackend', re: /\bpatternsBackend\b/, removedIn: '0.3.38' },
  { id: 'defaults.patternsFrontend', re: /\bpatternsFrontend\b/, removedIn: '0.3.38' },
  { id: 'defaults.patterns', re: /\bdefaults\.patterns\b|"patterns"\s*:/, removedIn: '0.3.38' },
  { id: '_comment_patterns', re: /_comment_patterns(?:Backend|Frontend)?\b/, removedIn: '0.3.38' },
  { id: 'backend.md.template', re: /backend\.md\.template/i, removedIn: '0.3.38' },
  { id: 'frontend.md.template', re: /frontend\.md\.template/i, removedIn: '0.3.38' },
  { id: 'ws-write-spec', re: /\bws-write-spec\b/, removedIn: '0.3.56' },
  { id: 'ws-sync-spec', re: /\bws-sync-spec\b/, removedIn: '0.3.56' },
  { id: 'ws-multi-spec', re: /\bws-multi-spec\b/, removedIn: '0.3.56' },
  { id: 'ws-github-provider', re: /\bws-github-provider\b/, removedIn: '0.3.56' },
  { id: 'ws-azure-devops-provider', re: /\bws-azure-devops-provider\b/, removedIn: '0.3.56' },
  { id: 'ws-local-spec-provider', re: /\bws-local-spec-provider\b/, removedIn: '0.3.56' },
  { id: 'ws-write-plan', re: /\bws-write-plan\b/, removedIn: '0.3.56' },
  { id: 'ws-verify-plan', re: /\bws-verify-plan\b/, removedIn: '0.3.56' },
  { id: 'ws-update-plan-implementation', re: /\bws-update-plan-implementation\b/, removedIn: '0.3.56' },
  { id: 'ws-interview (retired folder)', re: /(?<!plan-)ws-interview\b/, removedIn: '0.3.56' },
  { id: 'ws-*-spec family violation', re: /\bws-(?!spec-)[a-z0-9-]*spec[a-z0-9-]*/, removedIn: '0.3.56' },
];

function stripRetiredConfigKeys(cfg) {
  const removed = [];
  if (!cfg || typeof cfg !== 'object' || !cfg.defaults || typeof cfg.defaults !== 'object') {
    return { cfg, changed: false, removed };
  }
  for (const key of [...RETIRED_DEFAULTS_KEYS, ...RETIRED_DEFAULTS_COMMENT_KEYS]) {
    if (Object.prototype.hasOwnProperty.call(cfg.defaults, key)) {
      removed.push(`defaults.${key}`);
      delete cfg.defaults[key];
    }
  }
  return { cfg, changed: removed.length > 0, removed };
}

function listRetiredConfigKeys(cfg) {
  const found = [];
  if (!cfg || typeof cfg !== 'object' || !cfg.defaults || typeof cfg.defaults !== 'object') {
    return found;
  }
  for (const key of [...RETIRED_DEFAULTS_KEYS, ...RETIRED_DEFAULTS_COMMENT_KEYS]) {
    if (Object.prototype.hasOwnProperty.call(cfg.defaults, key)) {
      found.push(`defaults.${key}`);
    }
  }
  return found;
}

function findRetiredSkillDirsAtRoot(fs, pathModule, skillsDirAbs) {
  if (!skillsDirAbs) return [];
  const root = pathModule.resolve(skillsDirAbs);
  return RETIRED_SKILL_DIRS.filter((id) => fs.existsSync(pathModule.join(root, id)));
}

/**
 * Prune retired hub files, config keys, and skill folders from a consumer install.
 * @param {object} fs - node fs module
 * @param {object} path - node path module
 * @param {object} options
 * @param {string} options.skillsDir - absolute .agents/skills (or global skills root)
 * @param {(msg: string) => void} [options.log] - logger (default console.log)
 * @returns {{ hubFiles: string[], configKeys: string[], skillDirs: string[] }}
 */
function pruneRetiredConsumerArtifacts(fs, path, options) {
  const log = options.log || ((msg) => console.log(msg));
  const skillsDir = path.resolve(options.skillsDir);
  const sharedDir = path.join(skillsDir, 'ws-shared');
  const result = { hubFiles: [], configKeys: [], skillDirs: [] };

  if (fs.existsSync(sharedDir)) {
    for (const name of RETIRED_HUB_FILES) {
      const filePath = path.join(sharedDir, name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        result.hubFiles.push(name);
        log(`    Removed obsolete ws-shared/${name}`);
      }
    }

    const configPath = path.join(sharedDir, 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf8');
        const cfg = JSON.parse(raw);
        const { cfg: next, changed, removed } = stripRetiredConfigKeys(cfg);
        if (changed) {
          fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`);
          result.configKeys.push(...removed);
          log(`    Stripped retired config keys from ws-shared/config.json: ${removed.join(', ')}`);
        }
      } catch {
        // consumer-owned; do not fail install/update
      }
    }
  }

  for (const skillId of RETIRED_SKILL_DIRS) {
    const skillPath = path.join(skillsDir, skillId);
    if (fs.existsSync(skillPath)) {
      fs.rmSync(skillPath, { recursive: true, force: true });
      result.skillDirs.push(skillId);
      log(`    Removed retired skill folder ${skillId}/`);
    }
  }

  const manifestPath = path.join(sharedDir, 'installed-skills.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const retired = new Set([...RETIRED_SKILL_DIRS, ...RETIRED_BARE_IDS]);
      const filterList = (list) =>
        Array.isArray(list) ? list.filter((id) => typeof id === 'string' && !retired.has(id)) : list;
      const nextSkills = filterList(data.skills);
      const nextSelected = filterList(data.selected);
      const skillsChanged =
        Array.isArray(data.skills) &&
        nextSkills.length !== data.skills.length;
      const selectedChanged =
        Array.isArray(data.selected) &&
        nextSelected.length !== data.selected.length;
      if (skillsChanged || selectedChanged) {
        data.skills = nextSkills;
        data.selected = nextSelected;
        fs.writeFileSync(manifestPath, `${JSON.stringify(data, null, 2)}\n`);
        log(`    Removed retired skill id(s) from ws-shared/installed-skills.json`);
      }
    } catch {
      // preserve manifest on parse failure
    }
  }

  return result;
}

/**
 * List retired ids (ws-* retired dirs + bare legacy ids) still present in an
 * installed-skills.json manifest object (`skills` / `selected` lists).
 * @param {object} data - parsed manifest JSON
 * @returns {string[]} deduped retired ids found
 */
function listRetiredManifestIds(data) {
  if (!data || typeof data !== 'object') return [];
  const retired = new Set([...RETIRED_SKILL_DIRS, ...RETIRED_BARE_IDS]);
  const found = [];
  for (const key of ['skills', 'selected']) {
    const list = data[key];
    if (!Array.isArray(list)) continue;
    for (const id of list) {
      if (typeof id === 'string' && retired.has(id) && !found.includes(id)) {
        found.push(id);
      }
    }
  }
  return found;
}

module.exports = {
  RETIRED_HUB_FILES,
  RETIRED_SKILL_DIRS,
  RETIRED_BARE_IDS,
  RETIRED_TO_CANONICAL,
  RETIRED_DEFAULTS_KEYS,
  RETIRED_DEFAULTS_COMMENT_KEYS,
  STALE_LIVE_REFERENCE_PATTERNS,
  stripRetiredConfigKeys,
  listRetiredConfigKeys,
  listRetiredManifestIds,
  findRetiredSkillDirsAtRoot,
  pruneRetiredConsumerArtifacts,
};
