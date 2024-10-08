function ohclplot () {
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = 960 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const parseDate = d3.timeParse("%d-%b-%y");

  const x = techan.scale.financetime()
    .range([0, width]);

  const y = d3.scaleLinear()
    .range([height, 0]);

  const ohlc = techan.plot.ohlc()
    .xScale(x)
    .yScale(y);

  const xAxis = d3.axisBottom(x);

  const yAxis = d3.axisLeft(y);

  const svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  URL = "https://min-api.cryptocompare.com/data/histominute?tsym=EUR&fsym=XMR&limit=480";

  d3.json(URL, (error, data) => {
    if (error) {
      console.error('d3.json()', error)
      return
    }

    const accessor = ohlc.accessor();

    data = data.Data.map((d) => ({
      date: new Date(d.time * 1000),
      open: +d.open,
      high: +d.high,
      low: +d.low,
      close: +d.close,
      volume: +d.volumefrom
    })).sort((a, b) => d3.ascending(accessor.d(a), accessor.d(b)));

    x.domain(data.map(accessor.d));
    y.domain(techan.scale.plot.ohlc(data, accessor).domain());

    svg.append("g")
      .attr("class", "ohlc");

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

    // Data to display initially
    draw(data);
    // Only want this button to be active if the data has loaded
    // d3.select("button").on("click", function () { draw(data); }).style("display", "inline");
  });

  function draw (data) {
    x.domain(data.map(ohlc.accessor().d));
    y.domain(techan.scale.plot.ohlc(data, ohlc.accessor()).domain());

    svg.selectAll("g.ohlc").datum(data).call(ohlc);
    svg.selectAll("g.x.axis").call(xAxis);
    svg.selectAll("g.y.axis").call(yAxis);
  }
}

