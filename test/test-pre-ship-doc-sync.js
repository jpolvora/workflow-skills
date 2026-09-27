/**
 * Pre-ship doc-sync trio gate (defaults.requirePreShipDocSync) surface checks.
 * Run: node test/test-pre-ship-doc-sync.js
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SHARED = path.join(REPO, '.agents/skills/ws-shared');
const { resolveRequirePreShipDocSync } = require(
  path.join(SHARED, 'runtime/scripts/resolve_consumer_root.cjs'),
);

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}
function read(rel) {
  return fs.readFileSync(path.join(REPO, rel), 'utf8');
}

// AC8: runtime resolution - absent, non-boolean, or invalid resolves to true.
assert(resolveRequirePreShipDocSync({}) === true, 'omitted -> true');
assert(resolveRequirePreShipDocSync({ defaults: {} }) === true, 'empty defaults -> true');
assert(
  resolveRequirePreShipDocSync({ defaults: { requirePreShipDocSync: true } }) === true,
  'explicit true -> true',
);
assert(
  resolveRequirePreShipDocSync({ defaults: { requirePreShipDocSync: false } }) === false,
  'explicit false -> false',
);
assert(
  resolveRequirePreShipDocSync({ defaults: { requirePreShipDocSync: 'false' } }) === true,
  'string "false" -> true',
);
assert(
  resolveRequirePreShipDocSync({ defaults: { requirePreShipDocSync: 0 } }) === true,
  'numeric 0 -> true',
);
assert(
  resolveRequirePreShipDocSync({ defaults: { requirePreShipDocSync: null } }) === true,
  'null -> true',
);

// AC1: schema declares the boolean default-true gate naming the trio.
const schema = JSON.parse(read('.agents/skills/ws-shared/runtime/config.schema.json'));
const prop = schema.properties?.defaults?.properties?.requirePreShipDocSync || {};
assert(prop.type === 'boolean', 'schema requirePreShipDocSync is boolean');
assert(prop.default === true, 'schema requirePreShipDocSync defaults true');
assert(
  /ws-wiki sync/.test(prop.description || '') &&
    /ws-spec-index sync/.test(prop.description || '') &&
    /changelog/.test(prop.description || ''),
  'schema description names the trio',
);

// AC2: example seeds true plus an explanatory comment.
const example = JSON.parse(read('.agents/skills/ws-shared/templates/config.json.example'));
assert(
  Object.prototype.hasOwnProperty.call(example.defaults || {}, 'requirePreShipDocSync'),
  'config.json.example has defaults.requirePreShipDocSync',
);
assert(example.defaults.requirePreShipDocSync === true, 'config.json.example seeds true');
assert(
  typeof example.defaults._comment_requirePreShipDocSync === 'string',
  'config.json.example has _comment_requirePreShipDocSync',
);

// AC3: GUI editor exposes one defaults boolean binding (default true).
const psEditor = read('.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1');
assert(
  /-Section 'defaults' -Key 'requirePreShipDocSync'[^\n]*-Type 'bool' -DefaultVal \$true/.test(
    psEditor,
  ),
  'GUI editor binds defaults.requirePreShipDocSync as bool default true',
);
assert(
  /^[^\n]*[\x00-\x7F][^\n]*$/m.test(psEditor) && !/[\u2014\u2019\u201c\u201d]/.test(psEditor),
  'GUI editor stays ASCII-only',
);
assert(
  fs.existsSync(path.join(REPO, 'test/test-powershell-config-editor.js')),
  'GUI editor regression suite present',
);

// AC4/AC6/AC7/AC10: standard orch close gate wording.
const dispatch = read('.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md');
assert(dispatch.includes('defaults.requirePreShipDocSync'), 'STEP-DISPATCH names the gate flag');
assert(
  /Pre-ship doc-sync gate[\s\S]{0,600}ship phase/i.test(dispatch),
  'STEP-DISPATCH blocks the ship phase while a leg is outstanding',
);
assert(
  /Do \*\*not\*\* advance `shipStatus`/.test(dispatch),
  'STEP-DISPATCH holds shipStatus while a leg is outstanding',
);
assert(
  /warn-and-skip/i.test(dispatch) && dispatch.includes('wiki-sync skipped: no wiki configured'),
  'STEP-DISPATCH warn-skips the wiki leg with a visible warning',
);
assert(
  /idempotent/.test(dispatch) && /duplicate the changelog entry/.test(dispatch),
  'STEP-DISPATCH documents idempotent close re-entry',
);
assert(
  /flag is false, keep today's behavior/.test(dispatch),
  'STEP-DISPATCH preserves today behavior when flag false',
);

// AC5: lite close gate wording.
const lite = read('.agents/skills/ws-spec-to-pr-lite/SKILL.md');
assert(lite.includes('defaults.requirePreShipDocSync'), 'lite SKILL names the gate flag');
assert(
  /doc-sync trio[\s\S]{0,200}ship gate/.test(lite),
  'lite SKILL gates the trio before the ship gate',
);

// Shared gate copy + hub docs reconciled (AC11).
const gates = read('.agents/skills/ws-shared/runtime/gates.md');
assert(gates.includes('defaults.requirePreShipDocSync'), 'gates.md names the gate flag');
assert(
  /Pre-ship doc-sync trio gate[\s\S]{0,400}ws-changelog[\s\S]{0,200}ws-wiki sync/.test(gates),
  'gates.md documents the trio gate ordering',
);
const wiki = read('.agents/skills/ws-wiki/SKILL.md');
assert(wiki.includes('defaults.requirePreShipDocSync'), 'ws-wiki SKILL names the gate flag');
assert(
  /warn-and-skips|warn-skip/i.test(wiki),
  'ws-wiki SKILL documents the no-wiki warn-skip',
);
const rootAgents = read('AGENTS.md');
assert(rootAgents.includes('defaults.requirePreShipDocSync'), 'root AGENTS.md names the gate flag');
const resolution = read('.agents/skills/ws-shared/runtime/config-resolution.md');
assert(
  /## Pre-ship doc-sync gate resolution \(`defaults\.requirePreShipDocSync`\)/.test(resolution),
  'config-resolution.md documents the gate resolution',
);
const wikiSource = read('.agents/specs/wiki/delivery/spec-to-pr-pipeline.md');
assert(wikiSource.includes('requirePreShipDocSync'), 'wiki source documents the gate flag');
const wikiPage = read('docs/wiki/delivery/spec-to-pr-pipeline.html');
assert(wikiPage.includes('requirePreShipDocSync'), 'built wiki page documents the gate flag');

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll pre-ship-doc-sync checks passed.');
