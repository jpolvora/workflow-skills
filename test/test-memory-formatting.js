import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const scriptPath = path.join(rootDir, ".agents", "skills", "ws-self-learning", "scripts", "self_learning.cjs");
const pythonTwin = path.join(rootDir, ".agents", "skills", "ws-self-learning", "scripts", "self_learning.py");
const PYTHON = process.env.PYTHON || "python";

const FIXTURE = [
  "### [2026-07-30] Test Actionable Directives",
  "- **Layer**: Tests",
  "- **Module**: SelfLearning",
  "- **Severity**: High",
  "- **PathPattern**: src/Tests/SelfLearning/*, test/test-memory-formatting.js",
  "- **Scenario / Context**: `resolve-thread --dry-run` must not mutate remote threads",
  "- **DO NOT**: Use vague, passive, or overly complex descriptions of traps",
  "- **INSTEAD DO**: State explicit DO NOT and INSTEAD DO actionable instructions",
  "",
].join("\n");

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ws-memory-fmt-"));
}

function writeHub(repoRoot, files = {}) {
  const shared = path.join(repoRoot, ".agents", "skills", "ws-shared");
  const memoryDir = path.join(shared, "memory");
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.writeFileSync(path.join(shared, "config.json"), "{}\n", "utf8");
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(memoryDir, name), body, "utf8");
  }
  return { shared, memoryDir, compiled: path.join(shared, "MEMORY.md") };
}

function runNode(args, cwd = rootDir) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    encoding: "utf-8",
  });
}

function runPython(args, cwd = rootDir) {
  return spawnSync(PYTHON, [pythonTwin, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

console.log("Running memory formatting test...");

const templateContent = fs.readFileSync(
  path.join(rootDir, ".agents", "skills", "ws-shared", "MEMORY.md.template"),
  "utf-8",
);
assert(templateContent.includes("under `{sharedDir}/memory/`"), "MEMORY.md.template missing canonical path token");
assert(templateContent.includes("self_learning.cjs --compile"), "MEMORY.md.template must mention self_learning.cjs --compile");

const isolated = tmpRoot();
try {
  const { compiled } = writeHub(isolated, { "2026-07-30-test-actionable-format.md": FIXTURE });
  const compile = runNode(["--compile", "--repo-root", isolated]);
  assert(compile.status === 0, `isolated --compile exit 0: ${compile.stderr || compile.stdout}`);
  const compiledContent = fs.readFileSync(compiled, "utf-8");

  assert(
    compiledContent.includes("- **PathPattern**: `src/Tests/SelfLearning/*, test/test-memory-formatting.js`"),
    "Compiled MEMORY.md missing PathPattern field",
  );
  assert(compiledContent.includes("---\n\n###"), "Compiled MEMORY.md must separate the header closer from the first ### entry");
  assert(
    compiledContent.includes("- **Scenario / Context**: `resolve-thread --dry-run` must not mutate remote threads"),
    "Compiled MEMORY.md stripped scenario backticks",
  );
  assert(
    compiledContent.includes("- **DO NOT**: Use vague, passive, or overly complex descriptions of traps"),
    "Compiled MEMORY.md missing DO NOT field",
  );
  assert(
    compiledContent.includes("- **INSTEAD DO**: State explicit DO NOT and INSTEAD DO actionable instructions"),
    "Compiled MEMORY.md missing INSTEAD DO field",
  );
  assert(compiledContent.includes("under `{sharedDir}/memory/`"), "Compiled MEMORY.md header missing canonical path token");
  assert(
    !compiledContent.includes("under `shared/memory/`") && !compiledContent.includes("under `ws-shared/memory/`"),
    "Compiled MEMORY.md header contains obsolete memory directory shorthand",
  );
  assert(compiledContent.includes("self_learning.cjs --compile"), "Compiled MEMORY.md header must mention self_learning.cjs --compile");

  const matchOutput = runNode(["--match-paths", "test/test-memory-formatting.js", "--repo-root", isolated]);
  assert(matchOutput.status === 0, `--match-paths exit 0: ${matchOutput.stderr}`);
  assert(
    matchOutput.stdout.includes("Test Actionable Directives")
      && matchOutput.stdout.includes("PathPattern=src/Tests/SelfLearning/*, test/test-memory-formatting.js"),
    `--match-paths failed to match test file; output: ${matchOutput.stdout}`,
  );
} finally {
  fs.rmSync(isolated, { recursive: true, force: true });
}

const failClosed = tmpRoot();
try {
  const stale = "STALE INDEX MUST REMAIN\n";
  const { shared, compiled } = writeHub(failClosed, {
    "2026-08-23-incomplete.md": "### [2026-08-23] Incomplete trap\n- **Layer**: Tests\n",
  });
  fs.writeFileSync(compiled, stale, "utf8");
  const compile = runNode(["--compile", "--repo-root", failClosed]);
  assert(compile.status === 1, `malformed compile must exit 1, got ${compile.status}`);
  assert(
    /incomplete\.md/i.test(compile.stderr) && /missing DO NOT/i.test(compile.stderr),
    `stderr must name the invalid file: ${compile.stderr}`,
  );
  assert(fs.readFileSync(compiled, "utf8") === stale, "fail-closed compile must not rewrite MEMORY.md");
  assert(!compile.stdout.includes("Compiled "), "fail-closed compile must not print a Compiled success line");
  void shared;
} finally {
  fs.rmSync(failClosed, { recursive: true, force: true });
}

const colonAndBom = tmpRoot();
try {
  const body = [
    "\uFEFF### [2026-08-15] colon-inside-bold labels",
    "- **Layer:** harness",
    "- **Trap avoided:** global MEMORY",
    "- **Solution:** consumer hub wins",
    "",
  ].join("\n");
  const { compiled } = writeHub(colonAndBom, { "2026-08-15-hybrid-trap.md": body });
  const compile = runNode(["--compile", "--repo-root", colonAndBom]);
  assert(compile.status === 0, `BOM + colon-inside-bold compile: ${compile.stderr || compile.stdout}`);
  const compiledContent = fs.readFileSync(compiled, "utf-8");
  assert(compiledContent.includes("colon-inside-bold labels"), "BOM heading must compile");
  assert(compiledContent.includes("- **DO NOT**: global MEMORY"), "Trap avoided (colon inside bold) must map to DO NOT");
  assert(compiledContent.includes("- **INSTEAD DO**: consumer hub wins"), "Solution (colon inside bold) must map to INSTEAD DO");
} finally {
  fs.rmSync(colonAndBom, { recursive: true, force: true });
}

const pythonParity = tmpRoot();
try {
  const { compiled } = writeHub(pythonParity, { "2026-07-30-test-actionable-format.md": FIXTURE });
  const viaNode = runNode(["--compile", "--repo-root", pythonParity]);
  assert(viaNode.status === 0, `node compile: ${viaNode.stderr}`);
  const nodeBytes = fs.readFileSync(compiled);
  fs.unlinkSync(compiled);
  const viaPy = runPython(["--compile", "--repo-root", pythonParity]);
  assert(viaPy.status === 0, `python twin compile: ${viaPy.stderr || viaPy.stdout}`);
  assert(viaPy.stdout === viaNode.stdout, `python twin stdout must match Node SoT\nnode: ${viaNode.stdout}\npy: ${viaPy.stdout}`);
  assert(Buffer.compare(nodeBytes, fs.readFileSync(compiled)) === 0, "python twin MEMORY.md must match Node SoT bytes");
} finally {
  fs.rmSync(pythonParity, { recursive: true, force: true });
}

console.log("✅ Memory formatting and path-pattern tests PASSED successfully!");
