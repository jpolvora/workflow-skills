#!/usr/bin/env node
'use strict';

const { runValidateCli } = require('../../ws-shared/runtime/scripts/workflow_state.cjs');

runValidateCli({
  pipeline: 'standard',
  maxStep: 9,
  labels: ['Spec', 'Planning', 'Interview', 'Plan to tasks', 'Implement', 'Verify', 'Code review', 'Testing', 'Ship', 'Fix PR'],
  scriptFile: __filename,
});
