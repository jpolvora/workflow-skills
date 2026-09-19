#!/usr/bin/env node
'use strict';
// Fixture worker: hangs past its timeout. Ignores SIGTERM so the coordinator
// must escalate (SIGKILL / taskkill) to reap it.
process.on('SIGTERM', () => {});
setInterval(() => {}, 1000);
