# Session Notes

Reverse-chronological log of work sessions. Append a new entry at the top after each session.

---

## 2026-08-03

**Work completed:**

- Reviewed `docs/ui_redesign.md` (a design spec the user provided) against the current app — a single flat `App.tsx` with everything always visible, no navigation, no theming — and flagged before implementing that two of the spec's five nav items (Song Library, Test Mode) have no real functionality behind them yet (Song Library needs disk persistence — Milestone 6, not started; Test Mode isn't designed at all). User decided: build both as reachable nav items with a "Coming soon" placeholder rather than omitting them or building real functionality now.
- Confirmed `feature/song-import` (Milestone 5) was already merged upstream (PR #4) but not yet pulled to local `main`; fast-forwarded local `main` and branched `feature/ui-redesign` from it.
- Implemented the redesign, purely a presentation-layer change (no audio/pitch/keyboard/song logic touched):
  - `src/renderer/src/navigation.ts` + `layout/` (`AppShell`, `TopNav`, `ThemeToggle`, `PlaceholderPage`) — state-based view switching (`useState<View>` in `App.tsx`), no router; see Design-Decisions entry 35 for why.
  - `src/renderer/src/theme/` (`ThemeContext`/`ThemeProvider`, `useTheme`, `theme-context.ts`) — light/dark theme resolved once in JS (stored choice → `prefers-color-scheme` fallback), stamped as `data-theme` on `<html>`; CSS tokens keyed off that attribute only, no `prefers-color-scheme` media query in CSS — see Design-Decisions entry 36. Split into three files (context object / provider component / hook) to satisfy the `react-refresh/only-export-components` ESLint rule.
  - `src/renderer/src/pages/` — `HomePage` (3-card dashboard), `PracticeModePage` and `ImportSongPage` (existing mic/practice and MIDI-import/edit logic relocated from `App.tsx` unchanged), `SongLibraryPage`/`TestModePage` (placeholders).
  - Full CSS rewrite (`base.css` tokens, `main.css` components) to the spec's rounded-corners/blue-accent/card-hover-elevation language, keeping the existing plain-CSS-file convention (no Tailwind/CSS-in-JS).
- `npm run typecheck`, `npm run lint`, and `npm test` (100/100) all pass.
- Manually verified the actual running app: built with `npm run build`, drove it with a throwaway Playwright `_electron` script (not committed — no headless-GUI-testing infra exists in this project yet) to screenshot every page in both themes and confirm nav highlighting, theme persistence across navigation, and the practice keyboard all render correctly. Hit the `ELECTRON_RUN_AS_NODE` env var issue again (already documented from the very first session) — had to unset it for the launch to work.
- Follow-up fix, reported after the first pass: the mic wasn't listening after a MIDI import, since the redesign had moved mic capture into `PracticeModePage` only and `ImportSongPage` hard-coded `currentReading={null}`. Wired `useMicrophoneStream`/`usePitchDetector` into `ImportSongPage` and auto-start the mic the moment an import succeeds, so the keyboard shows live correct/incorrect feedback against the previewed note right away. Made `useMicrophoneStream.start()` idempotent (ref-tracked, no-ops while already active/requesting) so the auto-start call — and any future caller — never has to check current status first; caught and fixed a real bug before it shipped, where naively depending on the mic's own status in the auto-start effect would have made the "Stop" button re-trigger `start()` immediately. Added a regression test for the idempotency guard. See [Design-Decisions.md](Design-Decisions.md) entry 38.
- Second follow-up: the user expected the previewed song to *auto-advance* as correct notes are played, not just show correct/incorrect color while requiring manual Prev/Next. Flagged before implementing that this was never actually built (not even pre-redesign) and is explicitly the still-undesigned "song-based practice session" piece of Milestone 6 — plus a real design snag, since pitch detection is monophonic and can't confirm a full chord sounding at once. Got two explicit decisions from the user before writing code: chords advance on any one matching note (not requiring the full chord), and build a scoped version now rather than opening a full Milestone 6 design session. Implemented `useSongAutoAdvance` — a small, independently unit-tested hook using edge-detection (a ref that only resets when the reading goes quiet or stops matching) so a held or repeated note fires the advance once per strike, not once per animation frame, and so a song's legitimate back-to-back-identical-note sequences work correctly (unlike Practice Mode's random targets, a song can't lean on "never repeat the previous target" to sidestep this). Wired into `ImportSongPage` alongside the existing Prev/Next controls. See [Design-Decisions.md](Design-Decisions.md) entry 39.
- Updated `docs/Roadmap.md`, `docs/Architecture.md`, `docs/Design-Decisions.md` (entries 35-39). 107/107 tests passing throughout; typecheck/lint clean; both follow-ups re-verified with the same headless Playwright render check (no console errors) used for the first pass.

**New concepts learned:**

- The `react-refresh/only-export-components` ESLint rule: a file can only export React components if it wants Fast Refresh (hot-reload-without-losing-state) to work correctly for it — mixing a component export with a non-component export (like a hook) in the same file breaks that, hence splitting `ThemeContext.tsx`/`theme-context.ts`/`useTheme.ts` into three single-purpose files.
- Resolving a CSS custom-property theme once in JS (vs. duplicating token values across a `prefers-color-scheme` media query and an explicit override block) as a way to keep a single source of truth instead of two definitions that can drift.
- Playwright's `_electron` module as a way to drive and screenshot an Electron app from a script — useful for self-verifying UI work in an environment with no visible display, without adding a testing dependency to the project itself (installed in an isolated scratch directory, not `package.json`).
- A `useEffect` dependency array is a *re-run trigger list*, not just a "what does this effect use" list — depending on a whole object (`songImportState`) instead of the one field that actually signals a state-machine transition (`songImportState.status`) causes the effect to re-fire on unrelated updates; and depending on a value the effect's own action changes (mic status, changed by calling `start()`/`stop()`) can create an unwanted re-trigger loop. Fixed by depending on the narrower, transition-signaling value and pushing the "don't repeat this if already done" guard into the callee (`start()` itself) instead.
- Edge-detection (only reacting to a value's *transition* into a matching state, not every render where it happens to match) as a recurring pattern for handling a real-time signal that re-fires every animation frame — first seen conceptually in the "no naive miss-counting" reasoning from Milestone 4, now actually implemented for the song auto-advance, and framed explicitly this time as a shortcut (`pickRandomTarget`'s no-repeat guarantee) that worked for one case but doesn't generalize to a fixed, possibly-repeating sequence like a song.

**Remaining work:**

- Merge `feature/ui-redesign` into `main` (pending final go-ahead).
- Song Library and Test Mode remain placeholders until Milestone 6 (song-based practice + persistence) is designed and built.
- Both mic-related fixes (auto-start on import, auto-advance on correct note) are verified by code review, unit tests, and a headless render check (no console errors) — neither has been manually verified against a real microphone + real MIDI file + the native OS file-picker dialog, none of which can be driven from this headless environment. Worth a real-piano check next session, consistent with how every other mic-dependent feature in this project has been verified.
- Milestone 6 proper (scoring/completion state for the song practice sequence, a decision on whether it stays on the Import Song preview or moves to a dedicated `PracticeModePage`/`TestModePage` flow, and disk persistence) is still undesigned.

**Suggested next task:**
Design Milestone 6: song-based practice sessions and/or persisting imported songs to disk — the same two pieces called out as the current milestone before this redesign session, now also what `SongLibraryPage`/`TestModePage` need to become real.

---

## 2026-07-30

**Work completed:**

- Merged `feature/practice-mode` (via GitHub PR) into `main` — Milestone 4 officially done.
- Redirected the roadmap: the originally-planned Milestone 5 ("Progress Tracking" — streaks/accuracy) was dropped outright, since that's not what's actually wanted. The real goal, surfaced through a couple of clarifying rounds, is practicing specific songs — starting with importing one.
- Designed and implemented Milestone 5 (Song Import) via full plan-mode: explored the codebase, confirmed MIDI file import (not MusicXML or PDF/OMR) as the v1 format, and scoped the milestone to import + parse + edit only (no disk persistence, no song-based practice session yet — those are explicit follow-on slices).
- Implemented on `feature/song-import` in 7 commits:
  1. Extracted a shared `midiToNote`/`noteToMidi` helper (`song/noteMath.ts`), removing duplicated MIDI-number math that had been inlined in both `frequencyToNote.ts` and `generateKeyboardLayout.ts`.
  2. Added the `Song`/`SongEvent`/`SongNote` model and a **hand-rolled Standard MIDI File parser** (`parseMidiFile.ts`) — chunk/event/running-status parsing, chord grouping by onset-time proximity (50ms threshold), multi-track flattening (percussion channel excluded), single-tempo assumption. Tested against hand-built byte-array fixtures (no binary `.mid` files in the repo).
  3. Added the app's first real IPC channel (`dialog:selectMidiFile`) — main opens the native file picker and reads raw bytes; parsing itself stays in the renderer as a pure function, keeping it unit-testable and consistent with where the rest of the app's domain logic lives.
  4. Added `useSongImport` + a basic import button in `App.tsx`, proving the pipeline end-to-end before building the editor.
  5. Added `SongEditor` (add/delete/modify notes and chords).
  6. Generalized `KeyboardDisplay`'s target highlighting from a single note to a list (`targetNotes: TargetNote[]`) so a chord can highlight all at once; added a Prev/Next-navigable preview cursor (`useSongImport`'s `previewIndex`/`stepPreview`) so the currently-previewed note/chord highlights on the keyboard the same way a practice target does; hid `SongEditor`'s correction list behind an "Edit Notes" toggle, off by default.
  7. Fixed a CSS overflow bug found during manual testing — the note list, unbounded, pushed past the window's bottom edge (global `overflow: hidden`); bounded it to a fixed height with its own scrollbar.
- Manual verification against the running app surfaced two real usability issues beyond what the design anticipated: the correction editor was confusing with no explanation and no way to hide it, and there was no way to see an imported note/chord on the actual keyboard. Both were fixed in the same session (items 6-7 above) rather than deferred, since they came directly from hands-on testing of this milestone's own feature.
- 100/100 tests passing, lint/build clean throughout.
- Updated `docs/Roadmap.md`, `docs/Architecture.md`, `docs/Design-Decisions.md` (entries 26-34).

**New concepts learned:**

- The Standard MIDI File format: `MThd`/`MTrk` chunks, variable-length quantities for delta-times, running status (a status byte can be omitted and reused from the previous event), and how General MIDI reserves channel 10 for percussion.
- Chord detection via onset-time proximity is a real, standard technique (not something invented for this project) — anchoring each comparison to a group's *first* note (not the previous note) avoids drift on fast passages.
- Structural typing let `SongNote` (which carries an extra `midi` field) be used anywhere a `TargetNote` (`{ name, octave }`) is expected, with no adapter code — TypeScript only enforces "at least these properties," not "exactly these properties," for non-literal assignments.
- Electron's IPC boundary in practice: a channel's job can be as small as "open a dialog, read bytes" — the temptation to also parse the file in main (since it's already reading it) would have broken the project's "domain logic lives in the renderer, testable without Electron" convention for no real benefit.

**Remaining work:**

- Merge `feature/song-import` into `main` (pending final go-ahead).
- Design and build song-based practice (stepping through an imported song's events during an actual practice session, not just previewing them) and disk persistence for imported songs — both explicitly deferred out of this milestone.

**Suggested next task:**
Design the next milestone: song-based practice sessions and/or persisting imported songs to disk. Worth discussing with the user which of the two matters more to tackle first, since they're independent pieces (a song-practice mode doesn't strictly need persistence, and persistence doesn't strictly need a practice mode).

---

## 2026-07-29

**Work completed:**

- Merged `feature/piano-renderer` (via GitHub PR) into `main` — Milestone 3 officially done.
- Designed Milestone 4 (Practice Mode / Lesson Logic). Confirmed scope upfront via three questions: random-note exercises (not curated scales) for v1, auto-advance progression, and strictly in-memory scoring (no persistence — that's Milestone 5). Mid-design, redirected the plan away from an initially-proposed ~1s "correct pause" toward immediate advance-on-correct, relying on the keyboard's existing green highlight as the only feedback — this also simplified the implementation (no timer, no third reducer state).
- Implemented on `feature/practice-mode` in 7 commits, using a new **functional core / imperative shell** pattern for this codebase: `practiceSessionReducer.ts` is a pure reducer (`idle`/`awaiting-note`, `start`/`stop`/`correct` actions), `usePracticeSession.ts` is the thin effectful hook wiring it to the live `PitchReading`. Also added `pickRandomTarget` (no-repeat, range-based) and the `PracticeSession` UI component.
- Worked through a real scoring-design question with the user: why not track missed notes too? Answer, discovered concretely rather than asserted: `usePitchDetector` re-emits a new reading every animation frame even for a held note, so naive miss-counting would count one held wrong note as dozens of misses/second. Confirmed with the user that accuracy scoring isn't the goal anyway (just showing which note to play next), so `correctCount` alone is sufficient — documented as its own Design-Decisions entry since the reasoning is more interesting than "kept it simple."
- Manual verification against a real piano: immediate advance-on-correct works with no stall, manual click-to-target is correctly disabled during an active session (and re-enabled after Stop), and "Last session: N correct" appears after stopping.
- All 66 tests passing, lint/build clean throughout.
- Updated `docs/Roadmap.md`, `docs/Architecture.md`, `docs/Design-Decisions.md` (entries 18-25).

**New concepts learned:**

- Functional core / imperative shell as a design pattern: keep the decision-making logic (a reducer) pure and fully unit-testable, push randomness/timers/side-effects out to a thin wrapper. Contrasted directly with this project's earlier hooks (`useMicrophoneStream`), which mix state and effects together.
- Why a value that changes reference every render/frame (like `usePitchDetector`'s reading) needs care when used as a naive "count occurrences" signal — the framerate becomes an invisible multiplier on anything counted per-dispatch without de-duplication.
- Filter-then-pick vs. reject-and-resample for "random choice excluding one value": filtering is bounded-cost and simpler to reason about for a small candidate set, versus an unbounded (if unlikely) retry loop.

**Remaining work:**

- Merge `feature/practice-mode` into `main` (pending final go-ahead).

**Suggested next task:**
Design Milestone 5 (Progress Tracking) — persisting practice history locally via preload/IPC and displaying progress over time.

---

## 2026-07-27

**Work completed:**

- Merged `feature/pitch-detection` (via GitHub PR) into `main` — Milestone 2 officially done.
- Designed Milestone 3 (Piano Keyboard Renderer & Visual Feedback). Resolved a scope gap the Roadmap text didn't answer on its own — "correct/incorrect feedback against a target note" needs a target note to come from somewhere, but Practice Mode (which would normally own that) isn't built yet — by adding a manual click-to-select target picker as an explicit, temporary stand-in.
- Implemented on `feature/piano-renderer` in 11 commits: exported `NOTE_NAMES`, `generateKeyboardLayout` (pure, tested — 88 keys, correct black-key positioning), `deriveKeyboardStates` (pure, tested — idle/target/playing/correct/incorrect state machine), lifted `usePitchDetector` into `App.tsx` (avoiding duplicate YIN computation across `PitchReadout` and the new keyboard), the SVG `KeyboardDisplay`/`PianoKey` components, click-to-target interaction, CSS styling, and a click-handling test.
- Manual verification against a real piano surfaced and fixed two real bugs:
  1. A duplicate-DOM test failure from missing `afterEach(cleanup)` — this project doesn't use Vitest's `globals: true`, so `@testing-library/react`'s automatic cleanup never self-registers.
  2. A keyboard-sizing bug: `#root` had no definite width, so the SVG's `width: 100%` had nothing real to resolve against. Fixed at the root (no pun intended) by giving `#root` an explicit `width: 100%` rather than papering over it with a fixed pixel width — the keyboard now genuinely scales with window resizing, confirmed manually.
- Confirmed working end-to-end: click a key to set it as target, play it on a real piano, see correct (green) / incorrect (red) feedback live.
- All 48 tests passing, lint/build clean throughout.
- Updated `docs/Roadmap.md`, `docs/Architecture.md`, `docs/Design-Decisions.md` (entries 12-17).

**New concepts learned:**

- SVG as a declarative, data-driven rendering target for React (`data.map(d => <rect .../>)`) versus Canvas's imperative pixel-pushing model — SVG keeps click handling and state-driven styling native to React; Canvas would need hand-rolled hit-testing.
- SVG has no z-index by default — paint order is purely document order, which matters when elements (like black piano keys) visually overlap their neighbors.
- The CSS percentage-sizing trap: a percentage width only resolves against a *definite* containing-block width. A flex-centered container with no explicit width (like this app's `#root`) doesn't provide one, so a descendant's `width: 100%` can silently resolve to something much smaller than expected instead of erroring.
- Vitest without `globals: true` requires explicit `afterEach(cleanup)` for DOM-querying component tests — `@testing-library/react`'s auto-cleanup only self-registers when it detects a *global* `afterEach`, not an imported one.
- Lifting state up as a recurring pattern for sharing one computed value (a mic stream, a pitch reading) between sibling components without either duplicating work or reaching for heavier state management.

**Remaining work:**

- Merge `feature/piano-renderer` into `main` (pending final go-ahead).

**Suggested next task:**
Design Milestone 4 (Practice Mode / Lesson Logic) — sequences of target notes/exercises, scoring, and session start/stop flow, replacing this milestone's manual click-to-select target picker with an automated one.

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
