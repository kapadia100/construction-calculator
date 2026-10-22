// GharGanit calculation engine (Pakistan). Pure functions; works in browser and Node.
// ALL default rates/coefficients are APPROXIMATE MARKET RATES as found Oct 2026 (see sources.md) – editable, not guaranteed.
(function(root){
const HRm=()=>root.HR||(typeof require!=='undefined'?require('./hr.js'):null);
const RATES_DATE='13 Oct 2026';
// item: k key, s stage, c cat(grey|finish), t type(mat|lab|item), u unit, q qty per sq ft covered (basis 'area') or per floor ('fixed'),
// sc scope: all|gf|top|basement|site ; r rate (Rs/unit); rcc:true -> multiplied by basementRcc on basement floor
const I=(k,s,c,t,n,u,q,r,o)=>Object.assign({k,s,c,t,n,u,q,r,b:'area',sc:'all'},o||{});
const ITEMS=[
 I('exc','Excavation','grey','lab','Excavation & disposal','cft',1.2,30,{sc:'gf'}),
 I('fill','Excavation','grey','mat','Earth filling & compaction','cft',0.6,35,{sc:'gf'}),
 I('ft_cem','Foundation / footings','grey','mat','Cement (PCC + footings)','bag',0.07,1500,{sc:'gf'}),
 I('ft_stl','Foundation / footings','grey','mat','Steel Grade 60 – footings','kg',0.55,275,{sc:'gf'}),
 I('ft_snd','Foundation / footings','grey','mat','Sand (Chenab) – PCC/footings','cft',0.12,90,{sc:'gf'}),
 I('ft_crs','Foundation / footings','grey','mat','Crush / bajri – PCC/footings','cft',0.3,150,{sc:'gf'}),
 I('ft_brk','Foundation / footings','grey','mat','Bricks – foundation masonry','nos',3,20,{sc:'gf'}),
 I('ft_lab','Foundation / footings','grey','lab','Labour – foundation','sqft',1,60,{sc:'gf'}),
 I('dpc','DPC','grey','item','DPC 1.5in + bitumen coat','sqft',0.25,120,{sc:'gf'}),
 I('col_stl','RCC columns','grey','mat','Steel Grade 60 – columns','kg',0.75,275,{rcc:1}),
 I('col_cem','RCC columns','grey','mat','Cement – columns','bag',0.05,1500,{rcc:1}),
 I('col_snd','RCC columns','grey','mat','Sand (Chenab) – columns','cft',0.08,90,{rcc:1}),
 I('col_crs','RCC columns','grey','mat','Crush – columns','cft',0.15,150,{rcc:1}),
 I('bm_stl','RCC beams','grey','mat','Steel Grade 60 – beams','kg',0.85,275,{rcc:1}),
 I('bm_cem','RCC beams','grey','mat','Cement – beams','bag',0.05,1500,{rcc:1}),
 I('bm_snd','RCC beams','grey','mat','Sand (Chenab) – beams','cft',0.08,90,{rcc:1}),
 I('bm_crs','RCC beams','grey','mat','Crush – beams','cft',0.15,150,{rcc:1}),
 I('sl_stl','RCC slab (lintel/lanter)','grey','mat','Steel Grade 60 – slab','kg',1.0,275,{rcc:1}),
 I('sl_cem','RCC slab (lintel/lanter)','grey','mat','Cement – slab','bag',0.07,1500,{rcc:1}),
 I('sl_snd','RCC slab (lintel/lanter)','grey','mat','Sand (Chenab) – slab','cft',0.14,90,{rcc:1}),
 I('sl_crs','RCC slab (lintel/lanter)','grey','mat','Crush – slab','cft',0.45,150,{rcc:1}),
 I('st_stl','RCC slab (lintel/lanter)','grey','mat','Steel – stairs, lintels, sunshades','kg',0.25,275),
 I('shut','RCC slab (lintel/lanter)','grey','item','Shuttering / centering hire','sqft',1,90),
 I('rcc_lab','RCC slab (lintel/lanter)','grey','lab','Labour – RCC (columns, beams, slab)','sqft',1,200),
 I('b9','Brickwork','grey','mat','Bricks A-class – 9in walls','nos',12,20),
 I('b45','Brickwork','grey','mat','Bricks A-class – 4.5in walls','nos',5,20),
 I('b_cem','Brickwork','grey','mat','Cement – masonry mortar','bag',0.07,1500),
 I('b_snd','Brickwork','grey','mat','Sand (Ravi) – masonry','cft',0.5,70),
 I('b_lab','Brickwork','grey','lab','Labour – brickwork','sqft',1,110),
 I('p_cem','Plaster','grey','mat','Cement – plaster','bag',0.08,1500),
 I('p_snd','Plaster','grey','mat','Sand (Ravi) – plaster','cft',0.6,70),
 I('p_lab','Plaster','grey','lab','Labour – plaster','sqft',1,80),
 I('roof','Roof treatment','grey','item','Roof insulation, mud + tile/waterproofing','sqft',1,220,{sc:'top'}),
 I('e_cond','Electrical','grey','item','Conduits & boxes (in walls/slab)','sqft',1,60),
 I('pl_grey','Plumbing / sanitary','grey','item','Concealed water & drain pipes','sqft',1,90),
 I('bs_wp','Basement','grey','item','Basement retaining wall waterproofing','sqft',1,350,{sc:'basement'}),
 I('fl_tile','Flooring & tiles','finish','mat','Floor tiles (porcelain, mid-range)','sqft',0.9,260),
 I('fl_mrb','Flooring & tiles','finish','mat','Marble – stairs & skirting','sqft',0.08,300),
 I('wl_tile','Flooring & tiles','finish','mat','Wall tiles – baths & kitchen','sqft',0.4,230),
 I('fl_cem','Flooring & tiles','finish','mat','Cement + sand bedding / grout','bag',0.05,1500),
 I('fl_lab','Flooring & tiles','finish','lab','Labour – tile & marble fixing','sqft',1.4,70),
 I('door','Doors & windows','finish','item','Doors – solid wood/ply with frames','nos',0.012,40000),
 I('main_door','Doors & windows','finish','item','Main entrance door (teak/deodar)','nos',1,100000,{b:'fixed',sc:'gf'}),
 I('win','Doors & windows','finish','item','Aluminium/uPVC windows with glass (per sq ft opening)','sqft',0.12,1900),
 I('grill','Doors & windows','finish','item','Safety grills','sqft',0.12,450),
 I('e_wire','Electrical','finish','item','Wiring (copper), switches, sockets, DB','sqft',1,200),
 I('e_lite','Electrical','finish','item','Light fixtures & fans','sqft',1,80),
 I('pl_san','Plumbing / sanitary','finish','item','Sanitary ware & fittings','sqft',1,220),
 I('pl_gey','Plumbing / sanitary','finish','item','Water heater / geyser (electric)','nos',1,35000,{b:'fixed'}),
 I('pt_put','Paint','finish','mat','Putty, primer & sanding','sqft',3.5,18),
 I('pt_emu','Paint','finish','mat','Emulsion paint (2 coats)','gallon',0.022,4000),
 I('pt_ext','Paint','finish','mat','Weather-shield exterior paint','gallon',0.006,4500),
 I('pt_lab','Paint','finish','lab','Labour – painting','sqft',3.5,25),
 I('kit','Kitchen & wardrobes','finish','item','Kitchen cabinets, upper + lower','rft',24,6500,{b:'fixed'}),
 I('ward','Kitchen & wardrobes','finish','item','Wardrobes (bedrooms)','rft',16,5500,{b:'fixed'}),
 I('ceil','Kitchen & wardrobes','finish','item','False ceiling (gypsum) – partial','sqft',0.4,300),
 I('bw','Boundary wall & gate','grey','item','Boundary wall 7ft (brick, plaster) – running ft','rft',1,6200,{b:'perimeter',sc:'site'}),
 I('gate','Boundary wall & gate','finish','item','Main steel gate','nos',1,200000,{b:'fixed',sc:'site'}),
 I('ugt','Water tank','grey','item','Underground water tank (RCC, ~1,500 gal)','nos',1,180000,{b:'fixed',sc:'site'}),
 I('oht','Water tank','finish','item','Overhead tank (plastic) + pump','nos',1,70000,{b:'fixed',sc:'site'}),
 I('fin_misc','Finishing misc','finish','lab','Finishing labour & misc (cleaning, touch-ups)','sqft',1,120)
];
const STAGES=['Excavation','Foundation / footings','DPC','Basement','RCC columns','RCC beams','RCC slab (lintel/lanter)','Brickwork','Plaster','Roof treatment','Electrical','Plumbing / sanitary','Flooring & tiles','Doors & windows','Paint','Kitchen & wardrobes','Boundary wall & gate','Water tank','Finishing misc'];
const DEFAULT_SETTINGS={
 marlaSqft:225, // 225 (common/new) or 272.25 (revenue marla)
 cats:{A:{grey:3600,finish:3400},B:{grey:3200,finish:2550},C:{grey:2800,finish:1700}},
 groundAdj:5, upperExtra:2, basementPct:25, stiltPct:-20, basementRcc:1.4,
 minBUA:500, minCharge:2000000, maxFloors:4,
 margin:10, tax:0, contingency:5, designPct:2, approvalFee:150000,
 items:ITEMS,
 hr:null,
 tiers:{house:{E:'',M:'',P:''},building:{E:'',M:'',P:''}}, // PKR per sq ft covered, set by the user (blank = use the detailed rates)
 pay:[{name:'Booking / mobilisation',pct:10,weeks:1},{name:'Excavation & foundation',pct:10,weeks:3},{name:'Ground floor structure & slab',pct:15,weeks:6},{name:'Upper floor structure & slab',pct:15,weeks:6},{name:'Brickwork & plaster',pct:15,weeks:6},{name:'Electrical & plumbing',pct:10,weeks:4},{name:'Flooring, tiles & doors',pct:12,weeks:5},{name:'Paint & woodwork',pct:8,weeks:4},{name:'Handover & snag list',pct:5,weeks:2}]
};
function clone(o){return JSON.parse(JSON.stringify(o));}
function pkr(n){n=Math.round(+n||0);const s=n<0?'-':'';return s+'Rs '+Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function words(n){n=+n||0;const a=Math.abs(n);if(a>=1e7)return (n/1e7).toFixed(2)+' crore';if(a>=1e5)return (n/1e5).toFixed(2)+' lakh';return pkr(n);}
function unitSqft(u,s){return u==='sqyd'?9:u==='marla'?(+s.marlaSqft||225):1;}
function floorAreas(p){const n=Math.max(1,Math.floor(+p.floors||1)),a=[];for(let i=0;i<n;i++){const o=p.override&&p.floorAreas?p.floorAreas[i]:null;a.push(o!=null&&o!==''?+o:+p.bua||0);}return a;}
function floorsOf(p,s){const rate=s.cats[p.quality]||s.cats.B,full=p.scope!=='grey',areas=floorAreas(p),fl=[];
 const base=rate.grey+(full?rate.finish:0);
 if(p.extra==='basement'||p.extra==='stilt'){const pc=p.extra==='basement'?+s.basementPct:+s.stiltPct;fl.push({id:p.extra,name:p.extra==='basement'?'Basement':'Stilt parking',area:p.extra==='basement'&&+p.basementArea>0?+p.basementArea:(areas[0]||0),rate:base*(1+pc/100),grey:rate.grey*(1+pc/100)});}
 areas.forEach((a,i)=>{const adj=i===0?+s.groundAdj:+s.upperExtra*i;fl.push({id:'f'+i,idx:i,name:i===0?'Ground floor':'Floor '+i,area:a,rate:base*(1+adj/100),grey:rate.grey*(1+adj/100)});});
 const tr=tierRate(p,s);fl.forEach(f=>{if(tr){const sh=f.rate>0?f.grey/f.rate:.55;f.rate=tr;f.grey=tr*sh;f.tier=true;}f.cost=f.area*f.rate;f.greyCost=f.area*f.grey;f.finishCost=f.cost-f.greyCost;});return fl;}
// user's own all-in rate per sq ft for the chosen tier (Economy / Medium / Premium); null when not set
function tierRate(p,s){const t=p.tier||'M',T=(s&&s.tiers)||{},r=+((T[p.mode==='highrise'?'building':'house']||{})[t]);return r>0?r:null;}
const TIER_NAMES={E:'Economy',M:'Medium',P:'Premium'};
function tierCost(p,s){const t=p.tier||'M',rate=tierRate(p,s),e=estimate(p,s),fl=(e.floors||[]).map(f=>({name:f.label||f.name,area:Math.round(+f.area||0)})).filter(f=>f.area>0);fl.forEach(f=>f.cost=rate?f.area*rate:null);const area=fl.reduce((a,f)=>a+f.area,0);return {tier:t,tierName:TIER_NAMES[t],rate,floors:fl,area,total:rate?area*rate:null};}
function estimate(p,s){if(p.mode==='highrise'){const H=HRm(),tr=tierRate(p,s),c=H.calc(p.hr||H.DEFAULT_HR,tr?Object.assign({},s.hr||H.HR_RATES,{tierRate:tr}):(s.hr||H.HR_RATES)),sh=((s.hr||H.HR_RATES).structShare||45)/100;const grey=c.construction*sh;
  return Object.assign(c,{mode:'highrise',totalArea:c.gross,construction:c.hard,grey,finish:c.hard-grey,perSqft:c.gross?c.buildTotal/c.gross:0});}
 const fl=floorsOf(p,s),w=[],nUp=floorAreas(p).length;
 const totalArea=fl.reduce((t,f)=>t+f.area,0);let construction=fl.reduce((t,f)=>t+f.cost,0);
 const grey=fl.reduce((t,f)=>t+f.greyCost,0);
 if(totalArea<s.minBUA)w.push('Total covered area '+totalArea+' sq ft is below the minimum of '+s.minBUA+' sq ft.');
 if(construction>0&&construction<s.minCharge){w.push('Construction cost is below the minimum charge, so the minimum of '+pkr(s.minCharge)+' is used.');construction=+s.minCharge;}
 if(nUp>s.maxFloors)w.push('Floors ('+nUp+') exceed the max allowed ('+s.maxFloors+').');
 const plotSqft=(+p.plotArea||0)*unitSqft(p.plotUnit,s);
 if(plotSqft>0&&(floorAreas(p)[0]||0)>plotSqft)w.push('Ground floor area is bigger than the plot.');
 const plot=p.plotPriceMode==='perunit'?(+p.plotPrice||0)*(+p.plotArea||0):(+p.plotPrice||0);
 const margin=construction*s.margin/100,contingency=construction*s.contingency/100,design=construction*s.designPct/100+(+s.approvalFee||0),tax=(construction+margin)*s.tax/100;
 const buildTotal=construction+margin+contingency+design+tax;
 return{floors:fl,totalArea,plotSqft,construction,grey,finish:construction-grey,plot,margin,contingency,design,tax,buildTotal,grand:buildTotal+plot,perSqft:totalArea?buildTotal/totalArea:0,warnings:w};}
// BOQ rows (defaults) for every floor x item, then project edits (overrides/deletes/custom rows) applied on top.
function boqDefaults(p,s){if(p.mode==='highrise'){const H=HRm();return H.boqDefaults(p.hr||H.DEFAULT_HR,s.hr||H.HR_RATES);}
 const fl=floorsOf(p,s),rows=[],nUp=floorAreas(p).length,full=p.scope!=='grey';
 const plotSqft=(+p.plotArea||0)*unitSqft(p.plotUnit,s),perim=plotSqft>0?Math.round(4*Math.sqrt(plotSqft)):0;
 const mk=(it,fid,fname,qty)=>({key:fid+':'+it.k,floor:fname,s:it.s,c:it.c,t:it.t,n:it.n,u:it.u,qty:+qty.toFixed(2),rate:+it.r});
 s.items.forEach(it=>{if(!full&&it.c==='finish')return;
  if(it.sc==='site'){if(p.site===false)return;const q=it.b==='perimeter'?perim*it.q:it.q;if(q>0)rows.push(mk(it,'site','Site works',q));return;}
  fl.forEach(f=>{const isB=f.id==='basement'||f.id==='stilt',top=f.idx===nUp-1,gf=f.idx===0;
   if(it.sc==='gf'&&!(gf||(isB&&false)))return; if(it.sc==='top'&&!top)return; if(it.sc==='basement'&&f.id!=='basement')return;
   if(f.id==='stilt'&&it.c==='finish')return;
   let q=it.b==='fixed'?it.q:it.q*f.area; if(isB&&it.rcc)q*=+s.basementRcc||1;
   if(f.id==='basement'&&it.sc==='all'&&it.c==='finish'&&it.b==='fixed')return;
   if(q>0)rows.push(mk(it,f.id,f.name,q));});});
 const ord=fl.map(f=>f.name).concat(['Site works']);return rows.map((r,i)=>[r,i]).sort((a,b)=>ord.indexOf(a[0].floor)-ord.indexOf(b[0].floor)||a[1]-b[1]).map(x=>x[0]);}
function boq(p,s){const ed=p.edits||{};const rows=boqDefaults(p,s).filter(r=>!(ed[r.key]&&ed[r.key].del)).map(r=>{const e=ed[r.key]||{},o=Object.assign({},r,{dQty:r.qty,dRate:r.rate});['qty','rate','n','u'].forEach(f=>{if(e[f]!=null&&e[f]!=='')o[f]=f==='qty'||f==='rate'?+e[f]:e[f];});o.edited=['qty','rate','n','u'].some(f=>e[f]!=null);return o;});
 (p.custom||[]).forEach(r=>rows.push(Object.assign({custom:true,edited:true},r)));rows.forEach(r=>r.amt=(+r.qty||0)*(+r.rate||0));return rows;}
function totals(rows){const T={total:0,grey:0,finish:0,mat:0,lab:0,item:0,byStage:{},byFloor:{}};rows.forEach(r=>{T.total+=r.amt;T[r.c]=(T[r.c]||0)+r.amt;T[r.t]=(T[r.t]||0)+r.amt;T.byStage[r.s]=(T.byStage[r.s]||0)+r.amt;T.byFloor[r.floor]=(T.byFloor[r.floor]||0)+r.amt;});return T;}
function materials(rows){const m={};const map=[['Cement','bag',/Cement/],['Steel Grade 60','kg',/Steel/],['Bricks','nos',/Bricks/],['Sand','cft',/Sand/],['Crush / bajri','cft',/Crush/],['Tiles & marble','sqft',/tiles|Marble/i],['Paint','gallon',/paint \(|exterior paint/i]];
 rows.forEach(r=>map.forEach(([l,u,re])=>{if(re.test(r.n)&&r.u===u){m[l]=m[l]||{label:l,unit:u,qty:0,cost:0};m[l].qty+=+r.qty;m[l].cost+=r.amt;}}));return Object.values(m);}
function schedule(total,s){return s.pay.map(x=>({name:x.name,pct:+x.pct,weeks:+x.weeks,amount:total*x.pct/100}));}
function toCSV(rows){const q=v=>'"'+String(v).replace(/"/g,'""')+'"',L=[['Floor','Stage','Category','Type','Item','Unit','Qty','Rate (Rs)','Amount (Rs)'].map(q).join(',')];L[0]=L[0][0];
 rows.forEach(r=>L.push([r.floor,r.s,r.c,r.t,r.n,r.u,r.qty,r.rate,r.amt.toFixed(0)].map(q).join(',')));const T=totals(rows);
 [['GREY STRUCTURE TOTAL',T.grey],['FINISHING TOTAL',T.finish],['BOQ TOTAL',T.total]].forEach(([a,b])=>L.push(['','','','',a,'','','',b.toFixed(0)].map(q).join(',')));return L.join('\n');}
DEFAULT_SETTINGS.hr=JSON.parse(JSON.stringify((HRm()||{}).HR_RATES||{}));
const api={tierRate,tierCost,TIER_NAMES,RATES_DATE,STAGES,DEFAULT_SETTINGS,clone,pkr,words,unitSqft,floorAreas,floorsOf,estimate,boqDefaults,boq,totals,materials,schedule,toCSV};
if(typeof module!=='undefined')module.exports=api;else root.Calc=api;
})(this);
