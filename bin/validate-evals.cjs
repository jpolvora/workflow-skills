#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function walk(directory, result = []) {
  if (!fs.existsSync(directory)) return result;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, result);
    else if (entry.name === 'evals.json' && path.basename(path.dirname(file)) === 'evals') result.push(file);
  }
  return result;
}

function validate(value, file) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${file}: root must be an object`];
  const rootKeys = Object.keys(value);
  for (const key of rootKeys) if (!['skill_name', 'evals'].includes(key)) errors.push(`${file}: unexpected root key ${key}`);
  if (!/^ws-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.skill_name || '')) errors.push(`${file}: invalid skill_name`);
  if (!Array.isArray(value.evals) || !value.evals.length) errors.push(`${file}: evals must be non-empty`);
  const ids = new Set();
  for (const [index, item] of (value.evals || []).entries()) {
    const label = `${file}: evals[${index}]`;
    for (const key of Object.keys(item || {})) if (!['id', 'prompt', 'expected_output', 'assertions'].includes(key)) errors.push(`${label}: unexpected key ${key}`);
    if (!Number.isInteger(item?.id) || item.id < 1) errors.push(`${label}: id must be a positive integer`);
    else if (ids.has(item.id)) errors.push(`${label}: duplicate id ${item.id}`);
    else ids.add(item.id);
    for (const key of ['prompt', 'expected_output']) if (typeof item?.[key] !== 'string' || !item[key].trim()) errors.push(`${label}: ${key} must be non-empty`);
    if (!Array.isArray(item?.assertions) || !item.assertions.length || item.assertions.some((entry) => typeof entry !== 'string' || !entry.trim())) {
      errors.push(`${label}: assertions must be non-empty strings`);
    }
  }
  return errors;
}

function main() {
  const repoRoot = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const files = walk(path.join(repoRoot, '.agents', 'skills')).sort();
  const errors = [];
  for (const file of files) {
    try {
      errors.push(...validate(JSON.parse(fs.readFileSync(file, 'utf8')), path.relative(repoRoot, file).replace(/\\/g, '/')));
    } catch (error) {
      errors.push(`${path.relative(repoRoot, file).replace(/\\/g, '/')}: ${error.message}`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  process.stdout.write(`Validated ${files.length} eval files against .agents/skills/ws-shared/evals.schema.json\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
