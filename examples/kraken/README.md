Multi-crypto candlestick charts with SMA and EMA indicators, backed by [Kraken public OHLC](https://docs.kraken.com/api/docs/rest-api/get-ohlc-data) data.

Kraken does not allow browser CORS, so this example fetches through a same-origin PHP proxy (`api/ohlc.php`). The fetch layer is written to switch to a **kraken-history** API later without changing the chart code.

## URL search parameters

Parameters are read from the page query string via `getSearchParameters()` in `/lib/library.js`.

| Parameter  | Default        | Description |
|------------|----------------|-------------|
| `crypto`   | `XMR,BTC`      | Comma-separated symbols (`XMR`, `BTC`) or Kraken pair names (`XXMRZEUR`). One chart per entry. |
| `currency` | `EUR`          | Quote currency when resolving symbols to Kraken pairs. |
| `res`      | `minute`       | Resolution preset: `minute`, `hour`, or `day`. Maps to Kraken interval minutes. |
| `agg`      | `1`            | Aggregation multiplier. For `res=minute`, must be a Kraken interval (1, 5, 15, 30, 60, 240, 1440, …). |
| `interval` | *(from res)*   | Optional Kraken interval override in minutes (same allowed values as `agg`). |
| `since`    | *(none)*       | Kraken `since` parameter (return committed OHLC after this timestamp). |
| `api`      | `api/ohlc.php` | Data endpoint URL. Set to your **kraken-history** API when ready. |

### Resolution mapping

| `res`    | `agg` | Kraken interval (minutes) |
|----------|-------|---------------------------|
| `minute` | `1`   | 1                         |
| `minute` | `5`   | 5                         |
| `minute` | `15`  | 15                        |
| `hour`   | `1`   | 60                        |
| `hour`   | `4`   | 240                       |
| `day`    | `1`   | 1440                      |

Kraken returns at most **720** candles per request.

## Examples

Default (XMR and BTC vs EUR, 1-minute):

```
/kraken/
```

Hourly candles:

```
/kraken/?crypto=ETH,BTC&res=hour
```

Direct Kraken pair name:

```
/kraken/?crypto=XXMRZEUR&interval=5
```

Future **kraken-history** backend:

```
/kraken/?api=https://your-kraken-history.example/api/ohlc&crypto=XMR,BTC
```

## kraken-history integration

Point `api` at a SvelteKit endpoint that serves cached OHLC from MySQL. The client accepts either:

**Kraken passthrough** (what `api/ohlc.php` returns today):

```json
{ "error": [], "result": { "XXMRZEUR": [[time, open, high, low, close, vwap, volume, count], ...] } }
```

**Normalized** (recommended for kraken-history):

```json
{ "pair": "XXMRZEUR", "interval": 1, "data": [{ "time": 1781802120, "open": 285.51, "high": 285.51, "low": 285.51, "close": 285.51, "volume": 0 }] }
```

Query parameters: `pair`, `interval`, optional `since`.

## Requirements

- PHP enabled on the web server for `api/ohlc.php` (proxies to `api.kraken.com`, 60s cache).
- Outbound HTTPS from the server to Kraken.

## Related

- `indicator/multi/` — CCData/CryptoCompare variant (deprecated by CoinDesk).
- `indicator/multi-coindesk/` — CoinDesk indices experiment (deprecated for live use due to API limits).
