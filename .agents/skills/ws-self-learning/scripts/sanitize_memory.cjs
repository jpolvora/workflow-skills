#!/usr/bin/env node
'use strict';

const INJECTION = [
  /ignore previous instructions/i,
  /```[\s\S]*?\b(?:tool_call|invoke)\b[\s\S]*?```/i,
  /^\s*system:\s+/im,
];

function sanitizeMemoryBody(text) {
  const source = String(text || '');
  const withoutFences = source.replace(/```[\s\S]*?\b(?:tool_call|invoke)\b[\s\S]*?```/gi, '');
  const lines = withoutFences.split(/\r?\n/).filter((line) => {
    if (/ignore previous instructions/i.test(line)) return false;
    if (/^\s*system:\s+/i.test(line)) return false;
    return true;
  });
  const cleaned = lines.join('\n').replace(/^\s+|\s+$/g, '');
  const injectionOnly = INJECTION.some((expression) => expression.test(source)) && !cleaned;
  if (injectionOnly) return { ok: false, text: '', skipped: true };
  if (cleaned === source.replace(/\r\n/g, '\n').replace(/^\s+|\s+$/g, '')) {
    return { ok: true, text: source, skipped: false };
  }
  return { ok: true, text: `${cleaned}\n`, skipped: false };
}

module.exports = { sanitizeMemoryBody };

if (require.main === module) {
  const fs = require('fs');
  const file = process.argv[2];
  if (!file) {
    process.stderr.write('Usage: sanitize_memory.cjs <file>\n');
    process.exitCode = 1;
  } else {
    const result = sanitizeMemoryBody(fs.readFileSync(file, 'utf8'));
    if (!result.ok) process.exitCode = 1;
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
}
