async function chartClose () {
  var margin = { top: 20, right: 20, bottom: 30, left: 50 },
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

  var parseDate = d3.timeParse("%d-%b-%y");

  var x = techan.scale.financetime()
    .range([0, width])
    .outerPadding(0);

  var y = d3.scaleLinear()
    .range([height, 0]);

  var close = techan.plot.close()
    .xScale(x)
    .yScale(y);

  var xAxis = d3.axisBottom(x);

  var yAxis = d3.axisLeft(y);

  var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var accessor = close.accessor();

  let data = await d3.csv("data.csv")
    .then(data => {
      return data
    })
    .catch(error => {
      console.log('d3.csv catch', error.message)
      return []
    })

  data = data.slice(0, 200).map(function (d) {
    return {
      date: parseDate(d.Date),
      open: +d.Open,
      high: +d.High,
      low: +d.Low,
      close: +d.Close,
      volume: +d.Volume
    };
  }).sort(function (a, b) { return d3.ascending(accessor.d(a), accessor.d(b)); });

  svg.append("g")
    .attr("class", "close");

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

  // Data to display initially
  draw(data.slice(0, data.length - 20));
  // Only want this button to be active if the data has loaded
  d3.select("button").on("click", function () { draw(data); }).style("display", "inline");

  function draw (data) {
    x.domain(data.map(close.accessor().d));
    y.domain(techan.scale.plot.ohlc(data, close.accessor()).domain());

    svg.selectAll("g.close").datum(data).call(close);
    svg.selectAll("g.x.axis").call(xAxis);
    svg.selectAll("g.y.axis").call(yAxis);
  }
}
