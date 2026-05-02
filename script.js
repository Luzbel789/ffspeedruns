let GAMES={};

const state={game:null,cat:null,platform:null,query:'',rulesOpen:false,infoTab:'rules',aboutOpen:false};
const $=s=>document.querySelector(s);
const clone=value=>JSON.parse(JSON.stringify(value));
function normalizeLeaderboards(data){
  data._site=data._site||{aboutTitle:'About / FAQ',aboutBody:'This leaderboard tracks selected Final Fantasy speedruns by game, platform and category.\n\nTiers are calculated automatically from the current world record for each leaderboard.\n\nSubmit times via the links in the footer.'};
  data._site.aboutTitle=data._site.aboutTitle||'About / FAQ';
  data._site.aboutBody=data._site.aboutBody||'';
  for(const game of Object.values(data)){
    if(!game||(!game.platforms&&!game.categories))continue;
    if(Array.isArray(game.categories)){
      const nextPlatforms={};
      for(const category of game.categories){
        const {platforms={},...base}=category;
        for(const [platform,runs] of Object.entries(platforms)){
          if(!nextPlatforms[platform])nextPlatforms[platform]={categories:[]};
          nextPlatforms[platform].categories.push({...clone(base),rules:base.rules||'',guides:Array.isArray(base.guides)?clone(base.guides):[],cutoffs:base.cutoffs?clone(base.cutoffs):{},runs:Array.isArray(runs)?clone(runs):[]});
        }
      }
      delete game.categories;
      game.platforms=nextPlatforms;
    }
    game.platforms=game.platforms||{};
    for(const platformData of Object.values(game.platforms)){
      platformData.categories=platformData.categories||[];
      for(const category of platformData.categories){
        category.rules=category.rules||'';
        category.guides=Array.isArray(category.guides)?category.guides:[];
        category.cutoffs=category.cutoffs||{};
        category.runs=Array.isArray(category.runs)?category.runs:[];
      }
    }
  }
  return data;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[m]);}
function nonEmptyString(value){return typeof value==='string'&&value.trim()!=='';}
function displayDate(date){
  const parts=String(date).split('-');
  return parts.length===3?`${parts[2]}-${parts[1]}-${parts[0]}`:String(date);
}
function rankRoman(n){
  if(n>3)return String(n);
  return'I'.repeat(n);
}
function timeToSeconds(time){return time.split(':').reduce((total,part)=>total*60+Number(part),0);}
function secondsToTime(seconds){const rounded=Math.floor(seconds);const h=Math.floor(rounded/3600);const m=Math.floor(rounded%3600/60);const s=rounded%60;return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
function tierForTime(time,wrTime){
  const margin=(time-wrTime)/wrTime;
  if(margin<=.01)return'S';
  if(margin<=.02)return'A';
  if(margin<=.03)return'B';
  if(margin<=.05)return'C';
  if(margin<=.08)return'D';
  return'Unranked';
}
function rankedRuns(runs){
  const sorted=[...runs].sort((a,b)=>timeToSeconds(a.time)-timeToSeconds(b.time));
  const wrTime=sorted.length?timeToSeconds(sorted[0].time):0;
  return sorted.map((run,index)=>{
    const seconds=timeToSeconds(run.time);
    return {...run,pos:index+1,tier:index===0?'WR':tierForTime(seconds,wrTime)};
  });
}
function currentGame(){return state.game?GAMES[state.game]:null}
function currentPlatform(){const g=currentGame();return g?.platforms?.[state.platform]||null}
function currentCategories(){return currentPlatform()?.categories||[]}
function currentCategory(){const cats=currentCategories();return cats.find(c=>c.id===state.cat)||cats[0]||null}
function categoryGuides(cat){return Array.isArray(cat?.guides)?cat.guides:[];}
function platformsForGame(game){return Object.keys(game?.platforms||{});}
function categoriesForPlatform(game,platform){return game?.platforms?.[platform]?.categories||[];}
function syncCategoryForPlatform(){const game=currentGame();if(!game)return;const platforms=platformsForGame(game);if(!state.platform||!platforms.includes(state.platform))state.platform=platforms[0];const cats=categoriesForPlatform(game,state.platform);if(!cats.some(c=>c.id===state.cat))state.cat=cats[0]?.id||null;}
function currentRuns(){const cat=currentCategory();if(!cat)return[];return rankedRuns(cat.runs||[]);}
function cutoffHtml(rows){if(!rows.length)return'';const wr=timeToSeconds(rows[0].time);return `CUTOFFS&nbsp;&nbsp;<span class="cutoff-s">S</span>: ${secondsToTime(wr*1.01)} · <span class="cutoff-a">A</span>: ${secondsToTime(wr*1.02)} · <span class="cutoff-b">B</span>: ${secondsToTime(wr*1.03)} · <span class="cutoff-c">C</span>: ${secondsToTime(wr*1.05)} · <span class="cutoff-d">D</span>: ${secondsToTime(wr*1.08)}`;}
function timeHtml(run){return `<span class="time-val ${run.tier==='WR'?'time-wr':''}">${escapeHtml(run.time)}</span>`;}
function tierHtml(t){return `<span class="tier ${t.toLowerCase()}">${t}</span>`;}
function runnerHtml(run){
  const name=escapeHtml(run.runner);
  const url=nonEmptyString(run.runnerUrl)?run.runnerUrl.trim():'';
  return url?`<a class="runner-name" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${name}</a>`:`<span class="runner-name">${name}</span>`;
}
function vodHtml(url){
  const href=nonEmptyString(url)?url.trim():'';
  return href&&href!=='#'?`<a class="vod-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Watch</a>`:`<span class="vod-missing">—</span>`;
}
function shortGameName(name){return String(name).replace(/^Final Fantasy\s+/i,'FF ');}
function rulesHtml(text){
  return escapeHtml(text||'').replace(/https?:\/\/[^\s<]+/g,url=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}
function aboutHtml(text){
  return escapeHtml(text||'')
    .replace(/^##\s+(.+)$/gm,'<h3>$1</h3>')
    .replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>')
    .replace(/https?:\/\/[^\s<]+/g,url=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}
function gameEntries(){return Object.entries(GAMES).filter(([,game])=>game&&game.platforms);}
function flattenRuns(){return gameEntries().flatMap(([gameId,game],gameOrder)=>Object.entries(game.platforms||{}).flatMap(([platform,platformData],platformOrder)=>(platformData.categories||[]).flatMap((cat,categoryOrder)=>rankedRuns(cat.runs||[]).map(run=>({...run,gameId,gameName:game.name,gameColor:game.color,category:cat.name,platform,gameOrder,platformOrder,categoryOrder})))))}
function latestRuns(){return flattenRuns().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);}
function searchRuns(query){const q=query.trim().toLowerCase();return flattenRuns().filter(r=>r.runner.toLowerCase().includes(q)).sort((a,b)=>a.gameOrder-b.gameOrder||a.platformOrder-b.platformOrder||a.categoryOrder-b.categoryOrder||a.pos-b.pos);}
function renderNav(){
  $('#gameNav').innerHTML=gameEntries().map(([id,game])=>`<button class="game-btn ${state.game===id?'active':''}" data-game="${id}" style="--game-color:${game.color}">${game.name}</button>`).join('');
}
function renderLatest(){
  const q=state.query.trim().toLowerCase();
  const rows=q?searchRuns(q):latestRuns();
  $('#latestCount').textContent=q?`Search results for "${state.query.trim()}"`:`${rows.length} runs`;
  $('#latestPanel table').classList.toggle('search-table',!!q);
  $('#latestPanel table').classList.toggle('search-results-table',!!q);
  $('#latestPanel table thead tr').innerHTML=q?'<th class="c">Rank</th><th class="c">Tier</th><th>Runner</th><th>Category</th><th class="c">Time</th><th class="c">Date</th><th class="c vod-cell">VOD</th>':'<th class="c">Rank</th><th>Tier</th><th>Runner</th><th>Game</th><th>Category</th><th>Time</th><th class="r">Date</th><th class="c">VOD</th>';
  let lastGame='';
  $('#latestBody').innerHTML=rows.length?rows.map(r=>{
    const group=q&&r.gameName!==lastGame?`<tr class="search-group"><td colspan="7">${escapeHtml(r.gameName)}</td></tr>`:'';
    lastGame=r.gameName;
    return q?`${group}
    <tr class="row-${Math.min(r.pos,4)} search-row-result">
      <td class="c"><span class="rank">${rankRoman(r.pos)}</span></td>
      <td class="c"><span class="tier ${r.tier.toLowerCase()}">${r.tier}</span></td>
      <td>${runnerHtml(r)}</td>
      <td><span class="cat-tag">${escapeHtml(r.platform)} &middot; ${escapeHtml(r.category)}</span></td>
      <td class="c">${timeHtml(r)}</td>
      <td class="c"><span class="date-val">${escapeHtml(displayDate(r.date))}</span></td>
      <td class="c vod-cell">${vodHtml(r.vod)}</td>
    </tr>`:`${group}
    <tr class="row-${Math.min(r.pos,4)}">
      <td class="c"><span class="rank">${rankRoman(r.pos)}</span></td>
      <td><span class="tier ${r.tier.toLowerCase()}">${r.tier}</span></td>
      <td>${runnerHtml(r)}</td>
      <td><span class="game-tag">${escapeHtml(shortGameName(r.gameName))}</span></td>
      <td><span class="cat-tag">${escapeHtml(r.category)} &middot; ${escapeHtml(r.platform)}</span></td>
      <td>${timeHtml(r)}</td>
      <td class="r"><span class="date-val">${escapeHtml(displayDate(r.date))}</span></td>
      <td class="c">${vodHtml(r.vod)}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="${q?'7':'8'}" class="empty-state">${q?'No runs found for that runner.':'No latest runs match that runner search.'}</td></tr>`;
}
function renderAbout(){
  const site=GAMES._site||{};
  $('#aboutTitle').textContent=site.aboutTitle||'About / FAQ';
  $('#aboutBody').innerHTML=aboutHtml(site.aboutBody||'This leaderboard tracks selected Final Fantasy speedruns by game, platform and category.');
}
function renderBoard(){
  const game=currentGame();
  syncCategoryForPlatform();
  const cat=currentCategory();
  if(!game||!cat)return;
  const guides=categoryGuides(cat);
  if(!guides.length&&state.infoTab==='guides')state.infoTab='rules';
  $('#platformControls').innerHTML=platformsForGame(game).map(platform=>`<button class="platform-btn ${platform===state.platform?'active':''}" data-platform="${platform}">${platform}</button>`).join('');
  $('#categoryControls').innerHTML=categoriesForPlatform(game,state.platform).map(c=>`<button class="cat-btn ${c.id===cat.id?'active':''}" data-cat="${c.id}">${c.name}</button>`).join('');
  $('#rulesBody').innerHTML=rulesHtml(cat.rules);
  $('#rulesBody').classList.toggle('open',state.rulesOpen&&state.infoTab==='rules');
  $('#guidesBody').classList.toggle('open',state.rulesOpen&&state.infoTab==='guides');
  $('#guidesBody').innerHTML=guides.map(guide=>`<div class="guide-item">${nonEmptyString(guide.url)?`<a href="${escapeHtml(guide.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(guide.title||guide.url)}</a>`:`<span>${escapeHtml(guide.title||'Guide')}</span>`}${nonEmptyString(guide.description)?`<p>${escapeHtml(guide.description)}</p>`:''}</div>`).join('');
  $('#guidesToggle').hidden=!guides.length;
  $('#rulesToggle').classList.toggle('active',state.infoTab==='rules');
  $('#guidesToggle').classList.toggle('active',state.infoTab==='guides');
  $('#rulesToggle').textContent=state.rulesOpen&&state.infoTab==='rules'?'Rules ▴':'Rules ▾';
  $('#guidesToggle').textContent=state.rulesOpen&&state.infoTab==='guides'?'Guides ▴':'Guides ▾';
  const q=state.query.trim().toLowerCase();
  const allRows=currentRuns();
  const rows=allRows.filter(r=>!q||r.runner.toLowerCase().includes(q));
  $('#boardBody').innerHTML=rows.length?rows.map(r=>`
    <tr class="row-${Math.min(r.pos,4)}">
      <td class="c"><span class="rank">${rankRoman(r.pos)}</span></td>
      <td><span class="tier ${r.tier.toLowerCase()}">${r.tier}</span></td>
      <td>${runnerHtml(r)}</td>
      <td>${timeHtml(r)}</td>
      <td class="r"><span class="date-val">${escapeHtml(displayDate(r.date))}</span></td>
      <td class="c">${vodHtml(r.vod)}</td>
    </tr>`).join(''):`<tr><td colspan="6" class="empty-state">No runs for this selection.</td></tr>`;
  $('#cutoffsLine').innerHTML=cutoffHtml(allRows);
}
function updateView(){
  const searching=state.query.trim()!=='';
  const onLatest=!state.game||searching;
  $('#latestPanel').classList.toggle('hidden',!onLatest||state.aboutOpen);
  $('#aboutPanel').classList.toggle('hidden',!onLatest||!state.aboutOpen);
  $('#boardPanel').classList.toggle('active',!onLatest);
  renderNav(); renderLatest(); renderAbout(); if(!onLatest)renderBoard();
}
function parseHash(){
  const value=location.hash.replace(/^#/,'');
  if(!value)return null;
  try{
    const parts=value.split('/').filter(Boolean).map(part=>decodeURIComponent(part));
    return parts.length===3?{game:parts[0],platform:parts[1],cat:parts[2]}:null;
  }catch(error){return null;}
}
function setHashFromState(){
  if(!state.game){if(location.hash)location.hash='';return;}
  const next=`#/${encodeURIComponent(state.game)}/${encodeURIComponent(state.platform)}/${encodeURIComponent(state.cat)}`;
  if(location.hash!==next)location.hash=next;
}
function applyHash(){
  const route=parseHash();
  const game=route?GAMES[route.game]:null;
  const cats=game?categoriesForPlatform(game,route.platform):[];
  const cat=cats.find(c=>c.id===route.cat);
  if(!route||!game||!cat){
    state.game=null; state.cat=null; state.platform=null; state.rulesOpen=false; state.infoTab='rules'; updateView(); return;
  }
  state.game=route.game; state.cat=route.cat; state.platform=route.platform; updateView();
}
function selectGame(gameId){const game=GAMES[gameId]; const platform=platformsForGame(game)[0]; const cat=categoriesForPlatform(game,platform)[0]; state.game=gameId; state.platform=platform; state.cat=cat?.id||null; state.rulesOpen=false; state.infoTab='rules'; state.aboutOpen=false; updateView();}
function resetToLatest(){state.game=null; state.cat=null; state.platform=null; state.rulesOpen=false; state.infoTab='rules'; state.aboutOpen=false; updateView(); window.scrollTo({top:0,behavior:'smooth'});}
$('#gameNav').addEventListener('click',e=>{const btn=e.target.closest('[data-game]'); if(btn){selectGame(btn.dataset.game); setHashFromState();}});
$('#categoryControls').addEventListener('click',e=>{const btn=e.target.closest('[data-cat]'); if(!btn)return; state.cat=btn.dataset.cat; state.infoTab='rules'; renderBoard(); setHashFromState();});
$('#platformControls').addEventListener('click',e=>{const btn=e.target.closest('[data-platform]'); if(!btn)return; state.platform=btn.dataset.platform; state.infoTab='rules'; syncCategoryForPlatform(); renderBoard(); setHashFromState();});
$('#rulesToggle').addEventListener('click',()=>{state.rulesOpen=state.infoTab==='rules'?!state.rulesOpen:true; state.infoTab='rules'; renderBoard();});
$('#guidesToggle').addEventListener('click',()=>{state.rulesOpen=state.infoTab==='guides'?!state.rulesOpen:true; state.infoTab='guides'; renderBoard();});
$('#runnerSearch').addEventListener('input',e=>{state.query=e.target.value; updateView();});
$('#aboutToggle').addEventListener('click',()=>{state.aboutOpen=true; updateView();});
$('#coverCrystal').addEventListener('click',()=>{resetToLatest(); setHashFromState();});
$('.site-title').addEventListener('click',()=>{resetToLatest(); setHashFromState();});
$('.site-title').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();resetToLatest();setHashFromState();}});
addEventListener('hashchange',applyHash);
(function(){const c=document.getElementById('starfield'),ctx=c.getContext('2d');let stars=[];function resize(){c.width=innerWidth;c.height=innerHeight;stars=Array.from({length:Math.min(140,Math.floor(innerWidth*innerHeight/9500))},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.5+.2,a:Math.random(),s:Math.random()*.35+.08}));}function draw(){ctx.clearRect(0,0,c.width,c.height);for(const st of stars){st.a+=st.s*.015;ctx.globalAlpha=.18+Math.sin(st.a)*.22+.24;ctx.fillStyle='#eef6ff';ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;requestAnimationFrame(draw);}resize();draw();addEventListener('resize',resize);})();
(function(){const c=document.getElementById('hexfield'),ctx=c.getContext('2d');function resize(){c.width=innerWidth;c.height=innerHeight;draw();}function draw(){ctx.clearRect(0,0,c.width,c.height);const R=34,W=R*Math.sqrt(3),H=R*1.5;ctx.strokeStyle='rgba(150,210,255,.06)';ctx.lineWidth=.75;for(let y=-H;y<c.height+H;y+=H){for(let x=-W;x<c.width+W;x+=W){const ox=(Math.round(y/H)%2)*W/2;ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30);const px=x+ox+R*Math.cos(a),py=y+R*Math.sin(a);i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.stroke();}}}resize();addEventListener('resize',resize);})();
(function(){const canvas=document.getElementById('crystal-canvas');const stage=document.getElementById('coverCrystal');if(!canvas||!stage||getComputedStyle(stage).display==='none')return;const ctx=canvas.getContext('2d');const W=canvas.width,H=canvas.height,cx=W/2,cy=H/2+4,SIDES=6,R=58,YT=cy-86,YB=cy+78,YE=cy;let angle=0,sparks=[];function project(rx,ry,rz){const fov=360,dist=fov+rz*.45;return{x:cx+rx*fov/dist,y:ry+rz*.03};}function vertex(i,ang){const t=i/SIDES*Math.PI*2+ang;return {...project(Math.cos(t)*R,YE,Math.sin(t)*R),z:Math.sin(t)*R};}function draw(t){ctx.clearRect(0,0,W,H);const pulse=(Math.sin(t*1.4)+1)/2;const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,96+pulse*18);glow.addColorStop(0,`rgba(120,230,255,${.23+pulse*.10})`);glow.addColorStop(.45,`rgba(0,183,255,${.08+pulse*.04})`);glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(cx,cy,98,134,0,0,Math.PI*2);ctx.fill();const faces=[];for(let i=0;i<SIDES;i++){const v0=vertex(i,angle),v1=vertex(i+1,angle),z=(v0.z+v1.z)/2;faces.push({top:true,v0,v1,z,apex:{x:cx,y:YT}});faces.push({top:false,v0,v1,z,apex:{x:cx,y:YB}});}faces.sort((a,b)=>a.z-b.z);for(const f of faces){const depth=(f.z/R)*.5+.5;ctx.beginPath();ctx.moveTo(f.apex.x,f.apex.y);ctx.lineTo(f.v0.x,f.v0.y);ctx.lineTo(f.v1.x,f.v1.y);ctx.closePath();const grad=ctx.createLinearGradient(f.apex.x,f.apex.y,(f.v0.x+f.v1.x)/2,(f.v0.y+f.v1.y)/2);const rr=f.top?60+depth*120:10+depth*70,gg=f.top?160+depth*80:90+depth*120,bb=230+depth*25;grad.addColorStop(0,`rgba(${rr+45},${gg+55},255,${.72+depth*.22})`);grad.addColorStop(.55,`rgba(${rr},${gg},${bb},${.48+depth*.28})`);grad.addColorStop(1,`rgba(7,28,90,${.38+depth*.22})`);ctx.fillStyle=grad;ctx.fill();ctx.strokeStyle=f.z>0?`rgba(205,250,255,${.30+depth*.48})`:`rgba(40,117,205,${.18+depth*.28})`;ctx.lineWidth=f.z>0?1.1:.55;ctx.stroke();if(f.z>R*.42&&f.top){ctx.beginPath();ctx.moveTo(cx,YT+15);ctx.lineTo((f.v0.x+cx)/2,(f.v0.y+YT)/2);ctx.strokeStyle=`rgba(255,255,255,${.18+pulse*.18})`;ctx.stroke();}}const core=ctx.createRadialGradient(cx,cy-5,0,cx,cy-5,38);core.addColorStop(0,`rgba(255,255,255,${.76+pulse*.18})`);core.addColorStop(.26,`rgba(120,240,255,${.50+pulse*.18})`);core.addColorStop(1,'rgba(0,183,255,0)');ctx.fillStyle=core;ctx.beginPath();ctx.ellipse(cx,cy-5,38,26,0,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(cx,cy-6);ctx.rotate(t*.6);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);const len=20+pulse*16;const ray=ctx.createLinearGradient(0,0,0,-len);ray.addColorStop(0,`rgba(255,255,255,${.54+pulse*.2})`);ray.addColorStop(1,'rgba(52,235,255,0)');ctx.strokeStyle=ray;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-len);ctx.stroke();}ctx.restore();if(Math.random()<.08)sparks.push({x:cx+(Math.random()-.5)*88,y:cy-52+Math.random()*110,life:1,decay:.018+Math.random()*.03,size:1+Math.random()*2.1});sparks=sparks.filter(s=>s.life>0);for(const s of sparks){ctx.globalAlpha=s.life;ctx.fillStyle='#e8fbff';ctx.beginPath();ctx.arc(s.x,s.y,s.size*s.life,0,Math.PI*2);ctx.fill();s.y-=.38;s.life-=s.decay;}ctx.globalAlpha=1;angle+=.012;}let t=0;function loop(){t+=.016;draw(t);requestAnimationFrame(loop);}loop();})();
// Load data before the first render so the JSON file is the source of truth.
async function loadLeaderboards(){
  const response=await fetch('data/leaderboards.json');
  if(!response.ok)throw new Error(`Failed to load leaderboards (${response.status})`);
  GAMES=normalizeLeaderboards(await response.json());
  if(location.hash)applyHash();else updateView();
}
loadLeaderboards().catch(error=>{
  console.error(error);
  $('#latestCount').textContent='Unable to load runs';
  $('#latestBody').innerHTML='<tr><td colspan="8" class="empty-state">Unable to load leaderboard data.</td></tr>';
});
