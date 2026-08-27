#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const PLACEHOLDER = /^(?:tbd|todo|placeholder|\?+|[-–—.]{1,3}|\.{3}|n\/?a)$/i;

function usage() {
  process.stdout.write(
    'Usage: node validate_spec.cjs [--help|-h] [--mode=authoring|compat] [--json] [--modification] [--repo-root <dir>] <spec>\n',
  );
}

function parseArgs(argv) {
  const options = { json: false, modification: false, mode: 'compat' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') options.help = true;
    else if (token === '--json' || token === '--modification') options[token.slice(2)] = true;
    else if (token === '--repo-root') options.repoRoot = argv[++index];
    else if (token === '--mode') options.mode = String(argv[++index] || '').trim();
    else if (token.startsWith('--mode=')) options.mode = token.slice('--mode='.length).trim();
    else if (token.startsWith('-')) throw new Error(`unknown argument: ${token}`);
    else if (!options.spec) options.spec = token;
    else throw new Error(`unknown argument: ${token}`);
  }
  if (options.help) return options;
  if (!options.spec) throw new Error('spec path is required');
  if (!['authoring', 'compat'].includes(options.mode)) {
    throw new Error('--mode must be authoring or compat');
  }
  return options;
}

function frontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return null;
  const values = {};
  for (const line of match[1].split('\n')) {
    const item = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (item) values[item[1]] = item[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return values;
}

function compositeReason(text) {
  if ((text.match(/\*\*[^*]+\*\*/g) || []).length > 1) return 'more than one bolded component';
  if (text.trim().split(/\s+/).length > 60) return 'more than 60 words';
  const joinedImperatives = text.match(/\b(?:and|or)\s+(?:add|assert|build|check|create|emit|enforce|ensure|fail|implement|include|keep|make|persist|publish|record|reject|remove|render|report|require|run|search|store|support|update|validate|verify|write)\b/gi) || [];
  const openingImperative = /^(?:add|assert|build|check|create|emit|enforce|ensure|fail|implement|include|keep|make|persist|publish|record|reject|remove|render|report|require|run|search|store|support|update|validate|verify|write)\b/i.test(text.trim());
  if (openingImperative && joinedImperatives.length > 1) return 'more than one conjunction-joined imperative';
  return '';
}

function headingPresent(text, heading) {
  return new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').test(text);
}

function tableAfterHeading(text, heading) {
  const start = text.search(new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm'));
  if (start < 0) return [];
  const rest = text.slice(start).split('\n').slice(1);
  const rows = [];
  let inTable = false;
  for (const line of rest) {
    if (/^##\s+/.test(line)) break;
    if (!line.trim()) {
      if (inTable) break;
      continue;
    }
    if (!line.includes('|')) {
      if (inTable) break;
      continue;
    }
    inTable = true;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (!cells.length) continue;
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    rows.push(cells);
  }
  return rows;
}

function isPlaceholder(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return true;
  if (/^n\/?a\s+because\b/i.test(trimmed)) return false;
  return PLACEHOLDER.test(trimmed);
}

function sectionBody(text, heading) {
  const start = text.search(new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm'));
  if (start < 0) return '';
  const rest = text.slice(start).split('\n').slice(1);
  const lines = [];
  for (const line of rest) {
    if (/^##\s+/.test(line)) break;
    lines.push(line);
  }
  return lines.join('\n');
}

function subsectionBody(text, heading) {
  const start = text.search(new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm'));
  if (start < 0) return '';
  const rest = text.slice(start).split('\n').slice(1);
  const lines = [];
  for (const line of rest) {
    if (/^#{2,3}\s+/.test(line)) break;
    lines.push(line);
  }
  return lines.join('\n');
}

function sectionIsPlaceholder(body) {
  const lines = String(body || '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return true;
  const content = [];
  for (const line of lines) {
    if (/^#{3,}\s/.test(line)) continue;
    if (line.includes('|')) {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (!cells.length || cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      cells.forEach((cell) => {
        if (cell) content.push(cell);
      });
      continue;
    }
    content.push(line.replace(/^[-*+]\s+/, '').replace(/^\*\*[^*]+\*\*:\s*/, ''));
  }
  if (!content.length) return true;
  return content.every((item) => isPlaceholder(item));
}

function readinessFindings(text) {
  const errors = [];
  const warnings = [];
  const dorHeading = '## Definition of Ready (DoR)';
  const notesHeading = '## Validation & Observation Notes';
  const hasDor = headingPresent(text, dorHeading);
  const hasNotes = headingPresent(text, notesHeading);
  if (!hasDor) {
    const item = { code: 'dor-heading', message: 'Required section is missing: ## Definition of Ready (DoR)' };
    errors.push(item);
    warnings.push(item);
  } else {
    const data = tableAfterHeading(text, dorHeading).slice(1);
    const emptyTable = !data.length || data.every((cells) => cells.every((cell) => isPlaceholder(cell)));
    if (emptyTable || sectionIsPlaceholder(sectionBody(text, dorHeading))) {
      errors.push({
        code: 'dor-empty',
        message: 'Definition of Ready (DoR) must include non-placeholder readiness items.',
      });
    }
  }
  if (!hasNotes) {
    const item = { code: 'notes-heading', message: 'Required section is missing: ## Validation & Observation Notes' };
    errors.push(item);
    warnings.push(item);
  } else if (sectionIsPlaceholder(sectionBody(text, notesHeading))) {
    errors.push({
      code: 'notes-empty',
      message: 'Validation & Observation Notes must include non-placeholder observation or negative-test content.',
    });
  } else {
    const nsFindings = negativeScenarioFindings(text);
    errors.push(...nsFindings);
    warnings.push(...nsFindings);
  }
  return { errors, warnings };
}

function negativeScenarioFindings(text) {
  const errors = [];
  const notesHeading = '## Validation & Observation Notes';
  if (!headingPresent(text, notesHeading)) return errors;
  const notesBody = sectionBody(text, notesHeading);
  const subsection = '### Negative & Failing Test Scenarios';
  if (!headingPresent(notesBody, subsection)) {
    errors.push({
      code: 'negative-subsection',
      message: 'Validation & Observation Notes must include ### Negative & Failing Test Scenarios with at least one non-placeholder bullet.',
    });
    return errors;
  }
  const bullets = subsectionBody(notesBody, subsection)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, ''));
  if (!bullets.length || bullets.every((item) => isPlaceholder(item))) {
    errors.push({
      code: 'negative-empty',
      message: '### Negative & Failing Test Scenarios must list at least one expected red test or error state.',
    });
  }
  return errors;
}

function closureFindings(text) {
  const errors = [];
  const warnings = [];
  const hasOut = headingPresent(text, '## Out of Scope');
  const hasAssumptions = headingPresent(text, '## Assumptions & Open Questions');
  if (!hasOut) {
    const item = { code: 'closure-heading', message: 'Required section is missing: ## Out of Scope' };
    errors.push(item);
    warnings.push(item);
  }
  if (!hasAssumptions) {
    const item = { code: 'closure-heading', message: 'Required section is missing: ## Assumptions & Open Questions' };
    errors.push(item);
    warnings.push(item);
  }
  if (hasOut) {
    const rows = tableAfterHeading(text, '## Out of Scope');
    const data = rows.slice(1);
    if (!data.length) {
      errors.push({ code: 'out-of-scope-empty', message: 'Out of Scope must include at least one data row.' });
    }
  }
  if (hasAssumptions) {
    const rows = tableAfterHeading(text, '## Assumptions & Open Questions');
    const header = rows[0] || [];
    const data = rows.slice(1);
    if (!data.length) {
      errors.push({ code: 'assumptions-empty', message: 'Assumptions & Open Questions must include at least one data row.' });
    }
    const defaultIdx = header.findIndex((cell) => /chosen default/i.test(cell));
    const rationaleIdx = header.findIndex((cell) => /^rationale$/i.test(cell));
    const chosenAt = defaultIdx >= 0 ? defaultIdx : 1;
    const rationaleAt = rationaleIdx >= 0 ? rationaleIdx : 2;
    data.forEach((cells, index) => {
      if (isPlaceholder(cells[chosenAt]) || isPlaceholder(cells[rationaleAt])) {
        errors.push({
          code: 'assumption-placeholder',
          message: `Assumptions row ${index + 1} has an empty or placeholder Chosen default or Rationale.`,
        });
      }
    });
  }
  return { errors, warnings };
}

function validate(text, options) {
  const errors = [];
  const warnings = [];
  const fm = frontmatter(text);
  if (!fm) errors.push({ code: 'frontmatter-missing', message: 'Required YAML frontmatter is missing.' });
  else {
    for (const key of ['id', 'slug', 'title', 'source', 'specDate']) {
      if (!(key in fm) || fm[key] === '') errors.push({ code: 'frontmatter-key', message: `Frontmatter key is required: ${key}` });
    }
    if (!['local', 'github', 'azure-devops'].includes(fm.source)) errors.push({ code: 'source', message: 'source must be local, github, or azure-devops.' });
    if (['github', 'azure-devops'].includes(fm.source) && !/^### Prior Work Sweep\s*$/m.test(text)) {
      errors.push({ code: 'prior-work', message: 'Tracker specifications require ### Prior Work Sweep.' });
    }
  }
  for (const heading of ['## Description', '## Acceptance Criteria']) {
    if (!text.includes(heading)) errors.push({ code: 'section', message: `Required section is missing: ${heading}` });
  }
  const rows = [...text.matchAll(/^- (AC([1-9][0-9]*)):\s*(.+)$/gm)];
  if (!rows.length) errors.push({ code: 'acceptance-criteria', message: 'At least one one-line acceptance criterion is required.' });
  rows.forEach((row, index) => {
    const expected = index + 1;
    if (Number(row[2]) !== expected) errors.push({ code: 'ac-sequence', ac: row[1], message: `Expected AC${expected}, found ${row[1]}.` });
    const reason = compositeReason(row[3]);
    if (reason) errors.push({ code: 'composite-ac', ac: row[1], message: `${row[1]} is composite: ${reason}.` });
  });
  const description = text.match(/## Description\s*\n([\s\S]*?)(?=\n## )/)?.[1] || '';
  const modification = options.modification || /\b(?:modify|modification|bug\s*fix|bugfix|existing\s+(?:feature|workflow|behavior)|refactor|upgrade)\b/i.test(description);
  if (modification && !/^### Design Intent\s*$/m.test(text)) errors.push({ code: 'design-intent', message: 'Modification specifications require ### Design Intent.' });
  const closure = closureFindings(text);
  const readiness = readinessFindings(text);
  if (options.mode === 'authoring') errors.push(...closure.errors, ...readiness.errors);
  else {
    for (const warning of [...closure.warnings, ...readiness.warnings]) warnings.push(warning);
    if (headingPresent(text, '## Out of Scope')) {
      const data = tableAfterHeading(text, '## Out of Scope').slice(1);
      if (!data.length) warnings.push({ code: 'out-of-scope-empty', message: 'Out of Scope has zero data rows.' });
    }
    if (headingPresent(text, '## Assumptions & Open Questions')) {
      const data = tableAfterHeading(text, '## Assumptions & Open Questions').slice(1);
      if (!data.length) warnings.push({ code: 'assumptions-empty', message: 'Assumptions & Open Questions has zero data rows.' });
    }
  }
  return { ok: errors.length === 0, mode: options.mode, errors, warnings, acceptanceCriteria: rows.map((row) => row[1]) };
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    process.exitCode = 0;
  } else {
    const file = path.resolve(options.repoRoot || '.', options.spec);
    const result = validate(fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n'), options);
    if (options.json) process.stdout.write(`${JSON.stringify({ file: options.spec.replace(/\\/g, '/'), ...result }, null, 2)}\n`);
    else {
      for (const warning of result.warnings) process.stderr.write(`WARN: ${warning.message}\n`);
      for (const error of result.errors) process.stderr.write(`${error.ac ? `${error.ac}: ` : ''}${error.message}\n`);
      if (result.ok) process.stdout.write(`PASS: ${options.spec} (${result.acceptanceCriteria.length} ACs)\n`);
    }
    process.exitCode = result.ok ? 0 : 1;
  }
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
