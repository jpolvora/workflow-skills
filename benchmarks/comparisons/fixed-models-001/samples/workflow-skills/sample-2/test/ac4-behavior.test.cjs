'use strict';
const assert = require('assert');
const { formatDuration } = require('../lib/duration.cjs');
assert.throws(() => formatDuration(-1), RangeError);
console.log('ac4-behavior: PASS');
