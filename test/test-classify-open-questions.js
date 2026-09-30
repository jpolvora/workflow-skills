import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;
const classifier = path.join(repoRoot, '.agents/skills/ws-classify-complexity/scripts/classify.cjs');

const config = JSON.stringify({
  plans: { dir: '.agents/plans' },
  dagThresholds: { maxImplementationSteps: 1, maxExpectedFiles: 1, maxLayers: 1 },
  defaults: { enableDag: false, skipTesting: false },
  verification: {},
});

function specWithSection(section) {
  return `---
id: null
slug: case
title: Case
source: local
specDate: 2026-09-30
---
## Description
Change across \`src/a.js\` and \`src/b.js\`.
${section}## Acceptance Criteria
- AC1: First behavior in \`src/a.js\`.
- AC2: Second behavior in \`src/b.js\`.
`;
}

const canonicalTable = (rows) => `## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
${rows}
`;

const cases = [
  {
    name: 'canonical unconfirmed row triggers interview',
    section: canonicalTable('| Palette hues | Implementer-chosen | Any six hues satisfy the cue | n |\n| Absent dimensions | N/A because visual-only change | Keeps the spec bounded | y |'),
    expected: true,
  },
  {
    name: 'canonical Confirmed: No triggers interview',
    section: canonicalTable('| Renderer depth | Minimal subset | Skill rule forbids new deps | No |'),
    expected: true,
  },
  {
    name: 'canonical all-confirmed stays silent',
    section: canonicalTable('| Version file | `{skillsRoot}/ws-shared/version.json` | Shared package version | y |\n| Scope rule | Global vs project-local | Matches installer scopes | Y |'),
    expected: false,
  },
  {
    name: 'canonical N/A collapse-only stays silent',
    section: canonicalTable('| Absent dimensions | N/A because read-only report | Dimensions do not apply | y |'),
    expected: false,
  },
  {
    name: 'canonical section without table stays silent',
    section: '## Assumptions & Open Questions\n\nNone.\n\n',
    expected: false,
  },
  {
    name: 'missing section stays silent',
    section: '',
    expected: false,
  },
  {
    name: 'legacy section with item triggers interview',
    section: '## Open Questions\n\n- Which boundary?\n\n',
    expected: true,
  },
  {
    name: 'legacy section with None stays silent',
    section: '## Open Questions\n\nNone\n\n',
    expected: false,
  },
  {
    name: 'legacy section with n/a stays silent',
    section: '## Open Questions\n\nn/a\n\n',
    expected: false,
  },
];

for (const testCase of cases) {
  const root = temp('ws-classify-open-questions-');
  write(path.join(root, '.ws/config.json'), config);
  write(path.join(root, 'case.spec.md'), specWithSection(testCase.section));
  const classified = run(classifier, ['case.spec.md', '--output-dir', 'out'], { cwd: root, env: { WS_REPO_ROOT: root } });
  assert.strictEqual(classified.status, 0, `${testCase.name}: ${classified.stderr}`);
  const payload = JSON.parse(classified.stdout.split('\nWrote ')[0]);
  assert.strictEqual(payload.recommendedPipeline, 'standard', `${testCase.name}: trigger isolation`);
  assert.strictEqual(payload.complexityClass, 'standard', `${testCase.name}: complexity isolation`);
  assert.strictEqual(payload.runInterview, testCase.expected, testCase.name);
  assert.strictEqual(payload.executionProfile.runInterview.value, testCase.expected, `${testCase.name}: profile matches`);
}

console.log(`open-questions: ${cases.length}/${cases.length} cases ok`);
