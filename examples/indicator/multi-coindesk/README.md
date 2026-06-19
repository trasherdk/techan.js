Multi-crypto candlestick charts with SMA and EMA indicators. One chart is rendered per symbol; data is fetched from the [CoinDesk Data API](https://developers.coindesk.com/) (SDA reference-rate OHLCV endpoints).

An API key is required. Create one at [developers.coindesk.com/settings/api-keys](https://developers.coindesk.com/settings/api-keys) with **Read All Price Streaming and Polling Endpoints** permission.

## URL search parameters

Parameters are read from the page query string via `getSearchParameters()` in `/lib/library.js`.

| Parameter  | Default   | Description |
|------------|-----------|-------------|
| `key`      | *(none)*  | **Required.** CoinDesk Data API key (sent as `x-api-key` request header). |
| `crypto`   | `BTC,ETH` | Comma-separated symbols or instruments. Each entry gets its own chart. Common tickers (`BTC`, `ETH`, …) are mapped to CoinDesk SDA instruments; values already containing `-` (e.g. `XBX-USD`) are used as-is. |
| `currency` | `USD`     | Quote currency suffix when resolving ticker symbols (e.g. `BTC` → `XBX-USD`). CoinDesk SDA reference rates are USD-based. |
| `res`      | `minute`  | Candle resolution. One of `minute`, `hour`, or `day`. Maps to `/index/cc/v1/historical/minutes`, `hours`, or `days`. |
| `agg`      | `1`       | Aggregate interval multiplier (e.g. `5` for 5-minute bars when `res=minute`). |
| `limit`    | *(see below)* | Number of candles to request. If omitted, a resolution-specific default is used. |

Default `limit` values:

| `res`    | Default `limit` | Approx. range        |
|----------|-----------------|----------------------|
| `minute` | `720`           | 12 hours (1-min bars) |
| `hour`   | `168`           | 7 days               |
| `day`    | `180`           | ~6 months            |

### Supported ticker aliases

| Ticker | CoinDesk instrument |
|--------|---------------------|
| BTC    | XBX-USD             |
| ETH    | ETX-USD             |
| BCH    | BCX-USD             |
| BAT    | BTX-USD             |
| ADA    | ADX-USD             |
| LINK   | LNX-USD             |
| EOS    | EOSX-USD            |
| ETC    | ECX-USD             |
| LTC    | LTX-USD             |
| XLM    | XLMX-USD            |
| SOL    | SLX-USD             |
| XTZ    | XTX-USD             |
| UNI    | UNX-USD             |
| XRP    | XRX-USD             |
| ZEC    | ZCX-USD             |

## Examples

Default view (BTC and ETH, 1-minute candles):

```
/indicator/multi-coindesk/?key=YOUR_API_KEY
```

Three symbols, hourly candles, 5-hour aggregation:

```
/indicator/multi-coindesk/?key=YOUR_API_KEY&crypto=SOL,ETH,BTC&res=hour&agg=5
```

Full instrument name, daily candles, custom history length:

```
/indicator/multi-coindesk/?key=YOUR_API_KEY&crypto=XBX-USD&res=day&limit=90
```

## Notes

- Data source: `https://data-api.coindesk.com/index/cc/v1/historical/{minutes|hours|days}` with `market=sda` and `groups=OHLC,VOLUME`.
- The document title is set to `Multi (CoinDesk): {crypto}-{currency}`.
- Chart width is derived from the browser window; charts wrap based on viewport width.
- Axis time formatting depends on `res` and `limit` (see `multi-chart.js`).
