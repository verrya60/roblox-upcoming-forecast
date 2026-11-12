// Roblox Up-and-Coming top-10 forecast (Node 22, standard library only).
//
// THE EDGE: the chart churns. Between consecutive reads the top 10 changes a
// median of 6 places, and a frozen forecast (the house baseline) scores
// -43.5 on the practice window because it concentrates all probability on
// the chart as it stood. Rank velocity is anti-predictive here: ranks
// mean-revert, so extrapolating a game's recent rise makes the forecast
// worse (tested: velocity horizons of 12h/36h/72h all score far below a
// no-velocity spread). What wins is spreading probability WIDELY around each
// place, so that whichever neighbour actually lands there still gets a
// meaningful probability instead of the unnamed-share floor.
//
// Method (validated by rolling backtest on the 34-read practice history):
//   - Take the last read's chart.
//   - For each place k (1..10), give probability to the games ranked k-6..k+6
//     with Gaussian weights (sigma 3.0), scaled so the place sums to 0.7 and
//     0.3 stays unnamed (shared equally by every game not named there).
//   - top10 is the chart's top 10 as it stood (the best single guess, and
//     the tie-break only).
// Rolling backtest (forecast from read k, scored on the next 6 reads):
//   frozen baseline  -42.98 / -49.41 / -37.71  (mean -43.4)
//   this spread      -35.30 / -42.68 / -28.41  (mean -35.5, +7.9 better)
//   (width 6, sigma 3.0, named 0.7 was the best of a grid over
//    width 3-6, sigma 1.5-3.0, named 0.7-0.9.)
//
// Reads $MAKEFUN_INPUT_DIR (else /input) and writes $MAKEFUN_OUTPUT_DIR (else
// /output). Deterministic: no clock, no randomness, no network.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const WIDTH = 6;
const SIGMA = 3.0;
const NAMED_SUM = 0.7;

interface Row {
  rank: number;
  universe_id: number;
}

const task = JSON.parse(readFileSync(join(INPUT_DIR, 'task.json'), 'utf8')) as {
  places: number;
  output: string;
};
const lines = readFileSync(join(INPUT_DIR, 'history.ndjson'), 'utf8')
  .split('\n')
  .filter((l) => l !== '');
const last = JSON.parse(lines[lines.length - 1]!) as { up_and_coming: Row[] };
const chart = [...last.up_and_coming]
  .sort((a, b) => a.rank - b.rank)
  .map((r) => r.universe_id);

const probabilities: Array<{ universe_id: number; place: number; p: number }> = [];
for (let place = 1; place <= task.places && place <= chart.length; place++) {
  const weights = new Map<number, number>();
  for (let d = -WIDTH; d <= WIDTH; d++) {
    const r = place + d;
    if (r < 1 || r > chart.length) continue;
    weights.set(chart[r - 1]!, Math.exp(-(d * d) / (2 * SIGMA * SIGMA)));
  }
  let total = 0;
  for (const w of weights.values()) total += w;
  for (const [uid, w] of weights) {
    probabilities.push({ universe_id: uid, place, p: (NAMED_SUM * w) / total });
  }
}

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(
  join(OUTPUT_DIR, task.output),
  `${JSON.stringify({ probabilities, top10: chart.slice(0, task.places) })}\n`,
);
