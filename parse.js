// Layout auto-read: turns OCR / PDF text (optionally with positions) into rooms, unit types, floors and plot size.
// Pure functions (no DOM) so it runs in the browser and in Node tests.
(function(root){
const FT_PER_M=3.28084;
const ROOMS=[
 ['bedroom',/\b(m\s*\.?\s*bed\s*room|master\s*bed\s*room|m\.\s*bed(?:\s*room)?|master\s*bed(?:\s*room)?|bed\s*rm|guest\s*(?:bed\s*)?room|bed\s*room|bedroom|bed|b\.?r\.?)\b\s*(?:[-#]?\s*\d)?/i],
 ['lounge',/\b(tv\s*lounge|family\s*lounge|lounge|living(?:\s*room)?|family\s*room|sitting(?:\s*room)?)\b/i],
 ['drawing',/\b(drawing(?:\s*room)?|drawing\s*\/\s*dining)\b/i],
 ['dining',/\b(dining(?:\s*room)?)\b/i],
 ['kitchen',/\b([gf]\s*[\/.]\s*kitchen|family\s*kitchen|dirty\s*kitchen|kitchen|kitchenette|pantry)\b/i],
 ['bath',/\b(pool\s*bath|dress\s*\/\s*bath|t\.\s*let|tlt|pwd|pow\.|pow\b|attached\s*bath|bath\s*room|bathroom|bath|toilet|w\.?c|washroom|powder(?:\s*room)?)\b/i],
 ['store',/\b(store(?:\s*room)?|storage)\b/i],
 ['shop',/\b(sho[pf]|showroom|retail)\b(?:\s*[-#]?\s*\d+)?/i],
 ['parking',/\b(car\s*porch|carporch|porch|car\s*parking|parking|garage|ramp(?:\s*up|\s*down)?(?:\s*(?:in|out))?)\b/i],
 ['servant',/\b(servant(?:\s*(?:quarter|room))?|maid(?:\s*(?:rm|room))?|driver(?:\s*(?:rm|room))?|s\.?\s*q)\b/i],
 ['laundry',/\b(laundry|wash\s*area|utility)\b/i],
 ['dress',/\b(dress(?:ing)?(?:\s*room)?|wardrobe|walk[-\s]*in|w\.\s*r)\b/i],
 ['study',/\b(study|library|office)\b/i],
 ['prayer',/\b(prayer(?:\s*room)?)\b/i],
 ['lobby',/\b(stair\s*lobby|lift\s*lobby|ent(?:rance|\.)?\s*foyer|lobby|foyer\.?|entrance|reception|recreation(?:\s*&\s*waiting)?(?:\s*area)?|waiting\s*area)\b/i],
 ['corridor',/\b(corridor|passage|lobby\s*passage|arcade)\b/i],
 ['stair',/\b(spiral\s*stairs?|spiral|sprial|stairs?(?:case)?)\b/i],
 ['lift',/\b(car\s*lift|cargo\s*lift|lift|elevator)\b/i],
 ['terrace',/\b(deck(?:\s*area)?|ser\.?\s*bal\.?|terrace|balcony|bal\.|veranda|verandah)\b/i],
 ['lawn',/\b(lawn|garden|court\s*yard|courtyard)\b/i],
 ['hall',/\b(multi\s*-?\s*purpose\s*hall|hall|home\s*theat(?:re|er)|theat(?:re|er)|cinema|game\s*room|gym|play\s*room|family\s*room)\b/i],
 ['pool',/\b(swimming\s*pool|pool|pond|jacuzzi|water\s*body|fountain)\b/i],
 ['plant',/\b(filter(?:\s*room)?|pump(?:\s*room)?|g\.?\s*rm|generator(?:\s*room)?|ups\s*room|electric(?:al)?\s*room|meter\s*room|guard\s*room|security\s*room)\b/i],
 ['platform',/\b(raised\s*platform|platform|stage|podium)\b/i],
 ['void',/\b(void|open\s*to\s*sky|shaft)\b/i]];
const WORDN={first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10};
const OCRD={T:'7',I:'1',l:'1','|':'1',O:'0',o:'0',S:'5',G:'6',B:'8',Z:'2'};
function norm(s){return pre(String(s||'')).replace(/(^|[\s(x×X])([TIlOoSGBZ|])(?=\s*['’′°]\s*-?\s*\d)/g,(m,a,c)=>a+OCRD[c]).replace(/(\d\s*['’′°]\s*-\s*)([TIlOoSGBZ])(?=\s*["”″])/g,(m,a,c)=>a+OCRD[c]).replace(/[’′‘`´°]/g,"'").replace(/(\d['"]?)\s*[%¥]\s*(?=\d)/g,'$1x').replace(/[”″“]/g,'"').replace(/''/g,'"').replace(/(\d['"]?)\s*[×X*✕]\s*(?=\d)/g,'$1 x ').replace(/(\d)\s*[×X*✕]\s*/g,'$1 x ').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();}
const MU='(?:mm|m|mtrs?|meters?|metres?)';
// shapes OCR and draughtsmen use that the main pattern does not: 12'6x16' (inches without "), 3.8m x 4.2m (unit on both sides), 1,250 S.FT
// OCR on rendered plans: ' read as " or ° or ! ] |, dropped apostrophes ("156"" = 15'-6", "1200"" = 12'-0")
function ftFix(s){const OC={C:'0',c:'0',O:'0',o:'0','€':'6',G:'6',b:'6',S:'5',s:'5'};s=s.replace(/(\d{1,2}\s*['’]\s*[xX×]\s*)(\d{2})\s*["”](?!\s*\d)/g,(m,a,b)=>+b>=12&&+b<=60?a+b+"'":m).replace(/(^|[^\d'’-])1([1-3]\d)\s*-\s*(\d{1,2})\s*"(?=\s*[xX×])/g,"$1$2'-$3\"").replace(/([xX×])\s*[xX%]|%\s*([xX])/g,'x').replace(/(\d\s*["'’°]\s*-?\s*)([CcOo€GbSs])(?=\s*["”']|\s*[xX×]|\s*$)/g,(m,a,c)=>a+OC[c]).replace(/(^|[^\d.])(\d{1,3})\s*(?:["'’°]\s*-?\s*|\s+|-)(\d{1,2})\s*["”'’°]/g,(m,a,f,i)=>+i<12?a+f+"'-"+i+'"':m);return s.replace(/(\d)\s*[!\]|](?=\s|$|\s*[xX×*])/g,"$1'").replace(/(^|[^\d'’′.\-])(\d{1,2})-(\d{1,2})"/g,"$1$2'-$3\"").replace(/(^|[^\d'’′.\-])(\d{1,4})"/g,(m,a,n)=>{let ft=n,inch=null;if(n.length===3){ft=n.slice(0,2);inch=n.slice(2);}else if(n.length===4){ft=n.slice(0,2);inch=n.slice(2);}else if(n.length===2&&+n>60){ft=n[0];inch=n[1];}if(inch!=null&&+inch>11)return m;return a+ft+"'"+(inch!=null&&+inch>0?'-'+(+inch)+'"':'');});}
function pre(s){s=/\d/.test(s)&&/[xX×*%]/.test(s)?ftFix(s):s;return s.replace(/(\d)\s*['’′]\s*-?\s*(\d{1,2}(?:\.\d)?)(?![\d.'’′"”″]|\s*(?:in\b|inch|["”″]|['’′]['’′]))/g,"$1'-$2\"").replace(new RegExp('(\\d(?:\\.\\d+)?)\\s*('+MU+')\\s*[xX×*✕]\\s*(?=\\d[\\d.]*\\s*\\2\\b)','gi'),'$1 x ').replace(/\b[sS]\.\s*[fF][tT]\b\.?/g,'sft').replace(/\b[sS]\s*[fF]\s*[tT]\b/g,'sft');}
const SIDE="(\\d{1,5}(?:\\.\\d{1,2})?)\\s*('|ft\\.?|feet)?\\s*(?:-\\s*(\\d{1,2}(?:\\.\\d)?)(?!\\d)\\s*(?:\"|in\\b)?|\\s*(\\d{1,2}(?:\\.\\d)?)\\s*(?:\"|in\\b))?";
const DIM=new RegExp('(^|[^\\w.])'+SIDE+'\\s*x\\s*'+SIDE+'\\s*(mm|m\\b|mtrs?|meters?|metres?)?','gi');
const AREA=/(^|[^\w.])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(sq\.?\s*f(?:ee|oo)?t|sq\.?\s*ft\.?|sft|sqft|s\.f\.t?|ft2|ft²|square\s*f(?:ee|oo)t|sq\.?\s*y(?:ar)?ds?|sq\.?\s*yd\.?|sqyd|syd|square\s*yards?|yards?|marlas?|m2|m²|sq\.?\s*m(?:eters?|etres?)?\b|sqm)/gi;
function areaToSqft(n,u,marla){u=u.toLowerCase().replace(/[\s.]/g,'');if(/^(sqf|sqft|sft|sf|ft2|ft²|squaref)/.test(u))return n;if(/yd|yard|syd/.test(u))return n*9;if(/marla/.test(u))return n*(marla||225);return n*FT_PER_M*FT_PER_M;}
function unitOf(u){u=u.toLowerCase().replace(/[\s.]/g,'');return /yd|yard|syd/.test(u)?'sqyd':/marla/.test(u)?'marla':/ft|sf/.test(u)?'sqft':'sqm';}
// all dimensions in a string -> [{w,d (ft), metric, marks, idx, len, raw}]
function dims(s){const out=[];s=norm(s);DIM.lastIndex=0;let m;while((m=DIM.exec(s))){const pre=m[1].length,u=(m[10]||'').toLowerCase(),i1=m[4]||m[5],i2=m[8]||m[9];if((i1&&+i1>=12)||(i2&&+i2>=12))continue;let a=+m[2]+(i1?+i1/12:0),b=+m[6]+(i2?+i2/12:0);const marks=!!(m[3]||m[7]||i1||i2);
  let metric=false;if(u==='mm'){a/=1000;b/=1000;metric=true;}else if(u)metric=true;else if(!marks&&/\./.test(m[2]+m[6])&&a<10&&b<10)metric=true;
  if(metric){a*=FT_PER_M;b*=FT_PER_M;}
  if(a>0&&b>0&&a<=400&&b<=400)out.push({w:+a.toFixed(2),d:+b.toFixed(2),metric,marks:marks||!!u,idx:m.index+pre,len:m[0].length-pre,raw:m[0].slice(pre).trim()});}return out;}
function areas(s,marla){const out=[];s=norm(s).replace(/\b(\d{1,3})\.(\d{3})(?=\s*(?:sq|sft|s\.f|ft2|square))/gi,'$1,$2');AREA.lastIndex=0;let m;while((m=AREA.exec(s))){const n=+m[2].replace(/,/g,'');if(n>0)out.push({sqft:+areaToSqft(n,m[3],marla).toFixed(1),value:n,unit:unitOf(m[3]),idx:m.index+m[1].length,len:m[0].length-m[1].length,raw:m[0].slice(m[1].length).trim()});}return out;}
function blank(s,list){let a=s.split('');list.forEach(x=>{for(let i=x.idx;i<x.idx+x.len;i++)a[i]=' ';});return a.join('');}
const ORD=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th');
function floorOf(s){s=norm(s).toLowerCase();let m;
 if((m=s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:to|-|–|&|till|upto)\s*(\d{1,2})(?:st|nd|rd|th)?\s*(typical\s*)?(?:floors?|flrs?)\b/))&&+m[2]>+m[1]){const a=+m[1],b=+m[2];return {name:ORD(a)+'–'+ORD(b)+' floor'+(m[3]?' (typical)':''),level:a,count:b-a+1,kind:m[3]?'typical':null};}
 if(/\b(block|key)\s*(?:floor\s*)?plan\b/.test(s))return {name:'Block plan',level:1,kind:'block'};
 if((m=s.match(/\b(lower\s*ground|upper\s*ground|ground|mezzanine|(?:lower\s*|upper\s*)?basement(?:\s*(?:no\.?\s*)?-?\s*\d)?|b\s*-?\s*[1-9](?=\s*(?:floor|level|plan|\b))|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d{1,2}(?:st|nd|rd|th)|typical|roof|top|podium|commercial|penthouse)\s*(?:floor|flr|level)?\s*(?:plan)?\b/))&&(/floor|flr|level|plan/.test(s)||/basement|mezzanine|podium|penthouse/.test(m[1]))){let k=m[1].replace(/\s+/g,' ');if(/^b\s*-?\s*\d/.test(k))k='basement '+k.replace(/\D/g,'');
  const lvl=/lower\s*ground/.test(k)?-0.5:/ground/.test(k)?0:/typical/.test(k)?1:/roof/.test(k)?99:/top|penthouse/.test(k)?98:/podium/.test(k)?0.8:WORDN[k]!=null?WORDN[k]:/^\d/.test(k)?parseInt(k):/basement/.test(k)?-(+((k.match(/\d/)||[1])[0])||1):/mezz/.test(k)?0.5:null;return {name:k.replace(/\b\w/g,c=>c.toUpperCase())+(/basement|mezzanine|podium|penthouse/.test(k)&&!/floor/.test(s)?'':' floor'),level:lvl,kind:/typical/.test(k)?'typical':/commercial|shop/.test(k)?'commercial':/basement|podium/.test(k)?'parking':/penthouse|top/.test(k)?'top':null};}
 if((m=s.match(/\b(?:floor|level)\s*[-#]?\s*(\d{1,2})\b/)))return {name:'Floor '+m[1],level:+m[1]};
 if(/\bg\.?\s*f\.?\b/.test(s)&&s.length<20)return {name:'Ground floor',level:0};return null;}
function roomsIn(s){const out=[];let t=s;ROOMS.forEach(([type,re])=>{const g=new RegExp(re.source,'gi');let m;while((m=g.exec(t))){if(type==='bedroom'&&/^\d\s*$/.test(t.slice(Math.max(0,m.index-2),m.index)))continue;// "2 bed" = unit label
  out.push({type,label:m[0].trim(),idx:m.index});t=t.slice(0,m.index)+' '.repeat(m[0].length)+t.slice(m.index+m[0].length);}});return out.sort((a,b)=>a.idx-b.idx);}
function unitIn(s){s=norm(s);let m,u=null;
 if((m=s.match(/\b(\d)\s*-?\s*(?:bed(?:room)?s?|bhk|br)\b/i)))u={beds:+m[1],name:m[1]+' Bed'};
 else if(/\bstudio\b/i.test(s))u={beds:0,name:'Studio'};else if(/\bpenthouse\b/i.test(s)&&!/floor/i.test(s))u={beds:4,name:'Penthouse',top:true};
 const t=s.match(/\b(?:type|unit|flat|apartment|apt)(?:\s*[-:#]\s*|\s+)(?!x\s*\d)([A-Z]\d?|\d{1,2}[A-Z]?)\b(?!\s*\/)/i);if(t&&/[A-Z]/i.test(t[1])){u=u||{beds:null,name:''};u.type=t[1].toUpperCase();u.name=(u.name?u.name+' – ':'')+'Type '+u.type;}
 if(!u)return null;const c=s.match(/(?:\bx\s*|\()\s*(\d{1,2})\s*(?:units?|flats?|nos?\.?|apartments?)?\)?(?!\s*['"\d.])|\b(\d{1,2})\s*(?:units?|flats?|nos\.?|apartments?)\b(?!\s*per\s*(?:floor)?\s*x)/i);
 if(c)u.count=+(c[1]||c[2]);const pf=s.match(/(\d{1,2})\s*(?:units?|flats?)?\s*(?:per|\/)\s*floor/i);if(pf)u.count=+pf[1];return u;}
// 4-sided plot area: diagonal -> two triangles (Heron); road and back parallel -> trapezoid; else average width x average depth
function quadArea(o){const f=+o.front||0,b=+o.back||0,l=+o.left||0,r=+o.right||0,g=+o.diag||0;if(!(f>0&&b>0&&l>0&&r>0))return null;
 const her=(a,c,e)=>{const s=(a+c+e)/2,v=s*(s-a)*(s-c)*(s-e);return v>0?Math.sqrt(v):null;};
 if(g>0){const t1=her(b,r,g),t2=her(f,l,g);if(t1&&t2)return {sqft:t1+t2,method:'diagonal'};}
 const e=Math.abs(f-b);if(e>0.01){const c=l,d=r,x=(e*e+c*c-d*d)/(2*e);if(c*c-x*x>0&&e<c+d&&c<e+d&&d<e+c)return {sqft:(f+b)/2*Math.sqrt(c*c-x*x),method:'trapezoid'};}
 return {sqft:(f+b)/2*(l+r)/2,method:'average'};}
function plotIn(s,marla){let t=norm(s).replace(/([(\s])[\[\/|lI!]\s?(\d{3})\b/g,'$11$2').replace(/\(?\s*(\d{3,6}(?:\.\d+)?)\s*\)?\s*s\s*\.?\s*y(?:ar)?ds?\b\.?/i,'$1 sq yd');
 const tot=t.match(/total\s*area\s*of\s*(?:the\s*)?p[a-z]{1,3}t\D{0,8}(\d{3,6})\b(?!\s*(?:sq|sft|s\.?f|ft|m\b))/i);if(tot)return {sqft:+tot[1]*9,value:+tot[1],unit:'sqyd',raw:tot[0],conf:.85,official:true};
 if(/\barea\b/i.test(t)&&/\d\s*sq yd/i.test(t)&&!/\bplot\b/i.test(t)){const a=areas(t,marla)[0];if(a&&a.unit==='sqyd'&&a.value>=40)return {sqft:a.sqft,value:a.value,unit:a.unit,raw:a.raw,conf:.85,official:true};}
 if(!/\b(plot|site)\b/i.test(t))return null;const d=dims(t)[0],a=areas(t,marla)[0];
 if(a)return {sqft:a.sqft,value:a.value,unit:a.unit,raw:a.raw,conf:.9,official:a.unit==='sqyd'};if(d)return {sqft:+(d.w*d.d).toFixed(1),w:d.w,d:d.d,raw:d.raw,conf:.85};
 const mm=t.match(/(\d+(?:\.\d+)?)\s*marla/i);if(mm)return {sqft:+mm[1]*(marla||225),value:+mm[1],unit:'marla',raw:mm[0],conf:.8};return null;}
function coveredIn(s){const t=norm(s);if(!/(covered|built[-\s]*up|floor\s*area|total\s*area|plinth)/i.test(t)||/\bplot\b/i.test(t))return null;const a=areas(t)[0];return a?{sqft:a.sqft,raw:a.raw}:null;}
const MAXS={hall:70,pool:80,plant:20,platform:40,void:40,bath:16,terrace:50,lift:25,stair:30,lobby:40,corridor:80,store:20,dress:16,servant:20,laundry:16,prayer:20,study:25,kitchen:30,bedroom:35,drawing:40,dining:35,lounge:45,shop:120,parking:120,lawn:150};
function plausible(w,d,type){const mx=MAXS[type]||60,mn=/terrace|corridor/.test(type)?2.5:3;return w>=mn&&d>=mn&&w<=mx&&d<=mx&&w*d<=mx*mx*.6;}

// which printed area to use when a line/row has several (carpet / covered / super)
const AKIND=[['covered',/covered|built[-\s]*up|plinth/i],['super',/super|gross|saleable|sellable/i],['carpet',/carpet|net\b|usable/i]];
function kindsOf(t,as){const o={};as.forEach((a,i)=>{const seg=t.slice(i?as[i-1].idx+as[i-1].len:0,a.idx);const k=(AKIND.find(([,re])=>re.test(seg))||[])[0];if(k&&o[k]==null)o[k]=a.sqft;});return o;}
function bestArea(kinds,fallback){return kinds.covered||kinds.super||kinds.carpet||fallback||null;}
// group positioned lines into visual rows, then explode them into word tokens with an estimated x
function rowsOf(L){const g={};L.filter(l=>l.geo).forEach(l=>{(g[l.page+'|'+(l.frame||0)]=g[l.page+'|'+(l.frame||0)]||[]).push(l);});const rows=[];
 Object.values(g).forEach(ls=>{ls.slice().sort((a,b)=>(a.y+a.h/2)-(b.y+b.h/2)).forEach(l=>{const c=l.y+l.h/2,r=rows.find(r=>r.page===l.page&&(r.frame||0)===(l.frame||0)&&Math.abs(r.c-c)<Math.max(r.h,l.h)*.6);if(r){r.lines.push(l);r.h=Math.max(r.h,l.h);}else rows.push({page:l.page,frame:l.frame||0,c,h:l.h,y:l.y,lines:[l]});});});
 rows.forEach(r=>{r.lines.sort((a,b)=>a.x-b.x);r.text=r.lines.map(l=>l.text).join('  ');r.tok=[];r.lines.forEach(l=>{if(l.words&&l.words.length){l.words.forEach(w=>r.tok.push({s:w.s,x:w.x,line:l}));return;}const t=l.text,re=/\S+/g;let m;while((m=re.exec(t))){r.tok.push({s:m[0],x:l.x+(l.w||t.length*l.h*.5)*(m.index+m[0].length/2)/Math.max(1,t.length),line:l});}});});
 return rows.sort((a,b)=>a.page-b.page||a.frame-b.frame||a.c-b.c);}
const HKEY=[['type',/^(type|unit|flat|apt\.?|apartment)$/i],['beds',/^(beds?|bedrooms?|bhk|config\.?|configuration)$/i],['carpet',/^carpet/i],['covered',/^(covered|built[-\s]*up|plinth)/i],['super',/^(super|gross|saleable|sellable)/i],['count',/^(units?|nos?\.?|qty|quantity|flats?)(\/floor|\/flr)?$/i],['floor',/^(floors?|levels?)$/i],['use',/^(use|usage|description|function)$/i],['area',/^(area|sft|sq\.?\s*ft\.?|\(sft\)|\(sq\.?\s*ft\.?\))$/i]];
const UNITW=/^(\(?(sft|sq\.?|ft\.?|sq\.?ft\.?|sq\.?yds?|sqm|m2|area)\)?|\(.*\)|per|\/?floors?\)?|each)$/i;
function headerOf(r){const cols=[];r.tok.forEach(t=>{const s=t.s.replace(/[|:]/g,'');if(!s)return;const prev=cols[cols.length-1];
  if(prev&&(UNITW.test(s)&&!(prev.k==='floor'&&/^floors?$/i.test(s))&&!(/^area$/i.test(s)&&!/carpet|covered|super/.test(prev.k||''))||(/^(per|\/)$/i.test(prev.last)))){prev.t+=' '+s;prev.last=s;prev.x2=t.x;if(prev.k==='area'||!prev.k){const k=(HKEY.find(([,re])=>re.test(s))||[])[0];if(k&&!prev.k)prev.k=k;}if(/floor/i.test(s)&&prev.k==='count')prev.perFloor=true;return;}
  const k=(HKEY.find(([,re])=>re.test(s))||[])[0]||null;if(!k&&s.replace(/[^A-Za-z]/g,'').length<3)return;cols.push({k,t:s,x1:t.x,x2:t.x,last:s});});
 const known=cols.filter(c=>c.k);if(known.length<3||known.length<cols.length*.6||r.tok.some(t=>/\d/.test(t.s)))return null;
 const areaCols=cols.filter(c=>/carpet|covered|super|area/.test(c.k||''));if(!areaCols.length&&!cols.some(c=>c.k==='count'))return null;
 cols.forEach(c=>{c.x=(c.x1+c.x2)/2;c.unit=/yd/i.test(c.t)?'sqyd':/sqm|m2/i.test(c.t)?'sqm':'sqft';});return cols;}
function tables(L,marla){const rows=rowsOf(L),out={units:[],floorAreas:[],used:new Set()};
 for(let i=0;i<rows.length;i++){if(rows[i].lines.every(l=>l.tbl))continue;const cols=headerOf({tok:rows[i].tok.filter(t=>!t.line.tbl)});if(!cols)continue;rows[i].lines.forEach(l=>out.used.add(l));const isFloor=cols.some(c=>c.k==='floor');let miss=0;
  for(let j=i+1;j<rows.length&&miss<2;j++){const r=rows[j];if(r.page!==rows[i].page||r.frame!==rows[i].frame||r.c-rows[j-1].c>rows[i].h*5)break;if(headerOf({tok:r.tok.filter(t=>!t.line.tbl)}))break;
   const cell={},fill={},near=t=>cols.indexOf(cols.reduce((a,b)=>Math.abs(b.x-t.x)<Math.abs(a.x-t.x)?b:a));r.tok.forEach(t=>{const n=near(t);if(t.line.tbl)(fill[n]=fill[n]||[]).push(t.s);else(cell[n]=cell[n]||[]).push(t.s);});
   // the row-by-row re-read only fills cells the main read left empty (it is noisier)
   Object.keys(fill).forEach(n=>{if(!cell[n]){const v=fill[n].filter(s=>/[A-Za-z0-9]/.test(s)&&!/^[|Il]$/.test(s));if(v.length)cell[n]=v;}});if(r.lines.every(l=>l.tbl)&&!Object.keys(cell).length)continue;
   const get=k=>{const n=cols.findIndex(c=>c.k===k);return n<0||!cell[n]?'':cell[n].join(' ');},numOf=(k)=>{const n=cols.findIndex(c=>c.k===k);if(n<0||!cell[n])return null;const m=cell[n].join(' ').replace(/[Oo](?=\d)/g,"0").replace(/(\d)[Oo]/g,"$10").replace(/\b(\d{1,3})\.(\d{3})\b/g,'$1,$2').match(/\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?/);if(!m)return null;const v=+m[0].replace(/,/g,'');return v>0?+areaToSqft(v,cols[n].unit==='sqyd'?'sqyd':cols[n].unit==='sqm'?'m2':'sft',marla).toFixed(1):null;};
   const oc=Math.min(1,Math.max(.3,Math.min(...r.lines.map(l=>l.conf==null?90:l.conf))/100));
   if(isFloor){const ft=get('floor')||r.tok.slice(0,4).map(t=>t.s).join(' '),f=floorOf(ft)||floorOf(/floor|level|plan/i.test(ft)?ft:ft+' floor');const a=numOf('area')||numOf('covered')||numOf('super');
    if(!f||!a){if(!/\d/.test(r.text))miss++;continue;}miss=0;const use=get('use');r.lines.forEach(l=>out.used.add(l));
    out.floorAreas.push({floor:f.name,level:f.level,count:f.count||1,sqft:a,each:/each|typ/i.test(r.text)||(f.count||1)>1,use:use||null,kind:/park/i.test(use)?'parking':/shop|commer|retail|office/i.test(use)?'commercial':/apart|resid|flat/i.test(use)?'residential':f.kind||null,conf:+(.85*oc).toFixed(2),raw:r.text.replace(/\s+/g,' ').trim(),from:'table'});}
   else{let ty=get('type').replace(/[^A-Za-z0-9-]/g,'');const bd=get('beds');if(/^([A-Za-z])\1?$/i.test(ty))ty=ty[0].toUpperCase();let u=unitIn((bd||'')+' '+(ty&&!/^type/i.test(ty)?'Type '+ty:ty))||unitIn(r.text);if(!u){if(!/\d/.test(r.text))miss++;continue;}miss=0;
    const k={covered:numOf('covered'),super:numOf('super'),carpet:numOf('carpet')},sq=bestArea(k,numOf('area')),cn=numOf('count');r.lines.forEach(l=>out.used.add(l));
    out.units.push(Object.assign(u,{sqft:sq,areas:k,count:cn&&cn<100?Math.round(cn):u.count||null,countMissing:!(cn&&cn<100)&&!u.count&&cols.some(c=>c.k==='count'),line:r.lines[0],conf:(sq?.85:.55)*oc,fromTable:true}));}}}
 return out;}
// "GROUND FLOOR COVERED AREA = 1,650 SFT" / "1st-10th floor 7,800 sft each"
function floorAreaIn(t,marla){if(/\b(per|each)\s+(unit|flat|apartment)\b/i.test(t))return null;if(/\b(total|plot|site)\b/i.test(t))return null;const f=floorOf(t),as=areas(t,marla);if(!f||!as.length||f.kind==='block')return null;const k=kindsOf(t,as);return {floor:f.name,level:f.level,count:f.count||1,sqft:bestArea(k,as[0].sqft)<50?null:bestArea(k,as[0].sqft),each:/each|typ/i.test(t)||(f.count||1)>1,kind:f.kind||null,raw:t};}
const cap=s=>s.replace(/\s+/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
// lines: strings or {text,x,y,w,h,page,conf}. opts: {marla, wallFactor}
function parse(lines,opts){opts=opts||{};const marla=opts.marla||225,wf=opts.wallFactor||1.2;
 const L=(lines||[]).map((l,i)=>typeof l==='string'?{text:l,i,page:0,y:i*20,x:0,w:100,h:16,conf:90,geo:false}:Object.assign({i,page:0,conf:90,w:0,h:12,geo:true},l)).filter(l=>l.text&&l.text.trim());
 // a tile edge can cut a label ("1ST TO 10TH FLOOR" also read as "0 10TH FLOOR"): drop such partial copies
 for(let i=L.length-1;i>=0;i--){const l=L[i];if(!l.geo||l.text.trim().length>40)continue;const s=l.text.trim().toUpperCase(),core=s.replace(/^\S{1,3}\s+|^[^A-Z0-9]+/,'');if(core.length<3)continue;if(!l.tbl&&L.some(o=>o!==l&&!o.tbl&&o.geo&&o.page===l.page&&(o.frame||0)===(l.frame||0)&&o.text.length>l.text.length&&Math.abs(o.y-l.y)<Math.max(o.h,l.h)*.6&&o.x<=l.x+Math.max(l.h,4)&&o.x+o.w>=l.x+l.w-Math.max(l.h,4)*2&&o.text.toUpperCase().includes(core)))L.splice(i,1);}
 const rooms=[],free=[],units=[],floors=[],plots=[],covered=[],gross=[],raw=[],floorAreas=[];
 const TB=tables(L,marla);TB.units.forEach(u=>units.push(u));TB.floorAreas.forEach(f=>floorAreas.push(Object.assign({line:L.find(l=>TB.used.has(l))},f)));
 // labels split from their value by the sparse reader ("GROUND FLOOR COVERED AREA" | "= 1,650 SFT"): rejoin same-row pieces
 const rws=rowsOf(L.filter(l=>!l.tbl));rws.forEach(r=>{if(r.lines.length<2||r.lines.some(l=>TB.used.has(l)))return;const t=norm(r.lines.map(l=>l.text).join(' '));if(r.lines.some(l=>floorAreaIn(norm(l.text),marla)))return;const fa=floorAreaIn(t,marla);if(fa&&fa.sqft){floorAreas.push(Object.assign({line:r.lines[0],conf:+(.75*Math.min(...r.lines.map(l=>(l.conf==null?90:l.conf)/100))).toFixed(2)},fa));r.lines.forEach(l=>TB.used.add(l));}});
 L.forEach(l=>{const t=norm(l.text),oc=Math.min(1,Math.max(.3,(l.conf==null?90:l.conf)/100));raw.push(t);if(l.tbl)return;if(TB.used.has(l)){const f=floorOf(t);if(f&&f.kind!=='block'&&!/\d{3}/.test(t)&&false)floors.push(Object.assign({line:l},f));return;}
  const f=floorOf(t);if(f&&!roomsIn(t.replace(/floor|plan/gi,'')).length)floors.push(Object.assign({line:l},f));
  const pl=plotIn(t,marla);if(pl){plots.push(Object.assign({line:l},pl,{conf:pl.conf*oc}));return;}
  const fa=floorAreaIn(t,marla);if(fa&&fa.sqft){floorAreas.push(Object.assign({line:l,conf:+(.85*oc).toFixed(2)},fa));floors.push(Object.assign({line:l},floorOf(t)));return;}
  {const u0=unitIn(t),as0=areas(t,marla);if(u0&&(u0.beds!=null||u0.type)&&as0.length&&(oc>=.75||u0.beds!=null)){const k=kindsOf(t,as0);units.push(Object.assign({line:l,sqft:bestArea(k,as0[0].sqft),areas:k,conf:.85*oc},u0));return;}}
  const gm=/\b(gross|saleable|sellable|super|carpet|net|unit|apartment|flat)\s*(?:built[-\s]*up\s*)?area\b/i.test(t)&&areas(t,marla)[0];if(gm){gross.push({line:l,sqft:gm.sqft,raw:gm.raw,conf:.9*oc});return;}
  const cv=coveredIn(t);if(cv){covered.push(Object.assign({line:l,conf:.85*oc},cv));return;}
  if(/\barea\s*[=:]/i.test(t)){const tag=(roomsIn(t.split(/area/i)[0])[0]||{}).type||null;areas(t,marla).forEach(a=>free.push({kind:'area',v:a,line:l,used:false,tag}));return;}
  let u=unitIn(t);const ds=dims(t),as=areas(t,marla);
  if(u&&!u.beds&&u.beds!==0&&oc<.75)u=null;
  if(u){const a=as[0];units.push(Object.assign({line:l,sqft:a?a.sqft:null,conf:(a?.85:.6)*oc},u));return;}
  const rest=blank(blank(t,ds),as),rs=roomsIn(rest);
  if(rs.length){// pair labels with dims/areas on the same line in order
   rs.forEach((r,k)=>{const d=ds.find(x=>x.idx>r.idx&&(!rs[k+1]||x.idx<rs[k+1].idx))||(rs.length===1?ds[0]:null),a=as.find(x=>x.idx>r.idx&&(!rs[k+1]||x.idx<rs[k+1].idx))||(rs.length===1?as[0]:null);
    rooms.push({type:r.type,label:cap(r.label),line:l,dim:d||null,area:a||null,oc});});}
  else{ds.forEach(d=>free.push({kind:'dim',v:d,line:l,used:false}));as.forEach(a=>free.push({kind:'area',v:a,line:l,used:false}));}});
 // two reads of the same spot (tile overlap): keep the cleaner one (feet marks, higher OCR confidence)
 free.forEach(f=>{if(f.kind!=='dim'||f.used)return;const fx=(f.line.x||0)+(f.line.w||0)/2;if(free.some(g=>g!==f&&g.kind==='dim'&&!g.used&&g.line!==f.line&&g.line.page===f.line.page&&(g.line.frame||0)===(f.line.frame||0)&&Math.abs((g.line.y||0)-(f.line.y||0))<Math.max(f.line.h||10,8)&&Math.abs((g.line.x||0)+(g.line.w||0)/2-fx)<40&&Math.round(g.v.w)===Math.round(f.v.w)&&Math.round(g.v.d)!==Math.round(f.v.d)&&String(Math.round(g.v.d)).startsWith(String(Math.round(f.v.d)))&&((g.v.marks&&!f.v.marks)||(!!g.v.marks===!!f.v.marks&&(g.line.conf||0)>(f.line.conf||0)+20))))f.used=true;});
 // attach a free dimension/area to labels that had none (nearest below, else above; same page)
 const cx=l=>l.x+(l.w||0)/2;
 rooms.filter(r=>!r.dim&&!r.area).forEach(r=>{let best=null,bd=1e9;free.forEach(f=>{if(f.used||f.line.page!==r.line.page||(f.line.frame||0)!==(r.line.frame||0))return;const lh=Math.max(r.line.h||12,8);let dy=f.line.y-r.line.y,dx=Math.abs(cx(f.line)-cx(r.line));
   const tg=f.tag&&f.tag===r.type;if(!r.line.geo){if(f.line.i!==r.line.i+1&&!(tg&&f.line.i>r.line.i&&f.line.i<=r.line.i+3))return;dy=f.line.i-r.line.i;dx=0;}else if(tg){if(dy<0||dy>14*lh||dx>Math.max(r.line.w||0,f.line.w||0)*1.5)return;dy=dy/4;}else{if(dy<-1.6*lh||dy>3.6*lh||dx>Math.max(r.line.w||0,f.line.w||0,lh*4))return;}
   const sc=Math.abs(dy)*(dy<0?2:1)+dx;if(sc<bd){bd=sc;best=f;}});
  if(best){best.used=true;r[best.kind==='dim'?'dim':'area']=best.v;r.paired=true;r.vline=best.line;}});
 // a sheet with a title block ("GROUND FLOOR PLAN") belongs to that floor: drop stray words like "Podium 10' Wide" as floor headings there
 {const titled=new Set(floors.filter(f=>/plan/i.test(f.line.text)).map(f=>f.line.page));for(let i=floors.length-1;i>=0;i--){const f=floors[i];if(titled.has(f.line.page)&&!/plan|floor|level|flr/i.test(f.line.text))floors.splice(i,1);}}
 // floors: which floor heading each item belongs to
 const pageUnit={};units.forEach(u=>{(pageUnit[u.line.page]=pageUnit[u.line.page]||new Set()).add(u.name);});
 const assign=it=>{const fs=floors.filter(f=>f.line.page===it.line.page);if(!fs.length){const pu=pageUnit[it.line.page];if(pu&&pu.size===1){const n=[...pu][0];return {name:n+' (unit plan)',level:1,kind:'unit'};}const pages=new Set(L.map(l=>l.page));return pages.size>1?{name:((opts.pageLabel&&opts.pageLabel[it.line.page])||'Page '+(it.line.page+1))+' floor',level:it.line.page}:null;}
  if(fs.length===1)return fs[0];const xs=fs.map(f=>cx(f.line)),ys=fs.map(f=>f.line.y),spX=Math.max(...xs)-Math.min(...xs),spY=Math.max(...ys)-Math.min(...ys);
  if(L[0].geo&&spX>spY)return fs.reduce((a,b)=>Math.abs(cx(b.line)-cx(it.line))<Math.abs(cx(a.line)-cx(it.line))?b:a);
  const below=fs.every(f=>L.some(l=>l.page===f.line.page&&l.y<f.line.y&&l!==f.line&&!floors.some(g=>g.line===l))&&fs.indexOf(f)>=0)&&L.filter(l=>l.page===it.line.page)[0]!==fs[0].line&&L.filter(l=>l.page===it.line.page&&l.y<fs[0].line.y).length>0;
  const sorted=fs.slice().sort((a,b)=>a.line.y-b.line.y);if(below){return sorted.find(f=>f.line.y>=it.line.y)||sorted[sorted.length-1];}
  let cur=sorted[0];sorted.forEach(f=>{if(f.line.y<=it.line.y)cur=f;});return cur;};
 const outRooms=rooms.map(r=>{const fl=assign(r);let sqft=null,conf=.35*r.oc;if(r.dim){sqft=r.dim.w*r.dim.d;conf=(r.dim.marks?.9:.75)*(plausible(r.dim.w,r.dim.d,r.type)?1:.3)*(r.paired?.92:1)*r.oc;}else if(r.area){sqft=r.area.sqft;conf=.8*(r.paired?.9:1)*r.oc;}
  return {name:r.label,type:r.type,w:r.dim?r.dim.w:null,d:r.dim?r.dim.d:null,sqft:sqft!=null?+sqft.toFixed(1):null,metric:!!(r.dim&&r.dim.metric),floor:fl?fl.name:'Ground floor',level:fl&&fl.level!=null?fl.level:0,floorKind:fl&&fl.kind||null,conf:+conf.toFixed(2),zoom:!!((r.vline||r.line)&&(r.vline||r.line).zoom&&(r.dim||r.area)),raw:(r.line.text||'').trim(),page:r.line.page||0,box:r.line.geo?{x:r.line.x,y:r.line.y,w:r.line.w,h:r.line.h,page:r.line.page}:null};});
 // unit types: merge duplicates per floor, counting labels when no explicit count
 const um={};units.forEach(u=>{if(u.fromTable){const k='Typical floor|'+u.name;const o=um[k]||(um[k]={name:u.name,beds:u.beds,type:u.type||null,top:!!u.top,floor:'Typical floor',count:u.count||null,explicit:!!u.count,sqft:u.sqft,areas:u.areas,conf:u.countMissing?Math.min(u.conf,.45):u.conf,fromTable:true,page:u.line?u.line.page:null,countMissing:!!u.countMissing});return;}const fl=assign(u),fn=fl?fl.name:'Typical floor',k=fn+'|'+u.name;const o=um[k]||(um[k]={name:u.name,beds:u.beds,type:u.type||null,top:!!u.top||!!(fl&&fl.kind==='top'),floor:fn,count:0,explicit:false,sqft:null,conf:0,page:u.line.page});
  if(u.count){o.count=Math.max(o.explicit?o.count:0,u.count);o.explicit=true;}else if(!o.explicit)o.count++;if(u.sqft&&!o.sqft){o.sqft=u.sqft;o.areas=u.areas;}o.conf=Math.max(o.conf,u.conf*(u.count||o.count>1?1:.85));});
 // printed gross/saleable area on a page that shows one unit type = that unit's size
 gross.forEach(g=>{const pu=pageUnit[g.line.page];if(pu&&pu.size===1){const n=[...pu][0];Object.values(um).forEach(o=>{if(o.name===n&&!o.sqft){o.sqft=g.sqft;o.conf=Math.max(o.conf,g.conf);g.used=true;}});}});
 // fill unit sizes from rooms on the same floor when only one unit type there and no size printed
 const outUnits=Object.values(um).map(u=>{if(!u.sqft){const rs=outRooms.filter(r=>r.floor===u.floor&&r.sqft),same=Object.values(um).filter(x=>x.floor===u.floor);if(rs.length&&same.length===1){const nb=rs.filter(r=>r.type==='bedroom').length,div=u.beds&&u.count>1&&nb>=u.beds*u.count*.8?u.count:1;u.sqft=Math.round(rs.filter(r=>r.conf>=.5).reduce((a,r)=>a+r.sqft,0)*wf/div);u.fromRooms=true;u.conf*=.7;}}
  if(u.beds==null){const b=outRooms.filter(r=>r.floor===u.floor&&r.type==='bedroom').length;u.beds=b&&u.count?Math.round(b/u.count):2;}if(!u.explicit&&/\(unit plan\)$/.test(u.floor)){u.count=null;u.countMissing=true;}u.conf=+u.conf.toFixed(2);return u;});
 // gross areas on block / typical plans (no unit label on that page) = how many units of each size per floor
 const tally={};gross.filter(g=>!g.used&&!pageUnit[g.line.page]).forEach(g=>{const k=Math.round(g.sqft);tally[k]=(tally[k]||0)+1;});
 Object.keys(tally).forEach(k=>{const n=tally[k],same=outUnits.filter(u=>u.sqft&&Math.abs(u.sqft-k)<=k*.01);
  if(same.length){const each=n%same.length===0?n/same.length:null;same.forEach((u,i)=>{u.count=each||(i===0?n:0);u.explicit=true;u.perFloorFrom='block plan';});}
  else outUnits.push({name:'Unit '+(+k).toLocaleString('en-US')+' sq ft',beds:2,type:null,top:false,floor:'Typical floor',count:n,explicit:true,sqft:+k,conf:.7,perFloorFrom:'block plan'});});
 // per-floor summary
 const fsum={};outRooms.filter(r=>r.floorKind!=='unit').forEach(r=>{const f=fsum[r.floor]||(fsum[r.floor]={floor:r.floor,level:r.level,kind:r.floorKind,rooms:0,roomSqft:0,shopSqft:0,baths:0,beds:0});f.rooms++;if(r.sqft&&!/lawn|terrace|parking/.test(r.type))f.roomSqft+=r.sqft;if(r.type==='shop'&&r.sqft)f.shopSqft+=r.sqft;if(r.type==='bath')f.baths++;if(r.type==='bedroom')f.beds++;});
 const floorList=Object.values(fsum).sort((a,b)=>a.level-b.level).map(f=>Object.assign(f,{roomSqft:Math.round(f.roomSqft),covered:Math.round(f.roomSqft*wf)}));
 const pageText={};L.forEach(l=>{pageText[l.page]=(pageText[l.page]||'')+' '+l.text;});
 const levels=[];floors.forEach(f=>{if(f.kind==='block'||levels.some(x=>x.name===f.name))return;const fr=outRooms.filter(r=>r.floor===f.name);
  levels.push({name:f.name,level:f.level,count:f.count||1,kind:f.kind||null,shops:fr.filter(r=>r.type==='shop').length,beds:fr.filter(r=>r.type==='bedroom').length,parking:/\b(car|cars|parking|ramp)\b/i.test(pageText[f.line.page]||'')&&!fr.some(r=>r.type==='bedroom')});});
 levels.sort((a,b)=>a.level-b.level);
 const faMap={};floorAreas.forEach(f=>{const k=f.floor.toLowerCase(),pg=f.line?f.line.page:null,o=faMap[k];if(!o){faMap[k]=Object.assign({},f,{pages:[pg],dups:0});return;}const keep=o.conf<f.conf?Object.assign({},f,{pages:o.pages,dups:o.dups}):o;keep.pages=[...new Set(keep.pages.concat([pg]))];keep.dups++;faMap[k]=keep;});
 // a single floor that sits inside a range read elsewhere ("First floor" vs "1st–10th floor") is the same floor: keep the range
 Object.keys(faMap).forEach(k=>{const f=faMap[k];if((f.count||1)>1||f.level==null)return;const rg=Object.values(faMap).find(g=>g!==f&&(g.count||1)>1&&f.level>=g.level&&f.level<=g.level+g.count-1);if(rg){rg.pages=[...new Set(rg.pages.concat(f.pages))];rg.dups=(rg.dups||0)+1+(f.dups||0);rg.merged=(rg.merged||[]).concat(f.floor+' '+Math.round(f.sqft)+' sq ft');delete faMap[k];}});
 const outFA=Object.values(faMap).sort((a,b)=>a.level-b.level).map(f=>({floor:f.floor,level:f.level,count:f.count||1,sqft:f.sqft,each:!!f.each,kind:f.kind||null,use:f.use||null,conf:+(+f.conf).toFixed(2),raw:f.raw,from:f.from||'text',page:f.line?f.line.page:null,pages:f.pages,dups:f.dups||0,merged:f.merged||null}));
 // plot sides from the drawing borders: top = back, bottom = road/front, left/right (sideways text), optional diagonal
 {const hasPlot=lines.some(l=>/\bplot\b/i.test(l.text||''));
  const one=t=>{let s=String(t||'').replace(/[’`´:]/g,"'").replace(/''+/g,"'");if(/\d\s*[xX×*]\s*\d|road|wide|scale|=/i.test(s))return null;s=s.replace(/(\d{2,3})\s*-\s*(\d{1,2})\s*("|$|\s)/g,"$1'-$2\"$3");const m=s.match(/(?:^|[^\d'])(\d{2,3})\s*'\s*-?\s*(\d{1,2})?\s*"?/);if(!m)return null;const v=+m[1]+(+(m[2]||0))/12;return v>=40&&v<=400&&(+(m[2]||0))<12?+v.toFixed(2):null;};
  const C=[];lines.forEach(l=>{const v=one(l.text);if(v)C.push({v,l});});
  if(hasPlot&&C.length>=2){const ext={};lines.forEach(l=>{if(l.edge||(l.frame||0))return;const e=ext[l.page]||(ext[l.page]={y0:1e9,y1:-1e9,x0:1e9,x1:-1e9});e.y0=Math.min(e.y0,l.y);e.y1=Math.max(e.y1,l.y+(l.h||0));e.x0=Math.min(e.x0,l.x);e.x1=Math.max(e.x1,l.x+(l.w||0));});
   const T=[],B=[],SL=[],SR=[],SU=[];C.forEach(({v,l})=>{const e=ext[l.page];if(l.edge){(l.x<50?SL:SR).push(v);return;}if(l.frame){if(e&&l.frame===1)SL.push(v);else if(e&&l.frame===3)SR.push(v);else SU.push(v);return;}
    if(!e)return;const ry=(l.y-e.y0)/Math.max(1,e.y1-e.y0);(ry<.5?T:B).push(v);});
   const sides=SL.concat(SR,SU);const back=T.length?T.sort((a,b)=>a-b)[Math.floor((T.length-1)/2)]:null;
   let front=B.length?B.slice().sort((a,b)=>Math.abs(a-(back||a))-Math.abs(b-(back||b)))[0]:null;const w0=back||front;
   if(w0&&sides.length){const dmax=Math.max(...sides.filter(v=>v<w0*3.2));const diagC=sides.filter(v=>v>dmax*1.05&&Math.abs(v-Math.hypot(w0,dmax))<Math.hypot(w0,dmax)*.12);
    const dep=sides.filter(v=>!diagC.includes(v)&&v>=w0*.4);const lf=SL.filter(v=>dep.includes(v)),rt=SR.filter(v=>dep.includes(v));
    let left=lf.length?Math.max(...lf):Math.max(...dep),right=rt.length?Math.max(...rt):(dep.filter(v=>v!==left).sort((a,b)=>b-a)[0]||left);
    const S={front:front||back,back:back||front,left,right,diag:diagC[0]||null},q=quadArea(S);
    if(q&&q.sqft>0)plots.push({sqft:Math.round(q.sqft),w:S.back,d:Math.max(left,right),sides:S,method:q.method,raw:`sides ${S.front} / ${S.back} / ${S.left} / ${S.right} ft${S.diag?' + diagonal '+S.diag:''} (${q.method})`,conf:.6,line:null,fromSides:true});}}}
 // handwritten "(1508) S.Yds" under an AREA label often reads as "/508)" ("1" seen as a slash): use it as one more reading of the stated area
 if(plots.some(x=>x.official)){const pgA=new Set(L.filter(l=>/^\W*a\s?r?\s?e\s?a\W*$|\b(?:n?re\s?a|are\s?a)\b/i.test(l.text||'')&&!/total/i.test(l.text||'')).map(l=>l.page));
  L.forEach(l=>{if(!pgA.has(l.page))return;const m=String(l.text||'').match(/^\W{0,2}[\[\/|lI!]\s?(\d{3})\s*\)/);if(m)plots.push({sqft:+('1'+m[1])*9,value:+('1'+m[1]),unit:'sqyd',raw:'AREA ('+'1'+m[1]+') S.Yds',conf:.5,official:true,line:l,areaLine:true});});}
 // several readings of one stated area: vote digit by digit (readings that start with a different digit are misaligned and skipped)
 const voteArea=offs=>{const v=offs.filter(x=>String(x.value).length===4);if(v.length<2)return null;const w=x=>(x.line&&x.line.conf!=null?x.line.conf:60)/100+(x.areaLine?.2:0);
  const pick=i=>{const t={};v.forEach(x=>{const d=String(x.value)[i];t[d]=(t[d]||0)+w(x);});return Object.entries(t).sort((a,b)=>b[1]-a[1])[0][0];};const d0=pick(0),vv=v.filter(x=>String(x.value)[0]===d0);
  let s='';for(let i=0;i<4;i++){const t={};vv.forEach(x=>{const d=String(x.value)[i];t[d]=(t[d]||0)+w(x);});s+=Object.entries(t).sort((a,b)=>b[1]-a[1])[0][0];}return +s;};
 // stated (official) area wins; the side calculation is kept as a cross-check
 {const offs=plots.filter(x=>x.official&&x.sqft),vals=[...new Set(offs.map(x=>Math.round(x.sqft)))],off=offs.sort((a,b)=>b.conf-a.conf)[0],sd=plots.find(x=>x.fromSides);if(off){off.conf=off.line&&off.line.conf!=null&&off.line.conf<75?.45:Math.max(off.conf,.9);
  // the same stated area read differently by different zoom passes (handwriting): pick the one closest to the side calculation, and mark it to check
  if(vals.length>1&&Math.max(...vals)>Math.min(...vals)*1.01){const vs=offs.map(x=>x.sqft).sort((a,b)=>a-b),med=vs[Math.floor((vs.length-1)/2)]/2+vs[Math.ceil((vs.length-1)/2)]/2,vt=voteArea(offs),ref=sd?sd.sqft:(vt?vt*9:med),pick=Object.assign({},(vt&&(!sd||Math.abs(vt*9-sd.sqft)/sd.sqft<=.02))?{sqft:vt*9,value:vt,unit:'sqyd',raw:'stated area '+vt+' sq yd (digit vote)'}:offs.slice().sort((a,b)=>Math.abs(a.sqft-ref)-Math.abs(b.sqft-ref))[0]);Object.assign(off,pick,{conf:.45,raw:pick.raw+' (readings differ: '+[...new Set(offs.map(x=>x.value))].join(' / ')+' sq yd)'});}if(sd){off.sides=sd.sides;off.method=sd.method;off.sidesSqft=sd.sqft;off.diffPct=+((sd.sqft-off.sqft)/off.sqft*100).toFixed(1);sd.conf=.1;}}}
 {const offs=plots.filter(x=>x.official&&x.sqft);if(offs.length>1){const keep=offs.find(x=>String(x.raw).includes('readings differ'))||offs.slice().sort((a,b)=>b.conf-a.conf)[0];offs.forEach(x=>{if(x!==keep)x.conf=0;});keep.conf=Math.max(keep.conf,.01);}}
 const plot=plots.filter(x=>x.conf>0).sort((a,b)=>b.conf-a.conf)[0]||null;
 const stats={lines:L.length,rooms:outRooms.length,sized:outRooms.filter(r=>r.sqft).length,units:outUnits.length,floors:floorList.length};
 return {floorAreas:outFA,rooms:outRooms,units:outUnits,floors:floorList,levels,gross:gross.map(g=>({sqft:g.sqft,raw:g.raw,page:g.line.page,used:!!g.used})),floorNames:floors.map(f=>f.name),plot:plot&&{sides:plot.sides||null,method:plot.method||null,sidesSqft:plot.sidesSqft||null,diffPct:plot.diffPct!=null?plot.diffPct:null,official:!!plot.official,sqft:plot.sqft,value:plot.value||null,unit:plot.unit||null,w:plot.w||null,d:plot.d||null,raw:plot.raw,conf:+plot.conf.toFixed(2)},covered:covered.map(c=>({sqft:c.sqft,raw:c.raw,conf:+c.conf.toFixed(2),floor:(assign(c)||{}).name||null})),wallFactor:wf,stats,little:stats.sized<2&&!plot&&!outUnits.length&&!outFA.length,text:raw.join('\n')};}
const api={quadArea,parse,rowsOf,tables,floorAreaIn,dims,areas,floorOf,unitIn,roomsIn,plotIn,norm,FT_PER_M};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LP=api;
})(typeof self!=='undefined'?self:this);
