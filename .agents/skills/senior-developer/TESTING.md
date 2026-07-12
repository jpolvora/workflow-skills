# Senior Developer — testing

Opt-out only if the user says so in-thread.

| Change | Expectation |
|--------|-------------|
| **Feature** | Test that fails without it, passes with it (integration for HTTP/EF; unit for pure logic) |
| **Bug fix** | **Regression test** (red → fix → green); run `dotnet test` or `cd web && npm test` this session |
| **Refactor** | Existing tests green |
| **Tenant/platform** | Isolation or platform-only cases when relevant |

Process: state success criteria → add tests (`WebApplicationFactory`, `Integration/`) → cite fresh `dotnet test` output (Passed N, Failed 0).

**Bug-fix exceptions (opt-out):** comment/typo/docs-only or cosmetic CSS with no assertable behavior → manual check in code review proof.

**Do not:** ship behavior without tests; ship bug fix without regression test; claim tests pass without running them; **delete tests** unless the related feature/behavior is removed in the same change (fix or update tests instead).

Baseline: BFS unit tests; integration for registration, concurrent 4th child, tenant isolation.
