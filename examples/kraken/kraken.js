const kraken = {
  defaultApi: 'api/ohlc.php',
  marketsApi: 'api/markets.php',
  storageKey: 'techan.kraken.params',
  marketsCacheKey: 'techan.kraken.markets',
  marketsCacheTtl: 60 * 60 * 1000,
  paramKeys: ['crypto', 'currency', 'res', 'agg', 'api', 'interval', 'since'],
  defaults: {
    crypto: 'XMR,BTC',
    currency: 'EUR',
    res: 'minute',
    agg: '1',
    api: 'api/ohlc.php'
  },
  intervals: [1, 5, 15, 30, 60, 240, 1440, 10080, 21600],
  // Common ticker aliases where wsname base differs from the usual symbol.
  symbolAliases: {
    BTC: 'XBT',
    DOGE: 'XDG'
  },
  displayAliases: {
    XBT: 'BTC',
    XDG: 'DOGE'
  },
  featuredSymbols: ['XBT', 'XMR', 'ETH', 'SOL', 'ADA', 'DOT', 'XRP', 'LTC', 'BCH', 'XLM', 'ZEC', 'XDG'],
  pairsByKey: null,
  pairsByWsname: null,
  assetByAltname: null
}

function buildKrakenMarketIndexes (result) {
  kraken.pairsByKey = result.pairs || {}
  kraken.pairsByWsname = {}
  kraken.assetByAltname = {}

  Object.entries(kraken.pairsByKey).forEach(function ([key, pair]) {
    if (pair.wsname) {
      kraken.pairsByWsname[pair.wsname.toUpperCase()] = key
    }
  })

  Object.entries(result.assets || {}).forEach(function ([code, asset]) {
    if (asset.altname) {
      kraken.assetByAltname[asset.altname.toUpperCase()] = Object.assign({ code: code }, asset)
    }
  })
}

async function loadKrakenMarkets () {
  if (kraken.pairsByKey) {
    return kraken.pairsByKey
  }

  try {
    const cached = sessionStorage.getItem(kraken.marketsCacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.time && parsed.result && (Date.now() - parsed.time) < kraken.marketsCacheTtl) {
        buildKrakenMarketIndexes(parsed.result)
        return kraken.pairsByKey
      }
    }
  } catch (error) {
    console.log('loadKrakenMarkets cache', error.message)
  }

  const response = await fetch(kraken.marketsApi)
  const json = await response.json()

  if (!response.ok || (Array.isArray(json.error) && json.error.length > 0)) {
    throw new Error((json.error && json.error[0]) || `HTTP ${response.status}`)
  }

  buildKrakenMarketIndexes(json.result)

  try {
    sessionStorage.setItem(kraken.marketsCacheKey, JSON.stringify({
      time: Date.now(),
      result: json.result
    }))
  } catch (error) {
    console.log('loadKrakenMarkets save cache', error.message)
  }

  return kraken.pairsByKey
}

function wsnameBase (symbol) {
  return kraken.symbolAliases[symbol] || symbol
}

function resolvePair (symbol, currency) {
  if (!kraken.pairsByKey) {
    throw new Error('Kraken markets not loaded')
  }

  const upper = symbol.trim().toUpperCase()
  const quote = (currency || 'EUR').toUpperCase()

  if (kraken.pairsByKey[upper]) {
    return upper
  }

  const candidates = [upper, wsnameBase(upper)]
  for (let i = 0; i < candidates.length; i++) {
    const wsname = `${candidates[i]}/${quote}`
    if (kraken.pairsByWsname[wsname]) {
      return kraken.pairsByWsname[wsname]
    }
  }

  throw new Error(`Unknown pair ${upper}/${quote}`)
}

function pairWsname (pairKey) {
  const pair = kraken.pairsByKey[pairKey]
  return pair && pair.wsname ? pair.wsname : pairKey
}

function quoteCurrencies () {
  const quotes = new Set()
  Object.values(kraken.pairsByKey || {}).forEach(function (pair) {
    const parts = (pair.wsname || '').split('/')
    if (parts[1]) {
      quotes.add(parts[1])
    }
  })
  return [...quotes].sort()
}

function symbolsForCurrency (currency) {
  const quote = (currency || 'EUR').toUpperCase()
  const symbols = new Set()

  Object.values(kraken.pairsByKey || {}).forEach(function (pair) {
    const parts = (pair.wsname || '').split('/')
    if (parts[0] && parts[1] === quote) {
      symbols.add(parts[0])
    }
  })

  return [...symbols].sort()
}

function featuredSymbolsForCurrency (currency) {
  const available = new Set(symbolsForCurrency(currency))
  return kraken.featuredSymbols.filter(function (symbol) {
    return available.has(symbol)
  })
}

function symbolLabel (symbol) {
  return kraken.displayAliases[symbol] || symbol
}

function normalizeSymbolForSelection (symbol, currency) {
  try {
    const pairKey = resolvePair(symbol, currency)
    return pairWsname(pairKey).split('/')[0]
  } catch (error) {
    return symbol.trim().toUpperCase()
  }
}

function isKnownKrakenSymbol (symbol, currency) {
  try {
    resolvePair(symbol, currency || kraken.defaults.currency)
    return true
  } catch (error) {
    return false
  }
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

function axisTimeFormat (interval) {
  const dateOnly = d3.timeFormat('%d %b')
  const dateShort = d3.timeFormat('%d/%m')
  const dateTime = d3.timeFormat('%d/%m %H:%M')
  const timeOnly = d3.timeFormat('%H:%M')

  if (interval >= 1440) {
    return dateOnly
  }

  return function (d) {
    if (d.getHours() === 0 && d.getMinutes() === 0) {
      return dateShort(d)
    }
    if (interval >= 60 || interval * 720 > 24 * 60) {
      return dateTime(d)
    }
    return timeOnly(d)
  }
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

function pickKrakenParams (source) {
  const picked = {}
  for (const key of kraken.paramKeys) {
    if (source[key] !== undefined && source[key] !== '') {
      picked[key] = String(source[key])
    }
  }
  return picked
}

function loadStoredKrakenParams () {
  try {
    const raw = localStorage.getItem(kraken.storageKey)
    return raw ? JSON.parse(raw) : {}
  } catch (error) {
    console.log('loadStoredKrakenParams', error.message)
    return {}
  }
}

function saveKrakenParams (params) {
  try {
    localStorage.setItem(kraken.storageKey, JSON.stringify(pickKrakenParams(params)))
  } catch (error) {
    console.log('saveKrakenParams', error.message)
  }
}

function clearKrakenParamsFromUrl () {
  const url = new URL(window.location.href)
  let changed = false

  for (const key of kraken.paramKeys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }

  if (!changed) {
    return
  }

  const query = url.searchParams.toString()
  history.replaceState(null, '', url.pathname + (query ? `?${query}` : '') + url.hash)
}

function resolveKrakenParams () {
  const storedParams = loadStoredKrakenParams()
  const params = Object.assign({}, kraken.defaults, storedParams)

  params.api = params.api || kraken.defaultApi
  clearKrakenParamsFromUrl()
  return params
}
