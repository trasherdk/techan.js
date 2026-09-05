function macdChart (data, meta) {
  const margin = { top: 20, right: 20, bottom: 30, left: 50 }
  const width = Math.max(640, window.innerWidth - 40) - margin.left - margin.right
  const height = 500 - margin.top - margin.bottom

  const x = techan.scale.financetime()
    .range([0, width])

  const y = d3.scaleLinear()
    .range([height, 0])

  const macd = techan.plot.macd()
    .xScale(x)
    .yScale(y)

  const accessor = macd.accessor()
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
      .attr('class', 'macd')

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
      .text('MACD')

    const sorted = data.slice().sort(function (a, b) {
      return d3.ascending(accessor.d(a), accessor.d(b))
    })
    const macdData = techan.indicator.macd()(sorted)
    x.domain(macdData.map(accessor.d))
    y.domain(techan.scale.plot.macd(macdData).domain())

    svg.select('g.macd').datum(macdData).call(macd)
    svg.select('g.x.axis').call(xAxis)
    svg.select('g.y.axis').call(yAxis)

    if (meta) {
      selection.append('p')
        .attr('class', 'chart-meta')
        .text(`${meta.label} · ${formatIndicatorInterval(meta.interval)} · ${data.length} bars`)
    }
  }
}
