import { loadRounds } from "./loader";
import { analyzeByPreviousCrashCount, overallRateAboveThreshold } from "./analyzer";

/**
 * Usage:
 *   npx ts-node src/cli.ts <rounds-file.json> [threshold]
 *
 * threshold defaults to 1.5 (matching "next round between 1.0 and 1.5"
 * framed as "next round below 1.5" vs "at or above 1.5").
 */
function main() {
  const dataFile = process.argv[2] || "data/rounds.json";
  const threshold = process.argv[3] ? Number(process.argv[3]) : 1.5;

  const rounds = loadRounds(dataFile);
  console.log(`Loaded ${rounds.length} rounds from ${dataFile}`);
  console.log(`Threshold: ${threshold}x\n`);

  const overall = overallRateAboveThreshold(rounds, threshold);
  console.log(`Overall (unconditional) rate of next-round >= ${threshold}x across ALL rounds: ${overall.toFixed(2)}%`);
  console.log(`(Compare each group below against this baseline. If a group's % is close to this number, that group's crash-count isn't telling you anything the baseline doesn't already.)\n`);

  const report = analyzeByPreviousCrashCount(rounds, threshold);

  console.log(`=== REAL OBSERVED OUTCOMES, GROUPED BY # OF 1.0x IN PREVIOUS 10 ROUNDS ===\n`);
  console.log(`(Total historical windows analyzed: ${report.totalWindowsAnalyzed})\n`);

  for (const g of report.groups) {
    const confidenceNote =
      g.sampleSize < 5
        ? "  ⚠ very small sample — treat this percentage as noise, not a real rate"
        : g.sampleSize < 20
        ? "  ⚠ small sample — interpret with caution"
        : "";

    console.log(
      `${g.crashCountInPrevious10}/10 rounds were 1.0x  ->  next round >= ${threshold}x: ` +
        `${g.observedPercentageAboveThreshold.toFixed(1)}%  (${g.nextRoundAboveThresholdCount} of ${g.sampleSize} times)${confidenceNote}`
    );
  }

  console.log(
    `\nEvery percentage above is a literal count from your data ("X times out of Y this exact pattern occurred"), not a model or estimate.`
  );
  console.log(
    `If you want to check whether any of these differences are real or just small-sample noise, run the independence test in the aviator-analysis project against the same data.`
  );
}

main();
