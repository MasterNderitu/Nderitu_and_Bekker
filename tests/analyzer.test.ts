import { describe, it, expect } from "vitest";
import { analyzeByPreviousCrashCount, overallRateAboveThreshold, Round } from "../src/analyzer";

function mkRounds(multipliers: number[]): Round[] {
  return multipliers.map((m, i) => ({ roundId: String(i + 1), multiplier: m }));
}

describe("overallRateAboveThreshold", () => {
  it("computes the correct real percentage", () => {
    const rounds = mkRounds([1.0, 2.0, 1.0, 3.0]); // 2 of 4 >= 1.5
    expect(overallRateAboveThreshold(rounds, 1.5)).toBe(50);
  });

  it("returns -1 for empty input rather than dividing by zero", () => {
    expect(overallRateAboveThreshold([], 1.5)).toBe(-1);
  });
});

describe("analyzeByPreviousCrashCount", () => {
  it("throws a clear error when there isn't enough data", () => {
    const rounds = mkRounds([1, 2, 3]);
    expect(() => analyzeByPreviousCrashCount(rounds, 1.5, 10)).toThrow(/Need more than/);
  });

  it("correctly counts a hand-constructed scenario", () => {
    // 10 rounds, all 1.0x, followed by one round of 2.0 (above threshold)
    const window1 = new Array(10).fill(1.0);
    const rounds = mkRounds([...window1, 2.0]);
    const report = analyzeByPreviousCrashCount(rounds, 1.5, 10);

    expect(report.totalWindowsAnalyzed).toBe(1);
    const group10 = report.groups.find((g) => g.crashCountInPrevious10 === 10);
    expect(group10).toBeDefined();
    expect(group10?.sampleSize).toBe(1);
    expect(group10?.nextRoundAboveThresholdCount).toBe(1);
    expect(group10?.observedPercentageAboveThreshold).toBe(100);
  });

  it("only reports groups that actually occurred (sampleSize > 0)", () => {
    const rounds = mkRounds([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 3.0]);
    const report = analyzeByPreviousCrashCount(rounds, 1.5, 10);
    // Every group in the output must have sampleSize > 0
    for (const g of report.groups) {
      expect(g.sampleSize).toBeGreaterThan(0);
    }
  });

  it("never fabricates a percentage for a group with zero samples", () => {
    // With very limited data, most crash-counts (0-10) will never occur —
    // those should simply not appear in output, not show a fake 0% or NaN.
    const rounds = mkRounds([1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 5.0]);
    const report = analyzeByPreviousCrashCount(rounds, 1.5, 10);
    expect(report.groups.every((g) => !Number.isNaN(g.observedPercentageAboveThreshold))).toBe(true);
    expect(report.groups.length).toBe(1); // only the "10/10" group ever occurred
  });
});
