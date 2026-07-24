# Architecture

This describes the high-level shape of the app. Sections below note which parts are implemented (Milestones 0-2: project skeleton, mic capture, pitch detection) versus still anticipated (keyboard display, practice mode, progress tracking).

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

**Not yet built** — noted here to guide future folder/module structure:

- `KeyboardDisplay` — renders the on-screen piano keyboard and highlights notes.
- `PracticeSession` — drives lesson/exercise sequencing and scoring.
- `ProgressView` — displays practice history over time.

## Data Flow

```
Mic → Web Audio stream → PitchDetector → detected note → UI feedback (KeyboardDisplay)
                                                              ↓
                                                      PracticeSession logic
                                                              ↓
                                              Progress persistence (via IPC → main)
```

Implemented through "detected note" (mic capture → YIN pitch detection → the minimal `PitchReadout` text display). `KeyboardDisplay` and everything downstream of it is still anticipated, not built.

## Security Boundary

The renderer never touches the filesystem directly. All persistence (e.g., saving practice history) is proxied through the preload script and handled by the main process — standard Electron security practice, and it keeps a clean separation between "UI/audio" concerns and "system/storage" concerns.

## Out of Scope (for now)

MIDI keyboard input is not part of the architecture — the app is designed around microphone-based pitch detection only. See [Design-Decisions.md](Design-Decisions.md) for why.
