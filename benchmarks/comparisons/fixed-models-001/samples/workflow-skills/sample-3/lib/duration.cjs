'use strict';
function formatDuration(sec) {
  if (!Number.isInteger(sec) || sec < 0) throw new RangeError('sec must be a non-negative integer');
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + 'm ' + s + 's';
}
module.exports = { formatDuration };
