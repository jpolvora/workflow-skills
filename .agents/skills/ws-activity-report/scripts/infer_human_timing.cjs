#!/usr/bin/env node
'use strict';

// Port of infer_human_timing.py (ws-activity-report):
// Infer billable human work duration, agent running time, idle gaps,
// and human activity breakdown for ws-activity-report.
//
// Human Total includes concurrent supervision during agent runs and must be
// >= Agent Running Total when agent running time is positive.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Idle gap threshold (seconds): gaps longer than 30 minutes of no activity are classified as idle/AFK.
const IDLE_GAP_THRESHOLD = 30 * 60;
// Max continuous human active session window per interaction burst (seconds)
const MAX_HUMAN_BURST = 45 * 60;
void MAX_HUMAN_BURST;

function parseIso(dtStr) {
  if (!dtStr) return null;
  let text = String(dtStr).trim().replace(/^["']|["']$/g, '').replace(/Z$/i, '+00:00');
  // Parity with infer_human_timing.py parse_iso: naive wall times are UTC, not local.
  if (!/[+-]\d{2}:?\d{2}$/.test(text)) {
    const m = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/);
    text = m ? `${m[1]}T${m[2]}Z` : `${text}Z`;
  }
  const dt = new Date(text);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function formatIso(dt) {
  return new Date(dt.getTime()).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function formatDuration(seconds) {
  const totalMin = Math.round(seconds / 60);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

function getFileCtime(p) {
  let st;
  try { st = fs.statSync(p); } catch { return null; }
  const ms = (st.birthtimeMs && st.birthtimeMs > 0) ? st.birthtimeMs : st.ctimeMs;
  return new Date(ms);
}

function getGitCommits(usDir) {
  const commits = [];
  let gitRoot = path.resolve(usDir);
  while (gitRoot !== path.dirname(gitRoot) && !fs.existsSync(path.join(gitRoot, '.git'))) {
    gitRoot = path.dirname(gitRoot);
  }
  if (!fs.existsSync(path.join(gitRoot, '.git'))) return commits;
  const relUsDir = path.relative(gitRoot, path.resolve(usDir)).replace(/\\/g, '/');
  const proc = spawnSync('git', ['log', '--format=%H|%an|%ae|%aI|%cI|%s', '--name-only', '--', relUsDir], { cwd: String(gitRoot), encoding: 'utf8' });
  if (proc.status !== 0) return commits;
  const blocks = (proc.stdout || '').trim().split('\n\n');
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const parts = lines[0].split('|');
    if (parts.length < 6) continue;
    const [sha, authorName, authorEmail, authorDate, commitDate, ...subjectRest] = parts;
    const subject = subjectRest.join('|');
    const files = lines.slice(1);
    const dt = parseIso(authorDate) || parseIso(commitDate);
    if (dt) {
      const low = `${authorName} ${authorEmail}`.toLowerCase();
      const isBot = ['bot', 'agent', 'github-actions', 'copilot'].some((b) => low.includes(b));
      commits.push({ sha, author: authorName, email: authorEmail, date: dt, subject, files, isBot });
    }
  }
  return commits;
}

function scanTranscriptEvents(transcriptPath) {
  const events = [];
  let st;
  try { st = fs.statSync(transcriptPath); } catch { return events; }
  if (!st.isFile()) return events;
  let text;
  try { text = fs.readFileSync(transcriptPath, 'utf8'); } catch { return events; }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      const stype = obj.type || obj.source;
      const timestamp = obj.timestamp || obj.created_at;
      const dt = timestamp ? parseIso(timestamp) : null;
      if (dt) events.push({ type: stype, date: dt, raw: obj });
    } catch { continue; }
  }
  return events;
}

function* walkFiles(dir) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkFiles(p);
    else if (e.isFile()) yield p;
  }
}

function scanStateTimestamps(usDir) {
  const events = [];
  const stateFiles = [];
  try {
    for (const n of fs.readdirSync(usDir)) {
      if (n.endsWith('.state.md')) stateFiles.push(path.join(usDir, n));
    }
    for (const e of fs.readdirSync(usDir, { withFileTypes: true })) {
      if (e.isDirectory() && e.name.endsWith('.archive')) {
        try {
          for (const n of fs.readdirSync(path.join(usDir, e.name))) {
            if (n.endsWith('.state.md')) stateFiles.push(path.join(usDir, e.name, n));
          }
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
  stateFiles.sort();
  for (const sf of stateFiles) {
    let text;
    try { text = fs.readFileSync(sf, 'utf8'); } catch { continue; }
    const re = /^(startedAt|endedAt|updatedAt):\s*["']?([^"'\n#]+)/gim;
    let m;
    while ((m = re.exec(text)) !== null) {
      const dt = parseIso(m[2].trim());
      if (dt) events.push({ key: m[1], date: dt, file: path.basename(sf) });
    }
    const re2 = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/g;
    let m2;
    while ((m2 = re2.exec(text)) !== null) {
      const dt = parseIso(m2[0]);
      if (dt) events.push({ key: 'log_entry', date: dt, file: path.basename(sf) });
    }
  }
  return events;
}

function inferTiming(usDir, bootstrapStartIso, endOverrideIso) {
  const dataSources = [];
  const allEvents = [];
  const stateEvents = scanStateTimestamps(usDir);
  if (stateEvents.length) {
    dataSources.push('workflow_state');
    for (const se of stateEvents) allEvents.push({ source: 'workflow_state', kind: se.key, date: se.date });
  }
  for (const p of [...walkFiles(usDir)].sort()) {
    const base = path.basename(p);
    if (base.startsWith('.')) continue;
    const ctime = getFileCtime(p);
    if (ctime) {
      const low = base.toLowerCase();
      const isSpecPlan = ['spec', 'plan', 'state', 'issue'].some((kw) => low.includes(kw));
      allEvents.push({ source: 'local_files', kind: isSpecPlan ? 'edit_spec_plan' : 'file_modification', date: ctime, file: base });
    }
  }
  try {
    if (fs.statSync(usDir).isDirectory()) dataSources.push('local_files');
  } catch { /* ignore */ }
  const commits = getGitCommits(usDir);
  if (commits.length) {
    dataSources.push('git_log');
    for (const c of commits) {
      let kind = c.isBot ? 'agent_commit' : 'human_commit';
      const isSpecPlan = c.files.some((f) => { const l = f.toLowerCase(); return l.includes('spec') || l.includes('plan'); });
      if (!c.isBot && isSpecPlan) kind = 'human_spec_edit';
      allEvents.push({ source: 'git_log', kind, date: c.date, author: c.author });
    }
  }
  let transcriptHits = 0;
  const tpList = [];
  try {
    for (const n of fs.readdirSync(usDir)) {
      if (n.endsWith('.jsonl')) tpList.push(path.join(usDir, n));
    }
    const rt = path.join(usDir, '.runtime');
    try {
      for (const n of fs.readdirSync(rt)) {
        if (n.endsWith('.jsonl')) tpList.push(path.join(rt, n));
      }
    } catch { /* ignore */ }
  } catch { /* ignore */ }
  for (const tp of tpList) {
    const tEvents = scanTranscriptEvents(tp);
    if (tEvents.length) {
      transcriptHits += 1;
      for (const te of tEvents) {
        const kind = (te.type === 'USER_INPUT' || te.type === 'user') ? 'human_prompt' : 'agent_tool';
        allEvents.push({ source: 'transcripts', kind, date: te.date });
      }
    }
  }
  if (transcriptHits > 0) dataSources.push('transcripts');

  allEvents.sort((a, b) => a.date - b.date);
  let startDt = parseIso(bootstrapStartIso);
  if (!startDt && allEvents.length) startDt = allEvents[0].date;
  else if (!startDt) startDt = new Date();
  let endDt = parseIso(endOverrideIso);
  if (!endDt && allEvents.length) endDt = allEvents[allEvents.length - 1].date;
  else if (!endDt) endDt = startDt;
  if (endDt < startDt) endDt = startDt;
  const wallClockSeconds = (endDt - startDt) / 1000;

  let reviewingDecidingSec = 0;
  let editingSpecsSec = 0;
  let promptingSec = 0;
  let agentRunningSec = 0;
  let idleSec = 0;

  const isAgentKind = (kind) => kind.includes('agent') || kind === 'log_entry' || kind === 'updatedAt';
  const allocate = (delta, precedingKind) => {
    if (isAgentKind(precedingKind)) {
      agentRunningSec += delta;
      reviewingDecidingSec += delta;
    } else if (precedingKind === 'human_spec_edit' || precedingKind === 'edit_spec_plan') {
      editingSpecsSec += delta;
    } else if (precedingKind === 'human_prompt') {
      promptingSec += delta;
    } else {
      reviewingDecidingSec += delta;
    }
  };

  if (!allEvents.length || wallClockSeconds <= 0) {
    agentRunningSec = 0;
    reviewingDecidingSec = 0;
    editingSpecsSec = 0;
    promptingSec = 0;
    idleSec = Math.max(0, wallClockSeconds);
  } else {
    let currentTime = startDt;
    let lastKind = 'reviewing_deciding';
    for (const ev of allEvents) {
      if (ev.date < startDt || ev.date > endDt) continue;
      const delta = (ev.date - currentTime) / 1000;
      if (delta > 0) {
        if (delta >= IDLE_GAP_THRESHOLD) idleSec += delta;
        else allocate(delta, lastKind);
      }
      currentTime = ev.date;
      lastKind = ev.kind || lastKind;
    }
    const tailDelta = (endDt - currentTime) / 1000;
    if (tailDelta > 0) {
      if (tailDelta >= IDLE_GAP_THRESHOLD) idleSec += tailDelta;
      else allocate(tailDelta, lastKind);
    }
  }

  let totalHumanSec = reviewingDecidingSec + editingSpecsSec + promptingSec;
  const allocatedActive = totalHumanSec + idleSec;
  if (allocatedActive < wallClockSeconds) {
    const diff = wallClockSeconds - allocatedActive;
    reviewingDecidingSec += diff;
    totalHumanSec += diff;
  }
  if (agentRunningSec > 0 && totalHumanSec < agentRunningSec) {
    const diff = agentRunningSec - totalHumanSec;
    reviewingDecidingSec += diff;
    totalHumanSec += diff;
  }
  const activities = [
    ['Reviewing & Deciding', reviewingDecidingSec],
    ['Editing Specs & Plans', editingSpecsSec],
    ['Prompting & Iterating', promptingSec],
  ];
  const mainActivity = activities.reduce((a, b) => (b[1] > a[1] ? b : a))[0];

  return {
    ok: true,
    usDir: String(usDir),
    startIso: formatIso(startDt),
    endIso: formatIso(endDt),
    wallClockSeconds: Math.round(wallClockSeconds * 10) / 10,
    wallClockFormatted: formatDuration(wallClockSeconds),
    humanSeconds: Math.round(totalHumanSec * 10) / 10,
    humanFormatted: formatDuration(totalHumanSec),
    humanBreakdown: {
      reviewingDecidingSeconds: Math.round(reviewingDecidingSec * 10) / 10,
      reviewingDecidingFormatted: formatDuration(reviewingDecidingSec),
      editingSpecsPlansSeconds: Math.round(editingSpecsSec * 10) / 10,
      editingSpecsPlansFormatted: formatDuration(editingSpecsSec),
      promptingSeconds: Math.round(promptingSec * 10) / 10,
      promptingFormatted: formatDuration(promptingSec),
    },
    agentRunningSeconds: Math.round(agentRunningSec * 10) / 10,
    agentRunningFormatted: formatDuration(agentRunningSec),
    idleSeconds: Math.round(idleSec * 10) / 10,
    idleFormatted: formatDuration(idleSec),
    mainHumanActivity: mainActivity,
    dataSources: [...new Set(dataSources)].sort(),
  };
}

function main() {
  const argv = process.argv.slice(2);
  let usDirArg = null;
  let startIso = null;
  let endIso = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { console.log('Usage: node infer_human_timing.cjs <us_dir> [--start-iso ISO] [--end-iso ISO] [--json]'); process.exit(0); }
    else if (a === '--start-iso') startIso = argv[++i];
    else if (a.startsWith('--start-iso=')) startIso = a.slice(12);
    else if (a === '--end-iso') endIso = argv[++i];
    else if (a.startsWith('--end-iso=')) endIso = a.slice(10);
    else if (a === '--json') continue;
    else if (a.startsWith('--')) { console.error(`unknown argument: ${a}`); process.exit(2); }
    else if (!usDirArg) usDirArg = a;
    else { console.error(`unexpected argument: ${a}`); process.exit(2); }
  }
  if (!usDirArg) { console.error('argument us_dir is required'); process.exit(2); }
  const usDir = path.resolve(usDirArg);
  let isDir = false;
  try { isDir = fs.statSync(usDir).isDirectory(); } catch { isDir = false; }
  if (!isDir) {
    console.log(JSON.stringify({ ok: false, error: 'not-a-directory', usDir }));
    process.exit(1);
  }
  const result = inferTiming(usDir, startIso, endOverrideIsoFix(endIso));
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 2);
}
function endOverrideIsoFix(v) { return v; }

if (require.main === module) main();
module.exports = { inferTiming };
