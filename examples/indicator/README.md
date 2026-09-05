# Indicator examples

These demos use [techan.js](https://github.com/trasherdk/techan.js) indicators with **Kraken historic OHLC** via the shared proxy at `kraken/api/ohlc.php`.

## Shared module

`kraken-data.js` loads markets, resolves pairs, and fetches OHLC bars. Include it from any indicator subdirectory:

```html
<script src="../theme.js"></script>
<script src="../kraken-data.js"></script>
<link href="../indicator.css" rel="stylesheet">
```

`theme.js` applies light/dark mode (same preference as the Kraken charts: `techan.kraken.theme` in localStorage) and adds a header theme toggle.

Plot colours for all indicators live in **`indicator.css`** — do not add per-indicator `styles.css` files for migrated examples.

Each `index.html` includes a sample link in the header:

```html
<p class="subtitle">Kraken historic OHLC · <a data-indicator-try="symbol=BTC&currency=USD&interval=15m"></a></p>
```

`theme.js` sets the `href` and label (e.g. `Try: /indicator/atr/?symbol=BTC&currency=USD&interval=15m`).

## URL parameters

| Param | Default | Description |
|-------|---------|-------------|
| `symbol` or `crypto` | `BTC` | Base asset (e.g. BTC, ETH, XMR) |
| `currency` | `USD` | Quote asset (EUR, USD, …) |
| `interval` | `1h` | Candle interval: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`, `15d` |
| `res` / `agg` | `hour` / `1` | Legacy resolution (used when `interval` is omitted) |

Bare numbers work too (`interval=15` → 15m). Kraken API expects minutes: 1, 5, 15, 30, 60, 240, 1440, 10080, 21600.

Example: [adx/?symbol=ETH&currency=EUR&interval=4h](/indicator/adx/?symbol=ETH&currency=EUR&interval=4h)

## Migration status

Refactored to Kraken API:

- [x] **adx** — Average Directional Index
- [x] **aroon** — Aroon
- [x] **atr** — Average True Range
- [x] **atrtrailingstop** — ATR Trailing Stop
- [x] **bollinger** — Bollinger Bands
- [x] **heikinashi** — Heikin-Ashi
- [x] **ichimoku** — Ichimoku Cloud
- [x] **macd** — MACD
- ~~multi~~ — removed (multi-chart dashboard; superseded by Kraken charts)
- ~~multi-coindesk~~ — removed (CoinDesk API dashboard; not an indicator demo)
- [x] **roc** — Rate of Change
- [ ] rsi
- [ ] sroc
- [ ] stochastic
- [ ] williams

Each indicator is updated one at a time: replace `data.csv` / CryptoCompare fetches with `loadIndicatorOhlc()`, use local `/lib/d3/v5/d3.js`, link `../indicator.css` + `../theme.js`, and keep the existing techan plot logic.

## Notes

- Kraken returns up to **720** OHLC bars per request.
- Markets are cached in `sessionStorage` for one hour.
- The PHP API must be reachable at `../../kraken/api/` relative to each example (same vhost as the main Kraken charts).
