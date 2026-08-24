/**
 * verboseMode config + schema + docs surface checks.
 * Run: node test/test-verbose-mode.js
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

const example = JSON.parse(
  fs.readFileSync(path.join(SHARED, 'config.json.example'), 'utf8'),
);
const configPath = path.join(SHARED, 'config.json');
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : null;
const schema = JSON.parse(
  fs.readFileSync(path.join(SHARED, 'config.schema.json'), 'utf8'),
);

const defaultsProps = schema.properties?.defaults?.properties || {};

assert(
  defaultsProps.verboseMode?.type === 'boolean',
  'schema defaults.verboseMode is a boolean type',
);
assert(
  defaultsProps.verboseMode?.default === true,
  'schema defaults.verboseMode defaults to true',
);
if (config) {
  assert(
    Object.prototype.hasOwnProperty.call(config.defaults || {}, 'verboseMode'),
    'config.json has defaults.verboseMode',
  );
  assert(
    config.defaults.verboseMode === true,
    'config.json verboseMode defaults to true',
  );
} else {
  console.log('SKIP config.json assertions (file absent in fresh clone/CI)');
}
assert(
  Object.prototype.hasOwnProperty.call(example.defaults || {}, 'verboseMode'),
  'config.json.example has defaults.verboseMode',
);
assert(
  example.defaults.verboseMode === true,
  'config.json.example verboseMode defaults to true',
);

function resolveVerboseMode(configObj) {
  return configObj?.defaults?.verboseMode === true;
}

assert(
  resolveVerboseMode({ defaults: { verboseMode: true } }) === true,
  'resolveVerboseMode returns true when set to true',
);
assert(
  resolveVerboseMode({ defaults: { verboseMode: false } }) === false,
  'resolveVerboseMode returns false when set to false',
);
assert(
  resolveVerboseMode({}) === false,
  'resolveVerboseMode falls back to false when omitted/missing',
);

assert(
  !fs.existsSync(path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/verbose_step_preview.cjs')),
  'canned verbose_step_preview.cjs helper must not exist',
);

const stepDispatch = read('.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md');
assert(
  stepDispatch.includes('defaults.verboseMode'),
  'STEP-DISPATCH.md documents defaults.verboseMode',
);
assert(
  /analyze this run/.test(stepDispatch),
  'STEP-DISPATCH.md requires the executing model to analyze this run',
);
assert(
  /Omitted or `false`/.test(stepDispatch) || /Omitted\/`false`/.test(stepDispatch) || /Omitted or false/.test(stepDispatch),
  'STEP-DISPATCH.md omitted key is silent',
);
assert(
  !stepDispatch.includes('verbose_step_preview.cjs'),
  'STEP-DISPATCH.md does not invoke a canned preview script',
);

const liteSkill = read('.agents/skills/ws-spec-to-pr-lite/SKILL.md');
assert(
  liteSkill.includes('defaults.verboseMode'),
  'ws-spec-to-pr-lite SKILL.md documents defaults.verboseMode',
);
assert(
  /analyze this run/.test(liteSkill),
  'ws-spec-to-pr-lite SKILL.md requires the session model to analyze this run',
);
assert(
  !liteSkill.includes('verbose_step_preview.cjs'),
  'ws-spec-to-pr-lite SKILL.md does not invoke a canned preview script',
);

const specToPrSkill = read('.agents/skills/ws-spec-to-pr/SKILL.md');
assert(
  specToPrSkill.includes('verboseMode'),
  'ws-spec-to-pr SKILL.md documents verboseMode',
);

const protocols = read('.agents/skills/ws-spec-to-pr/PROTOCOLS.md');
assert(
  protocols.includes('VerboseMode addendum'),
  'PROTOCOLS.md has VerboseMode addendum for dispatch-agent',
);
assert(
  /explicit `true`/.test(protocols),
  'PROTOCOLS.md requires explicit true to append the addendum',
);

const configResolution = read('.agents/skills/ws-shared/config-resolution.md');
assert(
  configResolution.includes('defaults.verboseMode'),
  'config-resolution.md has Verbose step preview section',
);
assert(
  /omitted \/ missing \/ `false` → silent/.test(configResolution),
  'config-resolution.md omitted key is silent at runtime',
);

const interview = read('.agents/skills/ws-configure-project/INTERVIEW.md');
assert(
  interview.includes('defaults.verboseMode'),
  'INTERVIEW.md writes defaults.verboseMode',
);
assert(
  /Yes \(`true`, Recommended\)/.test(interview),
  'INTERVIEW.md recommends verboseMode true when writing',
);

const gates = read('.agents/skills/ws-shared/gates.md');
assert(
  gates.includes('defaults.verboseMode'),
  'gates.md dual-mode table documents verboseMode',
);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll verbose-mode checks passed.');
