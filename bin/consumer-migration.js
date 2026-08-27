import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export const {
  pruneRetiredConsumerArtifacts,
  STALE_LIVE_REFERENCE_PATTERNS,
  RETIRED_HUB_FILES,
  RETIRED_SKILL_DIRS,
  listRetiredConfigKeys,
  stripRetiredConfigKeys,
} = require(path.join(__dirname, '..', '.agents', 'skills', 'ws-shared', 'scripts', 'retired_artifacts.cjs'));
