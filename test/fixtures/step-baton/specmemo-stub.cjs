#!/usr/bin/env node
'use strict';
// Fixture stub for {specMemo.cli}: records argv + stdin payloads to the calls
// log named by SPEC_MEMO_CALLS, then exits 0.
const fs = require('fs');

const callsFile = process.env.SPEC_MEMO_CALLS;
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  stdin += chunk;
});
process.stdin.on('end', () => {
  if (callsFile) {
    fs.mkdirSync(require('path').dirname(callsFile), { recursive: true });
    fs.appendFileSync(callsFile, `${JSON.stringify({ argv: process.argv.slice(2), stdin })}\n`, 'utf8');
  }
  process.exit(0);
});
if (process.stdin.isTTY) {
  if (callsFile) {
    fs.mkdirSync(require('path').dirname(callsFile), { recursive: true });
    fs.appendFileSync(callsFile, `${JSON.stringify({ argv: process.argv.slice(2), stdin: '' })}\n`, 'utf8');
  }
  process.exit(0);
}
