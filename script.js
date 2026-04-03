// Shared tooltip for both visualizations
const tooltip = d3.select("body").selectAll(".tooltip").data([0]).join("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Load both datasets simultaneously
Promise.all([
    d3.csv("canucks_player_stats_2021_2026_combined.csv"),
    d3.csv("canucks_team_stats_2021_2026.csv")
]).then(([playerData, teamData]) => {

    // --- Process Player Data for Bar Chart ---
    const playerMap = d3.rollup(
        playerData,
        v => d3.sum(v, d => +d.goals),
        d => d.player
    );

    let barData = Array.from(playerMap, ([player, goals]) => ({ player, goals }));
    barData.sort((a, b) => b.goals - a.goals);
    const top15Players = barData.slice(0, 15);

    renderBarChart(top15Players);

    // --- Process Team Data for Scatter Plot ---
    // Ensure numbers are treated as numbers
    const processedTeamData = teamData.map(d => ({
        Season: d.Season,
        "GF/G": +d["GF/G"],
        "GA/G": +d["GA/G"]
    }));

    renderScatterPlot(processedTeamData);

}).catch(err => console.error("Error loading CSV files:", err));

function renderBarChart(data) {
    const margin = { top: 50, right: 20, bottom: 120, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#pointsChart")
      .append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.player))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.goals) + 10])
      .nice()
      .range([height, 0]);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "11px");

    svg.append("g").call(d3.axisLeft(y));

    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => x(d.player))
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.goals))
      .attr("height", d => height - y(d.goals))
      .attr("fill", "#00205B")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("fill", "#0055a5");
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<strong>${d.player}</strong><br>${d.goals} goals`)
               .style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 20) + "px");
      })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill", "#00205B");
        tooltip.transition().duration(200).style("opacity", 0);
      });

    svg.append("text")
      .attr("x", width / 2).attr("y", -20).attr("text-anchor", "middle")
      .style("font-size", "16px").style("font-weight", "bold")
      .text("Top 15 Vancouver Canucks Goal Scorers (2021–2026)");
}

function renderScatterPlot(data) {
    const margin = { top: 60, right: 50, bottom: 70, left: 70 };
    const width = 800 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const svg = d3.select("#teamChart")
      .append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Axes scale logic to match Observable's non-zero scale
    const xDomain = [d3.min(data, d => d["GF/G"]) - 0.2, d3.max(data, d => d["GF/G"]) + 0.2];
    const yDomain = [d3.min(data, d => d["GA/G"]) - 0.2, d3.max(data, d => d["GA/G"]) + 0.2];

    const x = d3.scaleLinear().domain(xDomain).range([0, width]);
    const y = d3.scaleLinear().domain(yDomain).range([height, 0]);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(".2f")));

    svg.append("g")
      .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".2f")));

    // Axis titles
    svg.append("text").attr("x", width/2).attr("y", height + 50).attr("text-anchor", "middle").text("Goals For per Game (GF/G)");
    svg.append("text").attr("transform", "rotate(-90)").attr("y", -50).attr("x", -height/2).attr("text-anchor", "middle").text("Goals Against per Game (GA/G)");

    // Data points (Circles)
    svg.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => x(d["GF/G"]))
      .attr("cy", d => y(d["GA/G"]))
      .attr("r", 8)
      .attr("fill", "#00205B")
      .attr("opacity", 0.8)
      .on("mouseover", function(event, d) {
          tooltip.style("opacity", 1)
                 .html(`<strong>Season: ${d.Season}</strong><br>GF/G: ${d["GF/G"].toFixed(2)}<br>GA/G: ${d["GA/G"].toFixed(2)}`)
                 .style("left", (event.pageX + 10) + "px")
                 .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));

    // Season labels above the points
    svg.selectAll(".season-label")
      .data(data)
      .enter()
      .append("text")
      .attr("x", d => x(d["GF/G"]))
      .attr("y", d => y(d["GA/G"]) - 15)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text(d => d.Season);

    svg.append("text")
      .attr("x", width / 2).attr("y", -25).attr("text-anchor", "middle")
      .style("font-size", "16px").style("font-weight", "bold")
      .text("Canucks Performance: Offence vs Defence (2021–2026)");
}