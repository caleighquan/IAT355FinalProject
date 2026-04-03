fetch("standard_stats.csv")
  .then(response => response.text())
  .then(csvText => {
    const rows = csvText.trim().split("\n");

    const headers = rows[0].split(",").map(header => header.trim().replace("\r", ""));

    const playerIndex = headers.indexOf("Player");
    const pointsIndex = headers.indexOf("PTS");

    const data = [];

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(",").map(col => col.trim().replace("\r", ""));

      const player = cols[playerIndex];
      const pts = Number(cols[pointsIndex]);

      if (player && player !== "Team Totals" && !isNaN(pts)) {
        data.push({ player, pts });
      }
    }

    data.sort((a, b) => b.pts - a.pts);
    const topData = data.slice(0, 10);

    const formattedData = topData.map(d => ({
      player: d.player,
      pts: d.pts
    }));

    const margin = { top: 40, right: 20, bottom: 100, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#pointsChart")
      .append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip");

    const x = d3.scaleBand()
      .domain(formattedData.map(d => d.player))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(formattedData, d => d.pts)])
      .nice()
      .range([height, 0]);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    svg.append("g")
      .call(d3.axisLeft(y));

    svg.selectAll("rect")
      .data(formattedData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.player))
      .attr("width", x.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("fill", "#00205B")

      .on("mouseover", function(event, d) {
        tooltip.style("opacity", 1)
          .html(`<strong>${d.player}</strong><br>${d.pts} points`);

        d3.select(this).attr("fill", "#0055a5");
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 20) + "px");
      })
      .on("mouseout", function() {
        tooltip.style("opacity", 0);
        d3.select(this).attr("fill", "#00205B");
      })

      .transition()
      .duration(800)
      .attr("y", d => y(d.pts))
      .attr("height", d => height - y(d.pts));

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .text("Vancouver Canucks Player Points");
  })
  .catch(error => console.error("Error loading CSV:", error));