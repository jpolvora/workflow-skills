'use strict';
const assert = require('assert');
const { formatDuration } = require('../lib/duration.cjs');
assert.strictEqual(formatDuration(125), '2m 5s');
console.log('ac3-behavior: PASS');
