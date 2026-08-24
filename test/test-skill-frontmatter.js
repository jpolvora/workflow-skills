/**
 * build-site --bump frontmatter rewrite must not accumulate blank lines on CRLF.
 * Run: node test/test-skill-frontmatter.js
 */
import { rewriteSkillMarkdown } from '../bin/skill-frontmatter.js';

let failures = 0;

function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

function leadingBlanks(text) {
  const m = text.match(/^---\n(\n*)/);
  return m ? m[1].length : -1;
}

const crlfDirty = [
  '---',
  '',
  '',
  '',
  'name: ws-sample',
  'version: 0.3.14',
  'description: observe',
  '---',
  '',
  '# ws-sample',
  '',
].join('\r\n');

const once = rewriteSkillMarkdown(crlfDirty, '0.3.15');
assert(once != null, 'CRLF dirty frontmatter parses');
assert(!once.includes('\r'), 'output is LF-only');
assert(leadingBlanks(once) === 0, `CRLF dirty rewrite has 0 leading blanks (got ${leadingBlanks(once)})`);
assert(once.startsWith('---\nname: ws-sample\nversion: 0.3.15\n'), 'version stamped; name immediately after ---');
assert(once.includes('# ws-sample'), 'body preserved');

const twice = rewriteSkillMarkdown(once.replace(/\n/g, '\r\n'), '0.3.16');
assert(leadingBlanks(twice) === 0, 'second CRLF bump does not add a blank line');
assert(twice.includes('version: 0.3.16'), 'second bump stamps new version');

const cleanLf = '---\nname: ws-plan-to-tasks\nversion: 0.3.14\n---\n\n# ws-plan-to-tasks\n';
const cleanOut = rewriteSkillMarkdown(cleanLf, '0.3.15');
assert(cleanOut === '---\nname: ws-plan-to-tasks\nversion: 0.3.15\n---\n\n# ws-plan-to-tasks\n', 'clean LF rewrite is stable besides version');

const noVersion = '---\nname: ws-new\ndescription: x\n---\n\n# ws-new\n';
const inserted = rewriteSkillMarkdown(noVersion, '0.3.15');
assert(
  inserted === '---\nname: ws-new\nversion: 0.3.15\ndescription: x\n---\n\n# ws-new\n',
  'missing version is inserted after name',
);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll skill-frontmatter checks passed.');
