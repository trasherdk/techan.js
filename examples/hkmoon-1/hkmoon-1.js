function drawChart () {
  const dim = {
    width: 960,
    height: 500,
    margin: { top: 20, right: 50, bottom: 30, left: 50 },
    ohlc: { height: 305 },
    indicator: { height: 65, padding: 5 }
  }
  dim.plot = {
    width: dim.width - dim.margin.left - dim.margin.right,
    height: dim.height - dim.margin.top - dim.margin.bottom
  }
  dim.indicator.top = dim.ohlc.height + dim.indicator.padding
  dim.indicator.bottom = dim.indicator.top + dim.indicator.height + dim.indicator.padding

  const indicatorTop = d3.scaleLinear()
    .range([dim.indicator.top, dim.indicator.bottom])

  const parseDate = d3.timeParse('%d-%b-%y')

  const zoom = d3.zoom()
    .on('zoom', zoomed)

  const x = techan.scale.financetime()
    .range([0, dim.plot.width])

  const y = d3.scaleLinear()
    .range([dim.ohlc.height, 0])

  const yPercent = y.copy() // Same as y at this stage, will get a different domain later

  const yVolume = d3.scaleLinear()
    .range([y(0), y(0.2)])

  const candlestick = techan.plot.candlestick()
    .xScale(x)
    .yScale(y)

  const tradearrow = techan.plot.tradearrow()
    .xScale(x)
    .yScale(y)
    .y((d) => {
      // Display the buy and sell arrows a bit above and below the price, so the price is still visible
      if (d.type === 'buy') return y(d.low) + 5
      if (d.type === 'sell') return y(d.high) - 5
      else return y(d.price)
    })

  const sma0 = techan.plot.sma()
    .xScale(x)
    .yScale(y)

  const sma1 = techan.plot.sma()
    .xScale(x)
    .yScale(y)

  const ema2 = techan.plot.ema()
    .xScale(x)
    .yScale(y)

  const volume = techan.plot.volume()
    .accessor(candlestick.accessor()) // Set the accessor to a ohlc accessor so we get highlighted bars
    .xScale(x)
    .yScale(yVolume)

  const trendline = techan.plot.trendline()
    .xScale(x)
    .yScale(y)

  const supstance = techan.plot.supstance()
    .xScale(x)
    .yScale(y)

  const xAxis = d3.axisBottom(x)

  const timeAnnotation = techan.plot.axisannotation()
    .axis(xAxis)
    .orient('bottom')
    .format(d3.timeFormat('%Y-%m-%d'))
    .width(65)
    .translate([0, dim.plot.height])

  const yAxis = d3.axisRight(y)

  const ohlcAnnotation = techan.plot.axisannotation()
    .axis(yAxis)
    .orient('right')
    .format(d3.format(',.2f'))
    .translate([x(1), 0])

  const closeAnnotation = techan.plot.axisannotation()
    .axis(yAxis)
    .orient('right')
    .accessor(candlestick.accessor())
    .format(d3.format(',.2f'))
    .translate([x(1), 0])

  const percentAxis = d3.axisLeft(yPercent)
    .tickFormat(d3.format('+.1%'))

  const percentAnnotation = techan.plot.axisannotation()
    .axis(percentAxis)
    .orient('left')

  const volumeAxis = d3.axisRight(yVolume)
    .ticks(3)
    .tickFormat(d3.format(',.3s'))

  const volumeAnnotation = techan.plot.axisannotation()
    .axis(volumeAxis)
    .orient('right')
    .width(35)

  const macdScale = d3.scaleLinear()
    .range([indicatorTop(0) + dim.indicator.height, indicatorTop(0)])

  const rsiScale = macdScale.copy()
    .range([indicatorTop(1) + dim.indicator.height, indicatorTop(1)])

  const macd = techan.plot.macd()
    .xScale(x)
    .yScale(macdScale)

  const macdAxis = d3.axisRight(macdScale)
    .ticks(3)

  const macdAnnotation = techan.plot.axisannotation()
    .axis(macdAxis)
    .orient('right')
    .format(d3.format(',.2f'))
    .translate([x(1), 0])

  const macdAxisLeft = d3.axisLeft(macdScale)
    .ticks(3)

  const macdAnnotationLeft = techan.plot.axisannotation()
    .axis(macdAxisLeft)
    .orient('left')
    .format(d3.format(',.2f'))

  const rsi = techan.plot.rsi()
    .xScale(x)
    .yScale(rsiScale)

  const rsiAxis = d3.axisRight(rsiScale)
    .ticks(3)

  const rsiAnnotation = techan.plot.axisannotation()
    .axis(rsiAxis)
    .orient('right')
    .format(d3.format(',.2f'))
    .translate([x(1), 0])

  const rsiAxisLeft = d3.axisLeft(rsiScale)
    .ticks(3)

  const rsiAnnotationLeft = techan.plot.axisannotation()
    .axis(rsiAxisLeft)
    .orient('left')
    .format(d3.format(',.2f'))

  const ohlcCrosshair = techan.plot.crosshair()
    .xScale(timeAnnotation.axis().scale())
    .yScale(ohlcAnnotation.axis().scale())
    .xAnnotation(timeAnnotation)
    .yAnnotation([ohlcAnnotation, percentAnnotation, volumeAnnotation])
    .verticalWireRange([0, dim.plot.height])

  const macdCrosshair = techan.plot.crosshair()
    .xScale(timeAnnotation.axis().scale())
    .yScale(macdAnnotation.axis().scale())
    .xAnnotation(timeAnnotation)
    .yAnnotation([macdAnnotation, macdAnnotationLeft])
    .verticalWireRange([0, dim.plot.height])

  const rsiCrosshair = techan.plot.crosshair()
    .xScale(timeAnnotation.axis().scale())
    .yScale(rsiAnnotation.axis().scale())
    .xAnnotation(timeAnnotation)
    .yAnnotation([rsiAnnotation, rsiAnnotationLeft])
    .verticalWireRange([0, dim.plot.height])

  let svg = d3.select('#chart').append('svg')
    .attr('width', dim.width)
    .attr('height', dim.height)

  const defs = svg.append('defs')

  defs.append('clipPath')
    .attr('id', 'ohlcClip')
    .append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', dim.plot.width)
    .attr('height', dim.ohlc.height)

  defs.selectAll('indicatorClip').data([0, 1])
    .enter()
    .append('clipPath')
    .attr('id', function (d, i) { return `indicatorClip-${i}` })
    .append('rect')
    .attr('x', 0)
    .attr('y', function (d, i) { return indicatorTop(i) })
    .attr('width', dim.plot.width)
    .attr('height', dim.indicator.height)

  svg = svg.append('g')
    .attr('transform', `translate(${dim.margin.left},${dim.margin.top})`)

  svg.append('text')
    .attr('class', 'symbol')
    .attr('x', 20)
    .text('Facebook, Inc. (FB)')

  svg.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,' + dim.plot.height + ')')

  const ohlcSelection = svg.append('g')
    .attr('class', 'ohlc')
    .attr('transform', 'translate(0,0)')

  ohlcSelection.append('g')
    .attr('class', 'axis')
    .attr('transform', 'translate(' + x(1) + ',0)')
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -12)
    .attr('dy', '.71em')
    .style('text-anchor', 'end')
    .text('Price ($)')

  ohlcSelection.append('g')
    .attr('class', 'close annotation up')

  ohlcSelection.append('g')
    .attr('class', 'volume')
    .attr('clip-path', 'url(#ohlcClip)')

  ohlcSelection.append('g')
    .attr('class', 'candlestick')
    .attr('clip-path', 'url(#ohlcClip)')

  ohlcSelection.append('g')
    .attr('class', 'indicator sma ma-0')
    .attr('clip-path', 'url(#ohlcClip)')

  ohlcSelection.append('g')
    .attr('class', 'indicator sma ma-1')
    .attr('clip-path', 'url(#ohlcClip)')

  ohlcSelection.append('g')
    .attr('class', 'indicator ema ma-2')
    .attr('clip-path', 'url(#ohlcClip)')

  ohlcSelection.append('g')
    .attr('class', 'percent axis')

  ohlcSelection.append('g')
    .attr('class', 'volume axis')

  const indicatorSelection = svg.selectAll('svg > g.indicator').data(['macd', 'rsi']).enter()
    .append('g')
    .attr('class', function (d) { return d + ' indicator' })

  indicatorSelection.append('g')
    .attr('class', 'axis right')
    .attr('transform', 'translate(' + x(1) + ',0)')

  indicatorSelection.append('g')
    .attr('class', 'axis left')
    .attr('transform', 'translate(' + x(0) + ',0)')

  indicatorSelection.append('g')
    .attr('class', 'indicator-plot')
    .attr('clip-path', function (d, i) { return 'url(#indicatorClip-' + i + ')' })

  // Add trendlines and other interactions last to be above zoom pane
  svg.append('g')
    .attr('class', 'crosshair ohlc')

  svg.append('g')
    .attr('class', 'tradearrow')
    .attr('clip-path', 'url(#ohlcClip)')

  svg.append('g')
    .attr('class', 'crosshair macd')

  svg.append('g')
    .attr('class', 'crosshair rsi')

  svg.append('g')
    .attr('class', 'trendlines analysis')
    .attr('clip-path', 'url(#ohlcClip)')
  svg.append('g')
    .attr('class', 'supstances analysis')
    .attr('clip-path', 'url(#ohlcClip)')

  d3.select('button').on('click', reset)

  const url = 'https://gist.githubusercontent.com/andredumas/27c4a333b0e0813e093d/raw/ca6191ee1820b61dc7722d217ea59a2ee4a9a57c/data.csv'

  d3.csv(url)
    .then(data => {
      const accessor = candlestick.accessor()
      const indicatorPreRoll = 33 // Don't show where indicators don't have data

      data = data.map((d) => ({
        date: parseDate(d.Date),
        open: +d.Open,
        high: +d.High,
        low: +d.Low,
        close: +d.Close,
        volume: +d.Volume
      })).sort((a, b) => d3.ascending(accessor.d(a), accessor.d(b)))

      x.domain(techan.scale.plot.time(data).domain())
      y.domain(techan.scale.plot.ohlc(data.slice(indicatorPreRoll)).domain())
      yPercent.domain(techan.scale.plot.percent(y, accessor(data[indicatorPreRoll])).domain())
      yVolume.domain(techan.scale.plot.volume(data).domain())

      const trendlineData = [
        { start: { date: new Date(2014, 2, 11), value: 72.50 }, end: { date: new Date(2014, 5, 9), value: 63.34 } },
        { start: { date: new Date(2013, 10, 21), value: 43 }, end: { date: new Date(2014, 2, 17), value: 70.50 } }
      ]

      const supstanceData = [
        { start: new Date(2014, 2, 11), end: new Date(2014, 5, 9), value: 63.64 },
        { start: new Date(2013, 10, 21), end: new Date(2014, 2, 17), value: 55.50 }
      ]

      const trades = [
        { date: data[67].date, type: 'buy', price: data[67].low, low: data[67].low, high: data[67].high },
        { date: data[100].date, type: 'sell', price: data[100].high, low: data[100].low, high: data[100].high },
        { date: data[130].date, type: 'buy', price: data[130].low, low: data[130].low, high: data[130].high },
        { date: data[170].date, type: 'sell', price: data[170].low, low: data[170].low, high: data[170].high }
      ]

      const macdData = techan.indicator.macd()(data)
      macdScale.domain(techan.scale.plot.macd(macdData).domain())
      const rsiData = techan.indicator.rsi()(data)
      rsiScale.domain(techan.scale.plot.rsi(rsiData).domain())

      svg.select('g.candlestick').datum(data).call(candlestick)
      svg.select('g.close.annotation').datum([data[data.length - 1]]).call(closeAnnotation)
      svg.select('g.volume').datum(data).call(volume)
      svg.select('g.sma.ma-0').datum(techan.indicator.sma().period(10)(data)).call(sma0)
      svg.select('g.sma.ma-1').datum(techan.indicator.sma().period(20)(data)).call(sma1)
      svg.select('g.ema.ma-2').datum(techan.indicator.ema().period(50)(data)).call(ema2)
      svg.select('g.macd .indicator-plot').datum(macdData).call(macd)
      svg.select('g.rsi .indicator-plot').datum(rsiData).call(rsi)

      svg.select('g.crosshair.ohlc').call(ohlcCrosshair).call(zoom)
      svg.select('g.crosshair.macd').call(macdCrosshair).call(zoom)
      svg.select('g.crosshair.rsi').call(rsiCrosshair).call(zoom)
      svg.select('g.trendlines').datum(trendlineData).call(trendline).call(trendline.drag)
      svg.select('g.supstances').datum(supstanceData).call(supstance).call(supstance.drag)

      svg.select('g.tradearrow').datum(trades).call(tradearrow)

      // Stash for zooming
      const zoomableInit = x.zoomable().domain([indicatorPreRoll, data.length]).copy() // Zoom in a little to hide indicator preroll
      const yInit = y.copy()
      const yPercentInit = yPercent.copy()

      draw()

    }).catch(error => {
      console.error('d3.csv()', error)
    })


  function reset () {
    zoom.scale(1)
    zoom.translate([0, 0])
    draw()
  }

  function zoomed () {
    x.zoomable().domain(d3.event.transform.rescaleX(zoomableInit).domain())
    y.domain(d3.event.transform.rescaleY(yInit).domain())
    yPercent.domain(d3.event.transform.rescaleY(yPercentInit).domain())

    draw()
  }

  function draw () {
    svg.select('g.x.axis').call(xAxis)
    svg.select('g.ohlc .axis').call(yAxis)
    svg.select('g.volume.axis').call(volumeAxis)
    svg.select('g.percent.axis').call(percentAxis)
    svg.select('g.macd .axis.right').call(macdAxis)
    svg.select('g.rsi .axis.right').call(rsiAxis)
    svg.select('g.macd .axis.left').call(macdAxisLeft)
    svg.select('g.rsi .axis.left').call(rsiAxisLeft)

    // We know the data does not change, a simple refresh that does not perform data joins will suffice.
    svg.select('g.candlestick').call(candlestick.refresh)
    svg.select('g.close.annotation').call(closeAnnotation.refresh)
    svg.select('g.volume').call(volume.refresh)
    svg.select('g .sma.ma-0').call(sma0.refresh)
    svg.select('g .sma.ma-1').call(sma1.refresh)
    svg.select('g .ema.ma-2').call(ema2.refresh)
    svg.select('g.macd .indicator-plot').call(macd.refresh)
    svg.select('g.rsi .indicator-plot').call(rsi.refresh)
    svg.select('g.crosshair.ohlc').call(ohlcCrosshair.refresh)
    svg.select('g.crosshair.macd').call(macdCrosshair.refresh)
    svg.select('g.crosshair.rsi').call(rsiCrosshair.refresh)
    svg.select('g.trendlines').call(trendline.refresh)
    svg.select('g.supstances').call(supstance.refresh)
    svg.select('g.tradearrow').call(tradearrow.refresh)
  }
}
