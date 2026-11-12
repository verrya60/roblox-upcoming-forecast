# Roblox Up-and-Coming Top-10 Forecast

Entry for the make.fun bounty **"Predict Roblox's Up-and-Coming top 10"**
(`roblox-up-and-coming-forecast-01`, $500). The program reads the chart's
history at `/input/history.ndjson` and writes one forecast to
`/output/forecast.json`: a probability for each game at each of the top 10
places, plus the top 10 in order.

## The edge

The chart churns. Between consecutive reads the top 10 changes a median of
6 places, so a frozen forecast (the house baseline, which concentrates all
probability on the chart as it stood) scores -43.5 on the practice window.
Rank velocity is anti-predictive here: ranks mean-revert, so extrapolating
a game's recent rise makes the forecast worse (velocity horizons of 12h /
36h / 72h all scored far below a no-velocity spread in rolling backtests).

What wins is spreading probability **widely** around each place, so that
whichever neighbour actually lands there still gets a meaningful
probability instead of the unnamed-share floor.

## Method

- Take the last read's chart.
- For each place k (1..10), give probability to the games ranked k-6..k+6
  with Gaussian weights (sigma 3.0), scaled so the place sums to 0.7 and
  0.3 stays unnamed.
- top10 is the chart's top 10 as it stood.

Rolling backtest (forecast from read k, scored on the next 6 reads):

| split | frozen baseline | this spread |
|-------|----------------|-------------|
| k=20  | -42.98         | -35.30      |
| k=25  | -49.41         | -42.68      |
| k=28  | -37.71         | -28.41      |
| mean  | -43.4          | -35.5 (+7.9) |

Width 6, sigma 3.0, named 0.7 was the best of a grid over width 3-6,
sigma 1.5-3.0, named 0.7-0.9.

## Files

- `main.ts` — the forecaster (TypeScript, Node 22, standard library only).
- `LICENSE` — MIT.

Deterministic: no clock, no randomness, no network.
