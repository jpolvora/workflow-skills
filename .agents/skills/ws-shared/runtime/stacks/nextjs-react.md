# Next.js & React Stack Invariant Rules

Non-negotiable architectural, security, concurrency, and lifecycle invariant rules for Next.js and React applications.

## Stack Anti-Patterns

### 1. Server vs. Client Boundary Isolation
- **Rule:** Explicitly mark client components with `'use client'` at the top of the file. Never import server-only packages (e.g. `fs`, `node:crypto`, database clients) or server environment variables (`process.env.SECRET_*`) into Client Components.
- **Severity:** Critical
- **Rationale:** Leaks confidential credentials, private API keys, and database passwords directly into client browser bundles.
- **Remediation:** Keep secrets within Server Components, Route Handlers, or Server Actions. Mark client components with `'use client'`.

### 2. React Hook Lifecycle & Subscription Cleanup
- **Rule:** Every `useEffect` that attaches DOM event listeners, establishes WebSocket/SSE connections, or starts timers (`setInterval`/`setTimeout`) must return an explicit cleanup function that tears them down.
- **Severity:** Critical
- **Rationale:** Missing cleanup functions cause memory leaks, multiple concurrent handlers, zombie callbacks, and stale closure bugs.
- **Remediation:** Return a cleanup function: `return () => { clearInterval(timer); socket.close(); };`.

### 3. Exhaustive Hook Dependencies
- **Rule:** Every variable, prop, or state referenced inside `useEffect`, `useCallback`, and `useMemo` must be included in the dependency array (or referenced via functional updates / refs).
- **Severity:** Warning
- **Rationale:** Stale closures read outdated props or state, producing unpredictable UI state and race conditions.
- **Remediation:** Follow `react-hooks/exhaustive-deps`.

### 4. Direct State Mutation
- **Rule:** Never directly mutate React component state or props (e.g. `state.items.push(newItem)` or `state.count++`).
- **Severity:** Critical
- **Rationale:** Bypasses React change detection and reconciliation, causing inconsistent render cycles and dropped updates.
- **Remediation:** Use immutable updates (`setState([...state.items, newItem])`) or produce drafts via Immer.

### 5. SSR & Hydration Safety
- **Rule:** Do not reference browser-only globals (`window`, `document`, `localStorage`, `navigator`) during initial render without checking `typeof window !== 'undefined'` or deferring execution to `useEffect`.
- **Severity:** Warning
- **Rationale:** Causes server rendering crashes and React hydration mismatch warnings.
- **Remediation:** Guard browser globals or wrap client-only UI in a client component with deferred mounting.

## Review Checklist & Verification Commands

- [ ] Verify zero server-only packages or secret env vars in client bundles.
- [ ] Verify cleanup returns in all event or timer `useEffect` hooks.
- [ ] Verify zero direct mutations of React state.
- [ ] Verify browser globals are SSR-safe.
- [ ] Run invariant scan: `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack nextjs-react`
- [ ] Run Next.js build: `npm run build`
- [ ] Run tests: `npm test`
