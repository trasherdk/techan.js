Multi-crypto OHLC bar charts with SMA and EMA indicators, backed by [Kraken public OHLC](https://docs.kraken.com/api/docs/rest-api/get-ohlc-data) data. Charts update **live** via [Kraken WebSocket v2 OHLC](https://docs.kraken.com/api/docs/websocket-v2/ohlc) (trade-driven forming bar updates).

Kraken does not allow browser CORS for REST, so this example fetches history through same-origin PHP proxies:

- `api/markets.php` — [Assets](https://docs.kraken.com/api/docs/rest-api/get-asset-info) + [AssetPairs](https://docs.kraken.com/api/docs/rest-api/get-tradable-asset-pairs) (1h server cache, 1h sessionStorage cache)
- `api/ohlc.php` — [OHLC](https://docs.kraken.com/api/docs/rest-api/get-ohlc-data) (60s cache)

Live updates connect **directly** from the browser to `wss://ws.kraken.com/v2` (WebSockets are not subject to CORS). After the historical load, the client subscribes to the OHLC channel for each visible pair; the forming bar and volume update on each trade. When a new interval begins with no trades, a flat bar is added automatically (open/high/low/close all equal to the previous close). Pan position is **shared across all charts** and saved to `localStorage` (`techan.kraken.view`). Drag on any chart and all charts move together. **Right margin** (empty space after the last bar) is stored separately from **pan offset** (scroll into history). Drag at the live edge to adjust margin; drag left to pan history. **Double-click** resets pan to the default live window while keeping the saved right margin.

Symbol and pair resolution uses Kraken’s live market data (`wsname` lookup), not a hardcoded map. Common aliases (`BTC` → `XBT`, `DOGE` → `XDG`) are still applied where Kraken’s wsname differs from the usual ticker. WebSocket v2 symbols use display names (`BTC/EUR` rather than `XBT/EUR`).

## Settings

Parameters are changed in the **Setup** dialog (header button). On first visit the dialog opens automatically; choices are saved to `localStorage` (`techan.kraken.params`) when you click **Apply**. The URL stays clean — settings are not written to the query string.

**Light / dark mode:** use the moon/sun icon in the header. First visit follows the OS preference (`prefers-color-scheme`). Your choice is saved to `localStorage` (`techan.kraken.theme` as `light` or `dark`).

Resolution order when loading:

1. Built-in defaults
2. Values from `localStorage`

| Setting    | Default        | Description |
|------------|----------------|-------------|
| `crypto`   | `XMR,BTC`      | Comma-separated wsname bases (`XMR`, `XBT`) or aliases (`BTC`, `DOGE`). Resolved via Kraken AssetPairs. |
| `currency` | `EUR`          | Quote currency (wsname suffix, e.g. `EUR`, `USD`). Options populated from Kraken. |
| `res`      | `minute`       | Resolution preset: `minute`, `hour`, or `day`. Maps to Kraken interval minutes. |
| `agg`      | `1`            | Aggregation multiplier. For `res=minute`, must be a Kraken interval (1, 5, 15, 30, 60, 240, 1440, …). |
| `interval` | *(from res)*   | Optional Kraken interval override in minutes (same allowed values as `agg`). |
| `volumeSource` | `from`     | Volume bars: `from` (base asset) or `to` (quote, base × vwap/close). |
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

Kraken returns at most **720** bars per request. The chart loads all of them for indicator calculation, but initially shows only the last bars that fit the plot width (~5px per bar). Drag to reveal more history or adjust the right margin.

## Examples

Open `/kraken/` and use **Setup** to choose symbols and resolution. Settings persist in the browser across visits.

Future **kraken-history** backend: set the API endpoint in **Setup → Advanced**.

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

- PHP enabled on the web server for `api/ohlc.php` and `api/markets.php`.
- Outbound HTTPS from the server to Kraken.

## Related

- `indicator/multi/` — CCData/CryptoCompare variant (deprecated by CoinDesk).
- `indicator/multi-coindesk/` — CoinDesk indices experiment (deprecated for live use due to API limits).
