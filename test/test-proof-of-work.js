/**
 * proof-of-work post-completion step config + docs surface checks (us-386).
 * Run: node test/test-proof-of-work.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SHARED = path.join(REPO, '.agents/skills/ws-shared');

let failures = 0;

function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), 'utf8');
}

const schema = JSON.parse(
  fs.readFileSync(path.join(SHARED, 'runtime', 'config.schema.json'), 'utf8'),
);
const example = JSON.parse(
  fs.readFileSync(path.join(SHARED, 'templates', 'config.json.example'), 'utf8'),
);

const defaultsProps = schema.properties?.defaults?.properties || {};

// AC1: boolean switches + path setting under defaults.*
assert(
  defaultsProps.enableOptionalProofOfWork?.type === 'boolean',
  'schema defaults.enableOptionalProofOfWork is a boolean type',
);
assert(
  defaultsProps.enableOptionalProofOfWork?.default === false,
  'schema defaults.enableOptionalProofOfWork defaults to false',
);
assert(
  defaultsProps.enableAutomaticEvidenceCollectForProofOfWork?.type === 'boolean',
  'schema defaults.enableAutomaticEvidenceCollectForProofOfWork is a boolean type',
);
assert(
  defaultsProps.enableAutomaticEvidenceCollectForProofOfWork?.default === false,
  'schema defaults.enableAutomaticEvidenceCollectForProofOfWork defaults to false',
);
assert(
  defaultsProps.projectRootFolderToSave?.type === 'string',
  'schema defaults.projectRootFolderToSave is a string type',
);
assert(
  defaultsProps.projectRootFolderToSave?.default === '{projectRoot}/.proofOfWork/{slug}',
  'schema defaults.projectRootFolderToSave defaults to {projectRoot}/.proofOfWork/{slug}',
);

// AC1/AC4: example seeds
assert(
  Object.prototype.hasOwnProperty.call(example.defaults || {}, 'enableOptionalProofOfWork'),
  'config.json.example has defaults.enableOptionalProofOfWork',
);
assert(
  example.defaults.enableOptionalProofOfWork === false,
  'config.json.example enableOptionalProofOfWork seeds false',
);
assert(
  Object.prototype.hasOwnProperty.call(
    example.defaults || {},
    'enableAutomaticEvidenceCollectForProofOfWork',
  ),
  'config.json.example has defaults.enableAutomaticEvidenceCollectForProofOfWork',
);
assert(
  example.defaults.enableAutomaticEvidenceCollectForProofOfWork === false,
  'config.json.example enableAutomaticEvidenceCollectForProofOfWork seeds false',
);
assert(
  example.defaults.projectRootFolderToSave === '{projectRoot}/.proofOfWork/{slug}',
  'config.json.example projectRootFolderToSave seeds the token default',
);

// AC1: auto-configure fallback coverage
const autoConfigure = read('.agents/skills/ws-configure-project/scripts/auto_configure.cjs');
for (const key of [
  'enableOptionalProofOfWork',
  'enableAutomaticEvidenceCollectForProofOfWork',
  'projectRootFolderToSave',
]) {
  assert(
    autoConfigure.includes(`'defaults.${key}'`) || autoConfigure.includes(`"${key}"`)
      || autoConfigure.includes(`'${key}'`),
    `auto_configure.cjs covers defaults.${key}`,
  );
}

// AC9: GUI rows bind matching scalar types (bool/bool/string)
const gui = read('.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1');
assert(
  /-Section\s+['"]defaults['"]\s+-Key\s+['"]enableOptionalProofOfWork['"][\s\S]*?-Type\s+['"]bool['"]/.test(gui),
  'GUI binds defaults.enableOptionalProofOfWork as bool',
);
assert(
  /-Section\s+['"]defaults['"]\s+-Key\s+['"]enableAutomaticEvidenceCollectForProofOfWork['"][\s\S]*?-Type\s+['"]bool['"]/.test(gui),
  'GUI binds defaults.enableAutomaticEvidenceCollectForProofOfWork as bool',
);
assert(
  /-Section\s+['"]defaults['"]\s+-Key\s+['"]projectRootFolderToSave['"][\s\S]*?-Type\s+['"]string['"]/.test(gui),
  'GUI binds defaults.projectRootFolderToSave as string',
);

// AC5/AC6: resolution contract — omitted means disabled, autoMode never blocks
const configResolution = read('.agents/skills/ws-shared/runtime/config-resolution.md');
assert(
  configResolution.includes('defaults.enableOptionalProofOfWork'),
  'config-resolution.md documents the proof-of-work switches',
);
assert(
  /omitted \/ missing \/ `false` → disabled/.test(configResolution),
  'config-resolution.md omitted switch resolves to the disabled path',
);
assert(
  /never blocks/.test(configResolution),
  'config-resolution.md autoMode never blocks on the post-completion step',
);

// AC2/AC3/AC6/AC7/AC8: gate contract
const gates = read('.agents/skills/ws-shared/runtime/gates.md');
assert(
  gates.includes('Optional post-completion proof-of-work step'),
  'gates.md has the post-completion proof-of-work section',
);
assert(
  gates.includes('Start evidence collection'),
  'gates.md offers the Start evidence collection gate option',
);
assert(
  gates.includes('skipped:no-browser-capability'),
  'gates.md reports absent browser capability as a skip reason',
);
assert(
  gates.includes('never committed'),
  'gates.md states the evidence folder is never committed',
);
assert(
  gates.includes('Post-completion proof-of-work'),
  'gates.md auto-gate table covers the post-completion step',
);

// AC2: orch placement — standard exit, dispatch, lite close
const specToPrSkill = read('.agents/skills/ws-spec-to-pr/SKILL.md');
assert(
  specToPrSkill.includes('post-completion proof-of-work step'),
  'ws-spec-to-pr SKILL.md exit references the post-completion step',
);
const stepDispatch = read('.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md');
assert(
  stepDispatch.includes('Post-completion proof-of-work'),
  'STEP-DISPATCH.md documents the orch-owned post-completion hook',
);
assert(
  /Never inside `ws-ship-pr`/.test(stepDispatch),
  'STEP-DISPATCH.md keeps the hook out of ws-ship-pr',
);
const liteSkill = read('.agents/skills/ws-spec-to-pr-lite/SKILL.md');
assert(
  liteSkill.includes('post-completion proof-of-work step'),
  'ws-spec-to-pr-lite SKILL.md close references the post-completion step',
);

// AC9: interview + README surface
const interview = read('.agents/skills/ws-configure-project/INTERVIEW.md');
assert(
  interview.includes('defaults.enableOptionalProofOfWork'),
  'INTERVIEW.md documents the proof-of-work switches',
);
const readme = read('README.md');
assert(
  readme.includes('enableOptionalProofOfWork'),
  'README.md mentions the opt-in proof-of-work switch',
);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll proof-of-work checks passed.');
