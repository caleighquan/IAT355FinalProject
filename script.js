// CURSOR FOLLOWS MOUSE
// learned from https://medium.com/@benzbraunstein/using-javascript-and-css-to-make-custom-cursors-dd75d40520
const cursor = document.querySelector(".fake-cursor");

document.addEventListener("mousemove", (e) => {
  cursor.style.left = e.clientX + "px";
  cursor.style.top = e.clientY + "px";
});

// NAV DOTS
const SEC = ['hero','overview','approach','viz1','tx1','viz2','tx2','viz3','tx3','ep-profile','viz4','conclusion'];
const dots = document.querySelectorAll('.ndot');
dots.forEach((d, i) => d.addEventListener('click', () =>
  document.getElementById(SEC[i]).scrollIntoView({ behavior: 'smooth' })
));
const secObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const idx = SEC.indexOf(e.target.id);
    if (idx < 0) return;
    dots.forEach(d => d.classList.remove('on'));
    dots[idx].classList.add('on');
  });
}, { threshold: 0.35 });
SEC.forEach(id => { const el = document.getElementById(id); if (el) secObs.observe(el); });


// SCROLL REVEAL 
// inspired by https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
const rvObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.12 });
document.querySelectorAll('.rv').forEach(el => rvObs.observe(el));

// TOOLTIP FUNCTIONS: Controls showing, moving, and hiding tooltip near cursor
const TIP = document.getElementById('tip');
const showTip = (html, x, y) => { TIP.innerHTML = html; TIP.style.opacity = 1; TIP.style.left = (x + 18) + 'px'; TIP.style.top = (y - 14) + 'px'; };
const moveTip = (x, y) => { TIP.style.left = (x + 18) + 'px'; TIP.style.top = (y - 14) + 'px'; };
const hideTip = () => { TIP.style.opacity = 0; };


// Converts season format from "2023-2024" "2023–2024" (cleaner display)
const normSeason = s => s.replace(/-/g, '\u2013').trim();


// Handles selecting the quiz options (highlight + enable submit)
// Inspired by basic JS quiz app structure
// https://dev.to/linusmwiti21/level-up-your-skills-build-a-web-quiz-app-with-basic-js-html-css-lm5
let selectedIdx = null;
const CORRECT_IDX = 0; // Elias Pettersson

function selectCard(idx) {
  selectedIdx = idx;
  document.querySelectorAll('.quiz-card').forEach((c, i) => {
    c.classList.toggle('selected', i === idx);
  });
  document.getElementById('submitBtn').disabled = false;
}

// Checks answer and displays correct/incorrect feedback
function submitQuiz() {
  const correctFb = document.getElementById('correctFb');
  const wrongFb = document.getElementById('wrongFb');
  
  // Mark correct / wrong on cards
  document.querySelectorAll('.quiz-card').forEach((c, i) => {
    if (i === CORRECT_IDX) c.classList.add('correct');
    else if (i === selectedIdx) c.classList.add('wrong');
    c.style.pointerEvents = 'none';
  });

  document.getElementById('submitBtn').style.display = 'none';

  if (selectedIdx === CORRECT_IDX) {
    correctFb.style.display = 'block';
  } else {
    wrongFb.style.display = 'block';
  }
}

// Reveals visualization after quiz complete
function revealChart() {
  document.getElementById('quizBlock').style.display = 'none';
  const chartArea = document.getElementById('chartArea1');
  const insGrid = document.getElementById('insGrid1');
  chartArea.style.display = 'block';
  insGrid.style.display = 'grid';
  // Trigger the chart draw immediately since section is already visible
  if (window._TOP15) drawV1(window._TOP15);
}

// Loads player + team CSV data, cleans it, and prepares datasets for all visualizations
Promise.all([
  d3.csv("canucks_player_stats_2021_2026_combined.csv"),
  d3.csv("canucks_team_stats_2021_2026.csv")
]).then(([players, teams]) => {

// Coerce player types
  players.forEach(d => {
    d.Goals = +d.goals;
    d.Assists = +d.assists;
    d.Points = +d.points;
    d.GP = +d.gp;
    d.Player = d.player;
    d.Season = normSeason(d.season);
  });

// Coerce team types
  teams.forEach(d => {
    d.Points = +d.PTS;
    d.GoalsFor = +d.GF;
    d.GoalsAgainst = +d.GA;
    d.GamesPlayed = +d.GP;
    d.PPpct = +d['PP%'];
    d.PKpct = +d['PK%'];
    d.Season = normSeason(d.Season);
    d.Playoffs = d.Season === '2023\u201324';
  });

  const csvSeasons = [...new Set(teams.map(d => d.Season))].sort();

// VIZ 1: Top 15 players by total goals
  const goalsByPlayer = d3.rollup(players, v => d3.sum(v, d => d.Goals), d => d.Player);
  const TOP15 = Array.from(goalsByPlayer, ([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals).slice(0, 15);

  // Store globally so revealChart() can access it
  window._TOP15 = TOP15;

// VIZ 2: GF/GA per game per season
  const TEAM = teams.map(d => ({
    s: d.Season,
    pts: d.Points,
    gf: +(d.GoalsFor  / d.GamesPlayed).toFixed(2),
    ga: +(d.GoalsAgainst / d.GamesPlayed).toFixed(2),
    po: d.Playoffs
  })).sort((a, b) => csvSeasons.indexOf(a.s) - csvSeasons.indexOf(b.s));

// VIZ 3: PP% and PK% per season 
  const SPECIAL = teams.map(d => ({
    s:  d.Season,
    pp: d.PPpct,
    pk: d.PKpct,
    po: d.Playoffs
  })).sort((a, b) => csvSeasons.indexOf(a.s) - csvSeasons.indexOf(b.s));

// VIZ 4: EP points vs team standings points 
  const epRows = players.filter(d => d.Player && d.Player.includes('Pettersson'));
  const epBySeason = d3.rollup(epRows, v => d3.sum(v, d => d.Points), d => d.Season);
  const EP = csvSeasons.map(s => {
    const teamRow = teams.find(d => d.Season === s);
    return { s, ep: epBySeason.get(s) || 0, tp: teamRow ? teamRow.Points : 0 };
  });

// Builds the season overview bar chart (team standings points per season)
  buildOverviewBars(TEAM);

// Triggers each visualization only when it scrolls into view
// Prevents charts from rendering too early and improves performance
  const drawn = {};
  const cObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting || drawn[e.target.id]) return;
      drawn[e.target.id] = true;
      if (e.target.id === 'viz2') drawV2(TEAM);
      if (e.target.id === 'viz3') drawV3(SPECIAL, csvSeasons);
      if (e.target.id === 'viz4') drawV4(EP, csvSeasons);
      // viz1 is triggered by revealChart() after quiz interaction
    });
  }, { threshold: 0.22 });
  ['viz2','viz3','viz4'].forEach(id => cObs.observe(document.getElementById(id)));

}).catch(err => {
  console.error('Failed to load CSV data:', err);
  document.body.insertAdjacentHTML('afterbegin',
    '<div style="position:fixed;top:0;left:0;right:0;background:#c0392b;color:#fff;padding:12px 20px;z-index:9999;font-family:Inter,sans-serif;font-size:0.85rem;">' +
    '\u26A0 Could not load data files. Ensure the CSV files are in the same directory as index.html.' +
    '</div>'
  );
});

  //  SEASON OVERVIEW BAR CHART
  function buildOverviewBars(TEAM) {
    const maxPts = 130; // scale denominator
    const container = document.getElementById('sbars');
    if (!container) return;

  // Sort chronologically
  const sorted = [...TEAM].sort((a, b) => a.s.localeCompare(b.s));

  let html = '';
  sorted.forEach(d => {
    const wPct = (d.pts / maxPts * 100).toFixed(1);
    const tagClass = d.po ? 'p' : (d.pts === d3.min(sorted, x => x.pts) ? 'l' : 'm');
    const tagLabel = d.po ? 'Playoffs' : (tagClass === 'l' ? 'Last Place' : 'Missed');
    const peakClass = d.po ? ' peak' : '';
    html +=
      '<div class="s-row">' +
        '<div class="s-yr">' + d.s + '</div>' +
        '<div class="s-track"><div class="s-fill' + peakClass + '" style="width:' + wPct + '%">' +
          '<span class="s-pts">' + d.pts + ' pts' + (d.po ? ' \u2605' : '') + '</span>' +
        '</div></div>' +
        '<span class="s-tag ' + tagClass + '">' + tagLabel + '</span>' +
      '</div>';
  });
  container.innerHTML = html;
}

// VIZ 1: TOP 15 PLAYERS BAR CHART
// Draws bar chart of top 15 Canucks players by total goals over 5 seasons
function drawV1(TOP15) {
  const box = document.querySelector('#viz1 .chart-box');
  if (!box) return;
  const W = box.clientWidth - 88, H = 420;
  const m = { top:16, right:20, bottom:80, left:48 };
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;

  const svg = d3.select('#ch1').attr('width', W).attr('height', H);
  const g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');

  const x = d3.scaleBand()
    .domain(TOP15.map(d => d.name))
    .range([0, iw]).paddingInner(0.28).paddingOuter(0.04);

  const y = d3.scaleLinear().domain([0, 150]).range([ih, 0]);

  g.append('g').attr('class','grid')
   .call(d3.axisLeft(y).tickSize(-iw).tickFormat('').ticks(6));

  g.append('g').attr('class','axis')
   .attr('transform','translate(0,' + ih + ')')
   .call(d3.axisBottom(x).tickSize(0).tickPadding(10))
   .selectAll('text')
   .style('text-anchor','end')
   .attr('transform','rotate(-38)')
   .style('font-size','10.5px');

  g.append('g').attr('class','axis')
   .call(d3.axisLeft(y).ticks(6).tickSize(0).tickPadding(9));

  g.append('text').attr('transform','rotate(-90)').attr('y',-m.left+2).attr('x',-ih/2).attr('dy','1em')
   .style('text-anchor','middle').style('fill','var(--grey-lt)')
   .style('font-size','10px').style('font-family','Inter').text('Total Goals');

  g.selectAll('.bar')
    .data(TOP15).enter().append('rect')
    .attr('class','bar')
    .attr('x', d => x(d.name))
    .attr('y', d => y(d.goals))
    .attr('width', x.bandwidth())
    .attr('height', d => ih - y(d.goals))
    .attr('rx', 3)
    .attr('fill', (d, i) => i < 4 ? 'var(--green)' : 'rgba(0,90,160,0.65)')
    .attr('opacity', 0.85)
    .style('cursor','pointer')
    .on('mouseover', function(ev, d) {
      d3.select(this).attr('opacity', 1).attr('filter','brightness(1.3)');
      showTip(
        '<div class="tt">' + d.name + '</div>' +
        '<div class="tr"><span>Total goals (5 seasons)</span><span class="tv">' + d.goals + '</span></div>',
        ev.clientX, ev.clientY
      );
    })
    .on('mousemove', ev => moveTip(ev.clientX, ev.clientY))
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.85).attr('filter','none');
      hideTip();
    });

  g.selectAll('.blbl')
    .data(TOP15).enter().append('text')
    .attr('class','blbl')
    .attr('x', d => x(d.name) + x.bandwidth()/2)
    .attr('y', d => y(d.goals) - 5)
    .style('text-anchor','middle')
    .style('fill','rgba(176,189,212,0.75)')
    .style('font-size','10px').style('font-family','Inter')
    .text(d => d.goals);
}

// VIZ 2: SCATTERPLOT
// Draws scatterplot of offence vs defence (Goals For vs Goals Against per game)
// Includes interactive "guess the ideal zone" drag feature
function drawV2(TEAM) {
  const box = document.querySelector('#viz2 .chart-box');
  const W = box.clientWidth - 88, H = 460;
  const m = { top:44, right:44, bottom:66, left:68 };
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;

  const svg = d3.select('#ch2').attr('width', W).attr('height', H);
  const g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');

  const x = d3.scaleLinear().domain([2.35, 3.6]).range([0, iw]);
  const y = d3.scaleLinear().domain([2.55, 3.85]).range([ih, 0]);

  g.append('g').attr('class','grid').call(d3.axisLeft(y).tickSize(-iw).tickFormat('').ticks(5));
  g.append('g').attr('class','grid').attr('transform','translate(0,' + ih + ')').call(d3.axisBottom(x).tickSize(-ih).tickFormat('').ticks(5));

  // Axes
  g.append('g').attr('class','axis').attr('transform','translate(0,' + ih + ')').call(d3.axisBottom(x).ticks(5).tickSize(0).tickPadding(10));
  g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(10));

  g.append('text').attr('x',iw/2).attr('y',ih+54).style('text-anchor','middle')
   .style('fill','var(--grey-lt)').style('font-size','11px').style('font-family','Inter')
   .text('Goals For Per Game  \u2192  (higher = better offence)');
  g.append('text').attr('transform','rotate(-90)').attr('x',-ih/2).attr('y',-54).style('text-anchor','middle')
   .style('fill','var(--grey-lt)').style('font-size','11px').style('font-family','Inter')
   .text('Goals Against Per Game  \u2192  (lower = better defence)');

  // Connector lines between seasons
  const lineG = d3.line().x(d => x(d.gf)).y(d => y(d.ga)).curve(d3.curveCatmullRom);
  g.append('path').datum(TEAM).attr('fill','none').attr('stroke','rgba(255,255,255,0.08)')
   .attr('stroke-width',1.5).attr('stroke-dasharray','4,4').attr('d',lineG);

  // Data points (drawn now, before guess)
  const pts = g.selectAll('.spt').data(TEAM).enter().append('g').attr('class','spt');

  pts.filter(d => d.po).append('circle')
   .attr('cx', d => x(d.gf)).attr('cy', d => y(d.ga)).attr('r', 28)
   .attr('fill','none').attr('stroke','rgba(0,168,77,0.2)').attr('stroke-width',7);

  pts.append('circle')
   .attr('cx', d => x(d.gf)).attr('cy', d => y(d.ga)).attr('r', 15)
   .attr('fill', d => d.po ? 'var(--green)' : 'rgba(255,255,255,0.1)')
   .attr('stroke', d => d.po ? '#00D45A' : 'rgba(255,255,255,0.38)').attr('stroke-width',2)
   .style('cursor','pointer')
   .on('mouseover', function(ev, d) {
     d3.select(this).attr('r', 22);
     showTip(
       '<div class="tt">' + d.s + '</div>' +
       '<div class="tr"><span>Goals For/G</span><span class="tv">' + d.gf + '</span></div>' +
       '<div class="tr"><span>Goals Against/G</span><span class="tv">' + d.ga + '</span></div>' +
       '<div class="tr"><span>Standings Pts</span><span class="tv">' + d.pts + '</span></div>' +
       '<div class="tr"><span>Playoffs</span><span class="tv">' + (d.po ? '\u2713 Yes' : '\u2717 No') + '</span></div>',
       ev.clientX, ev.clientY
     );
   })
   .on('mousemove', ev => moveTip(ev.clientX, ev.clientY))
   .on('mouseout', function() { d3.select(this).attr('r', 15); hideTip(); });

  pts.append('text')
   .attr('x', d => x(d.gf)).attr('y', d => y(d.ga) - 22)
   .style('text-anchor','middle')
   .style('fill', d => d.po ? '#00D45A' : 'var(--grey-lt)')
   .style('font-size','10px').style('font-family','Inter').style('font-weight','500')
   .text(d => d.s);

// Ideal zone: high goals for (right) + low goals against (bottom = better defence)
  const IZ = { gfMin: 3.2, gfMax: 3.6, gaMin: 2.55, gaMax: 2.95 };
  const izX = x(IZ.gfMin);
  const izX2 = x(IZ.gfMax);
  const izY = y(IZ.gaMax); 
  const izY2 = y(IZ.gaMin); 
  const izW = izX2 - izX;
  const izH = izY2 - izY;

  const idealZone = g.append('g').attr('class','ideal-zone-g').style('opacity', 0);
  idealZone.append('rect')
   .attr('x', izX).attr('y', izY).attr('width', izW).attr('height', izH)
   .attr('fill','rgba(0,132,61,0.2)').attr('stroke','rgba(0,132,61,0.4)').attr('stroke-width',1).attr('rx',4);
  idealZone.append('text').attr('x', izX + 9).attr('y', izY + 14)
   .style('fill','rgba(0,168,77)').style('font-size','9px').style('font-family','Inter').style('letter-spacing','0.13em')
   .text('IDEAL ZONE');

// GUESS DRAG HANDLER: Handles user drag interaction for guessing the "ideal performance zone"
// Used dragging logic: https://d3js.org/d3-drag
  let guessed = false;
  let dragStart = null;
  const chartBox = document.getElementById('chartBox2');

  // Live preview rect
  const previewRect = g.append('rect')
    .attr('fill', 'rgba(255,200,0,0.08)')
    .attr('stroke', 'rgba(255,200,0,0.6)').attr('stroke-width', 2)
    .attr('stroke-dasharray', '5,3').attr('rx', 4)
    .style('opacity', 0).style('pointer-events', 'none');

  svg.on('mousedown', function(event) {
    if (guessed) return;
    dragStart = d3.pointer(event, g.node());
    previewRect.style('opacity', 1);
  });

  svg.on('mousemove', function(event) {
    if (!dragStart || guessed) return;
    const [cx, cy] = d3.pointer(event, g.node());
    const rx = Math.min(dragStart[0], cx);
    const ry = Math.min(dragStart[1], cy);
    const rw = Math.abs(cx - dragStart[0]);
    const rh = Math.abs(cy - dragStart[1]);
    previewRect.attr('x', rx).attr('y', ry).attr('width', rw).attr('height', rh);
  });

  svg.on('mouseup', function(event) {
    if (!dragStart || guessed) return;
    guessed = true;
    chartBox.classList.add('guessed');
    document.getElementById('guessOverlay').classList.add('hidden');

    const [ex, ey] = d3.pointer(event, g.node());
    const rx = Math.min(dragStart[0], ex);
    const ry = Math.min(dragStart[1], ey);
    const rw = Math.abs(ex - dragStart[0]);
    const rh = Math.abs(ey - dragStart[1]);

// Finalise the preview rect: pending confirmation
    previewRect
      .attr('x', rx).attr('y', ry).attr('width', rw).attr('height', rh)
      .attr('fill', 'rgba(255,200,0,0.12)')
      .attr('stroke', 'rgba(255,200,0,0.9)');

    const guessLabel = g.append('text')
      .attr('x', rx + rw / 2).attr('y', ry - 8)
      .style('text-anchor','middle').style('fill','rgba(255,200,0,0.9)')
      .style('font-size','9px').style('font-family','Inter').style('letter-spacing','0.12em')
      .style('opacity', 0)
      .text('YOUR GUESS');
    guessLabel.transition().duration(400).style('opacity', 1);

    // Show confirm/redo buttons
    const confirmBar = document.getElementById('guessConfirmBar');
    confirmBar.style.display = 'flex';

    // Store pending guess data for confirm
    window._pendingGuess = { rx, ry, rw, rh };

    dragStart = null;
    guessed = false; // allow redo until confirmed
  });

  // CONFIRM / REDO BUTTONS
  document.getElementById('confirmGuessBtn').onclick = function() {
    if (!window._pendingGuess) return;
    guessed = true;
    chartBox.classList.add('guessed');
    document.getElementById('guessOverlay').classList.add('hidden');
    document.getElementById('guessConfirmBar').style.display = 'none';

    const { rx, ry, rw, rh } = window._pendingGuess;

    const overlapX = Math.max(0, Math.min(rx + rw, izX + izW) - Math.max(rx, izX));
    const overlapY = Math.max(0, Math.min(ry + rh, izY + izH) - Math.max(ry, izY));
    const overlapArea = overlapX * overlapY;
    const drawnArea = rw * rh;
    const overlapFrac = drawnArea > 0 ? overlapArea / Math.min(izW * izH, drawnArea) : 0;

    const inIdeal = overlapFrac > 0.4;
    const isClose = overlapFrac > 0.1;

    setTimeout(() => {
      idealZone.transition().duration(700).style('opacity', 1);

      const resultEl = document.getElementById('guessResult');
      const iconEl = document.getElementById('guessIcon');
      const titleEl = document.getElementById('guessTitle');
      const bodyEl = document.getElementById('guessBody');

      if (inIdeal) {
        resultEl.classList.add('close');
        iconEl.textContent = '✓';
        titleEl.textContent = 'Spot on!';
        bodyEl.innerHTML = 'You placed your guess inside the ideal zone - <strong>high scoring, low goals against</strong>. That\'s exactly where the 2023–24 Canucks landed, and why it was their only playoff season.';
      } else if (isClose) {
        resultEl.classList.add('close');
        iconEl.textContent = '◎';
        titleEl.textContent = 'Close!';
        bodyEl.innerHTML = 'You were close. The ideal zone sits in the <strong>bottom-right corner</strong> - high goals for, low goals against. Only 2023–24 reached it across five seasons.';
      } else {
        resultEl.classList.add('far');
        iconEl.textContent = '✗';
        titleEl.textContent = 'Not quite -';
        bodyEl.innerHTML = 'The ideal zone is the <strong>bottom-right corner</strong>: scoring lots while conceding little. It\'s rare - the Canucks only managed it once in five seasons, in 2023–24.';
      }

      resultEl.style.display = 'block';
    }, 500);
  };

  document.getElementById('redoGuessBtn').onclick = function() {
    // Clear preview rect and label, reset for new drag
    previewRect.style('opacity', 0)
      .attr('x', 0).attr('y', 0).attr('width', 0).attr('height', 0);
    g.selectAll('text').filter(function() {
      return d3.select(this).text() === 'YOUR GUESS';
    }).remove();
    document.getElementById('guessConfirmBar').style.display = 'none';
    document.getElementById('guessOverlay').classList.remove('hidden');
    window._pendingGuess = null;
    guessed = false;
    dragStart = null;
  };
}

// VIZ 3: POWER PLAY & PENALTY KILL
function drawV3(SPECIAL, seasons) {
  const box = document.querySelector('#viz3 .chart-box');
  const W = box.clientWidth - 88, H = 380;
  const m = { top:30, right:60, bottom:54, left:62 };
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;

  const svg = d3.select('#ch3').attr('width', W).attr('height', H);
  const g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');

  const ppVals = SPECIAL.map(d => d.pp);
  const pkVals = SPECIAL.map(d => d.pk);
  const allVals = ppVals.concat(pkVals);
  const yMin = Math.floor(d3.min(allVals) - 2);
  const yMax = Math.ceil(d3.max(allVals) + 2);

  const xS = d3.scalePoint().domain(seasons).range([0, iw]).padding(0.28);
  const y = d3.scaleLinear().domain([yMin, yMax]).range([ih, 0]);

  // Grid lines
  g.append('g').attr('class','grid').call(d3.axisLeft(y).tickSize(-iw).tickFormat('').ticks(6));

  // Playoff season highlight
  const poSeason = SPECIAL.find(d => d.po);
  if (poSeason) {
    const px = xS(poSeason.s), bw = xS.step();
    g.append('rect')
     .attr('x', px - bw * 0.3).attr('y', 0)
     .attr('width', bw * 0.6).attr('height', ih)
     .attr('fill','rgba(0,132,61,0.2)').attr('rx',4);
    g.append('text')
     .attr('x', px).attr('y', 12)
     .style('text-anchor','middle').style('fill','rgba(0,168,77)')
     .style('font-size','9px').style('font-family','Inter').style('letter-spacing','0.13em')
     .text('PLAYOFFS');
  }

  // Axes
  g.append('g').attr('class','axis').attr('transform','translate(0,' + ih + ')')
   .call(d3.axisBottom(xS).tickSize(0).tickPadding(12));
  g.append('g').attr('class','axis')
   .call(d3.axisLeft(y).ticks(6).tickSize(0).tickPadding(8)
     .tickFormat(d => d + '%'));

  // Y axis label
  g.append('text').attr('transform','rotate(-90)').attr('x',-ih/2).attr('y',-50)
   .style('text-anchor','middle').style('fill','var(--grey-lt)')
   .style('font-size','10px').style('font-family','Inter').text('Percentage (%)');

  // PP% line
  const lPP = d3.line().x(d => xS(d.s)).y(d => y(d.pp)).curve(d3.curveCatmullRom);
  g.append('path').datum(SPECIAL).attr('fill','none')
   .attr('stroke','var(--green)').attr('stroke-width',2.5).attr('d',lPP);

  // PK% line
  const lPK = d3.line().x(d => xS(d.s)).y(d => y(d.pk)).curve(d3.curveCatmullRom);
  g.append('path').datum(SPECIAL).attr('fill','none')
   .attr('stroke','rgba(255,180,0,0.75)').attr('stroke-width',2.5).attr('d',lPK);

  // PP% dots
  g.selectAll('.ppd').data(SPECIAL).enter().append('circle').attr('class','ppd')
   .attr('cx', d => xS(d.s)).attr('cy', d => y(d.pp)).attr('r', 6)
   .attr('fill','var(--green)').attr('stroke','var(--navy-dk)').attr('stroke-width',2)
   .style('cursor','pointer')
   .on('mouseover', function(ev, d) {
     d3.select(this).attr('r', 11);
     showTip(
       '<div class="tt">' + d.s + '</div>' +
       '<div class="tr"><span>Power Play %</span><span class="tv">' + d.pp.toFixed(2) + '%</span></div>' +
       '<div class="tr"><span>Penalty Kill %</span><span class="tv">' + d.pk.toFixed(2) + '%</span></div>' +
       '<div class="tr"><span>Playoffs</span><span class="tv">' + (d.po ? '\u2713 Yes' : '\u2717 No') + '</span></div>',
       ev.clientX, ev.clientY
     );
   })
   .on('mousemove', ev => moveTip(ev.clientX, ev.clientY))
   .on('mouseout', function() { d3.select(this).attr('r', 6); hideTip(); });

  // PP% labels
  g.selectAll('.ppl').data(SPECIAL).enter().append('text').attr('class','ppl')
   .attr('x', d => xS(d.s)).attr('y', d => y(d.pp) - 12)
   .style('text-anchor','middle').style('fill','#00D45A')
   .style('font-size','10px').style('font-family','Inter').style('font-weight','600')
   .text(d => d.pp.toFixed(1) + '%');

  // PK% dots
  g.selectAll('.pkd').data(SPECIAL).enter().append('circle').attr('class','pkd')
   .attr('cx', d => xS(d.s)).attr('cy', d => y(d.pk)).attr('r', 6)
   .attr('fill','rgba(255,180,0,0.75)').attr('stroke','var(--navy-dk)').attr('stroke-width',2)
   .style('cursor','pointer')
   .on('mouseover', function(ev, d) {
     d3.select(this).attr('r', 11);
     showTip(
       '<div class="tt">' + d.s + '</div>' +
       '<div class="tr"><span>Penalty Kill %</span><span class="tv">' + d.pk.toFixed(2) + '%</span></div>' +
       '<div class="tr"><span>Power Play %</span><span class="tv">' + d.pp.toFixed(2) + '%</span></div>' +
       '<div class="tr"><span>Playoffs</span><span class="tv">' + (d.po ? '\u2713 Yes' : '\u2717 No') + '</span></div>',
       ev.clientX, ev.clientY
     );
   })
   .on('mousemove', ev => moveTip(ev.clientX, ev.clientY))
   .on('mouseout', function() { d3.select(this).attr('r', 6); hideTip(); });

  // PK% labels
  g.selectAll('.pkl').data(SPECIAL).enter().append('text').attr('class','pkl')
   .attr('x', d => xS(d.s)).attr('y', d => y(d.pk) + 22)
   .style('text-anchor','middle').style('fill','rgba(255,180,0,0.85)')
   .style('font-size','10px').style('font-family','Inter').style('font-weight','600')
   .text(d => d.pk.toFixed(1) + '%');

  // Legend
  document.getElementById('leg3').innerHTML =
    '<div class="cli"><div class="clc" style="background:var(--green)"></div><span class="cll">Power Play %</span></div>' +
    '<div class="cli"><div class="clc" style="background:rgba(255,180,0,0.75)"></div><span class="cll">Penalty Kill %</span></div>';
}

  //  VIZ 4:(EP vs TEAM) draws line chart comparing Elias Pettersson's points vs team standings points
function drawV4(EP, seasons) {
  const box = document.querySelector('#viz4 .chart-box');
  const W = box.clientWidth - 88, H = 380;
  const m = { top:30, right:40, bottom:54, left:58 }; 
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;

  const svg = d3.select('#ch4').attr('width', W).attr('height', H);
  const g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');

  const xS = d3.scalePoint().domain(seasons).range([0, iw]).padding(0.28);

  // y-axis scale based on max of EP and Team points, rounded up to nearest 10 + 10 buffer
  const allVals = EP.flatMap(d => [d.ep, d.tp]);
  const yMax = Math.ceil(d3.max(allVals) / 10) * 10 + 10;
  const y = d3.scaleLinear().domain([0, yMax]).range([ih, 0]);

  g.append('g').attr('class','grid').call(d3.axisLeft(y).tickSize(-iw).tickFormat('').ticks(6));

  const px1 = xS(seasons[1]), px2 = xS(seasons[2]), bw = xS.step();
  g.append('rect').attr('x', px1 - bw*0.17).attr('y', 0)
   .attr('width', px2 - px1 + bw*0.34).attr('height', ih)
   .attr('fill','rgba(0,132,61,0.2)').attr('rx',4);
  g.append('text').attr('x', (px1+px2)/2).attr('y', 12)
   .style('text-anchor','middle').style('fill','rgba(0,168,77)')
   .style('font-size','9px').style('font-family','Inter').style('letter-spacing','0.13em')
   .text('PEAK YEARS');

  g.append('g').attr('class','axis').attr('transform','translate(0,' + ih + ')')
   .call(d3.axisBottom(xS).tickSize(0).tickPadding(12));
  g.append('g').attr('class','axis')
   .call(d3.axisLeft(y).ticks(6).tickSize(0).tickPadding(8));

  // Y axis label
  g.append('text').attr('transform','rotate(-90)').attr('x',-ih/2).attr('y',-46)
   .style('text-anchor','middle').style('fill','var(--grey-lt)')
   .style('font-size','10px').style('font-family','Inter').text('Points');

  const lEP = d3.line().x(d => xS(d.s)).y(d => y(d.ep)).curve(d3.curveCatmullRom);
  const lTP = d3.line().x(d => xS(d.s)).y(d => y(d.tp)).curve(d3.curveCatmullRom);

  g.append('path').datum(EP).attr('fill','none').attr('stroke','var(--green)').attr('stroke-width',2.5).attr('d',lEP);
  g.append('path').datum(EP).attr('fill','none').attr('stroke','rgba(176,189,212,0.42)').attr('stroke-width',2).attr('d',lTP);

  // EP dots
  g.selectAll('.epd').data(EP).enter().append('circle').attr('class','epd')
   .attr('cx', d => xS(d.s)).attr('cy', d => y(d.ep)).attr('r', 6)
   .attr('fill','var(--green)').attr('stroke','var(--navy-dk)').attr('stroke-width',2.5)
   .style('cursor','pointer')
   .on('mouseover', function(ev, d) {
     d3.select(this).attr('r', 11);
     showTip(
       '<div class="tt">' + d.s + '</div>' +
       '<div class="tr"><span>EP Points</span><span class="tv">' + d.ep + '</span></div>' +
       '<div class="tr"><span>Team Pts</span><span class="tv">' + d.tp + '</span></div>',
       ev.clientX, ev.clientY
     );
   })
   .on('mousemove', ev => moveTip(ev.clientX, ev.clientY))
   .on('mouseout', function() { d3.select(this).attr('r', 6); hideTip(); });

  // EP value labels
  g.selectAll('.epl').data(EP).enter().append('text').attr('class','epl')
   .attr('x', d => xS(d.s)).attr('y', d => y(d.ep) - 15)
   .style('text-anchor','middle').style('fill','#00D45A')
   .style('font-size','10px').style('font-family','Inter').style('font-weight','600')
   .text(d => d.ep);

  // Team dots
  g.selectAll('.tpd').data(EP).enter().append('circle').attr('class','tpd')
   .attr('cx', d => xS(d.s)).attr('cy', d => y(d.tp)).attr('r', 5)
   .attr('fill','rgba(176,189,212,0.55)').attr('stroke','var(--navy-md)').attr('stroke-width',2)
   .style('cursor','pointer')
   .on('mouseover', function(ev, d) {
     d3.select(this).attr('r', 9);
     showTip(
       '<div class="tt">' + d.s + '</div>' +
       '<div class="tr"><span>Team Pts</span><span class="tv">' + d.tp + '</span></div>' +
       '<div class="tr"><span>EP Points</span><span class="tv">' + d.ep + '</span></div>',
       ev.clientX, ev.clientY
     );
   })
   .on('mousemove', ev => moveTip(ev.clientX, ev.clientY))
   .on('mouseout', function() { d3.select(this).attr('r', 5); hideTip(); });

  // Team value labels (below the dot to avoid clash with EP labels above)
  g.selectAll('.tpl').data(EP).enter().append('text').attr('class','tpl')
   .attr('x', d => xS(d.s)).attr('y', d => y(d.tp) + 20)
   .style('text-anchor','middle').style('fill','rgba(176,189,212,0.7)')
   .style('font-size','10px').style('font-family','Inter').style('font-weight','600')
   .text(d => d.tp);

  document.getElementById('leg4').innerHTML =
    '<div class="cli"><div class="clc" style="background:var(--green)"></div><span class="cll">Pettersson Points</span></div>' +
    '<div class="cli"><div class="clc" style="background:rgba(176,189,212,0.5);border:1px solid rgba(176,189,212,0.35)"></div><span class="cll">Team Standings Points</span></div>';
}