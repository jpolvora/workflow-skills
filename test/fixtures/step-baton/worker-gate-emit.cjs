#!/usr/bin/env node
'use strict';
// Fixture worker: emits gate-shaped output (protocol violation) and no finish.
process.stdout.write('user-gate: pick Next or More options...\nTransition Gate review needed\n');
process.exit(0);
