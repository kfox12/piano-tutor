# Roadmap

This roadmap tracks the piano tutor app's milestones. Scope is **microphone-based practice only** — no MIDI keyboard support (see [Design-Decisions.md](Design-Decisions.md) for the reasoning).

## Completed Milestones

**Milestone 0: Project Initialization** — planning docs, Electron + TypeScript + React scaffold (electron-vite, ESLint/Prettier, Vitest), merged to `main`.

**Milestone 1: Microphone Input Capture** — mic permission request, audio stream capture via the Web Audio API, and a live level meter, on `feature/microphone-input`. Verified manually: the meter reacts to real sound.

**Milestone 2: Pitch Detection** — hand-rolled YIN algorithm converting captured audio into a detected note/frequency in real time, on `feature/pitch-detection`. Verified manually against a real piano across low/mid/high registers. Note: single-note (monophonic) detection only — simultaneous multi-key input is an explicit, documented scope boundary, not a bug (see [Design-Decisions.md](Design-Decisions.md) entry 11).

## Current Milestone

**Milestone 3: Piano Keyboard Renderer & Visual Feedback**

On-screen keyboard that highlights the detected note and shows correct/incorrect feedback against a target note. Not yet started — design not yet discussed.

## Upcoming Milestones

1. **Practice Mode / Lesson Logic** — sequences of target notes/exercises, scoring, session start/stop flow.
2. **Progress Tracking** — persist practice history locally (via preload/IPC to the main process, not directly from the renderer) and display progress over time.

Milestones are strictly ordered since each depends on the previous one's output. Each is scoped to roughly a month of part-time work.
