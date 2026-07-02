# Design Decisions

A running log of significant engineering decisions, in the style of Architecture Decision Records (ADRs). Newest entries at the bottom.

---

## 1. Electron over a plain web app or Python

**Decision:** Build the piano tutor as an Electron desktop app.

**Reasoning:** An installable, offline-capable desktop app with native OS integration. A single JS/TS codebase covers UI, audio handling, and system integration. Direct microphone access without repeated browser permission prompts on every launch.

**Alternatives considered:**
- *Plain web app* — simpler (no install step, runs in any browser), but skips packaging/distribution as a learning opportunity, and re-prompts for mic permission per browser session.
- *Python desktop app* — good for practicing Python, but a weaker UI ecosystem for building an animated piano keyboard renderer; audio and UI libraries are less unified than the web platform's.

**Trade-offs:** Heavier distribution footprint (~100+MB installer, bundles Chromium + Node) and added packaging complexity, versus a web app that "just runs" with no install.

---

## 2. Microphone-only input scope (MIDI deferred)

**Decision:** Initial scope is microphone-based pitch detection only. MIDI keyboard input is out of scope for now.

**Reasoning:** Narrows Milestone 1's surface area to one input modality. Microphone input works for anyone with an acoustic piano — no MIDI-capable hardware required. Pitch detection (DSP) is itself a substantial, self-contained engineering problem worth mastering before adding a second input path.

**Alternatives considered:**
- *Support MIDI + mic from the start* — more flexible, and matches the original branch-naming hints in `CLAUDE.md`, but doubles the input-handling surface for the first milestone.

**Trade-offs:** Users who only own a MIDI keyboard (no acoustic piano) can't use the app yet. MIDI is technically the "easier" input to support (exact note/velocity data, no ambiguity), so this decision deliberately defers the easier path in favor of the more novel engineering challenge — consistent with this project's learning goals.

---

## 3. Build tooling: electron-vite + TypeScript + React + Vitest + ESLint/Prettier

**Decision:**
- Scaffold via `electron-vite` (through `npm create @quick-start/electron@latest`)
- Language: TypeScript, strict mode
- Renderer UI: React
- Packaging: electron-builder (included by the scaffold, unused until a release milestone)
- Tests: Vitest
- Linting/formatting: ESLint (flat config) + typescript-eslint + Prettier

**Reasoning:** electron-vite is the current standard scaffold for new Electron+TS projects, giving a fast Vite-powered dev loop. React is an industry-standard, transferable UI skill, and the app will eventually need a component-based UI (keyboard display, practice-mode screens, progress views). Vitest shares Vite's transform pipeline, avoiding a second bundler config just for tests. ESLint + Prettier is the standard JS/TS quality baseline.

**Alternatives considered:**
- *electron-forge + webpack* — older toolchain, slower dev iteration.
- *Jest instead of Vitest* — mature and widely used, but requires a separate TS/Babel transform configuration.
- *No UI framework (vanilla JS/TS)* — simpler for a currently near-empty UI, but would likely require a rewrite once UI complexity grows at Milestones 3–4.

**Trade-offs:** React adds a dependency and a learning curve up front, for a UI that is currently just a placeholder screen.
