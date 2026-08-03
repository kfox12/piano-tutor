# Architecture

This describes the high-level shape of the app. Sections below note which parts are implemented (Milestones 0-5: project skeleton, mic capture, pitch detection, keyboard renderer, practice mode, song import; plus a UI redesign — multi-page navigation and theming — on `feature/ui-redesign`) versus still anticipated (song-based practice sessions, cross-session persistence, real Song Library/Test Mode content).

## Process Model (Electron)

Electron apps are split into two kinds of processes with different capabilities and security boundaries:

- **Main process** (`src/main/`) — a Node.js process. Owns app lifecycle: creating/closing windows, the app menu, quitting. It does **not** contain audio or UI logic.
- **Preload script** (`src/preload/`) — runs in a privileged context bridging main and renderer. Exposes a minimal, typed API surface via `contextBridge` (with `contextIsolation: true`). This is the _only_ path the renderer has to reach main-process capabilities like the filesystem. `window.api.selectMidiFile()` (Milestone 5) is the app's first real IPC channel — main opens the native file picker and reads the chosen file's raw bytes; parsing those bytes happens in the renderer (see "Song import" below).
- **Renderer process** (`src/renderer/`) — a Chromium browser context running the React UI. Because microphone access and audio analysis (`getUserMedia`, `AnalyserNode` — the Web Audio API) only exist in a browser context, audio capture and pitch detection logic live here, not in main.

## Renderer Components

**Implemented:**

- **Audio capture** (`src/renderer/src/audio/useMicrophoneStream.ts`) — requests mic permission, manages the audio input stream, exposes an `AnalyserNode` while active.
- **Pitch detection** (`src/renderer/src/audio/detectPitch.ts` + `frequencyToNote.ts` + `usePitchDetector.ts`) — converts raw audio samples into a detected note/frequency using the YIN algorithm, gated by RMS silence detection and debounced (`stabilizePitchReading.ts`) against per-frame jitter. **Monophonic only** — detects one fundamental frequency per buffer, the same as every standard pitch-detection algorithm (autocorrelation, YIN, MPM). Simultaneous multi-note input is not detected; this is a scope boundary, not a bug (see [Design-Decisions.md](Design-Decisions.md) entry 11).
- Shared polling (`src/renderer/src/audio/useAnalyserFrame.ts`) — `requestAnimationFrame` scheduling used by both the level meter and the pitch detector.
- **Keyboard renderer** (`src/renderer/src/keyboard/generateKeyboardLayout.ts` + `deriveKeyStates.ts`, `src/renderer/src/components/KeyboardDisplay.tsx` + `PianoKey.tsx`) — renders the 88-key (A0-C8) on-screen keyboard as SVG, highlights the currently detected note, and shows correct/incorrect feedback against a target. `KeyboardDisplay`'s `targetNotes: TargetNote[]` accepts more than one note so a chord (from an imported song) highlights all at once, not just a single practice target — `PianoKey.tsx` is unaffected, since it only ever consumes the already-resolved per-key `KeyVisualState`. The `keyboard/` directory holds pure layout-generation and note-comparison logic, parallel to how `audio/` holds pure DSP functions alongside hooks.
- **Practice mode** (`src/renderer/src/practice/pickRandomTarget.ts` + `practiceSessionReducer.ts` + `usePracticeSession.ts`, `src/renderer/src/components/PracticeSession.tsx`) — drives automated random-note practice sessions: picks a random target within a range, immediately advances to a new (different) target when the correct note is played, tracks an in-memory `correctCount`. Built as a **functional core / imperative shell**: `practiceSessionReducer.ts` is a pure reducer (no randomness, no timers); `usePracticeSession.ts` is the thin effectful hook wiring it to the live `PitchReading`.
- **Song import** (`src/renderer/src/song/song.ts` + `noteMath.ts` + `parseMidiFile.ts` + `useSongImport.ts`, `src/renderer/src/components/SongEditor.tsx`) — imports a user-chosen MIDI file and converts it into the app's internal `Song` model (an ordered list of note/chord events, no rhythm data), then lets the user review and correct the extracted sequence. `useSongImport` orchestrates the pipeline: call `window.api.selectMidiFile()` (IPC → main's file picker + raw byte read) → `parseMidiFile()` (a pure, hand-rolled Standard MIDI File parser, run entirely in the renderer) → hold the resulting `Song` plus a `previewIndex` cursor in state, with `stepPreview`/`updateSong` letting the UI navigate and push corrections back. `noteMath.ts` (`midiToNote`/`noteToMidi`) is the shared MIDI-number ↔ name/octave conversion, also now used by `generateKeyboardLayout.ts` and `frequencyToNote.ts` (previously duplicated inline in both). See [Design-Decisions.md](Design-Decisions.md) entries 26-33 for the MIDI-over-MusicXML/OMR choice, the parser's chord-grouping/tempo/multi-track handling and its documented limitations, and this milestone's scope boundary (import + parse + edit only — no disk persistence, no song-based practice session yet).
- **Target/preview wiring** — within `PracticeModePage`, `KeyboardDisplay`'s `targetNotes` is resolved by priority: an active practice session's target, then a manually-clicked key. Within `ImportSongPage`, it's the current event of the imported song being previewed (Prev/Next-navigable via `stepPreview`); manual click-to-target is disabled there, for the same reason it's disabled during a practice session (entry 22 in [Design-Decisions.md](Design-Decisions.md)): a click can't reach what's actually controlling the display. `SongEditor`'s add/delete/modify list is hidden behind an "Edit Notes" toggle, off by default — the always-visible part of song review is just the Prev/Next preview highlighting notes on the keyboard, the same visual language already used for practice targets. See [Design-Decisions.md](Design-Decisions.md) entry 34.
- **Mic auto-start on import** — `ImportSongPage` now runs its own `useMicrophoneStream`/`usePitchDetector` pair (independent from `PracticeModePage`'s) and calls `start()` automatically the moment `useSongImport`'s state transitions to `'success'`, so the live-detected note feeds into `KeyboardDisplay` (correct/incorrect feedback against the previewed note/chord) without an extra click. `useMicrophoneStream.start()` was made idempotent (a no-op while already `'active'`/`'requesting'`, tracked via a ref so the guard doesn't itself need to be an effect dependency) so this auto-start call, and any other caller, never has to check current status first. See [Design-Decisions.md](Design-Decisions.md) entry 38.
- **Song preview auto-advance** (`src/renderer/src/song/useSongAutoAdvance.ts`) — playing the currently-previewed note/chord correctly advances `ImportSongPage`'s preview cursor automatically (`stepPreview(1)`), the same immediate-advance feel `usePracticeSession` gives random targets. A chord event is satisfied by hearing any one of its notes, since pitch detection is monophonic and can't confirm a full chord sounding at once. Edge-detected via a ref (fires once per sustained match, not once per animation frame) rather than a pure reducer, since a song's fixed note sequence can't lean on `pickRandomTarget`'s no-repeat trick the way Practice Mode does. This is a deliberately small slice of the still-undesigned "song-based practice session" (no scoring, no completion state) — see [Design-Decisions.md](Design-Decisions.md) entry 39.
- **Navigation & layout** (`src/renderer/src/navigation.ts`, `src/renderer/src/layout/`) — `App.tsx` holds a single `view: View` state value (`'home' | 'import' | 'library' | 'practice' | 'test'`) and renders one page from `src/renderer/src/pages/` at a time; no routing library, see [Design-Decisions.md](Design-Decisions.md) entry 35. `AppShell` wraps every page: a minimal bar (brand + theme toggle) on the Home page, the full `TopNav` (all five views + theme toggle) everywhere else — the nav bar itself only appears once a mode is selected, keeping Home an uncluttered landing screen. `HomePage` is a three-card dashboard (Import New Song / Continue Practicing / Test Practice) that navigates via the same `onNavigate` callback. `SongLibraryPage` and `TestModePage` are both a shared `PlaceholderPage` component, since neither has real functionality yet — see [Design-Decisions.md](Design-Decisions.md) entry 37.
- **Theming** (`src/renderer/src/theme/`) — `ThemeProvider` resolves light/dark once (stored choice, falling back to `prefers-color-scheme`) and stamps it onto `<html data-theme>`; `ThemeToggle` flips it and persists the choice to `localStorage`. `base.css` keys its color tokens off `[data-theme='light']`/`[data-theme='dark']` only — no CSS media query — so there's one source of truth for which theme is active. See [Design-Decisions.md](Design-Decisions.md) entry 36.

**Not yet built** — noted here to guide future folder/module structure:

- `ProgressView` — displays practice history over time. (Superseded in intent — see below.)
- Song-based practice session — a mode that steps through an imported `Song`'s events instead of `usePracticeSession`'s random targets. Will eventually back a real `SongLibraryPage`/`TestModePage`.
- Disk persistence for imported songs (via IPC → main) — songs currently exist only in memory for the running session; `SongLibraryPage` is a placeholder until this exists.

## Data Flow

```
Mic → Web Audio stream → PitchDetector → detected note → UI feedback (KeyboardDisplay)
                                                              ↓
                                                      PracticeSession logic

MIDI file → IPC (main: file picker + raw bytes) → parseMidiFile (renderer) → Song → SongEditor
                                                                                        ↓
                                                          (future) Song-based practice session
                                                                                        ↓
                                                          (future) persistence (via IPC → main)
```

The mic → pitch detection → `PitchReadout`/`KeyboardDisplay` (sharing one computed `PitchReading`, see [Design-Decisions.md](Design-Decisions.md) entry 13) → `PracticeSession` path is fully implemented. The song-import path (MIDI file → `Song` → `SongEditor`) is implemented through editing; a song-based practice session and disk persistence for songs are still anticipated, not built.

## Security Boundary

The renderer never touches the filesystem directly. All filesystem access is proxied through the preload script and handled by the main process — standard Electron security practice, and it keeps a clean separation between "UI/audio" concerns and "system/storage" concerns. `dialog:selectMidiFile` (Milestone 5) is the first implementation of this: main owns the native file dialog and the raw `fs.readFile` call; the renderer only ever receives already-read bytes. Future persistence (saving imported songs, practice history) will follow the same pattern.

## Out of Scope (for now)

MIDI keyboard input is not part of the architecture — the app is designed around microphone-based pitch detection only. See [Design-Decisions.md](Design-Decisions.md) for why.
