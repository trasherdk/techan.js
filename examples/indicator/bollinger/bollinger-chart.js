function bollingerChart (data, meta) {
  const margin = { top: 20, right: 20, bottom: 30, left: 50 }
  const width = Math.max(640, window.innerWidth - 40) - margin.left - margin.right
  const height = 500 - margin.top - margin.bottom

  const x = techan.scale.financetime()
    .range([0, width])

  const y = d3.scaleLinear()
    .range([height, 0])

  const ohlc = techan.plot.ohlc()
    .xScale(x)
    .yScale(y)

  const bollinger = techan.plot.bollinger()
    .xScale(x)
    .yScale(y)

  const ohlcAccessor = ohlc.accessor()
  const bollingerAccessor = bollinger.accessor()
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
      .attr('class', 'ohlc')

    svg.append('g')
      .attr('class', 'bollinger')

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
      .text('Bollinger Bands')

    const sorted = data.slice().sort(function (a, b) {
      return d3.ascending(ohlcAccessor.d(a), ohlcAccessor.d(b))
    })
    const bollingerData = techan.indicator.bollinger()(sorted)
    const firstBandDate = bollingerAccessor.d(bollingerData[0])
    const ohlcData = sorted.filter(function (d) {
      return ohlcAccessor.d(d) >= firstBandDate
    })

    x.domain(bollingerData.map(bollingerAccessor.d))
    y.domain(techan.scale.plot.bollinger(bollingerData).domain())

    svg.select('g.ohlc').datum(ohlcData).call(ohlc)
    svg.select('g.bollinger').datum(bollingerData).call(bollinger)
    svg.select('g.x.axis').call(xAxis)
    svg.select('g.y.axis').call(yAxis)

    if (meta) {
      selection.append('p')
        .attr('class', 'chart-meta')
        .text(`${meta.label} · ${formatIndicatorInterval(meta.interval)} · ${data.length} bars`)
    }
  }
}
