"use strict";
/**
 * Construct a sample chart, accepting runtime environment loaded dependencies and data. This object is not aware of
 * where it runs: browser or node/V8
 *
 * @param d3
 * @param techan
 * @param csvData CSV data string
 * @returns {Function}
 */
function chart(d3, techan, csvData) {
  var margin = {top: 20, right: 20, bottom: 30, left: 50},
      width = 960 - margin.left - margin.right,
      height = 250 - margin.top - margin.bottom;

  var parseDate = d3.timeParse("%d-%b-%y");

  var x = techan.scale.financetime()
    .range([0, width]);

  var y = d3.scaleLinear()
    .range([height, 0]);

  var candlestick = techan.plot.candlestick()
    .xScale(x)
    .yScale(y);

  var accessor = candlestick.accessor();

  var xAxis = d3.axisBottom(x);

  var yAxis = d3.axisLeft(y);

  var data = csvData.slice(0, 200).map(function (d) {
    return {
      date: parseDate(d.Date),
      open: +d.Open,
      high: +d.High,
      low: +d.Low,
      close: +d.Close,
      volume: +d.Volume
    };
  }).sort(function (a, b) {
    return d3.ascending(a.date, b.date);
  });

  return function(g) {
    var svg = g.append("svg")
        .attr("version", "1.1")
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(data.map(accessor.d));
    y.domain(techan.scale.plot.ohlc(data, accessor).domain());

    svg.append("g")
      .datum(data)
      .attr("class", "candlestick")
      .call(candlestick);

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Price ($)");
  };
}

// If we're in node
if(typeof module === 'object') {
  // Expose the chart
  module.exports = chart;
}