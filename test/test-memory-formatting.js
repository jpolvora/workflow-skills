import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sharedDir = path.join(rootDir, ".agents", "skills", "ws-shared");
const memoryDir = path.join(sharedDir, "memory");

console.log("Running memory formatting test...");

// Create temp memory file with DO NOT / INSTEAD DO fields and PathPattern
const testMemoryPath = path.join(memoryDir, "2026-07-30-test-actionable-format.md");
const testMemoryContent = `### 2026-07-30 Test Actionable Directives
- **Layer**: Tests
- **Module**: SelfLearning
- **Severity**: High
- **PathPattern**: src/Tests/SelfLearning/*, test/test-memory-formatting.js
- **Scenario / Context**: When writing anti-regression memory entries
- **DO NOT**: Use vague, passive, or overly complex descriptions of traps
- **INSTEAD DO**: State explicit DO NOT and INSTEAD DO actionable instructions
`;

let createdFile = false;
if (!fs.existsSync(memoryDir)) {
  fs.mkdirSync(memoryDir, { recursive: true });
}

fs.writeFileSync(testMemoryPath, testMemoryContent, "utf-8");
createdFile = true;

const scriptPath = fs.existsSync(path.join(rootDir, ".agents", "skills", "ws-self-learning", "scripts", "self_learning.py"))
  ? path.join(rootDir, ".agents", "skills", "ws-self-learning", "scripts", "self_learning.py")
  : path.join(rootDir, "src", "skills", "ws-self-learning", "scripts", "self_learning.py");

try {
  // Run compiler
  const compileCmd = `python ${scriptPath} --compile`;
  execSync(compileCmd, { cwd: rootDir, encoding: "utf-8" });

  const compiledMemoryPath = path.join(sharedDir, "MEMORY.md");
  const compiledContent = fs.readFileSync(compiledMemoryPath, "utf-8");

  // Assertions
  if (!compiledContent.includes("- **PathPattern**: `src/Tests/SelfLearning/*, test/test-memory-formatting.js`")) {
    throw new Error("Compiled MEMORY.md missing PathPattern field");
  }
  if (!compiledContent.includes("- **Scenario / Context**: When writing anti-regression memory entries")) {
    throw new Error("Compiled MEMORY.md missing Scenario / Context field");
  }
  if (!compiledContent.includes("- **DO NOT**: Use vague, passive, or overly complex descriptions of traps")) {
    throw new Error("Compiled MEMORY.md missing DO NOT field");
  }
  if (!compiledContent.includes("- **INSTEAD DO**: State explicit DO NOT and INSTEAD DO actionable instructions")) {
    throw new Error("Compiled MEMORY.md missing INSTEAD DO field");
  }
  if (!compiledContent.includes("under `{sharedDir}/memory/`")) {
    throw new Error("Compiled MEMORY.md header missing `{sharedDir}/memory/` canonical path token");
  }
  if (compiledContent.includes("under `shared/memory/`") || compiledContent.includes("under `ws-shared/memory/`")) {
    throw new Error("Compiled MEMORY.md header contains obsolete memory directory shorthand");
  }

  // Test --match-paths
  const matchOutput = execSync(`python ${scriptPath} --match-paths test/test-memory-formatting.js`, {
    cwd: rootDir,
    encoding: "utf-8",
  });
  if (!matchOutput.includes("Test Actionable Directives") || !matchOutput.includes("PathPattern=src/Tests/SelfLearning/*, test/test-memory-formatting.js")) {
    throw new Error(`--match-paths failed to match test file; output: ${matchOutput}`);
  }

  const templateContent = fs.readFileSync(path.join(sharedDir, "MEMORY.md.template"), "utf-8");
  if (!templateContent.includes("under `{sharedDir}/memory/`")) {
    throw new Error("MEMORY.md.template missing `{sharedDir}/memory/` canonical path token");
  }

  console.log("✅ Memory formatting and path-pattern tests PASSED successfully!");
} finally {
  // Cleanup test entry & recompile to clean state
  if (createdFile && fs.existsSync(testMemoryPath)) {
    fs.unlinkSync(testMemoryPath);
  }
  try {
    const compileCmd = `python ${scriptPath} --compile`;
    execSync(compileCmd, { cwd: rootDir, encoding: "utf-8" });
  } catch (e) {
    // Ignore cleanup recompile error if no other files remain
  }
}
