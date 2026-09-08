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
        if (!line || line.length < 4) continue;
        const x = line[0];
        const y = line[1];
        if (x === 'D' || y === 'D') continue;
        let rawPath = line.slice(3).trim();
        const arrow = rawPath.lastIndexOf(' -> ');
        let filePath = arrow !== -1 ? rawPath.slice(arrow + 4).trim() : rawPath;
        filePath = filePath.replace(/^"|"$/g, '');
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

function cleanCSharpLine(line, state) {
  let code = '';
  let inString = false;
  let isVerbatim = false;
  let escaping = false;

  let i = 0;
  while (i < line.length) {
    if (state.inBlockComment) {
      if (line[i] === '*' && line[i + 1] === '/') {
        state.inBlockComment = false;
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }

    if (inString) {
      if (isVerbatim) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            i += 2;
          } else {
            inString = false;
            i += 1;
          }
        } else {
          i += 1;
        }
      } else {
        if (escaping) {
          escaping = false;
          i += 1;
        } else if (line[i] === '\\') {
          escaping = true;
          i += 1;
        } else if (line[i] === '"') {
          inString = false;
          i += 1;
        } else {
          i += 1;
        }
      }
      continue;
    }

    // Skip character literals 'c' or '\n'
    if (line[i] === "'") {
      if (line[i + 1] === '\\' && line[i + 3] === "'") {
        i += 4;
        continue;
      }
      if (line[i + 2] === "'") {
        i += 3;
        continue;
      }
    }

    // Line comment
    if (line[i] === '/' && line[i + 1] === '/') {
      break;
    }

    // Block comment
    if (line[i] === '/' && line[i + 1] === '*') {
      state.inBlockComment = true;
      i += 2;
      continue;
    }

    // Strings
    if (line[i] === '@' && line[i + 1] === '"') {
      inString = true;
      isVerbatim = true;
      i += 2;
      continue;
    }
    if ((line[i] === '$' && line[i + 1] === '@' && line[i + 2] === '"') ||
        (line[i] === '@' && line[i + 1] === '$' && line[i + 2] === '"')) {
      inString = true;
      isVerbatim = true;
      i += 3;
      continue;
    }
    if (line[i] === '$' && line[i + 1] === '"') {
      inString = true;
      isVerbatim = false;
      i += 2;
      continue;
    }
    if (line[i] === '"') {
      inString = true;
      isVerbatim = false;
      i += 1;
      continue;
    }

    code += line[i];
    i += 1;
  }

  return code;
}

function cleanPhpComments(line, state) {
  let code = '';
  let inString = false;
  let stringChar = '';
  let escaping = false;

  let i = 0;
  while (i < line.length) {
    if (state.inBlockComment) {
      if (line[i] === '*' && line[i + 1] === '/') {
        state.inBlockComment = false;
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }

    if (inString) {
      code += line[i];
      if (escaping) {
        escaping = false;
        i += 1;
      } else if (line[i] === '\\') {
        escaping = true;
        i += 1;
      } else if (line[i] === stringChar) {
        inString = false;
        i += 1;
      } else {
        i += 1;
      }
      continue;
    }

    if ((line[i] === '/' && line[i + 1] === '/') || line[i] === '#') {
      break;
    }

    if (line[i] === '/' && line[i + 1] === '*') {
      state.inBlockComment = true;
      i += 2;
      continue;
    }

    if (line[i] === "'" || line[i] === '"') {
      inString = true;
      stringChar = line[i];
      code += line[i];
      i += 1;
      continue;
    }

    code += line[i];
    i += 1;
  }

  return code;
}

function extractFirstArgument(str) {
  let depth = 0;
  let inQuote = null;
  let escaping = false;
  let arg = '';
  for (let i = 0; i < str.length; i += 1) {
    const ch = str[i];
    if (inQuote) {
      arg += ch;
      if (escaping) {
        escaping = false;
      } else if (ch === '\\') {
        escaping = true;
      } else if (ch === inQuote) {
        inQuote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      inQuote = ch;
      arg += ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      depth += 1;
      arg += ch;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) break;
      depth -= 1;
      arg += ch;
      continue;
    }
    if (ch === ',' && depth === 0) {
      break;
    }
    if (ch === ';' && depth === 0) {
      break;
    }
    arg += ch;
  }
  return arg.trim();
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
    const csState = { inBlockComment: false };
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const code = cleanCSharpLine(line, csState);
      // Rule 1: No sync-over-async (.Result, .Wait(), .GetAwaiter().GetResult())
      if (/\.Result\b|\.Wait\(\)|\.GetAwaiter\(\)\.GetResult\(\)/.test(code)) {
        violations.push({
          rule: 'no-sync-over-async',
          file: relPath,
          line: lineNum,
          severity: 'Critical',
          message: 'Sync-over-async (.Result / .Wait() / .GetAwaiter().GetResult()) causes deadlocks in ASP.NET Core pipelines. Await the Task instead.',
        });
      }
      // Rule 2: Guid.Empty in entity assignments/defaults
      if (/\bGuid\.Empty\b/.test(code) && /(?:Id|Key)\s*=\s*Guid\.Empty/.test(code)) {
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
      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
          return;
        }
        if (/public\s+(?:(?:virtual|override|sealed|static|new|async)\s+)*(?:Task(?:<[\w\s,<>\[\]]+>)?|IActionResult|ActionResult(?:<[\w\s,<>\[\]]+>)?|void|[\w<>\[\]]+)\s+\w+\s*\(/.test(line)) {
          // Find the nearest enclosing class/record declaration preceding line idx
          let classLineIdx = -1;
          let isControllerOrAppService = false;
          for (let c = idx - 1; c >= 0; c -= 1) {
            const classMatch = lines[c].match(/(?:class|record)\s+(\w+)\b/);
            if (classMatch) {
              classLineIdx = c;
              isControllerOrAppService = /(?:Controller|AppService)$/.test(classMatch[1]);
              break;
            }
          }
          if (classLineIdx !== -1 && isControllerOrAppService) {
            // Check method's preceding contiguous attribute lines for authorization
            let hasMethodAuth = false;
            for (let m = idx - 1; m > classLineIdx; m -= 1) {
              const prev = lines[m].trim();
              if (prev.startsWith('[') && prev.endsWith(']')) {
                if (/\[(?:.*,)?\s*(?:Authorize|AllowAnonymous)(?:\(.*?\))?\s*(?:,.*)?\]/.test(prev)) {
                  hasMethodAuth = true;
                }
              } else if (prev === '' || prev.startsWith('//') || prev.startsWith('/*')) {
                continue;
              } else {
                break;
              }
            }

            // Check enclosing class's preceding contiguous attribute lines for authorization
            let hasClassAuth = false;
            for (let a = classLineIdx - 1; a >= 0; a -= 1) {
              const prev = lines[a].trim();
              if (prev.startsWith('[') && prev.endsWith(']')) {
                if (/\[(?:.*,)?\s*(?:Authorize|AllowAnonymous)(?:\(.*?\))?\s*(?:,.*)?\]/.test(prev)) {
                  hasClassAuth = true;
                }
              } else if (prev === '' || prev.startsWith('//') || prev.startsWith('/*')) {
                continue;
              } else {
                break;
              }
            }

            if (!hasMethodAuth && !hasClassAuth) {
              violations.push({
                rule: 'missing-endpoint-authorization',
                file: relPath,
                line: lineNum,
                severity: 'Critical',
                message: `Public endpoint in Controller/AppService lacks explicit [Authorize] or [AllowAnonymous] attribute.`,
              });
            }
          }
        }
      });
    }
  }

  // Angular HTML template checks
  if (ext === '.html' && (stack === 'abp-angular' || relPath.includes('angular') || relPath.includes('src/app'))) {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (/<button\b/.test(line) && /(?:\(click\)|type="submit")/.test(line) && !line.includes('*abpPermission')) {
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

      // Skip comment-only lines
      if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
        return;
      }

      // Rule 1: No unchecked any
      const commentIdx = line.indexOf('//');
      const codePart = commentIdx !== -1 ? line.slice(0, commentIdx) : line;
      const cleanCode = codePart.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, '""');
      if (/:\s*any\b|as\s+any\b/.test(cleanCode) && !line.includes('// @suppress-any') && !line.includes('eslint-disable')) {
        violations.push({
          rule: 'no-unchecked-any',
          file: relPath,
          line: lineNum,
          severity: 'Critical',
          message: 'Unchecked any type annotation or cast. Use precise types, unknown with narrowing, or generics.',
        });
      }

      // Rule 2: Floating Promise check
      // Note: Pure heuristic static scan without compiler type-checking. Full type-informed floating-promise
      // enforcement still requires @typescript-eslint/no-floating-promises in the project linter.
      const isPromiseConstruct = /\bnew\s+Promise\b/.test(line);
      const isAsyncCall = /(?:^|\s+)(?:fetch|[a-zA-Z0-9_]+Async|(?:axios|prisma|db|client|service|repository|queue|sender)(?:\.[a-zA-Z0-9_]+)+)\s*\(/.test(line);
      if ((isPromiseConstruct || isAsyncCall) &&
          !/(?:await|return|const|let|var|void)\s+/.test(line) &&
          !line.includes('.catch(') &&
          !line.trim().startsWith('//') &&
          !line.trim().startsWith('*')) {
        violations.push({
          rule: 'no-floating-promises',
          file: relPath,
          line: lineNum,
          severity: 'Critical',
          message: 'Floating Promise instantiated or called without await, assignment, void, or error handler.',
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
    const phpState = { inBlockComment: false };
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const code = cleanPhpComments(line, phpState);
      if (!code.trim()) return;

      // Rule: unescaped Blade
      if (/\{!!\s*\$[a-zA-Z0-9_]+.*!!\}/.test(code)) {
        violations.push({
          rule: 'laravel-unescaped-blade',
          file: relPath,
          line: lineNum,
          severity: 'Warning',
          message: 'Unescaped Blade expression {!! ... !!} detected. Use {{ ... }} to prevent XSS.',
        });
      }

      // Rule: raw SQL injection
      const rawSqlMethodMatch = code.match(/(?:DB::(?:raw|select|statement|unprepared|selectOne|insert|update|delete)|->(?:whereRaw|orWhereRaw|havingRaw|orHavingRaw|selectRaw|orderByRaw|groupByRaw))\s*\(([\s\S]*)/);
      if (rawSqlMethodMatch) {
        let callRemainder = rawSqlMethodMatch[1];
        if (!callRemainder.trim() && idx + 1 < lines.length) {
          callRemainder = lines.slice(idx + 1, Math.min(lines.length, idx + 6)).map((l) => cleanPhpComments(l, { inBlockComment: false })).join(' ');
        }
        const firstArg = extractFirstArgument(callRemainder);
        const hasConcatenation = /\.\s*\$[a-zA-Z0-9_]+|\$[a-zA-Z0-9_]+(?:->[a-zA-Z0-9_]+)*\s*\./.test(firstArg);
        const hasInterpolation = /"[^"\\]*(?:\\.[^"\\]*)*\$[a-zA-Z0-9_{]/.test(firstArg);
        const isBareVar = /^\$[a-zA-Z0-9_]+/.test(firstArg);
        if (hasConcatenation || hasInterpolation || isBareVar) {
          violations.push({
            rule: 'laravel-raw-sql-injection',
            file: relPath,
            line: lineNum,
            severity: 'Critical',
            message: 'Unescaped variable concatenated or interpolated in raw SQL statement. Pass bindings as second parameter or use parameterized queries.',
          });
        }
      }
    });

    if (/class\s+\w+Controller\b/.test(content)) {
      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*') || line.trim().startsWith('#')) {
          return;
        }
        if (/public\s+function\s+(?:index|show|create|store|edit|update|destroy)\s*\(/.test(line)) {
          let classLineIdx = -1;
          let isController = false;
          for (let c = idx - 1; c >= 0; c -= 1) {
            const classMatch = lines[c].match(/class\s+(\w+)\b/);
            if (classMatch) {
              classLineIdx = c;
              isController = /Controller$/.test(classMatch[1]);
              break;
            }
          }
          if (classLineIdx !== -1 && isController) {
            let methodEnd = lines.length;
            for (let m = idx + 1; m < lines.length; m += 1) {
              if (/(?:public|protected|private)\s+function\s+/.test(lines[m])) {
                methodEnd = m;
                break;
              }
            }
            const methodBody = lines.slice(idx, Math.min(methodEnd, idx + 25)).join('\n');
            const classConstructor = lines.slice(classLineIdx, Math.min(lines.length, classLineIdx + 40)).join('\n');
            const hasAuthorize = methodBody.includes('$this->authorize') ||
              methodBody.includes('Gate::authorize') ||
              classConstructor.includes("middleware('can:") ||
              classConstructor.includes('middleware("can:');

            if (!hasAuthorize) {
              violations.push({
                rule: 'laravel-missing-authorize',
                file: relPath,
                line: lineNum,
                severity: 'Critical',
                message: 'Controller action modifying or displaying resources is missing authorization policy check ($this->authorize or can: middleware).',
              });
            }
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
