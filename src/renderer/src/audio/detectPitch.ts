export interface DetectPitchOptions {
  minFrequency?: number
  maxFrequency?: number
  threshold?: number
}

const DEFAULT_MIN_FREQUENCY = 27.5 // A0, lowest piano note
const DEFAULT_MAX_FREQUENCY = 4186 // C8, highest piano note
const DEFAULT_THRESHOLD = 0.1 // per the original YIN paper

/**
 * Estimates the fundamental frequency of `samples` using the YIN algorithm,
 * chosen over naive autocorrelation because its cumulative-mean-normalized
 * difference function resists locking onto a harmonic of the true pitch
 * (an "octave error") — a common failure mode with piano's rich overtones.
 * Returns null when no periodicity clears `threshold` (silence/noise).
 */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  options: DetectPitchOptions = {}
): number | null {
  const minFrequency = options.minFrequency ?? DEFAULT_MIN_FREQUENCY
  const maxFrequency = options.maxFrequency ?? DEFAULT_MAX_FREQUENCY
  const threshold = options.threshold ?? DEFAULT_THRESHOLD

  const minLag = Math.max(1, Math.floor(sampleRate / maxFrequency))
  const maxLag = Math.min(samples.length - 1, Math.ceil(sampleRate / minFrequency))
  if (maxLag <= minLag) {
    return null
  }

  // Window length for the comparison at each lag; keeps samples[j + tau] in
  // bounds for every tau up to maxLag.
  const windowSize = samples.length - maxLag
  if (windowSize <= 0) {
    return null
  }

  // Step 1: difference function d(tau) = sum((x[j] - x[j+tau])^2).
  const diff = new Float32Array(maxLag + 1)
  for (let tau = 1; tau <= maxLag; tau++) {
    let sum = 0
    for (let j = 0; j < windowSize; j++) {
      const delta = samples[j] - samples[j + tau]
      sum += delta * delta
    }
    diff[tau] = sum
  }

  // Step 2: cumulative mean normalized difference function (CMNDF) — the
  // step that actually fixes octave errors, by penalizing larger tau unless
  // they're a genuinely better match than the running average so far.
  const cmndf = new Float32Array(maxLag + 1)
  cmndf[0] = 1
  let runningSum = 0
  for (let tau = 1; tau <= maxLag; tau++) {
    runningSum += diff[tau]
    cmndf[tau] = diff[tau] / (runningSum / tau)
  }

  // Step 3: absolute threshold search — take the first dip below threshold
  // (not the global minimum), then walk forward while still improving, to
  // land on the smallest-tau (i.e. true fundamental, not a sub-harmonic).
  let tauEstimate = -1
  for (let tau = minLag; tau <= maxLag; tau++) {
    if (cmndf[tau] < threshold) {
      while (tau + 1 <= maxLag && cmndf[tau + 1] < cmndf[tau]) {
        tau++
      }
      tauEstimate = tau
      break
    }
  }
  if (tauEstimate === -1) {
    return null
  }

  // Step 4: parabolic interpolation around the chosen minimum for sub-sample
  // accuracy (needed for meaningful cents-offset precision downstream).
  const preciseTau = parabolicInterpolate(cmndf, tauEstimate, maxLag)
  return sampleRate / preciseTau
}

function parabolicInterpolate(cmndf: Float32Array, tau: number, maxLag: number): number {
  if (tau <= 0 || tau >= maxLag) {
    return tau
  }
  const s0 = cmndf[tau - 1]
  const s1 = cmndf[tau]
  const s2 = cmndf[tau + 1]
  const denominator = s0 - 2 * s1 + s2
  if (denominator === 0) {
    return tau
  }
  return tau + (0.5 * (s0 - s2)) / denominator
}
