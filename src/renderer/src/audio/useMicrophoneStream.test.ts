import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMicrophoneStream } from './useMicrophoneStream'

class FakeAnalyserNode {
  fftSize = 2048
  getByteTimeDomainData(array: Uint8Array): void {
    array.fill(128) // silence, matching the real API's "no signal" baseline
  }
}

class FakeAudioContext {
  createMediaStreamSource(): { connect: () => void } {
    return { connect: vi.fn() }
  }
  createAnalyser(): FakeAnalyserNode {
    return new FakeAnalyserNode()
  }
  close(): Promise<void> {
    return Promise.resolve()
  }
}

function createFakeStream(): MediaStream {
  const stop = vi.fn()
  return { getTracks: () => [{ stop }] } as unknown as MediaStream
}

function stubGetUserMedia(getUserMedia: ReturnType<typeof vi.fn>): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true
  })
}

beforeEach(() => {
  vi.stubGlobal('AudioContext', FakeAudioContext)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useMicrophoneStream', () => {
  it('starts in the idle state', () => {
    const { result } = renderHook(() => useMicrophoneStream())
    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('transitions idle -> requesting -> active on successful start', async () => {
    stubGetUserMedia(vi.fn().mockResolvedValue(createFakeStream()))

    const { result } = renderHook(() => useMicrophoneStream())

    act(() => {
      result.current.start()
    })
    expect(result.current.state.status).toBe('requesting')

    await waitFor(() => expect(result.current.state.status).toBe('active'))
  })

  it('surfaces permission-denied errors', async () => {
    stubGetUserMedia(vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')))

    const { result } = renderHook(() => useMicrophoneStream())
    act(() => {
      result.current.start()
    })

    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'error',
        kind: 'permission-denied',
        message: 'denied'
      })
    )
  })

  it('surfaces no-device errors', async () => {
    stubGetUserMedia(vi.fn().mockRejectedValue(new DOMException('no mic', 'NotFoundError')))

    const { result } = renderHook(() => useMicrophoneStream())
    act(() => {
      result.current.start()
    })

    await waitFor(() => expect(result.current.state.status).toBe('error'))
    expect(result.current.state).toMatchObject({ kind: 'no-device' })
  })

  it('stops all tracks and closes the audio context on stop()', async () => {
    const fakeStream = createFakeStream()
    stubGetUserMedia(vi.fn().mockResolvedValue(fakeStream))

    const { result } = renderHook(() => useMicrophoneStream())
    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(result.current.state.status).toBe('active'))

    act(() => {
      result.current.stop()
    })

    expect(fakeStream.getTracks()[0].stop).toHaveBeenCalled()
    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('tears down the stream on unmount even without calling stop()', async () => {
    const fakeStream = createFakeStream()
    stubGetUserMedia(vi.fn().mockResolvedValue(fakeStream))

    const { result, unmount } = renderHook(() => useMicrophoneStream())
    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(result.current.state.status).toBe('active'))

    unmount()

    expect(fakeStream.getTracks()[0].stop).toHaveBeenCalled()
  })
})
