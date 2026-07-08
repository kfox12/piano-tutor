import { useCallback, useEffect, useRef, useState } from 'react'

export type MicrophoneErrorKind = 'permission-denied' | 'no-device' | 'unknown'

export type MicrophoneState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'active'; analyser: AnalyserNode }
  | { status: 'error'; kind: MicrophoneErrorKind; message: string }

interface UseMicrophoneStreamResult {
  state: MicrophoneState
  start: () => void
  stop: () => void
}

function toErrorKind(error: unknown): MicrophoneErrorKind {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'permission-denied'
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'no-device'
    }
  }
  return 'unknown'
}

function toErrorMessage(error: unknown): string {
  // DOMException doesn't reliably inherit from Error across environments
  // (e.g. jsdom), so it needs its own check even though both expose `.message`.
  if (error instanceof DOMException || error instanceof Error) {
    return error.message
  }
  return 'Unknown microphone error'
}

export function useMicrophoneStream(): UseMicrophoneStreamResult {
  const [state, setState] = useState<MicrophoneState>({ status: 'idle' })
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const teardown = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
  }, [])

  const start = useCallback(() => {
    setState({ status: 'requesting' })
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream
        const audioContext = new AudioContext()
        audioContextRef.current = audioContext
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 2048
        source.connect(analyser)
        setState({ status: 'active', analyser })
      })
      .catch((error: unknown) => {
        setState({ status: 'error', kind: toErrorKind(error), message: toErrorMessage(error) })
      })
  }, [])

  const stop = useCallback(() => {
    teardown()
    setState({ status: 'idle' })
  }, [teardown])

  useEffect(() => {
    return () => teardown()
  }, [teardown])

  return { state, start, stop }
}
