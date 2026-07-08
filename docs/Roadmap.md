# Roadmap

This roadmap tracks the piano tutor app's milestones. Scope is **microphone-based practice only** — no MIDI keyboard support (see [Design-Decisions.md](Design-Decisions.md) for the reasoning).

## Completed Milestones

**Milestone 0: Project Initialization** — planning docs, Electron + TypeScript + React scaffold (electron-vite, ESLint/Prettier, Vitest), merged to `main`.

**Milestone 1: Microphone Input Capture** — mic permission request, audio stream capture via the Web Audio API, and a live level meter, on `feature/microphone-input`. Verified manually: the meter reacts to real sound.

## Current Milestone

**Milestone 2: Pitch Detection**

Convert the captured audio into a detected note/frequency in real time (e.g., autocorrelation or YIN algorithm). This is the most technically deep milestone so far (DSP); may need to be split into sub-steps (basic detection → noise/octave-error handling) if it grows too large. Not yet started — design not yet discussed.

## Upcoming Milestones

1. **Piano Keyboard Renderer & Visual Feedback** — on-screen keyboard that highlights the detected note and shows correct/incorrect feedback against a target note.
2. **Practice Mode / Lesson Logic** — sequences of target notes/exercises, scoring, session start/stop flow.
3. **Progress Tracking** — persist practice history locally (via preload/IPC to the main process, not directly from the renderer) and display progress over time.

Milestones are strictly ordered since each depends on the previous one's output. Each is scoped to roughly a month of part-time work.
