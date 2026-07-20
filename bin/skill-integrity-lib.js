/**
 * SHA-256 integrity digests for managed skills + hub templates.
 * Enumeration mirrors installer copy rules (install-rules.js).
 * Per-file digests are LF-canonical / EOL-stable: hash after normalizing
 * CRLF and lone CR to LF (no on-disk rewrite). Aggregate helpers still
 * hash raw UTF-8 of the digest-line maps via sha256Hex.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  HUB_WHITELIST,
  HUB_DEST_ALIASES,
  SKIP_INSTALL_FILES,
  CONSUMER_OWNED_DIRS,
  CONSUMER_OWNED_HUB_FILES,
  SKILL_INTEGRITY_LOCAL_FILE,
  shouldSkipInstallEntry,
  isConsumerOwnedEntry,
} from './install-rules.js';

export const ALGORITHM = 'sha256';
export const HUB_DIR = 'shared';
export const MANIFEST_REL = path.join('bin', 'skill-integrity.json');

const CANONICAL_ORDER = {
  skills: 'sorted skill ids ascending',
  paths: 'sorted relative paths ascending (posix `/`)',
  hubPlacement: 'after-skills',
};

export function sha256Hex(buf) {
  return crypto.createHash(ALGORITHM).update(buf).digest('hex');
}

/**
 * Normalize EOL for hashing: \r\n → \n, then remaining \r → \n.
 * Operates on a Buffer copy; does not rewrite disk.
 */
export function canonicalizeForHash(buf) {
  const raw = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  const out = Buffer.allocUnsafe(raw.length);
  let j = 0;
  for (let i = 0; i < raw.length; i++) {
    const b = raw[i];
    if (b === 0x0d) {
      if (i + 1 < raw.length && raw[i + 1] === 0x0a) {
        i += 1;
      }
      out[j++] = 0x0a;
    } else {
      out[j++] = b;
    }
  }
  return out.subarray(0, j);
}

/** SHA-256 of LF-canonical file bytes. */
export function hashFileBytes(buf) {
  return sha256Hex(canonicalizeForHash(buf));
}

export function toPosix(p) {
  return String(p).split(path.sep).join('/');
}

/** Stable JSON: recursively sort object keys; arrays keep order. */
export function stableStringify(value, space = 2) {
  return `${JSON.stringify(sortKeysDeep(value), null, space)}\n`;
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object' && !(value instanceof Buffer)) {
    const out = {};
    for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
      out[key] = sortKeysDeep(value[key]);
    }
    return out;
  }
  return value;
}

export function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJsonStable(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, stableStringify(obj));
}

/**
 * skillDigest: sha256 over UTF-8 lines `relPath + NUL + fileDigest + LF` sorted by relPath.
 */
export function digestFromFilesMap(filesMap) {
  const lines = Object.keys(filesMap)
    .sort((a, b) => a.localeCompare(b))
    .map((rel) => `${rel}\0${filesMap[rel]}\n`)
    .join('');
  return sha256Hex(Buffer.from(lines, 'utf8'));
}

/**
 * fullPackageDigest / installedClosureDigest: sorted skill ids, each skill's file lines,
 * then hub file lines when hub is non-null (hubPlacement: after-skills).
 */
export function aggregateDigest(skillIds, skillsMap, hub) {
  const parts = [];
  const ids = [...skillIds].sort((a, b) => a.localeCompare(b));
  for (const id of ids) {
    const entry = skillsMap[id];
    if (!entry?.files) continue;
    const files = entry.files;
    for (const rel of Object.keys(files).sort((a, b) => a.localeCompare(b))) {
      parts.push(`${id}/${rel}\0${files[rel]}\n`);
    }
  }
  if (hub?.files) {
    for (const rel of Object.keys(hub.files).sort((a, b) => a.localeCompare(b))) {
      parts.push(`hub/${rel}\0${hub.files[rel]}\n`);
    }
  }
  return sha256Hex(Buffer.from(parts.join(''), 'utf8'));
}

/** Top-level dirs with SKILL.md, excluding shared/. */
export function listInstallableSkills(skillsDir) {
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir)
    .filter((name) => {
      const p = path.join(skillsDir, name);
      return (
        name !== HUB_DIR &&
        fs.statSync(p).isDirectory() &&
        fs.existsSync(path.join(p, 'SKILL.md'))
      );
    })
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Enumerate managed files under a skill root (copyDirSync-equivalent skips).
 * Paths relative to skill root, posix separators.
 */
export function enumerateSkillFiles(skillRoot) {
  const files = {};
  if (!fs.existsSync(skillRoot)) return files;

  function walk(dir, relBase) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = toPosix(relBase ? path.join(relBase, entry.name) : entry.name);

      if (SKIP_INSTALL_FILES.has(entry.name) || shouldSkipInstallEntry(entry.name)) {
        continue;
      }
      if (isConsumerOwnedEntry(entry.name, entry.isDirectory())) {
        continue;
      }

      if (entry.isDirectory()) {
        // Skip recursing into consumer-owned dirs (memory/)
        if (CONSUMER_OWNED_DIRS.has(entry.name)) continue;
        walk(abs, rel);
      } else {
        const buf = fs.readFileSync(abs);
        files[rel] = hashFileBytes(buf);
      }
    }
  }

  walk(skillRoot, '');
  return files;
}

/**
 * Hub: whitelist only. Asymmetry vs skill walks: skill trees skip .gitignore;
 * hub ships hub.gitignore (npm cannot pack .gitignore) and installs as .gitignore.
 * Never hash consumer-owned names or skill-integrity-local.json.
 */
export function enumerateHubFiles(sharedRoot) {
  const files = {};
  if (!fs.existsSync(sharedRoot)) return files;

  for (const name of HUB_WHITELIST) {
    if (CONSUMER_OWNED_HUB_FILES.has(name)) continue;
    if (name === SKILL_INTEGRITY_LOCAL_FILE) continue;

    let abs = path.join(sharedRoot, name);
    if (!fs.existsSync(abs) && HUB_DEST_ALIASES[name]) {
      // Consumer trees have the dest alias (.gitignore) instead of hub.gitignore
      abs = path.join(sharedRoot, HUB_DEST_ALIASES[name]);
    }
    if (!fs.existsSync(abs)) continue;

    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      const nested = enumerateSkillFiles(abs);
      for (const [rel, dig] of Object.entries(nested)) {
        files[toPosix(path.join(name, rel))] = dig;
      }
    } else {
      files[toPosix(name)] = hashFileBytes(fs.readFileSync(abs));
    }
  }
  return files;
}

export function buildSkillEntry(skillRoot) {
  const files = enumerateSkillFiles(skillRoot);
  return {
    files,
    skillDigest: digestFromFilesMap(files),
  };
}

export function buildHubEntry(sharedRoot) {
  const files = enumerateHubFiles(sharedRoot);
  return {
    files,
    skillDigest: digestFromFilesMap(files),
  };
}

/**
 * Build upstream publish manifest for packageRoot.
 */
export function buildUpstreamManifest(packageRoot, packageVersion) {
  const skillsDir = path.join(packageRoot, '.agents', 'skills');
  const skillIds = listInstallableSkills(skillsDir);
  const skills = {};
  for (const id of skillIds) {
    skills[id] = buildSkillEntry(path.join(skillsDir, id));
  }
  const hub = buildHubEntry(path.join(skillsDir, HUB_DIR));
  const fullPackageDigest = aggregateDigest(skillIds, skills, hub);
  return {
    packageVersion: String(packageVersion),
    algorithm: ALGORITHM,
    skills,
    hub,
    fullPackageDigest,
    canonicalOrder: { ...CANONICAL_ORDER },
  };
}

/**
 * Compare expected files map vs actual on disk under rootDir.
 * Returns { ok, mismatches: [{ path, reason, expected?, actual? }] }
 */
export function compareFilesMap(expectedFiles, actualFiles, pathPrefix = '') {
  const mismatches = [];
  const expKeys = new Set(Object.keys(expectedFiles || {}));
  const actKeys = new Set(Object.keys(actualFiles || {}));

  for (const rel of [...expKeys].sort()) {
    const labeled = pathPrefix ? `${pathPrefix}/${rel}` : rel;
    if (!actKeys.has(rel)) {
      mismatches.push({ path: labeled, reason: 'missing' });
    } else if (actualFiles[rel] !== expectedFiles[rel]) {
      mismatches.push({
        path: labeled,
        reason: 'digest-mismatch',
        expected: expectedFiles[rel],
        actual: actualFiles[rel],
      });
    }
  }
  for (const rel of [...actKeys].sort()) {
    if (!expKeys.has(rel)) {
      const labeled = pathPrefix ? `${pathPrefix}/${rel}` : rel;
      mismatches.push({ path: labeled, reason: 'extra' });
    }
  }
  return { ok: mismatches.length === 0, mismatches };
}

/**
 * Verify a skill tree on disk against a manifest skill entry.
 */
export function verifySkillOnDisk(skillRoot, expectedEntry, skillId) {
  const actual = buildSkillEntry(skillRoot);
  const fileCmp = compareFilesMap(expectedEntry?.files || {}, actual.files, skillId);
  const digestOk = actual.skillDigest === expectedEntry?.skillDigest;
  if (!digestOk && fileCmp.ok) {
    fileCmp.mismatches.push({
      path: skillId,
      reason: 'skillDigest-mismatch',
      expected: expectedEntry?.skillDigest,
      actual: actual.skillDigest,
    });
    fileCmp.ok = false;
  }
  return { ok: fileCmp.ok && digestOk, actual, mismatches: fileCmp.mismatches };
}

export function verifyHubOnDisk(sharedRoot, expectedHub) {
  if (expectedHub == null) {
    return { ok: true, actual: null, mismatches: [] };
  }
  const actual = buildHubEntry(sharedRoot);
  const fileCmp = compareFilesMap(expectedHub.files || {}, actual.files, 'hub');
  const digestOk = actual.skillDigest === expectedHub.skillDigest;
  if (!digestOk && fileCmp.ok) {
    fileCmp.mismatches.push({
      path: 'hub',
      reason: 'skillDigest-mismatch',
      expected: expectedHub.skillDigest,
      actual: actual.skillDigest,
    });
    fileCmp.ok = false;
  }
  return { ok: fileCmp.ok && digestOk, actual, mismatches: fileCmp.mismatches };
}

/**
 * Verify source or consumer closure against upstream manifest.
 * @param {object} opts
 * @param {string} opts.skillsDir - .agents/skills root to verify
 * @param {object} opts.manifest - upstream skill-integrity.json
 * @param {string[]} opts.skillIds - closure to verify
 * @param {boolean} opts.includeHub
 */
export function verifyClosure({ skillsDir, manifest, skillIds, includeHub }) {
  const mismatches = [];
  const actualSkills = {};

  for (const id of skillIds) {
    const expected = manifest.skills?.[id];
    if (!expected) {
      mismatches.push({ path: id, reason: 'missing-from-manifest' });
      continue;
    }
    const skillRoot = path.join(skillsDir, id);
    if (!fs.existsSync(skillRoot)) {
      mismatches.push({ path: id, reason: 'missing' });
      continue;
    }
    const result = verifySkillOnDisk(skillRoot, expected, id);
    actualSkills[id] = result.actual;
    mismatches.push(...result.mismatches);
  }

  let actualHub = null;
  if (includeHub) {
    const sharedRoot = path.join(skillsDir, HUB_DIR);
    const result = verifyHubOnDisk(sharedRoot, manifest.hub);
    actualHub = result.actual;
    mismatches.push(...result.mismatches);
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
    actualSkills,
    actualHub,
  };
}

/**
 * Build consumer local integrity record from actual digests for installed closure.
 */
export function buildLocalRecord({
  packageVersion,
  fullPackageDigest = null,
  skillIds,
  actualSkills,
  actualHub,
}) {
  const skills = {};
  for (const id of [...skillIds].sort((a, b) => a.localeCompare(b))) {
    if (actualSkills[id]) skills[id] = actualSkills[id];
  }
  const hub = actualHub;
  const installedClosureDigest = aggregateDigest(
    Object.keys(skills),
    skills,
    hub
  );
  return {
    packageVersion: String(packageVersion),
    algorithm: ALGORITHM,
    fullPackageDigest: fullPackageDigest ?? null,
    installedClosureDigest,
    skills,
    hub: hub ?? null,
    verifiedAt: new Date().toISOString(),
  };
}

export function localIntegrityPath(skillsDir) {
  return path.join(skillsDir, HUB_DIR, SKILL_INTEGRITY_LOCAL_FILE);
}

/**
 * Evaluate --check version + fullPackageDigest.
 * Digest mismatch with equal version → fail with labeled message.
 * Missing remote digest → warn only (do not fail solely on that).
 */
export function evaluateVersionAndDigestCheck({
  localVersion,
  remoteVersion,
  localDigest,
  remoteDigest,
  remoteDigestAvailable,
}) {
  const lines = [];
  let exitCode = 0;

  const la = String(localVersion).split('.').map(Number);
  const ra = String(remoteVersion).split('.').map(Number);
  const cmp = la[0] - ra[0] || la[1] - ra[1] || la[2] - ra[2];

  lines.push(`Installed: v${localVersion}`);
  if (cmp < 0) {
    lines.push(`Latest:    v${remoteVersion}  (newer available)`);
    lines.push('Run: npx --yes github:jpolvora/workflow-skills update');
  } else if (cmp > 0) {
    lines.push(`Latest:    v${remoteVersion}  (you are ahead)`);
  } else {
    lines.push(`Latest:    v${remoteVersion}  (up to date)`);
  }

  if (!remoteDigestAvailable) {
    lines.push('fullPackageDigest: remote integrity unreachable (skipped)');
  } else if (!localDigest) {
    lines.push('fullPackageDigest: local manifest missing (skipped)');
  } else if (localDigest === remoteDigest) {
    lines.push(`fullPackageDigest: match (${localDigest.slice(0, 12)}…)`);
  } else {
    lines.push('fullPackageDigest: mismatch');
    lines.push(`  local:  ${localDigest}`);
    lines.push(`  remote: ${remoteDigest}`);
    if (cmp === 0) exitCode = 1;
  }

  return { lines, exitCode, versionCmp: cmp };
}
