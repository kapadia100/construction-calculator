// Sale price / revenue: flats per unit type, shops / commercial, extra rows -> revenue, cost, profit. Everything empty until the user types.
(function(root){
const num=v=>{if(typeof v==='number')return isFinite(v)?v:0;const a=root.__app;return a?a.num(v):(+String(v||'').replace(/[,\s]/g,'')||0);};
const has=v=>v!==''&&v!=null&&num(v)>0;
// auto values from the project (used when the user leaves a field blank)
function autoRows(p,e,H){const out=[];if(p.mode!=='highrise')return out;(e.unitRows||[]).filter(u=>u.count>0).forEach(u=>out.push({id:u.id,name:u.name,n:u.count,sqft:+u.size||0}));return out;}
function calc(p,e,H){const S=p.sales||{},rows=autoRows(p,e,H),hr=p.mode==='highrise';const R={flats:[],comm:null,extra:[],revenue:0,sellSqft:0};
 if(!rows.length){const m=S.manual||{};rows.push({id:'_manual',name:'Flats',n:0,sqft:0,manual:true,autoTot:hr?Math.round(e.resSell||0):0});}
 const MU=(S.units||{})._manual||{},mHas=['n','sqft','price'].some(k=>has(MU[k]));
  rows.forEach((r,ri)=>{let u=(S.units||{})[r.id]||{};if(!r.manual&&ri===0&&mHas&&!has(u.price))u=Object.assign({},MU,Object.fromEntries(Object.entries(u).filter(([k,v])=>v!==''&&v!=null)));
  const nT=has(u.n),sT=has(u.sqft),mode=u.mode==='sqft'?'sqft':'flat',pr=num(u.price),pool=r.autoTot!=null?r.autoTot:r.n*r.sqft;let n=nT?num(u.n):r.n,sq=sT?num(u.sqft):r.sqft,tot=0,estN=false,totalOnly=false;
  if(n>0&&sq>0)tot=n*sq;
  else if(mode==='sqft'){if(sT&&!(n>0)){tot=sq;totalOnly=true;}else if(!(n>0)){tot=pool;totalOnly=true;}}
  else if(!(n>0)){if(sq>0&&pool>0){n=Math.floor(pool/sq);estN=n>0;tot=n*sq;}else tot=pool;}
  const rev=pr>0?(mode==='sqft'?tot*pr:n*pr):0;R.flats.push({manual:!!r.manual,id:r.id,name:r.name,n,sqft:sq,sqTot:tot,totalOnly,estN,typed:nT||sT,mode,price:pr,rev,autoN:r.n,autoSq:r.manual?r.autoTot:r.sqft});R.revenue+=rev;R.sellSqft+=tot;});
 if(hr||!p.mode){const c=S.comm||{},sh=(H&&H.shopSizes&&p.hr?H.shopSizes(p.hr):[])||[],aSq=Math.round(sh.reduce((a,b)=>a+b,0)||(hr&&e.commSell)||0),aN=sh.length,sq=has(c.sqft)?num(c.sqft):aSq,ns=has(c.shops)?num(c.shops):aN,mode=c.mode==='shop'?'shop':'sqft',pr=num(c.price),rev=pr>0?(mode==='shop'?ns*pr:sq*pr):0;R.comm={sqft:sq,shops:ns,mode,price:pr,rev,autoSq:aSq,autoN:aN};R.revenue+=rev;R.sellSqft+=sq;}
 if(p.mode==='house'){const v=num(S.houseValue);R.house=v;R.revenue+=v;R.sellSqft+=e.totalArea||0;}
 (S.extra||[]).forEach(x=>{const q=has(x.qty)?num(x.qty):1,pr=num(x.price),rev=q*pr;R.extra.push({name:x.name||'',qty:q,price:pr,rev});R.revenue+=rev;});
 R.cost=R.revenue>0?(e.grand||0):(e.grand||0);R.profit=R.revenue-R.cost;R.pct=R.cost>0?R.profit/R.cost*100:0;R.margin=R.revenue>0?R.profit/R.revenue*100:0;R.costPerSellable=R.sellSqft>0?R.cost/R.sellSqft:0;R.any=R.revenue>0;return R;}
root.SalesCalc={calc};if(typeof module!=='undefined')module.exports={calc};
if(typeof document==='undefined')return;
const $=s=>document.querySelector(s),A=()=>root.__app,esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pk=x=>root.Calc.pkr(x),pd=x=>(+x>0||+x<0)?pk(x):'—',n0=x=>Math.round(+x||0).toLocaleString('en-US');
function cur(){const a=A(),p=a.P(),s=a.S();const e=root.Calc.estimate(p,s);return {p,e,R:calc(p,e,root.HR)};}
const I=(k,v,ph,extra)=>`<input type="text" inputmode="decimal" autocomplete="off" data-sale="${k}" value="${esc(v==null?'':v)}" placeholder="${esc(ph||'')}" ${extra||''}>`;
let key='';
function migrate(){const a=A(),p=a.P(),S=p.sales;if(!S||!S.units||!S.units._manual)return;const R=cur().R,f=R.flats.find(x=>!x.manual);if(!f)return;const MU=S.units._manual,u=S.units[f.id]||{};if(!['n','sqft','price'].some(k=>has(MU[k]))||has(u.price))return;S.units[f.id]=Object.assign({},MU,Object.fromEntries(Object.entries(u).filter(([k,v])=>v!==''&&v!=null)));delete S.units._manual;a.save();}
function build(){migrate();const {p,R}=cur(),S=p.sales||{},hr=p.mode==='highrise';let x=`<h2>💵 Sale price / Revenue</h2><p class="sub">${hr?'Counts and sizes fill in from your project; type over them any time. ':''}Type a price to see revenue and profit.</p>`;
 if(hr||!p.mode||R.flats.some(f=>f.manual&&(f.n||f.price))){
  
  R.flats.forEach(f=>{const u=(S.units||{})[f.id]||{};x+=`<div class="saleRow" data-u="${esc(f.id)}"><b>${esc(f.name)}</b><div class="chips small"><button data-sm="flat" class="${f.mode==='flat'?'on':''}">Per flat (Rs)</button><button data-sm="sqft" class="${f.mode==='sqft'?'on':''}">Per sq ft (Rs)</button></div><div class="row"><label>Flats${I('u.n',u.n,f.autoN||'')}</label><label>${f.manual?'Sellable sq ft (per flat, or total)':'Sellable sq ft / flat'}${I('u.sqft',u.sqft,f.autoSq?(f.manual?'auto '+n0(f.autoSq)+' total':f.autoSq):'')}</label><label class="pl">${f.mode==='sqft'?'Price per sq ft':'Price per flat'}${I('u.price',u.price,'Rs','class="money"')}</label></div></div>`;});
  const c=S.comm||{},m=R.comm;x+=`<div class="saleRow" data-c="1"><b>Ground floor / shops / commercial</b><div class="chips small"><button data-cm="sqft" class="${m.mode==='sqft'?'on':''}">Rs per sq ft</button><button data-cm="shop" class="${m.mode==='shop'?'on':''}">Per shop</button></div><div class="row"><label>Sellable sq ft${I('c.sqft',c.sqft,m.autoSq||'')}</label><label>Shops${I('c.shops',c.shops,m.autoN||'')}</label><label>${m.mode==='shop'?'Price per shop':'Price per sq ft'}${I('c.price',c.price,'Rs','class="money"')}</label></div></div>`;}
 if(p.mode==='house')x+=`<div class="row"><label>Expected sale value of the house${I('houseValue',S.houseValue,'Rs','class="money"')}</label></div>`;
 x+='<div class="saleExtra"><b>Extra items</b> <small class="sub">(e.g. parking, penthouse)</small>'+(S.extra||[]).map((r,i)=>`<div class="row saleX"><label>Name<input type="text" data-sale="x.name" data-i="${i}" value="${esc(r.name)}" placeholder="e.g. Parking"></label><label>Qty${I('x.qty',r.qty,'1','data-i="'+i+'"')}</label><label>Price each${I('x.price',r.price,'Rs','class="money" data-i="'+i+'"')}</label><button class="mini" data-xdel="${i}" aria-label="Remove">✕</button></div>`).join('')+'<button class="mini" id="saleAdd">＋ Add row</button></div><div id="saleTot"></div>';
 $('#salesCard').innerHTML=x;totals();}
function totals(){if(key&&skey()!==key){key=skey();build();return;}const {R}=cur(),b=$('#saleTot');if(!b)return;const hr=A().P().mode==='highrise';
 b.innerHTML=`<table class="saleT">${R.flats.filter(f=>f.rev||f.price).map(f=>`<tr class="saleFlat"><td>${esc(f.name)} (${f.mode==='sqft'?(f.sqTot?n0(f.sqTot):'<b>? sq ft</b>')+' sq ft'+(f.totalOnly?' total':'')+' × '+pk(f.price):(f.n?n0(f.n):'<b>? flats</b>')+' × '+pk(f.price)})${f.estN?'<br><small class="sub warnS">⚠️ number of flats not entered – estimated '+n0(f.n)+' (sellable ÷ '+n0(f.sqft)+' sq ft)</small>':f.rev?'':'<br><small class="sub">⚠️ enter the number of flats'+(f.mode==='sqft'?' or sellable sq ft':' (or a flat size to estimate it)')+'</small>'}</td><td>${f.rev?pk(f.rev):'—'}</td></tr>`).join('')}${R.comm&&R.comm.rev?`<tr><td>Commercial (${R.comm.mode==='shop'?n0(R.comm.shops)+' shops':n0(R.comm.sqft)+' sq ft'} × ${pk(R.comm.price)})</td><td>${pk(R.comm.rev)}</td></tr>`:''}${R.house?`<tr><td>House sale value</td><td>${pk(R.house)}</td></tr>`:''}${R.extra.filter(x=>x.rev).map(x=>`<tr><td>${esc(x.name||'Extra')} (${n0(x.qty)} × ${pk(x.price)})</td><td>${pk(x.rev)}</td></tr>`).join('')}
 <tr class="tot"><td><b>Total sales revenue</b></td><td><b>${pd(R.revenue)}</b></td></tr><tr><td>Total cost (plot + building)</td><td>${root.__isEmpty&&root.__isEmpty()?'—':pd(R.cost)}</td></tr><tr class="tot"><td><b>Gross profit</b></td><td><b class="${R.profit<0?'neg':'pos'}">${R.any?pk(R.profit):'—'}</b></td></tr><tr><td>Profit % (on cost)</td><td>${R.any?R.pct.toFixed(1)+'%':'—'}</td></tr><tr><td>Profit % (on revenue)</td><td>${R.any?R.margin.toFixed(1)+'%':'—'}</td></tr><tr><td>Cost per sellable sq ft</td><td>${R.sellSqft&&R.cost&&!(root.__isEmpty&&root.__isEmpty())?pk(R.costPerSellable):'—'}</td></tr></table>`+(R.any?'':'<p class="sub">Type a sale price above to see profit.</p>');}
function skey(){const {p,R}=cur();return [p.id,p.mode,R.flats.map(f=>f.id+f.mode+f.autoN+'/'+f.autoSq).join(),R.comm&&R.comm.mode+R.comm.autoSq+'/'+R.comm.autoN,(p.sales&&p.sales.extra||[]).length].join('|');}
function render(){const c=$('#salesCard');if(!c)return;const k=skey();
 if(k!==key||!c.contains(document.activeElement)){key=k;build();}else totals();}
function S(){const p=A().P();p.sales=p.sales||{units:{},comm:{},extra:[]};p.sales.units=p.sales.units||{};p.sales.comm=p.sales.comm||{};p.sales.extra=p.sales.extra||[];return p.sales;}
function changed(){A().save();totals();root.__refreshTotals&&root.__refreshTotals();}
document.addEventListener('input',e=>{const t=e.target;if(!t.dataset||!t.dataset.sale||!t.closest('#salesCard'))return;const s=S(),k=t.dataset.sale,v=t.value;
 if(k.startsWith('u.')){const id=t.closest('[data-u]').dataset.u;(s.units[id]=s.units[id]||{})[k.slice(2)]=v;}else if(k.startsWith('c.'))s.comm[k.slice(2)]=v;else if(k.startsWith('x.'))s.extra[+t.dataset.i][k.slice(2)]=v;else s[k]=v;changed();});
document.addEventListener('click',e=>{const b=e.target.closest('#salesCard button');if(!b)return;const s=S();
 if(b.dataset.sm){const id=b.closest('[data-u]').dataset.u;(s.units[id]=s.units[id]||{}).mode=b.dataset.sm;}else if(b.dataset.cm)s.comm.mode=b.dataset.cm;else if(b.id==='saleAdd')s.extra.push({name:'',qty:'',price:''});else if(b.dataset.xdel!=null)s.extra.splice(+b.dataset.xdel,1);else return;A().save();key='';build();});
document.addEventListener('input',e=>{if(!e.target.closest||e.target.closest('#salesCard'))return;setTimeout(()=>{try{render();}catch(_){}},0);});document.addEventListener('change',e=>{if(!e.target.closest||e.target.closest('#salesCard'))return;setTimeout(()=>{try{render();}catch(_){}},0);});
root.SALES={render,calc:()=>cur().R};render();
})(typeof window!=='undefined'?window:globalThis);
