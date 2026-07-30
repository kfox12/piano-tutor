# Roadmap

This roadmap tracks the piano tutor app's milestones. Scope is **microphone-based practice only** — no MIDI keyboard support (see [Design-Decisions.md](Design-Decisions.md) for the reasoning).

## Completed Milestones

**Milestone 0: Project Initialization** — planning docs, Electron + TypeScript + React scaffold (electron-vite, ESLint/Prettier, Vitest), merged to `main`.

**Milestone 1: Microphone Input Capture** — mic permission request, audio stream capture via the Web Audio API, and a live level meter, on `feature/microphone-input`. Verified manually: the meter reacts to real sound.

**Milestone 2: Pitch Detection** — hand-rolled YIN algorithm converting captured audio into a detected note/frequency in real time, on `feature/pitch-detection`. Verified manually against a real piano across low/mid/high registers. Note: single-note (monophonic) detection only — simultaneous multi-key input is an explicit, documented scope boundary, not a bug (see [Design-Decisions.md](Design-Decisions.md) entry 11).

**Milestone 3: Piano Keyboard Renderer & Visual Feedback** — SVG-rendered 88-key on-screen keyboard, on `feature/piano-renderer`. Click a key to set it as the target note; correct/incorrect feedback compares the currently detected note against it (exact name+octave match). A manual click-to-select target picker stands in for Practice Mode until Milestone 4 exists. Verified manually against a real piano: sizing/scaling, click-to-target, and correct/incorrect feedback all work as intended.

**Milestone 4: Practice Mode / Lesson Logic** — automated random-note practice sessions, on `feature/practice-mode`. "Start Practice" begins an open-ended session (random target within a default one-octave range); playing the correct note immediately advances to a new target — no pause, matching the intent of just showing which note to play next rather than scoring accuracy. Manual click-to-select (Milestone 3) is disabled while a session is active. Session state (`correctCount`) is in-memory only; persistence is Milestone 5's job. Verified manually against a real piano: immediate advance, manual-click disabling, and the "Last session: N correct" summary after Stop all work as intended.

## Current Milestone

**Milestone 5: Progress Tracking**

Persist practice history locally (via preload/IPC to the main process, not directly from the renderer) and display progress over time. Not yet started — design not yet discussed.

Milestones are strictly ordered since each depends on the previous one's output. Each is scoped to roughly a month of part-time work.
