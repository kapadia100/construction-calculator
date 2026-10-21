// 📎 Layout upload + auto-read (OCR / PDF text) + review & apply. Everything runs in the browser.
(function(){const A=window.__app,C=window.CALC||window.Calc,H=window.HR,LP=window.LP,$=s=>document.querySelector(s);
const esc=A.esc,n0=x=>Math.round(+x||0).toLocaleString('en-US');
const VEND=new URL('vendor/',location.href).href;
let lastId=null,cur=null,urls=[];
const P=A.P,S=A.S;
// ---------- storage: IndexedDB (Blob) -> IndexedDB (ArrayBuffer, for WebKit private mode) -> small JPEG copy in localStorage -> memory for this tab ----------
const LSK='cc-layout-',mem={},modeOf={};
function dataURLtoBlob(d){const [h,b]=d.split(','),bin=atob(b),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:(h.match(/:(.*?);/)||[])[1]||'image/jpeg'});}
async function smallCopy(rec){if(rec.dataUrl)return rec.dataUrl;const isPdf=/pdf/.test(rec.type||'');let cv;
 if(isPdf){const pdf=await loadPdf(rec.blob);cv=await pdfCanvas(await pdf.getPage(1),1600);}else cv=await toCanvas(rec.blob,1600);
 let d=cv.toDataURL('image/jpeg',.7);if(d.length>2.2e6){const c2=document.createElement('canvas'),k=1100/Math.max(cv.width,cv.height);c2.width=cv.width*k;c2.height=cv.height*k;c2.getContext('2d').drawImage(cv,0,0,c2.width,c2.height);d=c2.toDataURL('image/jpeg',.6);}
 return rec.dataUrl=d;}
async function saveRec(pid,rec){mem[pid]=rec;
 try{await A.idb('put',pid,{name:rec.name,blob:rec.blob,type:rec.type,at:rec.at,read:rec.read||null});try{localStorage.removeItem(LSK+pid);}catch(_){}return modeOf[pid]='idb';}catch(_){}
 try{const buf=await rec.blob.arrayBuffer();await A.idb('put',pid,{name:rec.name,buf,btype:rec.blob.type,type:rec.type,at:rec.at,read:rec.read||null});return modeOf[pid]='idb';}catch(_){}
 try{const d=await smallCopy(rec);localStorage.setItem(LSK+pid,JSON.stringify({name:rec.name,type:rec.type,at:rec.at,dataUrl:d,read:rec.read||null}));return modeOf[pid]='ls';}catch(_){try{localStorage.removeItem(LSK+pid);}catch(e){}}
 return modeOf[pid]='mem';}
async function loadRec(pid){if(mem[pid])return mem[pid];let f=null;try{f=await A.idb('get',pid);}catch(_){}
 if(f){if(!f.blob&&f.buf)f.blob=new Blob([f.buf],{type:f.btype||f.type});if(f.blob){modeOf[pid]='idb';return mem[pid]=f;}}
 try{const s=localStorage.getItem(LSK+pid);if(s){const o=JSON.parse(s);o.blob=dataURLtoBlob(o.dataUrl);o.type='image/jpeg';o.copy=true;modeOf[pid]='ls';return mem[pid]=o;}}catch(_){}
 return null;}
async function delRec(pid){delete mem[pid];delete modeOf[pid];try{await A.idb('delete',pid);}catch(_){}try{localStorage.removeItem(LSK+pid);}catch(_){}}
function hosts(){return document.querySelectorAll('.layHost');}
function cardHTML(where){return `<div class="card layCard"><div class="layTop"><div><h2>📎 Your layout drawing</h2><p class="sub">Photo, scan or PDF of your plan. Saved with this project${where==='est'?' – I can read room sizes from it':''}.</p></div>
 <div class="layBtns"><label class="file accent bigBtn">📎 Upload layout<input type="file" class="layIn" accept="image/*,application/pdf,.pdf"></label><label class="file camBtn">📷 Camera<input type="file" class="layIn" accept="image/*" capture="environment"></label></div></div>
 <div class="layView"></div><div class="layProg" hidden><div class="pbar"><i></i></div><p class="sub pmsg"></p><button class="mini layStop">✋ Stop and use what I have</button></div></div>`;}
function viewHTML(f){if(!f)return '<p class="sub">No layout uploaded yet.</p>';const md=modeOf[P().id];
 const note=md==='mem'||md==='ls'?`<div class="warn friendly privNote">🕶️ Private browsing: the layout is kept until you close this tab. Open in a normal tab to save it.${md==='ls'&&f.copy?' (Showing a smaller saved copy.)':''}</div>`:'';
 const r=f.read,sum=r?`<p class="sub">🔍 Last read: ${r.rooms.length} rooms, ${r.units.length} unit types${r.plot?', plot found':''}.</p>`:'';
 return note+`<div class="layFile"><div class="layThumb"></div><div><b>${esc(f.name)}</b><p class="sub">${(f.blob.size/1024).toFixed(0)} KB · <a class="layOpen" href="#" target="_blank" rel="noopener">Open full size</a></p>${sum}
 <div class="bar"><button class="accent layRead">🔍 Auto-read layout</button>${r?'<button class="layReview">📝 Review last read</button>':''}<button class="danger layDel">🗑️ Remove</button></div></div></div>`;}
async function refresh(force){const p=P();if(!force&&p.id===lastId&&hosts()[0].firstChild)return;lastId=p.id;
 hosts().forEach(h=>{if(!h.firstChild)h.innerHTML=cardHTML(h.dataset.where);});
 const f=await loadRec(p.id);
 cur=f||null;urls.forEach(u=>URL.revokeObjectURL(u));urls=[];
 hosts().forEach(h=>{h.querySelector('.layView').innerHTML=viewHTML(cur);});if(cur)thumbs(cur);}
async function thumbs(f){const u=URL.createObjectURL(f.blob);urls.push(u);document.querySelectorAll('.layOpen').forEach(a=>a.href=u);
 const isPdf=/pdf/.test(f.type||f.blob.type);
 if(!isPdf){document.querySelectorAll('.layThumb').forEach(t=>t.innerHTML=`<img src="${u}" alt="Uploaded layout">`);return;}
 document.querySelectorAll('.layThumb').forEach(t=>t.innerHTML='<p class="sub">📄 PDF – loading preview…</p>');
 try{const pdf=await loadPdf(f.blob),pg=await pdf.getPage(1),cv=await pdfCanvas(pg,900);const d=cv.toDataURL('image/jpeg',.85);document.querySelectorAll('.layThumb').forEach(t=>t.innerHTML=`<img src="${d}" alt="Uploaded layout PDF, page 1">${pdf.numPages>1?`<small>page 1 of ${pdf.numPages}</small>`:''}`);}
 catch(e){document.querySelectorAll('.layThumb').forEach(t=>t.innerHTML='<p class="sub">📄 PDF saved. Preview needs an internet connection the first time.</p>');}}
// ---------- upload ----------
document.addEventListener('change',async e=>{const t=e.target;if(!t.classList||!t.classList.contains('layIn'))return;const f=t.files&&t.files[0];t.value='';if(!f)return;
 if(f.size>40e6){alert('That file is larger than 40 MB. Please upload a smaller photo or PDF.');return;}
 const isPdf=/pdf/.test(f.type)||/\.pdf$/i.test(f.name);if(!isPdf&&f.type&&!/^image\//.test(f.type)){alert('Please choose a photo/image or a PDF.');return;}
 let blob=f;if(!isPdf){try{blob=await shrink(f,2400,.9);}catch(_){blob=f;}}// keep phone photos small; also turns HEIC into JPEG where the browser can decode it
 A.save();const rec={name:f.name||'layout',blob,type:isPdf?'application/pdf':blob.type,at:Date.now()};cur=rec;mem[P().id]=rec;modeOf[P().id]='pending';
 await refresh(true);try{await saveRec(P().id,rec);}catch(_){}await refresh(true);
 await refresh(true);autoRead();});
document.addEventListener('click',async e=>{const b=e.target.closest('.layRead,.layDel,.layReview,.layStop,#lrevX');if(!b)return;if(b.classList.contains('layStop')){cancelReq=true;b.textContent='Stopping…';return;}
 if(b.classList.contains('layDel')){if(!confirm('Remove the uploaded layout from this project?'))return;await delRec(P().id);cur=null;refresh(true);}
 else if(b.classList.contains('layRead'))autoRead();else if(b.classList.contains('layReview')){if(cur&&cur.read)review(cur.read);}else if(b.id==='lrevX')closeRev();});
function toast(m){const n=document.createElement('div');n.className='toast';n.textContent=m;document.body.appendChild(n);setTimeout(()=>n.remove(),4500);}
// ---------- image helpers ----------
function loadImg(blob){return new Promise((res,rej)=>{const u=URL.createObjectURL(blob),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i);};i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Cannot open this image'));};i.src=u;});}
async function toCanvas(blob,max,min){let src;try{src=await createImageBitmap(blob,{imageOrientation:'from-image'});}catch(_){src=await loadImg(blob);}
 const w=src.width,h=src.height,L=Math.max(w,h),k=L>max?max/L:(min&&L<min?Math.min(2,min/L):1),cv=document.createElement('canvas');cv.width=Math.round(w*k);cv.height=Math.round(h*k);
 const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(src,0,0,cv.width,cv.height);if(src.close)src.close();return cv;}
async function shrink(f,max,q){const cv=await toCanvas(f,max);return await new Promise(r=>cv.toBlob(b=>r(b||f),'image/jpeg',q));}
// whiten long straight wall lines so the text reader sees only the labels
function unline(cv){const w=cv.width,h=cv.height,cx=cv.getContext('2d'),d=cx.getImageData(0,0,w,h),a=d.data,L=Math.max(45,Math.round(Math.min(w,h)/25)),m=new Uint8Array(w*h);
 for(let y=0;y<h;y++){let s=-1;for(let x=0;x<=w;x++){const dk=x<w&&a[(y*w+x)*4]<128;if(dk&&s<0)s=x;if(!dk&&s>=0){if(x-s>=L)for(let k=s;k<x;k++)m[y*w+k]=1;s=-1;}}}
 for(let x=0;x<w;x++){let s=-1;for(let y=0;y<=h;y++){const dk=y<h&&a[(y*w+x)*4]<128;if(dk&&s<0)s=y;if(!dk&&s>=0){if(y-s>=L)for(let k=s;k<y;k++)m[k*w+x]=1;s=-1;}}}
 for(let i=0;i<w*h;i++)if(m[i]){a[i*4]=a[i*4+1]=a[i*4+2]=255;}cx.putImageData(d,0,0);return cv;}
// rendered brochures (furniture, carpets, coloured fills): keep only near-black, unsaturated ink = the text
function darkMask(cv,T){const cx=cv.getContext('2d',{willReadFrequently:true}),d=cx.getImageData(0,0,cv.width,cv.height),a=d.data,sc=255/(T-40);for(let i=0;i<a.length;i+=4){const r=a[i],g=a[i+1],b=a[i+2],mx=r>g?(r>b?r:b):(g>b?g:b),mn=r<g?(r<b?r:b):(g<b?g:b);let v=255;if(mx<T&&mx-mn<60){v=(.299*r+.587*g+.114*b-40)*sc;v=v<0?0:v>255?255:v;}a[i]=a[i+1]=a[i+2]=v;}cx.putImageData(d,0,0);return cv;}
function colourful(cv){const d=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,cv.width,cv.height).data;let n=0,c=0;for(let i=0;i<d.length;i+=16){const r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);n++;if(mx-mn>40||(mx>110&&mx<215))c++;}return c/n;}
function gray(cv){const cx=cv.getContext('2d'),d=cx.getImageData(0,0,cv.width,cv.height),a=d.data;for(let i=0;i<a.length;i+=4){let g=.299*a[i]+.587*a[i+1]+.114*a[i+2];g=g>200?255:g<60?0:(g-60)*255/140;a[i]=a[i+1]=a[i+2]=g;}cx.putImageData(d,0,0);return cv;}
// ---------- libraries (self-hosted in /vendor, cached by the service worker after first use) ----------
let pdfjs=null,worker=null,wTimer=null,progCb=null;
async function loadPdfjs(){if(pdfjs)return pdfjs;pdfjs=await import(VEND+'pdfjs/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=VEND+'pdfjs/pdf.worker.min.mjs';return pdfjs;}
async function loadPdf(blob){const lib=await loadPdfjs();return await lib.getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false}).promise;}
async function pdfCanvas(pg,target){const v1=pg.getViewport({scale:1}),sc=Math.min(4,target/Math.max(v1.width,v1.height)),v=pg.getViewport({scale:sc}),cv=document.createElement('canvas');cv.width=Math.round(v.width);cv.height=Math.round(v.height);const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);await pg.render({canvasContext:cx,viewport:v}).promise;return cv;}
function script(src){return new Promise((res,rej)=>{if(window.Tesseract)return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Could not load the text reader. Connect to the internet once so it can be saved for offline use.'));document.head.appendChild(s);});}
async function ocrWorker(){clearTimeout(wTimer);if(worker)return worker;await script(VEND+'tesseract/tesseract.min.js');
 // phones without WebAssembly SIMD (iOS before 16.4) need the plain build, which is too big for our host: fetch that one from the public npm CDN
 let simd=false;try{simd=WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]));}catch(_){}
 worker=await Tesseract.createWorker('eng',1,{workerPath:VEND+'tesseract/worker.min.js',corePath:simd?VEND+'tesseract/':'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/',langPath:VEND+'lang',gzip:true,workerBlobURL:false,logger:m=>progCb&&progCb(m)});
 await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});return worker;}
function idleKill(){clearTimeout(wTimer);wTimer=setTimeout(()=>{if(worker){worker.terminate();worker=null;}},90000);}
function withTimeout(p,ms){let t;return Promise.race([p,new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error('timeout')),ms);})]).finally(()=>clearTimeout(t));}
function free(cv){if(cv){cv.width=cv.height=0;}}
// OCR one canvas; m maps canvas px back to the source: native = s + px/k. A stuck page is abandoned after 90 s (the worker is restarted).
async function ocr(cv,page,m){m=m||{sx:0,sy:0,k:1};if(window.LAY_DEBUG&&page===LAY_DEBUG.page)LAY_DEBUG.c.push(cv.toDataURL('image/png'));const w=await ocrWorker();let data;
 try{({data}=await withTimeout(w.recognize(cv),90000));}catch(e){try{worker&&worker.terminate();}catch(_){}worker=null;return [];}
 const out=[];(data.lines||[]).forEach(l=>{const t=(l.text||'').trim();if(!t||(l.confidence<25&&!/\d.*[x×X*].*\d|\d['’]/.test(t)))return;const b=l.bbox;out.push({text:t,x:m.sx+b.x0/m.k,y:m.sy+b.y0/m.k,w:(b.x1-b.x0)/m.k,h:(b.y1-b.y0)/m.k,page,conf:l.confidence,frame:m.frame||0});});return out;}
// pdf.js text items -> lines. Items are grouped per text direction (CAD exports often have vertical text and one item per word or letter).
function pdfLines(items,vh,page){const it=items.filter(i=>i.str&&i.str.trim()).map(i=>{const [a,b,c,d,e,f]=i.transform,len=Math.hypot(a,b)||1,dx=a/len,dy=b/len,h=Math.hypot(c,d)||len||10,fr=Math.round(Math.atan2(dy,dx)/(Math.PI/2))&3;
  const u=e*dx+f*dy,v=-e*dy+f*dx;return {text:i.str,x:u,y:(fr?-v:vh-f)-h,w:i.width||i.str.length*h*.5,h,page,conf:96,frame:fr};}).sort((a,b)=>a.frame-b.frame||a.y-b.y||a.x-b.x);
 const lines=[];it.forEach(i=>{const l=lines.find(l=>l.frame===i.frame&&Math.abs(l.y-i.y)<l.h*.5&&i.x-(l.x+l.w)<l.h*1.2&&i.x-(l.x+l.w)>-l.h);if(l){l.text+=(i.x-(l.x+l.w)>l.h*.15?' ':'')+i.str;l.w=Math.max(l.w,i.x+i.w-l.x);}else lines.push(Object.assign({},i));});return lines;}
// what a drawing page looks like in text
const PLANRE=/(floor\s*plan|\bplan\b|bed\s*r|\bbed\b|lounge|kitchen|toilet|bath|\bshop|drawing|dining|porch|sq\.?\s*ft|\bsft\b|\d\s*'\s*-?\s*\d*\s*"?\s*x\s*\d|\b\d{1,2}\s*x\s*\d{1,2}\b)/i;
const KEEPRE=/(\d\s*'|\d\s*x\s*\d|bed|room|lounge|kitchen|bath|toilet|shop|drawing|dining|store|porch|lift|stair|lobby|sq|sft|plan)/i;
// sources: a PDF page (points) or a decoded image (pixels); draw(region, scale) -> canvas
function pdfSrc(pg){const v=pg.getViewport({scale:1});return {W:v.width,H:v.height,pts:true,async draw(sx,sy,sw,sh,k){const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(sw*k));cv.height=Math.max(1,Math.round(sh*k));const cx=cv.getContext('2d',{willReadFrequently:true});cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);
 await pg.render({canvasContext:cx,viewport:pg.getViewport({scale:k,offsetX:-sx*k,offsetY:-sy*k})}).promise;return cv;}};}
async function imgSrc(blob){let src;try{src=await createImageBitmap(blob,{imageOrientation:'from-image'});}catch(_){src=await loadImg(blob);}
 return {W:src.width,H:src.height,pts:false,async draw(sx,sy,sw,sh,k){const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(sw*k));cv.height=Math.max(1,Math.round(sh*k));const cx=cv.getContext('2d',{willReadFrequently:true});cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(src,sx,sy,sw,sh,0,0,cv.width,cv.height);return cv;},close(){if(src.close)src.close();}};}
function rot(cv,deg){const r=document.createElement('canvas');r.width=cv.height;r.height=cv.width;const cx=r.getContext('2d',{willReadFrequently:true});cx.translate(r.width/2,r.height/2);cx.rotate(deg*Math.PI/180);cx.drawImage(cv,-cv.width/2,-cv.height/2);return r;}
const TILE=2400,OVER=360;
// read one page/image: quick look -> if it is a drawing, a sharper tiled pass (tiny CAD text) -> sideways passes when labels are missing their sizes
async function readSource(src,page,always,step){const L=Math.max(src.W,src.H);
 let k=Math.min(src.pts?4:1.5,1400/L),cv=await src.draw(0,0,src.W,src.H,k);const rich=colourful(cv)>.12,prep=c=>unline(rich?darkMask(c,150):gray(c));
 prep(cv);let lines=await ocr(cv,page,{sx:0,sy:0,k});free(cv);
 if(cancelReq||(!always&&!PLANRE.test(lines.map(l=>l.text).join(' '))))return {lines,plan:false};
 // sharper pass: ~4400 px across an A4/A3 sheet (≈2.5× a 150 dpi scan) so 6-9 px labels become readable; cut into tiles to keep phone memory low
 const T=src.pts?Math.min(5200,Math.max(3000,L*5.2)):Math.min(5200,Math.max(2600,L*(rich?2.5:1))),k2=T/L,cw=src.W*k2,ch=src.H*k2,nx=Math.ceil((cw-OVER)/(TILE-OVER)),ny=Math.ceil((ch-OVER)/(TILE-OVER));
 const tiles=[];for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x0=Math.min(i*(TILE-OVER),Math.max(0,cw-TILE)),y0=Math.min(j*(TILE-OVER),Math.max(0,ch-TILE));tiles.push([x0/k2,y0/k2,Math.min(TILE,cw)/k2,Math.min(TILE,ch)/k2]);}
 let hi=[];for(let t=0;t<tiles.length&&!cancelReq;t++){step&&step(`sharp pass ${t+1}/${tiles.length}`,(t+1)/(tiles.length+2));const [sx,sy,sw,sh]=tiles[t];const c=prep(await src.draw(sx,sy,sw,sh,k2));hi=hi.concat(await ocr(c,page,{sx,sy,k:k2}));free(c);await new Promise(r=>setTimeout(r,0));}
 // drop duplicates read twice in the tile overlaps
 const seen=[];hi=hi.filter(l=>{const d=seen.find(o=>o.text===l.text&&Math.abs(o.x-l.x)<l.h*2&&Math.abs(o.y-l.y)<l.h);if(d)return false;seen.push(l);return true;});
 // keep big headings, unit/plot/area labels from the quick look (tiles can cut long titles)
 const dg=t=>(t.match(/\d+/g)||[]).join(',');
 if(hi.length>=lines.length*.6){const keep=lines.filter(l=>LP.floorOf(l.text)||LP.unitIn(l.text)||LP.plotIn(l.text)||/area|plan/i.test(l.text));lines=hi.concat(keep.filter(k=>!hi.some(h=>Math.abs(h.y-k.y)<Math.max(h.h,k.h)&&h.x<k.x+k.w&&k.x<h.x+h.w&&(h.text===k.text||(dg(h.text)&&dg(h.text)===dg(k.text))))));}
 // close-up re-read under each room name that has no size yet (sizes are usually printed right below the name)
 if(!cancelReq){const pr=LP.parse(lines),bare=pr.rooms.filter(r=>!r.sqft&&r.box).slice(0,40);
  if(bare.length){const w=await ocrWorker();await w.setParameters({tessedit_pageseg_mode:'6'});
   const grab=async(b,sx,sy,sw,sh,psm)=>{sx=Math.max(0,sx);sy=Math.max(0,sy);sw=Math.min(src.W-sx,sw);sh=Math.min(src.H-sy,sh);const h=Math.max(b.h,2),k4=Math.min(k2,Math.max(k2*.4,24/h));await w.setParameters({tessedit_pageseg_mode:psm});
    const c=prep(await src.draw(sx,sy,sw,sh,k4));const rl=await ocr(c,page,{sx,sy,k:k4});free(c);return rl.filter(l=>LP.dims(l.text).length&&!LP.roomsIn(l.text).length);};
   for(let i=0;i<bare.length&&!cancelReq;i++){step&&step(`close-up ${i+1}/${bare.length}`,.9);const b=bare[i].box,h=Math.max(b.h,2),cx=b.x+b.w/2,hw=Math.max(b.w*.85,h*4.5);
    let rl=await grab(b,cx-hw,b.y+b.h*.9,hw*2,h*1.7,'7');
    if(!rl.length)rl=await grab(b,cx-hw*1.3,b.y-h*.3,hw*2.6,h*4.2,'6');
    rl.slice(0,1).forEach(l=>{l.y=Math.max(l.y,b.y+b.h*1.05);l.x=Math.min(l.x,cx-l.w/2);l.conf=Math.min(l.conf,85);lines.push(l);});}
   await w.setParameters({tessedit_pageseg_mode:'11'});}}

 const probe=LP.parse(lines),bare=probe.rooms.filter(r=>!r.sqft).length;
 if(bare>=2&&!cancelReq){const k3=Math.min(src.pts?4:1,2400/L),base=prep(await src.draw(0,0,src.W,src.H,k3));
  for(const [deg,fr] of [[90,1],[270,3]]){if(cancelReq)break;step&&step('sideways text',.95);const r=rot(base,deg);const rl=(await ocr(r,page,{sx:0,sy:0,k:k3,frame:fr})).filter(l=>KEEPRE.test(l.text));free(r);lines=lines.concat(rl);}
  free(base);}
 return {lines,plan:true};}
// ---------- progress ----------
function prog(pct,msg){document.querySelectorAll('.layProg').forEach(p=>{p.hidden=pct==null;p.querySelector('i').style.width=Math.round(pct||0)+'%';p.querySelector('.pmsg').textContent=msg||'';});document.querySelectorAll('.layRead').forEach(b=>b.disabled=pct!=null);}
let busy=false;
let cancelReq=false;
let again=false;async function autoRead(){if(!cur)return;if(busy){again=true;cancelReq=true;return;}busy=true;again=false;cancelReq=false;const f=cur,pid=P().id,isPdf=/pdf/.test(f.type||f.blob.type);let lines=[];
 try{prog(3,'Getting ready…');let base=5,span=85;
  document.querySelectorAll('.layStop').forEach(b=>b.textContent='✋ Stop and use what I have');
  progCb=m=>{if(m.status==='recognizing text')return;else if(/load|initializ/.test(m.status))prog(Math.min(base,4+(m.progress||0)*4),'Loading the text reader (first time only)…');};
  const t0=Date.now();
  if(isPdf){prog(5,'Opening PDF…');const pdf=await loadPdf(f.blob),N=Math.min(pdf.numPages,40);let plans=0;
   for(let i=1;i<=N&&!cancelReq;i++){base=5+88*(i-1)/N;span=88/N;const lab=`Page ${i} of ${N}`;prog(base,lab+'…');const pg=await pdf.getPage(i),v=pg.getViewport({scale:1}),tc=await pg.getTextContent(),pl=pdfLines(tc.items,v.height,i-1),txt=pl.map(l=>l.text).join(' ');
    let useOcr=txt.replace(/\s/g,'').length<15;if(!useOcr&&!PLANRE.test(txt)){try{const ops=await pg.getOperatorList(),O=pdfjs.OPS;useOcr=ops.fnArray.some(x=>x===O.paintImageXObject||x===O.paintJpegXObject||x===O.paintInlineImageXObject);}catch(_){}}
    lines=lines.concat(pl);
    if(useOcr){const r=await readSource(pdfSrc(pg),i-1,false,(m,fr)=>prog(base+span*fr,`${lab}: ${m}…`));lines=lines.concat(r.lines);if(r.plan)plans++;}
    else if(PLANRE.test(txt))plans++;
    pg.cleanup&&pg.cleanup();}
   lines.plans=plans;}
  else{prog(5,'Preparing image…');const src=await imgSrc(f.blob);base=5;span=88;const r=await readSource(src,0,true,(m,fr)=>prog(base+span*fr,`Reading: ${m}…`));src.close&&src.close();lines=r.lines;}
  const secs=Math.round((Date.now()-t0)/1000);
  prog(95,'Finding rooms & sizes…');window.LAY&&(LAY.lines=lines);const r=LP.parse(lines,{marla:+S().marlaSqft||225});r.file=f.name;r.at=Date.now();r.secs=secs;r.stopped=cancelReq;
  f.read=r;try{await saveRec(pid,f);}catch(_){}if(cur!==f||P().id!==pid||again){prog(null);return;}prog(100,'Done');setTimeout(()=>prog(null),600);refresh(true);review(r);}
 catch(e){prog(null);alert('Sorry, I could not read this file: '+(e&&e.message||e)+'\nYou can still enter sizes by hand.');}
 finally{busy=false;progCb=null;idleKill();warm();if(again&&cur&&cur!==f){again=false;setTimeout(autoRead,0);}else again=false;}}
// after the first auto-read, quietly fetch the other reader too so photos AND PDFs both work offline later
let warmed=false;function warm(){if(warmed||!navigator.onLine)return;warmed=true;['pdfjs/pdf.min.mjs','pdfjs/pdf.worker.min.mjs','tesseract/tesseract.min.js','tesseract/worker.min.js','tesseract/tesseract-core-simd-lstm.wasm.js','lang/eng.traineddata.gz'].forEach((f,i)=>setTimeout(()=>fetch(VEND+f).catch(()=>{}),1500+i*500));}
// ---------- review screen ----------
let R=null;
const badge=c=>{const p=Math.round((c||0)*100),k=p>=75?'hi':p>=50?'mid':'lo';return `<span class="conf ${k}" title="How sure I am">${k==='hi'?'High':k==='mid'?'Medium':'Low'} ${p}%</span>`;};
const inp=(k,v,i,w)=>`<input type="text" inputmode="decimal" autocomplete="off" data-k="${k}" ${i!=null?`data-i="${i}"`:''} value="${v==null?'':v}" style="width:${w||70}px">`;
function plotUnitOf(){const p=P();return p.mode==='highrise'?(p.hr.plotUnit||'sqyd'):p.plotUnit;}
const UF={sqyd:9,sqft:1};
function unitSq(u){return u==='marla'?(+S().marlaSqft||225):(UF[u]||1);}
function review(r){R=JSON.parse(JSON.stringify(r));R.rooms.forEach(x=>x.on=x.sqft!=null&&x.conf>=.4);R.units.forEach(u=>u.on=true);R.wfPct=Math.round((R.wallFactor-1)*100);R.plotOn=!!R.plot;R.useCov=R.covered.length>0;$('#lrev').hidden=false;drawRev();}
function closeRev(){$('#lrev').hidden=true;}
function floorsCalc(){const fs={};R.rooms.forEach(r=>{if(!r.on||!(r.sqft>0))return;const f=fs[r.floor]||(fs[r.floor]={floor:r.floor,level:r.level,kind:r.floorKind,sq:0,shop:0,baths:0,rooms:0});if(!/lawn|terrace|parking/.test(r.type))f.sq+=+r.sqft;if(r.type==='shop')f.shop+=+r.sqft;if(r.type==='bath')f.baths++;if(!/lawn|terrace|corridor|stair|lift|lobby|parking/.test(r.type))f.rooms++;});
 const k=1+(+R.wfPct||0)/100;return Object.values(fs).sort((a,b)=>a.level-b.level).map(f=>Object.assign(f,{cov:Math.round(f.sq*k)}));}
const blank=v=>v===''||v==null||!(+v>0);const ch=(o,n)=>blank(o)?n:`${o} → ${n}`;
function proposals(){const p=P(),hr=p.mode==='highrise',out=[],fl=floorsCalc(),pu=plotUnitOf();
 if(R.plot&&R.plotOn){const v=+(R.plot.sqft/unitSq(pu)).toFixed(1),old=hr?p.hr.plotArea:p.plotArea;out.push({id:'plot',t:`Plot area: ${ch(blank(old)?'':n0(old),`<b>${v}</b>`)} ${pu==='sqyd'?'sq yd':pu}`+(R.plot.w?` (${R.plot.w} × ${R.plot.d} ft)`:''),f:()=>{if(hr){p.hr.plotArea=v;if(R.plot.w){p.hr.plotW=R.plot.w;p.hr.plotD=R.plot.d;}}else{if(p.plotPriceMode==='perunit'){}p.plotArea=v;}}});}
 const covList=R.useCov&&R.covered.length?R.covered.map(c=>c.sqft):null;
 if(!hr){const abv=fl.filter(f=>f.level>=0&&f.level<20),areas=covList&&covList.length>=abv.length?covList:abv.map(f=>f.cov);
  if(areas.length&&areas.some(a=>a>0)){const same=areas.every(a=>Math.abs(a-areas[0])<1);out.push({id:'cov',t:`Floors: ${ch(p.floors,`<b>${areas.length}</b>`)}; covered area per floor: ${same?`${ch(blank(p.bua)?'':n0(p.bua),`<b>${n0(areas[0])}</b>`)} sq ft`:areas.map((a,i)=>`${i?'Floor '+i:'Ground'} <b>${n0(a)}</b>`).join(', ')+' sq ft'}`,f:()=>{p.floors=areas.length;p.bua=areas[0];if(same){p.override=false;}else{p.override=true;p.floorAreas=areas.slice();}}});}
  if(fl.some(f=>f.level<0))out.push({id:'base',t:'Basement found → set <b>Basement</b>',f:()=>{p.extra='basement';}});
  if(abv.length){out.push({id:'items',t:'BOQ counts from rooms: doors '+abv.map(f=>`<b>${f.rooms+(f.level===0?0:0)}</b>`).join(' / ')+', geysers '+abv.map(f=>`<b>${Math.max(f.baths,0)}</b>`).join(' / ')+' (per floor)',f:()=>{p.edits=p.edits||{};abv.forEach((f,i)=>{if(f.rooms){p.edits['f'+i+':door']=Object.assign(p.edits['f'+i+':door']||{},{qty:f.rooms});}if(f.baths){p.edits['f'+i+':pl_gey']=Object.assign(p.edits['f'+i+':pl_gey']||{},{qty:f.baths});}});}});}}
 else{const h=p.hr,g=fl.find(f=>f.level===0);
  if(g&&g.cov>0)out.push({id:'ground',t:`Ground floor built area: ${ch(h.groundAuto!==false||blank(h.groundArea)?'':n0(h.groundArea),`<b>${n0(g.cov)}</b>`)} sq ft`,f:()=>{h.groundAuto=false;h.groundArea=g.cov;}});
  const cf=fl.filter(f=>f.level>=1&&(f.kind==='commercial'||f.shop>=f.sq*.5)&&f.sq>0);
  if(cf.length)out.push({id:'comm',t:`Commercial floors: ${ch(h.commercial,`<b>${cf.length}</b>`)}, areas ${cf.map(f=>'<b>'+n0(f.cov)+'</b>').join(', ')} sq ft`,f:()=>{h.commercial=cf.length;h.commAuto=false;h.commAreas=cf.map(f=>f.cov);}});
  const us=R.units.filter(u=>u.on&&u.name);if(us.length)out.push({id:'units',t:`Unit mix (${R.mixMode==='merge'?'update/add':'replace'}): `+us.map(u=>`<b>${esc(u.name)}</b> ${n0(u.sqft)} sq ft × ${u.count}/floor`).join(', '),f:()=>{const nu=us.map(u=>{const d=H.UNIT_TYPES.find(t=>+t.beds===+u.beds&&!t.top)||H.UNIT_TYPES[2];return {name:u.name,beds:+u.beds||0,size:+u.sqft||d.size,perFloor:+u.count||1,park:d.park!=null?d.park:1,top:!!u.top};});
   if(R.mixMode==='merge'){nu.forEach(n=>{const e=h.units.find(x=>x.name.toLowerCase()===n.name.toLowerCase());if(e)Object.assign(e,n);else h.units.push(n);});}else h.units=nu;}});}
 return out;}
function drawRev(){const r=R,hr=P().mode==='highrise',pu=plotUnitOf();let x='';
 if(r.little)x+=`<div class="warn friendly">🙈 I couldn't read much from this layout. That's normal for hand sketches, blurry photos or drawings with tiny text.<br>Tips: take the photo straight on in good light, crop to one floor, or upload the architect's PDF. You can also type the sizes below or in the Estimate tab.</div>`;
 x+=`<p class="sub">Nothing changes until you press <b>Apply selected</b>. Untick anything that looks wrong and fix numbers right here.</p>`;
 x+=`<h3>🗺️ Plot</h3>`+(r.plot?`<label class="chk"><input type="checkbox" data-k="plotOn" ${r.plotOn?'checked':''}> Plot ${r.plot.w?`${r.plot.w} × ${r.plot.d} ft = `:''}${inp('plotSqft',r.plot.sqft,null,90)} sq ft (= ${(r.plot.sqft/unitSq(pu)).toFixed(1)} ${pu==='sqyd'?'sq yd':pu}) ${badge(r.plot.conf)}</label><p class="sub">Read as “${esc(r.plot.raw)}”</p>`:'<p class="sub">No plot size found (look for text like “Plot 30\' × 60\'” or “200 sq yd”).</p>');
 x+=`<h3>🛏️ Rooms (${r.rooms.length})</h3>`;
 if(r.rooms.length){x+='<div class="rtWrap"><table class="rt"><thead><tr><th></th><th>Room</th><th>W ft</th><th>L ft</th><th>Area sq ft</th><th>Floor</th><th>Sure?</th></tr></thead><tbody>'+r.rooms.map((m,i)=>`<tr class="${m.on?'':'off'}"><td><input type="checkbox" data-k="on" data-i="${i}" ${m.on?'checked':''} aria-label="Use ${esc(m.name)}"></td><td><input data-k="name" data-i="${i}" value="${esc(m.name)}" style="width:110px"></td><td data-l="W ft">${inp('w',m.w,i,56)}</td><td data-l="L ft">${inp('d',m.d,i,56)}</td><td data-l="Area sq ft">${inp('sqft',m.sqft,i,70)}</td><td data-l="Floor"><input data-k="floor" data-i="${i}" value="${esc(m.floor)}" style="width:100px"></td><td>${badge(m.conf)}${m.metric?' <small>m→ft</small>':''}</td></tr>`).join('')+'</tbody></table></div>';}
 else x+='<p class="sub">No room labels found.</p>';
 const fl=floorsCalc();
 if(fl.length)x+=`<label class="wfp">Walls &amp; passages add ${inp('wfPct',r.wfPct,null,50)} % to room areas</label><table class="rt sumf"><tr><th>Floor</th><th>Rooms total</th><th>≈ Covered area</th><th>Baths</th></tr>`+fl.map(f=>`<tr><td>${esc(f.floor)}</td><td>${n0(f.sq)} sq ft</td><td><b>${n0(f.cov)} sq ft</b></td><td>${f.baths}</td></tr>`).join('')+'</table>';
 if(r.covered.length)x+=`<label class="chk"><input type="checkbox" data-k="useCov" ${r.useCov?'checked':''}> Use the covered area printed on the drawing: ${r.covered.map(c=>`<b>${n0(c.sqft)}</b> sq ft ${badge(c.conf)}`).join(', ')}</label>`;
 x+=`<h3>🏢 Unit types (${r.units.length})</h3>`;
 if(r.units.length){x+='<div class="rtWrap"><table class="rt"><thead><tr><th></th><th>Unit</th><th>Beds</th><th>Size sq ft</th><th>Per floor</th><th>Floor</th><th>Sure?</th></tr></thead><tbody>'+r.units.map((u,i)=>`<tr class="${u.on?'':'off'}"><td><input type="checkbox" data-k="uon" data-i="${i}" ${u.on?'checked':''}></td><td><input data-k="uname" data-i="${i}" value="${esc(u.name)}" style="width:120px"></td><td data-l="Beds">${inp('ubeds',u.beds,i,40)}</td><td data-l="Size sq ft">${inp('usqft',u.sqft,i,70)}</td><td data-l="Per floor">${inp('ucount',u.count,i,44)}</td><td data-l="Floor">${esc(u.floor)}</td><td>${badge(u.conf)}${u.fromRooms?' <small>from rooms</small>':''}</td></tr>`).join('')+'</tbody></table></div>';
  if(hr)x+=`<div class="chips small"><button data-mix="replace" class="${R.mixMode!=='merge'?'on':''}">Replace unit mix</button><button data-mix="merge" class="${R.mixMode==='merge'?'on':''}">Update / add to mix</button></div>`;}
 else x+=`<p class="sub">No flat/unit labels found${hr?' (e.g. “2 BED”, “3BHK”, “Type A”)':''}.</p>`;
 const pr=proposals();x+=`<h3>✅ Apply to this ${hr?'high-rise':'house'} project</h3>`+(pr.length?'<div class="props">'+pr.map(q=>`<label class="chk"><input type="checkbox" data-prop="${q.id}" ${R['no_'+q.id]?'':'checked'}> <span>${q.t}</span></label>`).join('')+'</div>':'<p class="sub">Nothing to apply yet – tick or fill in some rows above.</p>');
 if(!hr&&r.units.length)x+='<p class="sub">Unit types apply to High-rise projects. Switch the mode on the Estimate tab to use them.</p>';
 x+=`<details class="rawTxt"><summary>Text I read</summary><pre>${esc(r.text||'')}</pre></details><div class="wizNav"><button id="lrevCancel">Cancel</button><button id="lrevApply" class="accent" ${pr.length?'':'disabled'}>Apply selected</button></div>`;
 const b=$('#lrevBody'),y=b.scrollTop;b.innerHTML=x;b.scrollTop=y;}
$('#lrevBody').addEventListener('change',e=>{const t=e.target,k=t.dataset.k,i=t.dataset.i;if(t.dataset.prop){R['no_'+t.dataset.prop]=!t.checked;return;}if(!k)return;
 const num=A.num,rm=i!=null?R.rooms[i]:null,u=i!=null?R.units[i]:null;
 if(k==='on')rm.on=t.checked;else if(k==='name')rm.name=t.value;else if(k==='floor'){rm.floor=t.value;const f=LP.floorOf(t.value+(/floor/i.test(t.value)?'':' floor'));if(f)rm.level=f.level;}
 else if(k==='w'||k==='d'){rm[k]=num(t.value)||null;if(rm.w&&rm.d)rm.sqft=+(rm.w*rm.d).toFixed(1);}else if(k==='sqft')rm.sqft=num(t.value)||null;
 else if(k==='uon')u.on=t.checked;else if(k==='uname')u.name=t.value;else if(k==='ubeds')u.beds=num(t.value);else if(k==='usqft')u.sqft=num(t.value);else if(k==='ucount')u.count=num(t.value);
 else if(k==='plotOn')R.plotOn=t.checked;else if(k==='plotSqft')R.plot.sqft=num(t.value);else if(k==='wfPct')R.wfPct=num(t.value);else if(k==='useCov')R.useCov=t.checked;drawRev();});
$('#lrevBody').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.mix){R.mixMode=b.dataset.mix;drawRev();}
 else if(b.id==='lrevCancel')closeRev();else if(b.id==='lrevApply'){const pr=proposals().filter(q=>!R['no_'+q.id]);if(!pr.length){alert('Nothing selected.');return;}
  const d=document.createElement('div');d.innerHTML=pr.map(q=>'• '+q.t).join('\n');if(!confirm('Apply these changes to "'+P().name+'"?\n\n'+d.textContent+'\n\nYou can undo right after.'))return;
  const before=JSON.stringify(P());pr.forEach(q=>q.f());if(P().mode==='highrise')A.ensureHR(P());A.save();A.loadInputs();A.applyMode();A.renderAll();closeRev();undoToast(before);}});
$('#lrev').addEventListener('click',e=>{if(e.target.id==='lrev')closeRev();});
function undoToast(before){const n=document.createElement('div');n.className='toast';n.innerHTML='✅ Applied from your layout <button class="mini">Undo</button>';document.body.appendChild(n);const tm=setTimeout(()=>n.remove(),9000);
 n.querySelector('button').onclick=()=>{const st=A.st(),i=st.projects.findIndex(p=>p.id===JSON.parse(before).id);if(i>=0)st.projects[i]=JSON.parse(before);A.save();A.loadInputs();A.applyMode();A.renderAll();n.remove();clearTimeout(tm);};}
window.LAY={refresh,autoRead,review,rev:()=>R,_parse:LP.parse,_pdfLines:pdfLines};
refresh(true);
})();
