fetch("standard_stats.csv")
  .then(response => response.text())
  .then(csvText => {
    const rows = csvText.trim().split("\n");

    // clean headers
    const headers = rows[0].split(",").map(header => header.trim().replace("\r", ""));

    const playerIndex = headers.indexOf("Player");
    const pointsIndex = headers.indexOf("PTS");

    console.log("Headers:", headers);
    console.log("Player index:", playerIndex, "PTS index:", pointsIndex);

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
    
    const players = topData.map(d => d.player);
    const points = topData.map(d => d.pts);

    console.log("Players:", players);
    console.log("Points:", points);

    new Chart(document.getElementById("pointsChart"), {
      type: "bar",
      data: {
        labels: players,
        datasets: [{
          label: "Points",
          data: points,
          backgroundColor: "#00205B",
          borderColor: "#00163f",
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Vancouver Canucks Player Points"
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 90,
              minRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Points"
            }
          }
        }
      }
    });
  })
  .catch(error => console.error("Error loading CSV:", error));