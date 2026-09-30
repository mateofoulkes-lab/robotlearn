/* RobotLearn v7 — workcell pose editor + repickable dropped laterals. */
(() => {
  const Base = window.RobotLearnRobot;
  const P = Base && Base.prototype;
  if (!P || !window.THREE) return;

  const deg = Math.PI / 180;
  const rad = 180 / Math.PI;
  const STORAGE_KEY = 'robotlearn-cell-layout-v1';

  /* Keep a reference for the UI module without changing app.js internals. */
  const baseInitScene = P._initScene;
  P._initScene = function(...args){
    window.robotLearnActiveRobot = this;
    return baseInitScene.apply(this,args);
  };

  /* A lateral stays detectable after it leaves the source stack. */
  P._pieceContact = function(tcp){
    if(!this.cell || !this.cell.ready) return null;
    const dir = this._toolAxisWorld ? this._toolAxisWorld() : new THREE.Vector3(0,0,-1);
    let best = null;
    for(const p of this.cell.pieces || []){
      if(!p || p===this.cell.held || !p.visible) continue;
      this.raycaster.set(tcp,dir);
      this.raycaster.near = 0;
      this.raycaster.far = .115;
      const hit = this.raycaster.intersectObject(p,true)[0];
      if(hit && (!best || hit.distance < best.gap)) best={piece:p,point:hit.point.clone(),gap:hit.distance};
    }
    return best;
  };

  P._ensureCellEditorPivots = function(){
    if(!this.cell || !this.cell.ready || !this.cell.packageObj || !this.cell.stackGroup) return false;
    if(this.cell.packagePivot && this.cell.stackPivot) return true;

    const makePivot = (obj,key) => {
      const parent = obj.parent;
      if(!parent) return null;
      const box = this._box(obj);
      const c = box.getCenter(new THREE.Vector3());
      const pivot = new THREE.Group();
      pivot.name = `RobotLearn_${key}_pivot`;
      parent.add(pivot);
      pivot.position.set(c.x,c.y,box.min.z);
      pivot.updateMatrixWorld(true);
      pivot.attach(obj); // preserve exact world pose
      this.cell[key] = pivot;
      return pivot;
    };

    if(!this.cell.packagePivot) makePivot(this.cell.packageObj,'packagePivot');
    if(!this.cell.stackPivot) makePivot(this.cell.stackGroup,'stackPivot');
    if(!this.cell.packagePivot || !this.cell.stackPivot) return false;

    if(!this.cell.editorDefaults){
      this.cell.editorDefaults={
        package:{position:this.cell.packagePivot.position.clone(),quaternion:this.cell.packagePivot.quaternion.clone()},
        stack:{position:this.cell.stackPivot.position.clone(),quaternion:this.cell.stackPivot.quaternion.clone()}
      };
    }

    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(saved && !this.cell.editorLayoutRestored){
        this.cell.editorLayoutRestored=true;
        if(saved.package) this.setCellPose('package',saved.package,false);
        if(saved.stack) this.setCellPose('stack',saved.stack,false);
      }
    }catch(_){ }
    return true;
  };

  P.getCellPose = function(kind){
    if(!this._ensureCellEditorPivots()) return null;
    const pivot = kind==='package' ? this.cell.packagePivot : this.cell.stackPivot;
    const e = new THREE.Euler().setFromQuaternion(pivot.quaternion,'XYZ');
    return {
      x:pivot.position.x*1000,
      y:pivot.position.y*1000,
      z:pivot.position.z*1000,
      rx:e.x*rad,
      ry:e.y*rad,
      rz:e.z*rad
    };
  };

  P.setCellPose = function(kind,pose,persist=true){
    if(!this._ensureCellEditorPivots()) throw new Error('La celda todavía no terminó de cargar');
    const pivot = kind==='package' ? this.cell.packagePivot : this.cell.stackPivot;
    const current=this.getCellPose(kind);
    const n=(key,def)=>Number.isFinite(Number(pose[key]))?Number(pose[key]):def;
    pivot.position.set(n('x',current.x)/1000,n('y',current.y)/1000,n('z',current.z)/1000);
    pivot.rotation.set(n('rx',current.rx)*deg,n('ry',current.ry)*deg,n('rz',current.rz)*deg,'XYZ');
    pivot.updateMatrixWorld(true);
    if(kind==='package') this.cell.packageBox=this._box(this.cell.packageObj);
    this._updateSensors(true);
    if(persist) this.saveCellLayout();
    window.dispatchEvent(new CustomEvent('robotlearn-cell-pose-changed',{detail:{kind,pose:this.getCellPose(kind)}}));
    return this.getCellPose(kind);
  };

  P.saveCellLayout = function(){
    const packagePose=this.getCellPose('package'),stackPose=this.getCellPose('stack');
    if(packagePose&&stackPose) localStorage.setItem(STORAGE_KEY,JSON.stringify({package:packagePose,stack:stackPose}));
  };

  P.resetCellLayout = function(){
    if(!this._ensureCellEditorPivots() || !this.cell.editorDefaults) return;
    const applyDefault=(kind,pivot,data)=>{
      pivot.position.copy(data.position);pivot.quaternion.copy(data.quaternion);pivot.updateMatrixWorld(true);
    };
    applyDefault('package',this.cell.packagePivot,this.cell.editorDefaults.package);
    applyDefault('stack',this.cell.stackPivot,this.cell.editorDefaults.stack);
    this.cell.packageBox=this._box(this.cell.packageObj);
    localStorage.removeItem(STORAGE_KEY);
    this._updateSensors(true);
    window.dispatchEvent(new CustomEvent('robotlearn-cell-pose-changed',{detail:{kind:'all'}}));
  };

  /* Cell examples must follow the edited layout instead of stale load-time targets. */
  const fallbackTargets={picks:[[1100,920,500],[1100,920,470],[1100,920,440],[1100,920,410]],flanks:[[1150,-450,650],[1150,-1390,650],[1580,-920,650],[720,-920,650]],scan:[[950,-1150,900],[1350,-1150,900],[1350,-700,900],[950,-700,900]],packageTop:[1150,-920,850]};
  P.getCellTargets = function(){
    if(!this.cell || !this.cell.ready || !this.cell.packageObj) return fallbackTargets;
    this._ensureCellEditorPivots();
    const source=(this.cell.pieces||[]).filter(p=>!p.userData.removedFromStack && p!==this.cell.held);
    const pieces=source.length?source:(this.cell.pieces||[]).filter(p=>p!==this.cell.held);
    const picks=pieces.map(p=>{const b=this._box(p),c=b.getCenter(new THREE.Vector3());return[c.x*1000,c.y*1000,(b.max.z+.010)*1000]}).sort((a,b)=>b[2]-a[2]);
    const pb=this._box(this.cell.packageObj),c=pb.getCenter(new THREE.Vector3()),z=(pb.max.z+.08)*1000;
    const flanks=[[c.x,pb.max.y+.05,pb.max.z+.10],[c.x,pb.min.y-.05,pb.max.z+.10],[pb.max.x+.05,c.y,pb.max.z+.10],[pb.min.x-.05,c.y,pb.max.z+.10]].map(v=>v.map(n=>n*1000));
    const inset=.07,scan=[[pb.min.x+inset,pb.min.y+inset,pb.max.z+.18],[pb.max.x-inset,pb.min.y+inset,pb.max.z+.18],[pb.max.x-inset,pb.max.y-inset,pb.max.z+.18],[pb.min.x+inset,pb.max.y-inset,pb.max.z+.18]].map(v=>v.map(n=>n*1000));
    return {picks:picks.length?picks:fallbackTargets.picks,flanks,scan,packageTop:[c.x*1000,c.y*1000,z]};
  };

  const baseLoadWorkcell=P._loadWorkcell;
  P._loadWorkcell=async function(...args){
    const r=await baseLoadWorkcell.apply(this,args);
    if(this._ensureCellEditorPivots()) window.dispatchEvent(new CustomEvent('robotlearn-cell-ready-editor'));
    return r;
  };

  function injectStyles(){
    const style=document.createElement('style');
    style.textContent=`
      .cell-editor{padding:10px;overflow:auto;background:#101419;max-height:260px}
      .cell-editor-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .pose-card{background:#181e24;border:1px solid #2b3540;border-radius:9px;padding:9px}
      .pose-card h4{margin:0 0 8px;font-size:12px;color:#e5ebf2;display:flex;justify-content:space-between;align-items:center}
      .pose-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
      .pose-field{display:flex;flex-direction:column;gap:3px;color:#8f9dab;font-size:9px;text-transform:uppercase}
      .pose-field input{width:100%;min-width:0;background:#0d1116;border:1px solid #303a45;color:#eef3f8;border-radius:6px;padding:6px;font:11px Consolas,monospace}
      .pose-actions{display:flex;gap:6px;margin-top:8px}.pose-actions button{flex:1;padding:6px;font-size:10px}
      .cell-editor-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:9px;padding-top:8px;border-top:1px solid #29313a}
      .cell-editor-footer small{color:#7f8d9a;font-size:9px;line-height:1.3}.cell-editor-footer button{white-space:nowrap;font-size:10px;padding:6px 9px}
      @media(max-width:760px){.cell-editor-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function poseCard(kind,title,prefix){
    const field=(id,label,unit)=>`<label class="pose-field"><span>${label} ${unit}</span><input id="${prefix}${id}" type="number" step="${id.startsWith('R')?'1':'10'}"></label>`;
    return `<section class="pose-card" data-kind="${kind}"><h4><span>${title}</span><span>${kind==='package'?'📦':'▤'}</span></h4><div class="pose-grid">${field('X','X','mm')}${field('Y','Y','mm')}${field('Z','Z','mm')}${field('Rx','Rx','°')}${field('Ry','Ry','°')}${field('Rz','Rz','°')}</div><div class="pose-actions"><button data-read="${kind}">Leer actual</button><button class="primary" data-apply="${kind}">Aplicar</button></div></section>`;
  }

  function installUI(){
    injectStyles();
    const tabs=document.querySelector('.motion-tabs'),motion=document.querySelector('.motion-panel');
    const axes=document.querySelector('#axesPane'),control=document.querySelector('#controlPane');
    const tabAxes=document.querySelector('#tabAxes'),tabControl=document.querySelector('#tabControl');
    if(!tabs||!motion||!axes||!control||document.querySelector('#tabCell')) return;

    const tab=document.createElement('button');tab.id='tabCell';tab.className='motion-tab';tab.textContent='Celda';tabs.appendChild(tab);
    const pane=document.createElement('div');pane.id='cellPane';pane.className='motion-pane hidden cell-editor';
    pane.innerHTML=`<div class="cell-editor-grid">${poseCard('package','Paquete','pkgPose')}${poseCard('stack','Pila de laterales','stackPose')}</div><div class="cell-editor-footer"><small>XYZ son absolutos respecto de la base del robot. Rx/Ry/Rz usan grados. Los cambios quedan guardados en este navegador.</small><button id="resetCellLayout">Restaurar layout original</button></div>`;
    motion.appendChild(pane);

    const robot=()=>window.robotLearnActiveRobot;
    const ids={package:'pkgPose',stack:'stackPose'};
    const fill=kind=>{
      const r=robot(); if(!r||!r.getCellPose)return;
      const p=r.getCellPose(kind);if(!p)return;
      const pre=ids[kind];['X','Y','Z','Rx','Ry','Rz'].forEach(k=>{const el=document.querySelector(`#${pre}${k}`);if(el)el.value=(p[k.toLowerCase()]||0).toFixed(k.startsWith('R')?1:0)});
    };
    const readForm=kind=>{
      const pre=ids[kind],p={};
      [['X','x'],['Y','y'],['Z','z'],['Rx','rx'],['Ry','ry'],['Rz','rz']].forEach(([id,key])=>{const el=document.querySelector(`#${pre}${id}`);p[key]=Number(el.value)});return p;
    };
    const refresh=()=>{fill('package');fill('stack')};

    tab.addEventListener('click',()=>{
      axes.classList.add('hidden');control.classList.add('hidden');pane.classList.remove('hidden');
      tab.classList.add('active');tabAxes.classList.remove('active');tabControl.classList.remove('active');refresh();
    });
    tabAxes.addEventListener('click',()=>{pane.classList.add('hidden');tab.classList.remove('active')});
    tabControl.addEventListener('click',()=>{pane.classList.add('hidden');tab.classList.remove('active')});

    pane.querySelectorAll('[data-read]').forEach(b=>b.addEventListener('click',()=>fill(b.dataset.read)));
    pane.querySelectorAll('[data-apply]').forEach(b=>b.addEventListener('click',()=>{
      const r=robot();if(!r||!r.setCellPose)return;
      try{r.setCellPose(b.dataset.apply,readForm(b.dataset.apply),true);fill(b.dataset.apply)}catch(err){console.warn(err)}
    }));
    pane.querySelector('#resetCellLayout').addEventListener('click',()=>{const r=robot();if(r&&r.resetCellLayout){r.resetCellLayout();refresh()}});
    window.addEventListener('robotlearn-cell-ready-editor',refresh);
    window.addEventListener('robotlearn-cell-pose-changed',refresh);
    setTimeout(refresh,250);
  }

  setTimeout(installUI,0);
})();
