#!/usr/bin/env node
/**
 * One-shot generator for skill evals under .agents/skills/<id>/evals/evals.json
 * Run from repo root: node bin/generate-skill-evals.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsRoot = path.join(__dirname, '..', '.agents', 'skills');

/** @type {Record<string, { evals: object[] }>} */
const EVALS = {
  'ws-write-spec': {
    evals: [
      {
        id: 1,
        prompt: 'Draft a spec for adding OAuth login with Google and GitHub. Feature slug: oauth-login.',
        expected_output:
          'A local oauth-login.spec.md under {specsDir}/ with acceptance criteria per spec-format. No {plansDir} folder or step-00 file created.',
        assertions: [
          'Agent loads ws-write-spec or write-spec before drafting',
          'Output path uses {specsDir} or plans.specsDir token, not {plansDir}',
          'Agent does not create {plansDir}/{slug}/ or step-00-*.spec.md unless --register',
          'Spec includes testable acceptance criteria',
          'Spec follows spec-format structure (not a freeform essay)',
        ],
      },
      {
        id: 2,
        prompt: 'hey can you write a spec for dark mode toggle in settings',
        expected_output:
          'Casual prompt still yields a structured spec under {specsDir} with slug, scope, and acceptance criteria.',
        assertions: [
          'Agent loads the write-spec skill despite informal phrasing',
          'Spec sets source: local and id: null per spec-format',
          'Slug is derived and used in the artifact filename under {specsDir}',
        ],
      },
      {
        id: 3,
        prompt: 'Write a spec with no acceptance criteria, just a paragraph of ideas.',
        expected_output:
          'Agent pushes back or adds acceptance criteria per spec-format rather than shipping a vague paragraph-only spec.',
        assertions: [
          'Response does not treat paragraph-only text as a complete local spec',
          'Agent references spec-format or acceptance criteria requirements',
          'Uses path tokens ({skillsRoot}, {sharedDir}, {specsDir}) instead of hardcoded consumer paths',
        ],
      },
    ],
  },
  'ws-write-plan': {
    evals: [
      {
        id: 1,
        prompt: 'Create an implementation plan from specs/oauth-login/step-00-oauth-login.spec.md',
        expected_output: 'step-01-oauth-login.plan.md with phased implementation aligned to the spec.',
        assertions: [
          'Agent loads ws-write-plan before planning',
          'Plan references the spec file, not live tracker APIs',
          'Output artifact name follows step-01-{slug}.plan.md pattern',
          'Plan includes verifiable implementation steps',
        ],
      },
      {
        id: 2,
        prompt: '/ws-write-plan for slug billing-refactor — spec is already in {plansDir}/billing-refactor/',
        expected_output: 'Plan scoped to spec; no scope creep beyond the spec.',
        assertions: [
          'Agent reads the existing step-00 spec under {plansDir}',
          'Plan does not invent unrelated features',
          'Uses path tokens or config-resolved plans.dir',
        ],
      },
    ],
  },
  'ws-interview': {
    evals: [
      {
        id: 1,
        prompt: 'Audit the plan at {plansDir}/oauth-login/step-01-oauth-login.plan.md before we implement.',
        expected_output:
          'Interview-style audit with questions or gaps; refined plan or confirmed shared understanding.',
        assertions: [
          'Agent loads ws-interview',
          'Does not jump straight to implementation without plan review',
          'Surfaces ambiguities or missing decisions from the plan',
          'Runs project-context sweep (specs, MEMORY, codebase, architecture, rules) before asking the user',
        ],
      },
      {
        id: 2,
        prompt: 'The plan looks fine, skip interview and start coding.',
        expected_output:
          'Agent follows interview skill gates or documents assumed-default per orchestrator rules.',
        assertions: [
          'Agent does not silently skip interview obligations when orchestrated at Step 2',
          'If proceeding, documents assumption or uses user-gate when available',
          'Uses path tokens ({skillsRoot}, {sharedDir}, {plansDir}) instead of hardcoded consumer paths',
        ],
      },
      {
        id: 3,
        prompt:
          'autoMode interview: a blocking gap remains after searching the repo; no project source answers it.',
        expected_output:
          'Agent applies model-inferred default with rationale; does not block on user-gate for that gap.',
        assertions: [
          'Agent attempts project-context sweep before falling back',
          'In autoMode, marks resolutionSource model-inferred (or equivalent) instead of needs_user',
          'Registry records evidence path(s) when project-sourced, or model-inferred rationale when not',
        ],
      },
      {
        id: 4,
        prompt:
          'softSkipEligible interview: Audit found only non-blocking gaps; no blocking_open. Apply defaults and confirm shared understanding.',
        expected_output:
          'Refined plan with shared_understanding confirmed; non-blocking gaps resolved after project-context sweep (project-sourced when found, else assumed-default).',
        assertions: [
          'Agent still runs project-context sweep for registered non-blocking gaps before defaults',
          'Does not escalate non-blocking gaps to user-gate',
          'Does not skip Resolve solely because softSkipEligible and blocking_open == 0',
          'Marks resolutionSource project or assumed-default for each closed non-blocking gap',
        ],
      },
    ],
  },
  'ws-plan-to-tasks': {
    evals: [
      {
        id: 1,
        prompt: 'Break {plansDir}/oauth-login/step-02-oauth-login.plan.refined.md into a DAG.',
        expected_output: 'step-03-oauth-login.exec.dag.json with atomic tasks and dependencies.',
        assertions: [
          'Agent loads ws-plan-to-tasks',
          'Produces exec.dag.json or step-03 plan.exec artifact',
          'Tasks are atomic and ordered with explicit dependencies',
        ],
      },
      {
        id: 2,
        prompt: 'turn plan into tasks for oauth-login',
        expected_output: 'DAG tasks derived from the refined plan for the slug.',
        assertions: [
          'Resolves slug and reads refined plan from {plansDir}',
          'Does not create tasks unrelated to the plan scope',
        ],
      },
    ],
  },
  'ws-implement-tasks': {
    evals: [
      {
        id: 1,
        prompt: 'Implement the next ready task from {plansDir}/oauth-login/step-03-oauth-login.exec.dag.json',
        expected_output: 'Surgical code changes per plan/DAG; no drive-by refactors.',
        assertions: [
          'Agent loads ws-implement-tasks',
          'Changes align with the DAG task scope',
          'Consults MEMORY or stack file before inventing patterns',
        ],
      },
      {
        id: 2,
        prompt: 'Fix review findings for oauth-login per step-06 fix report.',
        expected_output: 'Targeted fixes in mode=fix without expanding scope.',
        assertions: [
          'Agent treats this as fix substep when fix report is referenced',
          'Does not rewrite unrelated modules',
        ],
      },
    ],
  },
  'ws-verify-plan': {
    evals: [
      {
        id: 1,
        prompt: 'Verify implementation against {plansDir}/oauth-login/step-00-oauth-login.spec.md',
        expected_output: 'step-05 plan report with score 0–10 and gap list vs spec.',
        assertions: [
          'Agent loads ws-verify-plan',
          'Compares implementation to spec, not to assumptions',
          'Produces a scored report artifact or structured verification output',
        ],
      },
      {
        id: 2,
        prompt: 'check if oauth login is done',
        expected_output: 'Structured verification against acceptance criteria, not a vague yes.',
        assertions: [
          'Response cites spec acceptance criteria or plan report',
          'Does not claim complete without evidence',
        ],
      },
    ],
  },
  'ws-code-review': {
    evals: [
      {
        id: 1,
        prompt: 'Run local code review for oauth-login branch changes before PR.',
        expected_output: 'Two-phase triage + investigation review per skill; step-06 review artifact.',
        assertions: [
          'Agent loads ws-code-review',
          'Review is diff-grounded, not generic praise',
          'Separates blocking vs non-blocking findings',
        ],
      },
      {
        id: 2,
        prompt: 'quick lgtm on my changes',
        expected_output: 'Agent still follows review skill structure rather than empty approval.',
        assertions: [
          'Does not output performative LGTM without reading changes',
          'References concrete files or findings',
        ],
      },
    ],
  },
  'ws-testing': {
    evals: [
      {
        id: 1,
        prompt: 'Run pre-PR testing for oauth-login per project config.',
        expected_output: 'Testing plan/report artifacts; commands from config.json verification.',
        assertions: [
          'Agent loads ws-testing',
          'Uses verification.backendTest or frontendTest from config when present',
          'Documents pass/fail with command output evidence',
        ],
      },
      {
        id: 2,
        prompt: '/ws-testing skip coverage if tests pass',
        expected_output: 'Agent follows testing skill gates; skip only when skill allows.',
        assertions: [
          'Does not skip required gates without explicit skill-compliant reason',
          'Records testing report artifact when orchestrated',
        ],
      },
    ],
  },
  'ws-ship-pr': {
    evals: [
      {
        id: 1,
        prompt: '/ship-pr for oauth-login — create PR to main.',
        expected_output: 'Delivery commit, push, PR creation per config SCM; step-08 result artifact.',
        assertions: [
          'Agent loads ws-ship-pr',
          'Resolves branches from config.json, not hardcoded names',
          'Uses explicit script launchers for verify/detect-base when referenced',
        ],
      },
      {
        id: 2,
        prompt: 'ship it but do not push yet',
        expected_output: 'Agent respects stopBeforeFixPr or dry-run style constraints when stated.',
        assertions: [
          'Does not push when user requests hold',
          'Documents ship action taken vs deferred',
        ],
      },
    ],
  },
  'ws-fix-pr': {
    evals: [
      {
        id: 1,
        prompt: 'Fix open review threads on PR #42 for oauth-login.',
        expected_output: 'Threads addressed with evidence; uses provider scripts via shims.',
        assertions: [
          'Agent loads ws-fix-pr',
          'Uses fetch_threads/resolve_thread via documented script paths',
          'Does not claim threads resolved without checking remote state',
        ],
      },
      {
        id: 2,
        prompt: 'resolve all PR comments automatically',
        expected_output: 'Cooperative fix flow per skill; no blind auto-resolve without reading threads.',
        assertions: [
          'Agent reads thread content before resolving',
          'Uses provider-appropriate SCM from config',
        ],
      },
    ],
  },
  'ws-goal-fix-pr': {
    evals: [
      {
        id: 1,
        prompt: 'Keep fixing PR #42 until zero open review threads.',
        expected_output: 'Convergence loop via ws-goal-fix-pr until thread count is zero or blocked.',
        assertions: [
          'Agent loads ws-goal-fix-pr or goal-fix-pr',
          'Uses goal-loop convergence pattern',
          'Reports remaining thread count each iteration',
        ],
      },
      {
        id: 2,
        prompt: 'one pass fix-pr on PR 42 then stop',
        expected_output: 'Single ws-fix-pr pass, not unbounded goal loop.',
        assertions: [
          'Does not run infinite loop when user caps iterations',
          'Distinguishes ws-goal-fix-pr from single fix-pr',
        ],
      },
    ],
  },
  'ws-update-plan-implementation': {
    evals: [
      {
        id: 1,
        prompt: 'Capture QA findings and update the oauth-login plan after ship.',
        expected_output: 'Plan deltas recorded in post-workflow update artifact.',
        assertions: [
          'Agent loads ws-update-plan-implementation',
          'Updates plan with findings, not a changelog dump',
          'References {plansDir} artifacts for the slug',
        ],
      },
      {
        id: 2,
        prompt: 'No QA gaps found for billing-refactor — still run post-workflow update?',
        expected_output: 'Documents N/A or minimal delta when no findings; does not invent issues.',
        assertions: [
          'Does not fabricate plan deltas without evidence',
          'Distinguishes changelog skill from plan implementation update',
        ],
      },
    ],
  },
  'ws-sync-spec': {
    evals: [
      {
        id: 1,
        prompt: 'Sync the oauth-login spec after its callback API changed from GET to POST.',
        expected_output:
          'A drift analysis and surgical spec update proposal, with a Revision History entry, before any file is written.',
        assertions: [
          'Agent loads ws-sync-spec and identifies modified implementation scope',
          'Compares actual code behavior against existing spec requirements and acceptance criteria',
          'Proposes updates and requests user approval before writing the spec',
        ],
      },
      {
        id: 2,
        prompt: 'Check whether recent billing controller changes have a matching feature spec to sync.',
        expected_output:
          'Candidate specs are searched under configured spec locations, or the agent reports that no existing spec was found.',
        assertions: [
          'Searches {plansDir}/specs and existing specs without inventing a spec path',
          'Reports the exact no-existing-spec outcome when no matching spec exists',
          'Does not create a new spec as part of drift synchronization',
        ],
      },
    ],
  },
  'ws-spec-to-pr': {
    evals: [
      {
        id: 1,
        prompt: '/spec-to-pr dry-run for feature: export users to CSV',
        expected_output: 'FSM orchestration with gates; dry-run logs without destructive git ops.',
        assertions: [
          'Agent loads spec-to-pr orchestrator',
          'Respects dry-run flag (no push/PR create)',
          'Uses dispatch-agent or documented step dispatch for steps',
        ],
      },
      {
        id: 2,
        prompt: 'Run full spec-to-pr from GitHub issue #99',
        expected_output: 'Provider fetch-to-spec then steps 0–9 per STEP-DISPATCH.',
        assertions: [
          'Routes issue entry through github-provider fetch-to-spec',
          'Does not read live issue API after step-00 spec exists',
        ],
      },
      {
        id: 3,
        prompt: '/spec-to-pr auto skip-tests',
        expected_output: 'Flags combine; skip-tests honored per gates without skipping mandatory hygiene.',
        assertions: [
          'Documents skip-tests in state or proof',
          'Still runs integrity/harness obligations when required by step',
        ],
      },
    ],
  },
  'ws-spec-to-pr-lite': {
    evals: [
      {
        id: 1,
        prompt: '/spec-to-pr-lite for local specs/oauth-login/step-00-oauth-login.spec.md',
        expected_output: 'Fast sequential steps 0–5 without full FSM subagent dispatch.',
        assertions: [
          'Agent loads spec-to-pr-lite',
          'Uses lite step numbers, not STEP-DISPATCH standard-only table',
          'Shares config and gates with standard orch',
        ],
      },
      {
        id: 2,
        prompt: 'lite delivery auto dry-run on billing-refactor spec',
        expected_output: 'Combined flags; inline execution in main session.',
        assertions: [
          'Does not require dispatch-agent for every lite step',
          'Sets workflowType lite in state isolation',
        ],
      },
    ],
  },
  'ws-github-provider': {
    evals: [
      {
        id: 1,
        prompt: 'Convert GitHub issue #42 to a local spec for oauth-login.',
        expected_output:
          'fetch-to-spec via github-issue-to-spec.py writes {specsDir}/us-{n}.spec.md, then register_local_spec.py copies to step-00 under {plansDir}.',
        assertions: [
          'Agent loads ws-github-provider',
          'Uses scripts/github-issue-to-spec.py with python launcher',
          'Does not hardcode org/repo names',
        ],
      },
      {
        id: 2,
        prompt: 'list open review threads on PR 15',
        expected_output: 'Structured thread list via fetch_threads.cjs.',
        assertions: [
          'Uses github-provider scripts path',
          'Auth resolved from config or gh CLI, not embedded tokens',
        ],
      },
    ],
  },
  'ws-azure-devops-provider': {
    evals: [
      {
        id: 1,
        prompt: 'Fetch ADO work item 1234 to spec for slug ado-feature.',
        expected_output:
          'ado-workitem-to-spec.py writes {specsDir}/us-{id}.spec.md, then register_local_spec.py copies to step-00 under {plansDir}.',
        assertions: [
          'Agent loads ws-azure-devops-provider',
          'Reads org/project from config.json issueTrackers.azureDevOps',
          'Uses python launcher on scripts/ado-workitem-to-spec.py',
        ],
      },
      {
        id: 2,
        prompt: 'resolve thread 99 on ADO PR 50',
        expected_output: 'fix_pr_azure_context.py resolve-thread with PAT from env.',
        assertions: [
          'Does not hardcode organization or project',
          'UTF-8 handling noted for context.json on Windows',
        ],
      },
    ],
  },
  'ws-local-spec-provider': {
    evals: [
      {
        id: 1,
        prompt: 'Use @ws-local-spec-provider for a typical local-spec-provider task in this project.',
        expected_output: 'Agent loads ws-local-spec-provider and follows its skill contract.',
        assertions: [
          'Agent loads ws-local-spec-provider before acting',
          'Follows skill steps and Done when criteria',
          'Uses path tokens from tools.md instead of hardcoded consumer paths',
          'Output is en-us and harness-neutral',
        ],
      },
      {
        id: 2,
        prompt: '/local-spec-provider — edge case: missing or incomplete config.json',
        expected_output: 'Agent stops or bootstraps via configure-project/setup, not silent guessing.',
        assertions: [
          'Recognizes ws-local-spec-provider trigger from slash or @ invocation',
          'References ws-shared/config.json or configure-project when config missing',
          'Does not invent project-specific metadata',
        ],
      },
    ],
  },
  'ws-spec-format': {
    evals: [
      {
        id: 1,
        prompt: 'Review specs/oauth-login/step-00-oauth-login.spec.md for format compliance.',
        expected_output: 'Format review against spec-format protocol; concrete fixes listed.',
        assertions: [
          'Agent loads spec-format',
          'Checks acceptance criteria, source, id fields',
          'Does not treat issue.json as downstream read target',
        ],
      },
      {
        id: 2,
        prompt: 'fix this spec — it has no slug or acceptance criteria',
        expected_output: 'Normalized spec shape per protocol.',
        assertions: [
          'Adds or requests missing required sections',
          'Uses en-us skill content',
        ],
      },
    ],
  },
  'ws-check-harness': {
    evals: [
      {
        id: 1,
        prompt: 'Use @ws-check-harness for a typical check-harness task in this project.',
        expected_output: 'Agent loads ws-check-harness and follows its skill contract.',
        assertions: [
          'Agent loads ws-check-harness before acting',
          'Follows skill steps and Done when criteria',
          'Uses path tokens from tools.md instead of hardcoded consumer paths',
          'Output is en-us and harness-neutral',
        ],
      },
      {
        id: 2,
        prompt: '/check-harness — edge case: missing or incomplete config.json',
        expected_output: 'Agent stops or bootstraps via configure-project/setup, not silent guessing.',
        assertions: [
          'Recognizes ws-check-harness trigger from slash or @ invocation',
          'References ws-shared/config.json or configure-project when config missing',
          'Does not invent project-specific metadata',
        ],
      },
      {
        id: 3,
        prompt: 'Dry-run ws-check-harness at this upstream package root and report Install mode + Skills scan root.',
        expected_output:
          'Install mode: upstream; Skills scan root: .agents/skills; Mode reported separately from Install mode.',
        assertions: [
          'Detects package markers (bin/skill-dependencies.json + bin/cli.js) and SoT under .agents/skills/ws-*/SKILL.md',
          'Reports Install mode upstream with Skills scan root .agents/skills',
          'Does not select src/skills as the upstream skills scan root',
          'Does not conflate execution Mode (normal|dry-run) with Install mode',
        ],
      },
      {
        id: 4,
        prompt:
          'Dry-run ws-check-harness in a consumer tree that has only .agents/skills (no bin/skill-dependencies.json package markers).',
        expected_output:
          'Install mode: consumer; Skills scan root under {skillsRoot} (default .agents/skills) and/or {globalSkillsRoot}; missing root AGENTS.md is OK.',
        assertions: [
          'Reports Install mode consumer when upstream markers/SoT evidence is incomplete',
          'Scans {skillsRoot} (and optional global) rather than inventing inventory from stray src/skills',
          'Treats missing root AGENTS.md as OK; audits ws-shared/AGENTS.md as the consumer hub',
        ],
      },
    ],
  },
  'ws-check-workflows': {
    evals: [
      {
        id: 1,
        prompt: 'Validate spec-to-pr and lite workflow paths.',
        expected_output: 'check_workflows.py simulation; FSM/step continuity results.',
        assertions: [
          'Agent loads check-workflows',
          'Invokes python on scripts/check_workflows.py',
          'Covers dual-mode config sharing',
        ],
      },
      {
        id: 2,
        prompt: 'check-workflows after editing STEP-DISPATCH — lite must not use standard-only table',
        expected_output: 'Validator flags cross-mode dispatch mistakes.',
        assertions: [
          'Distinguishes spec-to-pr standard steps from lite steps 0–5',
          'Reports critical findings with file paths',
        ],
      },
    ],
  },
  'ws-configure-project': {
    evals: [
      {
        id: 1,
        prompt: 'Use @ws-configure-project for a typical configure-project task in this project.',
        expected_output: 'Agent loads ws-configure-project and follows its skill contract.',
        assertions: [
          'Agent loads ws-configure-project before acting',
          'Follows skill steps and Done when criteria',
          'Uses path tokens from tools.md instead of hardcoded consumer paths',
          'Output is en-us and harness-neutral',
        ],
      },
      {
        id: 2,
        prompt: '/configure-project — edge case: missing or incomplete config.json',
        expected_output: 'Agent stops or bootstraps via configure-project/setup, not silent guessing.',
        assertions: [
          'Recognizes ws-configure-project trigger from slash or @ invocation',
          'References ws-shared/config.json or configure-project when config missing',
          'Does not invent project-specific metadata',
        ],
      },
      {
        id: 3,
        prompt: '/ws-configure-project --section autoload',
        expected_output:
          'Agent refreshes autoload.md Always-applied paths and offers Generate/Refresh root AGENTS.md via user-gate; uses configure_autoload.py; no absolute paths.',
        assertions: [
          'Loads --section autoload flow from SKILL.md / INTERVIEW.md',
          'Offers Generate/Refresh / Keep current / Skip for root AGENTS.md',
          'Uses configure_autoload.py helper with portable path forms only',
          'Does not invent absolute filesystem paths',
        ],
      },
    ],
  },
  'ws-secrets-leak-review': {
    evals: [
      {
        id: 1,
        prompt: 'Scan repo for secrets before public push.',
        expected_output: 'Leak scan using secrets-leak-review skill and scanner scripts.',
        assertions: [
          'Agent loads secrets-leak-review',
          'Checks for API keys, tokens, PII patterns',
          'Uses bash/python launchers on scripts/ when running hooks',
        ],
      },
      {
        id: 2,
        prompt: 'is it safe to commit .env with fake values?',
        expected_output: 'Risk assessment; recommends gitignore and pre-commit hook.',
        assertions: [
          'Warns about committing env files even with fake values',
          'References install-hook.sh only as optional helper',
        ],
      },
    ],
  },
  'ws-fable-judge': {
    evals: [
      {
        id: 1,
        prompt: 'Adversarial audit: verify oauth-login PR claims vs diff.',
        expected_output: 'VERIFIED / VERIFIED WITH CAVEATS / REFUTED verdict with evidence.',
        assertions: [
          'Agent loads fable-judge',
          'Diff-grounded verification, not trust of claims',
          'Detects weakened checks or false completion',
        ],
      },
      {
        id: 2,
        prompt: 'judge says tests pass but I see no test output',
        expected_output: 'REFUTED or caveats when evidence missing.',
        assertions: [
          'Requires observable evidence for pass claims',
          'Does not rubber-stamp completion',
        ],
      },
    ],
  },
  'ws-fable-method': {
    evals: [
      {
        id: 1,
        prompt: '/fable-method — production login failures spiked after deploy.',
        expected_output: '7-step loop with triviality/fit gates; evidence before action.',
        assertions: [
          'Agent loads fable-method',
          'Gathers primary-source evidence before deciding',
          'Reports outcome-first',
        ],
      },
      {
        id: 2,
        prompt: 'trivial ask: rename variable x to y — use fable-method?',
        expected_output: 'Triviality gate routes away from full 7-step ceremony.',
        assertions: [
          'Recognizes trivial task vs full method fit',
          'Does not over-process simple rename',
        ],
      },
    ],
  },
  'ws-fable-domain': {
    evals: [
      {
        id: 1,
        prompt: 'Generate a DevOps domain adapter for CI/CD verification.',
        expected_output: 'Domain schema with binding evidence sets and fraud definitions.',
        assertions: [
          'Agent loads fable-domain',
          'Produces adapter artifacts under references/ or disclosed paths',
          'Harness-neutral vocabulary',
        ],
      },
      {
        id: 2,
        prompt: 'Create a Research domain adapter with no evidence requirements',
        expected_output: 'Agent requires minimum evidence sets per fable-domain schemas.',
        assertions: [
          'Does not ship adapter without binding evidence sets',
          'Documents domain authority and observation rules',
        ],
      },
    ],
  },
  'ws-goal-loop': {
    evals: [
      {
        id: 1,
        prompt: 'Loop until check-harness reports zero critical findings.',
        expected_output: 'Generic convergence loop with exit condition and iteration cap.',
        assertions: [
          'Agent loads goal-loop',
          'Defines measurable done condition',
          'Does not infinite-loop without reporting progress',
        ],
      },
      {
        id: 2,
        prompt: 'goal loop with max 2 iterations on flaky test',
        expected_output: 'Respects iteration cap; reports last state when not converged.',
        assertions: [
          'Honors max iteration bound when specified',
          'Documents exit reason when goal not met',
        ],
      },
    ],
  },
  'ws-tdah': {
    evals: [
      {
        id: 1,
        prompt: '/ws-tdah explain why JWT refresh fails intermittently',
        expected_output: 'Leads with next action; unverbose; ends with one concrete next step.',
        assertions: [
          'Leads with next action; no preamble',
          'Technical terms and code remain exact',
          'Ends with one concrete next step',
        ],
      },
      {
        id: 2,
        prompt: 'Is this architecture good? (vague praise wanted)',
        expected_output: 'Direct accountable answer; challenges weak framing; no empty praise.',
        assertions: [
          'Does not output sycophantic flattery',
          'States assumptions or asks one critical question if blocked',
          'Keeps action-first shape',
        ],
      },
      {
        id: 3,
        prompt: 'stop ws-gabarito — give full sentences for an onboarding doc',
        expected_output: 'Normal mode; retired gabarito opt-out honored.',
        assertions: [
          'Recognizes stop ws-gabarito / stop ws-tdah / stop verbosity / normal mode',
          'Uses full sentences after stop',
          'Does not offer intensity or level switches',
        ],
      },
    ],
  },
  'ws-karpathy-guidelines': {
    evals: [
      {
        id: 1,
        prompt: 'Refactor entire auth module while fixing one bug.',
        expected_output: 'Surgical fix only; pushback on scope creep.',
        assertions: [
          'Touches only code required for the bug',
          'Consults MEMORY before inventing approach',
          'States assumptions explicitly',
        ],
      },
      {
        id: 2,
        prompt: 'Add error handling for impossible edge case we will never hit',
        expected_output: 'Pushback on speculative error handling per simplicity first.',
        assertions: [
          'Does not add handling for impossible scenarios',
          'Explains tradeoff when declining scope',
        ],
      },
    ],
  },
  'ws-self-learning': {
    evals: [
      {
        id: 1,
        prompt: 'After fixing CRLF launcher bug, record the trap.',
        expected_output: 'memory entry + compile via scripts/self_learning.py.',
        assertions: [
          'Agent loads self-learning',
          'Writes to {sharedDir}/memory/ not changelog',
          'Uses python {skillsRoot}/self-learning/scripts/self_learning.py --compile',
        ],
      },
      {
        id: 2,
        prompt: 'Pure Q&A: what is spec-to-pr?',
        expected_output: 'Learning: N/A when no durable trap to record.',
        assertions: [
          'Consults MEMORY before planning when task would mutate repo',
          'Proof line includes Learning: N/A for pure Q&A',
        ],
      },
    ],
  },
  'ws-changelog': {
    evals: [
      {
        id: 1,
        prompt: 'Record task completion for oauth-login feature.',
        expected_output: 'Append summarized entry to rules.changelogFile default CHANGELOG.md.',
        assertions: [
          'Agent loads changelog skill',
          'Uses config rules.changelogFile path',
          'Summary not a dump of entire conversation',
        ],
      },
      {
        id: 2,
        prompt: 'Write every chat message into CHANGELOG',
        expected_output: 'Agent refuses verbose dump; summarized historical record only.',
        assertions: [
          'Entry is concise summary, not transcript',
          'Writes to configured changelog path only',
        ],
      },
    ],
  },
  'ws-write-a-skill': {
    evals: [
      {
        id: 1,
        prompt: 'Create a skill for PDF form filling.',
        expected_output: 'SKILL.md with frontmatter, steps, Done when criteria; scripts only if earned.',
        assertions: [
          'Agent loads write-a-skill',
          'Description uses Use when triggers for model-invoked skills',
          'Consults MEMORY before drafting scripts',
        ],
      },
      {
        id: 2,
        prompt: 'optimize my 300-line SKILL.md',
        expected_output: 'Prune + progressive disclosure; target ≤100 lines or split.',
        assertions: [
          'Recommends GLOSSARY/REFERENCE split when over limit',
          'Does not duplicate hub routing prose',
        ],
      },
    ],
  },
  'ws-show-harness': {
    evals: [
      {
        id: 1,
        prompt: '/show-harness — what skills are active this session?',
        expected_output: 'Snapshot of loaded skills, rules, and harness paths.',
        assertions: [
          'Agent loads show-harness',
          'Lists discoverable skills under {skillsRoot}',
          'Does not invent skills not on disk',
        ],
      },
      {
        id: 2,
        prompt: 'show harness after partial install (only spec-to-pr)',
        expected_output: 'Reports missing deps and install guidance, not a false full snapshot.',
        assertions: [
          'Distinguishes installed vs missing pipeline skills',
          'References ws-shared hub or installed-skills.json when present',
        ],
      },
    ],
  },
  'ws-senior-developer': {
    evals: [
      {
        id: 1,
        prompt: 'Add audit logging across the API, worker, and admin UI from this free-text request.',
        expected_output:
          'The delivery gate reads applicable project context and MEMORY, then requires a confirmed multi-file plan before implementation.',
        assertions: [
          'Classifies the free-text request as non-trivial multi-file work',
          'Reads configured project context, applicable rules, and {sharedDir}/MEMORY.md',
          'Requires a confirmed plan with scope and verification before implementation',
          'Uses {plansDir} or installed workflow/specification capabilities for the plan handoff',
        ],
      },
      {
        id: 2,
        prompt: 'Rename one typo in src/constants.ts.',
        expected_output:
          'A focused single-file change with risk-proportionate checks, without plan ceremony.',
        assertions: [
          'Classifies the request as trivial or single-file work',
          'Does not require a multi-file plan or user-gate confirmation',
          'Limits verification to focused checks appropriate to the small change',
          'Avoids unrelated refactors or unconfigured commands',
        ],
      },
      {
        id: 3,
        prompt: '/ws-spec-to-pr implement the approved billing export plan.',
        expected_output:
          'The named workflow and explicit implementation route take precedence without a competing delivery gate.',
        assertions: [
          'Routes the named workflow command through ws-spec-to-pr',
          'Identifies the explicit implementation request before adding planning or review gates',
          'Does not impose a conflicting duplicate workflow or plan gate',
          'Applies senior-developer constraints only when explicitly requested or configured',
        ],
      },
      {
        id: 4,
        prompt: 'The multi-file change is ready for a branch and PR handoff.',
        expected_output:
          'Pre-ship proof covers review, configured verification, secrets, docs/spec-index assessment, and evidence or blockers.',
        assertions: [
          'Performs focused review of changed scope for correctness, regressions, and policy compliance',
          'Runs applicable non-empty configured build, test, and format aliases',
          'Runs configured secrets checking and resolves or reports findings',
          'Assesses relevant documentation and specification-index updates',
          'Reports command evidence, outcomes, remaining risks, and explicit blockers',
        ],
      },
    ],
  },
};

function parseFrontmatter(skillMd) {
  const m = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { name: null, description: '' };
  const fm = m[1];
  const nameM = fm.match(/^name:\s*['"]?([^\s'"]+)/m);
  const descM = fm.match(/^description:\s*>?-?\s*\r?\n([\s\S]*?)(?=\r?\n[a-z_]+:|\r?\n---|$)/m)
    || fm.match(/^description:\s*(.+)/m);
  let description = '';
  if (descM) {
    description = descM[1].replace(/^\s+/gm, ' ').trim();
  }
  return { name: nameM ? nameM[1].trim() : null, description };
}

function genericEvals(skillName, description) {
  const short = skillName.replace(/^ws-/, '');
  return {
    evals: [
      {
        id: 1,
        prompt: `Use @${skillName} for a typical ${short || skillName} task in this project.`,
        expected_output: `Agent loads ${skillName} and follows its skill contract.`,
        assertions: [
          `Agent loads ${skillName} before acting`,
          'Follows skill steps and Done when criteria',
          'Uses path tokens from tools.md instead of hardcoded consumer paths',
          'Output is en-us and harness-neutral',
        ],
      },
      {
        id: 2,
        prompt: `/${short || skillName} — edge case: missing or incomplete config.json`,
        expected_output: 'Agent stops or bootstraps via configure-project/setup, not silent guessing.',
        assertions: [
          `Recognizes ${skillName} trigger from slash or @ invocation`,
          'References ws-shared/config.json or configure-project when config missing',
          'Does not invent project-specific metadata',
        ],
      },
    ],
  };
}

const dirs = fs.readdirSync(skillsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'ws-shared')
  .map((d) => d.name);

let written = 0;
for (const dir of dirs.sort()) {
  const skillMdPath = path.join(skillsRoot, dir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) continue;
  const { name } = parseFrontmatter(fs.readFileSync(skillMdPath, 'utf8'));
  if (!name) {
    console.warn(`skip ${dir}: no name in frontmatter`);
    continue;
  }
  const payload = EVALS[name] || genericEvals(name, '');
  const out = {
    skill_name: name,
    evals: payload.evals,
  };
  const fallbackAssertions = [
    'Uses path tokens ({skillsRoot}, {sharedDir}, {plansDir}) instead of hardcoded consumer paths',
    'Output is en-us and harness-neutral',
    'Does not invent project metadata outside config.json or stack docs',
  ];
  for (const ev of out.evals) {
    let i = 0;
    while (ev.assertions.length < 3) {
      ev.assertions.push(fallbackAssertions[i % fallbackAssertions.length]);
      i += 1;
    }
  }
  const evalsDir = path.join(skillsRoot, dir, 'evals');
  fs.mkdirSync(evalsDir, { recursive: true });
  fs.writeFileSync(
    path.join(evalsDir, 'evals.json'),
    `${JSON.stringify(out, null, 2)}\n`,
    'utf8',
  );
  written += 1;
  console.log(`wrote ${dir}/evals/evals.json (${name}, ${out.evals.length} evals)`);
}

console.log(`\nTotal: ${written} skills`);
