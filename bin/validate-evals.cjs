#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { loadJsonSchema, validateNode } = require('../.agents/skills/ws-shared/scripts/validate_json_schema.cjs');

function walk(directory, result = []) {
  if (!fs.existsSync(directory)) return result;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, result);
    else if (entry.name === 'evals.json' && path.basename(path.dirname(file)) === 'evals') result.push(file);
  }
  return result;
}

function validateAgainstSchema(value, schema, file) {
  const errors = validateNode(value, schema, file);
  const ids = new Set();
  for (const [index, item] of (value?.evals || []).entries()) {
    if (!Number.isInteger(item?.id)) continue;
    if (ids.has(item.id)) errors.push(`${file}.evals[${index}]: duplicate id ${item.id}`);
    else ids.add(item.id);
  }
  return errors;
}

function main() {
  const repoRoot = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const schemaPath = path.join(repoRoot, '.agents', 'skills', 'ws-shared', 'evals.schema.json');
  const schema = loadJsonSchema(schemaPath, 'evals schema');
  const files = walk(path.join(repoRoot, '.agents', 'skills')).sort();
  const errors = [];
  for (const file of files) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
    try {
      errors.push(...validateAgainstSchema(JSON.parse(fs.readFileSync(file, 'utf8')), schema, rel));
    } catch (error) {
      errors.push(`${rel}: ${error.message}`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  const schemaRel = path.relative(repoRoot, schemaPath).replace(/\\/g, '/');
  process.stdout.write(`Validated ${files.length} eval files against ${schemaRel}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
