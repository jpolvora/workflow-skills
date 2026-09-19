#!/usr/bin/env node
'use strict';

const path = require('path');
// us-351: managed runtime loads from its installed location: the upstream
// package / global skills tree (<skills>/ws-shared) or the project consumer
// hub (<repo>/.ws). Mirrors resolveConsumerContext runtimeSource precedence.
const HUB_SCRIPTS_DIR = (() => {
  const packaged = path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'scripts');
  try {
    require.resolve(path.join(packaged, 'resolve_consumer_root.cjs'));
    return packaged;
  } catch {
    return path.resolve(__dirname, '..', '..', '..', '..', '.ws', 'runtime', 'scripts');
  }
})();
const { runValidateCli } = require(path.join(HUB_SCRIPTS_DIR, 'workflow_state.cjs'));

runValidateCli({
  pipeline: 'standard',
  maxStep: 9,
  labels: ['Spec', 'Planning', 'Interview', 'Plan to tasks', 'Implement', 'Verify', 'Code review', 'Testing', 'Ship', 'Fix PR'],
  scriptFile: __filename,
});
