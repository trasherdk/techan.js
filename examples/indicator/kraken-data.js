const indicatorKraken = {
  ohlcApi: '../../kraken/api/ohlc.php',
  marketsApi: '../../kraken/api/markets.php',
  marketsCacheKey: 'techan.indicator.kraken.markets',
  marketsCacheTtl: 60 * 60 * 1000,
  intervals: [1, 5, 15, 30, 60, 240, 1440, 10080, 21600],
  intervalLabels: {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
    '1d': 1440,
    '1w': 10080,
    '15d': 21600
  },
  symbolAliases: {
    BTC: 'XBT',
    DOGE: 'XDG'
  },
  defaults: {
    symbol: 'BTC',
    currency: 'USD',
    interval: 60
  },
  pairsByKey: null,
  pairsByWsname: null
}

function getIndicatorSearchParameters () {
  const searchParams = new URLSearchParams(window.location.search)
  const paramObj = {}
  searchParams.forEach(function (value, key) {
    if (paramObj[key] === undefined) {
      paramObj[key] = value
      return
    }
    if (!Array.isArray(paramObj[key])) {
      paramObj[key] = [paramObj[key]]
    }
    paramObj[key].push(value)
  })
  return paramObj
}

function buildIndicatorMarketIndexes (result) {
  indicatorKraken.pairsByKey = result.pairs || {}
  indicatorKraken.pairsByWsname = {}
  Object.entries(indicatorKraken.pairsByKey).forEach(function ([key, pair]) {
    if (pair.wsname) {
      indicatorKraken.pairsByWsname[pair.wsname.toUpperCase()] = key
    }
  })
}

async function loadIndicatorMarkets () {
  if (indicatorKraken.pairsByKey) {
    return indicatorKraken.pairsByKey
  }

  try {
    const cached = sessionStorage.getItem(indicatorKraken.marketsCacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.time && parsed.result && (Date.now() - parsed.time) < indicatorKraken.marketsCacheTtl) {
        buildIndicatorMarketIndexes(parsed.result)
        return indicatorKraken.pairsByKey
      }
    }
  } catch (error) {
    console.log('loadIndicatorMarkets cache', error.message)
  }

  const response = await fetch(indicatorKraken.marketsApi)
  const json = await response.json()

  if (!response.ok || (Array.isArray(json.error) && json.error.length > 0)) {
    throw new Error((json.error && json.error[0]) || `HTTP ${response.status}`)
  }

  buildIndicatorMarketIndexes(json.result)

  try {
    sessionStorage.setItem(indicatorKraken.marketsCacheKey, JSON.stringify({
      time: Date.now(),
      result: json.result
    }))
  } catch (error) {
    console.log('loadIndicatorMarkets save cache', error.message)
  }

  return indicatorKraken.pairsByKey
}

function indicatorWsnameBase (symbol) {
  return indicatorKraken.symbolAliases[symbol] || symbol
}

function resolveIndicatorPair (symbol, currency) {
  if (!indicatorKraken.pairsByKey) {
    throw new Error('Kraken markets not loaded')
  }

  const upper = String(symbol).trim().toUpperCase().split(',')[0]
  const quote = String(currency || indicatorKraken.defaults.currency).toUpperCase()

  if (indicatorKraken.pairsByKey[upper]) {
    return upper
  }

  const candidates = [upper, indicatorWsnameBase(upper)]
  for (let i = 0; i < candidates.length; i++) {
    const wsname = `${candidates[i]}/${quote}`
    if (indicatorKraken.pairsByWsname[wsname]) {
      return indicatorKraken.pairsByWsname[wsname]
    }
  }

  throw new Error(`Unknown pair ${upper}/${quote}`)
}

function parseIndicatorIntervalValue (value) {
  if (value == null || value === '') {
    return null
  }

  const raw = String(value).trim().toLowerCase()
  if (indicatorKraken.intervalLabels[raw] != null) {
    return indicatorKraken.intervalLabels[raw]
  }

  const match = raw.match(/^(\d+)(m|h|d|w)?$/)
  if (match) {
    const amount = Number(match[1])
    const unit = match[2] || 'm'
    let minutes = amount
    if (unit === 'h') {
      minutes = amount * 60
    } else if (unit === 'd') {
      minutes = amount * 1440
    } else if (unit === 'w') {
      minutes = amount * 10080
    }
    if (indicatorKraken.intervals.includes(minutes)) {
      return minutes
    }
  }

  const numeric = Number(raw)
  if (indicatorKraken.intervals.includes(numeric)) {
    return numeric
  }

  return null
}

function resolveIndicatorInterval (params) {
  const parsed = parseIndicatorIntervalValue(params.interval)
  if (parsed != null) {
    return parsed
  }

  const res = params.res || 'hour'
  const agg = Number(params.agg) || 1

  switch (res) {
    case 'week':
      return 10080
    case 'month':
      return 21600
    case 'day':
      return 1440
    case 'hour':
      return agg === 4 ? 240 : 60
    case 'minute':
    default:
      return parseIndicatorIntervalValue(`${agg}m`) || indicatorKraken.defaults.interval
  }
}

function parseIndicatorKrakenRows (rows) {
  return rows.map(function (row) {
    const volumefrom = +row[6]
    const close = +row[4]
    const vwap = +row[5]
    return {
      date: new Date(row[0] * 1000),
      open: +row[1],
      high: +row[2],
      low: +row[3],
      close,
      volume: volumefrom,
      volumefrom,
      volumeto: volumefrom * (vwap || close)
    }
  })
}

async function fetchIndicatorOhlc (pair, interval, options) {
  options = options || {}
  const apiBase = options.api || indicatorKraken.ohlcApi
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

  if (Array.isArray(json.error) && json.error.length > 0) {
    throw new Error(json.error[0])
  }

  if (json.result) {
    const key = Object.keys(json.result).find(function (k) {
      return k !== 'last'
    })
    if (!key || !Array.isArray(json.result[key])) {
      throw new Error(`No OHLC data for ${pair}`)
    }
    return parseIndicatorKrakenRows(json.result[key])
  }

  throw new Error('Unexpected API response')
}

function getIndicatorParams () {
  const q = getIndicatorSearchParameters()
  const symbol = (q.crypto || q.symbol || indicatorKraken.defaults.symbol).split(',')[0]
  return {
    symbol: symbol,
    currency: q.currency || indicatorKraken.defaults.currency,
    interval: q.interval,
    res: q.res,
    agg: q.agg,
    api: q.api || indicatorKraken.ohlcApi
  }
}

function formatIndicatorInterval (interval) {
  switch (Number(interval)) {
    case 1: return '1m'
    case 5: return '5m'
    case 15: return '15m'
    case 30: return '30m'
    case 60: return '1h'
    case 240: return '4h'
    case 1440: return '1d'
    case 10080: return '1w'
    case 21600: return '15d'
    default: return `${interval}m`
  }
}

function indicatorDisplaySymbol (symbol) {
  const upper = String(symbol).toUpperCase()
  return upper === 'XBT' ? 'BTC' : upper
}

async function loadIndicatorOhlc (params) {
  params = params || getIndicatorParams()
  await loadIndicatorMarkets()
  const pair = resolveIndicatorPair(params.symbol, params.currency)
  const interval = resolveIndicatorInterval(params)
  const data = await fetchIndicatorOhlc(pair, interval, { api: params.api })
  return {
    data: data,
    pair: pair,
    interval: interval,
    params: params
  }
}
