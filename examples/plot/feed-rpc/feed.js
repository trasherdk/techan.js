
var margin = { top: 20, right: 20, bottom: 30, left: 50 },
  width = 960 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom;

var x = techan.scale.financetime()
  .range([0, width]);

var y = d3.scaleLinear()
  .range([height, 0]);

var yVolume = d3.scaleLinear()
  .range([y(0), y(0.2)]);

var ohlc = techan.plot.ohlc()
  .xScale(x)
  .yScale(y);

var sma0 = techan.plot.sma()
  .xScale(x)
  .yScale(y);

var sma0Calculator = techan.indicator.sma()
  .period(10);

var sma1 = techan.plot.sma()
  .xScale(x)
  .yScale(y);

var sma1Calculator = techan.indicator.sma()
  .period(20);

var volume = techan.plot.volume()
  .accessor(ohlc.accessor())   // Set the accessor to a ohlc accessor so we get highlighted bars
  .xScale(x)
  .yScale(yVolume);

var xAxis = d3.axisBottom(x);

var yAxis = d3.axisLeft(y);

var volumeAxis = d3.axisRight(yVolume)
  .ticks(3)
  .tickFormat(d3.format(",.3s"));

var timeAnnotation = techan.plot.axisannotation()
  .axis(xAxis)
  .orient('bottom')
  .format(d3.timeFormat('%Y-%m-%d'))
  .width(65)
  .translate([0, height]);

var ohlcAnnotation = techan.plot.axisannotation()
  .axis(yAxis)
  .orient('left')
  .format(d3.format(',.2f'));

var volumeAnnotation = techan.plot.axisannotation()
  .axis(volumeAxis)
  .orient('right')
  .width(35);

var crosshair = techan.plot.crosshair()
  .xScale(x)
  .yScale(y)
  .xAnnotation(timeAnnotation)
  .yAnnotation([ohlcAnnotation, volumeAnnotation])
  .on("move", move);

var svg = d3.select(".chart").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

var defs = svg.append("defs");

defs.append("clipPath")
  .attr("id", "ohlcClip")
  .append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", width)
  .attr("height", height);

svg = svg.append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var ohlcSelection = svg.append("g")
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
  .attr("transform", "translate(0," + height + ")");

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

var coordsText = svg.append('text')
  .style("text-anchor", "end")
  .attr("class", "coords")
  .attr("x", width - 5)
  .attr("y", 15);

function redraw(data) {
  var accessor = ohlc.accessor();

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
      var selection = d3.select(this);
      selection.select('g.x.axis').call(xAxis);
      selection.select('g.y.axis').call(yAxis);
      selection.select("g.volume.axis").call(volumeAxis);

      selection.select("g.candlestick").datum(data).call(ohlc);
      selection.select("g.sma.ma-0").datum(sma0Calculator(data)).call(sma0);
      selection.select("g.sma.ma-1").datum(sma1Calculator(data)).call(sma1);
      selection.select("g.volume").datum(data).call(volume);

      svg.select("g.crosshair.ohlc").call(crosshair);
    });
}

function move(coords) {
  coordsText.text(
    timeAnnotation.format()(coords.x) + ", " + ohlcAnnotation.format()(coords.y)
  );
}

/**
 * Program flow breakdown
 * fetch historical data
 * draw chart
 * main loop start
 * remove (switch) first element out
 * set X label to date/month ( 1 Jan ) format on new first element.
 * fetch latest price
 * add (push) element with current time, and previous close as new open, high, low and close.
 * while current time is less than previous time + interval (5 min)
 * - fetch latest price
 * - update last element with latest data
 * end while
 * main loop end, repeat
 */

//feed = [];

async function getHistory() {
  const URL = "https://min-api.cryptocompare.com/data/histominute?fsym=XMR&tsym=EUR&limit=240";

  return await d3.json(URL, function(error, data) {
    var accessor = ohlc.accessor();

    data = data.Data.map(function (d) {
      return {
        date: new Date(d.time * 1000),
        open: +d.open,
        high: +d.high,
        low: +d.low,
        close: +d.close,
        volume: +d.volumeto
      };
    })
    .sort(function (a, b) {
      return d3.ascending(accessor.d(a), accessor.d(b));
    });

    redraw(data);
  });
}

let feed = [];

async function main() {
  feed = await getHistory();
//  redraw(feed);
  console.log(feed);
}

main();
