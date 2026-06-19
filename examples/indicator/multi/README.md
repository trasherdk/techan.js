Multi-crypto candlestick charts with SMA and EMA indicators. One chart is rendered per symbol; data is fetched from the [CryptoCompare](https://min-api.cryptocompare.com/) public API.

## URL search parameters

Parameters are read from the page query string via `getSearchParameters()` in `/lib/library.js`.

| Parameter  | Default   | Description |
|------------|-----------|-------------|
| `crypto`   | `XMR,BTC` | Comma-separated list of crypto symbols (`fsym`). Each symbol gets its own chart. |
| `currency` | `EUR`     | Quote / fiat currency (`tsym`), e.g. `EUR`, `USD`. |
| `res`      | `minute`  | Candle resolution. One of `minute`, `hour`, or `day`. Selects the CryptoCompare history endpoint (`histominute`, `histohour`, or `histoday`). |
| `agg`      | `1`       | Aggregate interval multiplier passed to the API as `aggregate` (e.g. `5` for 5-minute bars when `res=minute`). |
| `limit`    | *(see below)* | Number of candles to request. If omitted, a resolution-specific default is used. |

Default `limit` values (from `/lib/library.js`):

| `res`    | Default `limit` | Approx. range        |
|----------|-----------------|----------------------|
| `minute` | `720`           | 12 hours (1-min bars) |
| `hour`   | `168`           | 7 days               |
| `day`    | `180`           | ~6 months            |

## Examples

Default view (XMR and BTC vs EUR, 1-minute candles):

```
/indicator/multi/
```

Three symbols, hourly candles, 5-hour aggregation:

```
/indicator/multi/?crypto=ETH,XMR,BTC&res=hour&agg=5
```

Single symbol, daily candles, USD quote, custom history length:

```
/indicator/multi/?crypto=BTC&currency=USD&res=day&limit=90
```

## Notes

- The document title is set to `Multi: {crypto}-{currency}`.
- Chart width is derived from the browser window; charts wrap based on viewport width.
- Axis time formatting depends on `res` and `limit` (see `multi-chart.js`).
