import * as fs from "fs";
import * as path from "path";
import { Round } from "./analyzer";

export function loadRounds(filePath: string): Round[] {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  const raw = fs.readFileSync(abs, "utf-8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.rounds)) {
    throw new Error(`Expected { rounds: [{ roundId, multiplier }] } shape in ${abs}`);
  }
  return data.rounds.map((r: any) => ({ roundId: String(r.roundId), multiplier: Number(r.multiplier) }));
}
