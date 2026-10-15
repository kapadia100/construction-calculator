// Layout auto-read: turns OCR / PDF text (optionally with positions) into rooms, unit types, floors and plot size.
// Pure functions (no DOM) so it runs in the browser and in Node tests.
(function(root){
const FT_PER_M=3.28084;
const ROOMS=[
 ['bedroom',/\b(master\s*bed(?:\s*room)?|guest\s*(?:bed\s*)?room|bed\s*room|bedroom|bed|b\.?r\.?)\b\s*(?:[-#]?\s*\d)?/i],
 ['lounge',/\b(tv\s*lounge|family\s*lounge|lounge|living(?:\s*room)?|family\s*room|sitting(?:\s*room)?)\b/i],
 ['drawing',/\b(drawing(?:\s*room)?|drawing\s*\/\s*dining)\b/i],
 ['dining',/\b(dining(?:\s*room)?)\b/i],
 ['kitchen',/\b(kitchen|kitchenette|pantry)\b/i],
 ['bath',/\b(attached\s*bath|bath\s*room|bathroom|bath|toilet|w\.?c|washroom|powder(?:\s*room)?)\b/i],
 ['store',/\b(store(?:\s*room)?|storage)\b/i],
 ['shop',/\b(shop|showroom|retail|office)\b(?:\s*[-#]?\s*\d+)?/i],
 ['parking',/\b(car\s*porch|porch|parking|garage)\b/i],
 ['servant',/\b(servant(?:\s*(?:quarter|room))?|s\.?\s*q)\b/i],
 ['laundry',/\b(laundry|wash\s*area)\b/i],
 ['dress',/\b(dress(?:ing)?(?:\s*room)?|wardrobe|walk[-\s]*in)\b/i],
 ['study',/\b(study|library)\b/i],
 ['prayer',/\b(prayer(?:\s*room)?)\b/i],
 ['lobby',/\b(lobby|foyer|entrance|reception)\b/i],
 ['corridor',/\b(corridor|passage|lobby\s*passage)\b/i],
 ['stair',/\b(stairs?(?:case)?)\b/i],
 ['lift',/\b(lift|elevator)\b/i],
 ['terrace',/\b(terrace|balcony|veranda|verandah)\b/i],
 ['lawn',/\b(lawn|garden|court\s*yard|courtyard)\b/i]];
const WORDN={first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10};
function norm(s){return String(s||'').replace(/[’′‘`´°]/g,"'").replace(/(\d['"]?)\s*[%¥]\s*(?=\d)/g,'$1x').replace(/[”″“]/g,'"').replace(/''/g,'"').replace(/(\d)\s*[×X*✕]\s*(?=\d)/g,'$1 x ').replace(/(\d)\s*[×X*✕]\s*/g,'$1 x ').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();}
const SIDE="(\\d{1,5}(?:\\.\\d{1,2})?)\\s*('|ft\\.?|feet)?\\s*(?:-?\\s*(\\d{1,2}(?:\\.\\d)?)\\s*(?:\"|in\\b))?";
const DIM=new RegExp('(^|[^\\w.])'+SIDE+'\\s*x\\s*'+SIDE+'\\s*(mm|m\\b|mtrs?|meters?|metres?)?','gi');
const AREA=/(^|[^\w.])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(sq\.?\s*f(?:ee|oo)?t|sq\.?\s*ft\.?|sft|sqft|s\.f\.t?|ft2|ft²|square\s*f(?:ee|oo)t|sq\.?\s*y(?:ar)?ds?|sq\.?\s*yd\.?|sqyd|syd|square\s*yards?|yards?|marlas?|m2|m²|sq\.?\s*m(?:eters?|etres?)?\b|sqm)/gi;
function areaToSqft(n,u,marla){u=u.toLowerCase().replace(/[\s.]/g,'');if(/^(sqf|sqft|sft|sf|ft2|ft²|squaref)/.test(u))return n;if(/yd|yard|syd/.test(u))return n*9;if(/marla/.test(u))return n*(marla||225);return n*FT_PER_M*FT_PER_M;}
function unitOf(u){u=u.toLowerCase().replace(/[\s.]/g,'');return /yd|yard|syd/.test(u)?'sqyd':/marla/.test(u)?'marla':/ft|sf/.test(u)?'sqft':'sqm';}
// all dimensions in a string -> [{w,d (ft), metric, marks, idx, len, raw}]
function dims(s){const out=[];s=norm(s);DIM.lastIndex=0;let m;while((m=DIM.exec(s))){const pre=m[1].length,u=(m[8]||'').toLowerCase();let a=+m[2]+(m[4]?+m[4]/12:0),b=+m[5]+(m[7]?+m[7]/12:0);const marks=!!(m[3]||m[6]);
  let metric=false;if(u==='mm'){a/=1000;b/=1000;metric=true;}else if(u)metric=true;else if(!marks&&/\./.test(m[2]+m[5])&&a<10&&b<10&&!m[4]&&!m[7])metric=true;
  if(metric){a*=FT_PER_M;b*=FT_PER_M;}
  if(a>0&&b>0&&a<=400&&b<=400)out.push({w:+a.toFixed(2),d:+b.toFixed(2),metric,marks:marks||!!u,idx:m.index+pre,len:m[0].length-pre,raw:m[0].slice(pre).trim()});}return out;}
function areas(s,marla){const out=[];s=norm(s);AREA.lastIndex=0;let m;while((m=AREA.exec(s))){const n=+m[2].replace(/,/g,'');if(n>0)out.push({sqft:+areaToSqft(n,m[3],marla).toFixed(1),value:n,unit:unitOf(m[3]),idx:m.index+m[1].length,len:m[0].length-m[1].length,raw:m[0].slice(m[1].length).trim()});}return out;}
function blank(s,list){let a=s.split('');list.forEach(x=>{for(let i=x.idx;i<x.idx+x.len;i++)a[i]=' ';});return a.join('');}
function floorOf(s){s=norm(s).toLowerCase();let m;
 if((m=s.match(/\b(lower\s*ground|upper\s*ground|ground|mezzanine|basement(?:\s*-?\s*\d)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d{1,2}(?:st|nd|rd|th)|typical|roof|top|podium|commercial|penthouse)\s*(?:floor|flr|level)?\s*(?:plan)?\b/))&&(/floor|flr|level|plan/.test(s)||/basement|mezzanine|podium|penthouse/.test(m[1]))){const k=m[1].replace(/\s+/g,' ');
  const lvl=/lower\s*ground/.test(k)?-0.5:/ground/.test(k)?0:/typical/.test(k)?1:/roof/.test(k)?99:/top|penthouse/.test(k)?98:/podium/.test(k)?0.8:WORDN[k]!=null?WORDN[k]:/^\d/.test(k)?parseInt(k):/basement/.test(k)?-1:/mezz/.test(k)?0.5:null;return {name:k.replace(/\b\w/g,c=>c.toUpperCase())+(/basement|mezzanine|podium|penthouse/.test(k)&&!/floor/.test(s)?'':' floor'),level:lvl,kind:/typical/.test(k)?'typical':/commercial|shop/.test(k)?'commercial':/basement|podium/.test(k)?'parking':/penthouse|top/.test(k)?'top':null};}
 if((m=s.match(/\b(?:floor|level)\s*[-#]?\s*(\d{1,2})\b/)))return {name:'Floor '+m[1],level:+m[1]};
 if(/\bg\.?\s*f\.?\b/.test(s)&&s.length<20)return {name:'Ground floor',level:0};return null;}
function roomsIn(s){const out=[];let t=s;ROOMS.forEach(([type,re])=>{const g=new RegExp(re.source,'gi');let m;while((m=g.exec(t))){if(type==='bedroom'&&/^\d\s*$/.test(t.slice(Math.max(0,m.index-2),m.index)))continue;// "2 bed" = unit label
  out.push({type,label:m[0].trim(),idx:m.index});t=t.slice(0,m.index)+' '.repeat(m[0].length)+t.slice(m.index+m[0].length);}});return out.sort((a,b)=>a.idx-b.idx);}
function unitIn(s){s=norm(s);let m,u=null;
 if((m=s.match(/\b(\d)\s*-?\s*(?:bed(?:room)?s?|bhk|br)\b/i)))u={beds:+m[1],name:m[1]+' Bed'};
 else if(/\bstudio\b/i.test(s))u={beds:0,name:'Studio'};else if(/\bpenthouse\b/i.test(s)&&!/floor/i.test(s))u={beds:4,name:'Penthouse',top:true};
 const t=s.match(/\b(?:type|unit|flat|apartment|apt)\s*[-:#]?\s*([A-Z]\d?|\d{1,2}[A-Z]?)\b/i);if(t&&/[A-Z]/i.test(t[1])){u=u||{beds:null,name:''};u.type=t[1].toUpperCase();u.name=(u.name?u.name+' – ':'')+'Type '+u.type;}
 if(!u)return null;const c=s.match(/(?:\bx\s*|\()\s*(\d{1,2})\s*(?:units?|flats?|nos?\.?|apartments?)?\)?(?!\s*['"\d.])|\b(\d{1,2})\s*(?:units?|flats?|nos\.?|apartments?)\b(?!\s*per\s*(?:floor)?\s*x)/i);
 if(c)u.count=+(c[1]||c[2]);const pf=s.match(/(\d{1,2})\s*(?:units?|flats?)?\s*(?:per|\/)\s*floor/i);if(pf)u.count=+pf[1];return u;}
function plotIn(s,marla){const t=norm(s);if(!/\b(plot|site)\b/i.test(t))return null;const d=dims(t)[0],a=areas(t,marla)[0];
 if(a)return {sqft:a.sqft,value:a.value,unit:a.unit,raw:a.raw,conf:.9};if(d)return {sqft:+(d.w*d.d).toFixed(1),w:d.w,d:d.d,raw:d.raw,conf:.85};
 const mm=t.match(/(\d+(?:\.\d+)?)\s*marla/i);if(mm)return {sqft:+mm[1]*(marla||225),value:+mm[1],unit:'marla',raw:mm[0],conf:.8};return null;}
function coveredIn(s){const t=norm(s);if(!/(covered|built[-\s]*up|floor\s*area|total\s*area|plinth)/i.test(t)||/\bplot\b/i.test(t))return null;const a=areas(t)[0];return a?{sqft:a.sqft,raw:a.raw}:null;}
function plausible(w,d){return w>=3&&d>=3&&w<=80&&d<=80;}
const cap=s=>s.replace(/\s+/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
// lines: strings or {text,x,y,w,h,page,conf}. opts: {marla, wallFactor}
function parse(lines,opts){opts=opts||{};const marla=opts.marla||225,wf=opts.wallFactor||1.2;
 const L=(lines||[]).map((l,i)=>typeof l==='string'?{text:l,i,page:0,y:i*20,x:0,w:100,h:16,conf:90,geo:false}:Object.assign({i,page:0,conf:90,w:0,h:12,geo:true},l)).filter(l=>l.text&&l.text.trim());
 const rooms=[],free=[],units=[],floors=[],plots=[],covered=[],raw=[];
 L.forEach(l=>{const t=norm(l.text),oc=Math.min(1,Math.max(.3,(l.conf==null?90:l.conf)/100));raw.push(t);
  const f=floorOf(t);if(f&&!roomsIn(t.replace(/floor|plan/gi,'')).length)floors.push(Object.assign({line:l},f));
  const pl=plotIn(t,marla);if(pl){plots.push(Object.assign({line:l},pl,{conf:pl.conf*oc}));return;}
  const cv=coveredIn(t);if(cv){covered.push(Object.assign({line:l,conf:.85*oc},cv));return;}
  const u=unitIn(t),ds=dims(t),as=areas(t,marla);
  if(u){const a=as[0];units.push(Object.assign({line:l,sqft:a?a.sqft:null,conf:(a?.85:.6)*oc},u));return;}
  const rest=blank(blank(t,ds),as),rs=roomsIn(rest);
  if(rs.length){// pair labels with dims/areas on the same line in order
   rs.forEach((r,k)=>{const d=ds.find(x=>x.idx>r.idx&&(!rs[k+1]||x.idx<rs[k+1].idx))||(rs.length===1?ds[0]:null),a=as.find(x=>x.idx>r.idx&&(!rs[k+1]||x.idx<rs[k+1].idx))||(rs.length===1?as[0]:null);
    rooms.push({type:r.type,label:cap(r.label),line:l,dim:d||null,area:a||null,oc});});}
  else{ds.forEach(d=>free.push({kind:'dim',v:d,line:l,used:false}));as.forEach(a=>free.push({kind:'area',v:a,line:l,used:false}));}});
 // attach a free dimension/area to labels that had none (nearest below, else above; same page)
 const cx=l=>l.x+(l.w||0)/2;
 rooms.filter(r=>!r.dim&&!r.area).forEach(r=>{let best=null,bd=1e9;free.forEach(f=>{if(f.used||f.line.page!==r.line.page)return;const lh=Math.max(r.line.h||12,8);let dy=f.line.y-r.line.y,dx=Math.abs(cx(f.line)-cx(r.line));
   if(!r.line.geo){if(f.line.i!==r.line.i+1)return;dy=1;dx=0;}else{if(dy<-1.6*lh||dy>3.6*lh||dx>Math.max(r.line.w||0,f.line.w||0,lh*4))return;}
   const sc=Math.abs(dy)*(dy<0?2:1)+dx;if(sc<bd){bd=sc;best=f;}});
  if(best){best.used=true;r[best.kind==='dim'?'dim':'area']=best.v;r.paired=true;}});
 // floors: which floor heading each item belongs to
 const assign=it=>{const fs=floors.filter(f=>f.line.page===it.line.page);if(!fs.length){const pages=new Set(L.map(l=>l.page));return pages.size>1?{name:'Page '+(it.line.page+1)+' floor',level:it.line.page}:null;}
  if(fs.length===1)return fs[0];const xs=fs.map(f=>cx(f.line)),ys=fs.map(f=>f.line.y),spX=Math.max(...xs)-Math.min(...xs),spY=Math.max(...ys)-Math.min(...ys);
  if(L[0].geo&&spX>spY)return fs.reduce((a,b)=>Math.abs(cx(b.line)-cx(it.line))<Math.abs(cx(a.line)-cx(it.line))?b:a);
  const below=fs.every(f=>L.some(l=>l.page===f.line.page&&l.y<f.line.y&&l!==f.line&&!floors.some(g=>g.line===l))&&fs.indexOf(f)>=0)&&L.filter(l=>l.page===it.line.page)[0]!==fs[0].line&&L.filter(l=>l.page===it.line.page&&l.y<fs[0].line.y).length>0;
  const sorted=fs.slice().sort((a,b)=>a.line.y-b.line.y);if(below){return sorted.find(f=>f.line.y>=it.line.y)||sorted[sorted.length-1];}
  let cur=sorted[0];sorted.forEach(f=>{if(f.line.y<=it.line.y)cur=f;});return cur;};
 const outRooms=rooms.map(r=>{const fl=assign(r);let sqft=null,conf=.35*r.oc;if(r.dim){sqft=r.dim.w*r.dim.d;conf=(r.dim.marks?.9:.75)*(plausible(r.dim.w,r.dim.d)?1:.5)*(r.paired?.92:1)*r.oc;}else if(r.area){sqft=r.area.sqft;conf=.8*(r.paired?.9:1)*r.oc;}
  return {name:r.label,type:r.type,w:r.dim?r.dim.w:null,d:r.dim?r.dim.d:null,sqft:sqft!=null?+sqft.toFixed(1):null,metric:!!(r.dim&&r.dim.metric),floor:fl?fl.name:'Ground floor',level:fl&&fl.level!=null?fl.level:0,floorKind:fl&&fl.kind||null,conf:+conf.toFixed(2),raw:(r.line.text||'').trim()};});
 // unit types: merge duplicates per floor, counting labels when no explicit count
 const um={};units.forEach(u=>{const fl=assign(u),fn=fl?fl.name:'Typical floor',k=fn+'|'+u.name;const o=um[k]||(um[k]={name:u.name,beds:u.beds,type:u.type||null,top:!!u.top||!!(fl&&fl.kind==='top'),floor:fn,count:0,explicit:false,sqft:null,conf:0});
  if(u.count){o.count=Math.max(o.explicit?o.count:0,u.count);o.explicit=true;}else if(!o.explicit)o.count++;if(u.sqft&&!o.sqft)o.sqft=u.sqft;o.conf=Math.max(o.conf,u.conf*(u.count||o.count>1?1:.85));});
 // fill unit sizes from rooms on the same floor when only one unit type there and no size printed
 const outUnits=Object.values(um).map(u=>{if(!u.sqft){const rs=outRooms.filter(r=>r.floor===u.floor&&r.sqft),same=Object.values(um).filter(x=>x.floor===u.floor);if(rs.length&&same.length===1){u.sqft=Math.round(rs.reduce((a,r)=>a+r.sqft,0)*wf/Math.max(1,u.count));u.fromRooms=true;u.conf*=.7;}}
  if(u.beds==null){const b=outRooms.filter(r=>r.floor===u.floor&&r.type==='bedroom').length;u.beds=b&&u.count?Math.round(b/u.count):2;}u.conf=+u.conf.toFixed(2);return u;});
 // per-floor summary
 const fsum={};outRooms.forEach(r=>{const f=fsum[r.floor]||(fsum[r.floor]={floor:r.floor,level:r.level,kind:r.floorKind,rooms:0,roomSqft:0,shopSqft:0,baths:0,beds:0});f.rooms++;if(r.sqft&&!/lawn|terrace|parking/.test(r.type))f.roomSqft+=r.sqft;if(r.type==='shop'&&r.sqft)f.shopSqft+=r.sqft;if(r.type==='bath')f.baths++;if(r.type==='bedroom')f.beds++;});
 const floorList=Object.values(fsum).sort((a,b)=>a.level-b.level).map(f=>Object.assign(f,{roomSqft:Math.round(f.roomSqft),covered:Math.round(f.roomSqft*wf)}));
 const plot=plots.sort((a,b)=>b.conf-a.conf)[0]||null;
 const stats={lines:L.length,rooms:outRooms.length,sized:outRooms.filter(r=>r.sqft).length,units:outUnits.length,floors:floorList.length};
 return {rooms:outRooms,units:outUnits,floors:floorList,floorNames:floors.map(f=>f.name),plot:plot&&{sqft:plot.sqft,value:plot.value||null,unit:plot.unit||null,w:plot.w||null,d:plot.d||null,raw:plot.raw,conf:+plot.conf.toFixed(2)},covered:covered.map(c=>({sqft:c.sqft,raw:c.raw,conf:+c.conf.toFixed(2),floor:(assign(c)||{}).name||null})),wallFactor:wf,stats,little:stats.sized<2&&!plot&&!outUnits.length,text:raw.join('\n')};}
const api={parse,dims,areas,floorOf,unitIn,roomsIn,plotIn,norm,FT_PER_M};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LP=api;
})(typeof self!=='undefined'?self:this);
