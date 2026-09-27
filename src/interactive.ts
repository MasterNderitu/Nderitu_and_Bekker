import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { loadRounds } from "./loader";
import { analyzeByPreviousCrashCount, overallRateAboveThreshold } from "./analyzer";

/**
 * Interactive mode: prompts for 10 round outcomes, then looks up the
 * REAL historical stats for that exact "count of 1.0x" pattern from
 * your dataset. This is a lookup against real historical counts, not
 * a live prediction generated from your 10 numbers — the numbers you
 * type only determine WHICH pre-computed historical group gets shown
 * to you.
 *
 * Usage: npm run check
 */

const TWO_DECIMAL_PATTERN = /^\d+\.\d{2}$/;

async function promptForRounds(rl: readline.Interface): Promise<number[]> {
  console.log("Enter the last 10 round outcomes, one at a time.");
  console.log("Format: 2 decimal places, e.g. 1.00, 2.34, 9.50\n");

  const values: number[] = [];
  for (let i = 1; i <= 10; i++) {
    let raw = "";
    let valid = false;
    while (!valid) {
      raw = (await rl.question(`Round ${i}: `)).trim();
      if (!TWO_DECIMAL_PATTERN.test(raw)) {
        console.log(`  Invalid format. Please enter a number with exactly 2 decimal places (e.g. 1.00, 2.50).`);
        continue;
      }
      const num = Number(raw);
      if (num < 1.0) {
        console.log(`  Multipliers can't be below 1.00. Try again.`);
        continue;
      }
      valid = true;
      values.push(num);
    }
  }
  return values;
}

async function main() {
  const dataFile = process.argv[2] || "data/rounds.json";
  const threshold = process.argv[3] ? Number(process.argv[3]) : 1.5;

  const rl = readline.createInterface({ input, output });

  try {
    const rounds = loadRounds(dataFile);
    console.log(`(Historical dataset loaded: ${rounds.length} rounds from ${dataFile})\n`);

    const enteredRounds = await promptForRounds(rl);

    const crashCount = enteredRounds.filter((m) => m === 1.0).length;
    console.log(`\nYou entered: ${enteredRounds.map((n) => n.toFixed(2)).join(", ")}`);
    console.log(`Number of 1.00x in what you entered: ${crashCount}/10\n`);

    const overall = overallRateAboveThreshold(rounds, threshold);
    const report = analyzeByPreviousCrashCount(rounds, threshold);
    const matchingGroup = report.groups.find((g) => g.crashCountInPrevious10 === crashCount);

    console.log(`=== HISTORICAL LOOKUP (not a prediction) ===\n`);
    console.log(`Overall baseline rate of next-round >= ${threshold}x across all ${rounds.length} historical rounds: ${overall.toFixed(2)}%\n`);

    if (!matchingGroup) {
      console.log(
        `A pattern of exactly ${crashCount}/10 rounds being 1.00x has NEVER occurred in your ${rounds.length}-round dataset.`
      );
      console.log(`No historical data exists for this exact pattern — nothing honest to report here.`);
    } else {
      const confidenceNote =
        matchingGroup.sampleSize < 5
          ? " (⚠ VERY SMALL SAMPLE — not statistically meaningful, treat as noise)"
          : matchingGroup.sampleSize < 20
          ? " (⚠ small sample — interpret with caution)"
          : "";

      console.log(
        `The next round has historically been >= ${threshold}x in ${matchingGroup.observedPercentageAboveThreshold.toFixed(1)}% ` +
          `of ${matchingGroup.sampleSize} matching case(s) for this exact pattern.${confidenceNote}`
      );
      console.log(
        `\nCompare to baseline (${overall.toFixed(2)}%): ${
          Math.abs(matchingGroup.observedPercentageAboveThreshold - overall) < 5
            ? "close to baseline — this pattern doesn't appear to carry extra signal in your data."
            : "notably different from baseline — but check the sample size above before reading anything into this."
        }`
      );
    }

    console.log(
      `\nReminder: this is a lookup of what happened historically after this exact pattern, not a forecast. The numbers you typed determine which historical group gets shown — they do not generate a new prediction.`
    );
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", (err as Error).message || String(err));
  process.exit(1);
});
