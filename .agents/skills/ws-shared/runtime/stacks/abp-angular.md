# ABP Framework & Angular Stack Invariant Rules

Non-negotiable architectural, security, concurrency, and lifecycle invariant rules for ABP (.NET / C#) and Angular projects.

## Stack Anti-Patterns

### C# / ABP Backend Invariants

### 1. Concurrency & Async Safety (Zero Sync-over-Async)
- **Rule:** Never call `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()` on a `Task` or `ValueTask` within asynchronous execution paths.
- **Severity:** Critical
- **Rationale:** Causes thread pool starvation and synchronization context deadlocks in ASP.NET Core / ABP request pipelines.
- **Remediation:** Make the caller method `async Task` or `async Task<T>` and `await` the asynchronous operation with `cancellationToken` propagation.

### 2. Authorization & Endpoint Protection
- **Rule:** Every public Application Service method and Controller action must have an explicit `[Authorize]` attribute (specifying permission policy) or an explicit `[AllowAnonymous]` attribute.
- **Severity:** Critical
- **Rationale:** Prevents unintended exposure of business logic or sensitive operations without permission evaluation.
- **Remediation:** Apply `[Authorize(MyProjectPermissions.GroupName.Action)]` or class-level `[Authorize]` with method overrides.

### 3. Input Validation & DTO Boundary
- **Rule:** Every public endpoint accepting parameters or complex DTOs must enforce input validation via DataAnnotations (e.g. `[Required]`, `[StringLength]`, `[Range]`) or FluentValidation validators. Never accept raw unvalidated parameters.
- **Severity:** Warning
- **Rationale:** Protects against injection, oversized payloads, and invalid domain state mutations before entering domain services.
- **Remediation:** Decorate DTO properties with appropriate validation attributes or implement an `IValidatableObject` / `AbstractValidator<T>`.

### 4. Deterministic Identity & Guid Handling
- **Rule:** Never assign `Guid.Empty` as a valid identifier or entity foreign key default. Use ABP's `IGuidGenerator` for sequential Guid generation.
- **Severity:** Warning
- **Rationale:** Prevents foreign key collision and index fragmentation in relational databases.
- **Remediation:** Inject `IGuidGenerator` and assign `GuidGenerator.Create()`.

### 5. Unit of Work & Transaction Boundaries
- **Rule:** Operations that perform multiple repository writes or state transitions must execute within an ABP Unit of Work (`[UnitOfWork]`).
- **Severity:** Warning
- **Rationale:** Ensures atomic commits and rollback on unhandled exceptions.
- **Remediation:** Decorate orchestrating application service methods with `[UnitOfWork]`.

---

## Angular Frontend Invariants

### 1. Template Permission Gates
- **Rule:** Every interactive action, mutation button, or edit/delete action in Angular templates must be protected by the `*abpPermission` structural directive or checked against `PermissionService`.
- **Severity:** Warning
- **Rationale:** Prevents unauthorized UI interactions and inconsistent state when backend permissions are restricted.
- **Remediation:** Add `*abpPermission="'MyProject.Permissions.Action'"` to interactive elements in templates.

### 2. Observable Lifecycle & Subscription Leak Prevention
- **Rule:** Observables subscribed in Angular components or services must be explicitly terminated or unsubscribed.
- **Severity:** Critical
- **Rationale:** Unsubscribed Observables cause detached DOM trees, memory leaks, and duplicate execution of side-effects on route changes.
- **Remediation:** Use `takeUntilDestroyed()`, `takeUntil(this.destroy$)` in `ngOnDestroy`, or template `async` pipe. Never call `.subscribe()` without an unsubscription mechanism.

### 3. DOM & State Manipulation
- **Rule:** Avoid direct DOM manipulation via `document.getElementById` or native element references. Use Angular templates, reactive forms, or `Renderer2`.
- **Severity:** Suggestion
- **Rationale:** Preserves Angular change detection integrity and SSR compatibility.

## Review Checklist & Verification Commands

- [ ] Verify zero occurrences of `.Result` or `.Wait()` in asynchronous C# code (`dotnet build /warnaserror`).
- [ ] Verify `[Authorize]` decorations on all newly exposed application services or controllers.
- [ ] Verify `*abpPermission` directives on all newly added action buttons in Angular templates.
- [ ] Verify subscription disposal via `takeUntilDestroyed()` or `async` pipe.
- [ ] Run invariant scan: `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack abp-angular`
- [ ] Run backend tests: `dotnet test`
- [ ] Run frontend tests: `npm test`
