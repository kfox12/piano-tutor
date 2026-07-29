# Architecture

This describes the high-level shape of the app. Sections below note which parts are implemented (Milestones 0-4: project skeleton, mic capture, pitch detection, keyboard renderer, practice mode) versus still anticipated (progress tracking).

## Process Model (Electron)

Electron apps are split into two kinds of processes with different capabilities and security boundaries:

- **Main process** (`src/main/`) — a Node.js process. Owns app lifecycle: creating/closing windows, the app menu, quitting. It does **not** contain audio or UI logic.
- **Preload script** (`src/preload/`) — runs in a privileged context bridging main and renderer. Exposes a minimal, typed API surface via `contextBridge` (with `contextIsolation: true`). This is the _only_ path the renderer has to reach main-process capabilities like the filesystem.
- **Renderer process** (`src/renderer/`) — a Chromium browser context running the React UI. Because microphone access and audio analysis (`getUserMedia`, `AnalyserNode` — the Web Audio API) only exist in a browser context, audio capture and pitch detection logic live here, not in main.

## Renderer Components

**Implemented:**

- **Audio capture** (`src/renderer/src/audio/useMicrophoneStream.ts`) — requests mic permission, manages the audio input stream, exposes an `AnalyserNode` while active.
- **Pitch detection** (`src/renderer/src/audio/detectPitch.ts` + `frequencyToNote.ts` + `usePitchDetector.ts`) — converts raw audio samples into a detected note/frequency using the YIN algorithm, gated by RMS silence detection and debounced (`stabilizePitchReading.ts`) against per-frame jitter. **Monophonic only** — detects one fundamental frequency per buffer, the same as every standard pitch-detection algorithm (autocorrelation, YIN, MPM). Simultaneous multi-note input is not detected; this is a scope boundary, not a bug (see [Design-Decisions.md](Design-Decisions.md) entry 11).
- Shared polling (`src/renderer/src/audio/useAnalyserFrame.ts`) — `requestAnimationFrame` scheduling used by both the level meter and the pitch detector.
- **Keyboard renderer** (`src/renderer/src/keyboard/generateKeyboardLayout.ts` + `deriveKeyStates.ts`, `src/renderer/src/components/KeyboardDisplay.tsx` + `PianoKey.tsx`) — renders the 88-key (A0-C8) on-screen keyboard as SVG, highlights the currently detected note, and shows correct/incorrect feedback against a target note. The `keyboard/` directory holds pure layout-generation and note-comparison logic, parallel to how `audio/` holds pure DSP functions alongside hooks.
- **Practice mode** (`src/renderer/src/practice/pickRandomTarget.ts` + `practiceSessionReducer.ts` + `usePracticeSession.ts`, `src/renderer/src/components/PracticeSession.tsx`) — drives automated random-note practice sessions: picks a random target within a range, immediately advances to a new (different) target when the correct note is played, tracks an in-memory `correctCount`. Built as a **functional core / imperative shell**: `practiceSessionReducer.ts` is a pure reducer (no randomness, no timers); `usePracticeSession.ts` is the thin effectful hook wiring it to the live `PitchReading`. `App.tsx` now derives `KeyboardDisplay`'s `targetNote` from the active session when one is running, falling back to Milestone 3's manual click-to-select otherwise — manual clicks are disabled while a session is active.

**Not yet built** — noted here to guide future folder/module structure:

- `ProgressView` — displays practice history over time.

## Data Flow

```
Mic → Web Audio stream → PitchDetector → detected note → UI feedback (KeyboardDisplay)
                                                              ↓
                                                      PracticeSession logic
                                                              ↓
                                              Progress persistence (via IPC → main)
```

Implemented through "PracticeSession logic" — mic capture → YIN pitch detection → `PitchReadout`/`KeyboardDisplay` (sharing one computed `PitchReading`, see [Design-Decisions.md](Design-Decisions.md) entry 13) → `PracticeSession` driving target selection and scoring. Only progress persistence (via IPC → main) is still anticipated, not built — Milestone 4's session stats are in-memory only.

## Security Boundary

The renderer never touches the filesystem directly. All persistence (e.g., saving practice history) is proxied through the preload script and handled by the main process — standard Electron security practice, and it keeps a clean separation between "UI/audio" concerns and "system/storage" concerns.

## Out of Scope (for now)

MIDI keyboard input is not part of the architecture — the app is designed around microphone-based pitch detection only. See [Design-Decisions.md](Design-Decisions.md) for why.
