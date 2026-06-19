const kraken = {
  // Same-origin proxy by default; point ?api= at kraken-history when available.
  defaultApi: 'api/ohlc.php',
  intervals: [1, 5, 15, 30, 60, 240, 1440, 10080, 21600],
  assets: {
    BTC: 'XXBT',
    XBT: 'XXBT',
    XMR: 'XXMR',
    ETH: 'XETH',
    LTC: 'XLTC',
    BCH: 'BCH',
    ADA: 'ADA',
    DOT: 'DOT',
    SOL: 'SOL',
    XRP: 'XXRP',
    XLM: 'XXLM',
    ZEC: 'XZEC',
    DOGE: 'XXDG'
  },
  quotes: {
    EUR: 'ZEUR',
    USD: 'ZUSD',
    GBP: 'ZGBP',
    JPY: 'ZJPY',
    CAD: 'ZCAD'
  }
}

function resolvePair (symbol, currency) {
  const upper = symbol.trim().toUpperCase()
  const quote = (currency || 'EUR').toUpperCase()
  const quoteCode = kraken.quotes[quote] || `Z${quote}`

  if (kraken.assets[upper]) {
    return kraken.assets[upper] + quoteCode
  }

  // Full Kraken pair name, e.g. XXMRZEUR, XETHZEUR
  if (/^[A-Z0-9]+$/.test(upper) && upper.length >= 6) {
    return upper
  }

  return `X${upper}${quoteCode}`
}

function resolveInterval (res, agg) {
  const multiplier = Number(agg) || 1
  switch (res) {
    case 'hour':
      return multiplier === 4 ? 240 : 60
    case 'day':
      return 1440
    case 'minute':
    default:
      if (kraken.intervals.includes(multiplier)) {
        return multiplier
      }
      return 1
  }
}

function parseKrakenRows (rows) {
  return rows.map((row) => ({
    date: new Date(row[0] * 1000),
    open: +row[1],
    high: +row[2],
    low: +row[3],
    close: +row[4],
    volume: +row[6]
  }))
}

function parseNormalizedRows (rows) {
  return rows.map((row) => ({
    date: new Date((row.time || row.timestamp) * (row.time > 1e12 ? 1 : 1000)),
    open: +row.open,
    high: +row.high,
    low: +row.low,
    close: +row.close,
    volume: +(row.volume ?? 0)
  }))
}

async function fetchOhlc (pair, interval, options = {}) {
  const apiBase = options.api || kraken.defaultApi
  const url = new URL(apiBase, window.location.href)
  url.searchParams.set('pair', pair)
  url.searchParams.set('interval', interval)
  if (options.since) {
    url.searchParams.set('since', options.since)
  }

  const response = await fetch(url)
  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.error || json.message || `HTTP ${response.status}`)
  }

  if (Array.isArray(json.data)) {
    return parseNormalizedRows(json.data)
  }

  if (Array.isArray(json.error) && json.error.length > 0) {
    throw new Error(json.error[0])
  }

  if (json.result) {
    const key = Object.keys(json.result).find((k) => k !== 'last')
    if (!key || !Array.isArray(json.result[key])) {
      throw new Error(`No OHLC data for ${pair}`)
    }
    return parseKrakenRows(json.result[key])
  }

  throw new Error('Unexpected API response')
}
