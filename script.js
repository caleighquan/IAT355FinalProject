/* ─────────────────────────────────────────────
   NAV DOTS
───────────────────────────────────────────── */
const SEC = ['hero','approach','viz1','tx1','viz2','ep-intro','viz3','conclusion'];
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

/* ─────────────────────────────────────────────
   TOOLTIP
───────────────────────────────────────────── */
const TIP = document.getElementById('tip');
const showTip = (html, x, y) => { TIP.innerHTML = html; TIP.style.opacity = 1; TIP.style.left = (x + 18) + 'px'; TIP.style.top = (y - 14) + 'px'; };
const moveTip = (x, y) => { TIP.style.left = (x + 18) + 'px'; TIP.style.top = (y - 14) + 'px'; };
const hideTip = () => { TIP.style.opacity = 0; };

const SEASONS = ['2021-22','2022-23','2023-24','2024-25','2025-26'];

/* ─────────────────────────────────────────────
   SEASON LABEL NORMALISER (hyphen -> en-dash)
───────────────────────────────────────────── */
const normSeason = s => s.replace(/-/g, '\u2013').trim();

/* ═══════════════════════════════════════════════════════════
   LOAD BOTH FULL DATASETS, DERIVE AND DRAW
═══════════════════════════════════════════════════════════ */
Promise.all([
  d3.csv("canucks_player_stats_2021_2026_combined.csv"),
  d3.csv("canucks_team_stats_2021_2026.csv")
]).then(([players, teams]) => {

  players.forEach(d => {
    d.Goals   = +d.goals;
    d.Assists = +d.assists;
    d.Points  = +d.points;
    d.GP      = +d.gp;
    d.Player  = d.player;
    d.Season  = normSeason(d.season);
  });

  teams.forEach(d => {
    d.Points       = +d.PTS;
    d.GoalsFor     = +d.GF;
    d.GoalsAgainst = +d.GA;
    d.GamesPlayed  = +d.GP;
    d.Playoffs     = d.Season === '2023-24';
    d.Season       = normSeason(d.Season);
  });

  const csvSeasons = [...new Set(teams.map(d => d.Season))].sort();

  const goalsByPlayer = d3.rollup(players, v => d3.sum(v, d => d.Goals), d => d.Player);
  const TOP15 = Array.from(goalsByPlayer, ([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals).slice(0, 15);

  const TEAM = teams.map(d => ({
    s:   d.Season,
    pts: d.Points,
    gf:  +(d.GoalsFor  / d.GamesPlayed).toFixed(2),
    ga:  +(d.GoalsAgainst / d.GamesPlayed).toFixed(2),
    po:  d.Playoffs
  })).sort((a, b) => csvSeasons.indexOf(a.s) - csvSeasons.indexOf(b.s));

  const epRows = players.filter(d => d.Player && d.Player.includes('Pettersson'));
  const epBySeason = d3.rollup(epRows, v => d3.sum(v, d => d.Points), d => d.Season);
  const EP = csvSeasons.map(s => {
    const teamRow = teams.find(d => d.Season === s);
    return { s, ep: epBySeason.get(s) || 0, tp: teamRow ? teamRow.Points : 0 };
  });

  initCharts(TOP15, TEAM, EP, csvSeasons);

}).catch(err => {
  console.error('Failed to load CSV data:', err);
  document.body.insertAdjacentHTML('afterbegin',
    '<div style="position:fixed;top:0;left:0;right:0;background:#c0392b;color:#fff;padding:12px 20px;z-index:9999;font-family:Inter,sans-serif;font-size:0.85rem;">' +
    '⚠ Could not load data files. Ensure canucks_player_stats_2021_2026_combined.csv and canucks_team_stats_2021_2026.csv are in the same directory.' +
    '</div>'
  );
});

/* ─────────────────────────────────────────────
   INIT CHARTS ON SCROLL
───────────────────────────────────────────── */
function initCharts(TOP15, TEAM, EP, seasons) {
  let d1 = false, d2 = false, d3f = false;
  const cObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      if (e.target.id === 'viz1' && !d1)  { d1  = true; drawV1(TOP15); }
      if (e.target.id === 'viz2' && !d2)  { d2  = true; drawV2(TEAM); }
      if (e.target.id === 'viz3' && !d3f) { d3f = true; drawV3(EP, seasons); }
    });
  }, { threshold: 0.22 });
  ['viz1','viz2','viz3'].forEach(id => cObs.observe(document.getElementById(id)));
}

/* ═══════════════════════════════════════
   VIZ 1 - TOP 15 PLAYERS BAR CHART
═══════════════════════════════════════ */
function drawV1(TOP15) {
  const box = document.querySelector('#viz1 .chart-box');
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
   .style('text-anchor','middle').style('fill','rgba(122,143,173,0.55)')
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

/* ═══════════════════════════════════════
   VIZ 2 - SCATTERPLOT
═══════════════════════════════════════ */
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

  const izX = x(3.15), izY = y(2.95);
  g.append('rect').attr('x',izX).attr('y',0).attr('width',iw-izX).attr('height',izY)
   .attr('fill','rgba(0,132,61,0.055)').attr('stroke','rgba(0,132,61,0.18)').attr('stroke-width',1).attr('rx',4);
  g.append('text').attr('x',izX+9).attr('y',14)
   .style('fill','rgba(0,168,77,0.45)').style('font-size','9px').style('font-family','Inter').style('letter-spacing','0.13em')
   .text('IDEAL ZONE');

  g.append('g').attr('class','axis').attr('transform','translate(0,' + ih + ')').call(d3.axisBottom(x).ticks(5).tickSize(0).tickPadding(10));
  g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(10));

  g.append('text').attr('x',iw/2).attr('y',ih+54).style('text-anchor','middle')
   .style('fill','rgba(122,143,173,0.7)').style('font-size','11px').style('font-family','Inter')
   .text('Goals For Per Game  \u2192  (higher = better offence)');
  g.append('text').attr('transform','rotate(-90)').attr('x',-ih/2).attr('y',-54).style('text-anchor','middle')
   .style('fill','rgba(122,143,173,0.7)').style('font-size','11px').style('font-family','Inter')
   .text('Goals Against Per Game  \u2192  (lower = better defence)');

  const lineG = d3.line().x(d => x(d.gf)).y(d => y(d.ga)).curve(d3.curveCatmullRom);
  g.append('path').datum(TEAM).attr('fill','none').attr('stroke','rgba(255,255,255,0.08)')
   .attr('stroke-width',1.5).attr('stroke-dasharray','4,4').attr('d',lineG);

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
}

/* ═══════════════════════════════════════
   VIZ 3 - DUAL LINE (EP vs TEAM)
═══════════════════════════════════════ */
function drawV3(EP, seasons) {
  const box = document.querySelector('#viz3 .chart-box');
  const W = box.clientWidth - 88, H = 380;
  const m = { top:30, right:82, bottom:54, left:58 };
  const iw = W - m.left - m.right, ih = H - m.top - m.bottom;

  const svg = d3.select('#ch3').attr('width', W).attr('height', H);
  const g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');

  const xS  = d3.scalePoint().domain(seasons).range([0, iw]).padding(0.28);
  const yEP = d3.scaleLinear().domain([0, 120]).range([ih, 0]);
  const yTP = d3.scaleLinear().domain([0, 130]).range([ih, 0]);

  g.append('g').attr('class','grid').call(d3.axisLeft(yEP).tickSize(-iw).tickFormat('').ticks(6));

  const px1 = xS(seasons[1]), px2 = xS(seasons[2]), bw = xS.step();
  g.append('rect').attr('x', px1 - bw*0.17).attr('y', 0)
   .attr('width', px2 - px1 + bw*0.34).attr('height', ih)
   .attr('fill','rgba(0,132,61,0.05)').attr('rx',4);
  g.append('text').attr('x', (px1+px2)/2).attr('y', 12)
   .style('text-anchor','middle').style('fill','rgba(0,168,77,0.38)')
   .style('font-size','9px').style('font-family','Inter').style('letter-spacing','0.13em')
   .text('PEAK YEARS');

  g.append('g').attr('class','axis').attr('transform','translate(0,' + ih + ')').call(d3.axisBottom(xS).tickSize(0).tickPadding(12));
  g.append('g').attr('class','axis').call(d3.axisLeft(yEP).ticks(6).tickSize(0).tickPadding(8));
  g.append('g').attr('class','axis').attr('transform','translate(' + iw + ',0)').call(d3.axisRight(yTP).ticks(6).tickSize(0).tickPadding(8));

  g.append('text').attr('transform','rotate(-90)').attr('x',-ih/2).attr('y',-46)
   .style('text-anchor','middle').style('fill','rgba(0,168,77,0.55)').style('font-size','10px').style('font-family','Inter').text('EP Points');
  g.append('text').attr('transform','rotate(90)').attr('x',ih/2).attr('y',-(iw+68))
   .style('text-anchor','middle').style('fill','rgba(180,190,210,0.45)').style('font-size','10px').style('font-family','Inter').text('Team Pts');

  const lEP = d3.line().x(d => xS(d.s)).y(d => yEP(d.ep)).curve(d3.curveCatmullRom);
  const lTP = d3.line().x(d => xS(d.s)).y(d => yTP(d.tp)).curve(d3.curveCatmullRom);

  g.append('path').datum(EP).attr('fill','none').attr('stroke','var(--green)').attr('stroke-width',2.5).attr('d',lEP);
  g.append('path').datum(EP).attr('fill','none').attr('stroke','rgba(176,189,212,0.42)').attr('stroke-width',2).attr('d',lTP);

  g.selectAll('.epd').data(EP).enter().append('circle').attr('class','epd')
   .attr('cx', d => xS(d.s)).attr('cy', d => yEP(d.ep)).attr('r', 6)
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

  g.selectAll('.epl').data(EP).enter().append('text').attr('class','epl')
   .attr('x', d => xS(d.s)).attr('y', d => yEP(d.ep) - 15)
   .style('text-anchor','middle').style('fill','#00D45A')
   .style('font-size','10px').style('font-family','Inter').style('font-weight','600')
   .text(d => d.ep);

  g.selectAll('.tpd').data(EP).enter().append('circle').attr('class','tpd')
   .attr('cx', d => xS(d.s)).attr('cy', d => yTP(d.tp)).attr('r', 5)
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

  document.getElementById('leg3').innerHTML =
    '<div class="cli"><div class="clc" style="background:var(--green)"></div><span class="cll">Pettersson Points</span></div>' +
    '<div class="cli"><div class="clc" style="background:rgba(176,189,212,0.5);border:1px solid rgba(176,189,212,0.35)"></div><span class="cll">Team Standings Points</span></div>';
}