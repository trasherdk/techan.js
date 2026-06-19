const coindesk = {
  dataurl: 'https://data-api.coindesk.com/index/cc/v1/historical/',
  market: 'sda',
  aggregate: 1,
  minute: { path: 'minutes', limit: 720 },
  hour: { path: 'hours', limit: 168 },
  day: { path: 'days', limit: 180 },
  // Common tickers -> CoinDesk SDA instruments (USD reference rates)
  instruments: {
    BTC: 'XBX-USD',
    ETH: 'ETX-USD',
    BCH: 'BCX-USD',
    BAT: 'BTX-USD',
    ADA: 'ADX-USD',
    LINK: 'LNX-USD',
    EOS: 'EOSX-USD',
    ETC: 'ECX-USD',
    LTC: 'LTX-USD',
    XLM: 'XLMX-USD',
    SOL: 'SLX-USD',
    XTZ: 'XTX-USD',
    UNI: 'UNX-USD',
    XRP: 'XRX-USD',
    ZEC: 'ZCX-USD'
  }
}

function resolveInstrument (symbol, currency) {
  const upper = symbol.trim().toUpperCase()
  if (upper.includes('-')) {
    return upper
  }
  if (coindesk.instruments[upper]) {
    return coindesk.instruments[upper]
  }
  return `${upper}-${currency.toUpperCase()}`
}

function getResolution (res) {
  return coindesk[res] || coindesk.minute
}

async function fetchHistory (instrument, resolution, limit, aggregate, apiKey) {
  const { path } = getResolution(resolution)
  const url = new URL(`${coindesk.dataurl}${path}`)
  url.searchParams.set('market', coindesk.market)
  url.searchParams.set('instrument', instrument)
  url.searchParams.set('limit', limit)
  url.searchParams.set('groups', 'OHLC,VOLUME')
  if (aggregate && Number(aggregate) !== 1) {
    url.searchParams.set('aggregate', aggregate)
  }

  const response = await fetch(url, {
    headers: { 'x-api-key': apiKey }
  })
  const json = await response.json()

  if (json.Err && json.Err.message) {
    throw new Error(json.Err.message)
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const rows = json.Data
  return Array.isArray(rows) ? rows : []
}

async function chart (name, symbol, currency, fullWidth, fullHeight) {
  const dim = dimension()
  const margin = dim.margin || { top: 50, right: 75, bottom: 50, left: 75 }
  const width = Math.floor(fullWidth - margin.left - margin.right)
  const height = Math.floor(fullHeight - margin.top - margin.bottom)
  const volumeHeight = fullHeight * 0.25
  const instrument = resolveInstrument(symbol, currency)
  const resolution = getResolution(params.res)
  const limit = params.limit ? params.limit : resolution.limit

  const root = document.getElementsByTagName('main')[0]
  const chartEl = document.createElement('chart')
  chartEl.setAttribute('id', name)
  chartEl.setAttribute('class', 'chart')
  chartEl.style.maxWidth = `${Math.floor(fullWidth)}px`
  chartEl.style.maxHeight = `${fullHeight}px`
  root.appendChild(chartEl)

  await d3.json('https://cdn.jsdelivr.net/npm/d3-time-format@3/locale/da-DK.json').then(locale => {
    d3.timeFormatDefaultLocale(locale)
  }).catch(error => {
    throw error.message
  })

  let zoom = d3.zoom()
    .on('zoom', zoomed)

  let x = techan.scale.financetime()
    .range([0, width])

  let y = d3.scaleLinear()
    .range([height, 0])

  let yPercent = y.copy()

  let yVolume = d3.scaleLinear()
    .range([height, height - volumeHeight])

  let yInit, yPercentInit, zoomableInit

  let candlestick = techan.plot.candlestick()
    .xScale(x)
    .yScale(y)

  let sma0 = techan.plot.sma()
    .xScale(x)
    .yScale(y)

  let sma1 = techan.plot.sma()
    .xScale(x)
    .yScale(y)

  let ema2 = techan.plot.ema()
    .xScale(x)
    .yScale(y)

  let volume = techan.plot.volume()
    .accessor(candlestick.accessor())
    .xScale(x)
    .yScale(yVolume)

  let format
  const limitNum = Number(limit)
  switch (true) {
    case params.res === 'day':
      format = '%m %y'
      break
    case params.res === 'hour':
      format = ' %d / %m'
      break
    case (params.res === 'minute' && limitNum < 1441):
      format = '%H:%M'
      break
    case (params.res === 'minute' && limitNum > 1440):
      format = '%H:%M\n%d/%m'
      break
    default:
      format = '%H:%M'
      break
  }

  format = d3.timeFormat('%H:%M')
  let xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat(format))

  let yAxis = d3.axisRight(y)

  let percentAxis = d3.axisLeft(yPercent)
    .ticks(4)
    .tickFormat(d3.format('+.1%'))

  let volumeAxis = d3.axisRight(yVolume)
    .ticks(2)
    .tickFormat(d3.format(',.3s'))

  let svg = d3.select(`#${name}`).append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  svg.append('clipPath')
    .attr('id', `clip-${name}`)
    .append('rect')
    .attr('x', 0)
    .attr('y', y(1))
    .attr('width', width)
    .attr('height', y(0) - y(1))

  svg.append('text')
    .attr('class', 'symbol')
    .attr('x', 5)
    .text(`${symbol} (${instrument})`)

  svg.append('g')
    .attr('class', 'volume')
    .attr('clip-path', `url(#clip-${name})`)

  svg.append('g')
    .attr('class', 'candlestick')
    .attr('clip-path', `url(#clip-${name})`)

  svg.append('g')
    .attr('class', 'indicator sma ma-0')
    .attr('clip-path', `url(#clip-${name})`)

  svg.append('g')
    .attr('class', 'indicator sma ma-1')
    .attr('clip-path', `url(#clip-${name})`)

  svg.append('g')
    .attr('class', 'indicator ema ma-2')
    .attr('clip-path', `url(#clip-${name})`)

  svg.append('g')
    .attr('class', 'x axis')
    .attr('transform', `translate(0,${height})`)

  svg.append('g')
    .attr('class', 'y axis')
    .attr('transform', `translate(${width},0)`)

  svg.append('g')
    .attr('class', 'percent axis')

  svg.append('g')
    .attr('class', 'volume axis')

  svg.append('rect')
    .attr('class', 'pane')
    .attr('width', width)
    .attr('height', height)
    .call(zoom)

  if (!params.key) {
    const message = 'API key required: add ?key=YOUR_API_KEY (see README)'
    svg.append('text')
      .attr('class', 'symbol')
      .attr('x', 5)
      .attr('y', '50%')
      .text(message)
    throw new Error(message)
  }

  let retry = 3
  let data = []

  while (retry > 0) {
    try {
      data = await fetchHistory(
        instrument,
        params.res,
        limit,
        params.agg ? params.agg : coindesk.aggregate,
        params.key
      )
      retry = 0
    } catch (error) {
      retry--
      if (retry === 0) {
        svg.append('text')
          .attr('class', 'symbol')
          .attr('x', 5)
          .attr('y', '50%')
          .text(error.message)
        throw error
      }
      await delay(0.2)
    }
  }

  if (data.length === 0) {
    const message = `No data for ${instrument}`
    svg.append('text')
      .attr('class', 'symbol')
      .attr('x', 5)
      .attr('y', '50%')
      .text(message)
    throw new Error(message)
  }

  let accessor = candlestick.accessor()
  let indicatorPreRoll = params.res === 'minute' ? 15 : 6

  data = data.map((d) => ({
    date: new Date(d.TIMESTAMP * 1000),
    volume: +d.VOLUME,
    open: +d.OPEN,
    high: +d.HIGH,
    low: +d.LOW,
    close: +d.CLOSE
  })).sort((a, b) => d3.ascending(accessor.d(a), accessor.d(b)))

  x.domain(techan.scale.plot.time(data, accessor).domain())
  y.domain(techan.scale.plot.ohlc(data.slice(indicatorPreRoll), accessor).domain())
  yPercent.domain(techan.scale.plot.percent(y, accessor(data[indicatorPreRoll])).domain())
  yVolume.domain(techan.scale.plot.volume(data, accessor.v).domain())

  svg.select('g.candlestick').datum(data).call(candlestick)
  svg.select('g.volume').datum(data).call(volume)
  svg.select('g.sma.ma-0').datum(techan.indicator.sma().period(10)(data)).call(sma0)
  svg.select('g.sma.ma-1').datum(techan.indicator.sma().period(26)(data)).call(sma1)
  svg.select('g.ema.ma-2').datum(techan.indicator.ema().period(9)(data)).call(ema2)

  zoomableInit = x.zoomable().domain([indicatorPreRoll, data.length]).copy()
  yInit = y.copy()
  yPercentInit = yPercent.copy()

  draw()

  function zoomed () {
    x.zoomable().domain(d3.event.transform.rescaleX(zoomableInit).domain())
    y.domain(d3.event.transform.rescaleY(yInit).domain())
    yPercent.domain(d3.event.transform.rescaleY(yPercentInit).domain())
    draw()
  }

  function draw () {
    try {
      svg.select('g.x.axis').call(xAxis)
      svg.select('g.y.axis').call(yAxis)
      svg.select('g.volume.axis').call(volumeAxis)
      svg.select('g.percent.axis').call(percentAxis)
      svg.select('g.candlestick').call(candlestick.refresh)
      svg.select('g.volume').call(volume.refresh)
      svg.select('g.sma.ma-0').call(sma0.refresh)
      svg.select('g.sma.ma-1').call(sma1.refresh)
      svg.select('g.ema.ma-2').call(ema2.refresh)
    } catch (error) {
      console.log('draw() try => catch', error.message)
      return false
    }
  }
}
