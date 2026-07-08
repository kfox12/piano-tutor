# Design Decisions

A running log of significant engineering decisions, in the style of Architecture Decision Records (ADRs). Newest entries at the bottom.

---

## 1. Electron over a plain web app or Python

**Decision:** Build the piano tutor as an Electron desktop app.

**Reasoning:** An installable, offline-capable desktop app with native OS integration. A single JS/TS codebase covers UI, audio handling, and system integration. Direct microphone access without repeated browser permission prompts on every launch.

**Alternatives considered:**

- _Plain web app_ — simpler (no install step, runs in any browser), but skips packaging/distribution as a learning opportunity, and re-prompts for mic permission per browser session.
- _Python desktop app_ — good for practicing Python, but a weaker UI ecosystem for building an animated piano keyboard renderer; audio and UI libraries are less unified than the web platform's.

**Trade-offs:** Heavier distribution footprint (~100+MB installer, bundles Chromium + Node) and added packaging complexity, versus a web app that "just runs" with no install.

---

## 2. Microphone-only input scope (MIDI deferred)

**Decision:** Initial scope is microphone-based pitch detection only. MIDI keyboard input is out of scope for now.

**Reasoning:** Narrows Milestone 1's surface area to one input modality. Microphone input works for anyone with an acoustic piano — no MIDI-capable hardware required. Pitch detection (DSP) is itself a substantial, self-contained engineering problem worth mastering before adding a second input path.

**Alternatives considered:**

- _Support MIDI + mic from the start_ — more flexible, and matches the original branch-naming hints in `CLAUDE.md`, but doubles the input-handling surface for the first milestone.

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

- _electron-forge + webpack_ — older toolchain, slower dev iteration.
- _Jest instead of Vitest_ — mature and widely used, but requires a separate TS/Babel transform configuration.
- _No UI framework (vanilla JS/TS)_ — simpler for a currently near-empty UI, but would likely require a rewrite once UI complexity grows at Milestones 3–4.

**Trade-offs:** React adds a dependency and a learning curve up front, for a UI that is currently just a placeholder screen.

---

## 4. Button-gated microphone access instead of auto-request on mount

**Decision:** The level meter only requests mic access when the user clicks "Start Listening," never automatically on component mount.

**Reasoning:** Auto-requesting permission on load is a well-known dark pattern in both browsers and desktop apps — users have no context for why a prompt is appearing and tend to reflexively deny it. A button also gives the UI a natural place to show idle/requesting/active/error states and a corresponding "Stop" affordance.

**Alternatives considered:**

- _Auto-request on mount_ — one less click, but worse permission-grant UX and no natural place to show state transitions.

**Trade-offs:** Requires one extra user action before the meter becomes useful.

---

## 5. jsdom + hand-written fakes for Web Audio testing; real hardware verified manually

**Decision:** Switched `vitest.config.ts`'s test environment from `node` to `jsdom`, and hand-wrote minimal fake `AudioContext`/`AnalyserNode`/`MediaStream` classes in the test files rather than using real browser APIs or a heavier mocking library.

**Reasoning:** jsdom doesn't implement `getUserMedia` or the Web Audio API, so there's no way to exercise real audio hardware in a unit test — that boundary is inherent, not a tooling gap to solve. What jsdom **does** unlock is testing the `useMicrophoneStream` hook's state-machine logic (idle → requesting → active/error, cleanup on unmount) deterministically, by substituting fakes for the two or three methods the hook actually calls. Real hardware behavior, the OS permission-prompt UI, and visual smoothness are verified manually instead (`npm run dev`, click "Start Listening," speak near the mic, confirm the meter reacts).

**Alternatives considered:**

- _No automated tests for this hook_ — faster short-term, but leaves the state-machine logic (the actually-testable, bug-prone part) unverified.
- _A heavier browser-automation-based test (e.g. Playwright driving a real Electron window)_ — would cover more but is significantly more infrastructure for what's currently a single hook; worth reconsidering if the audio pipeline grows much more complex (e.g. at Milestone 2's pitch detector).

**Trade-offs:** The test suite proves the hook's logic is correct, not that real hardware/OS permissions behave as expected — that gap is closed by manual verification each time this code changes, and is called out explicitly rather than silently assumed.

---

## 6. `AudioContext` autoplay-suspension gotcha (implementation note, not a decision)

**Observation, not a decision:** During manual verification, the level meter stayed flat despite a granted mic permission. Cause: Chromium's autoplay policy can leave a freshly created `AudioContext` in the `'suspended'` state even after a user gesture (the click on "Start Listening"), because the gesture is no longer considered "active" by the time the `getUserMedia` promise resolves and the `AudioContext` is constructed. A suspended context never processes audio, so the analyser silently reads back silence — no error is thrown. Fix: check `audioContext.state === 'suspended'` and call `await audioContext.resume()` before wiring up the analyser. Worth remembering for Milestone 2, since the pitch detector will read from the same `AnalyserNode`.
