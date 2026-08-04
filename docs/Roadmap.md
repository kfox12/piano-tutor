# Roadmap

This roadmap tracks the piano tutor app's milestones. Scope is **microphone-based practice only** — no MIDI keyboard support (see [Design-Decisions.md](Design-Decisions.md) for the reasoning).

## Completed Milestones

**Milestone 0: Project Initialization** — planning docs, Electron + TypeScript + React scaffold (electron-vite, ESLint/Prettier, Vitest), merged to `main`.

**Milestone 1: Microphone Input Capture** — mic permission request, audio stream capture via the Web Audio API, and a live level meter, on `feature/microphone-input`. Verified manually: the meter reacts to real sound.

**Milestone 2: Pitch Detection** — hand-rolled YIN algorithm converting captured audio into a detected note/frequency in real time, on `feature/pitch-detection`. Verified manually against a real piano across low/mid/high registers. Note: single-note (monophonic) detection only — simultaneous multi-key input is an explicit, documented scope boundary, not a bug (see [Design-Decisions.md](Design-Decisions.md) entry 11).

**Milestone 3: Piano Keyboard Renderer & Visual Feedback** — SVG-rendered 88-key on-screen keyboard, on `feature/piano-renderer`. Click a key to set it as the target note; correct/incorrect feedback compares the currently detected note against it (exact name+octave match). A manual click-to-select target picker stands in for Practice Mode until Milestone 4 exists. Verified manually against a real piano: sizing/scaling, click-to-target, and correct/incorrect feedback all work as intended.

**Milestone 4: Practice Mode / Lesson Logic** — automated random-note practice sessions, on `feature/practice-mode`. "Start Practice" begins an open-ended session (random target within a default one-octave range); playing the correct note immediately advances to a new target — no pause, matching the intent of just showing which note to play next rather than scoring accuracy. Manual click-to-select (Milestone 3) is disabled while a session is active. Session state (`correctCount`) is in-memory only; persistence is Milestone 5's job. Verified manually against a real piano: immediate advance, manual-click disabling, and the "Last session: N correct" summary after Stop all work as intended.

**Milestone 5: Song Import (MIDI) & Correction Editor** — import a song from a MIDI file, on `feature/song-import`. A hand-rolled Standard MIDI File parser converts the file into the app's internal `Song` model (an ordered list of note/chord events, no rhythm — the practice engine only needs a pitch sequence, per direction from the user). Notes starting within 50ms of each other are grouped into chord events; a correction editor lets the user add, delete, or modify notes/chords afterward. Entirely in-memory for this milestone — disk persistence and an actual song-based practice session are deferred to follow-on slices. See [Design-Decisions.md](Design-Decisions.md) entries 26-33.

_Note: the originally-planned "Progress Tracking" milestone (streaks/accuracy over time) was dropped — not what the user actually wants. The real goal is practicing specific songs, starting with this import pipeline._

**UI Redesign** — restyled the app to the spec in [ui_redesign.md](ui_redesign.md), on `feature/ui-redesign`. Introduced multi-page navigation (Home, Import Song, Song Library, Practice Mode, Test Mode) behind a top nav that appears once a mode is selected, a card-based Home dashboard, and a light/dark theme toggle. Existing functionality (mic practice, MIDI import/edit) was relocated into `PracticeModePage`/`ImportSongPage` unchanged; Song Library and Test Mode ship as "Coming soon" placeholders since their underlying features aren't built yet. Purely a presentation-layer change — no audio/pitch/keyboard/song logic was touched. See [Design-Decisions.md](Design-Decisions.md) entries 35-37.

**Import Song: mic auto-start & auto-advance** — two follow-up fixes on the same branch, made after hands-on use surfaced real gaps. First, the mic wasn't listening at all on the Import Song page (the redesign had scoped it to `PracticeModePage` only) — now it auto-starts the moment an import succeeds. Second, playing the previewed note/chord correctly now auto-advances to the next one (`useSongAutoAdvance`), the same immediate-advance feel as Practice Mode, instead of requiring manual Prev/Next for every note — this is a small, scoped slice of what Milestone 6 below calls "song-based practice," pulled forward because it's what "import a song and start playing it" actually implies. It does **not** include scoring, a dedicated practice page, or persistence — those remain Milestone 6. See [Design-Decisions.md](Design-Decisions.md) entries 38-39.

## Current Milestone

**Song-based practice & persistence (Milestone 6, not yet named/designed)**

What's left after the Import Song auto-advance fix above: (1) turning that note-stepping into an actual scored/trackable practice session (with a completion state, and a decision on whether it lives on `PracticeModePage`/`TestModePage` instead of the Import Song preview); (2) saving imported/edited songs to disk (via preload/IPC to the main process) so they persist across app restarts. This is also what `SongLibraryPage` and `TestModePage` (currently placeholders, see UI Redesign above) need before they can show real content. Not yet started — design not yet discussed.

Milestones are strictly ordered since each depends on the previous one's output. Each is scoped to roughly a month of part-time work.
