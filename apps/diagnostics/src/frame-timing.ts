export interface FrameTimingResult {
  fps: number;
  median: number;
  p95: number;
  duration: number;
  count: number;
}

export function hasEnoughFrameSample(duration: number, intervalCount: number): boolean {
  return duration >= 2000 && intervalCount >= 30;
}

export function summarizeFrameIntervals(intervals: readonly number[], duration: number): FrameTimingResult | null {
  if (!intervals.length || !intervals.every((interval) => Number.isFinite(interval) && interval > 0)) return null;
  const sorted = [...intervals].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, interval) => sum + interval, 0) / sorted.length;
  const middle = Math.floor((sorted.length - 1) / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[middle] + sorted[middle + 1]) / 2
    : sorted[middle];
  return {
    fps: 1000 / mean,
    median,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    duration,
    count: sorted.length,
  };
}
