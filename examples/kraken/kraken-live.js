const krakenLive = {
  wsUrl: 'wss://ws.kraken.com/v2',
  ws: null,
  handlers: {},
  rolloverStops: [],
  symbols: [],
  interval: null,
  pingTimer: null,
  reconnectTimer: null,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  intentionalClose: false,
  rafId: null,
  pending: {}
}

function wsV2Symbol (wsname) {
  const parts = wsname.split('/')
  return `${symbolLabel(parts[0])}/${parts[1]}`
}

function parseKrakenLiveBar (row) {
  const volumefrom = +row.volume
  const close = +row.close
  const vwap = +row.vwap
  return {
    date: new Date(row.interval_begin),
    open: +row.open,
    high: +row.high,
    low: +row.low,
    close,
    vwap: vwap || undefined,
    volumefrom,
    volumeto: volumefrom * (vwap || close),
    volume: volumefrom
  }
}

function registerKrakenLiveRolloverStop (stop) {
  krakenLive.rolloverStops.push(stop)
}

function unregisterKrakenLiveRolloverStops () {
  krakenLive.rolloverStops.forEach(function (stop) {
    stop()
  })
  krakenLive.rolloverStops = []
}

function registerKrakenLiveHandler (symbol, handler) {
  krakenLive.handlers[symbol] = handler
}

function unregisterKrakenLiveHandler (symbol) {
  delete krakenLive.handlers[symbol]
  delete krakenLive.pending[symbol]
}

function scheduleKrakenLiveDispatch () {
  if (krakenLive.rafId) {
    return
  }
  krakenLive.rafId = requestAnimationFrame(flushKrakenLivePending)
}

function flushKrakenLivePending () {
  krakenLive.rafId = null
  if (kraken.panning) {
    scheduleKrakenLiveDispatch()
    return
  }

  const pending = krakenLive.pending
  krakenLive.pending = {}

  Object.entries(pending).forEach(function ([symbol, bar]) {
    const handler = krakenLive.handlers[symbol]
    if (handler) {
      handler(bar)
    }
  })
}

function sendKrakenLiveSubscribe () {
  if (!krakenLive.ws || krakenLive.ws.readyState !== WebSocket.OPEN) {
    return
  }
  if (krakenLive.symbols.length === 0) {
    return
  }

  krakenLive.ws.send(JSON.stringify({
    method: 'subscribe',
    params: {
      channel: 'ohlc',
      symbol: krakenLive.symbols,
      interval: krakenLive.interval,
      snapshot: false
    }
  }))
}

function startKrakenLivePing () {
  stopKrakenLivePing()
  krakenLive.pingTimer = setInterval(function () {
    if (krakenLive.ws && krakenLive.ws.readyState === WebSocket.OPEN) {
      krakenLive.ws.send(JSON.stringify({ method: 'ping' }))
    }
  }, 30000)
}

function stopKrakenLivePing () {
  if (krakenLive.pingTimer) {
    clearInterval(krakenLive.pingTimer)
    krakenLive.pingTimer = null
  }
}

function scheduleKrakenLiveReconnect () {
  if (krakenLive.intentionalClose || krakenLive.reconnectTimer) {
    return
  }

  krakenLive.reconnectTimer = setTimeout(function () {
    krakenLive.reconnectTimer = null
    openKrakenLiveSocket()
  }, krakenLive.reconnectDelay)

  krakenLive.reconnectDelay = Math.min(krakenLive.reconnectDelay * 2, krakenLive.maxReconnectDelay)
}

function handleKrakenLiveMessage (event) {
  let message
  try {
    message = JSON.parse(event.data)
  } catch (error) {
    console.log('krakenLive parse', error.message)
    return
  }

  if (message.channel !== 'ohlc' || !Array.isArray(message.data)) {
    return
  }

  message.data.forEach(function (row) {
    const symbol = row.symbol
    if (!symbol || !krakenLive.handlers[symbol]) {
      return
    }
    krakenLive.pending[symbol] = parseKrakenLiveBar(row)
  })

  scheduleKrakenLiveDispatch()
}

function openKrakenLiveSocket () {
  if (krakenLive.ws && (krakenLive.ws.readyState === WebSocket.OPEN || krakenLive.ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  krakenLive.ws = new WebSocket(krakenLive.wsUrl)

  krakenLive.ws.addEventListener('open', function () {
    krakenLive.reconnectDelay = 1000
    sendKrakenLiveSubscribe()
    startKrakenLivePing()
  })

  krakenLive.ws.addEventListener('message', handleKrakenLiveMessage)

  krakenLive.ws.addEventListener('close', function () {
    stopKrakenLivePing()
    krakenLive.ws = null
    if (!krakenLive.intentionalClose) {
      scheduleKrakenLiveReconnect()
    }
  })

  krakenLive.ws.addEventListener('error', function () {
    // close handler performs reconnect
  })
}

function connectKrakenLive (symbols, interval) {
  krakenLive.symbols = [...new Set(symbols)]
  krakenLive.interval = interval
  krakenLive.intentionalClose = false

  if (krakenLive.symbols.length === 0) {
    return
  }

  if (krakenLive.ws && krakenLive.ws.readyState === WebSocket.OPEN) {
    sendKrakenLiveSubscribe()
    return
  }

  openKrakenLiveSocket()
}

function disconnectKrakenLive () {
  krakenLive.intentionalClose = true
  stopKrakenLivePing()
  endKrakenPan()
  unregisterKrakenViewListeners()

  if (krakenLive.reconnectTimer) {
    clearTimeout(krakenLive.reconnectTimer)
    krakenLive.reconnectTimer = null
  }

  if (krakenLive.rafId) {
    cancelAnimationFrame(krakenLive.rafId)
    krakenLive.rafId = null
  }

  krakenLive.pending = {}
  krakenLive.handlers = {}
  unregisterKrakenLiveRolloverStops()
  krakenLive.symbols = []
  krakenLive.interval = null
  krakenLive.reconnectDelay = 1000

  if (krakenLive.ws) {
    krakenLive.ws.close()
    krakenLive.ws = null
  }

  krakenLive.intentionalClose = false
}
