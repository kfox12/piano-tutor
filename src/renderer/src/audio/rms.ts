/**
 * Computes RMS (root-mean-square) amplitude from time-domain samples as
 * returned by AnalyserNode.getByteTimeDomainData — unsigned bytes centered
 * on 128 (silence). Result is roughly in the 0..1 range.
 */
export function rms(samples: Uint8Array): number {
  let sumOfSquares = 0
  for (let i = 0; i < samples.length; i++) {
    const normalized = (samples[i] - 128) / 128
    sumOfSquares += normalized * normalized
  }
  return Math.sqrt(sumOfSquares / samples.length)
}
