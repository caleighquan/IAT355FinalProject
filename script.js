const tooltip = d3.select("body").selectAll(".tooltip").data([0]).join("div")
    .attr("class", "tooltip").style("opacity", 0);

Promise.all([
    d3.csv("canucks_player_stats_2021_2026_combined.csv"),
    d3.csv("canucks_team_stats_2021_2026.csv")
]).then(([playerData, teamData]) => {

    // 1. Process Elias Pettersson Points
    const epDataRaw = playerData.filter(d => d.player === "Elias Pettersson");
    const epSeasonMap = d3.rollup(epDataRaw, v => d3.sum(v, d => +d.points), d => d.season);
    const epTrendData = Array.from(epSeasonMap, ([season, points]) => ({ season, points }))
                             .sort((a, b) => a.season.localeCompare(b.season));
    renderEPChart(epTrendData);

    // 2. Process Top 15 Scorers
    const playerMap = d3.rollup(playerData, v => d3.sum(v, d => +d.goals), d => d.player);
    let barData = Array.from(playerMap, ([player, goals]) => ({ player, goals }))
                       .sort((a, b) => b.goals - a.goals).slice(0, 15);
    renderBarChart(barData);

    // 3. Process Team Stats
    const processedTeamData = teamData.map(d => ({
        Season: d.Season,
        "GF/G": +d["GF/G"],
        "GA/G": +d["GA/G"]
    }));
    renderScatterPlot(processedTeamData);

}).catch(err => console.error("Error loading CSV files:", err));

function renderEPChart(data) {
    const margin = { top: 50, right: 30, bottom: 60, left: 70 },
          width = 800 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#epChart").html("").append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint().domain(data.map(d => d.season)).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.points) + 10]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(y));

    // X Axis Label
    svg.append("text").attr("x", width/2).attr("y", height + 45).attr("text-anchor", "middle").style("font-size", "14px").text("NHL Season");
    // Y Axis Label
    svg.append("text").attr("transform", "rotate(-90)").attr("y", -50).attr("x", -height/2).attr("text-anchor", "middle").style("font-size", "14px").text("Total Points");

    svg.append("path").datum(data).attr("fill", "none").attr("stroke", "#FE8202").attr("stroke-width", 4)
       .attr("d", d3.line().x(d => x(d.season)).y(d => y(d.points)));

    svg.selectAll(".dot").data(data).join("circle")
       .attr("cx", d => x(d.season)).attr("cy", d => y(d.points)).attr("r", 6).attr("fill", "#FE8202")
       .on("mouseover", (e, d) => {
           tooltip.style("opacity", 1).html(`<strong>${d.season}</strong><br>Total Points: ${d.points}`)
                  .style("left", (e.pageX + 10) + "px").style("top", (e.pageY - 20) + "px");
       }).on("mouseout", () => tooltip.style("opacity", 0));
}

function renderBarChart(data) {
    const margin = { top: 50, right: 20, bottom: 120, left: 70 },
          width = 800 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#pointsChart").html("").append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(data.map(d => d.player)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.goals) + 10]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))
       .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");
    svg.append("g").call(d3.axisLeft(y));

    // Y Axis Label
    svg.append("text").attr("transform", "rotate(-90)").attr("y", -50).attr("x", -height/2).attr("text-anchor", "middle").style("font-size", "14px").text("Total Goals Scored");

    svg.selectAll("rect").data(data).join("rect")
      .attr("x", d => x(d.player)).attr("width", x.bandwidth())
      .attr("y", d => y(d.goals)).attr("height", d => height - y(d.goals)).attr("fill", "#00205B")
      .on("mouseover", (e, d) => {
          tooltip.style("opacity", 1).html(`<strong>${d.player}</strong>: ${d.goals} goals`)
                 .style("left", (e.pageX + 10) + "px").style("top", (e.pageY - 20) + "px");
      }).on("mouseout", () => tooltip.style("opacity", 0));
}

function renderScatterPlot(data) {
    const margin = { top: 60, right: 50, bottom: 80, left: 70 },
          width = 800 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#teamChart").html("").append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([d3.min(data, d => d["GF/G"]) - 0.2, d3.max(data, d => d["GF/G"]) + 0.2]).range([0, width]);
    const y = d3.scaleLinear().domain([d3.min(data, d => d["GA/G"]) - 0.2, d3.max(data, d => d["GA/G"]) + 0.2]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.format(".2f")));
    svg.append("g").call(d3.axisLeft(y).tickFormat(d3.format(".2f")));

    // Axis Labels
    svg.append("text").attr("x", width/2).attr("y", height + 50).attr("text-anchor", "middle").style("font-size", "14px").text("Goals For per Game (GF/G)");
    svg.append("text").attr("transform", "rotate(-90)").attr("y", -50).attr("x", -height/2).attr("text-anchor", "middle").style("font-size", "14px").text("Goals Against per Game (GA/G)");

    svg.selectAll("circle").data(data).join("circle")
      .attr("cx", d => x(d["GF/G"])).attr("cy", d => y(d["GA/G"])).attr("r", 8).attr("fill", "#00205B")
      .on("mouseover", (e, d) => {
          tooltip.style("opacity", 1).html(`<strong>${d.Season}</strong><br>GF/G: ${d["GF/G"]}<br>GA/G: ${d["GA/G"]}`)
                 .style("left", (e.pageX + 10) + "px").style("top", (e.pageY - 20) + "px");
      }).on("mouseout", () => tooltip.style("opacity", 0));

    svg.selectAll(".lbl").data(data).join("text").attr("x", d => x(d["GF/G"])).attr("y", d => y(d["GA/G"]) - 15)
       .attr("text-anchor", "middle").style("font-size", "12px").text(d => d.Season);
}