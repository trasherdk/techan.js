const kraken = {
  defaultApi: 'api/ohlc.php',
  marketsApi: 'api/markets.php',
  storageKey: 'techan.kraken.params',
  themeStorageKey: 'techan.kraken.theme',
  viewStorageKey: 'techan.kraken.view',
  marketsCacheKey: 'techan.kraken.markets',
  marketsCacheTtl: 60 * 60 * 1000,
  paramKeys: ['crypto', 'currency', 'res', 'agg', 'api', 'interval', 'since', 'volumeSource'],
  defaults: {
    crypto: 'XMR,BTC',
    currency: 'EUR',
    res: 'minute',
    agg: '1',
    api: 'api/ohlc.php',
    volumeSource: 'from'
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
  assetByAltname: null,
  viewState: null,
  viewListeners: [],
  panning: false,
  panRafId: null,
  panSyncDomain: null,
  panSyncSource: null
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
    case 'week':
      return 10080
    case 'month':
      return 21600
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

function formatKrakenInterval (interval) {
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

function formatIntervalRemaining (ms, intervalMinutes) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  if (totalSec === 0) {
    return '0:00'
  }

  const interval = Number(intervalMinutes) || 1
  if (interval >= 1440) {
    const days = Math.floor(totalSec / 86400)
    const hours = Math.floor((totalSec % 86400) / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`
    }
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const hours = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  const pad = function (n) {
    return n < 10 ? `0${n}` : `${n}`
  }

  if (hours > 0) {
    return `${hours}:${pad(mins)}:${pad(secs)}`
  }
  return `${mins}:${pad(secs)}`
}

function parseKrakenRows (rows) {
  return rows.map((row) => {
    const volumefrom = +row[6]
    const vwap = +row[5]
    const close = +row[4]
    const volumeto = volumefrom * (vwap || close)
    return {
      date: new Date(row[0] * 1000),
      open: +row[1],
      high: +row[2],
      low: +row[3],
      close,
      vwap,
      volumefrom,
      volumeto,
      volume: volumefrom
    }
  })
}

function parseNormalizedRows (rows) {
  return rows.map((row) => {
    const volumefrom = +(row.volumefrom ?? row.volume ?? 0)
    const close = +row.close
    const vwap = +(row.vwap ?? 0)
    const volumeto = +(row.volumeto ?? (volumefrom * (vwap || close)))
    return {
      date: new Date((row.time || row.timestamp) * (row.time > 1e12 ? 1 : 1000)),
      open: +row.open,
      high: +row.high,
      low: +row.low,
      close,
      vwap: vwap || undefined,
      volumefrom,
      volumeto,
      volume: volumefrom
    }
  })
}

function resolveKrakenVolumeSource (value) {
  return value === 'to' ? 'to' : 'from'
}

function krakenBarVolume (bar, source) {
  source = resolveKrakenVolumeSource(source != null ? source : params.volumeSource)
  if (source === 'to') {
    if (bar.volumeto != null) {
      return bar.volumeto
    }
    const base = bar.volumefrom ?? bar.volume ?? 0
    const price = bar.vwap ?? bar.close ?? 0
    return base * price
  }
  return bar.volumefrom ?? bar.volume ?? 0
}

function krakenVolumeUnit (symbol, currency, source) {
  source = resolveKrakenVolumeSource(source != null ? source : params.volumeSource)
  const wsname = pairWsname(resolvePair(symbol, currency))
  const parts = wsname.split('/')
  if (source === 'to') {
    return symbolLabel(parts[1] || currency)
  }
  return symbolLabel(parts[0] || symbol)
}

function formatKrakenAmountCompact (amount) {
  const v = +amount
  if (!isFinite(v)) {
    return '—'
  }
  if (v === 0) {
    return '0'
  }
  const abs = Math.abs(v)
  if (abs >= 1e9) {
    return d3.format('.2~r')(v / 1e9) + 'B'
  }
  if (abs >= 1e6) {
    return d3.format('.2~r')(v / 1e6) + 'M'
  }
  if (abs >= 1e4) {
    return d3.format('.2~r')(v / 1e3) + 'K'
  }
  if (abs >= 1000) {
    return d3.format(',.2f')(v)
  }
  if (abs >= 1) {
    return d3.format(',.3~r')(v)
  }
  if (abs >= 0.0001) {
    return d3.format(',.4~r')(v)
  }
  const decimals = Math.min(10, -Math.floor(Math.log10(abs)) + 3)
  return d3.format(`,.${decimals}~r`)(v)
}

function formatKrakenAmount (amount) {
  const v = +amount
  if (!isFinite(v)) {
    return '—'
  }
  if (v === 0) {
    return '0'
  }
  const abs = Math.abs(v)
  if (abs >= 1e9) {
    return d3.format('.3~r')(v / 1e9) + 'B'
  }
  if (abs >= 1e7) {
    return d3.format('.3~r')(v / 1e6) + 'M'
  }
  if (abs >= 1000) {
    return d3.format(',.2f')(v)
  }
  if (abs >= 1) {
    return d3.format(',.3~r')(v)
  }
  if (abs >= 0.0001) {
    return d3.format(',.4~r')(v)
  }
  const decimals = Math.min(10, -Math.floor(Math.log10(abs)) + 3)
  return d3.format(`,.${decimals}~r`)(v)
}

function krakenVolumeAccessor (ohlcAccessor, source) {
  source = resolveKrakenVolumeSource(source != null ? source : params.volumeSource)
  const volumeFn = function (d) {
    return krakenBarVolume(d, source)
  }
  return Object.assign(volumeFn, ohlcAccessor, { v: volumeFn })
}

function axisTimeFormat (interval, visibleBars) {
  const bars = visibleBars || 720
  const visibleDays = (bars * interval) / 1440

  if (interval >= 1440 || visibleDays > 10) {
    return d3.timeFormat('%d %b')
  }
  if (interval >= 60 || visibleDays > 1.5) {
    return d3.timeFormat('%d/%m')
  }
  if (interval >= 15 || visibleDays > 0.5) {
    return d3.timeFormat('%d/%m %H:%M')
  }
  return d3.timeFormat('%H:%M')
}

function formatCrosshairTime (interval, visibleBars) {
  const bars = visibleBars || 720
  const visibleDays = (bars * interval) / 1440

  if (interval >= 1440 || visibleDays > 10) {
    return d3.timeFormat('%d %b %Y')
  }
  if (interval >= 60 || visibleDays > 1.5) {
    return d3.timeFormat('%d/%m %H:%M')
  }
  return d3.timeFormat('%d/%m %H:%M')
}

function axisTickCount (plotWidth) {
  return Math.max(4, Math.min(10, Math.floor(plotWidth / 85)))
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

function visibleBarCount (plotWidth) {
  return Math.max(40, Math.min(720, Math.floor(plotWidth / 5)))
}

function defaultKrakenViewState () {
  return {
    rightMargin: null,
    panOffset: 0,
    viewSpan: null,
    followLive: true
  }
}

function savedKrakenRightMargin (state, fallback) {
  state = state || loadKrakenViewState()
  if (state.rightMargin != null) {
    return state.rightMargin
  }
  if (state.endOffset != null) {
    return state.endOffset
  }
  return fallback
}

function loadKrakenViewState () {
  if (kraken.viewState) {
    return kraken.viewState
  }

  try {
    const raw = localStorage.getItem(kraken.viewStorageKey)
    if (raw) {
      kraken.viewState = Object.assign(defaultKrakenViewState(), JSON.parse(raw))
      return kraken.viewState
    }
  } catch (error) {
    console.log('loadKrakenViewState', error.message)
  }

  kraken.viewState = defaultKrakenViewState()
  return kraken.viewState
}

function beginKrakenPan () {
  kraken.panning = true
}

function endKrakenPan () {
  kraken.panning = false
  if (kraken.panRafId) {
    cancelAnimationFrame(kraken.panRafId)
    kraken.panRafId = null
  }
  kraken.panSyncDomain = null
  kraken.panSyncSource = null
  scheduleKrakenLiveDispatch()
}

function scheduleKrakenPanSync (domain, sourceId) {
  kraken.panSyncDomain = domain
  kraken.panSyncSource = sourceId
  if (kraken.panRafId) {
    return
  }
  kraken.panRafId = requestAnimationFrame(function () {
    kraken.panRafId = null
    const synced = kraken.panSyncDomain
    const source = kraken.panSyncSource
    kraken.panSyncDomain = null
    kraken.panSyncSource = null
    if (synced) {
      notifyKrakenViewPan(synced, source)
    }
  })
}

function notifyKrakenViewPan (domain, sourceId) {
  kraken.viewListeners.forEach(function (listener) {
    listener(loadKrakenViewState(), { panDomain: domain, sourceId: sourceId })
  })
}

function saveKrakenViewState (next, options) {
  options = options || {}
  kraken.viewState = Object.assign({}, loadKrakenViewState(), next)
  if (options.persist !== false) {
    try {
      localStorage.setItem(kraken.viewStorageKey, JSON.stringify(kraken.viewState))
    } catch (error) {
      console.log('saveKrakenViewState', error.message)
    }
  }
  if (options.notify !== false) {
    kraken.viewListeners.forEach(function (listener) {
      listener(kraken.viewState)
    })
  }
}

function registerKrakenViewListener (listener) {
  kraken.viewListeners.push(listener)
  return function () {
    kraken.viewListeners = kraken.viewListeners.filter(function (item) {
      return item !== listener
    })
  }
}

function unregisterKrakenViewListeners () {
  kraken.viewListeners = []
}

function loadKrakenThemePreference () {
  try {
    const stored = localStorage.getItem(kraken.themeStorageKey)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch (error) {
    console.log('loadKrakenThemePreference', error.message)
  }
  return 'system'
}

function resolveKrakenTheme (preference) {
  preference = preference || loadKrakenThemePreference()
  if (preference === 'dark' || preference === 'light') {
    return preference
  }
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function applyKrakenTheme (preference) {
  const pref = preference || loadKrakenThemePreference()
  const resolved = resolveKrakenTheme(pref)
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.setAttribute('data-theme-pref', pref)

  const toggle = document.getElementById('kraken-theme-toggle')
  if (toggle) {
    const isDark = resolved === 'dark'
    toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false')
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode')
    toggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode'
  }

  return resolved
}

function saveKrakenThemePreference (preference) {
  try {
    localStorage.setItem(kraken.themeStorageKey, preference)
  } catch (error) {
    console.log('saveKrakenThemePreference', error.message)
  }
  applyKrakenTheme(preference)
}

function toggleKrakenTheme () {
  const next = resolveKrakenTheme() === 'dark' ? 'light' : 'dark'
  saveKrakenThemePreference(next)
}

function initKrakenTheme () {
  applyKrakenTheme(loadKrakenThemePreference())

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    if (loadKrakenThemePreference() === 'system') {
      applyKrakenTheme('system')
    }
  })

  const toggle = document.getElementById('kraken-theme-toggle')
  if (toggle) {
    toggle.addEventListener('click', toggleKrakenTheme)
  }
}

function resolveKrakenParams () {
  const storedParams = loadStoredKrakenParams()
  const params = Object.assign({}, kraken.defaults, storedParams)

  params.api = params.api || kraken.defaultApi
  clearKrakenParamsFromUrl()
  return params
}
