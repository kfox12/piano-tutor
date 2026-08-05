import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import { join, basename } from 'path'
import { readFile, writeFile, readdir, unlink, mkdir } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

interface SelectedMidiFile {
  fileName: string
  data: Uint8Array
}

async function selectMidiFile(): Promise<SelectedMidiFile | null> {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'MIDI Files', extensions: ['mid', 'midi'] }],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const filePath = result.filePaths[0]
  const data = await readFile(filePath)
  return { fileName: basename(filePath), data: new Uint8Array(data) }
}

// Main treats a song as an opaque document it reads/writes whole — the
// renderer owns the real Song shape and all domain logic (see
// Design-Decisions.md entry 28). `songId`/`title`/`events` are the only
// fields main itself looks at, to build a cheap list without loading every
// song's full content.
interface SongDocument {
  songId: string
  title: string
  events: unknown[]
  [key: string]: unknown
}

interface StoredSongSummary {
  songId: string
  title: string
  eventCount: number
}

function songsDir(): string {
  return join(app.getPath('userData'), 'songs')
}

async function songFilePath(songId: string): Promise<string> {
  const dir = songsDir()
  await mkdir(dir, { recursive: true })
  return join(dir, `${songId}.json`)
}

async function saveSong(song: SongDocument): Promise<void> {
  const filePath = await songFilePath(song.songId)
  await writeFile(filePath, JSON.stringify(song, null, 2), 'utf-8')
}

async function listSongs(): Promise<StoredSongSummary[]> {
  const dir = songsDir()
  await mkdir(dir, { recursive: true })
  const files = await readdir(dir)

  const summaries: StoredSongSummary[] = []
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const raw = await readFile(join(dir, file), 'utf-8')
      const parsed = JSON.parse(raw) as Partial<SongDocument>
      summaries.push({
        songId: parsed.songId ?? file.replace(/\.json$/, ''),
        title: parsed.title ?? 'Untitled',
        eventCount: Array.isArray(parsed.events) ? parsed.events.length : 0
      })
    } catch {
      // Skip a corrupt/unreadable file rather than failing the whole list.
    }
  }
  return summaries
}

async function loadSong(songId: string): Promise<SongDocument> {
  const filePath = await songFilePath(songId)
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as SongDocument
}

async function deleteSong(songId: string): Promise<void> {
  const filePath = await songFilePath(songId)
  await unlink(filePath)
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('dialog:selectMidiFile', selectMidiFile)
  ipcMain.handle('song:save', (_event, song: SongDocument) => saveSong(song))
  ipcMain.handle('song:list', () => listSongs())
  ipcMain.handle('song:load', (_event, songId: string) => loadSong(songId))
  ipcMain.handle('song:delete', (_event, songId: string) => deleteSong(songId))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
