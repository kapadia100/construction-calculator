const CACHE='constructcalc-v22.1',FILES=['./','./index.html','./style.css','./config.js','./hr.js','./calc.js','./app.js','./parse.js','./layout.js','./sales.js','./report.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];
// Some static hosts occasionally send a wrong Content-Type / Vary; store every file with the correct type so offline use never breaks.
const TYPES={css:'text/css',js:'text/javascript',mjs:'text/javascript',html:'text/html',webmanifest:'application/manifest+json',svg:'image/svg+xml',png:'image/png',json:'application/json'};
const typeOf=u=>{const p=new URL(u).pathname,e=p.endsWith('/')?'html':p.split('.').pop();return TYPES[e];};
async function fixed(u,res){const t=typeOf(u);if(!t||!res.ok)return res;const h=new Headers(res.headers);h.delete('Vary');h.set('Content-Type',t+(/^text|javascript/.test(t)?'; charset=utf-8':''));return new Response(await res.blob(),{status:res.status,statusText:res.statusText,headers:h});}
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>{const u=new URL(f,self.location).href;return fetch(u,{cache:'reload'}).then(r=>fixed(u,r)).then(r=>c.put(u,r));}))));self.skipWaiting();});
// On upgrade: drop old caches, take control, and reload any open pages that were running an older version.
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const keys=await caches.keys(),old=keys.filter(x=>x!==CACHE&&x!==VCACHE);await Promise.all(old.map(x=>caches.delete(x)));await self.clients.claim();
 if(old.length){const cs=await self.clients.matchAll({type:'window'});cs.forEach(c=>{try{c.navigate(c.url);}catch(_){}});}})());});
// Network-first (3 s timeout) so online users always get the newest app; cache is the offline fallback.
// Big self-hosted libraries (OCR, PDF reader, language data) never change at a given path: cache-first, kept across app updates.
const VCACHE='constructcalc-vendor-1';
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
 if(new URL(req.url).pathname.includes('/vendor/')){e.respondWith((async()=>{const c=await caches.open(VCACHE),hit=await c.match(req,{ignoreVary:true,ignoreSearch:true});if(hit)return hit;const r=await fetch(req);if(r.ok){const f=await fixed(req.url,r);c.put(req,f.clone());return f;}return r;})());return;}
 e.respondWith((async()=>{const c=await caches.open(CACHE);try{const net=await Promise.race([fetch(req,{cache:'no-cache'}),new Promise((_,rej)=>setTimeout(()=>rej('timeout'),3000))]);if(net.ok){const f=await fixed(req.url,net);c.put(req,f.clone());return f;}throw 'bad';}
  catch(_){return (await c.match(req,{ignoreSearch:true,ignoreVary:true}))||(await c.match(new URL('./index.html',self.location).href,{ignoreVary:true}))||Response.error();}})());});
