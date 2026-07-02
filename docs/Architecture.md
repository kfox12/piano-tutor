# Architecture

This describes the intended high-level shape of the app. As of Milestone 0, none of this is implemented yet — it documents the target structure the skeleton is built toward.

## Process Model (Electron)

Electron apps are split into two kinds of processes with different capabilities and security boundaries:

- **Main process** (`src/main/`) — a Node.js process. Owns app lifecycle: creating/closing windows, the app menu, quitting. It does **not** contain audio or UI logic.
- **Preload script** (`src/preload/`) — runs in a privileged context bridging main and renderer. Exposes a minimal, typed API surface via `contextBridge` (with `contextIsolation: true`). This is the *only* path the renderer has to reach main-process capabilities like the filesystem.
- **Renderer process** (`src/renderer/`) — a Chromium browser context running the React UI. Because microphone access and audio analysis (`getUserMedia`, `AnalyserNode` — the Web Audio API) only exist in a browser context, audio capture and pitch detection logic live here, not in main.

## Anticipated Components (renderer)

Not yet built — noted here to guide future folder/module structure:

- `AudioCapture` — requests mic permission, manages the audio input stream.
- `PitchDetector` — converts raw audio samples into a detected note/frequency.
- `KeyboardDisplay` — renders the on-screen piano keyboard and highlights notes.
- `PracticeSession` — drives lesson/exercise sequencing and scoring.
- `ProgressView` — displays practice history over time.

## Intended Data Flow

```
Mic → Web Audio stream → PitchDetector → detected note → UI feedback (KeyboardDisplay)
                                                              ↓
                                                      PracticeSession logic
                                                              ↓
                                              Progress persistence (via IPC → main)
```

## Security Boundary

The renderer never touches the filesystem directly. All persistence (e.g., saving practice history) is proxied through the preload script and handled by the main process — standard Electron security practice, and it keeps a clean separation between "UI/audio" concerns and "system/storage" concerns.

## Out of Scope (for now)

MIDI keyboard input is not part of the architecture — the app is designed around microphone-based pitch detection only. See [Design-Decisions.md](Design-Decisions.md) for why.
