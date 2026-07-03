# Roadmap

This roadmap tracks the piano tutor app's milestones. Scope is **microphone-based practice only** — no MIDI keyboard support (see [Design-Decisions.md](Design-Decisions.md) for the reasoning).

## Completed Milestones

_None yet — project initialization is in progress on `chore/project-init`, not yet merged to `main`._

## Current Milestone

**Milestone 0: Project Initialization**

Set up planning docs and a minimal, buildable Electron + TypeScript + React project skeleton. No feature logic yet.

- [x] Create `docs/` (Roadmap, Architecture, Design-Decisions, Session-Notes)
- [x] Scaffold Electron + TypeScript + React project (electron-vite)
- [x] Configure ESLint + Prettier
- [x] Configure Vitest with a smoke test
- [x] Verify `npm run dev`, `npm run build`, `npm test`, `npm run lint` all succeed
- [ ] Merge `chore/project-init` into `main`

## Upcoming Milestones

1. **Microphone Input Capture** — request mic permission, capture the audio stream (Web Audio API), display a live level meter/waveform. Foundational; nothing downstream works without it.
2. **Pitch Detection** — convert captured audio into a detected note/frequency in real time (e.g., autocorrelation or YIN algorithm). This is the most technically deep milestone (DSP); may need to be split into sub-steps (basic detection → noise/octave-error handling) if it grows too large.
3. **Piano Keyboard Renderer & Visual Feedback** — on-screen keyboard that highlights the detected note and shows correct/incorrect feedback against a target note.
4. **Practice Mode / Lesson Logic** — sequences of target notes/exercises, scoring, session start/stop flow.
5. **Progress Tracking** — persist practice history locally (via preload/IPC to the main process, not directly from the renderer) and display progress over time.

Milestones are strictly ordered (1 → 2 → 3 → 4 → 5) since each depends on the previous one's output. Each is scoped to roughly a month of part-time work.
