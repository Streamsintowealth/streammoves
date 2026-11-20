/* Stream Moves | personal, browser-only investment research journal.
   No accounts, tracking, remote services, or market-data requests. */
'use strict';

const STORAGE_KEY = 'streammoves_journal_v1';
const FORMAT = 'streammoves-backup';
const CONFLUENCE_KEY = 'streammoves_confluence_v1';
const STRATEGIES = {
  swings: { name: 'Swings', title: 'Your Swing Journal', eyebrow: 'SWING RESEARCH WORKSPACE', desc: 'Keep your market thesis, technical setup, and decisions together.' },
  leaps: { name: 'LEAPS', title: 'Your LEAPS Journal', eyebrow: 'LEAPS RESEARCH WORKSPACE', desc: 'Research longer-term ideas, contracts, volatility, and thesis changes.' },
  'long-term': { name: 'Long term', title: 'Your Long-Term Journal', eyebrow: 'LONG-TERM INVESTMENT WORKSPACE', desc: 'Evaluate business quality, valuation, conviction, and long-term progress.' }
};
const STAGES = [
  { key: 'economic', name: 'Economic Cycle', description: 'Establish the macro backdrop before forming a thesis.', checks: ['GDP / growth trend checked', 'Inflation / CPI trend checked', 'Jobs / labor conditions checked', 'Fed rates / yield curve reviewed', 'Economic cycle phase identified'] },
  { key: 'sector', name: 'Sector Rotation', description: 'Understand whether the sector supports or challenges your idea.', checks: ['Sector relative strength compared', 'Leading / lagging sectors identified', '20 / 50 / 200-day sector trends checked', 'Money flows / breadth reviewed', 'Sector catalyst or headwind recorded'] },
  { key: 'fundamentals', name: 'Company Fundamentals', description: 'Record what the company is doing and how it is valued.', checks: ['Revenue and earnings trends checked', 'Guidance / earnings-call outlook reviewed', 'Debt / cash flow / balance sheet checked', 'Valuation compared with peers or history', 'Business moat / risks assessed'] },
  { key: 'technical', name: 'Technical Confirmation', description: 'Look for a defined setup rather than a guess.', checks: ['Primary trend / market structure confirmed', '20 / 50 / 200-day moving averages checked', 'Supply / demand zones marked', 'Volume / candlestick behavior assessed', 'FVG / imbalance / liquidity reviewed', 'Entry, invalidation, risk/reward considered'] },
  { key: 'options', name: 'Options Activity & Positioning', description: 'Review what options markets may be pricing in.', checks: ['Open interest / volume checked', 'Implied volatility / IV rank reviewed', 'Calls vs puts / positioning examined', 'Expected move / key expirations checked', 'Greeks / spread liquidity reviewed'] }
];
const CONFLUENCE_SIGNALS = [
  {key:'oi', name:'Open Interest (OI)', call:'Calls show growing interest, with other evidence supporting new bullish positioning.', put:'Puts show growing interest, with other evidence supporting new bearish positioning.', hint:'Compare the same strike and expiration across sessions. OI alone cannot reveal who bought or sold.', links:[['Option-chain data','https://www.optionseducation.org/options-quotes-calculators'],['Cboe quotes','https://www.cboe.com/data/quotes/all/options']]},
  {key:'activity', name:'Trade Activity', call:'Aggressive call buying appears near the ask, supported by volume and trade context.', put:'Aggressive put buying appears near the ask, supported by volume and trade context.', hint:'Trades near the ask suggest but do not prove buyers initiated; spreads and hedges may change interpretation.', links:[['Unusual options activity','https://www.barchart.com/options/unusual-activity/stocks'],['Options flow','https://www.barchart.com/options/options-flow']]},
  {key:'iv', name:'Implied Volatility (IV)', call:'Call IV or skew shifts, alongside flow, support stronger upside demand.', put:'Put IV or skew shifts, alongside flow, support stronger downside demand.', hint:'Rising IV indicates expected volatility, not a direction by itself. Check IV rank and event risk.', links:[['Options monitor / IV','https://www.optionseducation.org/options-quotes-calculators'],['IV and options data','https://www.barchart.com/options']]},
  {key:'structure', name:'Technical Structure', call:'Higher highs and lows, bullish BOS/CHOCH, or a confirmed break and hold above resistance.', put:'Lower highs and lows, bearish BOS/CHOCH, or a confirmed break and hold below support.', hint:'Use your chosen timeframe, mark the invalidation level, and avoid counting an unconfirmed break.', links:[['Interactive chart','https://www.tradingview.com/chart/'],['Stock charts','https://stockcharts.com/freecharts/']]},
  {key:'candles', name:'Candlestick Pattern', call:'Bullish engulfing, morning star, or other bullish reversal/continuation pattern at a meaningful level.', put:'Bearish engulfing, evening star, or other bearish reversal/continuation pattern at a meaningful level.', hint:'Patterns gain context from the trend, location, and subsequent price confirmation.', links:[['Candlestick charts','https://stockcharts.com/freecharts/candleglance.html'],['Pattern reference','https://chartschool.stockcharts.com/table-of-contents/chart-analysis/candlestick-charts']]},
  {key:'volume', name:'Volume', call:'Expanding volume accompanies upside price movement and supports a bullish breakout/reversal.', put:'Expanding volume accompanies downside price movement and supports a bearish breakdown/reversal.', hint:'Compare volume with recent bars and session norms; volume by itself is not directional.', links:[['Volume / market activity','https://www.barchart.com/stocks'],['Interactive chart','https://www.tradingview.com/chart/']]}
];
const CONFLUENCE_SIDES = ['','call','put','mixed'];
const STATUSES = ['Researching', 'Watching', 'Open', 'Closed', 'Avoided'];
const DECISIONS = ['Undecided', 'Buy', 'Hold', 'Wait', 'Avoid', 'Sell'];
const RATINGS = ['bullish', 'neutral', 'bearish'];
const $ = (id) => document.getElementById(id);
const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const isoNow = () => new Date().toISOString();
const today = () => new Date().toLocaleDateString('en-CA');
const plain = (v, max = 12000) => typeof v === 'string' ? v.slice(0, max) : '';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = (iso) => {const d = new Date(iso); return isNaN(d.getTime()) ? 'Date unknown' : d.toLocaleString(undefined, {month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});};
const shortDate = (iso) => {const d = new Date(iso);return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, {month:'short',day:'numeric'});};
const safeUrl = (v) => {try {const u = new URL(v); return ['https:','http:'].includes(u.protocol) ? u.href : null;} catch {return null;}};
const validDate = (s) => typeof s === 'string' && !Number.isNaN(Date.parse(s));
const deepCopy = (x) => JSON.parse(JSON.stringify(x));
const optionMarkup = (items, selected) => items.map(x => `<option value="${esc(x)}" ${selected === x ? 'selected' : ''}>${esc(x)}</option>`).join('');

function emptyStage(s) {return {rating:'',checks:s.checks.map(()=>false),notes:'',data:[]};}
function createEntry(strategy='swings') {
  const stamp=isoNow();
  return {id:makeId(),strategy,ticker:'',company:'',setup:'',status:'Researching',decision:'Undecided',thesis:'',invalidationReason:'',lesson:'',
    direction:'Long',timeframe:'Daily',entryPrice:'',targetPrice:'',stopPrice:'',exitPrice:'',capital:'',quantity:'',exitPremium:'',openedDate:'',closedDate:'',
    optionType:'Call',expiration:'',strike:'',premium:'',contracts:'',delta:'',ivRank:'',reviewDate:'',allocation:'',
    stages:Object.fromEntries(STAGES.map(s=>[s.key,emptyStage(s)])),logs:[],snapshots:[],createdAt:stamp,updatedAt:stamp};
}
function normalizeCore(raw) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) throw Error('Invalid analysis entry');
  const e=createEntry(Object.hasOwn(STRATEGIES,raw.strategy)?raw.strategy:'swings');
  e.id=plain(raw.id,128)||makeId();
  for(const k of ['ticker','company','setup','thesis','invalidationReason','lesson','entryPrice','targetPrice','stopPrice','exitPrice','capital','quantity','exitPremium','openedDate','closedDate','expiration','strike','premium','contracts','delta','ivRank','reviewDate','allocation']) e[k]=plain(raw[k]);
  e.status=STATUSES.includes(raw.status)?raw.status:'Researching';
  e.decision=DECISIONS.includes(raw.decision)?raw.decision:'Undecided';
  e.direction=['Long','Short'].includes(raw.direction)?raw.direction:'Long';
  e.timeframe=['4H','Daily','Weekly','Other'].includes(raw.timeframe)?raw.timeframe:'Daily';
  e.optionType=['Call','Put'].includes(raw.optionType)?raw.optionType:'Call';
  e.createdAt=validDate(raw.createdAt)?raw.createdAt:e.createdAt;
  e.updatedAt=validDate(raw.updatedAt)?raw.updatedAt:e.updatedAt;
  for(const s of STAGES){
    const a=raw.stages?.[s.key];
    if(!a || typeof a!=='object')continue;
    const st=e.stages[s.key];
    st.rating=[...RATINGS,'na'].includes(a.rating)?a.rating:'';
    st.notes=plain(a.notes,30000);
    st.checks=s.checks.map((_,i)=>a.checks?.[i]===true);
    st.data=Array.isArray(a.data)?a.data.slice(0,500).map(d=>({id:plain(d?.id,128)||makeId(),metric:plain(d?.metric,1000),value:plain(d?.value,2000),source:plain(d?.source,2500),recordedAt:validDate(d?.recordedAt)?d.recordedAt:isoNow()})):[];
  }
  return e;
}
function normalizeEntry(raw) {
  const e=normalizeCore(raw);
  e.logs=Array.isArray(raw.logs)?raw.logs.slice(0,5000).map(l=>({id:plain(l?.id,128)||makeId(),text:plain(l?.text,12000),at:validDate(l?.at)?l.at:isoNow()})):[];
  e.snapshots=Array.isArray(raw.snapshots)?raw.snapshots.slice(0,1000).flatMap(s=>{
    try{return [{id:plain(s?.id,128)||makeId(),at:validDate(s?.at)?s.at:isoNow(),data:normalizeCore(s?.data)}];}catch{return [];}
  }):[];
  return e;
}
function loadEntries(){
  try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return [];
    const parsed=JSON.parse(raw); if(!Array.isArray(parsed))throw Error('Unexpected journal format');
    return parsed.slice(0,5000).map(normalizeEntry);
  }catch(err){console.error('Stream Moves could not read local storage',err);return [];}
}
const app={entries:loadEntries(),strategy:'swings',selectedId:null,view:'journal',pending:null,snapshotId:null,toastTimer:null,storageError:false};
function blankConfluence(){
  const now=isoNow();
  return {id:makeId(),ticker:'',company:'',timeframe:'4H',expiry:'',setup:'',decision:'Wait',thesis:'',risk:'',reviewNotes:'',signals:Object.fromEntries(CONFLUENCE_SIGNALS.map(x=>[x.key,{side:'',value:'',source:'',notes:''}])),history:[],createdAt:now,updatedAt:now};
}
function normalizeConfluence(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid confluence entry');
  const e=blankConfluence();
  for(const k of ['ticker','company','expiry','setup','thesis','risk','reviewNotes']) e[k]=plain(raw[k], k==='ticker'?30:12000);
  e.id=plain(raw.id,128)||makeId();
  e.timeframe=['1H','4H','Daily','Weekly','Other'].includes(raw.timeframe)?raw.timeframe:'4H';
  e.decision=['Wait','Consider Call','Consider Put','Avoid'].includes(raw.decision)?raw.decision:'Wait';
  e.createdAt=validDate(raw.createdAt)?raw.createdAt:e.createdAt;
  e.updatedAt=validDate(raw.updatedAt)?raw.updatedAt:e.updatedAt;
  for(const def of CONFLUENCE_SIGNALS){
    const a=raw.signals?.[def.key];if(!a||typeof a!=='object')continue;
    e.signals[def.key]={side:CONFLUENCE_SIDES.includes(a.side)?a.side:'',value:plain(a.value,2000),source:plain(a.source,2500),notes:plain(a.notes,12000)};
  }
  e.history=Array.isArray(raw.history)?raw.history.slice(0,500).flatMap(h=>{
    if(!h||typeof h!=='object')return [];
    const sig=Object.fromEntries(CONFLUENCE_SIGNALS.map(d=>[d.key,{
      side:CONFLUENCE_SIDES.includes(h.signals?.[d.key]?.side)?h.signals[d.key].side:'',
      value:plain(h.signals?.[d.key]?.value,2000),
      source:plain(h.signals?.[d.key]?.source,2500),
      notes:plain(h.signals?.[d.key]?.notes,12000)
    }]));
    return [{id:plain(h.id,128)||makeId(),at:validDate(h.at)?h.at:isoNow(),ticker:plain(h.ticker,30),timeframe:plain(h.timeframe,30),decision:plain(h.decision,50),thesis:plain(h.thesis,12000),risk:plain(h.risk,12000),reviewNotes:plain(h.reviewNotes,12000),signals:sig}];
  }):[];
  return e;
}
function loadConfluences(){
  try {const raw=localStorage.getItem(CONFLUENCE_KEY);return raw?JSON.parse(raw).slice(0,5000).map(normalizeConfluence):[];}
  catch(err){console.error('Could not read confluence history',err);return [];}
}
const cf={entries:loadConfluences(),selectedId:null,active:false};


function persist(){
  if(app.pending){clearTimeout(app.pending);app.pending=null;}
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(app.entries));localStorage.setItem(CONFLUENCE_KEY,JSON.stringify(cf.entries));app.storageError=false;setSaveText('Saved in this browser');return true;}
  catch(err){console.error('Could not save journal',err);app.storageError=true;setSaveText('Save failed · export backup');showToast('Browser storage is unavailable or full. Export a backup of your work.',true);return false;}
}
function setSaveText(s){const el=$('saveStatus');el.innerHTML=`<span class="status-indicator"></span> ${esc(s)}`;}
function autosave(){
  const e=current();if(e)e.updatedAt=isoNow();
  setSaveText('Saving changes…');
  if(app.pending)clearTimeout(app.pending);
  app.pending=setTimeout(()=>{persist();refreshSummary();renderList();if(app.view==='history')renderHistory();},450);
}
function showToast(message,error=false){const el=$('toast');el.textContent=message;el.className=`toast visible${error?' error':''}`;clearTimeout(app.toastTimer);app.toastTimer=setTimeout(()=>el.classList.remove('visible'),3200);}
function current(){return app.entries.find(e=>e.id===app.selectedId&&e.strategy===app.strategy)||null;}
function metrics(e){
  let done=0,total=0,rated=0;
  for(const s of STAGES){const st=e.stages[s.key];if(st.rating==='na')continue;done+=st.checks.filter(Boolean).length;total+=st.checks.length;if(st.rating)rated++;}
  return {done,total,rated,pct:total?Math.round(done/total*100):0};
}
function refreshSummary(){
  for(const strategy of Object.keys(STRATEGIES))$('strategyTabs').querySelector(`[data-count="${strategy}"]`).textContent=app.entries.filter(e=>e.strategy===strategy).length;
  const items=app.entries.filter(e=>e.strategy===app.strategy);
  $('statEntries').textContent=items.length;
  $('statEvidence').textContent=items.reduce((a,e)=>a+metrics(e).done,0);
  $('statUpdates').textContent=items.reduce((a,e)=>a+e.logs.length+e.snapshots.length,0);
  const info=STRATEGIES[app.strategy];
  $('workspaceHeading').textContent=info.title;
  $('strategyEyebrow').textContent=info.eyebrow;
  $('workspaceDescription').textContent=info.desc;
}
function setStrategy(strategy){
  if(!Object.hasOwn(STRATEGIES,strategy))return;
  persist();cf.active=false;$('confluenceView').classList.add('hidden');$('journalView').classList.toggle('hidden',app.view!=='journal');$('historyView').classList.toggle('hidden',app.view!=='history');$('mainJournalHeader').classList.remove('hidden');$('statGrid').classList.remove('hidden');$('mainViewSwitch').classList.remove('hidden');$('confluenceNavButton').classList.remove('active');$('confluenceNavButton').setAttribute('aria-pressed','false');app.strategy=strategy;app.selectedId=app.entries.filter(e=>e.strategy===strategy).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]?.id??null;
  document.querySelectorAll('[data-strategy]').forEach(b=>{let active=b.dataset.strategy===strategy;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('entrySearch').value='';$('entryStatusFilter').value='all';
  refreshSummary();renderList();renderEditor();
}
function setView(view){
  if(!['journal','history'].includes(view))return;
  persist();app.view=view;
  document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('journalView').classList.toggle('hidden',cf.active||view!=='journal');
  $('historyView').classList.toggle('hidden',cf.active||view!=='history');
  if(view==='history')renderHistory();else{renderList();renderEditor();}
}
function newEntry(){
  persist();const e=createEntry(app.strategy);app.entries.unshift(e);app.selectedId=e.id;
  persist();setView('journal');refreshSummary();renderList();renderEditor();
  const input=$('editorPanel').querySelector('[data-field="ticker"]');if(input)input.focus();
  showToast('New analysis created. Your research saves automatically.');
}
function filteredItems(strategy,search,status){
  const q=search.trim().toLowerCase();return app.entries.filter(e=>(strategy==='all'||e.strategy===strategy)&&(status==='all'||e.status===status)&&(!q||[e.ticker,e.company,e.setup,e.thesis,e.lesson,...STAGES.flatMap(s=>[e.stages[s.key].notes,...e.stages[s.key].data.flatMap(d=>[d.metric,d.value])]),...e.logs.map(l=>l.text)].join(' ').toLowerCase().includes(q))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
function renderList(){
  const all=app.entries.filter(e=>e.strategy===app.strategy);
  const filtered=filteredItems(app.strategy,$('entrySearch').value,$('entryStatusFilter').value);
  $('sidebarCount').textContent=`${all.length} ${all.length===1?'analysis':'analyses'}`;
  const el=$('entryList');
  if(!filtered.length){el.innerHTML=`<div class="sidebar-empty">${all.length?'No matching analyses. Try another search.':'No saved analyses yet.<br>Start one to build your research history.'}</div>`;return;}
  el.innerHTML=filtered.map(e=>{const m=metrics(e);return `<button type="button" class="entry-card ${e.id===app.selectedId?'selected':''}" data-open-id="${esc(e.id)}" aria-current="${e.id===app.selectedId?'true':'false'}"><span class="entry-card-head"><strong class="ticker">${esc(e.ticker.trim().toUpperCase()||'UNTITLED')}</strong><span class="status-pill ${esc(e.status)}">${esc(e.status)}</span></span><span class="entry-company">${esc(e.company||e.setup||'New investment analysis')}</span><span class="entry-bottom"><span>${m.done}/${m.total} checks</span><span>${shortDate(e.updatedAt)}</span></span><span class="mini-progress"><div style="width:${m.pct}%"></div></span></button>`;}).join('');
}
function field(label,name,value,extra=''){
  return `<div class="field ${extra.includes('full')?'full':''}"><label for="field-${name}">${esc(label)}</label><input id="field-${name}" data-field="${name}" type="text" value="${esc(value)}" ${extra.includes('placeholder=')?extra.match(/placeholder="[^"]*"/)?.[0]||'':''} maxlength="12000" /></div>`;
}
function dateField(label,name,value){return `<div class="field"><label for="field-${name}">${esc(label)}</label><input id="field-${name}" data-field="${name}" type="date" value="${esc(value)}" /></div>`;}
function selectField(label,name,value,options){return `<div class="field"><label for="field-${name}">${esc(label)}</label><select id="field-${name}" data-field="${name}">${optionMarkup(options,value)}</select></div>`;}
function textArea(label,name,value,placeholder=''){
  return `<div class="field full"><label for="field-${name}">${esc(label)}</label><textarea data-field="${name}" id="field-${name}" placeholder="${esc(placeholder)}" rows="4">${esc(value)}</textarea></div>`;
}
function stageMarkup(e,s,i,open){
  const st=e.stages[s.key],checked=st.checks.filter(Boolean).length;
  const label=st.rating==='na'?'N/A':st.rating?(st.rating[0].toUpperCase()+st.rating.slice(1)):'Not assessed';
  const disabled=st.rating==='na';
  const ratings=[...RATINGS,...(s.key==='options'&&e.strategy==='long-term'?['na']:[])];
  return `<details class="stage-card" data-stage="${s.key}" ${open?'open':''}>
    <summary><span class="stage-index">0${i+1}</span><span class="stage-title-wrap"><strong>${esc(s.name)}</strong><small>${checked}/${s.checks.length} evidence prompts checked</small></span><span class="stage-side"><span class="stage-tag ${esc(st.rating)}">${esc(label)}</span><span class="stage-arrow" aria-hidden="true">⌄</span></span></summary>
    <div class="stage-body"><p class="stage-body-intro">${esc(s.description)}</p>
      <div class="assessment-line"><span class="assessment-label">What does your research suggest?</span><div class="assessment-buttons" role="group" aria-label="${esc(s.name)} assessment">${ratings.map(r=>`<button type="button" class="assessment-btn ${r} ${st.rating===r?'selected':''}" data-rate-stage="${s.key}" data-rate="${r}" aria-pressed="${st.rating===r}">${r==='na'?'Not applicable':r[0].toUpperCase()+r.slice(1)}</button>`).join('')}</div></div>
      ${disabled?`<p class="hint-text">Marked not applicable. The checklist stays available if you change the assessment.</p>`:''}
      <p class="checklist-heading">Evidence checklist</p><div class="evidence-checks">${s.checks.map((c,j)=>`<label class="evidence-check ${st.checks[j]?'checked':''}"><input type="checkbox" data-check-stage="${s.key}" data-check-index="${j}" ${st.checks[j]?'checked':''}/><span>${esc(c)}</span></label>`).join('')}</div>
      <div class="data-section"><div class="data-header"><span class="datapoints-heading">Research data &amp; sources</span><button type="button" class="btn btn-secondary small-btn" data-add-data="${s.key}">+ Add data point</button></div>
      ${st.data.length?st.data.map(d=>`<div class="data-row" data-data-id="${esc(d.id)}" data-data-stage="${s.key}"><input aria-label="Metric or evidence name" data-data-field="metric" type="text" value="${esc(d.metric)}" placeholder="Metric (e.g., CPI)" maxlength="1000"/><input aria-label="Observed value or finding" data-data-field="value" type="text" value="${esc(d.value)}" placeholder="Value / finding" maxlength="2000"/><input aria-label="Source URL" class="source-input" data-data-field="source" type="url" value="${esc(d.source)}" placeholder="https://source…" maxlength="2500"/><button class="remove-row" type="button" data-remove-data="${esc(d.id)}" data-remove-stage="${s.key}" aria-label="Remove this data point">×</button></div>${safeUrl(d.source)?`<div class="hint-text"><a href="${esc(safeUrl(d.source))}" target="_blank" rel="noopener noreferrer">Open source ↗</a> · added ${shortDate(d.recordedAt)}</div>`:''}`).join(''):`<div class="no-data">Add the exact values, findings, or source links you discover during research.</div>`}
      </div><div class="research-notes"><label for="notes-${s.key}">Analysis / conflicting evidence</label><textarea class="research-textarea" id="notes-${s.key}" data-notes-stage="${s.key}" rows="4" placeholder="What did you find? Why does it matter? What contradicts your thesis?">${esc(st.notes)}</textarea></div>
    </div></details>`;
}
function snapshotCore(e){const raw=deepCopy(e);delete raw.logs;delete raw.snapshots;return raw;}
function riskReward(e){const en=Number(e.entryPrice),t=Number(e.targetPrice),stop=Number(e.stopPrice);if(!e.entryPrice||!e.targetPrice||!e.stopPrice||![en,t,stop].every(Number.isFinite)||en<=0)return 'Add entry, target and invalidation prices to assess risk/reward.';
  const reward=Math.abs(t-en),risk=Math.abs(en-stop),long=e.strategy==='leaps'?e.optionType!=='Put':e.direction!=='Short';
  if(risk===0)return 'Invalidation cannot equal entry price.';
  if((long&&(t<=en||stop>=en))||(!long&&(t>=en||stop<=en)))return 'Check direction: target and invalidation must be on opposite sides of entry.';
  return `Planned reward/risk: ${(reward/risk).toFixed(2)} : 1 (price levels only; ignores fees and options pricing).`;
}
function realizedOutcome(e){
  if(e.status!=='Closed')return null;
  if(e.strategy==='leaps'){
    const buy=Number(e.premium),sell=Number(e.exitPremium),contracts=Number(e.contracts);
    if(!e.premium||!e.exitPremium||!Number.isFinite(buy)||!Number.isFinite(sell)||buy<=0)return null;
    const pct=(sell-buy)/buy*100;
    return {pct, dollars:e.contracts&&Number.isFinite(contracts)&&contracts>0?(sell-buy)*contracts*100:null,kind:'Option premium change'};
  }
  const buy=Number(e.entryPrice),sell=Number(e.exitPrice),qty=Number(e.quantity);
  if(!e.entryPrice||!e.exitPrice||![buy,sell].every(Number.isFinite)||buy<=0)return null;
  const sign=e.strategy==='swings'&&e.direction==='Short'?-1:1;
  return {pct:((sell-buy)/buy)*sign*100,dollars:e.quantity&&Number.isFinite(qty)&&qty>0?(sell-buy)*sign*qty:null,kind:'Position price change'};
}
function outcomeText(e){
  const outcome=realizedOutcome(e);
  if(!outcome)return 'Set status to Closed and record entry and exit prices (or option premiums) to calculate a simple realized return.';
  const pct=`${outcome.pct>=0?'+':''}${outcome.pct.toFixed(2)}%`;
  const dollars=outcome.dollars===null?'':` · ${outcome.dollars>=0?'+':'−'}$${Math.abs(outcome.dollars).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} (estimated)`;
  return `${outcome.kind}: ${pct}${dollars}. Excludes trading fees, taxes, slippage, and corporate actions.`;
}
function extraFields(e){
  if(e.strategy==='swings')return `<div class="form-grid">${selectField('Trade direction','direction',e.direction,['Long','Short'])}${selectField('Chart timeframe','timeframe',e.timeframe,['4H','Daily','Weekly','Other'])}</div>`;
  if(e.strategy==='leaps')return `<div class="form-grid three">${selectField('Option type','optionType',e.optionType,['Call','Put'])}${dateField('Expiration date','expiration',e.expiration)}${field('Strike price','strike',e.strike)}${field('Entry premium per share','premium',e.premium)}${field('Exit premium per share','exitPremium',e.exitPremium)}${field('Number of contracts','contracts',e.contracts)}${field('Delta','delta',e.delta)}${field('IV rank (%)','ivRank',e.ivRank)}</div><p class="hint-text">Record the actual contract, liquidity, and other Greeks in step 5. Options pricing cannot be inferred from the underlying share price alone.</p>`;
  return `<div class="form-grid">${field('Target portfolio allocation (%)','allocation',e.allocation)}${dateField('Next thesis review','reviewDate',e.reviewDate)}</div>`;
}
function renderEditor(openOverride){
  const el=$('editorPanel');const e=current();
  if(!e){el.innerHTML='<div class="blank-editor"><div class="blank-icon">↗</div><h3>Start with a thesis.</h3><p class="muted">Create an analysis, collect evidence as you research, and come back to see how your thinking evolved.</p><button type="button" class="btn btn-primary" id="emptyNewButton">+ New analysis</button></div>';return;}
  const opened=openOverride ?? new Set([STAGES[0].key]);
  const m=metrics(e);
  const snapshots=[...e.snapshots].sort((a,b)=>b.at.localeCompare(a.at));
  const logs=[...e.logs].sort((a,b)=>b.at.localeCompare(a.at));
  el.innerHTML=`
    <div class="editor-top"><div><p class="section-overline">INVESTMENT RESEARCH / ${esc(STRATEGIES[e.strategy].name.toUpperCase())}</p><h3>${esc(e.ticker.trim().toUpperCase()||'Untitled analysis')}${e.company?` <span class="muted">· ${esc(e.company)}</span>`:''}</h3><div class="editor-heading-meta"><span class="status-pill ${esc(e.status)}">${esc(e.status)}</span><span class="muted small">Updated ${dateLabel(e.updatedAt)}</span></div></div><div class="editor-actions"><button type="button" class="btn btn-secondary small-btn" id="snapshotButton">Save snapshot</button><button type="button" class="btn btn-danger small-btn" id="deleteButton">Delete</button></div></div>
    <section class="section-block"><div class="section-header"><h4>01 · Research idea</h4><span class="section-tag">AUTOSAVED</span></div><div class="form-grid">${field('Ticker / symbol','ticker',e.ticker)}${field('Company / asset','company',e.company)}${field('Idea / setup name','setup',e.setup)}${selectField('Research status','status',e.status,STATUSES)}</div></section>
    <section class="section-block"><div class="section-header"><div><h4>02 · Five-step investment framework</h4><p>Check your evidence, enter the data, and assess the weight of your findings.</p></div></div>
      <div class="progress-section"><div class="progress-top"><span>Research checklist progress</span><strong id="progressPercent">${m.pct}%</strong></div><div class="progress-line"><div style="width:${m.pct}%" id="progressBar"></div></div><div class="progress-note" id="progressNote">${m.done} of ${m.total} prompts checked · ${m.rated} of ${e.stages.options.rating==='na'?'4':'5'} stages assessed. Completion is not a buy signal.</div></div>
      <div class="stage-list">${STAGES.map((s,i)=>stageMarkup(e,s,i,opened.has(s.key))).join('')}</div></section>
    <section class="section-block"><div class="section-header"><div><h4>03 · Thesis &amp; decision</h4><p>Separate your analysis from your intended action.</p></div></div>
      <div class="form-grid">${textArea('My investment thesis','thesis',e.thesis,'Why this company, why this direction, and why now?')}${textArea('What would invalidate my thesis?','invalidationReason',e.invalidationReason,'Specify what would make you change your mind.')}${selectField('Current decision','decision',e.decision,DECISIONS)}</div>
      <div class="form-grid three" style="margin-top:12px">${field('Entry / purchase price','entryPrice',e.entryPrice)}${field('Target price','targetPrice',e.targetPrice)}${field('Invalidation / stop price','stopPrice',e.stopPrice)}${field('Capital at risk / allocated','capital',e.capital)}${e.strategy==='leaps'?'':field('Number of shares / units','quantity',e.quantity)}${dateField('Position opened','openedDate',e.openedDate)}${dateField('Position closed','closedDate',e.closedDate)}${field('Exit / sale price','exitPrice',e.exitPrice)}</div><p class="outcome-note" id="riskRewardText">${esc(riskReward(e))}</p><p class="outcome-note" id="realizedText">${esc(outcomeText(e))}</p></section>
    <section class="section-block"><div class="section-header"><h4>04 · ${e.strategy==='leaps'?'LEAPS contract details':e.strategy==='swings'?'Swing setup':'Long-term portfolio plan'}</h4></div>${extraFields(e)}</section>
    <section class="section-block"><div class="section-header"><h4>05 · Lessons &amp; follow-up</h4></div><div class="form-grid">${textArea('What did I learn / what would I do differently?','lesson',e.lesson,'What was right, wrong, missed, or worth repeating?')}</div></section>
    <section class="section-block"><div class="section-header"><div><h4>06 · Timestamped research log</h4><p>Add updates as new data appears. These notes are kept in order.</p></div><span class="section-tag">${e.logs.length} UPDATES</span></div>
      <div class="journal-note-form"><label class="visually-hidden" for="journalUpdate">Research update</label><textarea id="journalUpdate" placeholder="Example: Nov 18 — CPI softened, but sector breadth remains weak. Keeping thesis neutral."></textarea><div class="note-submit"><span class="hint-text">Updates are permanent within this entry until you delete the entire analysis.</span><button class="btn btn-secondary small-btn" type="button" id="addLogButton">+ Add dated update</button></div></div>
      <div class="log-list">${logs.length?logs.map(l=>`<div class="note-item"><div class="note-top"><strong class="section-overline">RESEARCH UPDATE</strong><time>${dateLabel(l.at)}</time></div><p>${esc(l.text)}</p></div>`).join(''):'<p class="empty-text">No dated research updates yet.</p>'}</div>
    </section>
    <section class="section-block"><div class="section-header"><div><h4>07 · Saved analysis snapshots</h4><p>Save a version whenever your thesis or decision changes significantly.</p></div><span class="section-tag">${e.snapshots.length} VERSIONS</span></div>
      ${snapshots.length?snapshots.map((s,i)=>`<div class="snapshot-item"><div><strong>Version ${e.snapshots.length-i} · ${esc(s.data.decision)}</strong><small>Saved ${dateLabel(s.at)} · ${esc(s.data.ticker||'Untitled')}</small></div><button type="button" class="btn btn-secondary small-btn" data-view-snapshot="${esc(s.id)}">Review version</button></div>`).join(''):'<p class="empty-text">No snapshots yet. Use “Save snapshot” to preserve a point-in-time version of all research fields.</p>'}
    </section>`;
}
function captureOpen(){return new Set([...$('editorPanel').querySelectorAll('details[data-stage][open]')].map(x=>x.dataset.stage));}
function rerenderEditor(){const open=captureOpen();renderEditor(open);}
function renderHistory(){
  const filtered=filteredItems($('historyScope').value,$('historySearch').value,$('historyStatus').value),el=$('historyResults');
  if(!filtered.length){el.innerHTML='<div class="empty-history"><h4>No analyses found</h4><p>Save your first research idea or adjust the history filters.</p></div>';return;}
  el.innerHTML=filtered.map(e=>{const m=metrics(e);return `<div class="history-item"><div><h4>${esc(e.ticker.trim().toUpperCase()||'UNTITLED')} <span class="muted">${esc(e.company)}</span></h4><p>${esc(e.setup||e.thesis.slice(0,150)||'No thesis recorded yet.')}</p><div class="history-facts"><span class="history-fact">${esc(STRATEGIES[e.strategy].name)}</span><span class="status-pill ${esc(e.status)}">${esc(e.status)}</span><span class="history-fact">${esc(e.decision)}</span><span class="history-fact">${m.done}/${m.total} checked</span><span class="history-fact">${e.logs.length} updates · ${e.snapshots.length} snapshots</span>${realizedOutcome(e)?`<span class="history-fact">Return ${realizedOutcome(e).pct>=0?'+':''}${realizedOutcome(e).pct.toFixed(2)}%</span>`:''}</div></div><div class="history-actions"><span class="muted small">${shortDate(e.updatedAt)}</span><button type="button" class="btn btn-secondary small-btn" data-history-open="${esc(e.id)}">Open analysis</button></div></div>`;}).join('');
}
function savedSnapshot(){
  const e=current();if(!e)return;
  e.snapshots.unshift({id:makeId(),at:isoNow(),data:snapshotCore(e)});
  e.updatedAt=isoNow();persist();refreshSummary();renderList();rerenderEditor();showToast('Snapshot saved. This research version is now in your history.');
}
function addLog(){
  const e=current(),input=$('journalUpdate');if(!e||!input)return;
  const note=input.value.trim();if(!note){input.focus();showToast('Write an update before adding it.');return;}
  e.logs.unshift({id:makeId(),at:isoNow(),text:note.slice(0,12000)});e.updatedAt=isoNow();persist();refreshSummary();renderList();rerenderEditor();showToast('Dated research update added.');
}
function showSnapshot(id){
  const e=current(),s=e?.snapshots.find(x=>x.id===id);if(!s)return;app.snapshotId=id;
  const x=s.data;
  $('snapshotModalTitle').textContent=`${x.ticker?.toUpperCase()||'Untitled'} · ${dateLabel(s.at)}`;
  $('snapshotContent').innerHTML=`<div class="snapshot-section"><h4>Decision &amp; thesis</h4><p>Status: ${esc(x.status)} · Decision: ${esc(x.decision)}</p><p>${esc(x.thesis||'No thesis recorded')}</p><p>Invalidation: ${esc(x.invalidationReason||'Not recorded')}</p></div>${STAGES.map(st=>{const v=x.stages[st.key];const observations=v.data.map(d=>`${d.metric}: ${d.value}${d.source?` (${d.source})`:''}`).join('\n');return `<div class="snapshot-section"><h4>${esc(st.name)} · ${esc(v.rating||'Not assessed')} · ${v.checks.filter(Boolean).length}/${st.checks.length} checked</h4><p>${esc(v.notes||'No analysis notes')}</p>${observations?`<p>Data points:\n${esc(observations)}</p>`:''}</div>`;}).join('')}<div class="snapshot-section"><h4>Trade / contract record</h4><p>Entry: ${esc(x.entryPrice||'—')} · Target: ${esc(x.targetPrice||'—')} · Invalidation: ${esc(x.stopPrice||'—')}</p><p>Exit: ${esc(x.exitPrice||'—')} · Capital: ${esc(x.capital||'—')} · Shares: ${esc(x.quantity||'—')}</p>${x.strategy==='leaps'?`<p>${esc(x.optionType)} · Strike ${esc(x.strike||'—')} · Expiration ${esc(x.expiration||'—')} · Entry premium ${esc(x.premium||'—')} · Exit premium ${esc(x.exitPremium||'—')}</p>`:''}<p>Lessons: ${esc(x.lesson||'Not recorded')}</p></div>`;
  $('snapshotDialog').showModal();
}
function restoreSnapshot(){
  const e=current(),s=e?.snapshots.find(x=>x.id===app.snapshotId);if(!e||!s)return;
  if(!confirm('Restore this saved version? Your current analysis will first be saved as a snapshot, and all dated research updates will be kept.'))return;
  const safety={id:makeId(),at:isoNow(),data:snapshotCore(e)};
  const index=app.entries.findIndex(x=>x.id===e.id);
  const newEntry=normalizeCore(s.data);newEntry.id=e.id;newEntry.strategy=e.strategy;newEntry.logs=e.logs;newEntry.snapshots=[safety,...e.snapshots];newEntry.createdAt=e.createdAt;newEntry.updatedAt=isoNow();app.entries[index]=newEntry;
  persist();$('snapshotDialog').close();app.snapshotId=null;refreshSummary();renderList();renderEditor();showToast('Version restored. Previous working version also saved.');
}
function deleteEntry(){
  const e=current();if(!e)return;
  if(!confirm(`Permanently delete ${e.ticker||'this untitled analysis'} and all of its research notes and snapshots from this browser? Export a backup first if needed.`))return;
  app.entries=app.entries.filter(x=>x.id!==e.id);app.selectedId=app.entries.find(x=>x.strategy===app.strategy)?.id||null;
  persist();refreshSummary();renderList();renderEditor();showToast('Analysis deleted.');
}
function updateField(target){
  const e=current();if(!e)return;
  const key=target.dataset.field;
  if(key && Object.hasOwn(e,key)){
    e[key]=target.value;autosave();
    if(['entryPrice','targetPrice','stopPrice','direction','optionType'].includes(key))$('riskRewardText').textContent=riskReward(e);
    if(['entryPrice','exitPrice','quantity','premium','exitPremium','contracts','status','direction'].includes(key))$('realizedText').textContent=outcomeText(e);
    if(['ticker','company','status'].includes(key)){
      const title=document.querySelector('#editorPanel .editor-top h3');
      if(title)title.innerHTML=`${esc(e.ticker.trim().toUpperCase()||'Untitled analysis')}${e.company?` <span class="muted">· ${esc(e.company)}</span>`:''}`;
      const pill=document.querySelector('#editorPanel .editor-top .status-pill');
      if(pill){pill.className=`status-pill ${e.status}`;pill.textContent=e.status;}
      renderList();
    }
    return;
  }
  const stage=target.dataset.notesStage;
  if(stage && e.stages[stage]){e.stages[stage].notes=target.value;autosave();return;}
  const row=target.closest('[data-data-id]');
  if(row&&target.dataset.dataField){const s=e.stages[row.dataset.dataStage];const d=s?.data.find(x=>x.id===row.dataset.dataId);if(d&&Object.hasOwn(d,target.dataset.dataField)){d[target.dataset.dataField]=target.value;autosave();}}
}
function addData(stageKey){
  const e=current();if(!e?.stages[stageKey])return;
  e.stages[stageKey].data.push({id:makeId(),metric:'',value:'',source:'',recordedAt:isoNow()});autosave();rerenderEditor();
  const last=[...$('editorPanel').querySelectorAll(`[data-data-stage="${stageKey}"] input[data-data-field="metric"]`)].at(-1);last?.focus();
}
function removeData(stageKey,id){const e=current();if(!e?.stages[stageKey])return;e.stages[stageKey].data=e.stages[stageKey].data.filter(x=>x.id!==id);autosave();rerenderEditor();}
function exportBackup(){
  persist();const payload={format:FORMAT,version:1,exportedAt:isoNow(),entries:app.entries,confluences:cf.entries};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`stream-moves-backup-${today()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);showToast('Backup downloaded. Keep this file somewhere safe.');
}
async function importBackup(file){
  if(!file)return;
  if(file.size>12*1024*1024){showToast('Backup is too large (limit 12 MB).',true);return;}
  try{
    const json=JSON.parse(await file.text());
    if(json?.format!==FORMAT||json.version!==1||!Array.isArray(json.entries))throw Error('Not a Stream Moves backup.');
    if(json.entries.length>5000)throw Error('This backup contains too many analyses.');
    const loaded=json.entries.map(normalizeEntry),loadedCf=Array.isArray(json.confluences)?json.confluences.slice(0,5000).map(normalizeConfluence):cf.entries,ids=new Set();
    for(const e of loaded){if(ids.has(e.id))e.id=makeId();ids.add(e.id);}
    if(!confirm(`Import ${loaded.length} investment analyses and ${loadedCf.length} confluence setups? This replaces the current saved records in this browser. Export your existing backup first if needed.`))return;
    const old=app.entries,oldCf=cf.entries;app.entries=loaded;cf.entries=loadedCf;
    if(!persist()){app.entries=old;cf.entries=oldCf;persist();throw Error('Import could not be saved to browser storage.');}
    setStrategy(app.strategy);if(app.view==='history')renderHistory();refreshConfluenceSidebar();showToast(`Imported ${loaded.length} investment analyses and ${loadedCf.length} confluence setups.`);
  }catch(err){console.error(err);showToast(`Import failed: ${err.message}`,true);}
}

function confluenceScores(signals){
  const sides=CONFLUENCE_SIGNALS.map(d=>signals[d.key]?.side||'');
  const call=sides.filter(x=>x==='call').length,put=sides.filter(x=>x==='put').length,mixed=sides.filter(x=>x==='mixed').length;
  const result=call>=4&&call-put>=2?'call':put>=4&&put-call>=2?'put':'wait';
  return {call,put,mixed,assessed:call+put+mixed,result};
}
function cfCurrent(){return cf.entries.find(x=>x.id===cf.selectedId)||null;}
function confluenceVerdict(result){return result==='call'?'BULLISH CALL CONFLUENCE':result==='put'?'BEARISH PUT CONFLUENCE':'WAIT · NO CLEAR CONFLUENCE';}
function showConfluence(){
  persist();cf.active=true;
  document.querySelectorAll('[data-strategy]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});
  $('confluenceNavButton').classList.add('active');$('confluenceNavButton').setAttribute('aria-pressed','true');
  for(const id of ['mainJournalHeader','statGrid','mainViewSwitch','journalView','historyView'])$(id).classList.add('hidden');
  $('confluenceView').classList.remove('hidden');
  cf.selectedId=cf.entries.find(x=>x.id===cf.selectedId)?.id||cf.entries.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]?.id||null;
  refreshConfluenceSidebar();renderConfluenceEditor();
}
function newConfluence(){
  persist();const e=blankConfluence();cf.entries.unshift(e);cf.selectedId=e.id;
  persist();refreshConfluenceSidebar();renderConfluenceEditor();
  $('confluenceEditor').querySelector('[data-cf-entry="ticker"]')?.focus();
  showToast('New confluence assessment added and saved in your browser.');
}
function refreshConfluenceSidebar(){
  $('confluenceTotal').textContent=cf.entries.length;
  $('confluenceTabCount').textContent=cf.entries.length;
  $('confluenceBullCount').textContent=cf.entries.filter(x=>confluenceScores(x.signals).result==='call').length;
  $('confluenceBearCount').textContent=cf.entries.filter(x=>confluenceScores(x.signals).result==='put').length;
  $('confluenceSidebarCount').textContent=`${cf.entries.length} ${cf.entries.length===1?'setup':'setups'}`;
  const search=$('confluenceSearch').value.trim().toLowerCase();
  const entries=[...cf.entries].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).filter(x=>!search||[x.ticker,x.company,x.setup,x.thesis,x.reviewNotes].join(' ').toLowerCase().includes(search));
  $('confluenceList').innerHTML=entries.length?entries.map(x=>{
    const s=confluenceScores(x.signals);
    return `<button class="entry-card ${cf.selectedId===x.id?'selected':''}" data-cf-open="${esc(x.id)}" type="button"><span class="entry-card-head"><strong class="ticker">${esc(x.ticker.toUpperCase()||'UNTITLED')}</strong><span class="cf-mini-pill ${s.result}">${s.result==='call'?'CALL':s.result==='put'?'PUT':'WAIT'}</span></span><span class="entry-company">${esc(x.company||x.setup||'Options confluence research')}</span><span class="entry-bottom"><span>Calls ${s.call}/6 · Puts ${s.put}/6</span><span>${shortDate(x.updatedAt)}</span></span></button>`;
  }).join(''):`<div class="sidebar-empty">${cf.entries.length?'No matches. Try a different ticker.':'No confluence assessments yet. Select “New confluence” to begin.'}</div>`;
}
function confluenceSourceLinks(def,e){
  const linkHtml=def.links.map(([label,url])=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`).join('');
  const t=e.ticker.trim().toUpperCase();
  const symbol=/^[A-Z0-9.^-]{1,16}$/.test(t)?t:'';
  const tickerLink=symbol?`<a href="https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/options/" target="_blank" rel="noopener noreferrer">${esc(symbol)} option chain ↗</a>`:'';
  const own=safeUrl(e.signals[def.key].source);
  return `<div class="cf-source-links">${tickerLink}${linkHtml}${own?`<a class="cf-your-source" href="${esc(own)}" target="_blank" rel="noopener noreferrer">Your saved source ↗</a>`:''}</div>`;
}
function confluenceSignalMarkup(def,e,i){
  const data=e.signals[def.key],side=data.side;
  return `<article class="cf-signal">
    <div class="cf-signal-title"><span class="cf-signal-number">0${i+1}</span><div><h4>${esc(def.name)}</h4><p>${esc(def.hint)}</p></div><span class="cf-signal-state ${esc(side||'none')}">${side==='call'?'CALL ✓':side==='put'?'PUT ✓':side==='mixed'?'MIXED':'NOT CHECKED'}</span></div>
    <div class="cf-signal-compare"><div class="cf-side cf-side-call"><strong>CALLS · BULLISH</strong><p>${esc(def.call)}</p></div><div class="cf-side cf-side-put"><strong>PUTS · BEARISH</strong><p>${esc(def.put)}</p></div></div>
    <div class="cf-controls" role="group" aria-label="${esc(def.name)} confluence direction">
      ${[['call','✓ Supports calls'],['put','✓ Supports puts'],['mixed','Mixed / unclear'],['','Not checked']].map(([v,label])=>`<button type="button" data-cf-side-key="${def.key}" data-cf-side="${v}" class="cf-choice ${v||'none'} ${side===v?'selected':''}" aria-pressed="${side===v}">${esc(label)}</button>`).join('')}
    </div>
    <div class="cf-record"><label>Observed value / evidence<input type="text" data-cf-signal="${def.key}" data-cf-signal-field="value" value="${esc(data.value)}" placeholder="e.g. call OI 30K → 49K; 4H BOS above resistance" maxlength="2000"/></label><label>Source URL<input type="url" data-cf-signal="${def.key}" data-cf-signal-field="source" value="${esc(data.source)}" placeholder="Paste exact research link" maxlength="2500"/></label><label class="cf-record-notes">My interpretation / conflicting data<textarea data-cf-signal="${def.key}" data-cf-signal-field="notes" rows="2" placeholder="Why does this confirm the direction? What could invalidate it?">${esc(data.notes)}</textarea></label></div>
    ${confluenceSourceLinks(def,e)}
  </article>`;
}
function renderConfluenceEditor(){
  const panel=$('confluenceEditor'),e=cfCurrent();
  if(!e){panel.innerHTML='<div class="blank-editor"><div class="blank-icon">⇄</div><h3>Build your options confluence.</h3><p class="muted">Use the six signals to evaluate whether a call, a put, or no trade has stronger support. All inputs are manual.</p><button class="btn btn-primary" type="button" id="emptyConfluenceButton">+ New confluence assessment</button></div>';return;}
  const s=confluenceScores(e.signals);const pctCall=(s.call/6*100).toFixed(0),pctPut=(s.put/6*100).toFixed(0);
  panel.innerHTML=`
    <div class="editor-top"><div><p class="section-overline">OPTIONS FLOW / PRICE STRUCTURE</p><h3>${esc(e.ticker.toUpperCase()||'Untitled confluence')}${e.company?` <span class="muted">· ${esc(e.company)}</span>`:''}</h3><p class="muted small">Last edited ${dateLabel(e.updatedAt)} · Autosaved in this browser</p></div><div class="editor-actions"><button type="button" class="btn btn-secondary small-btn" id="saveConfluenceAssessment">Save dated assessment</button><button type="button" class="btn btn-danger small-btn" id="deleteConfluenceEntry">Delete</button></div></div>
    <section class="section-block"><div class="section-header"><h4>01 · Contract / market setup</h4><span class="section-tag">RESEARCH</span></div>
    <div class="form-grid three"><div class="field"><label for="cf-ticker">Ticker / symbol</label><input id="cf-ticker" data-cf-entry="ticker" value="${esc(e.ticker)}" maxlength="30" placeholder="NDX, SPX, GOOGL..."/></div><div class="field"><label>Company / asset</label><input data-cf-entry="company" value="${esc(e.company)}" maxlength="12000" placeholder="Optional"/></div><div class="field"><label>Chart timeframe</label><select data-cf-entry="timeframe">${optionMarkup(['1H','4H','Daily','Weekly','Other'],e.timeframe)}</select></div><div class="field"><label>Expiration being reviewed</label><input type="date" data-cf-entry="expiry" value="${esc(e.expiry)}"/></div><div class="field full"><label>Setup / scenario</label><input data-cf-entry="setup" value="${esc(e.setup)}" placeholder="Liquidity sweep, bullish break, bearish continuation..." maxlength="12000"/></div></div>
    </section>
    <section class="section-block"><div class="section-header"><div><h4>02 · Calls vs puts confluence score</h4><p>Choose the side supported by each signal, then record the observed data below.</p></div></div>
      <div class="cf-score-grid"><div class="cf-score cf-score-call"><span>CALLS · BULLISH</span><strong>${s.call}<small>/ 6</small></strong><div class="cf-meter"><div style="width:${pctCall}%"></div></div></div><div class="cf-score-center ${s.result}"><span>Current assessment</span><strong>${confluenceVerdict(s.result)}</strong><small>${s.assessed}/6 reviewed · ${s.mixed} mixed</small></div><div class="cf-score cf-score-put"><span>PUTS · BEARISH</span><strong>${s.put}<small>/ 6</small></strong><div class="cf-meter"><div style="width:${pctPut}%"></div></div></div></div>
      <p class="cf-rule">Alignment rule: at least <strong>4 of 6</strong> signals on one side and a lead of <strong>2 or more</strong>. Otherwise, the result is <strong>Wait</strong>. This is a research heuristic—not a trading recommendation or prediction.</p>
    </section>
    <section class="section-block"><div class="section-header"><div><h4>03 · Six confirmation signals</h4><p>Use the links to research each signal. Choose its direction only when you have supporting evidence.</p></div><span class="section-tag">${s.assessed}/6 REVIEWED</span></div>${CONFLUENCE_SIGNALS.map((x,i)=>confluenceSignalMarkup(x,e,i)).join('')}
      <p class="outcome-note">Caution: open interest reports outstanding positions, not necessarily purchases. High IV can reflect uncertainty in either direction. A call or put print may be part of a spread or hedge. Consider order side, price context, volume and event risk together.</p>
    </section>
    <section class="section-block"><div class="section-header"><h4>04 · My decision &amp; invalidation</h4></div><div class="form-grid"><div class="field full"><label>Overall thesis / summary</label><textarea rows="4" data-cf-entry="thesis" placeholder="What do the six signals tell me? What is missing?">${esc(e.thesis)}</textarea></div><div class="field"><label>My action</label><select data-cf-entry="decision">${optionMarkup(['Wait','Consider Call','Consider Put','Avoid'],e.decision)}</select></div><div class="field full"><label>What could invalidate this idea?</label><textarea data-cf-entry="risk" rows="3" placeholder="Price level, options flow reversal, invalidation conditions...">${esc(e.risk)}</textarea></div><div class="field full"><label>Review notes / next check</label><textarea data-cf-entry="reviewNotes" rows="3" placeholder="What needs to be verified next?">${esc(e.reviewNotes)}</textarea></div></div></section>
    <section class="section-block"><div class="section-header"><div><h4>05 · Dated confluence assessments</h4><p>Save a snapshot when your research changes; past assessments remain available below.</p></div><button class="btn btn-secondary small-btn" type="button" data-save-cf-snapshot>+ Save assessment</button></div>
      ${e.history.length?[...e.history].sort((a,b)=>b.at.localeCompare(a.at)).map((h,i)=>{const o=confluenceScores(h.signals);return `<details class="cf-history-item"><summary><div><strong>${dateLabel(h.at)} · ${esc(confluenceVerdict(o.result))}</strong><small>Calls ${o.call}/6 · Puts ${o.put}/6 · ${esc(h.decision||'Wait')}</small></div><span aria-hidden="true">⌄</span></summary><div class="cf-history-body"><p><strong>Thesis:</strong> ${esc(h.thesis||'Not recorded')}</p><p><strong>Invalidation:</strong> ${esc(h.risk||'Not recorded')}</p>${CONFLUENCE_SIGNALS.map(d=>{const v=h.signals[d.key];return `<div class="cf-history-signal"><strong>${esc(d.name)} — ${v.side==='call'?'Calls':v.side==='put'?'Puts':v.side==='mixed'?'Mixed':'Not checked'}</strong><p>${esc(v.value||'No observed value')} ${v.notes?`· ${esc(v.notes)}`:''}</p>${safeUrl(v.source)?`<a target="_blank" rel="noopener noreferrer" href="${esc(safeUrl(v.source))}">Saved source ↗</a>`:''}</div>`;}).join('')}</div></details>`;}).join(''):'<p class="empty-text">No dated assessments saved yet. Current changes are autosaved, but snapshots let you review how your analysis evolved.</p>'}
    </section>`;
}
function scheduleConfluenceSave(){
  const e=cfCurrent();if(!e)return;e.updatedAt=isoNow();setSaveText('Saving changes…');
  if(app.pending)clearTimeout(app.pending);
  app.pending=setTimeout(()=>{persist();refreshConfluenceSidebar();},450);
}
function saveConfluenceAssessment(){
  const e=cfCurrent();if(!e)return;
  e.history.unshift({id:makeId(),at:isoNow(),ticker:e.ticker,timeframe:e.timeframe,decision:e.decision,thesis:e.thesis,risk:e.risk,reviewNotes:e.reviewNotes,signals:deepCopy(e.signals)});
  e.updatedAt=isoNow();persist();refreshConfluenceSidebar();renderConfluenceEditor();showToast('Dated confluence assessment saved to history.');
}
function deleteConfluence(){
  const e=cfCurrent();if(!e)return;
  if(!confirm(`Permanently delete ${e.ticker||'this confluence setup'} and its dated history from this browser? Export a backup first if you need one.`))return;
  cf.entries=cf.entries.filter(x=>x.id!==e.id);cf.selectedId=cf.entries[0]?.id||null;
  persist();refreshConfluenceSidebar();renderConfluenceEditor();showToast('Confluence assessment deleted.');
}
function setupConfluenceEvents(){
  $('confluenceNavButton').addEventListener('click',showConfluence);
  $('newConfluenceButton').addEventListener('click',newConfluence);
  $('confluenceSidebarAdd').addEventListener('click',newConfluence);
  $('confluenceSearch').addEventListener('input',refreshConfluenceSidebar);
  $('confluenceList').addEventListener('click',ev=>{const b=ev.target.closest('[data-cf-open]');if(!b)return;persist();cf.selectedId=b.dataset.cfOpen;refreshConfluenceSidebar();renderConfluenceEditor();});
  const panel=$('confluenceEditor');
  const handleEntry=t=>{
    const e=cfCurrent();if(!e)return;
    if(t.dataset.cfEntry&&Object.hasOwn(e,t.dataset.cfEntry)){
      e[t.dataset.cfEntry]=t.value;scheduleConfluenceSave();
      if(['ticker','company'].includes(t.dataset.cfEntry)){
        const title=panel.querySelector('.editor-top h3');if(title)title.innerHTML=`${esc(e.ticker.toUpperCase()||'Untitled confluence')}${e.company?` <span class="muted">· ${esc(e.company)}</span>`:''}`;
        refreshConfluenceSidebar();
      }
      return;
    }
    if(t.dataset.cfSignal&&t.dataset.cfSignalField){
      const x=e.signals[t.dataset.cfSignal];if(x&&Object.hasOwn(x,t.dataset.cfSignalField)){x[t.dataset.cfSignalField]=t.value;scheduleConfluenceSave();}
    }
  };
  panel.addEventListener('input',ev=>handleEntry(ev.target));
  panel.addEventListener('change',ev=>{handleEntry(ev.target);});
  panel.addEventListener('click',ev=>{
    const b=ev.target.closest('button');if(!b)return;
    if(b.id==='emptyConfluenceButton')return newConfluence();
    if(b.id==='saveConfluenceAssessment'||b.matches('[data-save-cf-snapshot]'))return saveConfluenceAssessment();
    if(b.id==='deleteConfluenceEntry')return deleteConfluence();
    if(b.hasAttribute('data-cf-side-key')){
      const x=cfCurrent()?.signals[b.dataset.cfSideKey];if(!x)return;
      x.side=x.side===b.dataset.cfSide?'':b.dataset.cfSide;
      scheduleConfluenceSave();renderConfluenceEditor();refreshConfluenceSidebar();
    }
  });
  refreshConfluenceSidebar();
}

function setupEvents(){
  $('strategyTabs').addEventListener('click',e=>{const btn=e.target.closest('[data-strategy]');if(btn)setStrategy(btn.dataset.strategy);});
  document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
  $('newEntryButton').addEventListener('click',newEntry);$('sidebarAdd').addEventListener('click',newEntry);
  $('entrySearch').addEventListener('input',renderList);$('entryStatusFilter').addEventListener('change',renderList);
  $('entryList').addEventListener('click',e=>{const b=e.target.closest('[data-open-id]');if(!b)return;persist();app.selectedId=b.dataset.openId;renderList();renderEditor();});
  const editor=$('editorPanel');
  editor.addEventListener('input',e=>{const t=e.target;if(t.matches('[data-field],[data-notes-stage],[data-data-field]'))updateField(t);});
  editor.addEventListener('change',e=>{
    const t=e.target;if(t.matches('[data-field],[data-notes-stage],[data-data-field]')){
      updateField(t);
    }
    if(t.matches('[data-check-stage]')){const cur=current(),stage=cur?.stages[t.dataset.checkStage],i=Number(t.dataset.checkIndex);if(stage&&i>=0&&i<stage.checks.length){stage.checks[i]=t.checked;autosave();rerenderEditor();}}
  });
  editor.addEventListener('click',e=>{
    const t=e.target,b=t.closest('button');if(!b)return;
    if(b.id==='emptyNewButton'){newEntry();return;}
    if(b.id==='snapshotButton'){savedSnapshot();return;}
    if(b.id==='deleteButton'){deleteEntry();return;}
    if(b.id==='addLogButton'){addLog();return;}
    if(b.dataset.rateStage){const x=current(),stage=x?.stages[b.dataset.rateStage];if(stage){stage.rating=stage.rating===b.dataset.rate?'':b.dataset.rate;autosave();rerenderEditor();}return;}
    if(b.dataset.addData){addData(b.dataset.addData);return;}
    if(b.dataset.removeData){removeData(b.dataset.removeStage,b.dataset.removeData);return;}
    if(b.dataset.viewSnapshot){persist();showSnapshot(b.dataset.viewSnapshot);return;}
  });
  $('historySearch').addEventListener('input',renderHistory);$('historyScope').addEventListener('change',renderHistory);$('historyStatus').addEventListener('change',renderHistory);
  $('historyResults').addEventListener('click',e=>{const b=e.target.closest('[data-history-open]');if(!b)return;const target=app.entries.find(x=>x.id===b.dataset.historyOpen);if(!target)return;setStrategy(target.strategy);app.selectedId=target.id;setView('journal');renderList();renderEditor();window.scrollTo({top:0,behavior:'smooth'});});
  $('exportButton').addEventListener('click',exportBackup);
  $('importButton').addEventListener('click',()=>$('importFile').click());
  $('importFile').addEventListener('change',async e=>{await importBackup(e.target.files[0]);e.target.value='';});
  document.querySelectorAll('[data-dialog-close]').forEach(b=>b.addEventListener('click',()=>$('snapshotDialog').close()));
  $('snapshotDialog').addEventListener('close',()=>{app.snapshotId=null;});
  $('restoreSnapshotButton').addEventListener('click',restoreSnapshot);
  window.addEventListener('pagehide',()=>{if(app.pending)persist();});
}
setupEvents();
setupConfluenceEvents();
setStrategy('swings');
setView('journal');
