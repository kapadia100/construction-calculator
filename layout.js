// 📎 Layout upload + auto-read (OCR / PDF text) + review & apply. Everything runs in the browser.
(function(){const A=window.__app,C=window.CALC||window.Calc,H=window.HR,LP=window.LP,$=s=>document.querySelector(s);
const esc=A.esc,n0=x=>Math.round(+x||0).toLocaleString('en-US');
const VEND=new URL('vendor/',location.href).href;
let lastId=null,cur=null,urls=[];
const P=A.P,S=A.S;
// ---------- storage: a queue of files per project. IndexedDB (Blob) -> IndexedDB (ArrayBuffer, for WebKit private mode) -> small JPEG copies in localStorage -> memory for this tab ----------
const LSK='cc-layout-',mem={},modeOf={},MAXF=20;
let fidN=0;const fid=()=>'f'+Date.now().toString(36)+(fidN++);
function dataURLtoBlob(d){const [h,b]=d.split(','),bin=atob(b),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:(h.match(/:(.*?);/)||[])[1]||'image/jpeg'});}
const isPdfF=f=>/pdf/.test(f.type||(f.blob&&f.blob.type)||'');
async function smallCopy(f){if(f.dataUrl)return f.dataUrl;let cv;
 if(isPdfF(f)){const pdf=await loadPdf(f.blob);cv=await pdfCanvas(await pdf.getPage(1),1600);}else cv=await toCanvas(f.blob,1600);
 let d=cv.toDataURL('image/jpeg',.7);if(d.length>2.2e6){const c2=document.createElement('canvas'),k=1100/Math.max(cv.width,cv.height);c2.width=cv.width*k;c2.height=cv.height*k;c2.getContext('2d').drawImage(cv,0,0,c2.width,c2.height);d=c2.toDataURL('image/jpeg',.6);}
 return f.dataUrl=d;}
const meta=f=>({id:f.id,name:f.name,type:f.type,at:f.at,pages:f.pages||null});
async function saveRec(pid,rec){mem[pid]=rec;
 try{await A.idb('put',pid,{files:rec.files.map(f=>Object.assign(meta(f),{blob:f.blob})),read:rec.read||null,readIds:rec.readIds||null});try{localStorage.removeItem(LSK+pid);}catch(_){}return modeOf[pid]='idb';}catch(_){}
 try{const fs=[];for(const f of rec.files)fs.push(Object.assign(meta(f),{buf:await f.blob.arrayBuffer(),btype:f.blob.type}));await A.idb('put',pid,{files:fs,read:rec.read||null,readIds:rec.readIds||null});return modeOf[pid]='idb';}catch(_){}
 try{const fs=[];for(const f of rec.files)fs.push(Object.assign(meta(f),{dataUrl:await smallCopy(f)}));localStorage.setItem(LSK+pid,JSON.stringify({files:fs,read:rec.read||null,readIds:rec.readIds||null}));return modeOf[pid]='ls';}catch(_){try{localStorage.removeItem(LSK+pid);}catch(e){}}
 return modeOf[pid]='mem';}
// older versions stored a single file: {name,blob,type,at,read}
function upgrade(o){if(o&&!o.files&&(o.blob||o.buf||o.dataUrl))o={files:[{id:fid(),name:o.name,blob:o.blob,buf:o.buf,btype:o.btype,dataUrl:o.dataUrl,type:o.type,at:o.at}],read:o.read||null};return o;}
async function loadRec(pid){if(mem[pid])return mem[pid];let f=null;try{f=upgrade(await A.idb('get',pid));}catch(_){}
 if(f&&f.files){f.files.forEach(x=>{if(!x.blob&&x.buf)x.blob=new Blob([x.buf],{type:x.btype||x.type});delete x.buf;});f.files=f.files.filter(x=>x.blob);if(f.files.length){modeOf[pid]='idb';return mem[pid]=f;}}
 try{const s=localStorage.getItem(LSK+pid);if(s){const o=upgrade(JSON.parse(s));o.files.forEach(x=>{x.blob=dataURLtoBlob(x.dataUrl);x.type='image/jpeg';x.copy=true;});modeOf[pid]='ls';return mem[pid]=o;}}catch(_){}
 return null;}
async function delRec(pid){delete mem[pid];delete modeOf[pid];try{await A.idb('delete',pid);}catch(_){}try{localStorage.removeItem(LSK+pid);}catch(_){}}
function hosts(){return document.querySelectorAll('.layHost');}
function cardHTML(where){return `<div class="card layCard"><div class="layTop"><div><h2>📎 Your layout drawings</h2><p class="sub">Photos, scans or PDFs of your plans – pick several at once or add more one by one. Nothing is read until you press <b>Scan all</b>.</p></div>
 <div class="layBtns"><label class="file accent bigBtn">📎 Upload layouts<input type="file" class="layIn" multiple accept="image/*,application/pdf,.pdf"></label><label class="file camBtn">📷 Camera<input type="file" class="layIn" accept="image/*" capture="environment"></label></div></div>
 <div class="layView"></div><div class="layProg" hidden><div class="pbar"><i></i></div><p class="sub pmsg"></p><p class="sub pfile"></p><button class="mini layStop">✋ Stop and use what I have</button></div></div>`;}
const kb=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
function viewHTML(rec){const fs=rec&&rec.files||[];if(!fs.length)return '<p class="sub">No layout uploaded yet.</p>';const md=modeOf[P().id];
 const note=md==='mem'||md==='ls'?`<div class="warn friendly privNote">🕶️ Private browsing: the layout is kept until you close this tab. Open in a normal tab to save it.${md==='ls'&&fs.some(f=>f.copy)?' (Showing smaller saved copies.)':''}</div>`:'';
 const r=rec.read,ids=rec.readIds||[],fresh=fs.filter(f=>!ids.includes(f.id)).length;
 const sum=r?`<p class="sub">🔍 Last scan: ${r.rooms.length} rooms, ${(r.floorAreas||[]).length} floors, ${r.units.length} unit types from ${ids.length} file${ids.length===1?'':'s'}.${fresh?` <b>${fresh} new file${fresh>1?'s':''} not scanned yet.</b>`:''}</p>`:'';
 const tot=fs.reduce((a,f)=>a+(isPdfF(f)?(f.pages||1):1),0);
 return note+`<ol class="layQ">${fs.map((f,i)=>`<li data-fid="${f.id}"><div class="layThumb" data-fid="${f.id}"></div><div class="qInfo"><b>${i+1}. ${esc(f.name)}</b><span class="sub">${isPdfF(f)?`📄 PDF · <span class="qPages">${f.pages?f.pages+' page'+(f.pages>1?'s':''):'counting pages…'}</span>`:'🖼️ Image · 1 page'} · ${kb(f.blob.size)} · <a class="layOpen" data-fid="${f.id}" href="#" target="_blank" rel="noopener">Open</a></span><span class="sub qState">${ids.includes(f.id)?'✅ scanned':'⏳ waiting for Scan all'}</span></div><button class="mini layRm" data-fid="${f.id}" aria-label="Remove ${esc(f.name)}">✕</button></li>`).join('')}</ol>${sum}
 <div class="bar layBar"><button class="accent layRead layScan">🔍 Scan all (${fs.length} file${fs.length>1?'s':''}, ${tot} page${tot>1?'s':''})</button><label class="file layAdd">➕ Add more<input type="file" class="layIn" multiple accept="image/*,application/pdf,.pdf"></label>${r?'<button class="layReview">✏️ Edit detected values</button>':''}<button class="danger layDel">🗑️ Remove all</button></div>`;}
async function refresh(force){const p=P();if(!force&&p.id===lastId&&hosts()[0].firstChild)return;lastId=p.id;
 hosts().forEach(h=>{if(!h.firstChild)h.innerHTML=cardHTML(h.dataset.where);});
 const f=await loadRec(p.id);if(P().id!==p.id)return;
 cur=f||null;urls.forEach(u=>URL.revokeObjectURL(u));urls=[];
 hosts().forEach(h=>{h.querySelector('.layView').innerHTML=viewHTML(cur);});if(cur)thumbs(cur);}
const thumbCache={};
async function thumbs(rec){for(const f of rec.files){const u=URL.createObjectURL(f.blob);urls.push(u);document.querySelectorAll(`.layOpen[data-fid="${f.id}"]`).forEach(a=>a.href=u);const tt=()=>document.querySelectorAll(`.layThumb[data-fid="${f.id}"]`);
  if(!isPdfF(f)){tt().forEach(t=>t.innerHTML=`<img src="${u}" alt="${esc(f.name)}">`);continue;}
  if(thumbCache[f.id]){tt().forEach(t=>t.innerHTML=thumbCache[f.id]);continue;}
  tt().forEach(t=>t.innerHTML='<span class="sub">📄</span>');
  try{const pdf=await loadPdf(f.blob);if(f.pages!==pdf.numPages){f.pages=pdf.numPages;document.querySelectorAll(`li[data-fid="${f.id}"] .qPages`).forEach(s=>s.textContent=f.pages+' page'+(f.pages>1?'s':''));const sb=document.querySelectorAll('.layScan');const tot=rec.files.reduce((a,x)=>a+(isPdfF(x)?(x.pages||1):1),0);sb.forEach(b=>b.textContent=`🔍 Scan all (${rec.files.length} file${rec.files.length>1?'s':''}, ${tot} page${tot>1?'s':''})`);}
   const cv=await pdfCanvas(await pdf.getPage(1),300);thumbCache[f.id]=`<img src="${cv.toDataURL('image/jpeg',.8)}" alt="${esc(f.name)}, page 1">`;free(cv);tt().forEach(t=>t.innerHTML=thumbCache[f.id]);}
  catch(e){tt().forEach(t=>t.innerHTML='<span class="sub">📄 PDF</span>');}}}
// ---------- upload: adds to the queue, never starts reading by itself ----------
let addChain=Promise.resolve();
document.addEventListener('change',e=>{const t=e.target;if(!t.classList||!t.classList.contains('layIn'))return;const picked=Array.from(t.files||[]);t.value='';// reset so picking the same file again fires (iPhone Safari)
 if(!picked.length)return;const pid=P().id;addChain=addChain.then(()=>addFiles(pid,picked)).catch(()=>{});});
async function addFiles(pid,picked){const bad=[],big=[];let rec=cur&&P().id===pid?cur:await loadRec(pid);if(!rec)rec={files:[],read:null};
 for(const f of picked){if(rec.files.length>=MAXF){alert(`Up to ${MAXF} files per project. Remove some to add more.`);break;}
  if(f.size>40e6){big.push(f.name);continue;}const isPdf=/pdf/.test(f.type)||/\.pdf$/i.test(f.name);if(!isPdf&&f.type&&!/^image\//.test(f.type)){bad.push(f.name);continue;}
  let blob=f;if(!isPdf){try{blob=await shrink(f,2400,.9);}catch(_){blob=f;}}// keep phone photos small; also turns HEIC into JPEG where the browser can decode it
  rec.files.push({id:fid(),name:f.name||(isPdf?'layout.pdf':'photo.jpg'),blob,type:isPdf?'application/pdf':blob.type||'image/jpeg',at:Date.now()});}
 if(big.length)alert('That file is larger than 40 MB. Please upload a smaller photo or PDF:\n'+big.join('\n'));
 if(bad.length)alert('Please choose a photo/image or a PDF. Skipped:\n'+bad.join('\n'));
 if(P().id!==pid)return;A.save();cur=rec;mem[pid]=rec;modeOf[pid]=modeOf[pid]||'pending';await refresh(true);try{await saveRec(pid,rec);}catch(_){}if(P().id===pid)await refresh(true);
 if(rec.files.length)toast(`📎 ${rec.files.length} file${rec.files.length>1?'s':''} ready – press “Scan all” when you have added everything.`);}
document.addEventListener('click',async e=>{const b=e.target.closest('.layRead,.layDel,.layReview,.layStop,.layRm,#lrevX');if(!b)return;if(b.classList.contains('layStop')){cancelReq=true;b.textContent='Stopping…';return;}
 if(b.classList.contains('layRm')){if(busy){alert('Please wait until the scan finishes (or press Stop).');return;}const id=b.dataset.fid;if(!cur)return;cur.files=cur.files.filter(f=>f.id!==id);if(!cur.files.length){await delRec(P().id);cur=null;}else await saveRec(P().id,cur);refresh(true);return;}
 if(b.classList.contains('layDel')){if(busy){alert('Please wait until the scan finishes (or press Stop).');return;}if(!confirm('Remove all uploaded layouts from this project?'))return;await delRec(P().id);cur=null;refresh(true);}
 else if(b.classList.contains('layRead'))autoRead();else if(b.classList.contains('layReview')){if(R&&R.base&&cur&&cur.read){$('#lrev').hidden=false;drawRev();}else if(cur&&cur.read)review(cur.read);}else if(b.id==='lrevX')closeRev();});
function toast(m){const n=document.createElement('div');n.className='toast';n.textContent=m;document.body.appendChild(n);setTimeout(()=>n.remove(),4500);}
// ---------- image helpers ----------
function loadImg(blob){return new Promise((res,rej)=>{const u=URL.createObjectURL(blob),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i);};i.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('Cannot open this image'));};i.src=u;});}
async function toCanvas(blob,max,min){let src;try{src=await createImageBitmap(blob,{imageOrientation:'from-image'});}catch(_){src=await loadImg(blob);}
 const w=src.width,h=src.height,L=Math.max(w,h),k=L>max?max/L:(min&&L<min?Math.min(2,min/L):1),cv=document.createElement('canvas');cv.width=Math.round(w*k);cv.height=Math.round(h*k);
 const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(src,0,0,cv.width,cv.height);if(src.close)src.close();return cv;}
async function shrink(f,max,q){const cv=await toCanvas(f,max);return await new Promise(r=>cv.toBlob(b=>r(b||f),'image/jpeg',q));}
// whiten long straight wall lines so the text reader sees only the labels
function unline(cv,thr,minL){thr=thr||128;const w=cv.width,h=cv.height,cx=cv.getContext('2d'),d=cx.getImageData(0,0,w,h),a=d.data,L=minL||Math.max(45,Math.round(Math.min(w,h)/25)),m=new Uint8Array(w*h);
 for(let y=0;y<h;y++){let s=-1;for(let x=0;x<=w;x++){const dk=x<w&&a[(y*w+x)*4]<thr;if(dk&&s<0)s=x;if(!dk&&s>=0){if(x-s>=L)for(let k=s;k<x;k++)m[y*w+k]=1;s=-1;}}}
 for(let x=0;x<w;x++){let s=-1;for(let y=0;y<=h;y++){const dk=y<h&&a[(y*w+x)*4]<thr;if(dk&&s<0)s=y;if(!dk&&s>=0){if(y-s>=L)for(let k=s;k<y;k++)m[k*w+x]=1;s=-1;}}}
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
 const out=[];(data.lines||[]).forEach(l=>{const t=(l.text||'').trim();if(!t||(l.confidence<25&&!/\d.*[x×X*].*\d|\d['’]/.test(t)))return;const b=l.bbox;const kx=m.kx||m.k;out.push({text:t,x:m.sx+b.x0/kx,y:m.sy+b.y0/m.k,w:(b.x1-b.x0)/kx,h:(b.y1-b.y0)/m.k,page,conf:l.confidence,frame:m.frame||0,words:(l.words||[]).filter(w=>w.text&&w.text.trim()&&w.bbox).map(w=>({s:w.text.trim(),x:m.sx+(w.bbox.x0+w.bbox.x1)/2/kx}))});});return out;}
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
// turn any canvas into a source (used after straightening a photo/scan)
function canvasSrc(cv){return {W:cv.width,H:cv.height,pts:false,async draw(sx,sy,sw,sh,k){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw*k));c.height=Math.max(1,Math.round(sh*k));const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(cv,sx,sy,sw,sh,0,0,c.width,c.height);return c;},close(){free(cv);}};}
function rotAny(cv,deg){const t=deg*Math.PI/180,c=Math.abs(Math.cos(t)),s=Math.abs(Math.sin(t)),r=document.createElement('canvas');r.width=Math.round(cv.width*c+cv.height*s);r.height=Math.round(cv.width*s+cv.height*c);const x=r.getContext('2d',{willReadFrequently:true});x.fillStyle='#fff';x.fillRect(0,0,r.width,r.height);x.translate(r.width/2,r.height/2);x.rotate(t);x.drawImage(cv,-cv.width/2,-cv.height/2);return r;}
// skew of a photo/scan in degrees (projection profile: text rows give the sharpest histogram when level)
function skewAngle(cv){const w=cv.width,h=cv.height,a=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data,xs=[],ys=[];const st=Math.max(1,Math.round(Math.sqrt(w*h/250000)));
 for(let y=0;y<h;y+=st)for(let x=0;x<w;x+=st){if(a[(y*w+x)*4]<130){xs.push(x);ys.push(y);}}if(xs.length<300)return 0;
 const sc=deg=>{const t=Math.tan(deg*Math.PI/180),B=new Float64Array(h*2+w+4);for(let i=0;i<xs.length;i++){const b=Math.round(ys[i]-xs[i]*t+w);if(b>=0&&b<B.length)B[b]++;}let s=0;for(let i=0;i<B.length;i++)s+=B[i]*B[i];return s;};
 let best=0,bs=sc(0);for(let d=-12;d<=12;d+=.5){const v=sc(d);if(v>bs*1.0001){bs=v;best=d;}}for(let d=best-.4;d<=best+.4;d+=.1){const v=sc(d);if(v>bs){bs=v;best=d;}}return Math.round(best*10)/10;}
async function straighten(src){const L=Math.max(src.W,src.H),k=Math.min(src.pts?4:1,1000/L),sm=gray(await src.draw(0,0,src.W,src.H,k));unline(sm);const a=skewAngle(sm);free(sm);
 if(Math.abs(a)<.4)return null;const kf=Math.min(src.pts?4:1.5,3400/L),full=await src.draw(0,0,src.W,src.H,kf),r=rotAny(full,-a);free(full);return {src:canvasSrc(r),angle:a};}
// how much of what we read looks like a plan / schedule (used to pick the page orientation)
function looks(lines){let s=0;lines.forEach(l=>{const t=l.text;if(LP.dims(t).length)s+=2;if(LP.areas(t).length)s+=2;if(LP.roomsIn(t).length||LP.floorOf(t)||LP.unitIn(t))s+=1.5;else if(/^[A-Za-z]{4,}$/.test(t.split(/\s+/)[0]||''))s+=.2;});return s;}
const TILE=2400,OVER=360;
// read one page/image: quick look -> if it is a drawing, a sharper tiled pass (tiny CAD text) -> sideways passes when labels are missing their sizes
async function readSource(src,page,always,step,fixed){let L=Math.max(src.W,src.H);
 // 1) straighten tilted photos/scans (a few degrees of tilt breaks the text reader)
 if(!fixed){step&&step('straightening',.02);try{const s=await straighten(src);if(s){src=s.src;L=Math.max(src.W,src.H);LAYINFO.push(`page ${page+1}: straightened ${s.angle}°`);}}catch(_){}}
 let k=Math.min(src.pts?4:1.5,1400/L),cv=await src.draw(0,0,src.W,src.H,k);const LO=window.LAY_OPTS||{},rich=colourful(cv)>.12,prep=c=>unline(rich?darkMask(c,LO.mask||150):gray(c));
 prep(cv);let lines=await ocr(cv,page,{sx:0,sy:0,k});
 // 2) sideways / upside-down page: try the other three turns when the upright read finds little
 if(!fixed&&!cancelReq&&looks(lines)<6){let best={deg:0,s:looks(lines)};for(const deg of [90,270,180]){if(cancelReq)break;step&&step('checking page direction',.05);const r=rotAny(cv,deg),rl=await ocr(r,page,{sx:0,sy:0,k});free(r);const s=looks(rl);if(s>best.s*1.6+3)best={deg,s};}
  if(best.deg){free(cv);const kf=Math.min(src.pts?4:1.5,3400/L),full=await src.draw(0,0,src.W,src.H,kf),r=rotAny(full,best.deg);free(full);LAYINFO.push(`page ${page+1}: turned ${best.deg}°`);return await readSource(canvasSrc(r),page,always,step,true);}}
 free(cv);
 if(cancelReq||(!always&&!PLANRE.test(lines.map(l=>l.text).join(' '))))return {lines,plan:false};
 // sharper pass: ~4400 px across an A4/A3 sheet (≈2.5× a 150 dpi scan) so 6-9 px labels become readable; cut into tiles to keep phone memory low
 const T=src.pts?Math.min(5200,Math.max(3000,L*5.2)):Math.min(LO.maxT||5200,Math.max(2600,L*(rich?(LO.up||2.5):1))),k2=T/L,cw=src.W*k2,ch=src.H*k2,nx=Math.ceil((cw-OVER)/(TILE-OVER)),ny=Math.ceil((ch-OVER)/(TILE-OVER));
 const tiles=[];for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x0=Math.min(i*(TILE-OVER),Math.max(0,cw-TILE)),y0=Math.min(j*(TILE-OVER),Math.max(0,ch-TILE));tiles.push([x0/k2,y0/k2,Math.min(TILE,cw)/k2,Math.min(TILE,ch)/k2]);}
 let hi=[];for(let t=0;t<tiles.length&&!cancelReq;t++){step&&step(`sharp pass ${t+1}/${tiles.length}`,(t+1)/(tiles.length+2));const [sx,sy,sw,sh]=tiles[t];const WF=LO.wide!=null?+LO.wide:1;let c=prep(await src.draw(sx,sy,sw,sh,k2));if(WF>1.01)c=wide(c,WF);hi=hi.concat(await ocr(c,page,{sx,sy,k:k2,kx:k2*WF}));free(c);await new Promise(r=>setTimeout(r,0));}
 // drop duplicates read twice in the tile overlaps
 const seen=[];hi=hi.filter(l=>{const d=seen.find(o=>o.text===l.text&&Math.abs(o.x-l.x)<l.h*2&&Math.abs(o.y-l.y)<l.h);if(d)return false;seen.push(l);return true;});
 // keep big headings, unit/plot/area labels from the quick look (tiles can cut long titles)
 const dg=t=>(t.match(/\d+/g)||[]).join(',');
 if(hi.length>=lines.length*.6){const keep=lines.filter(l=>LP.floorOf(l.text)||LP.unitIn(l.text)||LP.plotIn(l.text)||/area|plan/i.test(l.text));lines=hi.concat(keep.filter(k=>!hi.some(h=>Math.abs(h.y-k.y)<Math.max(h.h,k.h)&&h.x<k.x+k.w&&k.x<h.x+h.w&&(h.text===k.text||(dg(h.text)&&dg(h.text)===dg(k.text))))));}
 // tables (unit / area schedules): the sparse reader drops single letters and digits in cells, so re-read the table block as rows
 if(!cancelReq){const HD=/(carpet|covered|super|saleable|units?\s*\/\s*fl|area\s*\(|\bschedule\b|\bbeds?\b.*\barea)/i;const heads=lines.filter(l=>HD.test(l.text)&&!(l.frame));const done=[];
  for(const hd of heads.slice(0,4)){if(cancelReq)break;if(done.some(d=>hd.y>=d.y0&&hd.y<=d.y1))continue;const h=Math.max(hd.h,6);let y1=hd.y+h,blk=lines.filter(l=>!l.frame&&l.y>=hd.y-h*3&&l.y<=hd.y+h*1.5);
   const below=lines.filter(l=>!l.frame&&l.y>hd.y).sort((a,b)=>a.y-b.y);for(const l of below){if(l.y-y1>h*3.2)break;if(HD.test(l.text)&&l.y>hd.y+h*2&&/schedule/i.test(l.text))break;y1=Math.max(y1,l.y+l.h);blk.push(l);}
   const x0=Math.max(0,Math.min(...blk.map(l=>l.x))-h*2),x1=Math.min(src.W,Math.max(...blk.map(l=>l.x+l.w))+h*2),y0=Math.max(0,Math.min(...blk.map(l=>l.y))-h),yy=Math.min(src.H,y1+h);done.push({y0,y1:yy});
   step&&step('reading table',.85);const kk=Math.min(src.pts?6:3,Math.max(1,34/h)),w=await ocrWorker();await w.setParameters({tessedit_pageseg_mode:'6'});
   const c=unline(prep(await src.draw(x0,y0,x1-x0,yy-y0,kk)),215,Math.round(h*kk*2.2));const rl=(await ocr(c,page,{sx:x0,sy:y0,k:kk})).filter(l=>/\w/.test(l.text));free(c);await w.setParameters({tessedit_pageseg_mode:'11'});
   const dn=a=>a.reduce((s,l)=>s+(l.text.match(/\d+/g)||[]).length,0),inside=lines.filter(l=>!l.frame&&l.y>=y0&&l.y<=yy&&l.x>=x0-1&&l.x<=x1);
   if(rl.length){rl.forEach(l=>{l.tbl=true;});lines=lines.concat(rl);LAYINFO.push(`page ${page+1}: re-read a table as rows (${dn(rl)} numbers; ${dn(inside)} before)`);}}}
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

 // auto zoom: crop the unclear parts, enlarge 3-4x (PDF: re-render the vector page sharper), try several clean-ups and keep the best read
 if(!cancelReq&&zoomOn())lines=await zoomPass(src,page,lines,L,step);
 const probe=LP.parse(lines),bare=probe.rooms.filter(r=>!r.sqft).length;
 if(bare>=2&&!cancelReq){const k3=Math.min(src.pts?4:1,2400/L),base=prep(await src.draw(0,0,src.W,src.H,k3));
  for(const [deg,fr] of [[90,1],[270,3]]){if(cancelReq)break;step&&step('sideways text',.95);const r=rot(base,deg);const rl=(await ocr(r,page,{sx:0,sy:0,k:k3,frame:fr})).filter(l=>KEEPRE.test(l.text));free(r);lines=lines.concat(rl);}
  free(base);}
 // plot edge dimensions are often written sideways along the left/right borders: read the two strips turned upright
 if(!cancelReq&&!lines.some(l=>l.edge)){step&&step('plot edges',.97);const ke=Math.min(src.pts?4:(window.LAY_OPTS||{}).ke||2,4800/L),sw=src.W*.13;
  for(const [x0,deg] of [[0,90],[src.W-sw,90],[0,270],[src.W-sw,270]]){if(cancelReq)break;const c=prep(await src.draw(x0,0,sw,src.H,ke)),r=rot(c,deg);free(c);let got=0;
   for(let tx=0;tx<r.width;tx+=1000){const tw=Math.min(1400,r.width-tx),t=document.createElement('canvas');t.width=tw;t.height=r.height;t.getContext('2d').drawImage(r,tx,0,tw,r.height,0,0,tw,r.height);
    let rl=(await ocr(t,page,{sx:0,sy:0,k:ke,frame:deg===90?1:3}));rl=rl.filter(l=>/\d{2,3}\s*(['’`]|-\s*\d{1,2}\s*")/.test(l.text));free(t);rl.forEach(l=>{l.edge=true;l.x=x0?src.W-5:5;l.y=src.H/2;});got+=rl.length;lines=lines.concat(rl);}
   free(r);if(got&&deg===90&&x0)break;}}
 return {lines,plan:true};}

// ---------- auto zoom-and-re-read ----------
function zoomOn(){try{return A.S().autoZoom!==false;}catch(_){return true;}}
function zoomVar(cv,mode){const c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingQuality='high';x.drawImage(cv,0,0);if(mode==='raw')return c;if(mode==='ul')return unline(darkMask(c,165),200,Math.round(Math.min(c.width,c.height)*.35));if(mode==='ulg')return unline(gray(c),200,Math.round(Math.min(c.width,c.height)*.35));const d=x.getImageData(0,0,c.width,c.height),a=d.data;
 let lo=255,hi=0;for(let i=0;i<a.length;i+=16){const g=.299*a[i]+.587*a[i+1]+.114*a[i+2];if(g<lo)lo=g;if(g>hi)hi=g;}const rg=Math.max(30,hi-lo);
 for(let i=0;i<a.length;i+=4){let g=.299*a[i]+.587*a[i+1]+.114*a[i+2];if(mode==='inv')g=255-g;g=(g-(mode==='inv'?255-hi:lo))*255/rg;if(mode==='t120')g=g<120?0:255;else if(mode==='t185')g=g<185?0:255;else if(mode==='inv')g=g<150?0:255;else g=Math.max(0,Math.min(255,(g-128)*1.6+128));a[i]=a[i+1]=a[i+2]=g;a[i+3]=255;}x.putImageData(d,0,0);return c;}
// CAD fonts are often narrow (Arial Narrow): stretching 1.35x sideways makes the reader see 7'x7' instead of x7
function wide(cv,f){f=f||1.35;const c=document.createElement('canvas');c.width=Math.round(cv.width*f);c.height=cv.height;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(cv,0,0,c.width,c.height);free(cv);return c;}
function lum(cv){const d=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,cv.width,cv.height).data;let s=0,n=0;for(let i=0;i<d.length;i+=32){s+=.299*d[i]+.587*d[i+1]+.114*d[i+2];n++;}return n?s/n:255;}
function zScore(rl){let s=0;rl.forEach(l=>{const p=LP.plotIn(l.text);if(p&&p.sqft)s+=6;});const all=rl.map(l=>l.text).join(' ');rl.forEach(l=>{LP.dims(l.text).forEach(d=>{s+=d.marks?4:2;});s+=(l.conf||0)/200;});if(!s&&LP.dims(all).length)s=3;return s;}
async function zoomPass(src,page,lines,L,step){const t0=Date.now(),cap=(window.LAY_OPTS||{}).zoomMs||60000,w=await ocrWorker(),pr=LP.parse(lines),R=[];
 const add=(x,y,ww,hh,why,ref)=>{x=Math.max(0,x);y=Math.max(0,y);ww=Math.min(src.W-x,ww);hh=Math.min(src.H-y,hh);if(ww<4||hh<4)return;if(R.some(r=>Math.abs(r.x-x)<ww*.4&&Math.abs(r.y-y)<hh*.4&&r.why===why))return;R.push({x,y,w:ww,h:hh,why,ref});};
 // 1) room names with no size: the size is usually just below (sometimes split over 2-3 lines)
 pr.rooms.filter(r=>(!r.sqft||r.conf<.5)&&r.box&&r.box.page===page&&!/^(lawn|void|terrace)$/.test(r.type)&&!/podium/i.test(r.name)).forEach(r=>{const b=r.box,h=Math.max(b.h,6),cx=b.x+b.w/2,hw=Math.max(b.w*.9,h*5);add(cx-hw,b.y-h*.4,hw*2,h*5.2,'label',r);});
 // 2) size-looking text that did not parse, and low-confidence numbers
 lines.forEach(l=>{if(l.page!==page||l.edge||(l.frame||0)||l.zoom)return;const t=l.text||'';const looks=/\d\s*['’"!|]|\d\s*[xX×%]\s*\d/.test(t)&&!LP.dims(t).length,weak=/\d/.test(t)&&(l.conf||0)<55&&t.length<24;if(looks||weak){const h=Math.max(l.h||8,6);add(l.x-h*1.5,l.y-h*.6,(l.w||h*4)+h*3,h*2.2,'line',l);}});
 // 3) plot / area statements: the number usually follows the words ("TOTAL AREA OF PLOT (1508)", "AREA (1508) S.Yds")
 lines.forEach(l=>{if(l.page!==page||l.edge||(l.frame||0))return;const t=l.text||'';if(/\b(area|plot)\b/i.test(t)&&!LP.plotIn(t)){const h=Math.max(l.h||10,8);add(l.x-h,l.y-h*1.2,(l.w||h*8)*1.9+h*6,h*4.5,'area',l);}});
 R.sort((a,b)=>({area:0,label:1,line:2}[a.why])-({area:0,label:1,line:2}[b.why]));
 const N=Math.min(R.length,(window.LAY_OPTS||{}).zoomMax||40);let fixed=0;
 for(let i=0;i<N&&!cancelReq;i++){if(Date.now()-t0>cap){LAYINFO.push(`page ${page+1}: zoom stopped at the time limit (${i}/${N})`);break;}step&&step(`Zooming into unclear parts (${i+1}/${N})`,.92);
  const g=R[i],th=g.why==='label'?g.ref.box.h:g.ref.h||10,k=Math.min(src.pts?10:4,Math.max(src.pts?3:3,40/Math.max(th,4)));
  const base=await src.draw(g.x,g.y,g.w,g.h,k);const dark=lum(base)<135;const tall=g.h>g.w*1.6;
  const tries=[...(g.why==='label'?[['tightr','6'],['tight','6'],['tightg','6']]:[]),['wide','6'],['ul','6'],['ctr','6'],...(dark?[['inv','6']]:[]),['ctr','11'],['t120','6'],['t185','6'],...(g.why==='line'?[['ctr','7']]:[]),...(tall?[['rot','6']]:[]),...(!dark?[['inv','11']]:[])];
  let best=null,bs=g.why==='line'?zScore([g.ref]):0;
  for(const [m,psm] of tries){if(cancelReq||Date.now()-t0>cap)break;let c,ox=g.x,oy=g.y;if(m==='tight'||m==='tightg'||m==='tightr'){const b=g.ref.box,hh=Math.max(b.h,6),cx=b.x+b.w/2,hw=Math.max(b.w*.75,hh*3.6);ox=Math.max(0,cx-hw);oy=Math.max(0,b.y-hh*.35);const t=await src.draw(ox,oy,Math.min(src.W-ox,hw*2),Math.min(src.H-oy,hh*3.1),k);c=wide(zoomVar(t,m==='tight'?'ul':m==='tightr'?'raw':'ulg'));free(t);}else if(m==='wide'){c=wide(zoomVar(base,'ctr'));}else{c=zoomVar(base,m==='rot'?'ctr':m);if(m==='rot'){const r=rot(c,90);free(c);c=r;}}
   {const P=24,pc=document.createElement('canvas');pc.width=c.width+P*2;pc.height=c.height+P*2;const px=pc.getContext('2d');px.fillStyle='#fff';px.fillRect(0,0,pc.width,pc.height);px.drawImage(c,P,P);free(c);c=pc;ox-=P/k;oy-=P/k;}
   await w.setParameters({tessedit_pageseg_mode:psm});let rl=await ocr(c,page,{sx:ox,sy:oy,k});free(c);rl=rl.filter(x=>/\d/.test(x.text));
   if(g.why==='label')rl=rl.filter(x=>!LP.roomsIn(x.text).length||LP.dims(x.text).length);
   if(rl.length>1&&!rl.some(x=>LP.dims(x.text).length)){const j=rl.slice().sort((a,b)=>a.y-b.y).map(x=>x.text).join(' ');if(LP.dims(j).length)rl=[Object.assign({},rl[0],{text:j})];}
const sc=zScore(rl);if(g.why==='area'){g.all=(g.all||[]).concat(rl.filter(x=>LP.plotIn(x.text)));if(g.all.length>=3)break;}if(sc>bs+.5){bs=sc;best={rl,m,psm};}if(bs>=4.3&&g.why!=='area')break;}
  free(base);
  if(best){fixed++;if(g.why==='area'){const seenV=new Set();(g.all||[]).forEach(x=>{const v=LP.plotIn(x.text).value;if(seenV.has(v))return;seenV.add(v);x.zoom=true;x.frame=0;lines.push(x);});}else if(g.why==='line'){const nl=best.rl.find(x=>LP.dims(x.text).length)||best.rl[0];g.ref.text=nl.text;g.ref.zoom=true;g.ref.conf=Math.max(g.ref.conf||0,Math.min(nl.conf||0,88));}
   else{const b=g.ref.box,cx=b.x+b.w/2;if(g.ref.sqft&&best.rl.some(x=>LP.dims(x.text).some(d=>d.marks)))lines.forEach(o=>{if(o.page===page&&!o.zoom&&o.y>=g.y&&o.y<=g.y+g.h&&o.x+(o.w||0)/2>=g.x&&o.x+(o.w||0)/2<=g.x+g.w&&LP.dims(o.text).some(d=>Math.round(d.w)===Math.round(g.ref.w)&&Math.round(d.d)===Math.round(g.ref.d))&&!LP.roomsIn(o.text).length)o.text='';});best.rl.filter(x=>LP.dims(x.text).length).slice(0,1).forEach(x=>{x.zoom=true;x.y=Math.max(x.y,b.y+b.h*1.05);x.x=cx-(x.w||b.w)/2;x.w=x.w||b.w;x.h=x.h||b.h;x.conf=Math.min(x.conf||70,85);x.frame=0;lines.push(x);});}}}
 await w.setParameters({tessedit_pageseg_mode:'11'});if(N)LAYINFO.push(`page ${page+1}: zoomed into ${N} unclear part${N>1?'s':''}, ${fixed} improved (${((Date.now()-t0)/1000).toFixed(0)}s)`);return lines;}
// ---------- progress ----------
function prog(pct,msg){document.querySelectorAll('.layProg').forEach(p=>{p.hidden=pct==null;p.querySelector('i').style.width=Math.round(pct||0)+'%';p.querySelector('.pmsg').textContent=msg||'';});document.querySelectorAll('.layRead').forEach(b=>b.disabled=pct!=null);}
let busy=false,LAYINFO=[];
let cancelReq=false;
let again=false;async function autoRead(){if(!cur||!cur.files||!cur.files.length)return;if(busy)return;busy=true;document.body.dataset.scan='busy';cancelReq=false;const rec=cur,pid=P().id,files=rec.files.slice(),F=files.length;let lines=[],po=0;const pageLab=[],pageSrc=[];
 try{prog(3,'Getting ready…');let base=5,span=85;
  document.querySelectorAll('.layStop').forEach(b=>b.textContent='✋ Stop and use what I have');
  progCb=m=>{if(m.status==='recognizing text')return;else if(/load|initializ/.test(m.status))prog(Math.min(base,4+(m.progress||0)*4),'Loading the text reader (first time only)…');};
  const t0=Date.now();LAYINFO=[];let pagesRead=0;
  const fileLab=(fi,f)=>`File ${fi+1} of ${F}: ${f.name}`,setFile=(fi,f)=>document.querySelectorAll('.layProg .pfile').forEach(p=>p.textContent=fileLab(fi,f));
  for(let fi=0;fi<F&&!cancelReq;fi++){const f=files[fi],fb=5+88*fi/F,fs=88/F;setFile(fi,f);document.querySelectorAll(`li[data-fid="${f.id}"] .qState`).forEach(s=>s.textContent='🔍 scanning…');
   if(isPdfF(f)){prog(fb,'Opening PDF…');const pdf=await loadPdf(f.blob),N=Math.min(pdf.numPages,40);f.pages=pdf.numPages;
    for(let i=1;i<=N&&!cancelReq;i++){const pi=po+i-1;pageLab[pi]=F>1?`${f.name} p${i}`:'Page '+i;pageSrc[pi]={file:f.name,page:i};base=fb+fs*(i-1)/N;span=fs/N;const lab=`Page ${i} of ${N}`;prog(base,lab+'…');const pg=await pdf.getPage(i),v=pg.getViewport({scale:1}),tc=await pg.getTextContent(),pl=pdfLines(tc.items,v.height,pi),txt=pl.map(l=>l.text).join(' ');
     let useOcr=txt.replace(/\s/g,'').length<15;if(!useOcr&&!PLANRE.test(txt)){try{const ops=await pg.getOperatorList(),O=pdfjs.OPS;useOcr=ops.fnArray.some(x=>x===O.paintImageXObject||x===O.paintJpegXObject||x===O.paintInlineImageXObject);}catch(_){}}
     lines=lines.concat(pl);
     if(useOcr){const r=await readSource(pdfSrc(pg),pi,false,(m,fr)=>prog(base+span*fr,`${lab}: ${m}…`));lines=lines.concat(r.lines);}
     pagesRead++;pg.cleanup&&pg.cleanup();}
    po+=N;}
   else{base=fb;span=fs;pageLab[po]=F>1?f.name:'Page 1';pageSrc[po]={file:f.name,page:1};prog(fb,'Preparing image…');const src=await imgSrc(f.blob);const r=await readSource(src,po,true,(m,fr)=>prog(base+span*fr,`Page 1 of 1: ${m}…`));src.close&&src.close();lines=lines.concat(r.lines);po++;pagesRead++;}
   document.querySelectorAll(`li[data-fid="${f.id}"] .qState`).forEach(s=>s.textContent='✅ scanned');}
  const secs=Math.round((Date.now()-t0)/1000);
  prog(95,'Finding rooms & sizes…');window.LAY&&(LAY.lines=lines);const r=LP.parse(lines,{marla:+S().marlaSqft||225,pageLabel:pageLab});
  merge(r,pageSrc);r.files=files.map(f=>f.name);r.file=r.files.join(', ');r.at=Date.now();r.secs=secs;r.stopped=cancelReq;r.info=LAYINFO.slice();r.pages=pagesRead;
  rec.read=r;rec.readIds=files.map(f=>f.id);try{await saveRec(pid,rec);}catch(_){}if(cur!==rec||P().id!==pid){prog(null);return;}prog(100,'Done');setTimeout(()=>prog(null),600);refresh(true);review(r,'auto');}
 catch(e){prog(null);alert('Sorry, I could not read this file: '+(e&&e.message||e)+'\nYou can still enter sizes by hand.');refresh(true);}
 finally{busy=false;if(document.body.dataset.scan==='busy')document.body.dataset.scan='done';progCb=null;idleKill();warm();}}
// tag every item with the file (and page) it came from; drop repeats that several files show (same floor / unit / room)
function merge(r,pageSrc){const src=p=>{const s=pageSrc[p];return s?(r.files&&r.files.length===1?'':s.file)+(s.file&&pageSrc.filter(Boolean).filter(x=>x.file===s.file).length>1?' p'+s.page:''):'';};
 const tag=(x,p)=>{x.src=p!=null&&pageSrc[p]?[pageSrc[p].file+(pageSrc.filter(Boolean).filter(y=>y.file===pageSrc[p].file).length>1?' p'+pageSrc[p].page:'')]:[];return x;};
 r.rooms.forEach(x=>tag(x,x.page));r.units.forEach(x=>tag(x,x.page));(r.floorAreas||[]).forEach(x=>{tag(x,x.page);(x.pages||[]).forEach(pp=>{const t=tag({},pp).src[0];if(t&&!x.src.includes(t))x.src.push(t);});});
 const dd=(list,key,better)=>{const m=new Map(),out=[];list.forEach(x=>{const k=key(x);if(k==null){out.push(x);return;}const o=m.get(k);if(!o){m.set(k,x);out.push(x);return;}const w=better(x,o)?x:o,l=w===x?o:x;w.src=[...new Set([...(w.src||[]),...(l.src||[])])];w.dups=(w.dups||0)+1+(l.dups||0);if(w===x)out[out.indexOf(o)]=x,m.set(k,x);});return out;};
 r.units=dd(r.units,u=>(u.name||'').toLowerCase().replace(/\s+/g,' ').replace(/ \(unit plan\)/,''),(a,b)=>(!!a.sqft-!!b.sqft)||(!!a.count-!!b.count)||(a.conf-b.conf)>0);
 r.floorAreas=dd(r.floorAreas||[],f=>f.floor.toLowerCase(),(a,b)=>a.conf>b.conf);
 const files=new Set(pageSrc.filter(Boolean).map(s=>s.file));if(files.size>1){r.rooms=dd(r.rooms,x=>x.sqft?[x.name.toLowerCase(),x.floor.toLowerCase(),Math.round(x.sqft)].join('|')+'|'+(r.rooms.filter(y=>y.name===x.name&&y.floor===x.floor&&y.src[0]===x.src[0]&&Math.round(y.sqft||0)===Math.round(x.sqft)).indexOf(x)):null,(a,b)=>a.conf>b.conf);}
 r.stats.rooms=r.rooms.length;r.stats.units=r.units.length;}
// after the first auto-read, quietly fetch the other reader too so photos AND PDFs both work offline later
let warmed=false;function warm(){if(warmed||!navigator.onLine)return;warmed=true;['pdfjs/pdf.min.mjs','pdfjs/pdf.worker.min.mjs','tesseract/tesseract.min.js','tesseract/worker.min.js','tesseract/tesseract-core-simd-lstm.wasm.js','lang/eng.traineddata.gz'].forEach((f,i)=>setTimeout(()=>fetch(VEND+f).catch(()=>{}),1500+i*500));}
// ---------- review screen ----------
let R=null;
const badge=(c,zoom)=>{const p=Math.round((c||0)*100),k=p>=75?'hi':p>=50?'mid':'lo';return `<span class="conf ${k}" title="How sure I am (${p}%)">${k==='lo'?'⚠️ check':k==='hi'?'High':'Medium'} ${p}%</span>`+(zoom?' <span class="conf zoom" title="Read again after zooming in">🔍 read by zoom</span>':'');};
const inp=(k,v,i,w)=>`<input type="text" inputmode="decimal" autocomplete="off" data-k="${k}" ${i!=null?`data-i="${i}"`:''} value="${v==null?'':v}" style="width:${w||70}px">`;
function plotUnitOf(){const p=P();return p.mode==='highrise'?(p.hr.plotUnit||'sqyd'):p.plotUnit;}
const UF={sqyd:9,sqft:1};
function unitSq(u){return u==='marla'?(+S().marlaSqft||225):(UF[u]||1);}
function review(r,mode){R=JSON.parse(JSON.stringify(r));R.floorAreas=R.floorAreas||[];
 // nothing below ~50% sure is ticked for you: it is listed so you can check and tick it yourself
 // use every size read, except clearly impossible ones (e.g. 160'x96' for a servant room) and repeat reads of the same label at the same spot
 R.rooms.forEach((x,i)=>{x.on=x.sqft!=null&&x.conf>=.3;if(x.on&&R.rooms.slice(0,i).some(y=>y.on&&y.name===x.name&&y.floor===x.floor&&Math.round(y.sqft)===Math.round(x.sqft)&&(!x.box||!y.box||(Math.abs(x.box.x-y.box.x)<80&&Math.abs(x.box.y-y.box.y)<80))))x.on=false;});R.rooms.sort((a,b)=>(a.level-b.level)||String(a.floor).localeCompare(String(b.floor)));R.units.forEach(u=>u.on=+u.sqft>0&&+u.count>0);R.floorAreas.forEach(f=>{f.on=f.sqft>0;f.use=f.kind||(f.level<0?'parking':f.level===0?(P().mode==='highrise'?'commercial':'residential'):'residential');});if(R.plot)R.plot.conf=R.plot.conf||0;R.wfPct=Math.round((R.wallFactor-1)*100);R.plotOn=!!R.plot&&R.plot.sqft>0;R.useCov=R.covered.length>0;R.base=JSON.stringify(P());liveApply();if(mode!=='auto'){$('#lrev').hidden=false;drawRev();}else{document.body.dataset.scan='done';undoToast(R.base);const t=document.querySelector('#estimate .needData,#hrOut');t&&t.scrollIntoView&&t.scrollIntoView({block:'start'});}}
// everything detected is applied straight away; edits in the list re-apply instantly (undo = back to before the scan)
function liveApply(){if(!R||!R.base)return;const st=A.st(),b=JSON.parse(R.base),i=st.projects.findIndex(p=>p.id===b.id);if(i<0)return;const md=st.projects[i].mode,nb=JSON.parse(R.base);nb.mode=md;st.projects[i]=nb;if(md==='highrise')A.ensureHR(nb);proposals().filter(q=>!R['no_'+q.id]).forEach(q=>q.f());const p=P();p.detected=detSummary();if(p.mode==='highrise')A.ensureHR(p);A.save();A.loadInputs();A.applyMode();A.renderAll();}
function detSummary(){const fl=floorsCalc(),low=x=>x&&x.conf<.5;return {plot:R.plot&&R.plotOn?{sqft:R.plot.sqft,conf:R.plot.conf,raw:R.plot.raw,diffPct:R.plot.diffPct,sidesSqft:R.plot.sidesSqft,method:R.plot.method}:null,floors:fl.map(f=>({floor:f.floor,cov:f.cov})),check:R.rooms.filter(m=>m.on&&m.conf<.5).length+R.units.filter(u=>u.on&&u.conf<.5).length+R.floorAreas.filter(f=>f.on&&f.conf<.5).length+(low(R.plot)?1:0),zoom:R.rooms.filter(m=>m.on&&m.zoom).length,at:Date.now()};}
window.__liveApply=()=>liveApply();
function closeRev(){$('#lrev').hidden=true;}
function floorsCalc(){const fs={};R.rooms.forEach(r=>{if(!r.on||!(r.sqft>0))return;const f=fs[r.floor]||(fs[r.floor]={floor:r.floor,level:r.level,kind:r.floorKind,sq:0,shop:0,baths:0,rooms:0});if(!/lawn|terrace|parking/.test(r.type))f.sq+=+r.sqft;if(r.type==='shop')f.shop+=+r.sqft;if(r.type==='bath')f.baths++;if(!/lawn|terrace|corridor|stair|lift|lobby|parking/.test(r.type))f.rooms++;});
 const k=1+(+R.wfPct||0)/100;return Object.values(fs).sort((a,b)=>a.level-b.level).map(f=>Object.assign(f,{cov:Math.round(f.sq*k)}));}
const srcT=x=>x&&x.src&&x.src.filter(Boolean).length?`<small class="rawsrc srcF">📎 ${esc(x.src.filter(Boolean).join(', '))}${x.dups?` <i>(seen ${x.dups+1}×, merged${x.merged?': '+esc(x.merged.join(', ')):''})</i>`:''}</small>`:'';
const blank=v=>v===''||v==null||!(+v>0);const ch=(o,n)=>blank(o)?n:`${o} → ${n}`;
function proposals(){const p=P(),hr=p.mode==='highrise',out=[],fl=floorsCalc(),pu=plotUnitOf();
 if(R.plot&&R.plotOn){const v=+(R.plot.sqft/unitSq(pu)).toFixed(1),old=hr?p.hr.plotArea:p.plotArea;out.push({id:'plot',t:`Plot area: ${ch(blank(old)?'':n0(old),`<b>${v}</b>`)} ${pu==='sqyd'?'sq yd':pu}`+(R.plot.w?` (${R.plot.w} × ${R.plot.d} ft)`:''),f:()=>{if(hr){p.hr.plotArea=v;if(R.plot.w){p.hr.plotW=R.plot.w;p.hr.plotD=R.plot.d;}}else{p.plotArea=v;const sd=R.plot.sides;if(sd&&sd.front){p.irr={on:true,front:sd.front,back:sd.back,left:sd.left,right:sd.right,diag:sd.diag||'',official:R.plot.official&&R.plot.unit==='sqyd'?R.plot.value:''};if(R.plot.official&&R.plot.unit==='sqyd')p.plotArea=+(R.plot.value*9/unitSq(p.plotUnit)).toFixed(1);}}}});}
 const FA=(R.floorAreas||[]).filter(f=>f.on&&+f.sqft>0),faAbove=[];FA.filter(f=>f.level>=0&&f.use!=='skip').sort((a,b)=>a.level-b.level).forEach(f=>{for(let i=0;i<Math.max(1,+f.count||1);i++)faAbove.push(+f.sqft);});
 let covList=R.useCov&&R.covered.length?R.covered.map(c=>c.sqft):null;if(!hr&&faAbove.length)covList=faAbove;
 if(!hr){const abv=fl.filter(f=>f.level>=0&&f.level<20),areas=covList&&covList.length>=abv.length?covList:abv.map(f=>f.cov);
  if(areas.length&&areas.some(a=>a>0)){const same=areas.every(a=>Math.abs(a-areas[0])<1);out.push({id:'cov',t:`Floors: ${ch(p.floors,`<b>${areas.length}</b>`)}; covered area per floor: ${same?`${ch(blank(p.bua)?'':n0(p.bua),`<b>${n0(areas[0])}</b>`)} sq ft`:areas.map((a,i)=>`${i?'Floor '+i:'Ground'} <b>${n0(a)}</b>`).join(', ')+' sq ft'}`,f:()=>{p.floors=areas.length;p.bua=areas[0];if(same){p.override=false;}else{p.override=true;p.floorAreas=areas.slice();}}});}
  if(fl.some(f=>f.level<0)){const bf=fl.filter(f=>f.level<0),ba=bf.reduce((a,f)=>a+f.cov,0);out.push({id:'base',t:'Basement found → set <b>Basement</b>'+(ba>0?`, covered <b>${n0(ba)}</b> sq ft`:''),f:()=>{p.extra='basement';if(ba>0)p.basementArea=ba;}});}
  if(abv.length){out.push({id:'items',t:'BOQ counts from rooms: doors '+abv.map(f=>`<b>${f.rooms+(f.level===0?0:0)}</b>`).join(' / ')+', geysers '+abv.map(f=>`<b>${Math.max(f.baths,0)}</b>`).join(' / ')+' (per floor)',f:()=>{p.edits=p.edits||{};abv.forEach((f,i)=>{if(f.rooms){p.edits['f'+i+':door']=Object.assign(p.edits['f'+i+':door']||{},{qty:f.rooms});}if(f.baths){p.edits['f'+i+':pl_gey']=Object.assign(p.edits['f'+i+':pl_gey']||{},{qty:f.baths});}});}});}}
 else if(FA.length){const h=p.hr,cnt=f=>Math.max(1,+f.count||1),B=FA.filter(f=>f.level<0||(f.use==='parking'&&f.level<0)).sort((a,b)=>b.level-a.level),G=FA.find(f=>f.level===0),C=FA.filter(f=>f.level>=1&&f.use==='commercial'),PK=FA.filter(f=>f.level>=1&&f.use==='parking'),RS=FA.filter(f=>f.level>=1&&f.use==='residential');
  if(B.length){const n=B.reduce((a,f)=>a+cnt(f),0),ar=[];B.forEach(f=>{for(let i=0;i<cnt(f);i++)ar.push(+f.sqft);});out.push({id:'fbase',t:`Basements: ${ch(h.basements,`<b>${n}</b>`)} (${ar.map(n0).join(', ')} sq ft)`,f:()=>{h.basements=n;h.bAreas=ar;}});}
  if(G)out.push({id:'ground',t:`Ground floor built area: ${ch(h.groundAuto!==false||blank(h.groundArea)?'':n0(h.groundArea),`<b>${n0(G.sqft)}</b>`)} sq ft`,f:()=>{h.groundAuto=false;h.groundArea=+G.sqft;}});
  if(PK.length){const n=PK.reduce((a,f)=>a+cnt(f),0);out.push({id:'fpod',t:`Parking floors above ground: ${ch(h.podium,`<b>${n}</b>`)}`,f:()=>{h.podium=n;}});}
  if(C.length){const ar=[];C.forEach(f=>{for(let i=0;i<cnt(f);i++)ar.push(+f.sqft);});out.push({id:'comm',t:`Commercial floors: ${ch(h.commercial,`<b>${ar.length}</b>`)}, areas ${ar.map(a=>'<b>'+n0(a)+'</b>').join(', ')} sq ft`,f:()=>{h.commercial=ar.length;h.commAuto=false;h.commAreas=ar;}});}
  if(RS.length){const n=RS.reduce((a,f)=>a+cnt(f),0),pl=RS.reduce((a,f)=>a+cnt(f)*f.sqft,0)/n;out.push({id:'fres',t:`Residential floors: ${ch(h.residential,`<b>${n}</b>`)}, floor plate ${ch(blank(h.plate)?'':n0(h.plate),`<b>${n0(pl)}</b>`)} sq ft`,f:()=>{h.residential=n;h.plate=Math.round(pl);}});}
  unitsProp(out,h);}
 else{const h=p.hr,g=fl.find(f=>f.level===0);
  if(g&&g.cov>0)out.push({id:'ground',t:`Ground floor built area: ${ch(h.groundAuto!==false||blank(h.groundArea)?'':n0(h.groundArea),`<b>${n0(g.cov)}</b>`)} sq ft`,f:()=>{h.groundAuto=false;h.groundArea=g.cov;}});
  const cf=fl.filter(f=>f.level>=1&&(f.kind==='commercial'||f.shop>=f.sq*.5)&&f.sq>0);
  if(cf.length)out.push({id:'comm',t:`Commercial floors: ${ch(h.commercial,`<b>${cf.length}</b>`)}, areas ${cf.map(f=>'<b>'+n0(f.cov)+'</b>').join(', ')} sq ft`,f:()=>{h.commercial=cf.length;h.commAuto=false;h.commAreas=cf.map(f=>f.cov);}});
  unitsProp(out,h);}
 return out;}
function unitsProp(out,h){{const us=R.units.filter(u=>u.on&&u.name&&+u.sqft>0&&+u.count>0);if(us.length)out.push({id:'units',t:`Unit mix (${R.mixMode==='merge'?'update/add':'replace'}): `+us.map(u=>`<b>${esc(u.name)}</b> ${n0(u.sqft)} sq ft × ${u.count}/floor`).join(', '),f:()=>{const nu=us.map(u=>{const d=H.UNIT_TYPES.find(t=>+t.beds===+u.beds&&!t.top)||H.UNIT_TYPES[2];return {name:u.name,beds:+u.beds||0,size:+u.sqft||d.size,perFloor:+u.count||1,park:d.park!=null?d.park:1,top:!!u.top};});
   if(R.mixMode==='merge'){nu.forEach(n=>{const e=h.units.find(x=>x.name.toLowerCase()===n.name.toLowerCase());if(e)Object.assign(e,n);else h.units.push(n);});}else h.units=nu;}});}}
function drawRev(){const r=R,hr=P().mode==='highrise',pu=plotUnitOf();let x='';
 if(r.little)x+=`<div class="warn friendly">🙈 I couldn't read much from this layout. That's normal for hand sketches, blurry photos or drawings with tiny text.<br>Tips: take the photo straight on in good light, crop to one floor, or upload the architect's PDF. You can also type the sizes below or in the Estimate tab.</div>`;
 x+=`<p class="sub">Everything below is already applied. Fix a number or untick a line and the estimate updates instantly.</p>`;
 x+=`<h3>🗺️ Plot</h3>`+(r.plot?`<label class="chk"><input type="checkbox" data-k="plotOn" ${r.plotOn?'checked':''}> Plot ${r.plot.w?`${r.plot.w} × ${r.plot.d} ft = `:''}${inp('plotSqft',r.plot.sqft,null,90)} sq ft (= ${(r.plot.sqft/unitSq(pu)).toFixed(1)} ${pu==='sqyd'?'sq yd':pu}) ${badge(r.plot.conf)}</label><p class="sub">Read as “${esc(r.plot.raw)}”${r.plot.sides&&r.plot.sides.front?`<br>Sides: front ${r.plot.sides.front}′, back ${r.plot.sides.back}′, left ${r.plot.sides.left}′, right ${r.plot.sides.right}′${r.plot.sides.diag?', diagonal '+r.plot.sides.diag+'′':''} (${esc(r.plot.method||'')})`:''}</p>`+(r.plot.diffPct!=null&&Math.abs(r.plot.diffPct)>2?`<div class="warn">⚠️ The sides give ${(r.plot.sidesSqft/9).toFixed(1)} sq yd, ${r.plot.diffPct>0?'+':''}${r.plot.diffPct}% from the official ${(r.plot.sqft/9).toFixed(1)} sq yd. Using the official area.</div>`:r.plot.diffPct!=null?`<p class="sub">✔️ Sides cross-check: ${(r.plot.sidesSqft/9).toFixed(1)} sq yd (${r.plot.diffPct>0?'+':''}${r.plot.diffPct}% from the official area).</p>`:''):'<p class="sub">No plot size found (look for text like “Plot 30\' × 60\'” or “200 sq yd”).</p>');
 const nOn=r.rooms.filter(m=>m.on).length;x+=`<p class="sub readInfo">${(r.files||[]).length>1?`📎 ${r.files.length} files merged: ${esc(r.files.join(', '))}<br>`:''}📄 ${r.pages>1?r.pages+' pages read one by one':'1 page read'}${r.secs!=null?` in ${r.secs}s`:''}${(r.info||[]).length?' · '+esc(r.info.join(' · ')):''}${r.stopped?' · <b>stopped early</b>':''}</p>`;
 const lowN=r.rooms.filter(m=>m.sqft!=null&&m.conf<.5).length+r.units.filter(u=>u.conf<.5).length+r.floorAreas.filter(f=>f.conf<.5).length;
 if(lowN)x+=`<p class="sub">${lowN} value${lowN>1?'s are':' is'} marked <span class="conf lo">⚠️ check</span>: already used, but compare ${lowN>1?'them':'it'} with your drawing and fix the number here if needed.</p>`;
 x+=`<h3>🏢 Floors found (${r.floorAreas.length})</h3>`;
 if(r.floorAreas.length){x+='<div class="rtWrap"><table class="rt fa"><thead><tr><th></th><th>Floor</th><th>How many</th><th>Area each, sq ft</th><th>Use</th><th>Sure?</th></tr></thead><tbody>'+r.floorAreas.map((f,i)=>`<tr class="${f.on?'':'off'}" title="${esc(f.raw||'')}"><td><input type="checkbox" data-k="fon" data-i="${i}" ${f.on?'checked':''} aria-label="Use ${esc(f.floor)}"></td><td><input data-k="fname" data-i="${i}" value="${esc(f.floor)}" style="width:120px"><small class="rawsrc">“${esc((f.raw||'').slice(0,60))}”</small>${srcT(f)}</td><td data-l="How many">${inp('fcount',f.count,i,44)}</td><td data-l="Area each, sq ft">${inp('fsqft',f.sqft,i,80)}</td><td data-l="Use"><select data-k="fuse" data-i="${i}">${[['parking','Parking'],['commercial','Shops / commercial'],['residential','Apartments / residential'],['skip','Other (ignore)']].map(([v,l])=>`<option value="${v}" ${f.use===v?'selected':''}>${l}</option>`).join('')}</select></td><td>${badge(f.conf)}</td></tr>`).join('')+'</tbody></table></div>';}
 else x+='<p class="sub">No floor area table / area statement found (e.g. “Ground floor covered area = 1,650 sft”).</p>';
 x+=`<h3>🛏️ Rooms (${r.rooms.length}${r.rooms.length?`, ${nOn} ticked`:''})</h3>`;
 if(r.rooms.length){x+='<div class="rtWrap"><table class="rt"><thead><tr><th></th><th>Room</th><th>W ft</th><th>L ft</th><th>Area sq ft</th><th>Floor</th><th>Sure?</th></tr></thead><tbody>'+r.rooms.map((m,i)=>(i===0||r.rooms[i-1].floor!==m.floor?`<tr class="grp"><td></td><td colspan="6">📍 ${esc(m.floor)} · ${r.rooms.filter(q=>q.floor===m.floor).length} rooms</td></tr>`:'')+`<tr class="${m.on?'':'off'}${m.sqft!=null&&m.conf<.5?' lowc':''}"><td><input type="checkbox" data-k="on" data-i="${i}" ${m.on?'checked':''} aria-label="Use ${esc(m.name)}"></td><td><input data-k="name" data-i="${i}" value="${esc(m.name)}" style="width:110px">${srcT(m)}</td><td data-l="W ft">${inp('w',m.w,i,56)}</td><td data-l="L ft">${inp('d',m.d,i,56)}</td><td data-l="Area sq ft">${inp('sqft',m.sqft,i,70)}</td><td data-l="Floor"><input data-k="floor" data-i="${i}" value="${esc(m.floor)}" style="width:100px"></td><td>${badge(m.conf,m.zoom)}${m.metric?' <small>m→ft</small>':''}</td></tr>`).join('')+'</tbody></table></div>';}
 else x+='<p class="sub">No room labels found.</p>';
 const fl=floorsCalc();
 if(fl.length)x+=`<label class="wfp">Walls &amp; passages add ${inp('wfPct',r.wfPct,null,50)} % to room areas</label><table class="rt sumf"><tr><th>Floor</th><th>Rooms total</th><th>≈ Covered area</th><th>Baths</th></tr>`+fl.map(f=>`<tr><td>${esc(f.floor)}</td><td>${n0(f.sq)} sq ft</td><td><b>${n0(f.cov)} sq ft</b></td><td>${f.baths}</td></tr>`).join('')+'</table>';
 if(r.covered.length)x+=`<label class="chk"><input type="checkbox" data-k="useCov" ${r.useCov?'checked':''}> Use the covered area printed on the drawing: ${r.covered.map(c=>`<b>${n0(c.sqft)}</b> sq ft ${badge(c.conf)}`).join(', ')}</label>`;
 x+=`<h3>🏢 Unit types (${r.units.length})</h3>`;
 if(r.units.length){x+='<div class="rtWrap"><table class="rt"><thead><tr><th></th><th>Unit</th><th>Beds</th><th>Size sq ft</th><th>Per floor</th><th>Floor</th><th>Sure?</th></tr></thead><tbody>'+r.units.map((u,i)=>`<tr class="${u.on?'':'off'}"><td><input type="checkbox" data-k="uon" data-i="${i}" ${u.on?'checked':''}></td><td><input data-k="uname" data-i="${i}" value="${esc(u.name)}" style="width:120px">${srcT(u)}</td><td data-l="Beds">${inp('ubeds',u.beds,i,40)}</td><td data-l="Size sq ft">${inp('usqft',u.sqft,i,70)}</td><td data-l="Per floor">${inp('ucount',u.count,i,44)}${!(+u.count>0)?'<small class="need">fill in</small>':''}</td><td data-l="Floor">${esc(u.floor)}</td><td>${badge(u.conf)}${u.fromRooms?' <small>from rooms</small>':''}${u.areas&&Object.keys(u.areas).filter(k=>u.areas[k]).length>1?`<br><small>${Object.keys(u.areas).filter(k=>u.areas[k]).map(k=>k+' '+n0(u.areas[k])).join(' · ')}</small>`:''}</td></tr>`).join('')+'</tbody></table></div>';
  if(hr)x+=`<div class="chips small"><button data-mix="replace" class="${R.mixMode!=='merge'?'on':''}">Replace unit mix</button><button data-mix="merge" class="${R.mixMode==='merge'?'on':''}">Update / add to mix</button></div>`;}
 else x+=`<p class="sub">No flat/unit labels found${hr?' (e.g. “2 BED”, “3BHK”, “Type A”)':''}.</p>`;
 const pr=proposals();x+=`<h3>✅ Apply to this ${hr?'high-rise':'house'} project</h3>`+(pr.length?'<div class="props">'+pr.map(q=>`<label class="chk"><input type="checkbox" data-prop="${q.id}" ${R['no_'+q.id]?'':'checked'}> <span>${q.t}</span></label>`).join('')+'</div>':'<p class="sub">Nothing to apply yet – tick or fill in some rows above.</p>');
 if(!hr&&r.units.length)x+='<p class="sub">Unit types apply to High-rise projects. Switch the mode on the Estimate tab to use them.</p>';
 x+=`<details class="rawTxt"><summary>Text I read</summary><pre>${esc(r.text||'')}</pre></details><div class="wizNav"><button id="lrevUndo">↩️ Undo scan</button><button id="lrevApply" class="accent">Done</button></div>`;
 const b=$('#lrevBody'),y=b.scrollTop;b.innerHTML=x;b.scrollTop=y;}
$('#lrevBody').addEventListener('change',e=>{const t=e.target,k=t.dataset.k,i=t.dataset.i;if(t.dataset.prop){R['no_'+t.dataset.prop]=!t.checked;liveApply();return;}if(!k)return;
 const num=A.num,rm=i!=null?R.rooms[i]:null,u=i!=null?R.units[i]:null;
 if(k==='on')rm.on=t.checked;else if(k==='name')rm.name=t.value;else if(k==='floor'){rm.floor=t.value;const f=LP.floorOf(t.value+(/floor/i.test(t.value)?'':' floor'));if(f)rm.level=f.level;}
 else if(k==='w'||k==='d'){rm[k]=num(t.value)||null;if(rm.w&&rm.d)rm.sqft=+(rm.w*rm.d).toFixed(1);}else if(k==='sqft')rm.sqft=num(t.value)||null;
 else if(k==='uon')u.on=t.checked;else if(k==='uname')u.name=t.value;else if(k==='ubeds')u.beds=num(t.value);else if(k==='usqft')u.sqft=num(t.value);else if(k==='ucount')u.count=num(t.value);
 else if(k==='fon')R.floorAreas[i].on=t.checked;else if(k==='fname'){const f=R.floorAreas[i];f.floor=t.value;const g=LP.floorOf(/floor|level|basement/i.test(t.value)?t.value:t.value+' floor');if(g){f.level=g.level;if(g.count)f.count=g.count;}}else if(k==='fcount')R.floorAreas[i].count=num(t.value)||1;else if(k==='fsqft')R.floorAreas[i].sqft=num(t.value)||null;else if(k==='fuse')R.floorAreas[i].use=t.value;
 else if(k==='plotOn')R.plotOn=t.checked;else if(k==='plotSqft')R.plot.sqft=num(t.value);else if(k==='wfPct')R.wfPct=num(t.value);else if(k==='useCov')R.useCov=t.checked;liveApply();drawRev();});
$('#lrevBody').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.mix){R.mixMode=b.dataset.mix;liveApply();drawRev();}
 else if(b.id==='lrevUndo'){const st=A.st(),bb=JSON.parse(R.base),i=st.projects.findIndex(p=>p.id===bb.id);if(i>=0)st.projects[i]=bb;R.base=null;A.save();A.loadInputs();A.applyMode();A.renderAll();closeRev();}
 else if(b.id==='lrevApply'){liveApply();closeRev();if(R.base)undoToast(R.base);}});
$('#lrev').addEventListener('click',e=>{if(e.target.id==='lrev')closeRev();});
function undoToast(before){const n=document.createElement('div');n.className='toast';n.innerHTML='✅ Applied from your layout <button class="mini">Undo</button>';document.querySelectorAll('.toast').forEach(t=>t.remove());document.body.appendChild(n);const tm=setTimeout(()=>n.remove(),20000);
 n.querySelector('button').onclick=()=>{const st=A.st(),i=st.projects.findIndex(p=>p.id===JSON.parse(before).id);if(i>=0)st.projects[i]=JSON.parse(before);A.save();A.loadInputs();A.applyMode();A.renderAll();n.remove();clearTimeout(tm);};}
window.LAY={edit:()=>{if(R&&R.base){$('#lrev').hidden=false;drawRev();}else if(cur&&cur.read)review(cur.read);},refresh,autoRead,review,rev:()=>R,_parse:LP.parse,_pdfLines:pdfLines};
refresh(true);
})();
