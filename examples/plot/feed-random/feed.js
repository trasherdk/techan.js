
const margin = { top: 20, right: 20, bottom: 60, left: 50 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const x = techan.scale.financetime()
  .range([0, width]);

const y = d3.scaleLinear()
  .range([height, 0]);

const yVolume = d3.scaleLinear()
  .range([y(0), y(0.2)]);

const ohlc = techan.plot.ohlc()
  .xScale(x)
  .yScale(y);

const sma0 = techan.plot.sma()
  .xScale(x)
  .yScale(y);

const sma0Calculator = techan.indicator.sma()
  .period(10);

const sma1 = techan.plot.sma()
  .xScale(x)
  .yScale(y);

const sma1Calculator = techan.indicator.sma()
  .period(20);

const volume = techan.plot.volume()
  .accessor(ohlc.accessor())   // Set the accessor to a ohlc accessor so we get highlighted bars
  .xScale(x)
  .yScale(yVolume);

const xAxis = d3.axisBottom(x);
xAxis.tickFormat(d3.timeFormat('%e %b %H:%M'));

const yAxis = d3.axisLeft(y);

const volumeAxis = d3.axisRight(yVolume)
  .ticks(3)
  .tickFormat(d3.format(",.3s"));

const timeAnnotation = techan.plot.axisannotation()
  .axis(xAxis)
  .orient('bottom')
  .format(d3.timeFormat('%Y-%m-%d %X'))
  .width(65)
  .translate([0, height]);

const ohlcAnnotation = techan.plot.axisannotation()
  .axis(yAxis)
  .orient('left')
  .format(d3.format(',.2f'));

const volumeAnnotation = techan.plot.axisannotation()
  .axis(volumeAxis)
  .orient('right')
  .width(35);

const crosshair = techan.plot.crosshair()
  .xScale(x)
  .yScale(y)
  .xAnnotation(timeAnnotation)
  .yAnnotation([ohlcAnnotation, volumeAnnotation])
  .on("move", move);

let svg = d3.select(".chart").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

const defs = svg.append("defs");

defs.append("clipPath")
  .attr("id", "ohlcClip")
  .append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", width)
  .attr("height", height);

svg = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const ohlcSelection = svg.append("g")
  .attr("class", "ohlc")
  .attr("transform", "translate(0,0)");

ohlcSelection.append("g")
  .attr("class", "volume")
  .attr("clip-path", "url(#ohlcClip)");

ohlcSelection.append("g")
  .attr("class", "candlestick")
  .attr("clip-path", "url(#ohlcClip)");

ohlcSelection.append("g")
  .attr("class", "indicator sma ma-0")
  .attr("clip-path", "url(#ohlcClip)");

ohlcSelection.append("g")
  .attr("class", "indicator sma ma-1")
  .attr("clip-path", "url(#ohlcClip)");

svg.append("g")
  .attr("class", "x axis")
  .attr("transform", `translate(0,${height})`);

svg.append("g")
  .attr("class", "y axis")
  .append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", 6)
  .attr("dy", ".71em")
  .style("text-anchor", "end")
  .text("Price ($)");

svg.append("g")
  .attr("class", "volume axis");

svg.append('g')
  .attr("class", "crosshair ohlc");

const coordsText = svg.append('text')
  .style("text-anchor", "end")
  .attr("class", "coords")
  .attr("x", width - 5)
  .attr("y", 15);

const feed = [];
let seed = {
  date: new Date(Date.now()),
  open: 65.5,
  high: 67.2,
  low: 64.8,
  close: 55.1,
  volume: 250000
};

feed.push(seed);

/**
 * Add 24 hours of 5 minutes interval
 */
for (let i = 0; i < 288; i++) {
  seed = randomOHLC(seed, 5 * 60 * 1000);
  feed.push(seed);
}

redraw(feed);

function redraw (data) {
  const accessor = ohlc.accessor();

  x.domain(data.map(accessor.d));
  // Show only 150 points on the plot
  x.zoomable().domain([data.length - 130, data.length]);

  // Update y scale min max, only on viewable zoomable.domain()
  y.domain(techan.scale.plot.ohlc(data.slice(data.length - 130, data.length)).domain());
  yVolume.domain(techan.scale.plot.volume(data.slice(data.length - 130, data.length)).domain());

  // Setup a transition for all that support
  svg
    //          .transition() // Disable transition for now, each is only for transitions
    .each(function () {
      const selection = d3.select(this);
      selection.select('g.x.axis').call(xAxis);
      selection.select('g.y.axis').call(yAxis);
      selection.select("g.volume.axis").call(volumeAxis);

      selection.select("g.candlestick").datum(data).call(ohlc);
      selection.select("g.sma.ma-0").datum(sma0Calculator(data)).call(sma0);
      selection.select("g.sma.ma-1").datum(sma1Calculator(data)).call(sma1);
      selection.select("g.volume").datum(data).call(volume);

      svg.select("g.crosshair.ohlc").call(crosshair);
    });

  // Set next timer expiry
  setTimeout(() => {
    let newData;
    const next = randomOHLC(data[data.length - 1], 5 * 60 * 1000);
    // Simulate intra day updates when no feed is left
    //var last = data[data.length - 1];
    // Last must be between high and low
    //last.close = Math.round(((last.high - last.low) * Math.random()) * 10) / 10 + last.low;
    data.shift();
    data.push(next);
    newData = data;

    redraw(newData);
  }, (Math.random() * 1000) + 400); // Randomly pick an interval to update the chart
}

function move (coords) {
  coordsText.text(
    `${timeAnnotation.format()(coords.x)}, ${ohlcAnnotation.format()(coords.y)}`
  );
}
