# Session Notes

Reverse-chronological log of work sessions. Append a new entry at the top after each session.

---

## 2026-07-18

**Work completed:**

- Designed Milestone 2 (Pitch Detection): confirmed hand-rolling YIN over using a library (`pitchy` recorded as a named fallback) — see `docs/Design-Decisions.md` entry 7.
- Implemented on `feature/pitch-detection` in 8 commits: `fftSize` bump to 4096, extracted a shared `useAnalyserFrame` polling hook (refactoring `MicLevelMeter` onto it), `rmsFloat`, `detectPitch` (YIN) with synthetic-signal tests including an octave-error regression test, `frequencyToNote`, `usePitchDetector`, lifting `useMicrophoneStream` state into `App.tsx` so `PitchReadout` and `MicLevelMeter` can share one analyser, and a debounce fix (`stabilizePitchReading`) found during manual verification.
- Manual verification against a real piano (low/mid/high registers): note detection works well after the debounce fix. Confirmed as expected, not a bug: simultaneous multi-key presses aren't detected — YIN (like all standard pitch detectors) is inherently monophonic. Documented as a scope boundary (`docs/Design-Decisions.md` entry 11) rather than something to fix.
- All 33 tests passing, lint/build clean throughout.
- Updated `docs/Roadmap.md`, `docs/Architecture.md`, `docs/Design-Decisions.md` (entries 7-11).

**New concepts learned:**

- The YIN algorithm: difference function → cumulative mean normalized difference function (the step that actually resists octave errors) → absolute threshold search → parabolic interpolation for sub-sample accuracy.
- Why pure DSP functions (`detectPitch`, `frequencyToNote`, `rmsFloat`) are dramatically more unit-testable than Milestone 1's hardware-dependent code — synthetic sine waves stand in for a real microphone with no mocking needed, a sharp contrast to `useMicrophoneStream`'s manual-verification-only boundary.
- Debouncing/hysteresis as a general pattern for smoothing noisy real-time signals: require a new value to win N consecutive frames before committing to it, rather than reacting to every single frame.
- The buffer-length vs. latency trade-off in real-time audio processing (longer buffer = more periods of low frequencies captured = more accurate, but more delay before a reading is available).

**Remaining work:**

- Merge `feature/pitch-detection` into `main` (pending final go-ahead).

**Suggested next task:**
Design Milestone 3 (Piano Keyboard Renderer & Visual Feedback) — an on-screen keyboard that highlights the detected note and shows correct/incorrect feedback against a target note.

---

## 2026-07-04

**Work completed:**

- Merged `chore/project-init` into `main` (Milestone 0 complete).
- Designed Milestone 1 (Microphone Input Capture): a `useMicrophoneStream` hook in a new `src/renderer/src/audio/` directory, a button-gated permission flow, and a simple RMS level meter rather than a full waveform — see `docs/Design-Decisions.md` entries 4–6 for the reasoning.
- Implemented on `feature/microphone-input` in 3 commits: jsdom test environment, the capture hook + tests, and the `MicLevelMeter` UI.
- Manual verification surfaced a real bug: the level meter stayed flat despite granted mic permission. Root cause was `AudioContext` starting `'suspended'` (Chromium autoplay policy) and never being resumed, so the analyser silently read back silence. Fixed with `audioContext.resume()` plus a regression test; committed separately.
- Re-verified `npm test` (11 passing), `npm run lint`, `npm run build`, and manually confirmed the level meter reacts to real speech/claps in a running `npm run dev` session.

**New concepts learned:**

- Browser autoplay policy and `AudioContext.state` (`'suspended'` vs `'running'`) — a context can silently fail to process audio without throwing any error, which is why this needed a real device to catch (jsdom-based tests couldn't have caught it, since the fake `AudioContext` doesn't model this behavior).
- The practical boundary of unit testing browser-only APIs: state-machine logic is testable with hand-written fakes; real hardware/OS-permission/autoplay behavior is not, and has to be verified manually.

**Remaining work:**

- Merge `feature/microphone-input` into `main` (pending final go-ahead).

**Suggested next task:**
Design Milestone 2 (Pitch Detection) — converting the `AnalyserNode` data already available from `useMicrophoneStream` into a detected note/frequency.

---

## 2026-07-03

**Work completed:**

- Finished scaffolding the Electron + TypeScript + React skeleton using the official `electron-vite` `react-ts` template (`@quick-start/create-electron`), copied in manually since the interactive scaffolding CLI couldn't run over a non-TTY shell.
- Stripped the template's demo content (logo, IPC "ping" button, unused CSS/assets) down to a minimal "Piano Tutor" placeholder screen.
- Added Vitest with a smoke test and a `test` script.
- Verified `npm run dev` (launches a real window — confirmed visually), `npm run build`, `npm test`, and `npm run lint` all succeed.
- Committed the scaffold to `chore/project-init`.

**New concepts learned:**

- `ELECTRON_RUN_AS_NODE` — an env var (set by the VSCode/extension-host shell in this environment) that forces any Electron binary to run as plain Node.js instead of launching its GUI. Explains a `TypeError: Cannot read properties of undefined (reading 'isPackaged')` crash on the first `npm run dev` attempt; clearing the var for the launch command fixed it.
- `electron-vite`'s three-config build (main/preload/renderer each get their own Vite build pass) and why `--no-sandbox`/env quirks show up specifically around spawning the real Electron binary vs. running its JS entry under plain Node.

**Remaining work:**

- Merge `chore/project-init` into `main`.

**Suggested next task:**
Start `feature/microphone-input` — implement mic permission request, audio stream capture via the Web Audio API, and a live level meter/waveform in the renderer (Roadmap Milestone 1).

---

## 2026-07-02

**Work completed:**

- Reviewed `CLAUDE.md` and confirmed the project is a blank slate (only `CLAUDE.md` + initial commit existed).
- Decided the platform: Electron desktop app, TypeScript, React renderer.
- Decided the initial feature scope: microphone-based pitch detection practice only (no MIDI).
- Created `chore/project-init` branch.
- Wrote initial `docs/Roadmap.md`, `docs/Architecture.md`, `docs/Design-Decisions.md`, `docs/Session-Notes.md`.
- (In progress) Scaffolding the Electron + TypeScript + React skeleton with electron-vite, ESLint/Prettier, and Vitest.

**New concepts learned:**

- Electron's three-process model (main / preload / renderer) and why audio/UI logic must live in the renderer while filesystem access is proxied through preload/main.
- `electron-vite` as the current standard scaffold tool for Electron + TypeScript projects.
- ADR-style decision logging (`Design-Decisions.md`) as a way to record _why_, not just _what_.

**Remaining work:**

- Finish scaffolding: `electron-vite` project structure, ESLint/Prettier config, Vitest with a smoke test.
- Verify `npm run dev`, `npm run build`, `npm test`, `npm run lint` all succeed.
- Merge `chore/project-init` into `main`.

**Suggested next task:**
Start `feature/microphone-input` — implement mic permission request, audio stream capture via the Web Audio API, and a live level meter/waveform in the renderer (Roadmap Milestone 1).
