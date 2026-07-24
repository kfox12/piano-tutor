import { useEffect, useRef } from 'react'

/**
 * Runs `onFrame` on a requestAnimationFrame loop for as long as `analyser`
 * is non-null, and cleans up automatically when it changes or on unmount.
 */
export function useAnalyserFrame(
  analyser: AnalyserNode | null,
  onFrame: (analyser: AnalyserNode) => void
): void {
  const onFrameRef = useRef(onFrame)
  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useEffect(() => {
    if (!analyser) {
      return
    }

    let frameId: number
    const tick = (): void => {
      onFrameRef.current(analyser)
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frameId)
  }, [analyser])
}
