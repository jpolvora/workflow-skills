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
  const injectionOnly =
    /^\s*(?:ignore previous instructions|system:\s)/im.test(withoutFences.trim()) &&
    !/^###\s+\[/m.test(withoutFences);
  if (injectionOnly) return { ok: false, text: '', skipped: true };
  if (/```[\s\S]*?\b(?:tool_call|invoke)\b[\s\S]*?```/i.test(source)) {
    return { ok: true, text: `${withoutFences.replace(/^\s+|\s+$/g, '')}\n`, skipped: false };
  }
  return { ok: true, text: source, skipped: false };
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
