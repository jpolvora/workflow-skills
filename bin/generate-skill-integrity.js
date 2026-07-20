#!/usr/bin/env node
/**
 * Generate or check bin/skill-integrity.json from the package tree.
 * Usage:
 *   node bin/generate-skill-integrity.js          # write manifest
 *   node bin/generate-skill-integrity.js --check  # exit ≠0 on drift / version mismatch
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  MANIFEST_REL,
  buildUpstreamManifest,
  loadJson,
  stableStringify,
  writeJsonStable,
} from './skill-integrity-lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(packageRoot, MANIFEST_REL);
const pkgPath = path.join(packageRoot, 'package.json');

function getPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version || '0.0.0';
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const version = getPackageVersion();
  const generated = buildUpstreamManifest(packageRoot, version);
  const generatedText = stableStringify(generated);

  if (checkOnly) {
    if (!fs.existsSync(manifestPath)) {
      console.error(`Error: missing ${MANIFEST_REL}`);
      process.exit(1);
    }
    const existingText = fs.readFileSync(manifestPath, 'utf8');
    let existing;
    try {
      existing = loadJson(manifestPath);
    } catch (e) {
      console.error(`Error: cannot parse ${MANIFEST_REL}: ${e.message}`);
      process.exit(1);
    }
    if (existing.packageVersion !== version) {
      console.error(
        `Error: packageVersion drift: manifest=${existing.packageVersion} package.json=${version}`
      );
      process.exit(1);
    }
    if (existingText !== generatedText) {
      console.error(`Error: ${MANIFEST_REL} is stale vs current tree (run: npm run generate-integrity)`);
      process.exit(1);
    }
    console.log(`OK: ${MANIFEST_REL} matches tree (v${version})`);
    process.exit(0);
  }

  writeJsonStable(manifestPath, generated);
  console.log(
    `Wrote ${MANIFEST_REL} (v${version}, ${Object.keys(generated.skills).length} skills, fullPackageDigest=${generated.fullPackageDigest.slice(0, 12)}…)`
  );
}

main();
