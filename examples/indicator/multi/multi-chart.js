
async function chart(name, symbol, currency, fullWidth, fullHeight) {
  let margin = { top: 50, right: 75, bottom: 50, left: 75 },
    width = fullWidth - margin.left - margin.right,
    height = fullHeight - margin.top - margin.bottom,
    volumeHeight = fullHeight * 0.25;

  //  let parseDate = d3.timeParse("%d-%b-%y");
  //  let parseDate = d3.timeParse("%h:%m");

  const root = document.getElementsByClassName("container")[0];
  const chart = document.createElement("chart");
  chart.setAttribute("id", name);
  chart.setAttribute("class","chart");
  chart.style.cssText = `max-width: ${fullWidth}; max-height: ${fullHeight}`;
  //chart.setAttribute("style",`max-height: ${fullHeight}`);
  root.appendChild(chart);

  let zoom = d3.zoom()
    .on("zoom", zoomed);

  let x = techan.scale.financetime()
    .range([0, width]);

  let y = d3.scaleLinear()
    .range([height, 0]);

  let yPercent = y.copy();   // Same as y at this stage, will get a different domain later

  let yVolume = d3.scaleLinear()
    .range([height, height - volumeHeight]);

  let yInit, yPercentInit, zoomableInit;

  let candlestick = techan.plot.candlestick()
    .xScale(x)
    .yScale(y);

  let sma0 = techan.plot.sma()
    .xScale(x)
    .yScale(y);

  let sma1 = techan.plot.sma()
    .xScale(x)
    .yScale(y);

  let ema2 = techan.plot.ema()
    .xScale(x)
    .yScale(y);

  let volume = techan.plot.volume()
    .accessor(candlestick.accessor())   // Set the accessor to a ohlc accessor so we get highlighted bars
    .xScale(x)
    .yScale(yVolume);

  let xAxis = d3.axisBottom(x);
  //                .ticks(4);

  let yAxis = d3.axisRight(y);
  //                .ticks(4);

  let percentAxis = d3.axisLeft(yPercent)
    .ticks(4)
    .tickFormat(d3.format('+.1%'));

  let volumeAxis = d3.axisRight(yVolume)
    .ticks(2)
    .tickFormat(d3.format(",.3s"));

  let svg = d3.select(`#${name}`).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("x", 0)
    .attr("y", y(1))
    .attr("width", width)
    .attr("height", y(0) - y(1));

  svg.append('text')
    .attr("class", "symbol")
    .attr("x", 5)
    .text(symbol + " (" + currency + ")");

  svg.append("g")
    .attr("class", "volume")
    .attr("clip-path", "url(#clip)");

  svg.append("g")
    .attr("class", "candlestick")
    .attr("clip-path", "url(#clip)");

  svg.append("g")
    .attr("class", "indicator sma ma-0")
    .attr("clip-path", "url(#clip)");

  svg.append("g")
    .attr("class", "indicator sma ma-1")
    .attr("clip-path", "url(#clip)");

  svg.append("g")
    .attr("class", "indicator ema ma-2")
    .attr("clip-path", "url(#clip)");

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")");

  svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + width + ",0)");

  svg.append("g")
    .attr("class", "percent axis");

  svg.append("g")
    .attr("class", "volume axis");

  svg.append("rect")
    .attr("class", "pane")
    .attr("width", width)
    .attr("height", height)
    .call(zoom);

  let str = defparam[params.res].url + "?fsym=" + symbol + "&tsym=" + currency + "&limit=" + (params.limit ? params.limit : defparam[params.res].limit);

  console.log(str);

  await d3.json(defparam.dataurl + str, (error, data) => {

    let accessor = candlestick.accessor(),
      indicatorPreRoll = 33;  // Don't show where indicators don't have data

    data = data.Data.map(function (d) {
      return {
        date: new Date(d.time * 1000),  // new Date(d.time * 1000),
        volume: +d.volumeto,
        open: +d.open,
        high: +d.high,
        low: +d.low,
        close: +d.close
      };
    }).sort(function (a, b) {
      return d3.ascending(accessor.d(a), accessor.d(b));
    });

    x.domain(techan.scale.plot.time(data, accessor).domain());
    y.domain(techan.scale.plot.ohlc(data.slice(indicatorPreRoll), accessor).domain());
    yPercent.domain(techan.scale.plot.percent(y, accessor(data[indicatorPreRoll])).domain());
    yVolume.domain(techan.scale.plot.volume(data, accessor.v).domain());

    svg.select("g.candlestick").datum(data).call(candlestick);
    svg.select("g.volume").datum(data).call(volume);
    svg.select("g.sma.ma-0").datum(techan.indicator.sma().period(10)(data)).call(sma0); // 10
    svg.select("g.sma.ma-1").datum(techan.indicator.sma().period(26)(data)).call(sma1); // 20
    svg.select("g.ema.ma-2").datum(techan.indicator.ema().period(9)(data)).call(ema2); // 50


    zoomableInit = x.zoomable().domain([indicatorPreRoll, data.length]).copy(); // Zoom in a little to hide indicator preroll
    yInit = y.copy();
    yPercentInit = yPercent.copy();

    draw();
  });

  function reset() {
    zoom.scale(1);
    zoom.translate([0, 0]);
    draw();
  }

  function zoomed() {
    x.zoomable().domain(d3.event.transform.rescaleX(zoomableInit).domain());
    y.domain(d3.event.transform.rescaleY(yInit).domain());
    yPercent.domain(d3.event.transform.rescaleY(yPercentInit).domain());

    draw();
  }

  function draw() {
    svg.select("g.x.axis").call(xAxis);
    svg.select("g.y.axis").call(yAxis);
    svg.select("g.volume.axis").call(volumeAxis);
    svg.select("g.percent.axis").call(percentAxis);

    // We know the data does not change, a simple refresh that does not perform data joins will suffice.
    svg.select("g.candlestick").call(candlestick.refresh);
    svg.select("g.volume").call(volume.refresh);
    svg.select("g.sma.ma-0").call(sma0.refresh);
    svg.select("g.sma.ma-1").call(sma1.refresh);
    svg.select("g.ema.ma-2").call(ema2.refresh);
  }
}
