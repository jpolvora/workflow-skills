# Implementation Plan — Revamped Modern Technical Website for Workflow Skills

**Spec:** `.agents/plans/modern-website-revamp/step-00-modern-website-revamp.spec.md`  
**Slug:** `modern-website-revamp`  
**Status:** In Progress  

## Overview

Revamp the public documentation website (`docs/index.html` and `docs/assets/css/style.css`) to adopt an authoritative, high-density, restrained engineering aesthetic inspired by modern developer infrastructure tools (Linear, Stripe, Vercel). Replace the promotional "TechLeads V4" theme (pulsing neon glows, looping video background, floating marketing badges) with clean 1px borders, purposeful status accents, copyable terminal install recipes, an interactive pipeline visualizer (Standard 10-step vs Lite 6-step), an accessible slide-over documentation drawer, and developer tool configuration snippets, while strictly preserving build script automation (`bin/build-site.js`) and doc-sync CI test invariants (`test/test-doc-sync.js`).

## Proposed Architecture & File Changes

### 1. Unified CSS Design System (`docs/assets/css/style.css`)
- **Variables & Tokens:** Define semantic variables for dark and light themes without neon glow filters (`--border-subtle`, `--border-hover`, `--border-focus`, `--bg-body`, `--bg-card`, `--bg-surface`, `--text-main`, `--text-muted`, `--text-dim`).
- **Restrained Styling:** Replace gradient card borders and glow filters with crisp 1px borders and subtle elevation shadows.
- **Component Styles:** Add layout and responsive rules for the revamped hero, terminal tabs, pipeline visualizer, technical verification matrix, skill catalog grid, slide-over drawer, and configuration snippets.
- **Accessibility & Contrast:** Enforce high contrast ratios (≥ 4.5:1) and clear `:focus-visible` focus rings across both dark and light modes.

### 2. Modern Technical Website Layout (`docs/index.html`)
- **Hero Revamp:** Remove looping background video and poster assets (`assets/workflow-hero.webm`, `workflow-hero.mp4`, `workflow-hero-poster.webp`). Introduce copyable terminal install tabs (`npx`, `global`, `project`), package preset switcher (`workflows`, `full`, `extra`), and verifiable proof metrics.
- **Interactive Pipeline Visualizer:** Add interactive visualizer comparing the 10-step Standard (`ws-spec-to-pr`) and 6-step Lite (`ws-spec-to-pr-lite`) FSM lifecycles, phase gates (G1 auth, G2-code commit, G2-delivery), and artifact handoffs.
- **Technical Verification Showcase:** Retain all required headings for `test/test-doc-sync.js` while presenting clear details on the AC ledger, derived score formula, fail-closed gates, and dual memory routing.
- **Enhanced Skill Catalog & Slide-Over Drawer:** Live client-side search with slash key (`/`) focus shortcut, layer pills, full/lite profile toggles, and an accessible slide-over drawer for reading `SKILL.md` documents.
- **Configuration Presets:** Copyable integration presets for Cursor, OpenCode, Antigravity/Gemini CLI, and Claude Code.
- **Deterministic Insertion Anchors:** Preserve anchors for `bin/build-site.js` (`<!-- efficiency-verifiability:start -->`, `<section id="catalog">`, `<section id="install-packages">`, and footer version stamp).

### 3. Build & Doc Sync Verification (`bin/build-site.js`, `test/test-doc-sync.js`)
- Verify `bin/build-site.js` parses catalog and packages cleanly into the revamped HTML structure.
- Validate that `node bin/build-site.js --check` exits with status 0.
- Validate that `node test/test-doc-sync.js` passes all assertions.

---

## Tasks & Acceptance Criteria Traceability

### Task T01: CSS Design System Overhaul (`docs/assets/css/style.css`)
- **AC Coverage:** AC1, AC11
- **Files:** `docs/assets/css/style.css`
- **Actions:** Define semantic variables for dark and light modes. Remove neon glow filters, pulsing animations, and oversized video rules. Establish crisp 1px borders, subtle surface elevations, and accessible focus outlines.
- **Verification:** V01:theme-tokens, V11:contrast-accessibility

### Task T02: Hero Section Modernization & Video Asset Removal (`docs/index.html`)
- **AC Coverage:** AC2, AC3
- **Files:** `docs/index.html`, `docs/assets/css/style.css`
- **Actions:** Remove `<div class="hero-animation-wrap">` video tag and poster references. Build modern engineering hero with copyable terminal tabs, package preset toggles, and verifiable proof metrics.
- **Verification:** V02:hero-terminal, V03:video-removed

### Task T03: Interactive Pipeline Visualizer Component (`docs/index.html`, `docs/assets/css/style.css`)
- **AC Coverage:** AC4
- **Files:** `docs/index.html`, `docs/assets/css/style.css`
- **Actions:** Implement interactive pipeline visualizer showing 10-step Standard (Steps 0–9) and 6-step Lite (Steps 0–5) transitions, decision gates, and handoff artifacts.
- **Verification:** V04:pipeline-visualizer

### Task T04: Technical Verification Showcase (`docs/index.html`, `docs/assets/css/style.css`)
- **AC Coverage:** AC5, AC10
- **Files:** `docs/index.html`
- **Actions:** Showcase AC ledger mechanics, derived scoring formula, and fail-closed gates while preserving required headings for `test/test-doc-sync.js`.
- **Verification:** V05:verification-showcase, V10:doc-sync-headings

### Task T05: Interactive Skill Catalog & Slide-Over Drawer (`docs/index.html`, `docs/assets/css/style.css`)
- **AC Coverage:** AC6, AC7
- **Files:** `docs/index.html`, `docs/assets/css/style.css`
- **Actions:** Update skill search with slash key (`/`) focus shortcut, layer pills, and profile toggles. Implement accessible slide-over drawer with markdown rendering, escape key listener, and backdrop click dismiss.
- **Verification:** V06:catalog-search, V07:slideover-drawer

### Task T06: Developer Environment Configuration Presets (`docs/index.html`, `docs/assets/css/style.css`)
- **AC Coverage:** AC8
- **Files:** `docs/index.html`, `docs/assets/css/style.css`
- **Actions:** Add copyable configuration tabs for Cursor, OpenCode, Antigravity, and Claude Code.
- **Verification:** V08:config-presets

### Task T07: Automated Site Build & CI Synchronization Verification (`bin/build-site.js`, `test/test-doc-sync.js`)
- **AC Coverage:** AC9, AC10
- **Files:** `bin/build-site.js`, `docs/index.html`
- **Actions:** Run `node bin/build-site.js` and ensure clean injection into the revamped layout. Validate with `node bin/build-site.js --check` and `node test/test-doc-sync.js`.
- **Verification:** V09:build-site-check, V10:doc-sync-headings
