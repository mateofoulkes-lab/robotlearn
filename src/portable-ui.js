(()=>{
const P=window.RobotLearnRobot&&window.RobotLearnRobot.prototype;
if(P&&window.THREE){
 const baseGLB=P._loadGLB;
 P._loadGLB=function(url){
  const key=String(url).split('?')[0].split('/').pop();
  const b64=window.RobotLearnOfflineAssets&&window.RobotLearnOfflineAssets[key];
  if(location.protocol==='file:'&&b64&&THREE.GLTFLoader){
   return new Promise((resolve,reject)=>{
    try{
     const bin=atob(b64), bytes=new Uint8Array(bin.length);
     for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
     new THREE.GLTFLoader().parse(bytes.buffer,'',g=>resolve(g.scene),reject);
    }catch(err){reject(err)}
   });
  }
  return baseGLB.call(this,url);
 };
}

if(P&&window.THREE){
 const baseLoad=P._loadWorkcell, baseReset=P.resetCell;
 const M=(c,m=.1,r=.8)=>new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r});
 const mesh=(g,m,p)=>{const o=new THREE.Mesh(g,m);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
 P._buildPortableWorkcell=function(){
  if(!this.scene||this.cell?.portable)return;
  const root=new THREE.Group(); this.scene.add(root);
  const pkgPivot=new THREE.Group(); pkgPivot.position.set(1.15,-0.92,0); root.add(pkgPivot);
  const pkg=new THREE.Group(); pkgPivot.add(pkg);
  mesh(new THREE.BoxGeometry(.84,.88,.03),M(0xc28b4b,.05,.92),pkg).position.set(0,0,.07);
  [-.28,0,.28].forEach(x=>[-.28,0,.28].forEach(y=>mesh(new THREE.BoxGeometry(.13,.16,.08),M(0x8e5f34,.05,.96),pkg).position.set(x,y,.03)));
  mesh(new THREE.BoxGeometry(.76,.82,.02),M(0xeeeeee,.03,.85),pkg).position.set(0,0,.13);
  mesh(new THREE.BoxGeometry(.76,.02,.55),M(0xf3f3f3,.03,.85),pkg).position.set(0,-.40,.40);
  mesh(new THREE.BoxGeometry(.76,.02,.55),M(0x56565b,.15,.58),pkg).position.set(0,.40,.40);
  mesh(new THREE.BoxGeometry(.02,.82,.55),M(0x56565b,.15,.58),pkg).position.set(-.38,0,.40);
  mesh(new THREE.BoxGeometry(.02,.82,.55),M(0x56565b,.15,.58),pkg).position.set(.38,0,.40);
  const f1=mesh(new THREE.BoxGeometry(.76,.18,.015),M(0xf1f1f1,.03,.85),pkg); f1.position.set(0,-.16,.70); f1.rotation.x=-.8;
  const f2=mesh(new THREE.BoxGeometry(.76,.18,.015),M(0xf1f1f1,.03,.85),pkg); f2.position.set(0,.16,.70); f2.rotation.x=.8;
  const stackPivot=new THREE.Group(); stackPivot.position.set(1.08,.92,0); root.add(stackPivot);
  const stack=new THREE.Group(); stackPivot.add(stack);
  const pieces=[]; const matA=M(0xf2f2f2,.05,.82), matB=M(0x4d4d52,.15,.55);
  for(let i=0;i<4;i++){
   const g=new THREE.Group();
   mesh(new THREE.BoxGeometry(.72,.02,.86),matA,g).position.set(0,0,.43);
   mesh(new THREE.BoxGeometry(.02,.48,.86),matB,g).position.set(-.35,.23,.43);
   mesh(new THREE.BoxGeometry(.02,.48,.86),matB,g).position.set(.35,.23,.43);
   mesh(new THREE.BoxGeometry(.72,.48,.02),M(0xe2e2e2,.08,.72),g).position.set(0,.47,.85);
   g.position.set(.012*i,.035*i,.11+.036*i);
   g.userData.initialPosition=g.position.clone(); g.userData.initialQuaternion=g.quaternion.clone(); g.userData.removedFromStack=false;
   stack.add(g); pieces.push(g);
  }
  this.cell={...(this.cell||{}),ready:true,portable:true,portableRoot:root,packagePivot:pkgPivot,packageObj:pkg,stackPivot,stackGroup:stack,pieces,held:null,packageBox:this._box?this._box(pkg):null};
  this._updateSensors&&this._updateSensors(true);
  window.dispatchEvent(new CustomEvent('robotlearn-cell-ready-editor'));
 };
 P._loadWorkcell=async function(...a){
  try{
    const r=await baseLoad.apply(this,a);
    setTimeout(()=>{if(!this.cell?.packageObj||!(this.cell.pieces||[]).length)this._buildPortableWorkcell();},600);
    return r;
  }catch(e){console.warn('portable cell fallback',e); this._buildPortableWorkcell();}
 };
 P.resetCell=function(...a){
  if(!this.cell?.portable) return baseReset&&baseReset.apply(this,a);
  for(const p of this.cell.pieces||[]){
    this.cell.stackGroup.add(p); p.position.copy(p.userData.initialPosition); p.quaternion.copy(p.userData.initialQuaternion);
    p.userData.removedFromStack=false; p.visible=true;
  }
  this._updateSensors&&this._updateSensors(true);
 };
}
function initUI(){
 const pane=document.querySelector('#controlPane'), mode=document.querySelector('#jogMode'), vac=document.querySelector('#vacuumToggle');
 const lev=[0,1,2].map(i=>document.querySelector(`.jog-lever[data-axis="${i}"]`));
 if(!pane||!mode||!vac||lev.some(x=>!x)||document.querySelector('#techConsole'))return;

 const st=document.createElement('style');
 st.textContent=`
 .control-toolbar,.lever-bank,.control-indicators{display:none!important}
 #controlPane{padding:10px;background:linear-gradient(180deg,#0a0e12,#0e151b)}
 .tech{display:grid;grid-template-columns:1.15fr .85fr;gap:12px;height:100%}
 .screen,.pad,.box,.vac{background:#111820;border:1px solid #2a3a45;border-radius:14px}
 .screen{padding:13px;color:#dff;font-family:Consolas,monospace;box-shadow:inset 0 0 22px rgba(0,175,210,.08)}
 .modes{display:flex;gap:8px;margin-top:10px}
 .modes button,.vac,.j3 button{border:1px solid #344653;background:linear-gradient(#1a242d,#11181e);color:#dce9f1;border-radius:12px;padding:10px 12px;font-weight:800}
 .modes button.on{border-color:#37a9bb;color:#d7ffff;box-shadow:inset 0 0 16px rgba(48,203,218,.16),0 0 8px rgba(48,203,218,.12)}
 .vac{width:100%;font-size:15px}
 .vac.on{border-color:#2fa75e;color:#e6ffed;box-shadow:inset 0 0 18px rgba(47,200,96,.22),0 0 12px rgba(47,200,96,.16)}
 .pad{position:relative;height:220px;background:radial-gradient(circle at center,#17242d,#0e151b 62%,#090d11);box-shadow:inset 0 0 28px rgba(0,0,0,.4)}
 .pad:before,.pad:after{content:'';position:absolute;background:rgba(180,220,240,.15)}
 .pad:before{left:50%;top:10px;bottom:10px;width:1px}.pad:after{top:50%;left:10px;right:10px;height:1px}
 .knob{position:absolute;left:50%;top:50%;width:68px;height:68px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 30%,#465765,#202b33 62%,#141a1f);border:1px solid #5b6f7d;box-shadow:0 8px 18px rgba(0,0,0,.5),inset 0 0 12px rgba(255,255,255,.05)}
 .jog{display:grid;grid-template-columns:1fr 94px;gap:12px;margin-top:10px}
 .j3{display:flex;flex-direction:column;gap:10px}.j3 button{flex:1;font-size:25px}
 .sensors{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
 .box{display:flex;align-items:center;gap:10px;padding:11px 12px;color:#eaf6ff}
 .led{width:17px;height:17px;border-radius:50%;background:#26323b;box-shadow:inset 0 0 8px rgba(0,0,0,.5)}
 .led.on{background:#20d267;box-shadow:0 0 12px rgba(32,210,103,.78),inset 0 0 5px rgba(255,255,255,.32)}
 .mini{font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:#7ea1b3}.big{font-size:18px;color:#e6feff}
 .row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.row>div{min-width:0}
 @media(max-width:980px){.tech{grid-template-columns:1fr}.jog{grid-template-columns:1fr}.j3{flex-direction:row;height:100px}}
 `;
 document.head.appendChild(st);

 pane.insertAdjacentHTML('beforeend',`<div id="techConsole" class="tech">
 <div>
  <div class="screen"><div class="row">
   <div><div class="mini">TCP X</div><div id="tx" class="big">0</div></div>
   <div><div class="mini">TCP Y</div><div id="ty" class="big">0</div></div>
   <div><div class="mini">TCP Z</div><div id="tz" class="big">0</div></div>
   <div><div class="mini">Modo</div><div id="tm">J1·J2·J3</div></div>
   <div><div class="mini">Estado</div><div id="ts">LISTO</div></div>
   <div><div class="mini">Paquete</div><div id="tp">—</div></div>
  </div></div>
  <div class="modes">
   <button data-m="j123" class="on">J1·J2·J3</button>
   <button data-m="j456">J4·J5·J6</button>
   <button data-m="linear">XYZ·IK</button>
  </div>
  <div class="jog">
   <div id="pad" class="pad"><div id="knob" class="knob"></div></div>
   <div class="j3"><button id="bup">▲</button><button id="bdn">▼</button></div>
  </div>
 </div>
 <div>
  <button id="tv" class="vac">AIRE OFF</button>
  <div class="sensors">
   <div class="box"><div id="la" class="led"></div><div><div class="mini">Aire</div><div id="lat">OFF</div></div></div>
   <div class="box"><div id="lv" class="led"></div><div><div class="mini">Vacío</div><div id="lvt">NO</div></div></div>
   <div class="box"><div id="ll" class="led"></div><div><div class="mini">Sensor lateral</div><div id="llt">NO</div></div></div>
   <div class="box"><div id="lp" class="led"></div><div><div class="mini">Sensor paquete</div><div id="lpt">—</div></div></div>
  </div>
 </div></div>`);

 const q=s=>document.querySelector(s);
 const set=(i,v)=>{v=Math.max(-100,Math.min(100,Math.round(v)));if(+lev[i].value!==v){lev[i].value=v;lev[i].dispatchEvent(new Event('input',{bubbles:true}));}};
 const center=()=>{q('#knob').style.left='50%';q('#knob').style.top='50%';};
 const labels={j123:['J1·J2·J3','▲','▼'],j456:['J4·J5·J6','▲','▼'],linear:['XYZ·IK','Z+','Z-']};
 const sync=()=>{document.querySelectorAll('.modes button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode.value));q('#tm').textContent=labels[mode.value][0];q('#bup').textContent=labels[mode.value][1];q('#bdn').textContent=labels[mode.value][2];};
 document.querySelectorAll('.modes button').forEach(b=>b.onclick=()=>{mode.value=b.dataset.m;mode.dispatchEvent(new Event('change',{bubbles:true}));[0,1,2].forEach(i=>set(i,0));center();sync();});
 mode.addEventListener('change',sync);sync();

 let down=false;const pad=q('#pad');
 const move=(x,y)=>{const r=pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,rad=Math.min(r.width,r.height)*.34;let dx=(x-cx)/rad,dy=(y-cy)/rad,m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m;}q('#knob').style.left=`${50+dx*34}%`;q('#knob').style.top=`${50+dy*34}%`;set(0,-dy*100);set(1,dx*100);};
 pad.onpointerdown=e=>{down=true;pad.setPointerCapture(e.pointerId);move(e.clientX,e.clientY)};
 pad.onpointermove=e=>down&&move(e.clientX,e.clientY);
 const release=()=>{down=false;center();set(0,0);set(1,0);};pad.onpointerup=release;pad.onpointercancel=release;
 const hold=(sel,val)=>{const el=q(sel),stop=()=>set(2,0);el.onpointerdown=e=>{el.setPointerCapture(e.pointerId);set(2,val)};el.onpointerup=stop;el.onpointercancel=stop;el.onpointerleave=stop;};
 hold('#bup',100);hold('#bdn',-100);
 q('#tv').onclick=()=>vac.click();

 setInterval(()=>{
  q('#tx').textContent=q('#tcpX')?.textContent||'0';q('#ty').textContent=q('#tcpY')?.textContent||'0';q('#tz').textContent=q('#tcpZ')?.textContent||'0';
  q('#ts').textContent=(q('#robotState')?.textContent||'LISTO').toUpperCase();q('#tp').textContent=q('#ctlPackageInfo')?.textContent||'—';
  const air=(q('#ctlAir')?.textContent||'').trim(),vv=(q('#ctlVacuum')?.textContent||'').trim(),lat=(q('#ctlLateral')?.textContent||'').trim(),pkg=(q('#ctlPackage')?.textContent||'').trim();
  q('#la').classList.toggle('on',/ON|1/i.test(air));q('#lv').classList.toggle('on',/SI|YES|OK|1/i.test(vv));q('#ll').classList.toggle('on',/SI|YES|1/i.test(lat));q('#lp').classList.toggle('on',pkg&&pkg!=='NO'&&pkg!=='—');
  q('#lat').textContent=air||'OFF';q('#lvt').textContent=vv||'NO';q('#llt').textContent=lat||'NO';q('#lpt').textContent=pkg||'—';q('#tv').classList.toggle('on',/ON|1/i.test(air));q('#tv').textContent=/ON|1/i.test(air)?'AIRE ON':'AIRE OFF';
 },180);
}
(document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(initUI,250)):setTimeout(initUI,250));
})();