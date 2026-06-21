
async function chart (name, symbol, currency, fullWidth, fullHeight) {
  const dim = dimension()
  const margin = dim.margin || { top: 50, right: 75, bottom: 50, left: 75 }
  const width = Math.floor(fullWidth - margin.left - margin.right)
  const height = Math.floor(fullHeight - margin.top - margin.bottom)
  const volumeHeight = fullHeight * 0.25
  const pair = resolvePair(symbol, currency)
  const wsname = pairWsname(pair)
  const interval = params.interval
    ? Number(params.interval)
    : resolveInterval(params.res, params.agg)

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

  let xAxis = d3.axisBottom(x).tickFormat(axisTimeFormat(interval))

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
    .text(`${symbolLabel(wsname.split('/')[0])} (${wsname}, ${interval}m)`)

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

  let retry = 3
  let data = []

  while (retry > 0) {
    try {
      data = await fetchOhlc(pair, interval, {
        api: params.api,
        since: params.since
      })
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
    const message = `No data for ${pair}`
    svg.append('text')
      .attr('class', 'symbol')
      .attr('x', 5)
      .attr('y', '50%')
      .text(message)
    throw new Error(message)
  }

  let accessor = candlestick.accessor()
  let indicatorPreRoll = interval < 60 ? 15 : 6

  data = data.sort((a, b) => d3.ascending(accessor.d(a), accessor.d(b)))

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
