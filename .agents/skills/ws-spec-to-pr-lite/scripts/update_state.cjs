#!/usr/bin/env node
'use strict';

const { runUpdateCli } = require('../../ws-shared/runtime/scripts/workflow_state.cjs');

runUpdateCli({
  pipeline: 'lite',
  maxStep: 5,
  labels: ['Spec', 'Planning', 'Implementation', 'Code review', 'Consolidation', 'Ship and PR'],
  scriptFile: __filename,
});
