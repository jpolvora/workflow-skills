#!/usr/bin/env node
'use strict';
// Fixture worker: fails fast with a non-zero exit and no finish.
process.stderr.write('worker-nonzero: intentional failure\n');
process.exit(3);
