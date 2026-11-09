/* Access gate: compares SHA-256 of the typed code to a stored digest. Digest only — no plaintext code in source. */
(function(){
const H='a676494bf7602e6746c381611b839fe2498fba8a78139c19f79555a0937b5014';
const KEY='cc-ok',FAILS=5,WAIT=30000;
let fails=0,until=0,busy=false;
const $=s=>document.querySelector(s);
async function dig(s){
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function unlocked(){try{return localStorage.getItem(KEY)==='1';}catch(e){return false;}}
function openApp(){
  document.documentElement.dataset.ok='1';
  document.body.classList.remove('locked');
  const g=$('#gate');if(g)g.hidden=true;
}
function showGate(){
  document.documentElement.removeAttribute('data-ok');
  document.body.classList.add('locked');
  const g=$('#gate');if(g){g.hidden=false;const i=$('#gateCode');if(i){i.value='';setTimeout(()=>i.focus(),50);}}
  const e=$('#gateErr');if(e)e.textContent='';
}
function lock(){try{localStorage.removeItem(KEY);}catch(e){}showGate();}
async function tryUnlock(){
  if(busy)return;
  const err=$('#gateErr'),btn=$('#gateGo'),inp=$('#gateCode');
  const now=Date.now();
  if(now<until){const s=Math.ceil((until-now)/1000);if(err)err.textContent='Too many tries. Wait '+s+'s.';return;}
  const code=((inp&&inp.value)||'').trim();
  if(!code){if(err)err.textContent='Enter the access code.';return;}
  busy=true;if(btn)btn.disabled=true;
  try{
    const ok=(await dig(code))===H;
    if(ok){
      try{localStorage.setItem(KEY,'1');}catch(e){}
      fails=0;until=0;openApp();
    }else{
      fails++;
      if(fails>=FAILS){until=Date.now()+WAIT;fails=0;if(err)err.textContent='Too many tries. Wait 30 seconds.';}
      else if(err)err.textContent='Wrong access code.';
      if(inp){inp.value='';inp.focus();}
    }
  }catch(e){if(err)err.textContent='Could not check the code. Try again.';}
  finally{busy=false;if(btn)btn.disabled=false;}
}
function boot(){
  if(unlocked()){openApp();return;}
  showGate();
  const form=$('#gateForm');
  if(form)form.addEventListener('submit',e=>{e.preventDefault();tryUnlock();});
  const go=$('#gateGo');if(go)go.addEventListener('click',e=>{e.preventDefault();tryUnlock();});
}
window.LOCK={lock,unlocked,dig};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
