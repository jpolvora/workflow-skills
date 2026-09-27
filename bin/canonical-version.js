/**
 * Canonical package semver for workflow-skills (.agents/skills/ws-shared/version.json).
 * package.json.version and packageVersion fields are generated projections.
 */

import fs from 'fs';
import path from 'path';

export const CANONICAL_VERSION_REL = path.join('.agents', 'skills', 'ws-shared', 'version.json');

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

export function canonicalVersionPath(packageRoot) {
  return path.join(packageRoot, CANONICAL_VERSION_REL);
}

export function readCanonicalVersion(packageRoot) {
  const filePath = canonicalVersionPath(packageRoot);
  const rel = path.relative(packageRoot, filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing canonical version file: ${rel} (add version.json or run update)`);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Malformed ${rel}: ${err.message}`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Malformed ${rel}: expected a JSON object`);
  }
  const versionKeys = Object.keys(data).filter((key) => /version/i.test(key));
  if (versionKeys.length !== 1 || versionKeys[0] !== 'version') {
    throw new Error(`Malformed ${rel}: require exactly one "version" property`);
  }
  const version = data.version;
  if (typeof version !== 'string' || !SEMVER_RE.test(version)) {
    throw new Error(`Malformed ${rel}: version must be major.minor.patch semver`);
  }
  return version;
}

export function writeCanonicalVersion(packageRoot, version) {
  if (typeof version !== 'string' || !SEMVER_RE.test(version)) {
    throw new Error(`Invalid semver for canonical version: ${String(version)}`);
  }
  const filePath = canonicalVersionPath(packageRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({ version }, null, 2)}\n`);
}

export function readPackageJsonVersion(packageRoot) {
  const pkgPath = path.join(packageRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version || '0.0.0';
}

const PROJECTION_PATHS = (packageRoot) => [
  path.join(packageRoot, 'package.json'),
  path.join(packageRoot, 'bin', 'skill-dependencies.json'),
  path.join(packageRoot, '.agents', 'skills', 'ws-shared', 'runtime', 'skill-dependencies.json'),
];

export function syncVersionProjections(packageRoot, version) {
  writeCanonicalVersion(packageRoot, version);
  const pkgPath = path.join(packageRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  for (const relPath of PROJECTION_PATHS(packageRoot).slice(1)) {
    if (!fs.existsSync(relPath)) continue;
    const deps = JSON.parse(fs.readFileSync(relPath, 'utf8'));
    deps.packageVersion = version;
    fs.writeFileSync(relPath, `${JSON.stringify(deps, null, 2)}\n`);
  }
}

export function assertVersionProjectionsMatch(packageRoot, canonicalVersion) {
  const pkgVersion = readPackageJsonVersion(packageRoot);
  if (pkgVersion !== canonicalVersion) {
    throw new Error(
      `package.json.version drift: canonical=${canonicalVersion} package.json=${pkgVersion}`,
    );
  }
  for (const relPath of PROJECTION_PATHS(packageRoot).slice(1)) {
    if (!fs.existsSync(relPath)) continue;
    const deps = JSON.parse(fs.readFileSync(relPath, 'utf8'));
    if (deps.packageVersion !== canonicalVersion) {
      const rel = path.relative(packageRoot, relPath);
      throw new Error(
        `packageVersion drift in ${rel}: canonical=${canonicalVersion} file=${deps.packageVersion}`,
      );
    }
  }
}

export function bumpCanonicalPatch(packageRoot) {
  const current = readCanonicalVersion(packageRoot);
  const parts = current.split('.').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid canonical version "${current}" (expected x.y.z)`);
  }
  parts[2] += 1;
  const next = parts.join('.');
  syncVersionProjections(packageRoot, next);
  return { from: current, to: next };
}
