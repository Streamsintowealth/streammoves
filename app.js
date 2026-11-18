/* Stream Moves | personal, browser-only investment research journal.
   No accounts, tracking, remote services, or market-data requests. */
'use strict';

const STORAGE_KEY = 'streammoves_journal_v1';
const FORMAT = 'streammoves-backup';
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

function persist(){
  if(app.pending){clearTimeout(app.pending);app.pending=null;}
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(app.entries));app.storageError=false;setSaveText('Saved in this browser');return true;}
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
  persist();app.strategy=strategy;app.selectedId=app.entries.filter(e=>e.strategy===strategy).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]?.id??null;
  document.querySelectorAll('[data-strategy]').forEach(b=>{let active=b.dataset.strategy===strategy;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('entrySearch').value='';$('entryStatusFilter').value='all';
  refreshSummary();renderList();renderEditor();
}
function setView(view){
  if(!['journal','history'].includes(view))return;
  persist();app.view=view;
  document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('journalView').classList.toggle('hidden',view!=='journal');
  $('historyView').classList.toggle('hidden',view!=='history');
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
  persist();const payload={format:FORMAT,version:1,exportedAt:isoNow(),entries:app.entries};
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
    const loaded=json.entries.map(normalizeEntry),ids=new Set();
    for(const e of loaded){if(ids.has(e.id))e.id=makeId();ids.add(e.id);}
    if(!confirm(`Import ${loaded.length} analyses? This REPLACES the ${app.entries.length} analyses currently saved in this browser. Export your existing backup first if needed.`))return;
    const old=app.entries;app.entries=loaded;
    if(!persist()){app.entries=old;persist();throw Error('Import could not be saved to browser storage.');}
    setStrategy(app.strategy);if(app.view==='history')renderHistory();showToast(`Imported ${loaded.length} analyses successfully.`);
  }catch(err){console.error(err);showToast(`Import failed: ${err.message}`,true);}
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
setStrategy('swings');
setView('journal');
