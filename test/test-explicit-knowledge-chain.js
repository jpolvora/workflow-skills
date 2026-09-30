import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot } = utils;
const method = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-fable-method/SKILL.md'), 'utf8');
const judge = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-fable-judge/SKILL.md'), 'utf8');
const report = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-fable-judge/references/REPORT.md'), 'utf8');
const agents = fs.readFileSync(path.join(repoRoot, 'AGENTS.md'), 'utf8');

// AC1: ordered knowledge chain, earlier links preferred.
assert.match(method, /knowledge chain/i);
assert.match(method, /codebase[\s\S]*project docs[\s\S]*MCP sources[\s\S]*web/);
assert.match(method, /earlier.*preferred|prefer.*earlier/i);
// AC2: per-claim chain-link citation with a reference.
assert.match(method, /every factual claim[\s\S]*chain link[\s\S]*reference/i);
// AC3: UNCERTAIN flag, never presented as observed fact.
assert.match(method, /UNCERTAIN/);
assert.match(method, /never presented as observed fact/);
// AC4: anti-fabrication ban + gap statement.
assert.match(method, /never invent APIs, paths, numbers, versions, or tool output/i);
assert.match(method, /state gaps when the lookup budget is spent/);
assert.match(method, /mark every inference as inference/);
// AC5: per-claim source table with the four columns.
assert.match(method, /Claim\s*\|\s*Chain link\s*\|\s*Reference\s*\|\s*Uncertain/);
// AC6: judge chain-compliance check + report section.
assert.match(judge, /chain compliance/i);
assert.match(judge, /skipped-link/);
assert.match(judge, /UNCERTAIN/);
assert.match(judge, /never interchangeable/);
assert.match(judge, /returned for completion before the audit counts/);
assert.match(report, /Source Chain Compliance/);
// AC7: max-2 lookup rounds budget preserved verbatim.
assert.match(method, /max \*\*2\*\* lookup rounds then state gaps/);
// Dogfood mirror in the upstream session contract (generic wording, no spec numbers).
assert.match(agents, /knowledge chain/i);
assert.match(agents, /UNCERTAIN/);
console.log('test-explicit-knowledge-chain: ok');
