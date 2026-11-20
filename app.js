/* Stream Moves | personal, browser-saved investment research journal.
   Only ticker/company searches and last-price requests are sent to an external market-data proxy.
   All journal analysis remains in this browser unless exported by the user. */
'use strict';

const STORAGE_KEY = 'streammoves_journal_v1';
const CONFLUENCE_KEY = 'streammoves_confluence_v1';
const FORMAT = 'streammoves-backup';
const STRATEGIES = {
  day: { name: 'Day Trading', title: 'Your Day Trading Journal', eyebrow: '0–1 DTE / INTRADAY RESEARCH WORKSPACE', desc: 'Research market direction, intraday setups, Greeks, implied volatility, and tightly defined premium risk.' },
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
// Dedicated intraday framework; each checklist item owns a 3-reading numeric meter.
// No automatic trades or fabricated real-time market/option chain data.
const DAY_STAGES = [
  {key:'day-market', name:'Market Bias & Catalysts',description:'Identify market direction and event risk before considering a 0–1 DTE entry.',checks:[
    'Index opening momentum evaluated','VIX / volatility reaction reviewed','Breadth / advance-decline checked','Economic release and event risk checked','Index or sector relative strength compared']},
  {key:'day-structure', name:'Intraday Structure & Liquidity',description:'Use the opening range, VWAP, liquidity sweeps, and volume to map plausible levels.',checks:[
    'Price relative to VWAP reviewed','Opening range breakout / rejection mapped','Relative volume confirmed','Liquidity sweep / FVG and retest identified','Order flow / buying-selling volume reviewed']},
  {key:'day-entry', name:'Entry Confirmation & Reward/Risk',description:'Determine whether a completed candle setup provides enough room to the target.',checks:[
    '5-minute candle close confirmed','15-minute directional confirmation checked','Target and stop distances measured','Risk/reward measured before entry','Room to supply or demand assessed']},
  {key:'day-greeks', name:'Greeks & Contract Quality',description:'Analyze the exact strike and expiration; price sensitivity can change rapidly near expiry.',checks:[
    'Delta of the chosen contract checked','Gamma exposure and acceleration reviewed','Theta decay / time remaining examined','Vega and IV sensitivity reviewed','Bid-ask spread and contract liquidity reviewed']},
  {key:'day-iv', name:'IV, Expected Move & Positioning',description:'Compare implied movement with the real trading range and the proposed setup.',checks:[
    'Implied volatility / IV percentile checked','Implied expected move reviewed','Put/call volume or positioning checked','Open interest / major strikes checked','VIX / volatility term structure reviewed']}
];
const DAY_MARKER_DEFS = {
  'day-market': [
    ['SPX move since open (%)','choose'],['VIX change since open (%)','down'],
    ['Advancers minus decliners (count)','up'],['Economic event surprise (actual minus consensus)','choose'],
    ['NDX move minus SPX move (pp)','choose']
  ],
  'day-structure': [
    ['Underlying price vs VWAP (%)','choose'],['Price vs opening-range high (%)','choose'],
    ['Relative volume vs typical interval (x)','choose'],['Price vs liquidity level (%)','choose'],
    ['Cumulative buying-minus-selling delta','choose']
  ],
  'day-entry': [
    ['5-minute close vs trigger level (%)','choose'],['15-minute close vs key level (%)','choose'],
    ['Reward distance to target (points)','choose'],['Planned reward-to-risk multiple (R)','up'],
    ['Distance to opposing supply/demand (points)','choose']
  ],
  'day-greeks': [
    ['Selected contract delta (signed)','choose'],['Gamma (per 1-point underlying move)','choose'],
    ['Theta ($ per share per day)','choose'],['Vega ($ per share per 1 vol point)','choose'],
    ['Bid-ask spread (% of midpoint)','down']
  ],
  'day-iv': [
    ['Contract implied volatility (%)','choose'],['IV percentile (%)','choose'],
    ['Implied expected move to expiry (%)','choose'],['Put/call volume ratio','choose'],
    ['Open interest at target strike (contracts)','choose']
  ]
};
const stageList = entry => entry?.strategy === 'day' ? DAY_STAGES : STAGES;
const markerDefs = key => DAY_MARKER_DEFS[key] || MARKER_DEFS[key] || [];

// Numeric markers are editable. Directions are transparent assumptions, not forecasts.
// Five-step meters use three chronological readings and only checked, complete markers.
const MARKER_DEFS = {
  economic: [
    ['Real GDP growth (%)','up'],['Core PCE inflation YoY (%)','down'],
    ['Unemployment rate (%)','down'],['10Y minus 2Y Treasury spread (pp)','choose'],['ISM Manufacturing PMI','up']
  ],
  sector: [
    ['Sector return vs S&P 500 (%)','up'],['Sector 1-month relative strength (%)','up'],
    ['Sector price vs 50-day MA (%)','up'],['Sector breadth above 50-day MA (%)','up'],
    ['Sector ETF net flows ($M)','up']
  ],
  fundamentals: [
    ['Revenue growth YoY (%)','up'],['EPS growth YoY (%)','up'],
    ['Free cash flow ($M)','up'],['Net debt / EBITDA','down'],['Return on invested capital (%)','up']
  ],
  technical: [
    ['Price vs 20-day MA (%)','up'],['Price vs 50-day MA (%)','up'],
    ['Price vs 200-day MA (%)','up'],['Price vs prior swing high (%)','up'],
    ['Bullish-minus-bearish volume (%)','up'],['Potential reward / risk (multiple)','up']
  ],
  options: [
    ['Call / put open-interest ratio','up'],['Implied volatility rank (%)','choose'],
    ['Put / call volume ratio','down'],['Net bullish options premium ($M)','up'],
    ['Options delta (signed)','choose']
  ]
};

// Indicator research shortcuts. Each list entry matches its stage's existing checklist and marker order.
// Company pages use the journal ticker; economic sources do not require one.
const RESEARCH_SOURCES = {
  economic: [
    {check:'https://www.bea.gov/data/gdp/gross-domestic-product',mark:'https://www.bea.gov/data/gdp/gross-domestic-product',name:'BEA GDP'},
    {check:'https://www.bls.gov/news.release/cpi.htm',mark:'https://www.bea.gov/data/personal-consumption-expenditures-price-index',name:'BEA Core PCE'},
    {check:'https://www.bls.gov/news.release/empsit.htm',mark:'https://fred.stlouisfed.org/series/UNRATE',name:'FRED / BLS Unemployment'},
    {check:'https://fred.stlouisfed.org/series/T10Y2Y',mark:'https://fred.stlouisfed.org/series/T10Y2Y',name:'FRED 10Y–2Y Spread'},
    {check:'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/',mark:'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/',name:'ISM PMI'}
  ],
  sector: [
    {check:'https://finviz.com/groups?g=sector&v=140',mark:'https://finviz.com/groups?g=sector&v=140',name:'Finviz Sector Performance'},
    {check:'https://finviz.com/groups?g=sector&v=140',mark:'https://stockcharts.com/freecharts/marketsummary.html',name:'StockCharts Sector Strength'},
    {check:'https://stockcharts.com/freecharts/marketsummary.html',mark:'https://stockcharts.com/freecharts/marketsummary.html',name:'StockCharts Sector Trends'},
    {check:'https://stockcharts.com/freecharts/marketsummary.html',mark:'https://stockcharts.com/freecharts/marketsummary.html',name:'StockCharts Sector Breadth'},
    {check:'https://www.etf.com/etfanalytics/etf-fund-flows-tool',mark:'https://www.etf.com/etfanalytics/etf-fund-flows-tool',name:'ETF.com Fund Flows'}
  ],
  fundamentals: [
    {check:'{financials}',mark:'{financials}',name:'StockAnalysis Financials'},
    {check:'https://www.sec.gov/edgar/search/',mark:'{financials}',name:'StockAnalysis Earnings'},
    {check:'{balance-sheet}',mark:'{cash-flow}',name:'StockAnalysis Cash Flow'},
    {check:'{statistics}',mark:'{statistics}',name:'StockAnalysis Valuation'},
    {check:'https://www.sec.gov/edgar/search/',mark:'{ratios}',name:'StockAnalysis ROIC / Ratios'}
  ],
  technical: [
    {check:'{chart}',mark:'{technical}',name:'Barchart Technicals'},
    {check:'{technical}',mark:'{technical}',name:'Barchart Moving Averages'},
    {check:'{chart}',mark:'{technical}',name:'Barchart Technicals'},
    {check:'{chart}',mark:'{chart}',name:'TradingView Chart'},
    {check:'{chart}',mark:'{chart}',name:'TradingView Chart'},
    {check:'{chart}',mark:'{chart}',name:'TradingView Price Chart'}
  ],
  options: [
    {check:'{options-data}',mark:'{options-data}',name:'Barchart Options Data'},
    {check:'{options-data}',mark:'{options-data}',name:'Barchart IV Rank'},
    {check:'{options-data}',mark:'{options-data}',name:'Barchart Put/Call'},
    {check:'{options-chain}',mark:'{options-flow}',name:'Barchart Options Flow'},
    {check:'{options-greeks}',mark:'{options-greeks}',name:'Barchart Greeks'}
  ]
};
// Verified research destinations where available; some quote/Greek views are delayed or paid.
Object.assign(RESEARCH_SOURCES, {
 'day-market': [
  {check:'https://www.tradingview.com/symbols/SP-SPX/',mark:'https://www.tradingview.com/symbols/SP-SPX/',name:'TradingView SPX chart'},
  {check:'https://www.cboe.com/tradable_products/vix/',mark:'https://www.tradingview.com/symbols/CBOE-VIX/',name:'Cboe VIX'},
  {check:'https://www.tradingview.com/markets/stocks-usa/market-movers-advancers/',mark:'https://www.tradingview.com/markets/stocks-usa/market-movers-advancers/',name:'Market advancers / decliners'},
  {check:'https://www.bls.gov/schedule/news_release/',mark:'https://www.investing.com/economic-calendar/',name:'BLS / Economic calendar'},
  {check:'https://www.tradingview.com/symbols/NASDAQ-NDX/',mark:'https://www.tradingview.com/symbols/NASDAQ-NDX/',name:'TradingView NDX chart'}
 ],
 'day-structure': [
  {check:'{chart}',mark:'{chart}',name:'TradingView VWAP chart'},
  {check:'{chart}',mark:'{chart}',name:'TradingView Opening Range'},
  {check:'{chart}',mark:'{chart}',name:'TradingView Volume'},
  {check:'{chart}',mark:'{chart}',name:'TradingView Liquidity / FVG'},
  {check:'https://www.tradingview.com/markets/stocks-usa/market-movers-active/',mark:'{chart}',name:'TradingView Active Stocks / Chart'}
 ],
 'day-entry': [
  {check:'{chart}',mark:'{chart}',name:'TradingView 5m Candles'},
  {check:'{chart}',mark:'{chart}',name:'TradingView 15m Candles'},
  {check:'{chart}',mark:'{chart}',name:'TradingView Price Levels'},
  {check:'https://www.optionsprofitcalculator.com/',mark:'https://www.optionsprofitcalculator.com/',name:'Options Profit Calculator'},
  {check:'{chart}',mark:'{chart}',name:'TradingView Price Zones'}
 ],
 'day-greeks': [
  {check:'{options-greeks}',mark:'{options-greeks}',name:'Barchart Contract Greeks'},
  {check:'{options-greeks}',mark:'{options-greeks}',name:'Barchart Gamma'},
  {check:'{options-greeks}',mark:'{options-greeks}',name:'Barchart Theta'},
  {check:'{options-greeks}',mark:'{options-greeks}',name:'Barchart Vega'},
  {check:'{options-chain}',mark:'{options-chain}',name:'Barchart Option Chain'}
 ],
 'day-iv': [
  {check:'{options-data}',mark:'{options-data}',name:'Barchart IV Data'},
  {check:'https://optionsband.com/',mark:'https://optionsband.com/',name:'OptionsBand Expected Move'},
  {check:'https://www.cboe.com/markets/us/options/market-statistics/daily/',mark:'https://www.cboe.com/markets/us/options/market-statistics/daily/',name:'Cboe Put/Call Statistics'},
  {check:'{options-chain}',mark:'{options-chain}',name:'Barchart OI / Strike Chain'},
  {check:'https://www.cboe.com/tradable_products/vix/',mark:'https://www.cboe.com/tradable_products/vix/',name:'Cboe VIX / IV'}
 ]
});
function companyResearchUrl(token,entry){
  const symbol=String(entry?.ticker||'').trim().toUpperCase();
  const valid=/^[A-Z][A-Z0-9.\-]{0,11}$/.test(symbol);
  if(token==='{chart}')return valid?`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`:'https://www.tradingview.com/chart/';
  if(['{financials}','{balance-sheet}','{cash-flow}','{statistics}','{ratios}'].includes(token)){
    if(!valid)return 'https://stockanalysis.com/stocks/';
    const tail={'{financials}':'financials/','{balance-sheet}':'financials/balance-sheet/','{cash-flow}':'financials/cash-flow-statement/','{statistics}':'statistics/','{ratios}':'financials/ratios/'}[token];
    return `https://stockanalysis.com/stocks/${symbol.toLowerCase()}/${tail}`;
  }
  const paths={'{technical}':'technical-analysis','{options-data}':'options-data','{options-flow}':'options-flow','{options-chain}':'options','{options-greeks}':'volatility-greeks'};
  if(paths[token]){if(['SPX','NDX','VIX','XSP','RUT'].includes(symbol))return `https://www.cboe.com/data/quotes/${encodeURIComponent(symbol)}/options`;return valid?`https://www.barchart.com/stocks/quotes/${encodeURIComponent(symbol)}/${paths[token]}`:'https://www.barchart.com/';}
  return token;
}
function researchSource(stage,index,kind,entry){
  const source=RESEARCH_SOURCES[stage]?.[index];
  if(!source)return null;
  const marker=entry?.stages?.[stage]?.markers?.[index];
  // Edited indicator names receive a clearly identified search instead of a misleading hardcoded source.
  if(kind==='mark'&&marker&&marker.name.trim().toLowerCase()!==markerDefs(stage)[index][0].toLowerCase()){
    return {url:'https://www.google.com/search?q='+encodeURIComponent(`${marker.name} historical data source ${entry?.ticker||''}`),text:'Find source ↗',description:'Find a source for your customized indicator'};
  }
  const url=companyResearchUrl(source[kind],entry);
  const description=kind==='check'&&stage==='economic'&&index===1?'BLS CPI data':kind==='check'&&stage==='fundamentals'&&index===1?'SEC company filings':source.name;
  return {url,text:kind==='check'?'↗ Source':'Source ↗',description:description+' (opens in a new tab)'};
}
function researchLink(stage,index,kind,entry){
  const src=researchSource(stage,index,kind,entry);
  if(!src)return '';
  return `<a class="indicator-source-link ${kind==='check'?'check-source':'marker-source'}" data-research-stage="${esc(stage)}" data-research-index="${index}" data-research-kind="${kind}" href="${esc(src.url)}" target="_blank" rel="noopener noreferrer" title="${esc(src.description)}" aria-label="${esc(src.description)}">${esc(src.text)}</a>`;
}
function updateResearchLinks(entry){
  document.querySelectorAll('[data-research-stage][data-research-index][data-research-kind]').forEach(el=>{
    const src=researchSource(el.dataset.researchStage,Number(el.dataset.researchIndex),el.dataset.researchKind,entry);
    if(!src)return;
    el.href=src.url;el.textContent=src.text;el.title=src.description;el.setAttribute('aria-label',src.description);
  });
  document.querySelectorAll('[data-day-contract-source]').forEach(el=>{
    el.href=companyResearchUrl(el.dataset.dayContractSource==='greeks'?'{options-greeks}':'{options-chain}',entry);
  });
}

const MARKET_PROXY = 'https://proxy.cors.dev/';
const quoteCache = new Map(), searchCache = new Map(), quoteAttempts = new Map();
let quoteTimer=null, searchTimer=null, searchController=null, quoteController=null;
let suggestions=[], suggestionEntryId=null;
const marketUrl = url => MARKET_PROXY + url;
const stockAnalysisUrl = (ticker, instrument='EQUITY') => {
  const symbol=String(ticker||'').trim().toLowerCase();
  if(!/^[a-z0-9-]{1,12}$/.test(symbol))return 'https://stockanalysis.com/';
  return 'https://stockanalysis.com/'+(instrument==='ETF'?'etf/':'stocks/')+symbol+'/';
};
const dayIndexMeta = {
 SPX:{feed:'^GSPC',title:'S&P 500',url:'https://www.tradingview.com/symbols/SP-SPX/'},
 NDX:{feed:'^NDX',title:'Nasdaq-100',url:'https://www.tradingview.com/symbols/NASDAQ-NDX/'},
 VIX:{feed:'^VIX',title:'Cboe VIX',url:'https://www.tradingview.com/symbols/CBOE-VIX/'},
 RUT:{feed:'^RUT',title:'Russell 2000',url:'https://www.tradingview.com/symbols/TVC-RUT/'}
};
function quoteResearchLink(entry){
 const key=entry?.ticker?.trim().toUpperCase(),index=entry?.strategy==='day'?dayIndexMeta[key]:null;
 return index?{url:index.url,label:'Index chart ↗'}:{url:stockAnalysisUrl(key,entry?.instrumentType),label:'StockAnalysis.com ↗'};
}
const isTicker = value => /^[A-Za-z^][A-Za-z0-9.\-=^]{0,14}$/.test(String(value||'').trim());
const amountText = (price, currency='USD') => {
  if(!Number.isFinite(Number(price)))return 'Unavailable';
  try{return new Intl.NumberFormat(undefined,{style:'currency',currency:currency||'USD',maximumFractionDigits:2}).format(Number(price));}
  catch{return Number(price).toFixed(2)+' '+currency;}
};

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

function emptyStage(s) {return {rating:'',checks:s.checks.map(()=>false),markers:markerDefs(s.key).map(([name,direction])=>({name,direction,readings:['','','']})),notes:'',data:[]};}
function createEntry(strategy='swings') {
  const stamp=isoNow();
  return {id:makeId(),strategy,ticker:'',company:'',setup:'',status:'Researching',decision:'Undecided',thesis:'',invalidationReason:'',lesson:'',
    direction:'Long',timeframe:'Daily',entryPrice:'',targetPrice:'',stopPrice:'',exitPrice:'',capital:'',quantity:'',exitPremium:'',openedDate:'',closedDate:'',
    optionType:'Call',expiration:'',strike:'',premium:'',contracts:'',delta:'',ivRank:'',reviewDate:'',allocation:'',
    gamma:'',theta:'',vega:'',ivPercent:'',bidPrice:'',askPrice:'',openInterest:'',optionVolume:'',expectedMove:'',targetPremium:'',stopPremium:'',maxDailyLoss:'',openingRangeHigh:'',openingRangeLow:'',vwap:'',setupTime:'',
    lastPrice:null,lastPriceCurrency:'USD',lastPriceAt:'',lastPriceSymbol:'',instrumentType:'EQUITY',
    stages:Object.fromEntries(stageList({strategy}).map(s=>[s.key,emptyStage(s)])),logs:[],snapshots:[],createdAt:stamp,updatedAt:stamp};
}
function normalizeCore(raw) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) throw Error('Invalid analysis entry');
  const e=createEntry(Object.hasOwn(STRATEGIES,raw.strategy)?raw.strategy:'swings');
  e.id=plain(raw.id,128)||makeId();
  for(const k of ['ticker','company','setup','thesis','invalidationReason','lesson','entryPrice','targetPrice','stopPrice','exitPrice','capital','quantity','exitPremium','openedDate','closedDate','expiration','strike','premium','contracts','delta','ivRank','reviewDate','allocation','lastPriceCurrency','lastPriceAt','lastPriceSymbol','instrumentType','gamma','theta','vega','ivPercent','bidPrice','askPrice','openInterest','optionVolume','expectedMove','targetPremium','stopPremium','maxDailyLoss','openingRangeHigh','openingRangeLow','vwap','setupTime']) e[k]=plain(raw[k]);
  e.lastPrice=raw.lastPrice!==null&&Number.isFinite(Number(raw.lastPrice))&&Number(raw.lastPrice)>0?Number(raw.lastPrice):null;
  e.status=STATUSES.includes(raw.status)?raw.status:'Researching';
  e.decision=DECISIONS.includes(raw.decision)?raw.decision:'Undecided';
  e.direction=['Long','Short'].includes(raw.direction)?raw.direction:'Long';
  e.timeframe=['4H','Daily','Weekly','Other'].includes(raw.timeframe)?raw.timeframe:'Daily';
  e.optionType=['Call','Put'].includes(raw.optionType)?raw.optionType:'Call';
  e.createdAt=validDate(raw.createdAt)?raw.createdAt:e.createdAt;
  e.updatedAt=validDate(raw.updatedAt)?raw.updatedAt:e.updatedAt;
  for(const s of stageList(e)){
    const a=raw.stages?.[s.key];
    if(!a || typeof a!=='object')continue;
    const st=e.stages[s.key];
    st.rating=[...RATINGS,'na'].includes(a.rating)?a.rating:'';
    st.notes=plain(a.notes,30000);
    st.checks=s.checks.map((_,i)=>a.checks?.[i]===true);
    st.markers=st.markers.map((m,i)=>{const source=a.markers?.[i]||{};return {name:plain(source.name,120)||m.name,direction:['up','down','choose'].includes(source.direction)?source.direction:m.direction,readings:[0,1,2].map(j=>plain(source.readings?.[j],45))};});
    st.data=Array.isArray(a.data)?a.data.slice(0,500).map(d=>({id:plain(d?.id,128)||makeId(),metric:plain(d?.metric,1000),value:plain(d?.value,2000),source:plain(d?.source,2500),recordedAt:validDate(d?.recordedAt)?d.recordedAt:isoNow()})):[];
  }
  for(const st of stageList(e)){const v=e.stages[st.key];if(v.rating!=='na')v.rating=stageSignal(e,st.key).rating;}
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
const app={entries:loadEntries(),strategy:'day',selectedId:null,view:'journal',pending:null,snapshotId:null,toastTimer:null,storageError:false};

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
// An explicitly directional, equal-weight trend score. A move is not a probability.
function numericReadings(m){
  if(!m || m.direction==='choose' || !Array.isArray(m.readings) || m.readings.length!==3)return null;
  const values=m.readings.map(x=>String(x).trim());
  if(values.some(x=>!x || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(x)))return null;
  const numbers=values.map(Number);
  return numbers.every(Number.isFinite)?numbers:null;
}
function markerSignal(m){
  const n=numericReadings(m);if(!n)return null;
  const sign=x=>x>1e-10?1:x< -1e-10?-1:0;
  const direction=m.direction==='down'?-1:1;
  // 50% oldest-to-latest trend, 25% each consecutive period.
  return direction*(0.5*sign(n[2]-n[0])+0.25*sign(n[1]-n[0])+0.25*sign(n[2]-n[1]));
}
function stageSignal(entry,key){
  const st=entry.stages[key];
  if(st.rating==='na')return {rating:'na',score:0,ready:0,included:0,pending:0};
  let sum=0,ready=0,included=0,pending=0;
  st.checks.forEach((checked,i)=>{
    if(!checked)return;
    included++;
    const signal=markerSignal(st.markers[i]);
    if(signal===null)pending++;else{sum+=signal;ready++;}
  });
  if(ready<3)return {rating:'',score:ready?sum/ready:0,ready,included,pending};
  const score=sum/ready;
  return {rating:score>=0.25?'bullish':score<=-0.25?'bearish':'neutral',score,ready,included,pending};
}
function syncStageRating(entry,key){
  const st=entry.stages[key];if(st.rating!=='na')st.rating=stageSignal(entry,key).rating;
}
function allSignals(entry){
  const stages=stageList(entry).map(x=>stageSignal(entry,x.key)).filter(s=>s.rating!=='na');
  const ready=stages.filter(x=>x.rating).length;
  const score=ready?stages.filter(x=>x.rating).reduce((a,x)=>a+x.score,0)/ready:0;
  const enough=ready===stages.length && ready>0;
  return {score,ready,needed:stages.length,rating:enough?(score>=0.25?'bullish':score<=-0.25?'bearish':'neutral'):''};
}
function meterMarkup(signal,overview=false){
  const pct=Math.max(3,Math.min(97,50+50*signal.score));
  const label=signal.rating==='na'?'Not applicable':signal.rating?signal.rating[0].toUpperCase()+signal.rating.slice(1):'Insufficient data';
  const detail=overview?`${signal.ready}/${signal.needed} stages scored`:`${signal.ready} complete indicators${signal.pending?` · ${signal.pending} checked but incomplete`:''} · min. 3 required`;
  return `<div class="signal-meter ${esc(signal.rating||'pending')}"><div class="signal-meter-head"><strong>${overview?'Overall evidence meter':'Data-derived thesis'}: ${esc(label)}</strong><span>${esc(detail)}</span></div><div class="signal-track"><div class="signal-track-pin" style="left:${pct}%" aria-hidden="true"></div></div><div class="signal-endpoints"><span>BEARISH</span><span>NEUTRAL</span><span>BULLISH</span></div></div>`;
}
function redrawMeters(){
  const e=current();if(!e)return;
  for(const s of stageList(e)){
    const signal=stageSignal(e,s.key),el=$('meter-'+s.key),card=document.querySelector(`[data-stage="${s.key}"]`);
    if(el)el.innerHTML=meterMarkup(signal);
    const tag=card?.querySelector('.stage-tag');
    if(tag){tag.className='stage-tag '+(signal.rating||'pending');tag.textContent=signal.rating==='na'?'N/A':signal.rating?signal.rating[0].toUpperCase()+signal.rating.slice(1):'Needs readings';}
    const small=card?.querySelector('.stage-title-wrap small');
    if(small)small.textContent=`${e.stages[s.key].checks.filter(Boolean).length}/${s.checks.length} checked · ${signal.ready} complete readings`;
  }
  const overall=$('overallSignal');if(overall)overall.innerHTML=meterMarkup(allSignals(e),true);
  const m=metrics(e),progress=$('progressNote');
  if(progress)progress.textContent=`${m.done} of ${m.total} prompts checked · ${m.rated} of ${stageList(e).length-(e.stages.options?.rating==='na'?1:0)} stages scored. Completion is not a buy signal.`;
}

function metrics(e){
  let done=0,total=0,rated=0;
  for(const s of stageList(e)){const st=e.stages[s.key];if(st.rating==='na')continue;done+=st.checks.filter(Boolean).length;total+=st.checks.length;if(stageSignal(e,s.key).rating)rated++;}
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
  persist();cf.active=false;
  for(const id of ['mainJournalHeader','statGrid','mainViewSwitch'])$(id).classList.remove('hidden');
  $('confluenceView').classList.add('hidden');$('confluenceNavButton').classList.remove('active');$('confluenceNavButton').setAttribute('aria-pressed','false');
  persist();app.strategy=strategy;app.selectedId=app.entries.filter(e=>e.strategy===strategy).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]?.id??null;
  document.querySelectorAll('[data-strategy]').forEach(b=>{let active=b.dataset.strategy===strategy;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('entrySearch').value='';$('entryStatusFilter').value='all';
  refreshSummary();setView(app.view);renderList();renderEditor();
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
  const q=search.trim().toLowerCase();return app.entries.filter(e=>(strategy==='all'||e.strategy===strategy)&&(status==='all'||e.status===status)&&(!q||[e.ticker,e.company,e.setup,e.thesis,e.lesson,...stageList(e).flatMap(s=>[e.stages[s.key].notes,...e.stages[s.key].data.flatMap(d=>[d.metric,d.value])]),...e.logs.map(l=>l.text)].join(' ').toLowerCase().includes(q))).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
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
  const st=e.stages[s.key],checked=st.checks.filter(Boolean).length,signal=stageSignal(e,s.key);
  const label=signal.rating==='na'?'N/A':signal.rating?(signal.rating[0].toUpperCase()+signal.rating.slice(1)):'Needs readings';
  return `<details class="stage-card" data-stage="${s.key}" ${open?'open':''}>
    <summary><span class="stage-index">0${i+1}</span><span class="stage-title-wrap"><strong>${esc(s.name)}</strong><small>${checked}/${s.checks.length} checked · ${signal.ready} complete readings</small></span><span class="stage-side"><span class="stage-tag ${esc(signal.rating||'pending')}">${esc(label)}</span><span class="stage-arrow" aria-hidden="true">⌄</span></span></summary>
    <div class="stage-body"><p class="stage-body-intro">${esc(s.description)}</p>
      <div id="meter-${s.key}">${meterMarkup(signal)}</div>
      <p class="hint-text">${e.strategy==='day'?'Use three chronological intraday readings (for example, 9:45 → 10:00 → 10:15 ET). This measures directional bias, NOT option safety; choose the favorable direction per indicator and your call/put thesis.':'The meter uses checked markers only. Fill in all three numeric readings (oldest → latest), and choose which direction favors bullish. At least 3 complete markers are required. Trends are not forecasts.'}</p>
      ${s.key==='options' && e.strategy==='long-term'?`<label class="na-row"><input type="checkbox" data-stage-na="options" ${st.rating==='na'?'checked':''}> Options not applicable to this long-term position</label>`:''}
      <p class="checklist-heading">Evidence checklist + last three readings</p><div class="evidence-metrics">${s.checks.map((c,j)=>{
        const m=st.markers[j],v=m.readings,score=st.checks[j]?markerSignal(m):null;
        return `<div class="evidence-metric ${st.checks[j]?'active':''}" data-marker-card="${s.key}-${j}">
        <div class="evidence-check-row"><label class="evidence-check ${st.checks[j]?'checked':''}"><input type="checkbox" data-check-stage="${s.key}" data-check-index="${j}" ${st.checks[j]?'checked':''}/><span>${esc(c)}</span></label>${researchLink(s.key,j,'check',e)}</div>
        <div class="marker-fields" data-marker-stage="${s.key}" data-marker-index="${j}">
          <div class="marker-name-wrap"><div class="marker-name-header"><span>Indicator</span>${researchLink(s.key,j,'mark',e)}</div><label class="marker-name-label"><span class="visually-hidden">Indicator name</span><input type="text" data-marker-input="name" value="${esc(m.name)}" maxlength="120" aria-label="Indicator name" /></label></div>
          <label class="marker-direction-label">Bullish interpretation<select data-marker-input="direction" aria-label="Which direction favors bullish">
            <option value="choose" ${m.direction==='choose'?'selected':''}>Choose direction</option><option value="up" ${m.direction==='up'?'selected':''}>Higher = bullish</option><option value="down" ${m.direction==='down'?'selected':''}>Lower = bullish</option>
          </select></label>
        </div>
        <div class="marker-reading-grid" data-marker-stage="${s.key}" data-marker-index="${j}">${['Oldest','Middle','Latest'].map((x,k)=>`<label>${x}<input type="number" inputmode="decimal" step="any" data-marker-input="reading" data-reading-index="${k}" aria-label="${esc(m.name)} ${x.toLowerCase()} reading" value="${esc(v[k])}" placeholder="${k===0?'1st':k===1?'2nd':'3rd'}" /></label>`).join('')}</div>
        </div>`;
      }).join('')}</div>
      <div class="data-section"><div class="data-header"><span class="datapoints-heading">Research data &amp; sources</span><button type="button" class="btn btn-secondary small-btn" data-add-data="${s.key}">+ Add data point</button></div>
      ${st.data.length?st.data.map(d=>`<div class="data-row" data-data-id="${esc(d.id)}" data-data-stage="${s.key}"><input aria-label="Metric or evidence name" data-data-field="metric" type="text" value="${esc(d.metric)}" placeholder="Metric (e.g., CPI)" maxlength="1000"/><input aria-label="Observed value or finding" data-data-field="value" type="text" value="${esc(d.value)}" placeholder="Value / finding" maxlength="2000"/><input aria-label="Source URL" class="source-input" data-data-field="source" type="url" value="${esc(d.source)}" placeholder="https://source…" maxlength="2500"/><button class="remove-row" type="button" data-remove-data="${esc(d.id)}" data-remove-stage="${s.key}" aria-label="Remove this data point">×</button></div>${safeUrl(d.source)?`<div class="hint-text"><a href="${esc(safeUrl(d.source))}" target="_blank" rel="noopener noreferrer">Open source ↗</a> · added ${shortDate(d.recordedAt)}</div>`:''}`).join(''):`<div class="no-data">Add the exact values, findings, or source links you discover during research.</div>`}
      </div><div class="research-notes"><label for="notes-${s.key}">Analysis / conflicting evidence</label><textarea class="research-textarea" id="notes-${s.key}" data-notes-stage="${s.key}" rows="4" placeholder="What did you find? Why does it matter? What contradicts your thesis?">${esc(st.notes)}</textarea></div>
    </div></details>`;
}
function snapshotCore(e){const raw=deepCopy(e);delete raw.logs;delete raw.snapshots;return raw;}
function riskReward(e){const en=Number(e.entryPrice),t=Number(e.targetPrice),stop=Number(e.stopPrice);if(!e.entryPrice||!e.targetPrice||!e.stopPrice||![en,t,stop].every(Number.isFinite)||en<=0)return 'Add entry, target and invalidation prices to assess risk/reward.';
  const reward=Math.abs(t-en),risk=Math.abs(en-stop),long=['leaps','day'].includes(e.strategy)?e.optionType!=='Put':e.direction!=='Short';
  if(risk===0)return 'Invalidation cannot equal entry price.';
  if((long&&(t<=en||stop>=en))||(!long&&(t>=en||stop<=en)))return 'Check direction: target and invalidation must be on opposite sides of entry.';
  return `Planned reward/risk: ${(reward/risk).toFixed(2)} : 1 (price levels only; ignores fees and options pricing).`;
}
function realizedOutcome(e){
  if(e.status!=='Closed')return null;
  if(e.strategy==='leaps'||e.strategy==='day'){
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
function daySpreadSummary(e){
 const bid=Number(e.bidPrice),ask=Number(e.askPrice);
 if(!e.bidPrice||!e.askPrice||![bid,ask].every(Number.isFinite)||bid<0||ask<=0||ask<bid)return 'Bid/ask spread: enter current bid and ask to evaluate execution cost.';
 const spread=(ask-bid)/((ask+bid)/2)*100;
 return `Quoted spread: $${(ask-bid).toFixed(3)} (${spread.toFixed(1)}% of midpoint)${spread>10?' — relatively wide for a short-dated contract; recheck liquidity.':''}. Quotes may be delayed.`;
}
function dayPremiumRisk(e){
  const entry=Number(e.premium),target=Number(e.targetPremium),stop=Number(e.stopPremium),n=Number(e.contracts);
  if(!e.premium||!e.targetPremium||!e.stopPremium||![entry,target,stop].every(Number.isFinite))return 'Add contract entry, profit-target and stop premiums to calculate your options reward/risk.';
  if(entry<=0||target<=entry||stop<0||stop>=entry)return 'Target premium must exceed entry; stop premium must be nonnegative and below entry.';
  const reward=target-entry,risk=entry-stop,ratio=reward/risk;
  const per=entry*100,profit=reward*100,loss=risk*100;
  const dollars=Number.isInteger(n)&&n>0?` · ${n} contract${n>1?'s':''}: +$${(profit*n).toFixed(2)} / −$${(loss*n).toFixed(2)}`:'';
  const max=Number(e.maxDailyLoss);
  const warning=e.maxDailyLoss&&Number.isFinite(max)&&max>0&&Number.isInteger(n)&&n>0&&loss*n>max?' · WARNING: planned loss exceeds your entered daily loss cap.':'';
  return `Premium target +${(reward/entry*100).toFixed(1)}% / stop −${(risk/entry*100).toFixed(1)}% · ${ratio.toFixed(2)}:1 R/R · per contract +$${profit.toFixed(2)} / −$${loss.toFixed(2)}${dollars}${warning}. Estimates only; spreads, fees and fast moves can change actual fills.`;
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
  if(e.strategy==='day')return `<div class="day-trade-focus"><strong>0–1 DTE contract and execution plan</strong><p>Enter actual contract-chain values manually. Greeks and IV change intraday. Confirm liquidity, the economic calendar, and your planned exit before placing a trade.</p></div>
    <div class="form-grid three">${selectField('Option type','optionType',e.optionType,['Call','Put'])}${dateField('Expiration (0–1 DTE)','expiration',e.expiration)}${field('Strike price','strike',e.strike)}${field('Entry premium / share ($)','premium',e.premium)}${field('Profit target premium ($)','targetPremium',e.targetPremium)}${field('Stop premium ($)','stopPremium',e.stopPremium)}${field('Exit premium / share ($)','exitPremium',e.exitPremium)}${field('Contracts (100 multiplier)','contracts',e.contracts)}${field('Max daily loss ($)','maxDailyLoss',e.maxDailyLoss)}</div>
    <div class="premium-risk-note" id="dayPremiumRisk">${esc(dayPremiumRisk(e))}</div>
    <div class="day-subhead">Greeks &amp; live-chain observations <a data-day-contract-source="greeks" href="${esc(companyResearchUrl('{options-greeks}',e))}" target="_blank" rel="noopener noreferrer">Greeks ↗</a> <a data-day-contract-source="chain" href="${esc(companyResearchUrl('{options-chain}',e))}" target="_blank" rel="noopener noreferrer">Options chain ↗</a> <a href="https://www.cboe.com/markets/us/options/market-statistics/daily/" target="_blank" rel="noopener noreferrer">Cboe data ↗</a></div>
    <div class="form-grid three">${field('Delta','delta',e.delta)}${field('Gamma','gamma',e.gamma)}${field('Theta ($/share/day)','theta',e.theta)}${field('Vega ($/share/IV point)','vega',e.vega)}${field('Contract IV (%)','ivPercent',e.ivPercent)}${field('IV rank (%)','ivRank',e.ivRank)}${field('Bid premium ($)','bidPrice',e.bidPrice)}${field('Ask premium ($)','askPrice',e.askPrice)}${field('Open interest','openInterest',e.openInterest)}${field('Option volume','optionVolume',e.optionVolume)}${field('Expected underlying move','expectedMove',e.expectedMove)}${field('Setup time (ET)','setupTime',e.setupTime)}${field('Opening range high','openingRangeHigh',e.openingRangeHigh)}${field('Opening range low','openingRangeLow',e.openingRangeLow)}${field('VWAP','vwap',e.vwap)}</div>
    <p class="hint-text day-spread-note" id="daySpreadNote">${esc(daySpreadSummary(e))}</p><p class="hint-text">0DTE can lose the full premium quickly. Stop orders may slip; assignment, exercise and broker cutoffs vary by product. Daily option theta is not a constant intraday decay rate. Use your broker’s current chain for execution.</p>`;
  if(e.strategy==='leaps')return `<div class="form-grid three">${selectField('Option type','optionType',e.optionType,['Call','Put'])}${dateField('Expiration date','expiration',e.expiration)}${field('Strike price','strike',e.strike)}${field('Entry premium per share','premium',e.premium)}${field('Exit premium per share','exitPremium',e.exitPremium)}${field('Number of contracts','contracts',e.contracts)}${field('Delta','delta',e.delta)}${field('IV rank (%)','ivRank',e.ivRank)}</div><p class="hint-text">Record the actual contract, liquidity, and other Greeks in step 5. Options pricing cannot be inferred from the underlying share price alone.</p>`;
  return `<div class="form-grid">${field('Target portfolio allocation (%)','allocation',e.allocation)}${dateField('Next thesis review','reviewDate',e.reviewDate)}</div>`;
}
function quotePanelMarkup(e){
  const symbol=e.ticker?.trim().toUpperCase(),valid=symbol&&isTicker(symbol),hasQuote=valid&&e.lastPriceSymbol===symbol&&Number.isFinite(e.lastPrice)&&e.lastPrice>0;
  const quoteAt=hasQuote&&validDate(e.lastPriceAt)?dateLabel(e.lastPriceAt):'';
  const stockUrl=valid?quoteResearchLink(e).url:'https://stockanalysis.com/';
  return `<div class="market-lookup"><div class="market-lookup-top"><strong>Company lookup &amp; last reported stock price</strong><button class="btn btn-secondary small-btn" id="refreshQuoteButton" type="button" ${!valid?'disabled':''}>Refresh price</button></div>
  <div id="tickerSuggestions" class="ticker-suggestions hidden" role="listbox" aria-label="Matching companies"></div>
  <div class="quote-result" id="quoteResult"><div><strong>${hasQuote?esc(amountText(e.lastPrice,e.lastPriceCurrency)):valid?'Price not loaded':'Search a ticker or company name'}</strong><small>${hasQuote?`Last reported ${esc(quoteAt)} · ${esc(e.lastPriceCurrency||'USD')} · may be delayed`:valid?'Price updates on search or refresh':'Enter a company name or symbol above to see matches'}</small></div>
  <a href="${esc(stockUrl)}" target="_blank" rel="noopener noreferrer">${valid?quoteResearchLink(e).label:'Open StockAnalysis.com ↗'}</a></div><p class="market-lookup-help" id="marketLookupHelp">Prices are external, may be delayed, and can be unavailable. Your journal notes are never sent with requests.</p></div>`;
}
function updateQuotePanel(){
  const e=current(),panel=$('quoteResult'),help=$('marketLookupHelp');if(!e||!panel)return;
  const symbol=e.ticker.trim().toUpperCase(),valid=isTicker(symbol)&&!!symbol;
  const hasQuote=valid&&e.lastPriceSymbol===symbol&&Number.isFinite(e.lastPrice)&&e.lastPrice>0;
  panel.innerHTML=`<div><strong>${hasQuote?esc(amountText(e.lastPrice,e.lastPriceCurrency)):valid?'Price not loaded':'Search a ticker or company name'}</strong><small>${hasQuote?`Last reported ${esc(dateLabel(e.lastPriceAt))} · ${esc(e.lastPriceCurrency||'USD')} · may be delayed`:valid?'Fetching quote when available':'Enter a company name or symbol above to see matches'}</small></div><a href="${esc(valid?quoteResearchLink(e).url:'https://stockanalysis.com/')}" target="_blank" rel="noopener noreferrer">${valid?quoteResearchLink(e).label:'Open StockAnalysis.com ↗'}</a>`;
  const btn=$('refreshQuoteButton');if(btn)btn.disabled=!valid;
  if(help && !help.dataset.error)help.textContent='Prices are external, may be delayed, and can be unavailable. Your journal notes are never sent with requests.';
}
function setLookupHelp(message,isError=false){const el=$('marketLookupHelp');if(el){el.textContent=message;el.dataset.error=isError?'true':'';el.classList.toggle('market-error',isError);}}
function showSuggestions(results,eid){
  if(!eid||eid!==current()?.id)return;
  const el=$('tickerSuggestions');if(!el)return;
  suggestions=results;suggestionEntryId=eid;
  if(!results.length){el.classList.add('hidden');el.innerHTML='';return;}
  el.classList.remove('hidden');
  el.innerHTML=results.map((x,i)=>`<button type="button" data-select-company="${i}" role="option"><strong>${esc(x.symbol)}</strong><span>${esc(x.name||x.symbol)}</span><small>${esc(x.exchange||x.type||'')}</small></button>`).join('');
}
function clearSuggestions(){const el=$('tickerSuggestions');if(el){el.innerHTML='';el.classList.add('hidden');}suggestions=[];}
async function fetchJsonMarket(url,controller){
  const response=await fetch(marketUrl(url),{credentials:'omit',signal:controller.signal});
  if(!response.ok)throw Error(response.status===429?'Rate limited — retry later':`Market-data service error (${response.status})`);
  return response.json();
}
async function lookupCompanies(query,eid){
  const q=query.trim();if(q.length<2 || eid!==current()?.id)return;
  if(searchController)searchController.abort();searchController=new AbortController();
  try{
    const key=q.toLowerCase();let items;
    const cached=searchCache.get(key);
    if(cached && Date.now()-cached.at<600000)items=cached.items;
    else{
      const url='https://query1.finance.yahoo.com/v1/finance/search?quotesCount=8&newsCount=0&q='+encodeURIComponent(q);
      const data=await fetchJsonMarket(url,searchController);
      items=(data.quotes||[]).filter(x=>['EQUITY','ETF'].includes(x.quoteType)&&isTicker(x.symbol)).slice(0,8).map(x=>({symbol:x.symbol.toUpperCase(),name:x.longname||x.shortname||x.symbol,exchange:x.exchDisp||x.exchange||'',type:x.quoteType}));
      searchCache.set(key,{items,at:Date.now()});
    }
    if(eid!==current()?.id)return;
    showSuggestions(items,eid);if(!items.length)setLookupHelp('No matching stock found. You may still enter a ticker manually.',true);
  }catch(err){if(err.name!=='AbortError'&&eid===current()?.id)setLookupHelp('Company search unavailable. Enter a ticker and try Refresh price.',true);}
}
async function loadQuote(symbol,eid,force=false){
  symbol=symbol.trim().toUpperCase();if(!isTicker(symbol)||eid!==current()?.id)return;
  const e=current();if(e.ticker.trim().toUpperCase()!==symbol)return;
  const key=symbol,existing=quoteCache.get(key);
  if(!force && existing&&Date.now()-existing.at<300000){applyQuote(existing.quote,eid);return;}
  if(!force && quoteAttempts.has(key) && Date.now()-quoteAttempts.get(key)<60000)return;
  quoteAttempts.set(key,Date.now());
  if(quoteController)quoteController.abort();quoteController=new AbortController();
  try{
    const feed=(e.strategy==='day'?dayIndexMeta[symbol]?.feed:null)||symbol;
    const url='https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(feed)+'?range=1d&interval=1d';
    const data=await fetchJsonMarket(url,quoteController),meta=data?.chart?.result?.[0]?.meta;
    if(!meta||!Number.isFinite(Number(meta.regularMarketPrice))||Number(meta.regularMarketPrice)<=0)throw Error('No valid last price');
    const quote={symbol:symbol,name:(e.strategy==='day'?dayIndexMeta[symbol]?.title:null)||meta.longName||meta.shortName||'',price:Number(meta.regularMarketPrice),currency:meta.currency||'USD',asOf:Number(meta.regularMarketTime)>0?new Date(meta.regularMarketTime*1000).toISOString():isoNow(),type:meta.instrumentType||'EQUITY'};
    quoteCache.set(key,{quote,at:Date.now()});applyQuote(quote,eid);
  }catch(err){if(err.name!=='AbortError' && eid===current()?.id){setLookupHelp('Quote unavailable or delayed. Your ticker and research are still saved; try Refresh price or open StockAnalysis.com.',true);updateQuotePanel();}}
}
function applyQuote(q,eid){
  const e=current();if(!e || eid!==e.id || e.ticker.trim().toUpperCase()!==q.symbol)return;
  e.lastPrice=q.price;e.lastPriceCurrency=q.currency;e.lastPriceSymbol=q.symbol;e.lastPriceAt=q.asOf;
  if(q.name){e.company=q.name;const input=$('field-company');if(input&&document.activeElement!==input)input.value=q.name;}
  e.instrumentType=q.type;
  const title=document.querySelector('#editorPanel .editor-top h3');if(title)title.innerHTML=`${esc(e.ticker.toUpperCase())}${e.company?` <span class="muted">· ${esc(e.company)}</span>`:''}`;
  setLookupHelp('Last reported market quote. Prices can lag exchange feeds; not guaranteed real time.');
  updateQuotePanel();autosave();renderList();
}
function selectCompany(index){
  const e=current(),item=suggestions[index];if(!item||!e||suggestionEntryId!==e.id)return;
  e.ticker=item.symbol;e.company=item.name;e.instrumentType=item.type;e.lastPrice=null;e.lastPriceSymbol='';e.lastPriceAt='';
  const tick=$('field-ticker'),name=$('field-company');if(tick)tick.value=item.symbol;if(name)name.value=item.name;
  clearSuggestions();updateQuotePanel();autosave();
  const title=document.querySelector('#editorPanel .editor-top h3');if(title)title.innerHTML=`${esc(e.ticker)} <span class="muted">· ${esc(e.company)}</span>`;
  renderList();loadQuote(e.ticker,e.id,true);
}
function planLookup(target){
  const e=current();if(!e)return;
  if(searchTimer)clearTimeout(searchTimer);if(quoteTimer)clearTimeout(quoteTimer);
  if(searchController)searchController.abort();
  const q=target.value.trim(),id=e.id;
  if(target.dataset.field==='ticker'){
    e.lastPriceSymbol=e.ticker.trim().toUpperCase()===e.lastPriceSymbol?e.lastPriceSymbol:'';
    if(!q){clearSuggestions();updateQuotePanel();return;}
    if(isTicker(q))quoteTimer=setTimeout(()=>loadQuote(q,id),650);
  }
  if(q.length>=2)searchTimer=setTimeout(()=>lookupCompanies(q,id),400);else clearSuggestions();
  updateQuotePanel();
}

function renderEditor(openOverride){
  const el=$('editorPanel');const e=current();
  if(!e){el.innerHTML='<div class="blank-editor"><div class="blank-icon">↗</div><h3>Start with a thesis.</h3><p class="muted">Create an analysis, collect evidence as you research, and come back to see how your thinking evolved.</p><button type="button" class="btn btn-primary" id="emptyNewButton">+ New analysis</button></div>';return;}
  const opened=openOverride ?? new Set([stageList(e)[0].key]);
  const m=metrics(e);
  const snapshots=[...e.snapshots].sort((a,b)=>b.at.localeCompare(a.at));
  const logs=[...e.logs].sort((a,b)=>b.at.localeCompare(a.at));
  el.innerHTML=`
    <div class="editor-top"><div><p class="section-overline">INVESTMENT RESEARCH / ${esc(STRATEGIES[e.strategy].name.toUpperCase())}</p><h3>${esc(e.ticker.trim().toUpperCase()||'Untitled analysis')}${e.company?` <span class="muted">· ${esc(e.company)}</span>`:''}</h3><div class="editor-heading-meta"><span class="status-pill ${esc(e.status)}">${esc(e.status)}</span><span class="muted small">Updated ${dateLabel(e.updatedAt)}</span></div></div><div class="editor-actions"><button type="button" class="btn btn-secondary small-btn" id="snapshotButton">Save snapshot</button><button type="button" class="btn btn-danger small-btn" id="deleteButton">Delete</button></div></div>
    <section class="section-block"><div class="section-header"><h4>01 · Research idea</h4><span class="section-tag">AUTOSAVED</span></div><div class="form-grid">${field('Ticker / symbol','ticker',e.ticker)}${field('Company / asset','company',e.company)}${field('Idea / setup name','setup',e.setup)}${selectField('Research status','status',e.status,STATUSES)}</div>${quotePanelMarkup(e)}</section>
    <section class="section-block"><div class="section-header"><div><h4>02 · ${e.strategy==='day'?'Five-stage intraday framework':'Five-step investment framework'}</h4><p>${e.strategy==='day'?'Readings show directional bias, not automatic entry approval. Record three intraday observations per checked marker.':'Check your evidence, enter the data, and assess the weight of your findings.'}</p></div></div>
      <div class="progress-section"><div class="progress-top"><span>Research checklist progress</span><strong id="progressPercent">${m.pct}%</strong></div><div class="progress-line"><div style="width:${m.pct}%" id="progressBar"></div></div><div class="progress-note" id="progressNote">${m.done} of ${m.total} prompts checked · ${m.rated} of ${stageList(e).length-(e.stages.options?.rating==='na'?1:0)} stages scored. Completion is not a buy signal.</div><div id="overallSignal">${meterMarkup(allSignals(e),true)}</div></div>
      ${e.strategy==='day'?'<div class="day-trade-focus"><strong>Enter only if the reward justifies the risk.</strong><p>For Calls, a bullish directional score may support the thesis; for Puts, a bearish score may support it. Neither implies positive expectancy. All markets and options inputs are manual; price lookup may be delayed.</p></div>':''}<div class="stage-list">${stageList(e).map((s,i)=>stageMarkup(e,s,i,opened.has(s.key))).join('')}</div></section>
    <section class="section-block"><div class="section-header"><div><h4>03 · Thesis &amp; decision</h4><p>Separate your analysis from your intended action.</p></div></div>
      <div class="form-grid">${textArea('My investment thesis','thesis',e.thesis,'Why this company, why this direction, and why now?')}${textArea('What would invalidate my thesis?','invalidationReason',e.invalidationReason,'Specify what would make you change your mind.')}${selectField('Current decision','decision',e.decision,DECISIONS)}</div>
      <div class="form-grid three" style="margin-top:12px">${field(e.strategy==='day'?'Underlying entry level':'Entry / purchase price','entryPrice',e.entryPrice)}${field(e.strategy==='day'?'Underlying price target':'Target price','targetPrice',e.targetPrice)}${field(e.strategy==='day'?'Underlying invalidation level':'Invalidation / stop price','stopPrice',e.stopPrice)}${field('Capital at risk / allocated','capital',e.capital)}${['leaps','day'].includes(e.strategy)?'':field('Number of shares / units','quantity',e.quantity)}${dateField('Position opened','openedDate',e.openedDate)}${dateField('Position closed','closedDate',e.closedDate)}${field('Exit / sale price','exitPrice',e.exitPrice)}</div><p class="outcome-note" id="riskRewardText">${esc(riskReward(e))}</p><p class="outcome-note" id="realizedText">${esc(outcomeText(e))}</p></section>
    <section class="section-block"><div class="section-header"><h4>04 · ${e.strategy==='day'?'Day trade contract &amp; Greeks':e.strategy==='leaps'?'LEAPS contract details':e.strategy==='swings'?'Swing setup':'Long-term portfolio plan'}</h4></div>${extraFields(e)}</section>
    <section class="section-block"><div class="section-header"><h4>05 · Lessons &amp; follow-up</h4></div><div class="form-grid">${textArea('What did I learn / what would I do differently?','lesson',e.lesson,'What was right, wrong, missed, or worth repeating?')}</div></section>
    <section class="section-block"><div class="section-header"><div><h4>06 · Timestamped research log</h4><p>Add updates as new data appears. These notes are kept in order.</p></div><span class="section-tag">${e.logs.length} UPDATES</span></div>
      <div class="journal-note-form"><label class="visually-hidden" for="journalUpdate">Research update</label><textarea id="journalUpdate" placeholder="Example: Nov 18 — CPI softened, but sector breadth remains weak. Keeping thesis neutral."></textarea><div class="note-submit"><span class="hint-text">Updates are permanent within this entry until you delete the entire analysis.</span><button class="btn btn-secondary small-btn" type="button" id="addLogButton">+ Add dated update</button></div></div>
      <div class="log-list">${logs.length?logs.map(l=>`<div class="note-item"><div class="note-top"><strong class="section-overline">RESEARCH UPDATE</strong><time>${dateLabel(l.at)}</time></div><p>${esc(l.text)}</p></div>`).join(''):'<p class="empty-text">No dated research updates yet.</p>'}</div>
    </section>
    <section class="section-block"><div class="section-header"><div><h4>07 · Saved analysis snapshots</h4><p>Save a version whenever your thesis or decision changes significantly.</p></div><span class="section-tag">${e.snapshots.length} VERSIONS</span></div>
      ${snapshots.length?snapshots.map((s,i)=>`<div class="snapshot-item"><div><strong>Version ${e.snapshots.length-i} · ${esc(s.data.decision)}</strong><small>Saved ${dateLabel(s.at)} · ${esc(s.data.ticker||'Untitled')}</small></div><button type="button" class="btn btn-secondary small-btn" data-view-snapshot="${esc(s.id)}">Review version</button></div>`).join(''):'<p class="empty-text">No snapshots yet. Use “Save snapshot” to preserve a point-in-time version of all research fields.</p>'}
    </section>`;
  // On reopening an analysis, refresh an absent or stale last quote once (rate-limited).
  if(isTicker(e.ticker)&&e.ticker.trim()&&(!e.lastPriceAt||!Number.isFinite(Date.parse(e.lastPriceAt))||Date.now()-Date.parse(e.lastPriceAt)>300000)){
    setTimeout(()=>{if(current()?.id===e.id)loadQuote(e.ticker,e.id);},80);
  }
}
function captureOpen(){return new Set([...$('editorPanel').querySelectorAll('details[data-stage][open]')].map(x=>x.dataset.stage));}
function rerenderEditor(){const open=captureOpen();renderEditor(open);}
function renderHistory(){
  const filtered=filteredItems($('historyScope').value,$('historySearch').value,$('historyStatus').value),el=$('historyResults');
  if(!filtered.length){el.innerHTML='<div class="empty-history"><h4>No analyses found</h4><p>Save your first research idea or adjust the history filters.</p></div>';return;}
  el.innerHTML=filtered.map(e=>{const m=metrics(e),summary=allSignals(e);return `<div class="history-item"><div><h4>${esc(e.ticker.trim().toUpperCase()||'UNTITLED')} <span class="muted">${esc(e.company)}</span></h4><p>${esc(e.setup||e.thesis.slice(0,150)||'No thesis recorded yet.')}</p><div class="history-facts"><span class="history-fact">${esc(STRATEGIES[e.strategy].name)}</span><span class="status-pill ${esc(e.status)}">${esc(e.status)}</span><span class="history-fact">${esc(e.decision)}</span><span class="history-fact">${m.done}/${m.total} checked</span><span class="history-fact">${esc(summary.rating?summary.rating[0].toUpperCase()+summary.rating.slice(1):'Meter incomplete')}</span><span class="history-fact">${e.logs.length} updates · ${e.snapshots.length} snapshots</span>${realizedOutcome(e)?`<span class="history-fact">Return ${realizedOutcome(e).pct>=0?'+':''}${realizedOutcome(e).pct.toFixed(2)}%</span>`:''}</div></div><div class="history-actions"><span class="muted small">${shortDate(e.updatedAt)}</span><button type="button" class="btn btn-secondary small-btn" data-history-open="${esc(e.id)}">Open analysis</button></div></div>`;}).join('');
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
  $('snapshotContent').innerHTML=`<div class="snapshot-section"><h4>Decision &amp; thesis</h4><p>Status: ${esc(x.status)} · Decision: ${esc(x.decision)}</p><p>${esc(x.thesis||'No thesis recorded')}</p><p>Invalidation: ${esc(x.invalidationReason||'Not recorded')}</p></div>${stageList(x).map(st=>{const v=x.stages[st.key];const observations=v.data.map(d=>`${d.metric}: ${d.value}${d.source?` (${d.source})`:''}`).join('\n');const snapshotScore=stageSignal(x,st.key);return `<div class="snapshot-section"><h4>${esc(st.name)} · ${esc(snapshotScore.rating||'Insufficient readings')} · ${v.checks.filter(Boolean).length}/${st.checks.length} checked</h4><p>${esc(v.notes||'No analysis notes')}</p><p>${v.markers.map((m,i)=>v.checks[i]?`${m.name}: ${m.readings.join(' → ')} (${m.direction})`:'').filter(Boolean).map(esc).join('<br>')||'No numeric evidence saved'}</p>${observations?`<p>Data points:\n${esc(observations)}</p>`:''}</div>`;}).join('')}<div class="snapshot-section"><h4>Trade / contract record</h4><p>Entry: ${esc(x.entryPrice||'—')} · Target: ${esc(x.targetPrice||'—')} · Invalidation: ${esc(x.stopPrice||'—')}</p><p>Exit: ${esc(x.exitPrice||'—')} · Capital: ${esc(x.capital||'—')} · Shares: ${esc(x.quantity||'—')}</p>${['leaps','day'].includes(x.strategy)?`<p>${esc(x.optionType)} · Strike ${esc(x.strike||'—')} · Expiration ${esc(x.expiration||'—')} · Entry premium ${esc(x.premium||'—')} · Exit premium ${esc(x.exitPremium||'—')}</p>${x.strategy==='day'?`<p>Target premium ${esc(x.targetPremium||'—')} · Stop premium ${esc(x.stopPremium||'—')} · Delta ${esc(x.delta||'—')} · Gamma ${esc(x.gamma||'—')} · Theta ${esc(x.theta||'—')} · Vega ${esc(x.vega||'—')} · IV ${esc(x.ivPercent||'—')}%</p>`:''}`:''}<p>Lessons: ${esc(x.lesson||'Not recorded')}</p></div>`;
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
    if(e.strategy==='day' && ['premium','targetPremium','stopPremium','contracts','maxDailyLoss'].includes(key)){const box=$('dayPremiumRisk');if(box)box.textContent=dayPremiumRisk(e);}
    if(e.strategy==='day' && ['bidPrice','askPrice'].includes(key)){const box=$('daySpreadNote');if(box)box.textContent=daySpreadSummary(e);}
    if(['entryPrice','exitPrice','quantity','premium','exitPremium','contracts','status','direction'].includes(key))$('realizedText').textContent=outcomeText(e);
    if(['ticker','company','status'].includes(key)){
      const title=document.querySelector('#editorPanel .editor-top h3');
      if(title)title.innerHTML=`${esc(e.ticker.trim().toUpperCase()||'Untitled analysis')}${e.company?` <span class="muted">· ${esc(e.company)}</span>`:''}`;
      const pill=document.querySelector('#editorPanel .editor-top .status-pill');
      if(pill){pill.className=`status-pill ${e.status}`;pill.textContent=e.status;}
      renderList();
    }
    if(['ticker','company'].includes(key))planLookup(target);
    if(key==='ticker')updateResearchLinks(e);
    return;
  }
  const markerEl=target.closest('[data-marker-stage][data-marker-index]');
  if(markerEl && target.dataset.markerInput){
    const stageKey=markerEl.dataset.markerStage,idx=Number(markerEl.dataset.markerIndex),st=e.stages[stageKey],m=st?.markers?.[idx];
    if(!m)return;
    if(target.dataset.markerInput==='reading'){m.readings[Number(target.dataset.readingIndex)]=target.value;}
    if(target.dataset.markerInput==='name'){m.name=target.value;updateResearchLinks(e);}
    if(target.dataset.markerInput==='direction'){m.direction=target.value;}
    syncStageRating(e,stageKey);autosave();redrawMeters();return;
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
    if(!confirm(`Import ${loaded.length} journal analyses and ${loadedCf.length} confluence setups? This REPLACES the records currently saved in this browser. Export your existing backup first if needed.`))return;
    const old=app.entries,oldCf=cf.entries;app.entries=loaded;cf.entries=loadedCf;
    if(!persist()){app.entries=old;cf.entries=oldCf;persist();throw Error('Import could not be saved to browser storage.');}
    setStrategy(app.strategy);if(app.view==='history')renderHistory();refreshConfluenceSidebar();showToast(`Imported ${loaded.length} analyses and ${loadedCf.length} confluence setups.`);
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
  editor.addEventListener('input',e=>{const t=e.target;if(t.matches('[data-field],[data-notes-stage],[data-data-field],[data-marker-input]'))updateField(t);});
  editor.addEventListener('change',e=>{
    const t=e.target;if(t.matches('[data-field],[data-notes-stage],[data-data-field],[data-marker-input]')){
      updateField(t);
    }
    if(t.matches('[data-check-stage]')){const cur=current(),stage=cur?.stages[t.dataset.checkStage],i=Number(t.dataset.checkIndex);if(stage&&i>=0&&i<stage.checks.length){stage.checks[i]=t.checked;syncStageRating(cur,t.dataset.checkStage);autosave();rerenderEditor();}}
    if(t.matches('[data-stage-na]')){const cur=current();if(cur&&cur.strategy==='long-term'){cur.stages.options.rating=t.checked?'na':'';autosave();rerenderEditor();}}
  });
  editor.addEventListener('click',e=>{
    const t=e.target,b=t.closest('button');if(!b)return;
    if(b.id==='emptyNewButton'){newEntry();return;}
    if(b.id==='snapshotButton'){savedSnapshot();return;}
    if(b.id==='deleteButton'){deleteEntry();return;}
    if(b.id==='addLogButton'){addLog();return;}
    if(b.id==='refreshQuoteButton'){const cur=current();if(cur?.ticker)loadQuote(cur.ticker,cur.id,true);return;}
    if(b.dataset.selectCompany!==undefined){selectCompany(Number(b.dataset.selectCompany));return;}
    if(b.dataset.addData){addData(b.dataset.addData);return;}
    if(b.dataset.removeData){removeData(b.dataset.removeStage,b.dataset.removeData);return;}
    if(b.dataset.viewSnapshot){persist();showSnapshot(b.dataset.viewSnapshot);return;}
  });
  editor.addEventListener('keydown',e=>{if(e.key==='Escape'&&e.target.matches('[data-field="ticker"],[data-field="company"]'))clearSuggestions();});
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
setStrategy('day');
setView('journal');
