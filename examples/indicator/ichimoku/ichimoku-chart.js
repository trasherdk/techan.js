function ichimokuChart (data, meta) {
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

  const ichimoku = techan.plot.ichimoku()
    .xScale(x)
    .yScale(y)

  const ichimokuIndicator = techan.indicator.ichimoku()
  const indicatorPreRoll = ichimokuIndicator.kijunSen() + ichimokuIndicator.senkouSpanB()
  const candleAccessor = candlestick.accessor()
  const indicatorAccessor = ichimokuIndicator.accessor()
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
      .text('Ichimoku')

    const sorted = data.slice().sort(function (a, b) {
      return d3.ascending(candleAccessor.d(a), candleAccessor.d(b))
    })
    const ichimokuData = ichimokuIndicator(sorted)

    x.domain(sorted.map(indicatorAccessor.d))
    y.domain(techan.scale.plot.ichimoku(
      ichimokuData.slice(indicatorPreRoll - ichimokuIndicator.kijunSen())
    ).domain())
    x.zoomable().clamp(false).domain([
      indicatorPreRoll,
      sorted.length + ichimokuIndicator.kijunSen()
    ])

    svg.append('clipPath')
      .attr('id', 'clip-ichimoku')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)

    svg.append('g')
      .attr('class', 'ichimoku')
      .attr('clip-path', 'url(#clip-ichimoku)')

    svg.append('g')
      .attr('class', 'candlestick')
      .attr('clip-path', 'url(#clip-ichimoku)')

    svg.select('g.candlestick').datum(sorted).call(candlestick)
    svg.select('g.ichimoku').datum(ichimokuData).call(ichimoku)
    svg.select('g.x.axis').call(xAxis)
    svg.select('g.y.axis').call(yAxis)

    if (meta) {
      selection.append('p')
        .attr('class', 'chart-meta')
        .text(`${meta.label} · ${formatIndicatorInterval(meta.interval)} · ${data.length} bars`)
    }
  }
}
