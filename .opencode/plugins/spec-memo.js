// generated-by: spec-memo@0.25.0
import * as fs from 'node:fs';

const SESSION_FILE = '.spec-memo/.active-session-id';

function readSessionId() {
  try {
    const raw = fs.readFileSync(SESSION_FILE, 'utf8').trim();
    if (/^[a-zA-Z0-9_-]+$/.test(raw)) return raw;
  } catch {
    // fall through
  }
  return `hook-${Date.now()}`;
}

function writeSessionId(id) {
  try {
    fs.mkdirSync('.spec-memo', { recursive: true });
    fs.writeFileSync(SESSION_FILE, id, 'utf8');
  } catch {}
}

async function runMemo(args) {
  const { spawn } = await import('node:child_process');
  return new Promise((resolve) => {
    const child = spawn('memo', args, { stdio: 'ignore', shell: false });
    const timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch {}
      resolve(0);
    }, 1500);
    child.on('error', () => { clearTimeout(timer); resolve(0); });
    child.on('close', () => { clearTimeout(timer); resolve(0); });
  });
}

export default {
  name: 'spec-memo',
  async onInit() {
    const sid = `hook-${Date.now()}`;
    writeSessionId(sid);
    await runMemo(['bootstrap']);
    await runMemo(['prompt', 'session_start', '--session-id', sid]);
  },
  async onPrompt() {
    const sid = readSessionId();
    await runMemo(['prompt', 'record', '--session-id', sid, '--body', '[hook-automated turn]']);
  },
  async onExit() {
    const sid = readSessionId();
    await runMemo(['prompt', 'session_end', '--session-id', sid]);
    try { fs.unlinkSync(SESSION_FILE); } catch {}
    await runMemo(['sync']);
  }
};
