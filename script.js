// Load the specific 5-season combined CSV
d3.csv("canucks_player_stats_2021_2026_combined.csv").then(rawData => {
    
  // data aggregation: Sum goals for each player
  const playerMap = d3.rollup(
      rawData,
      v => d3.sum(v, d => +d.goals), // Sum the 'goals' column
      d => d.player                  // Group by 'player' column
  );

  // Convert map to array and sort by goals descending
  let data = Array.from(playerMap, ([player, goals]) => ({ player, goals }));
  data.sort((a, b) => b.goals - a.goals);
  
  // top 15
  const topData = data.slice(0, 15);

  // chart dimensions
  const margin = { top: 50, right: 20, bottom: 120, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#pointsChart")
    .html("") // Clear container
    .append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // scales
  const x = d3.scaleBand()
    .domain(topData.map(d => d.player))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(topData, d => d.goals) + 10])
    .nice()
    .range([height, 0]);

  // axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .style("font-size", "11px");

  svg.append("g")
    .call(d3.axisLeft(y));

  // tooltip
  const tooltip = d3.select("body")
    .selectAll(".tooltip")
    .data([0])
    .join("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // bars
  svg.selectAll("rect")
    .data(topData)
    .enter()
    .append("rect")
    .attr("x", d => x(d.player))
    .attr("width", x.bandwidth())
    .attr("y", height) // Animation start
    .attr("height", 0)
    .attr("fill", "#00205B")
    .on("mouseover", function(event, d) {
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`<strong>${d.player}</strong><br>${d.goals} goals`)
             .style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 20) + "px");
      d3.select(this).attr("fill", "#0055a5");
    })
    .on("mousemove", function(event) {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", function() {
      tooltip.transition().duration(200).style("opacity", 0);
      d3.select(this).attr("fill", "#00205B");
    })
    .transition()
    .duration(800)
    .attr("y", d => y(d.goals))
    .attr("height", d => height - y(d.goals));

  // title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Top 15 Vancouver Canucks Players by Goals in the Last 5 Seasons");

}).catch(err => {
  console.error("Error loading CSV:", err);
});