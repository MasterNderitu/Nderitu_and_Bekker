/**
 * What this actually computes, precisely:
 *
 * For every round in your history (after the first 10), look at the
 * 10 rounds immediately before it. Count how many of those 10 were
 * exactly 1.0x (instant crash). That count (0-10) is the "group" this
 * window belongs to. Then look at what the NEXT round actually was:
 * did it land >= threshold (default 1.5x) or below it?
 *
 * Group all windows by their 1.0x-count, and for each group, report
 * the REAL observed percentage of next-rounds that were >= threshold,
 * PLUS how many data points that percentage is actually based on.
 *
 * This is honest historical frequency counting — every number here is
 * literally "X out of Y times this happened in your data," nothing is
 * modeled, smoothed, or estimated. A group with a small sample size
 * (n=2, n=3) is shown as having a small sample size, not hidden behind
 * a confident-looking percentage.
 *
 * WHAT THIS DOES NOT DO: predict the next round. If you check the
 * percentages across groups and they're all roughly similar regardless
 * of the 1.0x count, that itself is a real, honest finding — it means
 * this feature doesn't carry predictive signal in your data, same
 * conclusion the independence test in aviator-analysis would show
 * from a different angle. This tool won't hide that from you or dress
 * it up as something more than it is.
 */

export interface Round {
  roundId: string;
  multiplier: number;
}

export interface GroupResult {
  crashCountInPrevious10: number; // 0-10
  sampleSize: number; // how many historical windows had exactly this count
  nextRoundAboveThresholdCount: number;
  nextRoundBelowThresholdCount: number;
  observedPercentageAboveThreshold: number; // real observed %, or -1 if sampleSize is 0
}

export interface AnalysisReport {
  threshold: number;
  totalWindowsAnalyzed: number;
  groups: GroupResult[];
}

export function analyzeByPreviousCrashCount(
  rounds: Round[],
  threshold: number = 1.5,
  windowSize: number = 10
): AnalysisReport {
  const multipliers = rounds.map((r) => r.multiplier);

  if (multipliers.length <= windowSize) {
    throw new Error(
      `Need more than ${windowSize} rounds to run this analysis; have ${multipliers.length}.`
    );
  }

  // groupTally[k] = { above, below } for windows where exactly k of the
  // previous `windowSize` rounds were 1.0x
  const groupTally: Record<number, { above: number; below: number }> = {};
  for (let k = 0; k <= windowSize; k++) {
    groupTally[k] = { above: 0, below: 0 };
  }

  let totalWindows = 0;

  for (let i = windowSize; i < multipliers.length; i++) {
    const window = multipliers.slice(i - windowSize, i);
    const crashCount = window.filter((m) => m === 1.0).length;
    const nextRound = multipliers[i];

    if (nextRound >= threshold) {
      groupTally[crashCount].above += 1;
    } else {
      groupTally[crashCount].below += 1;
    }
    totalWindows += 1;
  }

  const groups: GroupResult[] = [];
  for (let k = 0; k <= windowSize; k++) {
    const { above, below } = groupTally[k];
    const sampleSize = above + below;
    groups.push({
      crashCountInPrevious10: k,
      sampleSize,
      nextRoundAboveThresholdCount: above,
      nextRoundBelowThresholdCount: below,
      observedPercentageAboveThreshold: sampleSize > 0 ? (above / sampleSize) * 100 : -1,
    });
  }

  return {
    threshold,
    totalWindowsAnalyzed: totalWindows,
    groups: groups.filter((g) => g.sampleSize > 0), // don't show groups that never occurred
  };
}

/**
 * Also computes the overall (unconditional) rate, so you can directly
 * compare each group's percentage against the baseline — if a group's
 * percentage is close to the overall rate, that group's crash-count
 * isn't telling you anything extra.
 */
export function overallRateAboveThreshold(rounds: Round[], threshold: number = 1.5): number {
  const multipliers = rounds.map((r) => r.multiplier);
  if (multipliers.length === 0) return -1;
  const above = multipliers.filter((m) => m >= threshold).length;
  return (above / multipliers.length) * 100;
}
