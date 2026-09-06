#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveConsumerContext, toRepoRelative } = require('./resolve_consumer_root.cjs');

function parseArgs(argv) {
  const options = { files: [], json: false, repoRoot: null, stack: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scan_stack_invariants.cjs [--repo-root <dir>] [--stack <name>] [--files <f1,f2>] [--file <f>] [--json]');
      process.exit(0);
    } else if (arg === '--repo-root') {
      options.repoRoot = argv[++i];
    } else if (arg === '--stack') {
      options.stack = argv[++i];
    } else if (arg === '--files') {
      const list = (argv[++i] || '').split(',').map((f) => f.trim()).filter(Boolean);
      options.files.push(...list);
    } else if (arg === '--file') {
      options.files.push(argv[++i]);
    } else if (arg === '--json') {
      options.json = true;
    }
  }
  return options;
}

function detectStack(repoRoot, config) {
  if (config?.stack?.name) return config.stack.name;
  if (config?.rules?.stackFile && fs.existsSync(path.resolve(repoRoot, config.rules.stackFile))) {
    const text = fs.readFileSync(path.resolve(repoRoot, config.rules.stackFile), 'utf8').toLowerCase();
    if (text.includes('abp') || text.includes('angular')) return 'abp-angular';
    if (text.includes('next') || text.includes('react')) return 'nextjs-react';
    if (text.includes('laravel') || text.includes('php')) return 'php-laravel';
    if (text.includes('typescript') || text.includes('node')) return 'typescript-node';
  }

  // Check filesystem markers
  const hasPkg = fs.existsSync(path.join(repoRoot, 'package.json'));
  let pkg = null;
  if (hasPkg) {
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    } catch {}
  }
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  if (deps['@abp/ng.core'] || deps['@abp/ng.theme.shared']) return 'abp-angular';
  if (deps['next']) return 'nextjs-react';

  try {
    const entries = fs.readdirSync(repoRoot);
    if (entries.some((e) => e.endsWith('.sln') || e.endsWith('.slnx') || e.endsWith('.csproj'))) {
      if (fs.existsSync(path.join(repoRoot, 'angular.json')) || deps['@angular/core']) return 'abp-angular';
    }
    if (entries.includes('artisan') || fs.existsSync(path.join(repoRoot, 'composer.json'))) {
      return 'php-laravel';
    }
  } catch {}

  if (hasPkg || fs.existsSync(path.join(repoRoot, 'tsconfig.json'))) {
    return 'typescript-node';
  }
  return 'neutral';
}

function walkDir(dir, files, maxFiles = 500) {
  if (files.size >= maxFiles) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (files.size >= maxFiles) break;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (['.git', 'node_modules', 'dist', 'bin', 'obj', '.agents'].includes(ent.name)) continue;
        walkDir(full, files, maxFiles);
      } else if (ent.isFile()) {
        files.add(full);
      }
    }
  } catch {}
}

function discoverFiles(repoRoot, providedFiles) {
  if (providedFiles && providedFiles.length > 0) {
    return providedFiles
      .map((f) => path.resolve(repoRoot, f))
      .filter((f) => fs.existsSync(f) && fs.statSync(f).isFile());
  }
  const files = new Set();
  try {
    const status = spawnSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' });
    if (status.status === 0 && status.stdout) {
      for (const line of status.stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('D ')) continue;
        const filePath = trimmed.slice(3).trim().replace(/^"|"$/g, '');
        const abs = path.resolve(repoRoot, filePath);
        if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
          files.add(abs);
        }
      }
    }
  } catch {}
  if (files.size === 0) {
    walkDir(repoRoot, files);
  }
  return [...files];
}

function scanFile(file, stack, repoRoot) {
  const violations = [];
  const relPath = toRepoRelative(repoRoot, file);
  const ext = path.extname(file).toLowerCase();
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  // Skip vendor, test fixture, or build output files
  if (/node_modules|dist|bin[/\\]|obj[/\\]|\.git[/\\]/.test(file)) {
    return violations;
  }

  // C# checks
  if (ext === '.cs') {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      // Rule 1: No sync-over-async (.Result, .Wait(), .GetAwaiter().GetResult())
      if (/\.Result\b|\.Wait\(\)|\.GetAwaiter\(\)\.GetResult\(\)/.test(line)) {
        violations.push({
          rule: 'no-sync-over-async',
          file: relPath,
          line: lineNum,
          severity: 'Critical',
          message: 'Sync-over-async (.Result / .Wait() / .GetAwaiter().GetResult()) causes deadlocks in ASP.NET Core pipelines. Await the Task instead.',
        });
      }
      // Rule 2: Guid.Empty in entity assignments/defaults
      if (/\bGuid\.Empty\b/.test(line) && /(?:Id|Key)\s*=\s*Guid\.Empty/.test(line)) {
        violations.push({
          rule: 'no-guid-empty-identity',
          file: relPath,
          line: lineNum,
          severity: 'Warning',
          message: 'Guid.Empty used as entity identifier. Use IGuidGenerator.Create() to avoid key collision.',
        });
      }
    });

    // Rule 3: Endpoint protection in Controller or AppService
    if (/class\s+\w+(?:Controller|AppService)\b/.test(content)) {
      const hasClassAuth = /\[(?:Authorize|AllowAnonymous)[\s(]/.test(content);
      if (!hasClassAuth) {
        // Inspect public methods
        lines.forEach((line, idx) => {
          const lineNum = idx + 1;
          if (/public\s+(?:async\s+)?(?:Task(?:<[\w\s,<>]+>)?|IActionResult|ActionResult)\s+\w+\s*\(/.test(line)) {
            // Check preceding 4 lines for authorization attribute
            const prev = lines.slice(Math.max(0, idx - 4), idx).join('\n');
            if (!/\[(?:Authorize|AllowAnonymous)[\s(]/.test(prev)) {
              violations.push({
                rule: 'missing-endpoint-authorization',
                file: relPath,
                line: lineNum,
                severity: 'Critical',
                message: `Public endpoint in Controller/AppService lacks explicit [Authorize] or [AllowAnonymous] attribute.`,
              });
            }
          }
        });
      }
    }
  }

  // Angular HTML template checks
  if (ext === '.html' && (stack === 'abp-angular' || relPath.includes('angular') || relPath.includes('src/app'))) {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (/<button\b/.test(line) && /(?:\(click\)|type="submit")/.test(line) && !line.includes('*abpPermission') && !line.includes('[disabled]')) {
        // Warning: mutation button without permission gate in ABP Angular template
        violations.push({
          rule: 'angular-missing-abp-permission',
          file: relPath,
          line: lineNum,
          severity: 'Warning',
          message: 'Interactive button in Angular template is missing *abpPermission structural directive.',
        });
      }
    });
  }

  // TypeScript / JavaScript checks
  if (['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs'].includes(ext)) {
    let insideUseEffect = false;
    let effectStartLine = 0;
    let hasCleanup = false;
    let hasSubscription = false;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // Rule 1: No unchecked any
      if (/:\s*any\b|as\s+any\b/.test(line) && !line.includes('// @suppress-any') && !line.includes('eslint-disable')) {
        violations.push({
          rule: 'no-unchecked-any',
          file: relPath,
          line: lineNum,
          severity: 'Critical',
          message: 'Unchecked any type annotation or cast. Use precise types, unknown with narrowing, or generics.',
        });
      }

      // Rule 2: Floating Promise check
      if (/\bnew\s+Promise\b/.test(line) && !/(?:await|return|const|let|var)\s+/.test(line) && !line.includes('.catch(')) {
        violations.push({
          rule: 'no-floating-promises',
          file: relPath,
          line: lineNum,
          severity: 'Critical',
          message: 'Floating Promise instantiated without await, assignment, or error handler.',
        });
      }

      // Rule 3: RxJS subscription without unsubscription
      if (/\.subscribe\s*\(/.test(line) && (stack === 'abp-angular' || ext === '.ts' || ext === '.tsx')) {
        const prev = lines.slice(Math.max(0, idx - 3), idx + 1).join('\n');
        if (!/takeUntilDestroyed|takeUntil|unsubscribe|\.add\(/.test(prev)) {
          violations.push({
            rule: 'unhandled-observable-subscription',
            file: relPath,
            line: lineNum,
            severity: 'Critical',
            message: 'Observable .subscribe() called without unsubscription guard (takeUntilDestroyed or takeUntil).',
          });
        }
      }

      // Next.js: Check secret leak into client component
      if (stack === 'nextjs-react' || ext === '.tsx' || ext === '.jsx') {
        if (/['"]use client['"]/.test(content)) {
          if (/process\.env\.(?:SECRET|DATABASE|API_KEY|PRIVATE_)/.test(line)) {
            violations.push({
              rule: 'nextjs-client-secret-leak',
              file: relPath,
              line: lineNum,
              severity: 'Critical',
              message: 'Server secret / private env var referenced inside Client Component ("use client").',
            });
          }
        }
      }
    });
  }

  // PHP checks
  if (ext === '.php') {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      // Rule: unescaped Blade
      if (/\{!!\s*\$[a-zA-Z0-9_]+.*!!\}/.test(line)) {
        violations.push({
          rule: 'laravel-unescaped-blade',
          file: relPath,
          line: lineNum,
          severity: 'Warning',
          message: 'Unescaped Blade expression {!! ... !!} detected. Use {{ ... }} to prevent XSS.',
        });
      }
      // Rule: raw SQL without bindings
      if (/DB::raw\s*\(\s*['"][^'"]*\$[a-zA-Z0-9_]+/.test(line)) {
        violations.push({
          rule: 'laravel-raw-sql-injection',
          file: relPath,
          line: lineNum,
          severity: 'Critical',
          message: 'Unescaped variable concatenated in DB::raw. Pass bindings as second parameter.',
        });
      }
    });

    if (/class\s+\w+Controller\b/.test(content)) {
      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        if (/public\s+function\s+(?:store|update|destroy)\s*\(/.test(line)) {
          const methodBody = lines.slice(idx, Math.min(lines.length, idx + 15)).join('\n');
          if (!methodBody.includes('$this->authorize') && !methodBody.includes('Gate::authorize') && !content.includes('middleware(\'can:')) {
            violations.push({
              rule: 'laravel-missing-authorize',
              file: relPath,
              line: lineNum,
              severity: 'Critical',
              message: 'Mutating controller action missing authorization policy check ($this->authorize).',
            });
          }
        }
      });
    }
  }

  return violations;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const repoRoot = context.repoRoot;
  const stack = options.stack || detectStack(repoRoot, context.config);
  const files = discoverFiles(repoRoot, options.files);

  const allViolations = [];
  for (const file of files) {
    const violations = scanFile(file, stack, repoRoot);
    allViolations.push(...violations);
  }

  const criticalCount = allViolations.filter((v) => v.severity === 'Critical').length;
  const warningCount = allViolations.filter((v) => v.severity === 'Warning').length;
  const passed = criticalCount === 0;

  const result = {
    ok: passed,
    passed,
    stack,
    scannedFiles: files.map((f) => toRepoRelative(repoRoot, f)),
    summary: {
      totalViolations: allViolations.length,
      criticalCount,
      warningCount,
    },
    violations: allViolations,
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log(`\n=== Stack Invariant Static Scan [${stack}] ===`);
    console.log(`Scanned ${files.length} file(s). Found ${allViolations.length} issue(s) (${criticalCount} Critical, ${warningCount} Warning).`);
    for (const v of allViolations) {
      const badge = v.severity === 'Critical' ? '❌ [Critical]' : '⚠️ [Warning]';
      console.log(`${badge} ${v.file}:${v.line} (${v.rule}): ${v.message}`);
    }
    if (passed) {
      console.log('✅ Stack invariant scan passed.\n');
    } else {
      console.log('❌ Stack invariant scan failed on critical violations.\n');
    }
  }

  process.exitCode = passed ? 0 : 1;
}

try {
  main();
} catch (err) {
  process.stderr.write(`ERROR: ${err.message}\n`);
  process.exitCode = 1;
}
