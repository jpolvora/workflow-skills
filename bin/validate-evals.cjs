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

function loadSchema(repoRoot) {
  const schemaPath = path.join(repoRoot, '.agents', 'skills', 'ws-shared', 'evals.schema.json');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`evals schema missing at ${schemaPath}`);
  }
  return { schema: JSON.parse(fs.readFileSync(schemaPath, 'utf8')), schemaPath };
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function validateNode(value, schema, label) {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;

  if (schema.type) {
    const actual = typeOf(value);
    if (schema.type === 'integer') {
      if (!Number.isInteger(value)) errors.push(`${label}: expected integer`);
    } else if (actual !== schema.type) {
      errors.push(`${label}: expected ${schema.type}`);
    }
  }

  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) {
      errors.push(`${label}: string shorter than minLength ${schema.minLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${label}: does not match pattern ${schema.pattern}`);
    }
  }

  if (schema.type === 'integer' && Number.isInteger(value) && schema.minimum != null && value < schema.minimum) {
    errors.push(`${label}: integer below minimum ${schema.minimum}`);
  }

  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) {
      errors.push(`${label}: array shorter than minItems ${schema.minItems}`);
    }
    if (schema.items) {
      for (const [index, item] of value.entries()) {
        errors.push(...validateNode(item, schema.items, `${label}[${index}]`));
      }
    }
  }

  if (schema.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    const properties = schema.properties || {};
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          errors.push(`${label}: unexpected key ${key}`);
        }
      }
    }
    for (const key of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(`${label}: missing required key ${key}`);
      }
    }
    for (const [key, child] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(...validateNode(value[key], child, `${label}.${key}`));
      }
    }
  }

  return errors;
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
  const { schema, schemaPath } = loadSchema(repoRoot);
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
