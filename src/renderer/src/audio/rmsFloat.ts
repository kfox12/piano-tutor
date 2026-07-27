/**
 * Computes RMS (root-mean-square) amplitude from time-domain samples as
 * returned by AnalyserNode.getFloatTimeDomainData — already in the -1..1
 * range, unlike the byte API's 128-centered bytes. See rms.ts for that case.
 */
export function rmsFloat(samples: Float32Array): number {
  let sumOfSquares = 0
  for (let i = 0; i < samples.length; i++) {
    sumOfSquares += samples[i] * samples[i]
  }
  return Math.sqrt(sumOfSquares / samples.length)
}
