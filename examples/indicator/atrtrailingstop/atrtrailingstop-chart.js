function atrTrailingStopChart (data, meta) {
  const margin = { top: 20, right: 20, bottom: 30, left: 50 }
  const width = Math.max(640, window.innerWidth - 40) - margin.left - margin.right
  const height = 500 - margin.top - margin.bottom

  const x = techan.scale.financetime()
    .range([0, width])

  const y = d3.scaleLinear()
    .range([height, 0])

  const candlestick = techan.plot.candlestick()
    .xScale(x)
    .yScale(y)

  const atrtrailingstop = techan.plot.atrtrailingstop()
    .xScale(x)
    .yScale(y)

  const ohlcAccessor = candlestick.accessor()
  const xAxis = d3.axisBottom(x)
  const yAxis = d3.axisLeft(y)
    .tickFormat(d3.format(',.3s'))

  return function (selection) {
    selection.selectAll('*').remove()

    const svg = selection.append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    svg.append('clipPath')
      .attr('id', 'clip-atrtrailingstop')
      .append('rect')
      .attr('x', 0)
      .attr('y', y(1))
      .attr('width', width)
      .attr('height', y(0) - y(1))

    svg.append('g')
      .attr('class', 'candlestick')
      .attr('clip-path', 'url(#clip-atrtrailingstop)')

    svg.append('g')
      .attr('class', 'atrtrailingstop')

    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0,${height})`)

    svg.append('g')
      .attr('class', 'y axis')
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '.71em')
      .style('text-anchor', 'end')
      .text('ATR Trailing Stop')

    const sorted = data.slice().sort(function (a, b) {
      return d3.ascending(ohlcAccessor.d(a), ohlcAccessor.d(b))
    })
    const stopData = techan.indicator.atrtrailingstop()(sorted)
    x.domain(sorted.map(ohlcAccessor.d))
    y.domain(techan.scale.plot.atrtrailingstop(stopData).domain())

    svg.select('g.candlestick').datum(sorted).call(candlestick)
    svg.select('g.atrtrailingstop').datum(stopData).call(atrtrailingstop)
    svg.select('g.x.axis').call(xAxis)
    svg.select('g.y.axis').call(yAxis)

    if (meta) {
      selection.append('p')
        .attr('class', 'chart-meta')
        .text(`${meta.label} · ${formatIndicatorInterval(meta.interval)} · ${data.length} bars`)
    }
  }
}
