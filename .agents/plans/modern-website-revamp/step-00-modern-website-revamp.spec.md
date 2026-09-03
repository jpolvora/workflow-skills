---
id: null
slug: modern-website-revamp
title: "Revamped Modern Technical Website for Workflow Skills"
source: local
specDate: 2026-09-03
---

# Specification — Revamped Modern Technical Website for Workflow Skills

## Description

The existing public website for Workflow Skills (`docs/index.html` and `docs/assets/css/style.css`) was redesigned around a conference-style "TechLeads V4" theme featuring pulsing neon glows, distracting looping video backgrounds, heavy gradient cards, floating metrics, and promotional marketing badges. This visual presentation resembles generic "AI slop" and crypto/conference landing pages, which contradicts and undermines the project's actual identity as a deterministic, battle-tested, spec-driven engineering harness for senior developers and autonomous coding agents.

This feature revamps the public website to deliver a modern, authoritative, and restrained engineering experience inspired by elite developer tools such as Linear, Stripe, Vercel, and Cloudflare. The revamped site prioritizes high information density, crisp typography, clean 1px borders, purposeful status accents, and interactive architectural visualizers over marketing fluff.

The revamp preserves the automated build pipeline (`bin/build-site.js`) and all synchronization invariants enforced by the test suite (`test/test-doc-sync.js`), ensuring that the dynamic skill catalog, installation packages, and version stamps continue to regenerate seamlessly from single sources of truth.

### Design Intent

The previous redesign in commit `608ff925` (Issue #167) introduced animated background video banners, gradient glow borders, and floating metric badges. While visually energetic, this aesthetic obscures the project's engineering rigor and gives the impression of ungrounded AI hype. The design intent of this revamp is to deliberately strip away all superficial decorative effects (neon glow filters, looping videos, floating badge clutter) and replace them with high-density technical layouts, interactive state machine diagrams, copyable terminal recipes, and accessible data tables.

## Acceptance Criteria

- AC1: Provide a unified CSS design system in docs/assets/css/style.css defining semantic CSS variables for dark and light themes, crisp 1px borders, and status accents without neon glow filters.
- AC2: Replace the hero section in docs/index.html with a restrained engineering hero containing copyable terminal install tabs, package preset toggles, and verifiable proof metrics.
- AC3: Remove the looping background video and poster assets from the primary layout to eliminate visual distraction while reducing initial page payload size.
- AC4: Implement an interactive pipeline visualizer component displaying the 10-step Standard and 6-step Lite FSM transitions, gates, and handoff artifacts.
- AC5: Present a technical verification showcase detailing the AC ledger, derived score thresholds, fail-closed gates, and the anti-regression memory engine.
- AC6: Update the interactive skill catalog with instant client-side search, layer filtering, full versus lite profile toggles, and keyboard shortcut focus via slash key.
- AC7: Render skill documentation in an accessible slide-over drawer component with clean markdown styling, close-on-escape handling, and backdrop dismiss.
- AC8: Provide copyable configuration presets and integration snippets for major coding agent environments including Cursor, OpenCode, and CLI shells.
- AC9: Update bin/build-site.js to inject catalog layers and package presets into the revamped template structure while maintaining deterministic check verification.
- AC10: Retain all required documentation synchronization headings and package version strings validated by test/test-doc-sync.js.
- AC11: Achieve complete keyboard navigability and high contrast compliance across both light and dark themes throughout all site components.

## Notes

### Prior Work Sweep

- Local inspection of `docs/index.html` (2,491 lines) and `docs/assets/css/style.css` (52KB) shows extensive custom styling added during the V4 theme enhancement in commit `608ff925`.
- Historical previews in `docs/preview-v4.html` contain experimental theme variants that can be safely retired once the unified modern design is implemented.
- The build script `bin/build-site.js` parses `CATALOG.md`, `FEATURES.md`, `package.json`, and `bin/skill-dependencies.json`, injecting dynamic HTML into specific section targets in `docs/index.html`.
- Existing automated test `test/test-doc-sync.js` asserts the presence of specific feature headings ("Context budgets and progressive disclosure", "AC ledger and derived scoring", "Atomic Node state runtime", "Telemetry and deterministic reporting", "Gate granularity and adaptive convergence", "Definition of Ready and TDD", "Dual memory routing") and validates that `node bin/build-site.js --check` exits with status 0.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Migration to external frontend frameworks (React, Vue, Next.js) | The documentation site must remain zero-dependency static HTML/CSS/JS served directly via GitHub Pages without complex node build pipelines. |
| Server-side rendering or dynamic backend API | GitHub Pages hosts static files; all interactive search, filtering, and modal viewing must execute strictly client-side. |
| Modifications to core workflow skills or orchestrator code | This specification governs the presentation, architecture diagrams, and documentation UI of the public website only. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Static asset deployment model | Vanilla HTML5, modern CSS custom properties, and native ES modules | Keeps GitHub Pages deployment fast, dependency-free, and accessible without build tool lock-in | y |
| Build-time catalog generation | `bin/build-site.js` continues to inject parsed markdown into template anchors | Preserves Single Source of Truth from `CATALOG.md` and `package.json` while keeping CI verification fast | y |
| Typography font delivery | System font stack with modern fallbacks (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial`) | Eliminates third-party web font request latency and eliminates cumulative layout shifts | y |
| Hero media strategy | Remove video assets from hero and replace with interactive terminal tabs and SVG state machine diagrams | Eliminates over 3.5 MB of video bandwidth and strips away marketing slop in favor of immediate technical utility | y |
| Theme support model | Dark-first design with a clean, fully-tested light theme toggle | Engineering users predominantly prefer dark mode, but accessible light mode is required for inclusive readability | y |
| Implicit-requirement dimensions | N/A because all runtime behavior is client-side static document rendering without server state, auth boundaries, or database lifecycle | Document rendering requires no server-side persistence, rate limiting, or data lifecycle controls | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Visual design tokens established | CSS variables defined for background, surface, border, text, and status colors | Inspect `docs/assets/css/style.css` variables in browser devtools |
| Build script compatibility | `bin/build-site.js` template injection points mapped to revamped HTML structure | Run `node bin/build-site.js` and verify clean DOM updates |
| CI synchronization assertions | All headings required by `test/test-doc-sync.js` preserved in revamped HTML | Run `node test/test-doc-sync.js` and assert exit code 0 |
| Asset cleanup verified | Removal of unused video wrappers from hero without breaking external references | Check `docs/index.html` markup and verify no broken image or script tags |
| Standalone spec validation | Spec passes authoring validation mode without errors or warnings | Run `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Execution of `node bin/build-site.js --check` produces exit code 0 and outputs `Site is current`.
- Execution of `node test/test-doc-sync.js` produces exit code 0 and outputs `test-doc-sync: ok`.
- Execution of `npm run test` exits 0 with all test suites passing.
- Lighthouse / DevTools audit confirms zero console errors, no missing asset 404s, and contrast ratios ≥ 4.5:1.

### Negative & Failing Test Scenarios

- Stale build check fails: executing `node bin/build-site.js --check` on an unbuilt or mismatched `docs/index.html` exits with non-zero code 1 and logs `docs/index.html is stale; run node bin/build-site.js`.
- Missing synchronization headings: deleting any required heading from `docs/index.html` causes `node test/test-doc-sync.js` to fail with an assertion error naming the missing heading.
- Broken search query handling: searching for non-existent terms in the skill search input displays the `#no-results` container and hides all layer groupings.
