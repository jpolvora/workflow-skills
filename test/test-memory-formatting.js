import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sharedDir = path.join(rootDir, ".agents", "skills", "ws-shared");
const memoryDir = path.join(sharedDir, "memory");

console.log("Running memory formatting test...");

// Create temp memory file with DO NOT / INSTEAD DO fields
const testMemoryPath = path.join(memoryDir, "2026-07-30-test-actionable-format.md");
const testMemoryContent = `### 2026-07-30 Test Actionable Directives
- **Layer**: Tests
- **Module**: SelfLearning
- **Severity**: High
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
  if (!compiledContent.includes("- **Scenario / Context**: When writing anti-regression memory entries")) {
    throw new Error("Compiled MEMORY.md missing Scenario / Context field");
  }
  if (!compiledContent.includes("- **DO NOT**: Use vague, passive, or overly complex descriptions of traps")) {
    throw new Error("Compiled MEMORY.md missing DO NOT field");
  }
  if (!compiledContent.includes("- **INSTEAD DO**: State explicit DO NOT and INSTEAD DO actionable instructions")) {
    throw new Error("Compiled MEMORY.md missing INSTEAD DO field");
  }

  console.log("✅ Memory formatting test PASSED successfully!");
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
