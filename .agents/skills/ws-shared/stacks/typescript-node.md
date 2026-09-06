# TypeScript & Node.js Stack Invariant Rules

Non-negotiable architectural, security, concurrency, and lifecycle invariant rules for TypeScript and Node.js environments.

## Stack Anti-Patterns

### 1. Strict Type Safety (No Unchecked `any`)
- **Rule:** Do not introduce unchecked `any` type annotations, `as any` type assertions, or `@ts-ignore` / `@ts-nocheck` comments without documented justification.
- **Severity:** Critical
- **Rationale:** Weakens compiler guarantees, degrades refactoring safety, and introduces runtime `TypeError: undefined is not a function` bugs.
- **Remediation:** Model precise types, generics, discriminated unions, or use `unknown` with runtime type narrowing (type guards / Zod / `typeof`).

### 2. Async & Concurrency Safety (Zero Floating Promises)
- **Rule:** Never leave Promises floating. Every asynchronous function call returning a Promise must be `await`ed, returned to the caller, explicitly marked with `void` (if intentional fire-and-forget), or chained with `.catch()`.
- **Severity:** Critical
- **Rationale:** Floating promises cause unhandled promise rejections, race conditions, silent errors, and application crashes.
- **Remediation:** Prefix async calls with `await`, `return`, or handle rejection via `.catch(errorHandler)`.

### 3. Boundary Input Validation
- **Rule:** All external inputs across network boundaries, HTTP request bodies/queries, CLI flags, and untrusted file inputs must be validated against a formal schema (e.g. Zod, Joi, class-validator, or custom runtime validator).
- **Severity:** Warning
- **Rationale:** Protects against prototype pollution, unexpected types, malformed payloads, and injection vectors before reaching business logic.
- **Remediation:** Parse payloads using a schema validator before passing to domain functions.

### 4. Injection & Path Traversal Prevention
- **Rule:** Never concatenate untrusted user inputs directly into filesystem paths (`path.join(__dirname, userInput)` without sanitization) or into child process executions (`child_process.exec(cmd + userInput)`).
- **Severity:** Critical
- **Rationale:** Exposes the application to Remote Code Execution (RCE) and directory traversal vulnerabilities.
- **Remediation:** Use `path.resolve` with directory containment verification or `child_process.spawnSync` with argument arrays.

### 5. Resource Leak & Stream Lifecycle Prevention
- **Rule:** All open streams, file descriptors, database connections, and event listeners must be closed or removed inside `finally` blocks or lifecycle termination handlers.
- **Severity:** Warning
- **Rationale:** Unclosed resources exhaust OS file descriptors, cause socket leaks, and impede graceful process shutdown.
- **Remediation:** Use `pipeline` from `stream/promises` or ensure cleanup inside `try { ... } finally { ... }`.

## Review Checklist & Verification Commands

- [ ] Verify zero occurrences of unchecked `any` or unjustified `@ts-ignore` (`npx tsc --noEmit`).
- [ ] Verify all Promise invocations are awaited or handled.
- [ ] Verify schema validation at external boundaries.
- [ ] Verify path containment on filesystem and subprocess invocations.
- [ ] Run invariant scan: `node .agents/skills/ws-shared/scripts/scan_stack_invariants.cjs --stack typescript-node`
- [ ] Run lint & typecheck: `npm run lint && npm run build`
- [ ] Run test suite: `npm test`
