import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, write } = utils;
const require = createRequire(import.meta.url);
const lib = require(path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/ac_counts.cjs'));

// countsFromLedger: empty ledger.
assert.deepStrictEqual(lib.countsFromLedger({}), { acTotal: 0, acImplemented: 0 });
assert.deepStrictEqual(lib.countsFromLedger(null), { acTotal: 0, acImplemented: 0 });
// countsFromLedger: mixed statuses (only Implemented/ImplementedDifferently count).
const counts = lib.countsFromLedger({
  acceptanceCriteria: [
    { id: 'AC1', status: 'Implemented' },
    { id: 'AC2', status: 'ImplementedDifferently' },
    { id: 'AC3', status: 'Pending' },
    { id: 'AC4', status: 'Failed' },
  ],
});
assert.deepStrictEqual(counts, { acTotal: 4, acImplemented: 2 });

// syncAcCountsFromLedger: non-object target passes through.
assert.strictEqual(lib.syncAcCountsFromLedger(null, '/nope'), null);
// syncAcCountsFromLedger: missing ledger file keeps target untouched.
const root = temp('ws-ac-counts-');
const target = { acTotal: 1, acImplemented: 0 };
assert.deepStrictEqual(lib.syncAcCountsFromLedger(target, root), { acTotal: 1, acImplemented: 0 });
// syncAcCountsFromLedger: valid ledger syncs counts and attaches ledger.
write(path.join(root, 'ac-ledger.json'), JSON.stringify({
  acceptanceCriteria: [
    { id: 'AC1', status: 'Implemented' },
    { id: 'AC2', status: 'Pending' },
  ],
}));
const synced = lib.syncAcCountsFromLedger({ acTotal: 0, acImplemented: 0 }, root);
assert.strictEqual(synced.acTotal, 2);
assert.strictEqual(synced.acImplemented, 1);
assert.ok(synced.acLedger, 'ledger attached');
// syncAcCountsFromLedger: malformed ledger keeps existing counts.
write(path.join(root, 'ac-ledger.json'), '{not-json');
const kept = lib.syncAcCountsFromLedger({ acTotal: 7, acImplemented: 3 }, root);
assert.strictEqual(kept.acTotal, 7);
assert.strictEqual(kept.acImplemented, 3);

console.log('test-ac-counts: ok');
