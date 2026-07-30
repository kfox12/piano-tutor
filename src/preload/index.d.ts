import { ElectronAPI } from '@electron-toolkit/preload'

export interface SelectedMidiFile {
  fileName: string
  data: Uint8Array
}

export interface PianoTutorApi {
  selectMidiFile: () => Promise<SelectedMidiFile | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PianoTutorApi
  }
}
