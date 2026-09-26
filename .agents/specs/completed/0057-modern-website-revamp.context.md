# Context Companion — Revamped Modern Technical Website for Workflow Skills

Companion to `modern-website-revamp.spec.md`. Captures architectural trade-offs, design decisions, and deferred ideas for the website revamp.

## Feature Boundary

- **In Scope:**
  - Modernize `docs/index.html` and `docs/assets/css/style.css` to adopt an authoritative, high-density engineering look and feel (Linear/Stripe/Vercel style).
  - Replace the "TechLeads V4" hype aesthetic (heavy glowing gradients, pulsating neon borders, looping video banner, promotional hype badges) with clean, restrained technical components.
  - Interactive pipeline visualizer illustrating the 10-step Standard vs 6-step Lite FSM transitions, state lifecycle, and quality gates.
  - Interactive skill catalog improvements (instant search with `/` keyboard shortcut, layer and profile filters, dependency visualization, accessible slide-over/modal skill documentation reader).
  - Preserving all CI build contracts (`node bin/build-site.js --check`, `test/test-doc-sync.js`, package version stamps).

- **Out of Scope:**
  - Migrating the site to React, Next.js, Vite, or other compiled SPA frameworks. The site must remain static zero-dependency HTML/CSS/JS deployable on GitHub Pages.
  - Modifying the underlying workflow skills, orchestrator logic, or harness runtime.
  - Adding server-side analytics, backend endpoints, or user authentication.

## Implementation Decisions

1. **Static Vanilla Architecture vs Framework Migration:**
   - *Decision:* Retain vanilla HTML5, modern CSS custom properties, and modular ES JavaScript.
   - *Rationale:* The repository is an agent skill pack, not a web application product. Introducing npm build steps, JSX compilers, or Tailwind bundlers creates unnecessary friction, maintenance overhead, and build dependencies. Modern CSS custom properties, flexbox, and CSS grid provide complete control over typography, themes, and animations with zero build pipeline.

2. **Visual Palette & Typography Hierarchy:**
   - *Decision:* Transition from purple/cyan/emerald neon glow gradients to a slate/zinc neutral foundation (`#090d16` background, `#0f172a` card surfaces, `#1e293b` borders) with crisp 1px borders and high-contrast text (`#f8fafc`).
   - *Rationale:* Professional engineering tools prioritize readability, clear visual hierarchy, and high information density. Color is used purposefully for status indicators (green for pass/verified, amber for warnings/gates, blue for interactive states) rather than decorative background glow effects.

3. **Hero Video Banner vs Interactive Terminal / Artifact Preview:**
   - *Decision:* Remove the auto-playing looping video (`workflow-hero.mp4` / `workflow-hero.webm`) and replace it with a clean interactive terminal / installation switcher and an architectural state diagram.
   - *Rationale:* Looping video backgrounds increase initial page weight by over 3.5 MB, cause unnecessary GPU battery drain, and contribute to the "marketing slop" perception. An interactive terminal showing actual CLI commands and output provides instant technical credibility.

4. **Integration with `bin/build-site.js`:**
   - *Decision:* Maintain the existing insertion anchors (`<!-- efficiency-verifiability:start -->`, `<section id="catalog">`, `<section id="install-packages">`, footer version stamp) while upgrading the surrounding HTML structure to modern semantic tags.
   - *Rationale:* Ensures zero disruption to automated site generation in CI and release scripts (`npm run build-site`, `npm run build-site:bump`, `npm run build-site --check`).

## Deferred Ideas

- **Interactive Workflow Simulator:** A sandboxed browser demo that allows users to step through a mock `ws-spec-to-pr` execution interactively. Deferred to a future release once the core presentation layout is stabilized.
- **Offline Service Worker / PWA:** Caching skills and documentation for offline reference. Deferred because the CLI and local skill files already provide complete offline availability within developer repositories.
- **Search Index Pre-indexing via Web Workers:** For the current count of ~48 skills, DOM-based filtering is instantaneous (< 5ms). Web Worker indexing is deferred until the skill catalog exceeds hundreds of skills.
