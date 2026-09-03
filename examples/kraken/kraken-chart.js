
async function chart (name, symbol, currency, fullWidth, fullHeight) {
  const dim = dimension()
  const headerHeight = 22
  const frameHeight = Math.max(180, fullHeight - headerHeight)
  const margin = dim.margin || { top: 20, right: 75, bottom: 60, left: 75 }
  const width = Math.floor(fullWidth - margin.left - margin.right)
  const height = Math.floor(frameHeight - margin.top - margin.bottom)
  const volumeHeight = frameHeight * 0.25
  const pair = resolvePair(symbol, currency)
  const wsname = pairWsname(pair)
  const interval = params.interval
    ? Number(params.interval)
    : resolveInterval(params.res, params.agg)
  const maxVisible = visibleBarCount(width)

  const root = document.getElementsByTagName('main')[0]
  const chartEl = document.createElement('chart')
  chartEl.setAttribute('id', name)
  chartEl.setAttribute('class', 'chart')
  chartEl.style.maxWidth = `${Math.floor(fullWidth)}px`
  chartEl.style.height = `${fullHeight}px`
  chartEl.style.overflow = 'visible'

  const chartTitle = `${symbolLabel(wsname.split('/')[0])} (${wsname}, ${formatKrakenInterval(interval)})`

  const chartHeader = document.createElement('div')
  chartHeader.className = 'chart-header'

  const titleEl = document.createElement('span')
  titleEl.className = 'chart-title'
  titleEl.textContent = chartTitle
  chartHeader.appendChild(titleEl)

  const barInfo = document.createElement('span')
  barInfo.className = 'chart-bar-info'
  barInfo.textContent = '—'
  chartHeader.appendChild(barInfo)

  const liveHud = document.createElement('div')
  liveHud.className = 'live-hud'

  const liveTick = document.createElement('span')
  liveTick.className = 'live-tick'
  liveHud.appendChild(liveTick)

  const liveLed = document.createElement('span')
  liveLed.className = 'live-led'
  liveLed.setAttribute('aria-hidden', 'true')
  liveLed.title = 'Live feed activity'
  liveHud.appendChild(liveLed)

  chartHeader.appendChild(liveHud)
  chartEl.appendChild(chartHeader)

  const intervalRemaining = document.createElement('span')
  intervalRemaining.className = 'interval-remaining'
  intervalRemaining.textContent = '—'
  intervalRemaining.title = 'Time remaining in current candle'
  chartEl.appendChild(intervalRemaining)

  root.appendChild(chartEl)

  await d3.json('https://cdn.jsdelivr.net/npm/d3-time-format@3/locale/da-DK.json').then(locale => {
    d3.timeFormatDefaultLocale(locale)
  }).catch(error => {
    throw error.message
  })

  let x = techan.scale.financetime()
    .range([0, width])

  let y = d3.scaleLinear()
    .range([height, 0])

  let yPercent = y.copy()

  let yVolume = d3.scaleLinear()
    .range([height, height - volumeHeight])

  let yInit, yPercentInit, zoomableInit

  let ohlc = techan.plot.ohlc()
    .xScale(x)
    .yScale(y)

  let accessor = ohlc.accessor()
  let volAccessor = krakenVolumeAccessor(accessor)

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
    .accessor(volAccessor)
    .xScale(x)
    .yScale(yVolume)

  let xAxis = d3.axisBottom(x)

  let yAxis = d3.axisRight(y)

  let percentAxis = d3.axisLeft(yPercent)
    .ticks(4)
    .tickFormat(d3.format('+.1%'))

  let volumeAxis = d3.axisRight(yVolume)
    .ticks(2)
    .tickFormat(formatKrakenAmountCompact)

  const timeAnnotation = techan.plot.axisannotation()
    .axis(xAxis)
    .orient('bottom')
    .format(d3.timeFormat('%d/%m %H:%M'))
    .width(72)
    .height(12)
    .translate([0, height])

  const ohlcAnnotation = techan.plot.axisannotation()
    .axis(yAxis)
    .orient('right')
    .format(d3.format(',.2f'))
    .width(44)
    .height(12)
    .translate([width, 0])

  const percentAnnotation = techan.plot.axisannotation()
    .axis(percentAxis)
    .orient('left')
    .width(40)
    .height(12)

  const volumeAnnotation = techan.plot.axisannotation()
    .axis(volumeAxis)
    .orient('right')
    .width(32)
    .height(12)

  const ohlcCrosshair = techan.plot.crosshair()
    .xScale(timeAnnotation.axis().scale())
    .yScale(ohlcAnnotation.axis().scale())
    .xAnnotation(timeAnnotation)
    .yAnnotation([ohlcAnnotation, percentAnnotation, volumeAnnotation])
    .verticalWireRange([0, height])

  let svg = d3.select(`#${name}`).append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  svg.append('clipPath')
    .attr('id', `clip-${name}`)
    .append('rect')
    .attr('width', width)
    .attr('height', height)

  svg.append('g')
    .attr('class', 'volume')
    .attr('clip-path', `url(#clip-${name})`)

  svg.append('g')
    .attr('class', 'ohlc')
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

  const crosshairG = svg.append('g')
    .attr('class', 'crosshair')

  let panSurface = null

  let panStartDomain = null
  let panStartX = 0
  let suppressViewSave = false
  let rolloverTimer = null
  let countdownTimer = null
  let catchUpInFlight = false
  let lastTradeTokens = 0

  const pan = d3.drag()
    .on('start', function () {
      clearCrosshair()
      beginKrakenPan()
      stopIntervalRollover()
      panStartDomain = x.zoomable().domain().slice()
      panStartX = d3.event.x
      if (panSurface) {
        panSurface.classed('grabbing', true)
      }
    })
    .on('drag', function () {
      const span = panStartDomain[1] - panStartDomain[0]
      const delta = -((d3.event.x - panStartX) / width) * span
      const domain = clampXDomain(
        [panStartDomain[0] + delta, panStartDomain[1] + delta],
        loadKrakenViewState()
      )
      applyPanDomain(domain, loadKrakenViewState())
      draw('pan')
      scheduleKrakenPanSync(domain, name)
    })
    .on('end', function () {
      endKrakenPan()
      if (panSurface) {
        panSurface.classed('grabbing', false)
      }
      applyXDomain(x.zoomable().domain(), loadKrakenViewState())
      draw('refresh')
      syncViewStateFromChart()
      scheduleIntervalRollover()
    })

  function crosshairNode () {
    return crosshairG.select('g.data.scope-crosshair').node()
      || crosshairG.select('g.data').node()
  }

  function clearCrosshair () {
    const node = crosshairNode()
    if (node) {
      delete node.__coord__
      crosshairG.datum([]).call(ohlcCrosshair.refresh)
    }
    updateBarInfo(null)
  }

  function barAtCrosshair () {
    const node = crosshairNode()
    if (!node) {
      return null
    }

    const datum = d3.select(node).datum()
    if (datum && datum.x != null) {
      const t = datum.x instanceof Date ? datum.x.getTime() : new Date(datum.x).getTime()
      for (let i = data.length - 1; i >= 0; i--) {
        if (accessor.d(data[i]).getTime() === t) {
          return data[i]
        }
      }
    }

    if (node.__coord__) {
      const idx = Math.round(x.zoomable().invertToIndex(node.__coord__[0]))
      if (idx >= 0 && idx < data.length) {
        return data[idx]
      }
    }

    return null
  }

  function updateBarInfo (bar) {
    if (!bar) {
      barInfo.textContent = '—'
      return
    }
    const unit = krakenVolumeUnit(symbol, currency)
    barInfo.textContent = `${formatKrakenAmount(krakenBarVolume(bar))} ${unit}`
  }

  function refreshBarInfoIfActive () {
    const node = crosshairNode()
    if (!node || node.__coord__ === undefined) {
      return
    }
    updateBarInfo(barAtCrosshair())
  }

  function initCrosshair () {
    crosshairG.datum([]).call(ohlcCrosshair)
    panSurface = crosshairG.select('rect')
    panSurface
      .classed('crosshair-pane', true)
      .call(pan)
      .on('dblclick', resetToDefaultView)
      .on('mousemove.barinfo', function () {
        updateBarInfo(barAtCrosshair())
      })

    ohlcCrosshair.on('enter', function () {
      updateBarInfo(barAtCrosshair())
    })
    ohlcCrosshair.on('move', function () {
      updateBarInfo(barAtCrosshair())
    })
    ohlcCrosshair.on('out', function () {
      updateBarInfo(null)
    })
  }

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

  data = data.sort((a, b) => d3.ascending(accessor.d(a), accessor.d(b)))

  x.zoomable().clamp(false)

  function rightPad () {
    return Math.max(4, Math.floor(maxVisible * 0.08))
  }

  function maxPanEnd (state) {
    const margin = savedKrakenRightMargin(state, rightPad())
    return data.length - 1 + Math.max(margin * 2.5, rightPad() * 2.5)
  }

  function clampXDomain (domain, state) {
    const span = domain[1] - domain[0]
    let start = domain[0]
    let end = domain[1]
    const maxEnd = maxPanEnd(state)

    if (end > maxEnd) {
      end = maxEnd
      start = end - span
    }
    if (start < 0) {
      start = 0
      end = start + span
    }

    end = Math.min(maxEnd, end)
    start = Math.max(0, start)

    if (end <= start) {
      end = start + 2
    }

    return [start, end]
  }

  function applyPanDomain (domain, state) {
    const clamped = clampXDomain(domain, state)
    x.zoomable().domain(clamped)
    zoomableInit = x.zoomable().copy()
    return clamped
  }

  function applyXDomain (domain, state) {
    const clamped = clampXDomain(domain, state)
    x.domain(techan.scale.plot.time(data, accessor).domain())
    x.zoomable().domain(clamped)
    zoomableInit = x.zoomable().copy()
    updateYScalesForView()
  }

  function visibleDataSlice () {
    const domain = x.zoomable().domain()
    const sliceStart = Math.max(0, Math.floor(domain[0]))
    const sliceEnd = Math.min(data.length, Math.max(sliceStart + 1, Math.ceil(domain[1])))
    return data.slice(sliceStart, sliceEnd)
  }

  function volumeScaleDomain (visible) {
    if (visible.length === 0) {
      return [0, 1]
    }

    const closed = visible.slice(0, -1)
    const forming = volAccessor.v(visible[visible.length - 1])
    let baseline = closed.length ? d3.max(closed, volAccessor.v) : 0

    if (baseline === 0 && data.length > 1) {
      baseline = d3.max(data.slice(0, -1), volAccessor.v) || 0
    }

    if (baseline > 0) {
      return [0, Math.max(baseline * 1.15, forming)]
    }

    return [0, Math.max(forming * 1.15, 1e-12)]
  }

  function updateYScalesForView () {
    const visible = visibleDataSlice()
    if (visible.length === 0) {
      return
    }

    y.domain(techan.scale.plot.ohlc(visible, accessor).domain())
    yPercent.domain(techan.scale.plot.percent(y, accessor(visible[0])).domain())
    yVolume.domain(volumeScaleDomain(visible))
    yInit = y.copy()
    yPercentInit = yPercent.copy()
  }

  function shouldFollowLive () {
    return loadKrakenViewState().followLive !== false
  }

  function applyGlobalView (state) {
    state = state || loadKrakenViewState()
    const span = state.viewSpan || maxVisible
    const margin = savedKrakenRightMargin(state, rightPad())
    const defaultEnd = data.length - 1 + margin
    const panOffset = state.panOffset || 0
    let end = defaultEnd - panOffset
    end = Math.min(maxPanEnd(state), end)
    const start = end - span

    suppressViewSave = true
    applyXDomain([start, end], state)
    suppressViewSave = false
  }

  function syncViewStateFromChart () {
    if (suppressViewSave) {
      return
    }

    const state = loadKrakenViewState()
    const margin = savedKrakenRightMargin(state, rightPad())
    const defaultEnd = data.length - 1 + margin
    const zd = x.zoomable().domain()
    const span = zd[1] - zd[0]
    const endBeyondLast = zd[1] - (data.length - 1)
    let panOffset = Math.max(0, defaultEnd - zd[1])
    let rightMargin = margin

    if (endBeyondLast > margin + 0.5 && panOffset < 1) {
      rightMargin = endBeyondLast
      panOffset = 0
    }

    saveKrakenViewState({
      viewSpan: span,
      rightMargin: rightMargin,
      panOffset: panOffset,
      followLive: panOffset < Math.max(2, span * 0.15)
    })
  }

  function resetToDefaultView () {
    const state = loadKrakenViewState()
    saveKrakenViewState({
      rightMargin: savedKrakenRightMargin(state, rightPad()),
      panOffset: 0,
      followLive: true
    })
    applyGlobalView(loadKrakenViewState())
    draw('refresh')
  }

  function rebindPlots () {
    svg.select('g.ohlc').datum(data).call(ohlc)
    svg.select('g.volume').datum(data).call(volume)
    svg.select('g.sma.ma-0').datum(techan.indicator.sma().period(10)(data)).call(sma0)
    svg.select('g.sma.ma-1').datum(techan.indicator.sma().period(26)(data)).call(sma1)
    svg.select('g.ema.ma-2').datum(techan.indicator.ema().period(9)(data)).call(ema2)
    crosshairG.raise()
  }

  rebindPlots()
  applyGlobalView(loadKrakenViewState())
  initCrosshair()
  draw('refresh')
  if (data.length > 0) {
    updateLiveTick(data[data.length - 1])
  }

  const removeViewListener = registerKrakenViewListener(function (state, meta) {
    if (meta && meta.panDomain) {
      if (meta.sourceId === name) {
        return
      }
      suppressViewSave = true
      applyPanDomain(meta.panDomain, state)
      suppressViewSave = false
      draw('pan')
      return
    }
    applyGlobalView(state)
    draw('refresh')
  })

  const v2Symbol = wsV2Symbol(wsname)
  const intervalMs = interval * 60 * 1000

  registerKrakenLiveHandler(v2Symbol, onLiveBar)
  registerKrakenCatchUpHandler(v2Symbol, catchUpFromApi)
  registerKrakenLiveRolloverStop(function () {
    stopIntervalRollover()
    stopIntervalCountdown()
    unregisterKrakenCatchUpHandler(v2Symbol)
    removeViewListener()
  })
  scheduleIntervalRollover()
  startIntervalCountdown()

  function formatTickPrice (price) {
    const p = +price
    if (!isFinite(p)) {
      return '—'
    }
    return d3.format(',.2f')(p)
  }

  function formatTickAmount (amount) {
    return formatKrakenAmount(amount)
  }

  function isFlatBar (bar) {
    const vol = bar.volumefrom ?? bar.volume ?? 0
    return vol === 0 &&
      bar.open === bar.high &&
      bar.high === bar.low &&
      bar.low === bar.close
  }

  function trimTrailingFlatBars () {
    while (data.length > 1 && isFlatBar(data[data.length - 1])) {
      data.pop()
    }
  }

  function findSyntheticGapStart () {
    for (let i = 0; i < data.length - 1; i++) {
      if (!isFlatBar(data[i])) {
        continue
      }
      let j = i + 1
      while (j < data.length && isFlatBar(data[j])) {
        j++
      }
      if (j - i >= 2) {
        return i
      }
      i = j - 1
    }
    return -1
  }

  function needsHistoryCatchUp () {
    if (findSyntheticGapStart() >= 0) {
      return true
    }
    const last = data[data.length - 1]
    const nextBegin = accessor.d(last).getTime() + intervalMs
    return nextBegin <= Date.now() - intervalMs
  }

  function mergeHistoryBars (fetched) {
    fetched.sort(function (a, b) {
      return d3.ascending(accessor.d(a), accessor.d(b))
    })

    fetched.forEach(function (bar) {
      const barTime = accessor.d(bar).getTime()
      let idx = -1

      for (let i = data.length - 1; i >= 0; i--) {
        const time = accessor.d(data[i]).getTime()
        if (time === barTime) {
          idx = i
          break
        }
        if (time < barTime) {
          break
        }
      }

      if (idx >= 0) {
        mergeBar(data[idx], bar)
        return
      }

      let insertAt = 0
      for (let i = data.length - 1; i >= 0; i--) {
        if (accessor.d(data[i]).getTime() < barTime) {
          insertAt = i + 1
          break
        }
      }
      data.splice(insertAt, 0, bar)
    })

    while (data.length > 720) {
      data.shift()
    }
  }

  async function catchUpFromApi () {
    if (catchUpInFlight || kraken.panning || data.length === 0) {
      return
    }
    if (!needsHistoryCatchUp()) {
      return
    }

    catchUpInFlight = true
    stopIntervalRollover()

    try {
      const gapStart = findSyntheticGapStart()
      let anchorIdx

      if (gapStart >= 0) {
        anchorIdx = Math.max(0, gapStart - 1)
        data.splice(gapStart)
      } else {
        trimTrailingFlatBars()
        anchorIdx = data.length - 1
      }

      const anchor = data[anchorIdx]
      if (!anchor) {
        return
      }

      const since = Math.floor(accessor.d(anchor).getTime() / 1000)
      const fetched = await fetchOhlc(pair, interval, {
        api: params.api,
        since: since
      })

      if (!fetched || fetched.length === 0) {
        return
      }

      mergeHistoryBars(fetched)

      if (shouldFollowLive()) {
        applyGlobalView(loadKrakenViewState())
      } else {
        updateYScalesForView()
      }
      draw('full')
      updateLiveTick(data[data.length - 1])
      refreshBarInfoIfActive()
    } catch (error) {
      console.log('catchUpFromApi', error.message)
    } finally {
      catchUpInFlight = false
      scheduleIntervalRollover()
    }
  }

  function flatBarAt (close, date) {
    return {
      date: date,
      open: close,
      high: close,
      low: close,
      close: close,
      volumefrom: 0,
      volumeto: 0,
      volume: 0
    }
  }

  function mergeBar (target, source) {
    target.open = source.open
    target.high = source.high
    target.low = source.low
    target.close = source.close
    target.volumefrom = source.volumefrom
    target.volume = source.volume
    if (source.vwap != null) {
      target.vwap = source.vwap
    }
    target.volumeto = source.volumeto != null
      ? source.volumeto
      : (target.volumefrom * (target.vwap ?? target.close))
  }

  function tradeTokenDelta (prev, next) {
    return Math.max(0, barVolume(next) - barVolume(prev))
  }

  function recordLastTrade (prevBar, nextBar, isNewBar) {
    if (isNewBar) {
      lastTradeTokens = barVolume(nextBar)
      return
    }
    const delta = tradeTokenDelta(prevBar, nextBar)
    if (delta > 0) {
      lastTradeTokens = delta
    }
  }

  function updateLiveTick (bar) {
    if (!bar) {
      liveTick.textContent = '— · — · —'
      liveTick.removeAttribute('title')
      return
    }

    const price = accessor.c(bar)
    const baseUnit = krakenVolumeUnit(symbol, currency, 'from')
    const quoteUnit = krakenVolumeUnit(symbol, currency, 'to')
    const parts = [formatTickPrice(price)]

    if (lastTradeTokens > 0) {
      parts.push(`${formatKrakenAmount(lastTradeTokens)} ${baseUnit}`)
      parts.push(`${formatKrakenAmount(lastTradeTokens * price)} ${quoteUnit}`)
    } else {
      parts.push('—', '—')
    }

    liveTick.textContent = parts.join(' · ')
    liveTick.title = 'Last trade · size (base) · size × price (quote)'
  }

  function refreshIndicators () {
    svg.select('g.sma.ma-0').datum(techan.indicator.sma().period(10)(data)).call(sma0.refresh)
    svg.select('g.sma.ma-1').datum(techan.indicator.sma().period(26)(data)).call(sma1.refresh)
    svg.select('g.ema.ma-2').datum(techan.indicator.ema().period(9)(data)).call(ema2.refresh)
  }

  function barVolume (bar) {
    return bar.volumefrom ?? bar.volume ?? 0
  }

  function liveBarChanged (prev, next) {
    return prev.open !== next.open ||
      prev.high !== next.high ||
      prev.low !== next.low ||
      prev.close !== next.close ||
      barVolume(prev) !== barVolume(next)
  }

  function applyBar (bar, options) {
    if (kraken.panning) {
      return false
    }

    const barTime = accessor.d(bar).getTime()
    const last = data[data.length - 1]
    const lastTime = last ? accessor.d(last).getTime() : 0
    const followLive = shouldFollowLive()
    let replaced = false
    let structureChanged = false

    if (last && barTime === lastTime) {
      if (!liveBarChanged(last, bar)) {
        return false
      }
      recordLastTrade(last, bar, false)
      mergeBar(last, bar)
      replaced = true
    } else if (!last || barTime > lastTime) {
      recordLastTrade(last, bar, true)
      data.push(bar)
      structureChanged = true
      if (data.length > 720) {
        data.shift()
      }
    } else {
      return false
    }

    if ((!options || options.flash !== false) && (structureChanged || replaced)) {
      flashLiveLed()
    }

    if (followLive) {
      applyGlobalView(loadKrakenViewState())
    } else if (structureChanged || replaced) {
      updateYScalesForView()
    }

    if (replaced && !structureChanged) {
      refreshIndicators()
      draw('refresh')
    } else {
      draw('full')
    }
    updateLiveTick(last && barTime === lastTime ? last : bar)
    refreshBarInfoIfActive()
    updateIntervalRemaining()
    return true
  }

  function stopIntervalRollover () {
    if (rolloverTimer) {
      clearTimeout(rolloverTimer)
      rolloverTimer = null
    }
  }

  function intervalRemainingMs () {
    const last = data[data.length - 1]
    if (!last) {
      return 0
    }
    const nextBegin = accessor.d(last).getTime() + intervalMs
    return Math.max(0, nextBegin - Date.now())
  }

  function updateIntervalRemaining () {
    intervalRemaining.textContent = formatIntervalRemaining(intervalRemainingMs(), interval)
  }

  function startIntervalCountdown () {
    stopIntervalCountdown()
    updateIntervalRemaining()
    countdownTimer = setInterval(updateIntervalRemaining, 1000)
  }

  function stopIntervalCountdown () {
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  function catchUpIntervalRollovers () {
    if (kraken.panning || catchUpInFlight) {
      return
    }

    const now = Date.now()
    const last = data[data.length - 1]
    const nextBegin = accessor.d(last).getTime() + intervalMs

    if (nextBegin > now) {
      return
    }

    const missed = Math.floor((now - nextBegin) / intervalMs) + 1
    if (missed >= 2) {
      catchUpFromApi()
      return
    }

    if (!applyBar(flatBarAt(accessor.c(last), new Date(nextBegin)), { flash: false })) {
      catchUpFromApi()
    }
  }

  function scheduleIntervalRollover () {
    stopIntervalRollover()
    if (data.length === 0) {
      return
    }

    catchUpIntervalRollovers()

    const last = data[data.length - 1]
    const nextBegin = accessor.d(last).getTime() + intervalMs
    const delay = Math.max(50, nextBegin - Date.now() + 50)

    rolloverTimer = setTimeout(function () {
      rolloverTimer = null
      catchUpIntervalRollovers()
      updateIntervalRemaining()
      scheduleIntervalRollover()
    }, delay)
  }

  function flashLiveLed () {
    liveLed.classList.remove('flash')
    void liveLed.offsetWidth
    liveLed.classList.add('flash')
  }

  function onLiveBar (bar) {
    applyBar(bar)
    scheduleIntervalRollover()
  }

  function configureXAxis () {
    const zd = x.zoomable().domain()
    const visibleBars = Math.max(1, zd[1] - zd[0])
    const tickCount = axisTickCount(width)
    x.ticks(tickCount)
    const fmt = axisTimeFormat(interval, visibleBars)
    const crosshairFmt = formatCrosshairTime(interval, visibleBars)
    xAxis
      .ticks(tickCount)
      .tickFormat(fmt)
    timeAnnotation.format(crosshairFmt)
  }

  function renderXAxis () {
    const ticks = svg.select('g.x.axis')
    ticks.call(xAxis)
    const tickTexts = ticks.selectAll('.tick text')
    tickTexts.attr('text-anchor', 'middle')
    const nodes = tickTexts.nodes()
    if (nodes.length > 0) {
      d3.select(nodes[0]).attr('text-anchor', 'start')
      d3.select(nodes[nodes.length - 1]).attr('text-anchor', 'end')
    }
  }

  function draw (mode) {
    try {
      configureXAxis()
      renderXAxis()

      if (mode === 'pan') {
        svg.select('g.ohlc').call(ohlc.refresh)
        svg.select('g.volume').call(volume.refresh)
        svg.select('g.sma.ma-0').call(sma0.refresh)
        svg.select('g.sma.ma-1').call(sma1.refresh)
        svg.select('g.ema.ma-2').call(ema2.refresh)
      } else {
        svg.select('g.y.axis').call(yAxis)
        svg.select('g.volume.axis').call(volumeAxis)
        svg.select('g.percent.axis').call(percentAxis)

        if (mode === 'refresh') {
          svg.select('g.volume.axis').call(volumeAxis)
          svg.select('g.ohlc').datum(data).call(ohlc)
          svg.select('g.volume').datum(data).call(volume)
          svg.select('g.sma.ma-0').call(sma0.refresh)
          svg.select('g.sma.ma-1').call(sma1.refresh)
          svg.select('g.ema.ma-2').call(ema2.refresh)
        } else {
          rebindPlots()
          crosshairG.call(ohlcCrosshair.refresh)
        }
      }

      crosshairG.raise()
    } catch (error) {
      console.log('draw() try => catch', error.message)
      return false
    }
  }

  return v2Symbol
}
