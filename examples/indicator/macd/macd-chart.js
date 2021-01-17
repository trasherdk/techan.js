function macdChart(d3, techan, feed) {

  var margin = { top: 20, right: 20, bottom: 30, left: 50 },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

  var x = techan.scale.financetime()
    .range([0, width]);

  var y = d3.scaleLinear()
    .range([height, 0]);

  var macd = techan.plot.macd()
    .xScale(x)
    .yScale(y);

    let accessor = macd.accessor();

    var xAxis = d3.axisBottom(x);

  var yAxis = d3.axisLeft(y)
    .tickFormat(d3.format(",.3s"));

  let data = feed.map(function (d) {
    // Open, high, low, close generally not required, is being used here to demonstrate colored volume
    // bars
    return {
      time: new Date(d.time * 1000),
      volume: +d.volumefrom,
      open: +d.open,
      high: +d.high,
      low: +d.low,
      close: +d.close
    };
  }).sort(function (a, b) { return d3.ascending(a.time, b.time); });

  return function(g) {
  let svg = g.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("g")
    .attr("class", "macd");

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
    .text("MACD");

    draw(svg, data);
  }

  function draw(svg, data) {
    var macdData = techan.indicator.macd()(data);
    x.domain(macdData.map(macd.accessor().d));
    y.domain(techan.scale.plot.macd(macdData).domain());

    svg.selectAll("g.macd").datum(macdData).call(macd);
    svg.selectAll("g.x.axis").call(xAxis);
    svg.selectAll("g.y.axis").call(yAxis);
  }
}
