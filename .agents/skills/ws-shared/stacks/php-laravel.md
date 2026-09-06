# PHP & Laravel Stack Invariant Rules

Non-negotiable architectural, security, concurrency, and lifecycle invariant rules for PHP and Laravel applications.

## Stack Anti-Patterns

### 1. Authorization & Policy Enforcement
- **Rule:** Every public controller action modifying or displaying domain resources must authorize the action using Laravel Policies or Gates (`$this->authorize(...)` or `can:` route middleware).
- **Severity:** Critical
- **Rationale:** Prevents horizontal and vertical privilege escalation (Insecure Direct Object References - IDOR).
- **Remediation:** Enforce authorization via `$this->authorize('update', $post);` or route middleware.

### 2. Request Validation & Mass Assignment Protection
- **Rule:** All controller actions accepting user inputs must validate them using a dedicated `FormRequest` class or `$request->validate([...])`. All Eloquent models must explicitly define `$fillable` or `$guarded`.
- **Severity:** Critical
- **Rationale:** Protects against mass assignment vulnerabilities where attackers overwrite unauthorized columns (e.g. `is_admin`, `role`).
- **Remediation:** Define explicit `$fillable` arrays on models and type-hint validated `FormRequest` classes in controllers.

### 3. SQL Injection & Parameterized Queries
- **Rule:** Never concatenate raw user input into `DB::raw()`, `whereRaw()`, or SQL statements.
- **Severity:** Critical
- **Rationale:** Introduces SQL Injection vulnerabilities.
- **Remediation:** Use Eloquent query builder or pass parameter bindings as second argument: `whereRaw('status = ?', [$status])`.

### 4. Eager Loading & N+1 Query Elimination
- **Rule:** When accessing Eloquent model relationships inside loops or collection transformations, relationships must be eager-loaded via `with([...])`.
- **Severity:** Warning
- **Rationale:** Causes N+1 database queries, degrading database performance and triggering request timeouts.
- **Remediation:** Use `Model::with('relation')->get()` or call `Model::preventLazyLoading(!app()->isProduction())`.

### 5. Strict Types & Template Escaping
- **Rule:** PHP files must declare strict types (`declare(strict_types=1);`). Blade templates must use escaped tags `{{ $var }}` and avoid `{!! $var !!}` unless strictly required and sanitized.
- **Severity:** Warning
- **Rationale:** Prevents type coercion bugs and Cross-Site Scripting (XSS).
- **Remediation:** Add `declare(strict_types=1);` at file top and use standard Blade interpolation.

## Review Checklist & Verification Commands

- [ ] Verify `$this->authorize()` or `can:` middleware on all controller routes.
- [ ] Verify FormRequest validation on all mutation endpoints.
- [ ] Verify zero unparameterized `DB::raw()` queries.
- [ ] Verify Blade templates avoid unescaped `{!! !!}`.
- [ ] Run invariant scan: `node .agents/skills/ws-shared/scripts/scan_stack_invariants.cjs --stack php-laravel`
- [ ] Run PHPStan / Pint: `./vendor/bin/phpstan analyse`
- [ ] Run Pest / PHPUnit tests: `php artisan test`
