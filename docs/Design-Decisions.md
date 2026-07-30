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

---

## 7. Hand-rolled YIN over naive autocorrelation, MPM, or a library (`pitchy`)

**Decision:** Implemented the YIN pitch-detection algorithm ourselves (`detectPitch.ts`) rather than using a third-party library.

**Reasoning:** Piano tone is harmonically rich, which causes naive autocorrelation to lock onto a harmonic of the true pitch (an "octave error" — 2x or 0.5x the real frequency). YIN's cumulative-mean-normalized difference function plus an absolute threshold specifically resists this and is the field-standard for monophonic pitch detection. It's tractable to hand-roll (~100 lines, well documented in the literature), and CLAUDE.md's stated priority is that the learning goal wins trade-offs — this is exactly the "most technically deep milestone" the Roadmap already anticipated.

**Alternatives considered:**

- _`pitchy`_ — a small, well-regarded, zero-dependency McLeod Pitch Method (MPM) library. The pragmatic choice if the goal were shipping fastest. Recorded as a **named fallback**: `detectPitch`'s pure-function signature (`Float32Array` in, `number | null` out) isolates the algorithm behind a boundary a library could drop into later, if real-piano testing ever shows the hand-rolled version is unreliable after reasonable tuning.
- _Naive autocorrelation_ — simpler, but the octave-error problem it has is exactly what this milestone needed to solve.
- _FFT / Harmonic Product Spectrum_ — frequency-domain resolution (`sampleRate / fftSize`, ~11.7Hz per bin at 4096/48kHz) is too coarse to reliably distinguish adjacent low notes without extra interpolation work HPS doesn't give for free.

**Trade-offs:** More code to write and test ourselves than dropping in a library; the payoff is a genuine, from-scratch understanding of a real DSP algorithm and zero added runtime dependencies for code that's conceptually central to the app.

---

## 8. Analyser buffer increased to 4096 samples; pitch detector reads float samples

**Decision:** `useMicrophoneStream.ts`'s `analyser.fftSize` increased from 2048 to 4096. The pitch detector reads via `getFloatTimeDomainData` (new `rmsFloat.ts`), while the existing level meter keeps using the byte API (`rms.ts`) unchanged.

**Reasoning:** Reliable low-note detection needs roughly 2+ full periods of the lowest target frequency in the buffer. At 44.1-48kHz, one period of A0 (27.5Hz) is ~1600-1745 samples, so the previous 2048-sample buffer held barely more than one period. `fftSize` must be a power of 2 (Web Audio spec constraint), so 4096 is the next value up, giving ~2.3+ periods of margin. Float samples (`-1..1`, no quantization) matter for YIN's parabolic-interpolation step, which needs sub-sample precision for meaningful cents accuracy.

**Alternatives considered:**

- _8192 samples_ — more margin, but ~170ms latency starts feeling laggy for real-time feedback; rejected.
- _Leave the level meter on `getFloatTimeDomainData` too_ — no real benefit for a coarse level meter, and would have meant touching already-tested, working code for no reason.

**Trade-offs:** Latency per reading roughly doubled (~42.7ms → ~85.3ms at 48kHz) — still comfortably under the ~100ms threshold where real-time feedback starts feeling laggy.

---

## 9. RMS-based silence gating with a threshold that needs real-hardware tuning

**Decision:** `usePitchDetector` skips running YIN entirely when `rmsFloat` of the current buffer is below `0.02`, returning `null` (no reading) instead.

**Reasoning:** Two independent reasons: performance (skip an O(bufferLength × searchRange) computation ~60x/sec during silence) and robustness (very quiet ambient noise can occasionally show enough weak periodicity to produce a low-confidence false-positive reading; a minimum-RMS pre-filter is a cheap extra guard band on top of YIN's own internal threshold check).

**Alternatives considered:**

- _Rely on YIN's own threshold alone, no separate RMS gate_ — technically sufficient for correctness, but wastes CPU running the full algorithm on silence every frame.

**Trade-offs:** The `0.02` threshold is a starting value, not a validated one — a synthetic unit test can assert the boundary logic ("below threshold → null") but cannot confirm `0.02` is correctly calibrated against a real room's actual noise floor. This needs to stay open to retuning as the app is used in different environments; not something to consider "finished" from this milestone alone.

---

## 10. Lifted `useMicrophoneStream` state from `MicLevelMeter` up into `App.tsx`

**Decision:** `useMicrophoneStream()` is now called in `App.tsx`, with `state`/`start`/`stop` passed down as props to `MicLevelMeter`, and the `AnalyserNode` passed to the new `PitchReadout`.

**Reasoning:** `PitchReadout` needs the same live `AnalyserNode` `MicLevelMeter` already had exclusive access to. Each component independently calling `useMicrophoneStream()` would double-prompt for microphone permission and open two separate audio streams — standard "lift state up" React pattern to share one source of truth between sibling components.

**Alternatives considered:**

- _Each component calls `useMicrophoneStream()` independently_ — simpler per-component, but the double-permission-prompt/double-stream problem makes it not actually viable.

**Trade-offs:** `App.tsx` is no longer a pure layout shell — it now owns real state. Minor increase in coupling, acceptable at this scale; would revisit (e.g. React context) if a third sibling needs the same analyser.

---

## 11. Monophonic pitch detection only — simultaneous multi-note input is a documented scope boundary

**Observation, not a decision:** Manual verification confirmed the detector does not identify multiple simultaneously-pressed piano keys. This is expected behavior, not a defect: YIN, like every standard pitch-detection algorithm (autocorrelation, MPM, HPS), estimates exactly one fundamental frequency per buffer. True polyphonic pitch detection (multiple simultaneous notes) requires categorically different techniques — multi-pitch estimation, spectral source separation, or ML-based transcription models — and is a much larger undertaking than this milestone. Roadmap.md's own milestone text already scoped this as converting audio into "a detected note," singular. If chord/multi-note practice is ever wanted, it would warrant its own future milestone and design discussion, not a patch on top of YIN.

---

## 12. SVG over DOM/CSS-divs and Canvas for the keyboard renderer

**Decision:** The 88-key keyboard (`KeyboardDisplay.tsx`) renders as SVG — one `<rect>` per key, generated from a pure layout function.

**Reasoning:** Each key is a data-driven element (`keys.map(key => <rect .../>)`), exactly how React renders arrays of data, with native `onClick` per key. A `viewBox` gives free, aspect-ratio-preserving responsive scaling. No new dependency needed — it's just markup, consistent with the project's plain-CSS, no-design-library approach so far.

**Alternatives considered:**

- _Absolutely-positioned CSS divs_ — a known "CSS piano" technique, but black-key positioning ends up split awkwardly between CSS and JS, and z-index/overlap layering has to be managed by hand.
- _Canvas_ — rejected outright: an imperative pixel surface has no per-key DOM node to bind React state/click handlers to, so click-to-select-target would need hand-rolled hit-testing math instead of a native `onClick`.

**Trade-offs:** SVG has no z-index by default (later elements paint over earlier ones), so `KeyboardDisplay` must render all white keys before all black keys — a real ordering constraint to remember, not just a stylistic choice, since black keys visually and functionally (for clicks) overlap their neighbors' edges.

---

## 13. Lifted `usePitchDetector` from `PitchReadout` up into `App.tsx`

**Decision:** `usePitchDetector(analyser)` is now called once in `App.tsx`; the resulting `PitchReading` is passed down as a prop to both `PitchReadout` and `KeyboardDisplay`.

**Reasoning:** `KeyboardDisplay` needs the same live pitch reading `PitchReadout` already computed. Each component independently calling the hook would run the O(bufferLength × searchRange) YIN computation twice per animation frame for no benefit, and risked their two independent debounce-stabilizer states silently diverging. Same "lift state up" pattern already used for `useMicrophoneStream` (entry 10).

**Alternatives considered:**

- _Each component calls `usePitchDetector` independently_ — simpler per-component, but wastes real CPU work every frame and risks the divergence bug above.

**Trade-offs:** None significant — this is a pure refactor, manually re-verified (`PitchReadout` still shows the correct note).

---

## 14. Exact name+octave match for "correct," not note-name-only

**Decision:** `deriveKeyboardStates` requires an exact match on both note name and octave for a key to be marked "correct" against the target.

**Reasoning:** A student who clicks middle C (C4) as the target and plays C3 is making a real, common, pedagogically distinct mistake (wrong octave) from actually hitting C4. Collapsing both into "correct" would give false-positive feedback and undermine the app's purpose — teaching where notes sit on *this* keyboard, not abstract note-name recognition. It also matches the interaction itself: the student clicked a specific key, not "any C."

**Alternatives considered:**

- _Note-name-only match (any octave counts as correct)_ — simpler, but masks a real class of mistakes.
- _A third "close" state for right-name-wrong-octave_ — deliberately not added; the milestone scope asks for binary correct/incorrect, and this is easy to add later without disrupting the current shape if ever wanted.

**Trade-offs:** None significant given the reasoning above; right-name-wrong-octave is classified `incorrect`, same as any other wrong note.

---

## 15. Manual click-to-select target note, with state lifted to `App.tsx`

**Decision:** Clicking a key sets/clears it as the target note (single target only). This state lives in `App.tsx`, not inside `KeyboardDisplay`.

**Reasoning:** Practice Mode (Milestone 4) doesn't exist yet, but its eventual job is exactly "a smarter way to set the target note" — automatically, from a lesson sequence, instead of a manual click. Lifting `targetNote` to `App.tsx` now (a controlled `KeyboardDisplay`, driven by `targetNote`/`onKeyClick` props) means Milestone 4 can later drive it programmatically without restructuring this milestone's work.

**Alternatives considered:**

- _`targetNote` as local state inside `KeyboardDisplay`_ — simpler now, but would trap the target-selection mechanism inside a component Milestone 4 would need to reach into or restructure.
- _Random target note generator_ — considered and explicitly deferred (see the scoping discussion at the top of this milestone's work) since it starts overlapping with Practice Mode's actual lesson logic.

**Trade-offs:** `App.tsx` now owns more real state than a pure layout shell would. Acceptable at this scale; would revisit (e.g. React context) if a third sibling ever needs the same target/reading data.

---

## 16. Keyboard accessibility gap (observation, not a decision — explicitly deferred)

**Observation, not a decision:** The keyboard is mouse-only. SVG `<rect>` elements aren't natively focusable/tabbable, so a keyboard-only or screen-reader user currently has no way to set a target note. Full accessibility (`role="button"`, `tabIndex`, `aria-pressed`/`aria-label` per key, visible focus ring, Enter/Space handling across 88 elements) is real, non-trivial work for an interaction this milestone itself frames as a temporary Practice-Mode stand-in. Deferred deliberately, not overlooked — worth revisiting once it's clear whether manual click-targeting survives past Milestone 4 as a secondary/debug affordance or disappears entirely.

---

## 17. `#root` needs an explicit width for percentage-based child sizing (implementation note, not a decision)

**Observation, not a decision:** Manual verification showed the keyboard rendering far smaller than intended, and initially "fixing" it with a fixed pixel width made it stop scaling with the window (which is what was actually wanted). Root cause: `#root` had no definite width — `body`'s `justify-content: center` centers `#root` without stretching it, so it sized to its content, leaving `<svg class="keyboard-display" width="100%">` with no meaningful value to resolve its percentage against. Fixed at the source (`#root { width: 100% }`) rather than working around it with fixed pixel dimensions, so `.keyboard-display`'s percentage width now resolves correctly and the keyboard genuinely scales as the window is resized, confirmed manually. Worth remembering for any future UI element that wants percentage-based responsive sizing — the containing block chain needs a definite width somewhere, or the percentage has nothing real to resolve against.

---

## 18. Functional core / imperative shell for practice-session logic

**Decision:** `practiceSessionReducer.ts` is a pure reducer (no `Math.random()`, no timers, no side effects); `usePracticeSession.ts` is a thin hook wiring that reducer to the live `PitchReading`.

**Reasoning:** A new pattern for this codebase (prior hooks like `useMicrophoneStream` mix state and effects directly via `useState`), adopted specifically because it makes the session state machine's correctness properties — what counts as a match, what a `correct` action does to `stats`/`target` — testable with plain function calls, no React rendering, no timers, no mocking. The randomness (`pickRandomTarget`) and the effectful "watch the reading, dispatch on match" logic stay in the hook, where they belong.

**Alternatives considered:**

- _One `useState`/`useEffect`-based hook, no separate reducer_ — would match the existing `useMicrophoneStream` style, but conflates "what should happen" (pure) with "when should it happen" (effectful), making the transition logic harder to test in isolation.

**Trade-offs:** One more file/indirection layer than the minimal version; justified by how central and non-trivial the state machine is to this milestone specifically.

---

## 19. Immediate advance on correct, no pause

**Decision:** The moment a correct note is detected, the session advances to a new target in the same tick — no artificial delay, no intermediate "correct-pause" state.

**Reasoning:** An earlier draft of this design included a ~1s pause with a "Correct!" cue before advancing. The user explicitly redirected: don't stall the next note. The keyboard's existing green "correct" highlight (from Milestone 3's `deriveKeyboardStates`, unchanged by this milestone) is sufficient correctness feedback on its own — it's naturally visible for as long as the note keeps sounding, without needing code to hold it artificially. This also simplified the implementation meaningfully: no `setTimeout`, no third reducer state, no "ignore readings during the pause" gating logic to test.

**Alternatives considered:**

- _~1s pause before advancing_ — the original design; rejected per explicit user feedback in favor of continuous flow.

**Trade-offs:** None significant — this is both simpler to implement and matches what was actually wanted.

---

## 20. In-memory-only session state

**Decision:** `SessionStats`/`PracticeSessionState` live entirely in React state (via `useReducer`), reset on every app restart. No IPC call, no file write, anywhere in this milestone.

**Reasoning:** Milestone 5 ("Progress Tracking") exists specifically to add persistence via preload/IPC. Building any of that here — even a minimal "save the last session" — would pull forward work that milestone owns and blur the boundary between them.

**Trade-offs:** "Last session: N correct" only survives until the app is closed, not across restarts — acceptable, since cross-session history is explicitly Milestone 5's job, not this one's.

---

## 21. Random-target generator: default range, no-repeat via filtering

**Decision:** `pickRandomTarget` defaults to a one-octave range (C4-C5) and excludes the immediately-previous target from the candidate pool before picking (filter-then-pick, not reject-and-resample), falling back to the unfiltered pool for a single-note range.

**Reasoning:** One octave around middle C gives real variety without spanning registers a beginner hasn't learned to read yet. Filtering is O(n) with no retry-loop risk (n is small — 13 keys at most for the default range) and is trivially testable with an injected deterministic `rng`. No-repeat matters more given Milestone 19's immediate-advance decision: it guarantees the new target can never be the same note the player is still physically holding, so a sustained note can't "match" a second target by coincidence.

**Alternatives considered:**

- _Reject-and-resample (pick randomly, retry if it matches the previous target)_ — simpler to write, but has an unbounded (if vanishingly unlikely) retry count, versus filtering's guaranteed-bounded cost.

**Trade-offs:** None significant. Range is a parameter, not hardcoded, so a future settings UI can change difficulty without touching this function.

---

## 22. Manual click-to-target disabled during an active session

**Decision:** `App.tsx`'s `handleKeyClick` is a no-op while `sessionState.status === 'awaiting-note'`.

**Reasoning:** A click can't reach `practiceSessionReducer`'s internal `target` — the reducer is the only thing that knows what the session is actually listening for. Leaving clicks live during a session wouldn't override anything real; it would just visually highlight a different key than the one being matched against, which is confusing, not useful. `KeyboardDisplay` needed no changes to support this — `targetNote` is derived in `App.tsx` before ever reaching it.

**Trade-offs:** None significant.

---

## 23. Open-ended (Stop-driven) session length, not a fixed round count

**Decision:** A practice session has no built-in end condition — it runs until the user clicks "Stop Practice."

**Reasoning:** Roadmap.md's own milestone text says "session start/stop flow," which is a user-controlled boundary, not an algorithmic one. A fixed round count (e.g. 10) would need its own justification for the specific number, and would likely need to be configurable eventually anyway — scope this milestone doesn't need. The "natural summary moment" a fixed count would provide is achieved a different way instead: `idle` carries `lastSessionStats`, populated on `stop`, giving a "Last session: N correct" summary tied to the user's own action rather than an arbitrary count.

**Alternatives considered:**

- _Fixed round count (e.g. 10 notes per session)_ — provides an automatic end/summary moment, but adds unjustified scope (why 10?) this milestone doesn't need.

**Trade-offs:** None significant.

---

## 24. No miss-tracking in v1 scoring

**Decision:** `SessionStats` tracks only `correctCount`. No `missCount`, no accuracy percentage, no first-try tracking.

**Reasoning:** Two reasons, one of them a real correctness pitfall rather than just a style preference. First, confirmed directly with the user: the intent of this milestone is to help the player know which note to play next, not to produce an accuracy score. Second, and more technically interesting: `usePitchDetector` emits a **new `PitchReading` object every animation frame** (~60/sec) for as long as a note is held — including a wrong note held steady. Naively incrementing a miss counter on every non-matching dispatch would count one held wrong note as dozens of "misses" per second, not one mistake. Fixing that properly needs edge-detection (tracking the previously-seen note to only count *transitions* into a new wrong note) — real added complexity for a stat this milestone doesn't need. The correct path doesn't have this problem for free: a round can only be won once (the reducer's `correct` case only fires from `awaiting-note`, and winning immediately changes `target`), so `correctCount` increments exactly once per round with zero extra bookkeeping. Wrong notes remain visible in real time via the keyboard's existing red highlighting; the session just doesn't separately tally them.

**Alternatives considered:**

- _Track `missCount` via naive non-matching-dispatch counting_ — rejected outright; produces meaningless numbers per the framerate-counter problem above.
- _Track `missCount` via proper edge-detection_ — technically sound, but real added complexity not justified by this milestone's actual goal (confirmed with the user).

**Trade-offs:** No accuracy/history metric beyond a simple correct count — acceptable, since that was never the goal for this milestone.

---

## 25. "Start Practice" gated on mic-already-active

**Decision:** `PracticeSession`'s "Start Practice" button is disabled until `useMicrophoneStream`'s state is `active`. Clicking it never triggers the mic's own `start()`.

**Reasoning:** Auto-starting the mic from a different button would still be a real user gesture (doesn't violate entry 4's "no auto-request" rule), but it would couple two independently-designed state machines: what should `PracticeSession` show if `getUserMedia` then fails with `permission-denied`? Either it needs to understand `MicrophoneErrorKind`, or a session silently sits in `awaiting-note` forever with no signal the mic never came up. Keeping "Start Listening" and "Start Practice" as two fully decoupled gated actions (extending the same one-button-per-gated-capability pattern from entry 4) avoids that bridging problem entirely.

**Trade-offs:** One extra required click (start the mic, then start practice) versus a single combined action — acceptable given the alternative's error-handling complexity.

---

## 26. MIDI file import over MusicXML or PDF/OMR for v1 song content

**Decision:** Milestone 5 imports songs from Standard MIDI Files (`.mid`), not MusicXML or scanned sheet music (optical music recognition).

**Reasoning:** The practice engine only needs a pitch sequence — the user handles rhythm themselves while playing, per their explicit direction. MIDI files exist in huge numbers for real songs and encode exactly what's needed (note-on events with pitch and timing) without the full notation semantics (voices, ties, dynamics, engraving) that MusicXML carries or that OMR would need to reconstruct from a scanned/PDF score. This is not a reversal of entry 2 ("MIDI deferred") — that decision was specifically about **MIDI hardware input** (a keyboard controller as an alternative to the microphone, i.e. real-time device I/O). Parsing a `.mid` **file** as song content has no device and no real-time I/O; it's a data-import format choice, unrelated to that decision.

**Alternatives considered:**

- _MusicXML_ — the standard sheet-music interchange format, but far more parsing complexity (voices, measures, ties) for fidelity the app discards anyway (rhythm).
- _PDF/OMR (optical music recognition)_ — would let a user import a scanned score directly, but OMR is itself a substantial, error-prone ML problem — well beyond this milestone's scope.
- _Manual entry only, no file import_ — considered as a fallback if MIDI parsing proved too risky; not needed since the hand-rolled parser worked.

**Trade-offs:** MIDI files aren't available for every song (vs. a scanned score, which always exists for anything published), and the `Song` model's importer boundary (entry 29) keeps MusicXML/OMR realistic to add later if that gap matters.

---

## 27. Hand-rolled Standard MIDI File parser over a library

**Decision:** `parseMidiFile.ts` reads MThd/MTrk chunks directly (byte-level parsing, variable-length quantities, running status) rather than adding a library like `@tonejs/midi`.

**Reasoning:** Parallels entry 7 (hand-rolled YIN over `pitchy`). The project has stayed at effectively zero runtime dependencies for domain logic; the SMF format is a well-documented, comparably-scoped parsing problem (arguably simpler than YIN — no DSP, just structured byte parsing), and CLAUDE.md's stated priority is that the learning goal wins trade-offs.

**Alternatives considered:**

- _`@tonejs/midi` or similar_ — would have been faster to integrate, but skips the file-format learning opportunity and adds a dependency for something tractable to write directly.

**Trade-offs:** More code to write and test than a library call; the parser also doesn't support every corner of the SMF spec (see entries 30-31) — acceptable since those corners aren't needed for this app's purpose.

---

## 28. Parsing stays in the renderer as a pure function; main process only opens the file and reads bytes

**Decision:** `ipcMain.handle('dialog:selectMidiFile', ...)` in `src/main/index.ts` does exactly two things — open the native file picker, read the chosen file's raw bytes — and returns them to the renderer. `parseMidiFile(buffer, title): Song` runs entirely in the renderer, as a pure function with no Electron/Node dependency.

**Reasoning:** Matches the documented Security Boundary (renderer never touches the filesystem; main proxies via preload) without also pulling actual domain logic into main. Every other piece of domain logic in this app (`audio/`, `keyboard/`, `practice/`) lives in the renderer as pure, directly-unit-testable functions — keeping the parser there too means it can be tested with plain Vitest (hand-built byte-array fixtures, no Electron mocking) exactly like `detectPitch.ts` or `parseMidiFile`'s sibling modules. This is also the **first real IPC channel** in the app — previously `src/preload/index.ts` exposed an empty `api` object.

**Alternatives considered:**

- _Parse the file in main, send the finished `Song` over IPC_ — keeps the renderer IPC surface simpler (one round trip returns finished data), but moves testable domain logic into the harder-to-unit-test main process, and breaks the established "domain logic lives in the renderer" convention.

**Trade-offs:** None significant — the two-step "read bytes, then parse" split costs nothing extra in practice (parsing is fast) and keeps testability where the rest of the app already has it.

---

## 29. `Song` model designed as a shared target for future importers

**Decision:** `Song`/`SongEvent`/`SongNote` ([song.ts](../src/renderer/src/song/song.ts)) describe an ordered list of note-or-chord events with no rhythm/timing data — deliberately the smallest model that captures "what to play, in what order, alone or together."

**Reasoning:** The parser boundary is `(format-specific input) => Song`. A future MusicXML or OMR importer would be a new function producing this same shape, not a rewrite of the practice/editor layers that consume it. Keeping the model rhythm-free (rather than, say, preserving MIDI ticks/durations "just in case") avoids speculative complexity the app has no current use for — see CLAUDE.md's guidance against designing for hypothetical future requirements.

**Trade-offs:** If a future feature ever wants rhythm (e.g. a metronome/timing-accuracy mode), the model would need to grow a new field — an explicit, acceptable cost of not over-building now.

---

## 30. Chord grouping via onset-time proximity only; duration is discarded

**Decision:** Two or more notes become one `SongEvent` (a chord) when their onsets fall within `CHORD_ONSET_THRESHOLD_MS = 50` of the first note's onset in that group. Note-off/duration is parsed only insofar as needed to correctly walk the MIDI event stream, then discarded — it plays no role in the grouping decision itself.

**Reasoning:** Onset proximity is the simplest rule that matches "notes that begin nearly simultaneously" (the actual instruction this milestone was scoped against), and it's a standard heuristic in music-information-retrieval chord detection. Anchoring each comparison to the *group's first note* (not the previous note) avoids drift, where a fast melodic run could otherwise get chained into one giant "chord" through a sequence of individually-small gaps.

**Alternatives considered:**

- _Overlapping-duration grouping (notes are a chord if their sounding durations overlap)_ — a plausible alternative reading of "duration matters for chord grouping," but meaningfully more complex (needs full note-off tracking and an overlap-interval algorithm) for a distinction that rarely matters in practice for a piano piece.

**Trade-offs:** A held long note followed shortly after by a short new note starting within 50ms would group together even if a musician wouldn't call that a "chord" in the traditional sense — an acceptable simplification, correctable later in the song editor.

---

## 31. Multi-track flattening and single-tempo assumption (documented v1 limitations)

**Decision:** All non-percussion tracks (channel 10 excluded) are merged into one absolute-time-ordered stream before chord grouping — there's no track-picker UI. Tempo is read once from the first Set Tempo meta event encountered (default 120 BPM if none) and applied to the whole file — no tempo-change map.

**Reasoning:** Flattening tracks is a deliberate fit, not a workaround: a multi-track piano file (e.g. separate left/right-hand tracks) naturally collapses into chord events through the grouping step (entry 30) instead of needing a separate track-selection feature. A single constant tempo covers the common case (most simple exports don't automate tempo) while keeping the parser's scope contained.

**Trade-offs:** A file with genuine tempo automation (rubato, accelerando) will have chord-grouping/ordering errors in the fast sections, and a file where multiple tracks represent genuinely different instruments (not just LH/RH of one piano part) would merge them indiscriminately. Both are real, known limitations — fixable later (track selection UI, a tempo map) without changing the `Song` model itself, since both are input-side parser concerns.

---

## 32. Song editor: append/delete/modify only, no reordering or mid-sequence insert in v1

**Decision:** `SongEditor.tsx` supports appending a new event at the end, deleting an event or a note within a chord, and editing a note's pitch via name/octave selects. It does not support drag-reordering or inserting a new event in the middle of the sequence.

**Reasoning:** This is genuinely new UI territory for the app (no prior list-editing precedent existed) — no existing pattern to extend or follow. Scoping to the minimum operations that satisfy "correct the extracted sequence" (the actual ask) avoids building reorder/insert affordances (drag-and-drop, or an "insert before/after" menu) that add real UI complexity without a demonstrated need yet.

**Trade-offs:** Fixing a genuinely out-of-order import (e.g. a note that should be earlier in the sequence) currently requires delete-and-re-add-at-the-end rather than a direct move — an accepted rough edge for v1, revisit if it proves painful in practice.

---

## 33. Scope boundary: this milestone is import + parse + edit only

**Decision:** Milestone 5 covers importing a MIDI file, parsing it into a `Song`, and correcting it in the editor — entirely in-memory. Saving songs to disk (cross-session persistence) and an actual "practice this song" session mode (stepping through a `Song`'s events instead of `usePracticeSession`'s random targets) are explicitly **not** part of this milestone.

**Reasoning:** The originally-planned Milestone 5 ("Progress Tracking," streak/accuracy tracking) was dropped outright — the user doesn't want that framing. What's wanted instead is practicing specific songs, but bundling MIDI parsing + a new editor UI + disk persistence + a new practice-session mode into one branch would be too large a unit of work for one milestone (CLAUDE.md's ~1-month-part-time sizing guidance). This slice proves the import pipeline end-to-end; persistence and song-based practice are natural next slices once it exists.

**Trade-offs:** An imported song currently doesn't survive an app restart, and there's no way yet to actually *practice* it (only view/edit it) — both are known, deliberate gaps, not omissions.

---

## 34. Keyboard target highlighting generalized from one note to a list; correction list hidden behind a toggle

**Decision:** `deriveKeyStates.ts`/`KeyboardDisplay.tsx`'s `targetNote: TargetNote | null` became `targetNotes: TargetNote[]` (a key is "target" if it matches *any* entry). `App.tsx` gained a Prev/Next-navigable "current event" cursor for an imported song (`useSongImport`'s `previewIndex`/`stepPreview`), whose notes are highlighted on the keyboard the same way a practice-session or manually-clicked target is. `SongEditor`'s add/delete/modify list is now hidden behind an "Edit Notes" toggle, off by default, separate from the always-visible Prev/Next preview.

**Reasoning:** First-pass manual verification surfaced two real usability problems: (1) the correction list appeared immediately and unexplained on import, with no indication of *why* editing was even offered, and (2) there was no way to see an imported note/chord on the actual keyboard the way practice mode already shows a target — reviewing/correcting the sequence meant reading note names as text only. Reusing the existing target-highlight mechanism (rather than inventing a separate "preview" visual style) keeps one visual language for "this is what should be played" across manual click, practice sessions, and song review. Generalizing to a list (not just adding a second single-note prop) is what makes chord events highlight correctly, and was a small, mechanical change since `PianoKey.tsx` never needed to change — it only ever consumed the already-resolved per-key `KeyVisualState`.

**Alternatives considered:**

- _Keep a single `targetNote` and only ever show the first note of a chord_ — simpler, but wrong: it would silently hide part of a chord, which is exactly the kind of import mistake the editor exists to catch.
- _A separate "preview" highlight color/prop, independent of the practice-mode target styling_ — would avoid touching `deriveKeyStates`, but introduces a second visual vocabulary for what's conceptually the same thing ("the note(s) to play now").

**Trade-offs:** Manual click-to-target is now disabled whenever a song is loaded (same reasoning as entry 22: a click can't reach what's actually controlling the display) — there's currently no way to "close" an imported song and return to manual click-to-target without importing a different file or restarting the app; acceptable for now, worth revisiting if that turns out to matter in practice.
