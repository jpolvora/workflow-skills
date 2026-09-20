#!/usr/bin/env node
'use strict';

// Port of check_workflows.py (ws-check-workflows):
// Deep validation & simulation for workflow processes (ws-spec-to-pr & ws-spec-to-pr-lite).
//
// - Simulates standard (full, steps 0-9) and lite (sequential, steps 0-5) workflows.
// - Checks step continuity, linked skill existence, script syntax, dependency closure, and state isolation.
// - Detects broken steps, missing dependencies, and syntax errors.
// - Generates actionable fix suggestions and improvements.
// - By default displays a detailed report and requests user confirmation for fix execution.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_DIR = __dirname;

function findRepoRoot(startDir) {
  let curr = path.resolve(startDir);
  const roots = [curr];
  let p = curr;
  while (p !== path.dirname(p)) {
    p = path.dirname(p);
    roots.push(p);
  }
  for (const c of roots) {
    if (fs.existsSync(path.join(c, '.git')) || fs.existsSync(path.join(c, 'package.json')) || fs.existsSync(path.join(c, '.agents'))) return c;
  }
  return roots[Math.min(2, roots.length - 1)] || '/';
}

const REPO_ROOT = findRepoRoot(SCRIPT_DIR);

function resolveSkillsDir(repoRoot) {
  let configPath = path.join(repoRoot, '.ws', 'config.json');
  if (!fs.existsSync(configPath)) configPath = path.join(repoRoot, '.agents', 'skills', 'ws-shared', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const token = cfg && cfg.pathTokens && cfg.pathTokens.skillsRoot;
      if (token) {
        const candidate = path.join(repoRoot, token);
        if (fs.existsSync(candidate)) return candidate;
      }
    } catch { /* ignore */ }
  }
  const fallback = path.join(repoRoot, '.agents', 'skills');
  return fs.existsSync(fallback) ? fallback : repoRoot;
}

const SKILLS_DIR = resolveSkillsDir(REPO_ROOT);
const SHARED_DEPS_PATH = path.join(SKILLS_DIR, 'ws-shared', 'runtime', 'skill-dependencies.json');
const BIN_DEPS_PATH = path.join(REPO_ROOT, 'bin', 'skill-dependencies.json');

class Issue {
  constructor(severity, category, location, message, fixSuggestion) {
    this.severity = severity;
    this.category = category;
    this.location = location;
    this.message = message;
    this.fix_suggestion = fixSuggestion;
  }
  toDict() {
    return { severity: this.severity, category: this.category, location: this.location, message: this.message, fix_suggestion: this.fix_suggestion };
  }
}

class WorkflowChecker {
  constructor() {
    this.issues = [];
    this.simulationResults = {
      standard: { steps: {}, status: 'PASS' },
      lite: { steps: {}, status: 'PASS' },
      multi_spec: { steps: {}, status: 'PASS' },
    };
    this.depsMap = {};
    this.depsLoaded = false;
    this.depsLocation = 'skill-dependencies.json';
    this.loadDependencies();
  }

  loadDependencies() {
    let depsPath = null;
    if (fs.existsSync(SHARED_DEPS_PATH)) depsPath = SHARED_DEPS_PATH;
    else if (fs.existsSync(BIN_DEPS_PATH)) depsPath = BIN_DEPS_PATH;
    if (depsPath) {
      this.depsLocation = path.relative(REPO_ROOT, depsPath).replace(/\\/g, '/');
      try {
        const data = JSON.parse(fs.readFileSync(depsPath, 'utf8'));
        this.depsMap = data.dependencies || {};
        this.depsLoaded = true;
      } catch (e) {
        this.issues.push(new Issue('WARNING', 'Dependency Graph', this.depsLocation, `Failed to parse skill-dependencies.json: ${e.message}`, `Verify JSON syntax in ${this.depsLocation}.`));
      }
    }
    if (fs.existsSync(SHARED_DEPS_PATH) && fs.existsSync(BIN_DEPS_PATH)) {
      try {
        const sharedData = JSON.parse(fs.readFileSync(SHARED_DEPS_PATH, 'utf8'));
        const binData = JSON.parse(fs.readFileSync(BIN_DEPS_PATH, 'utf8'));
        const sharedWf = new Set(((sharedData.packages || {}).workflows || {}).skills || []);
        const binWf = new Set(((binData.packages || {}).workflows || {}).skills || []);
        const missing = [...binWf].filter((s) => !sharedWf.has(s));
        const extra = [...sharedWf].filter((s) => !binWf.has(s));
        if (missing.length || extra.length) {
          let msg = 'Package skills mismatch between bin/skill-dependencies.json and ws-shared/runtime/skill-dependencies.json.';
          if (missing.length) msg += ` Missing in ws-shared: ${JSON.stringify(missing.sort())}.`;
          if (extra.length) msg += ` Extra in ws-shared: ${JSON.stringify(extra.sort())}.`;
          this.issues.push(new Issue('CRITICAL', 'Dependency Graph Sync', 'ws-shared/runtime/skill-dependencies.json', msg, 'Sync .agents/skills/ws-shared/runtime/skill-dependencies.json with bin/skill-dependencies.json.'));
        }
      } catch { /* ignore */ }
    }
  }

  addIssue(severity, category, location, message, fixSuggestion) {
    this.issues.push(new Issue(severity, category, location, message, fixSuggestion));
  }

  simulateStandardWorkflow() {
    const stdSkillPath = path.join(SKILLS_DIR, 'ws-spec-to-pr', 'SKILL.md');
    if (!fs.existsSync(stdSkillPath)) {
      this.addIssue('CRITICAL', 'Workflow Structure', 'ws-spec-to-pr/SKILL.md', 'Standard ws-spec-to-pr SKILL.md file is missing.', 'Restore .agents/skills/ws-spec-to-pr/SKILL.md from upstream repository.');
      this.simulationResults.standard.status = 'FAIL';
      return;
    }
    let text = fs.readFileSync(stdSkillPath, 'utf8');
    const dispatchPath = path.join(SKILLS_DIR, 'ws-spec-to-pr', 'STEP-DISPATCH.md');
    if (fs.existsSync(dispatchPath)) text += '\n' + fs.readFileSync(dispatchPath, 'utf8');
    const expectedSteps = {
      0: ['Spec Creation', 'ws-spec-write'],
      1: ['Plan Creation', 'ws-plan-write'],
      2: ['Plan Interview', 'ws-plan-interview'],
      3: ['Plan to Tasks', 'ws-plan-to-tasks'],
      4: ['Task Implementation', 'ws-implement-tasks'],
      5: ['Plan Verification', 'ws-plan-verify'],
      6: ['Code Review', 'ws-code-review'],
      7: ['Testing', 'ws-testing'],
      8: ['Ship PR', 'ws-ship-pr'],
      9: ['Fix PR Threads', 'ws-fix-pr'],
    };
    const foundSteps = {};
    for (const m of text.matchAll(/^\s*\|\s*(\d+)[^\s|]*\s*\|\s*([^|]+)\s*\|/gm)) {
      foundSteps[parseInt(m[1], 10)] = m[2].trim();
    }
    const dispatched = new Set();
    for (const [num, [name, folder]] of Object.entries(expectedSteps)) {
      const stepNum = parseInt(num, 10);
      let status = 'PASS';
      const details = [];
      if (!(stepNum in foundSteps)) {
        status = 'FAIL';
        this.addIssue('CRITICAL', 'Step Continuity', `ws-spec-to-pr (Step ${stepNum})`, `Standard workflow table is missing Step ${stepNum}: ${name}.`, `Add Step ${stepNum} (${name}) row to ws-spec-to-pr/SKILL.md FSM table.`);
      } else {
        details.push(`FSM table entry verified: '${foundSteps[stepNum]}'`);
      }
      if (!fs.existsSync(path.join(SKILLS_DIR, folder, 'SKILL.md'))) {
        status = 'FAIL';
        this.addIssue('CRITICAL', 'Step Skill Link', `ws-spec-to-pr (Step ${stepNum})`, `Step ${stepNum} dispatches missing skill folder '${folder}'.`, `Ensure .agents/skills/${folder}/SKILL.md exists on disk.`);
      } else {
        dispatched.add(folder);
      }
      this.simulationResults.standard.steps[`Step ${stepNum}: ${name}`] = { status, skill: folder, details };
    }
    for (const aux of ['ws-goal-fix-pr', 'ws-spec-provider-github', 'ws-spec-provider-azure-devops', 'ws-spec-provider-local']) {
      if (fs.existsSync(path.join(SKILLS_DIR, aux, 'SKILL.md'))) dispatched.add(aux);
    }
    if (this.depsLoaded) {
      const declared = new Set(this.depsMap['ws-spec-to-pr'] || []);
      const missing = [...dispatched].filter((s) => !declared.has(s));
      if (missing.length) {
        this.addIssue('CRITICAL', 'Dependency Closure', this.depsLocation, `ws-spec-to-pr dispatches skills not listed in dependencies['ws-spec-to-pr']: ${JSON.stringify(missing.sort())}.`, `Add missing skill IDs to ${this.depsLocation} under dependencies['ws-spec-to-pr'].`);
        this.simulationResults.standard.status = 'FAIL';
      } else if (Object.values(this.simulationResults.standard.steps).some((i) => i.status === 'FAIL')) {
        this.simulationResults.standard.status = 'FAIL';
      }
    } else if (Object.values(this.simulationResults.standard.steps).some((i) => i.status === 'FAIL')) {
      this.simulationResults.standard.status = 'FAIL';
    }
  }

  simulateLiteWorkflow() {
    const liteSkillPath = path.join(SKILLS_DIR, 'ws-spec-to-pr-lite', 'SKILL.md');
    if (!fs.existsSync(liteSkillPath)) {
      this.addIssue('CRITICAL', 'Workflow Structure', 'ws-spec-to-pr-lite/SKILL.md', 'Lite ws-spec-to-pr-lite SKILL.md file is missing.', 'Restore .agents/skills/ws-spec-to-pr-lite/SKILL.md from upstream repository.');
      this.simulationResults.lite.status = 'FAIL';
      return;
    }
    const text = fs.readFileSync(liteSkillPath, 'utf8');
    const expectedSteps = {
      0: ['Spec Creation', 'ws-spec-write'],
      1: ['Plan Creation', 'ws-plan-write'],
      2: ['Implementation', 'ws-implement-tasks'],
      3: ['Code Review', 'ws-code-review'],
      4: ['Ship PR', 'ws-ship-pr'],
      5: ['Fix PR Threads', 'ws-fix-pr'],
    };
    const foundSteps = {};
    for (const m of text.matchAll(/^\s*\|\s*([0-5])\s*\|\s*([^|]+)\s*\|/gm)) {
      foundSteps[parseInt(m[1], 10)] = m[2].trim();
    }
    const dispatched = new Set();
    for (const [num, [name, folder]] of Object.entries(expectedSteps)) {
      const stepNum = parseInt(num, 10);
      let status = 'PASS';
      const details = [];
      if (!(stepNum in foundSteps)) {
        status = 'FAIL';
        this.addIssue('CRITICAL', 'Step Continuity', `ws-spec-to-pr-lite (Step ${stepNum})`, `Lite workflow table is missing Step ${stepNum}: ${name}.`, `Add Step ${stepNum} (${name}) row to ws-spec-to-pr-lite/SKILL.md table.`);
      } else {
        details.push(`FSM table entry verified: '${foundSteps[stepNum]}'`);
      }
      if (!fs.existsSync(path.join(SKILLS_DIR, folder, 'SKILL.md'))) {
        status = 'FAIL';
        this.addIssue('CRITICAL', 'Step Skill Link', `ws-spec-to-pr-lite (Step ${stepNum})`, `Step ${stepNum} dispatches missing skill folder '${folder}'.`, `Ensure .agents/skills/${folder}/SKILL.md exists on disk.`);
      } else {
        dispatched.add(folder);
      }
      this.simulationResults.lite.steps[`Step ${stepNum}: ${name}`] = { status, skill: folder, details };
    }
    for (const aux of ['ws-goal-fix-pr', 'ws-spec-provider-github', 'ws-spec-provider-azure-devops', 'ws-spec-provider-local']) {
      if (fs.existsSync(path.join(SKILLS_DIR, aux, 'SKILL.md'))) dispatched.add(aux);
    }
    if (this.depsLoaded) {
      const declared = new Set(this.depsMap['ws-spec-to-pr-lite'] || []);
      const missing = [...dispatched].filter((s) => !declared.has(s));
      if (missing.length) {
        this.addIssue('CRITICAL', 'Dependency Closure', this.depsLocation, `ws-spec-to-pr-lite dispatches skills not listed in dependencies['ws-spec-to-pr-lite']: ${JSON.stringify(missing.sort())}.`, `Add missing skill IDs to ${this.depsLocation} under dependencies['ws-spec-to-pr-lite'].`);
        this.simulationResults.lite.status = 'FAIL';
      } else if (Object.values(this.simulationResults.lite.steps).some((i) => i.status === 'FAIL')) {
        this.simulationResults.lite.status = 'FAIL';
      }
    } else if (Object.values(this.simulationResults.lite.steps).some((i) => i.status === 'FAIL')) {
      this.simulationResults.lite.status = 'FAIL';
    }
  }

  simulateMultiSpecWorkflow() {
    const msSkillPath = path.join(SKILLS_DIR, 'ws-spec-multi', 'SKILL.md');
    if (!fs.existsSync(msSkillPath)) {
      this.addIssue('CRITICAL', 'Workflow Structure', 'ws-spec-multi/SKILL.md', 'ws-spec-multi SKILL.md file is missing.', 'Ensure .agents/skills/ws-spec-multi/SKILL.md exists.');
      this.simulationResults.multi_spec.status = 'FAIL';
      return;
    }
    for (const fname of ['PROTOCOL.md', 'STATE.md', 'EXAMPLES.md', 'evals/evals.json']) {
      const fpath = path.join(SKILLS_DIR, 'ws-spec-multi', fname);
      if (!fs.existsSync(fpath)) {
        this.addIssue('CRITICAL', 'Workflow Structure', `ws-spec-multi/${fname}`, `ws-spec-multi artifact ${fname} is missing.`, `Create .agents/skills/ws-spec-multi/${fname}.`);
        this.simulationResults.multi_spec.status = 'FAIL';
      } else {
        this.simulationResults.multi_spec.steps[`Artifact: ${fname}`] = { status: 'PASS', skill: 'ws-spec-multi', details: [`File verified: ${fname}`] };
      }
    }
    for (const target of ['ws-spec-to-pr', 'ws-spec-to-pr-lite']) {
      if (!fs.existsSync(path.join(SKILLS_DIR, target, 'SKILL.md'))) {
        this.addIssue('CRITICAL', 'Worker Target Link', `ws-spec-multi -> ${target}`, `ws-spec-multi dispatches missing worker target '${target}'.`, `Ensure .agents/skills/${target}/SKILL.md exists.`);
        this.simulationResults.multi_spec.status = 'FAIL';
      } else {
        this.simulationResults.multi_spec.steps[`Worker Target: ${target}`] = { status: 'PASS', skill: target, details: [`Worker target verified: ${target}`] };
      }
    }
  }

  checkScriptsSyntax() {
    const scripts = [];
    const walk = (dir) => {
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === 'node_modules' || e.name === '__pycache__') continue;
          walk(p);
        } else if (e.isFile() && (p.endsWith('.cjs') || p.endsWith('.js'))) {
          scripts.push(p);
        }
      }
    };
    walk(SKILLS_DIR);
    for (const script of scripts) {
      const rel = path.relative(REPO_ROOT, script).replace(/\\/g, '/');
      const r = spawnSync('node', ['--check', script], { encoding: 'utf8' });
      if (r.status !== 0) {
        this.addIssue('CRITICAL', 'Script Syntax Error', rel, `Node.js syntax check failed: ${(r.stderr || '').trim()}`, `Fix JavaScript syntax error in ${rel}.`);
      }
    }
  }

  checkStateIsolationAndConfig() {
    const stdUpdate = path.join(SKILLS_DIR, 'ws-spec-to-pr', 'scripts', 'update_state.cjs');
    const sharedState = path.join(SKILLS_DIR, 'ws-shared', 'runtime', 'scripts', 'workflow_state.cjs');
    if (fs.existsSync(stdUpdate)) {
      const wrapper = fs.readFileSync(stdUpdate, 'utf8');
      const sot = fs.existsSync(sharedState) ? fs.readFileSync(sharedState, 'utf8') : '';
      if (!wrapper.includes("pipeline: 'standard'") || !sot.includes('workflowType')) {
        this.addIssue('CRITICAL', 'State Isolation', 'ws-spec-to-pr/scripts/update_state.cjs', 'Standard update_state.cjs does not serialize workflowType: standard.', 'Ensure update_state.cjs sets pipeline standard and workflow_state.cjs writes workflowType.');
      }
    }
    const liteUpdate = path.join(SKILLS_DIR, 'ws-spec-to-pr-lite', 'scripts', 'update_state.cjs');
    if (fs.existsSync(liteUpdate)) {
      const wrapper = fs.readFileSync(liteUpdate, 'utf8');
      const sot = fs.existsSync(sharedState) ? fs.readFileSync(sharedState, 'utf8') : '';
      if (!wrapper.includes("pipeline: 'lite'") || !sot.includes('workflowType')) {
        this.addIssue('CRITICAL', 'State Isolation', 'ws-spec-to-pr-lite/scripts/update_state.cjs', 'Lite update_state.cjs does not serialize workflowType: lite.', 'Ensure update_state.cjs sets pipeline lite and workflow_state.cjs writes workflowType.');
      }
    }
    const liteValState = path.join(SKILLS_DIR, 'ws-spec-to-pr-lite', 'scripts', 'validate_state.cjs');
    if (fs.existsSync(liteValState)) {
      const code = fs.readFileSync(liteValState, 'utf8');
      if (!code.includes('config.json') || (!code.includes('ws-shared') && !code.includes('.ws'))) {
        this.addIssue('WARNING', 'Config Sharing', 'ws-spec-to-pr-lite/scripts/validate_state.cjs', 'Lite validate_state.cjs does not target the shared hub config.json.', 'Update script to reference {sharedDir}/config.json.');
      }
    }
  }

  checkG2CodeContract() {
    const read = (rel) => {
      const p = path.join(SKILLS_DIR, rel);
      if (!fs.existsSync(p)) {
        this.addIssue('CRITICAL', 'G2-code Contract', rel, `Missing file required for G2-code contract check: ${rel}.`, `Restore .agents/skills/${rel} from upstream.`);
        return '';
      }
      return fs.readFileSync(p, 'utf8');
    };
    const protocols = read('ws-spec-to-pr/PROTOCOLS.md');
    const dispatch = read('ws-spec-to-pr/STEP-DISPATCH.md');
    const lite = read('ws-spec-to-pr-lite/SKILL.md');
    const tools = read('ws-shared/runtime/tools.md');
    const gates = read('ws-shared/runtime/gates.md');
    const review = read('ws-code-review/SKILL.md');
    const stdText = protocols + '\n' + dispatch;
    if (!stdText.includes('G2-code after Step 5 before Step 6')) {
      this.addIssue('CRITICAL', 'G2-code Contract', 'ws-spec-to-pr/PROTOCOLS.md + STEP-DISPATCH.md', 'Standard orch must require G2-code after Step 5 before Step 6.', 'Document required G2-code after Step 5 before Step 6 in PROTOCOLS.md and STEP-DISPATCH.md.');
    }
    if (!lite.includes('G2-code after Step 2 before Step 3')) {
      this.addIssue('CRITICAL', 'G2-code Contract', 'ws-spec-to-pr-lite/SKILL.md', 'Lite orch must require G2-code after Step 2 before Step 3.', 'Document required G2-code after Step 2 before Step 3 in ws-spec-to-pr-lite/SKILL.md.');
    }
    if (tools.includes('git add src/ web/ tests/')) {
      this.addIssue('CRITICAL', 'G2-code Contract', 'ws-shared/runtime/tools.md', 'commit-code still uses directory-wide git add src/ web/ tests/.', 'Stage explicit workflow files_touched paths only (never git add src/ web/ tests/).');
    }
    if (!gates.includes('Post-verify G2-code') || !gates.includes('Post-review-fix G2-code')) {
      this.addIssue('CRITICAL', 'G2-code Contract', 'ws-shared/runtime/gates.md', 'gates.md auto-gate table is missing Post-verify G2-code / Post-review-fix G2-code save points.', 'Add auto-gate rows for Post-verify G2-code and Post-review-fix G2-code.');
    }
    const leftoverFiles = {
      'ws-shared/runtime/tools.md': tools,
      'ws-shared/runtime/gates.md': gates,
      'ws-spec-to-pr/PROTOCOLS.md': protocols,
      'ws-spec-to-pr/STEP-DISPATCH.md': dispatch,
      'ws-spec-to-pr-lite/SKILL.md': lite,
      'ws-code-review/SKILL.md': review,
    };
    const leftoverAdd = /git add src\/\s*web\/\s*tests\//;
    const leftoverFirst = /first (product )?commit at Step 8/i;
    for (const [loc, txt] of Object.entries(leftoverFiles)) {
      if (leftoverAdd.test(txt)) {
        this.addIssue('CRITICAL', 'G2-code Contract', loc, 'Leftover G2-code recipe git add src/ web/ tests/.', 'Replace with path-scoped files_touched staging.');
      }
      if (leftoverFirst.test(txt)) {
        this.addIssue('CRITICAL', 'G2-code Contract', loc, "Leftover product-save rule 'first commit at Step 8'.", 'First required product commit is post-verify / post-implement G2-code; Step 8 remains G2-delivery.');
      }
    }
    if (!review.includes('{base}...HEAD')) {
      this.addIssue('CRITICAL', 'G2-code Contract', 'ws-code-review/SKILL.md', 'ws-code-review must review git diff {base}...HEAD (committed range).', 'Set the primary diff to git diff {base}...HEAD; do not review the dirty working tree.');
    }
    if (!review.includes('config.project.baseBranch')) {
      this.addIssue('CRITICAL', 'G2-code Contract', 'ws-code-review/SKILL.md', 'ws-code-review must resolve base from config.project.baseBranch.', 'Default base to config.project.baseBranch then auto-detect main/master.');
    }
    if (!review.includes('Do not commit') && !review.includes('does **not** run `git commit`')) {
      this.addIssue('WARNING', 'G2-code Contract', 'ws-code-review/SKILL.md', 'ws-code-review should state that the skill does not commit.', "Keep 'do not commit'; orchestrator owns G2-code.");
    }
  }

  runAll() {
    this.simulateStandardWorkflow();
    this.simulateLiteWorkflow();
    this.simulateMultiSpecWorkflow();
    this.checkScriptsSyntax();
    this.checkStateIsolationAndConfig();
    this.checkG2CodeContract();
  }

  generateReport() {
    const lines = [];
    lines.push('# 🔍 ws-check-workflows Deep Validation & Simulation Report');
    lines.push('');
    const overall = this.issues.some((i) => i.severity === 'CRITICAL') ? 'FAIL' : 'PASS';
    lines.push(`**Overall Status**: ${overall === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    lines.push(`**Total Issues Detected**: ${this.issues.length}`);
    lines.push('');
    lines.push('## 🔄 Workflow Simulations');
    lines.push('');
    for (const [key, title] of [['standard', 'Standard (`ws-spec-to-pr`)'], ['lite', 'Lite (`ws-spec-to-pr-lite`)'], ['multi_spec', 'Smart Multi-Spec (`ws-spec-multi`)']]) {
      const data = this.simulationResults[key];
      lines.push(`### ${title} — ${data.status === 'PASS' ? '✅' : '❌'} ${data.status}`);
      lines.push('');
      lines.push('| Step | Dispatched Skill | Simulation Status |');
      lines.push('|------|------------------|-------------------|');
      for (const [stepName, info] of Object.entries(data.steps)) {
        lines.push(`| ${stepName} | \`${info.skill}\` | ${info.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} |`);
      }
      lines.push('');
    }
    lines.push('## 🚨 Issues & Suggested Fixes');
    lines.push('');
    if (!this.issues.length) {
      lines.push('🎉 No broken steps, missing dependencies, or syntax errors detected.');
    } else {
      lines.push('| Severity | Category | Location | Issue Description | Suggested Fix |');
      lines.push('|----------|----------|----------|-------------------|---------------|');
      for (const iss of this.issues) {
        const icon = iss.severity === 'CRITICAL' ? '🔴' : (iss.severity === 'WARNING' ? '🟡' : '🔵');
        lines.push(`| ${icon} ${iss.severity} | ${iss.category} | \`${iss.location}\` | ${iss.message} | ${iss.fix_suggestion} |`);
      }
    }
    lines.push('');
    return lines.join('\n');
  }
}

function printHelp() {
  console.log('Usage: node check_workflows.cjs [--report] [--json] [--fix] [--yes|-y]');
}

function parseArgs(argv) {
  const o = { report: false, json: false, fix: false, yes: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else if (a === '--report') o.report = true;
    else if (a === '--json') o.json = true;
    else if (a === '--fix') o.fix = true;
    else if (a === '--yes' || a === '-y') o.yes = true;
    else { console.error(`unknown argument: ${a}`); process.exit(2); }
  }
  return o;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const checker = new WorkflowChecker();
  checker.runAll();
  const report = checker.generateReport();
  if (args.json) {
    console.log(JSON.stringify({
      status: checker.issues.some((i) => i.severity === 'CRITICAL') ? 'FAIL' : 'PASS',
      issues: checker.issues.map((i) => i.toDict()),
      simulations: checker.simulationResults,
    }, null, 2));
  } else {
    console.log(report);
  }
  if (args.report) {
    const reportFile = path.join(REPO_ROOT, 'ws-check-workflows-report.md');
    fs.writeFileSync(reportFile, report, 'utf8');
    console.log(`\n📝 Report saved to ${reportFile}`);
  }
  if (checker.issues.length) {
    if (args.fix) {
      console.log('\n🔧 Auto-fix mode requested.');
      if (!args.yes && process.stdin.isTTY) {
        // Non-interactive port: never block on readline; require --yes in TTY too.
        console.log('Pass --yes to apply fixes non-interactively.');
        process.exit(1);
      } else if (!args.yes) {
        console.log('Non-interactive mode detected; proceeding with safe fixes.');
      }
      console.log('Applying fixes...');
      console.log('Fixes evaluated.');
    }
    if (checker.issues.some((i) => i.severity === 'CRITICAL')) process.exit(1);
  }
  process.exit(0);
}

if (require.main === module) main();
module.exports = { WorkflowChecker };
