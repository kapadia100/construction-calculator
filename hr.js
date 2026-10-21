// High-rise / apartment building engine + concept SVG drawings (pure; browser + Node).
// All by-law values and rates are SAMPLE / editable. Check by-laws with LDA / SBCA / CDA / your authority.
(function(root){
const clone=o=>JSON.parse(JSON.stringify(o));
const HR_RATES={ // Rs per sq ft (material+labour) unless noted. Approx. 2026 planning figures, see sources.md
 basement:5500, parking:4800, commercial:10700, residential:8000,
 heightPct:1, heightFrom:5,        // +% on rate for each floor above heightFrom
 structPct:20, structFrom:6,       // pile/raft & heavier frame surcharge on the structure share when above-ground floors >= structFrom
 structShare:45,                   // % of a floor rate that is structure (grey)
 liftCost:3000000, liftPerStop:100000, unitsPerLift:40, minLifts:2,
 fire:230, security:100,
 kvaPerUnit:4, kvaPerCommSqft:0.01, kvaRate:22000,
 waterPerUnit:60000,
 margin:10, contingency:7, designPct:4, approvals:1000000, tax:0
};
const UNIT_TYPES=[
 {id:'studio',name:'Studio',beds:0,size:450,perFloor:1,park:0.5},
 {id:'b1',name:'1 Bed',beds:1,size:650,perFloor:1,park:0.75},
 {id:'b2',name:'2 Bed',beds:2,size:950,perFloor:1,park:1},
 {id:'b3',name:'3 Bed',beds:3,size:1350,perFloor:1,park:1},
 {id:'b4',name:'4 Bed',beds:4,size:1900,perFloor:0,park:2},
 {id:'ph',name:'Penthouse',beds:4,size:3000,perFloor:1,park:2,top:true}
];
const DEFAULT_HR={plotArea:1000,plotUnit:'sqyd',plotW:0,plotD:0,plotPrice:150000000,plotPriceMode:'total',
 far:8,coverage:65,setFront:20,setRear:10,setSide:10,farExclParking:true,
 basements:3,basementCov:95,podium:1,commercial:2,residential:12,plate:0,corePct:22,commEff:75,
 units:UNIT_TYPES,commPark:1000,carArea:320,parkEff:85,lifts:0,
 sellRes:0,sellComm:0,groundAuto:true,groundArea:0,commAuto:true,commAreas:[],groundUse:'parking',qTotal:0};
// fresh projects start blank: only rates / by-law coefficients keep defaults
const BLANK_KEYS=['plotArea','plotW','plotD','plotPrice','basements','podium','commercial','residential','plate','groundArea','sellRes','sellComm','lifts'];
const EMPTY_HR=Object.assign(clone(DEFAULT_HR),Object.fromEntries(BLANK_KEYS.map(k=>[k,''])),{groundUse:'',qTotal:0,commAreas:[],units:UNIT_TYPES.map(u=>Object.assign(clone(u),{size:'',perFloor:''}))});
const SQ={sqyd:9,sqft:1};
function geom(h){const plotSqft=(+h.plotArea||0)*(SQ[h.plotUnit]||1);let W=+h.plotW,D=+h.plotD;
 if(W>0&&!(D>0))D=plotSqft/W;else if(D>0&&!(W>0))W=plotSqft/D;else if(!(W>0&&D>0)){W=Math.sqrt(plotSqft/1.5);D=W>0?plotSqft/W:0;} // one dimension given: derive the other from the area // assume 1:1.5 plot if dims not given
 const bw=Math.max(0,W-2*h.setSide),bd=Math.max(0,D-h.setFront-h.setRear);
 const footprint=bw*bd,covMax=plotSqft*h.coverage/100,autoPlate=Math.min(footprint,covMax);
 const plate=+h.plate>0?+h.plate:autoPlate;
 return{plotSqft,W,D,bw,bd,footprint,covMax,plate,plateW:bw>0?Math.sqrt(plate*bw/Math.max(bd,1)):0};}
// "60x80", "60' x 80'", "60*80" (L x W, ft) or a plain area "4800"
function parseDim(v){const t=String(v==null?'':v).toLowerCase().replace(/,/g,'').replace(/sq\.?\s*ft|sft|ft|['"’]/g,'').trim();if(!t)return null;
 const m=t.match(/^(\d*\.?\d+)\s*[x×*by]+\s*(\d*\.?\d+)$/);if(m){const L=+m[1],W=+m[2];return L>0&&W>0?{L,W,area:L*W}:null;}
 const n=t.match(/^\d*\.?\d+$/);return n&&+t>0?{area:+t}:null;}
const dimA=v=>{const d=parseDim(v);return d?d.area:0;};
// shop sizes: typed list "300, 450" or auto split of the sellable ground area
function shopSizes(h,R){const n=Math.max(0,+h.shops|0),g=+h.groundArea||0;const list=String(h.shopList||'').split(/[,;\s]+/).map(Number).filter(x=>x>0);
 if(list.length)return list;if(!n||!g)return [];const eff=(+h.commEff||75)/100;return Array.from({length:n},()=>Math.round(g*eff/n));}
function calc(h,R){R=Object.assign(clone(HR_RATES),R||{});
 if(h.uSizeAuto&&(h.units||[]).length===1&&+h.units[0].perFloor>0){const pl0=geom(h).plate;h=Object.assign({},h,{units:[Object.assign({},h.units[0],{size:Math.round(pl0*(1-(+h.corePct||0)/100)/(+h.units[0].perFloor))})]});}const g=geom(h),w=[],plate=g.plate;
 const nB=Math.max(0,+h.basements|0),nP=Math.max(0,+h.podium|0),nC=Math.max(0,+h.commercial|0),nR=Math.max(0,+h.residential|0);
 const above=nP+nC+nR,totalFloors=above+nB,bPlate=g.plotSqft*h.basementCov/100;
 const types=h.units||[],hasTop=types.some(t=>t.top&&+t.perFloor>0)&&nR>0,typFloors=Math.max(0,nR-(hasTop?1:0));
 const core=plate*h.corePct/100,resSellFloor=plate-core;
 const typArea=types.filter(t=>!t.top).reduce((a,t)=>a+t.size*t.perFloor,0),topArea=types.filter(t=>t.top).reduce((a,t)=>a+t.size*t.perFloor,0);
 if(typArea>resSellFloor+1&&typFloors>0)w.push(`Typical floor unit mix (${Math.round(typArea)} sq ft) is bigger than the sellable area per floor (${Math.round(resSellFloor)} sq ft).`);
 if(hasTop&&topArea>resSellFloor+1)w.push(`Penthouse floor units (${Math.round(topArea)} sq ft) are bigger than the sellable area per floor (${Math.round(resSellFloor)} sq ft).`);
 const unitRows=types.map(t=>{const per=+t.perFloor||0,floors=t.top?(hasTop?1:0):typFloors,count=per*floors;return{id:t.id,name:t.name,size:+t.size,perFloor:per,floors,count,area:count*t.size,park:count*(+t.park||0),top:!!t.top};});
 const totalUnits=unitRows.reduce((a,u)=>a+u.count,0),resSell=unitRows.reduce((a,u)=>a+u.area,0);
 const floors=[];for(let i=nB;i>=1;i--){const ba=h.bAreas||[],own=+ba[i-1]>0?+ba[i-1]:(+ba[0]>0?+ba[0]:bPlate);floors.push({key:'B'+i,type:'basement',label:'Basement '+i,area:own,lvl:-i});}
 const GU={commercial:'Ground – commercial / shops',mixed:'Ground – mixed use',lobby:'Ground – lobby + shops'};
 const PL=[],CL=[];for(let i=0;i<nP;i++)PL.push({key:'P'+i,type:'parking',label:'Podium parking '+(i+1),area:+h.parkArea>0?+h.parkArea:plate});
 for(let i=0;i<nC;i++)CL.push({key:'C'+i,type:'commercial',label:'Commercial '+(i+1),area:plate});
 const gNon=GU[h.groundUse]&&nC>0,order=gNon?[CL[0],...PL,...CL.slice(1)]:[...PL,...CL];
 if(gNon)CL[0].label=GU[h.groundUse];else if(PL[0])PL[0].label='Ground parking';
 if(!gNon&&PL.length)PL.slice(1).forEach((f,i)=>f.label='Podium parking '+(i+1));
 let lvl=0;order.forEach(f=>{f.lvl=lvl++;floors.push(f);});
 for(let i=0;i<nR;i++)floors.push({key:'R'+i,type:'residential',label:(hasTop&&i===nR-1)?'Penthouse floor':'Residential '+(i+1),area:plate,lvl:lvl++});
 // user-chosen built areas: ground floor (level 0) and each commercial floor
 floors.forEach(f=>{if(f.type==='commercial'&&h.commAuto===false){const v=+(h.commAreas||[])[+f.key.slice(1)];if(v>0)f.area=v;}if(f.lvl===0&&h.groundAuto===false&&+h.groundArea>0)f.area=+h.groundArea;});
 const ground=floors.find(f=>f.lvl===0);if(ground&&h.groundAuto===false){if(ground.area>g.plotSqft+1)w.push(`Ground floor area (${Math.round(ground.area)} sq ft) is bigger than the plot (${Math.round(g.plotSqft)} sq ft).`);else if(ground.area>g.covMax+1)w.push(`Ground floor area (${Math.round(ground.area)} sq ft) is above the allowed coverage (${h.coverage}% = ${Math.round(g.covMax)} sq ft).`);}
 const commGross=floors.filter(f=>f.type==='commercial').reduce((a,f)=>a+f.area,0),commSell=commGross*h.commEff/100;
 const sp=above>=R.structFrom?R.structShare/100*R.structPct/100:0;
 floors.forEach(f=>{const base=R[f.type],hp=f.lvl>R.heightFrom?(f.lvl-R.heightFrom)*R.heightPct/100:0;f.rate=base*(1+hp+(f.lvl>=0||f.type==='basement'?sp:0));f.cost=f.area*f.rate;});
 const gross=floors.reduce((a,f)=>a+f.area,0),grossAbove=floors.filter(f=>f.lvl>=0).reduce((a,f)=>a+f.area,0);
 const farArea=h.farExclParking?floors.filter(f=>f.type==='commercial'||f.type==='residential').reduce((a,f)=>a+f.area,0):grossAbove;
 const farUsed=g.plotSqft?farArea/g.plotSqft:0;if(farUsed>h.far+1e-9)w.push(`FAR used ${farUsed.toFixed(2)} is above the allowed ${h.far} (sample by-law value).`);
 if(+h.plate>0&&+h.plate>g.covMax+1)w.push(`Floor plate is bigger than the allowed ground coverage (${h.coverage}% = ${Math.round(g.covMax)} sq ft).`);
 if(+h.plate>0&&+h.plate>g.footprint+1)w.push(`Floor plate is bigger than the area left inside the setbacks (${Math.round(g.footprint)} sq ft).`);
 const reqRes=unitRows.reduce((a,u)=>a+u.park,0),reqComm=h.commPark>0?commGross/h.commPark:0,required=Math.ceil(reqRes+reqComm);
 const parkArea=floors.filter(f=>f.type==='basement'||f.type==='parking').reduce((a,f)=>a+f.area,0),provided=Math.floor(parkArea*h.parkEff/100/(h.carArea||350));
 if(provided<required)w.push(`Parking short: ${required} spaces required, ${provided} provided. Add basement/podium floors or reduce units.`);
 const construction=floors.reduce((a,f)=>a+f.cost,0);
 const lifts=totalFloors>0?Math.max(+h.lifts||Math.max(R.minLifts,Math.ceil(totalUnits/(R.unitsPerLift||40))),0):0,stops=totalFloors;
 const ex={lifts:lifts*(R.liftCost+R.liftPerStop*stops),fire:gross*R.fire,security:gross*R.security,generator:(totalUnits*R.kvaPerUnit+commGross*R.kvaPerCommSqft)*R.kvaRate,water:totalUnits*R.waterPerUnit};
 const extras=Object.values(ex).reduce((a,b)=>a+b,0),hard=construction+extras;
 const margin=hard*R.margin/100,contingency=hard*R.contingency/100,design=hard*R.designPct/100+R.approvals,tax=(hard+margin)*R.tax/100;
 const buildTotal=hard+margin+contingency+design+tax;
 const plot=h.plotPriceMode==='perunit'?(+h.plotPrice||0)*(+h.plotArea||0):(+h.plotPrice||0);
 const grand=buildTotal+plot,sellable=resSell+commSell;
 const revenue=resSell*(+h.sellRes||0)+commSell*(+h.sellComm||0),profit=revenue-grand;
 if(!plate)w.push('Floor plate is 0. Check plot size and setbacks.');
 return{ground:ground?ground.area:0,groundType:ground?ground.type:'',g,plate,core,resSellFloor,typFloors,hasTop,floors,nB,nP,nC,nR,above,totalFloors,gross,grossAbove,farArea,farUsed,unitRows,totalUnits,resSell,commGross,commSell,sellable,
  efficiency:gross?sellable/gross*100:0,loading:sellable?(gross/sellable-1)*100:0,required,provided,parkArea,lifts,ex,extras,construction,hard,margin,contingency,design,tax,buildTotal,plot,grand,
  perSellable:sellable?grand/sellable:0,perUnit:totalUnits?grand/totalUnits:0,revenue,profit,marginPct:revenue?profit/revenue*100:0,warnings:w};}
// ---------- BOQ ----------
const B=(s,c,t,n,u,q,r,basis)=>({s,c,t,n,u,q,r,basis});
const HR_ITEMS=[ // q = quantity per basis unit
 B('Piling / raft foundation','grey','item','Bored piles / raft (plot footprint)','sqft',1,1800,'footprint'),
 B('Structure','grey','mat','Steel Grade 60','kg',5.2,275,'gross'),B('Structure','grey','mat','Cement 50 kg','bag',0.55,1500,'gross'),
 B('Structure','grey','mat','Crush / bajri','cft',1.5,150,'gross'),B('Structure','grey','mat','Sand (Chenab)','cft',0.9,90,'gross'),
 B('Structure','grey','item','Shuttering / formwork hire','sqft',1,140,'gross'),B('Structure','grey','lab','Labour – RCC frame','sqft',1,350,'gross'),
 B('Masonry','grey','mat','Blocks / bricks (partitions)','nos',9,22,'above'),B('Masonry','grey','lab','Labour – masonry & plaster','sqft',1,180,'above'),
 B('Basement works','grey','item','Retaining walls, waterproofing, dewatering','sqft',1,900,'basement'),
 B('MEP','grey','item','Electrical (wiring, DBs, risers, lighting)','sqft',1,450,'gross'),B('MEP','grey','item','Plumbing, drainage & sanitary','sqft',1,350,'above'),
 B('MEP','finish','item','HVAC provisions & ventilation (basement jet fans)','sqft',1,250,'gross'),
 B('Lifts','finish','item','Passenger / service lifts','nos',1,0,'lifts'),
 B('Fire fighting','finish','item','Sprinklers, hydrants, pumps, alarms','sqft',1,230,'gross'),
 B('Facade','finish','item','Facade – glazing / ACP / paint (wall area)','sqft',1,2200,'facade'),
 B('Finishing','finish','item','Apartment finishing (floors, doors, kitchens, baths)','sqft',1,2600,'resSell'),
 B('Finishing','finish','item','Commercial shell finishing','sqft',1,1500,'commGross'),
 B('Common areas','finish','item','Lobbies, corridors, stair & core finishes','sqft',1,1800,'core'),
 B('Common areas','finish','item','Parking floor finishes, marking, ramps','sqft',1,350,'parkArea'),
 B('Services','finish','item','Generator (kVA)','kVA',1,22000,'kva'),B('Services','finish','item','Water tanks, pumps & filtration (per unit)','nos',1,60000,'units'),
 B('Services','finish','item','CCTV & security','sqft',1,100,'gross'),
 B('External works','finish','item','Boundary, landscaping, driveway (plot)','sqft',1,350,'plot')];
function boqDefaults(h,R){R=Object.assign(clone(HR_RATES),R||{});const c=calc(h,R),fh=10;
 const per=Math.sqrt(c.plate)*4,basis={footprint:Math.max(c.plate,c.nB?c.g.plotSqft*h.basementCov/100:0),gross:c.gross,above:c.grossAbove,basement:c.nB*c.g.plotSqft*h.basementCov/100,
  lifts:c.lifts,facade:per*fh*c.above,resSell:c.resSell,commGross:c.commGross,core:c.core*c.above,parkArea:c.parkArea,kva:c.totalUnits*R.kvaPerUnit+c.commGross*R.kvaPerCommSqft,units:c.totalUnits,plot:Math.max(0,c.g.plotSqft-c.plate)};
 const items=(R.items&&R.items.length?R.items:HR_ITEMS);
 return items.map((it,i)=>{let rate=it.r;if(it.basis==='lifts')rate=R.liftCost+R.liftPerStop*c.totalFloors;
  return{key:'hr:'+i,floor:'Building',s:it.s,c:it.c,t:it.t,n:it.n,u:it.u,qty:+((basis[it.basis]||0)*it.q).toFixed(2),rate};}).filter(r=>r.qty>0);}
// ---------- drawings ----------
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COL={basement:'#cfd2e6',parking:'#bde0fe',commercial:'#ffe5a0',residential:'#bfdbfe',penthouse:'#c7d2fe',core:'#e2e8f0',corr:'#f1f5f9'};
const STAMP=(w,y)=>`<text x="${w/2}" y="${y}" text-anchor="middle" font-size="12" fill="#c0392b" font-weight="700">CONCEPT SKETCH – NOT FOR CONSTRUCTION</text>`;
const wrap=(w,h,body,title)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Nunito,Segoe UI,Arial,sans-serif"><rect width="${w}" height="${h}" fill="#fff"/><text x="12" y="22" font-size="15" font-weight="800" fill="#475569">${esc(title)}</text>${body}${STAMP(w,h-10)}</svg>`;
function sectionSVG(c,name){const maxA=Math.max(...c.floors.map(f=>f.area),1),n=c.floors.length,fh=Math.max(10,Math.min(26,560/Math.max(n,1))),W=420,bx=120,bw=200,top=40,gy=top+c.above*fh;let s='';
 const H=gy+c.nB*fh+60;
 c.floors.forEach(f=>{const y=f.lvl>=0?gy-(f.lvl+1)*fh:gy+(-f.lvl-1)*fh;const t=f.label==='Penthouse floor'?'penthouse':f.type;
  const fw=Math.max(30,bw*f.area/maxA),fx=bx+(bw-fw)/2;s+=`<rect x="${fx}" y="${y}" width="${fw}" height="${fh}" fill="${COL[t]}" stroke="#475569" stroke-width="1"/>`;if(fh>=13)s+=`<text x="${bx+bw/2}" y="${y+fh/2+4}" text-anchor="middle" font-size="${Math.min(11,fh-3)}" fill="#1e293b">${esc(f.label)}${f.type==='commercial'||f.lvl===0?' · '+Math.round(f.area).toLocaleString('en-US')+' sf':''}</text>`;});
 s+=`<line x1="40" y1="${gy}" x2="${W-40}" y2="${gy}" stroke="#7a5c3c" stroke-width="3"/><text x="44" y="${gy-4}" font-size="10" fill="#7a5c3c">Ground level</text>`;
 const lg=[['basement',`Basement parking ×${c.nB}`],['parking',`Ground/podium parking ×${c.nP}`],['commercial',`Commercial ×${c.nC}`],['residential',`Residential ×${c.nR-(c.hasTop?1:0)}`]].concat(c.hasTop?[['penthouse','Penthouse ×1']]:[]);
 lg.forEach((l,i)=>{s+=`<rect x="${bx+bw+12}" y="${top+i*18}" width="12" height="12" fill="${COL[l[0]]}" stroke="#475569"/><text x="${bx+bw+28}" y="${top+i*18+10}" font-size="10">${l[1]}</text>`;});
 s+=`<text x="12" y="${H-28}" font-size="11" fill="#1e293b">${c.totalFloors} floors · plate ${Math.round(c.plate).toLocaleString('en-US')} sq ft · gross ${Math.round(c.gross).toLocaleString('en-US')} sq ft</text>`;
 return wrap(W+60,H,s,'Building section / stack – '+name);}
function floorPlanSVG(c,h,top){const types=(h.units||[]).filter(t=>top?t.top:!t.top),list=[];types.forEach(t=>{for(let i=0;i<(+t.perFloor||0);i++)list.push(t);});
 const plate=c.plate||1,ratio=Math.max(1,(c.g.bw||1)/Math.max(c.g.bd||1,1)),PW=Math.sqrt(plate*ratio),PD=plate/PW,sc=Math.min(560/PW,360/PD),W=PW*sc,D=PD*sc,ox=30,oy=40;
 const corrD=Math.max(D*0.14,18),rowD=(D-corrD)/2,coreW=Math.min(W*0.22,Math.max(40,c.core*sc*sc*0.5/corrD));
 let s=`<rect x="${ox}" y="${oy}" width="${W}" height="${D}" fill="#fff" stroke="#1e293b" stroke-width="2"/><rect x="${ox}" y="${oy+rowD}" width="${W}" height="${corrD}" fill="${COL.corr}"/>`;
 // core block spans the corridor in the middle
 const cx=ox+W/2-coreW/2;s+=`<rect x="${cx}" y="${oy+rowD-corrD*0.6}" width="${coreW}" height="${corrD*2.2}" fill="${COL.core}" stroke="#475569"/><text x="${cx+coreW/2}" y="${oy+rowD+corrD/2+4}" text-anchor="middle" font-size="10" font-weight="700">CORE</text><text x="${cx+coreW/2}" y="${oy+rowD+corrD/2+15}" text-anchor="middle" font-size="8">lifts · stairs</text>`;
 s+=`<text x="${ox+6}" y="${oy+rowD+corrD/2+4}" font-size="9" fill="#7a7d9c">corridor</text>`;
 const rows=[[],[]],ar=[0,0];list.sort((a,b)=>b.size-a.size).forEach(t=>{const i=ar[0]<=ar[1]?0:1;rows[i].push(t);ar[i]+=+t.size;});
 rows.forEach((r,ri)=>{const tot=r.reduce((a,t)=>a+ +t.size,0)||1;let x=ox;const y=ri?oy+rowD+corrD:oy;
  r.forEach(t=>{const w=W*t.size/tot;const col=t.top?COL.penthouse:COL.residential;s+=`<rect x="${x}" y="${y}" width="${w}" height="${rowD}" fill="${col}" stroke="#475569"/>`;
   if(w>34){s+=`<text x="${x+w/2}" y="${y+rowD/2-2}" text-anchor="middle" font-size="${w>70?11:9}" font-weight="700">${esc(t.name)}</text><text x="${x+w/2}" y="${y+rowD/2+11}" text-anchor="middle" font-size="${w>70?10:8}">${(+t.size).toLocaleString('en-US')} sq ft</text>`;}x+=w;});});
 const used=list.reduce((a,t)=>a+ +t.size,0);
 s+=`<text x="${ox}" y="${oy+D+18}" font-size="11">Plate ≈ ${Math.round(PW)} × ${Math.round(PD)} ft (${Math.round(plate).toLocaleString('en-US')} sq ft) · ${list.length} units · ${Math.round(used).toLocaleString('en-US')} sq ft in units · core/corridor ${h.corePct}%</text>`;
 return wrap(W+60,D+90,s,(top?'Penthouse floor plan':'Typical floor plan')+' (units scaled to fit plate)');}
const PROG={0:[['Living / sleeping',.52],['Kitchenette',.12],['Bath',.1],['Balcony',.08],['Passage & walls',.18]],
 1:[['Lounge',.28],['Bedroom',.24],['Kitchen',.11],['Bath',.08],['Balcony',.07],['Passage & walls',.22]],
 2:[['Lounge / dining',.26],['Master bed',.18],['Bedroom 2',.14],['Kitchen',.09],['Bath 1',.06],['Bath 2',.05],['Balcony',.06],['Passage & walls',.16]],
 3:[['Lounge',.2],['Dining',.08],['Master bed',.15],['Bedroom 2',.12],['Bedroom 3',.11],['Kitchen',.08],['Bath 1',.05],['Bath 2',.04],['Bath 3',.04],['Balcony',.05],['Passage & walls',.08]],
 4:[['Lounge',.18],['Dining',.08],['Master bed',.13],['Bedroom 2',.1],['Bedroom 3',.1],['Bedroom 4',.09],['Kitchen',.08],['Bath 1',.04],['Bath 2',.04],['Bath 3',.03],['Bath 4',.03],['Servant / store',.04],['Passage & walls',.06]]};
function rooms(t){const p=PROG[Math.min(4,Math.max(0,+t.beds||0))],A=+t.size||0;return p.map(([n,f])=>({n,a:A*f}));}
function unitSVG(t){const A=+t.size||1,UW=Math.sqrt(A*1.5),UD=A/UW,sc=Math.min(420/UW,280/UD),W=UW*sc,D=UD*sc,ox=30,oy=40,rs=rooms(t);
 const b1=rs.filter(r=>/bed|Living|Servant/i.test(r.n)),b2=rs.filter(r=>/Bath|Kitchen|Balcony|Passage/i.test(r.n)),b3=rs.filter(r=>!b1.includes(r)&&!b2.includes(r));
 let y=0;const bands=[b1,b3,b2].filter(x=>x.length).map(band=>{const bd=UD*band.reduce((q,r)=>q+r.a,0)/A,o=[band,y,bd];y+=bd;return o;});let s='';bands.forEach(([band,y0,bd])=>{let x=0;const tot=band.reduce((a,r)=>a+r.a,0)||1;band.forEach(r=>{const w=UW*r.a/tot;const isP=/Passage/.test(r.n);
  s+=`<rect x="${ox+x*sc}" y="${oy+y0*sc}" width="${w*sc}" height="${bd*sc}" fill="${isP?'#f1f5f9':/Bath/.test(r.n)?'#d7f3ff':/Kitchen/.test(r.n)?'#fff1c1':/Balcony/.test(r.n)?'#d8f5d0':'#e6edf6'}" stroke="#475569"/>`;
  if(w*sc>38)s+=`<text x="${ox+(x+w/2)*sc}" y="${oy+(y0+bd/2)*sc-2}" text-anchor="middle" font-size="${w*sc>80?11:8.5}" font-weight="700">${esc(r.n)}</text><text x="${ox+(x+w/2)*sc}" y="${oy+(y0+bd/2)*sc+11}" text-anchor="middle" font-size="${w*sc>80?10:8}">${Math.round(w)}'×${Math.round(bd)}' · ${Math.round(r.a)} sf</text>`;x+=w;});});
 s+=`<rect x="${ox}" y="${oy}" width="${W}" height="${D}" fill="none" stroke="#1e293b" stroke-width="2.5"/><text x="${ox}" y="${oy+D+18}" font-size="11">${esc(t.name)} · ${A.toLocaleString('en-US')} sq ft ≈ ${Math.round(UW)}' × ${Math.round(UD)}' · rooms add up to ${Math.round(rs.reduce((a,r)=>a+r.a,0))} sq ft</text>`;
 return wrap(Math.max(W+60,420),D+90,s,'Concept unit layout – '+t.name);}
// ---- quick entry: total floors (incl. basements) drive residential = total - parking - commercial
const GUSES=[['commercial','Commercial / Shops'],['mixed','Mixed use'],['lobby','Lobby + Shops'],['parking','Parking']];
function quick(h){const b=Math.max(0,+h.basements|0),p=Math.max(0,+h.podium|0),c=Math.max(0,+h.commercial|0),r=Math.max(0,+h.residential|0);
 const total=+h.qTotal>0?+h.qTotal|0:b+p+c+r,res=total-b-p-c;return{total,basements:b,podium:p,parking:b+p,commercial:c,residential:Math.max(0,res),short:res<0?-res:0};}
function quickSet(h,k,v){if(!(+h.qTotal>0))h.qTotal=quick(h).total;
 if(k==='groundUse'){h.groundUse=v;}else if(k==='groundArea'){v=+v||0;if(v>0){h.groundAuto=false;h.groundArea=v;}else{h.groundAuto=true;h.groundArea=0;}return quick(h);}
 else if(k==='plate'){h.plate=+v>0?+v:0;return quick(h);}
 else if(k==='total')h.qTotal=v===''?0:Math.max(0,+v|0);else if(['basements','podium','commercial'].includes(k))h[k]=v===''?'':Math.max(0,+v|0);else{h[k]=v;return quick(h);}
 if(k==='groundUse'){if(v==='parking'){if(!(+h.podium>0))h.podium=1;}else if(v&&!(+h.commercial>0))h.commercial=1;}
 const q=quick(h);const any=+h.qTotal>0||['basements','podium','commercial'].some(x=>h[x]!==''&&h[x]!=null);h.residential=any?q.residential:'';return q;}
const api={parseDim,dimA,shopSizes,EMPTY_HR,BLANK_KEYS,GUSES,quick,quickSet,HR_RATES,UNIT_TYPES,DEFAULT_HR,HR_ITEMS,geom,calc,boqDefaults,sectionSVG,floorPlanSVG,unitSVG,rooms};
if(typeof module!=='undefined')module.exports=api;else root.HR=api;
})(this);
