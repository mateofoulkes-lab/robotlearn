window.RobotLearnRobot = class RobotLearnRobot {
  constructor(container, config) {
    if (!window.THREE) throw new Error('THREE no disponible');
    this.container=container; this.config=config; this.jointGroups=[]; this.angles=[0,0,0,0,0,0];
    this.axisLocal=[new THREE.Vector3(0,0,1),new THREE.Vector3(0,1,0),new THREE.Vector3(0,1,0),new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(1,0,0)];
    this.onChange=null; this.onSensors=null; this.onCellReady=null;
    this.vacuumActive=false; this.toolLength=.165;
    this.sensorState={sobreLateral:false,vacioOK:false,laserDistMM:null,bordePaquete:false,alturaPaqueteMM:null,lateralesRestantes:4};
    this.cell={ready:false,pieces:[],held:null,packageObj:null,stackGroup:null,scale:1,pickTargets:[],packageBox:null};
    this._initScene(); this.setVariant(config); this._loadWorkcell(); this._animate();
  }

  _initScene(){
    const w=this.container.clientWidth||700,h=this.container.clientHeight||600;
    this.scene=new THREE.Scene(); this.scene.background=new THREE.Color(0x11161d);
    this.camera=new THREE.PerspectiveCamera(45,w/h,.01,50); this.camera.up.set(0,0,1); this.camera.position.set(3.7,-4.2,2.9);
    this.renderer=new THREE.WebGLRenderer({antialias:true}); this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2)); this.renderer.setSize(w,h); this.renderer.shadowMap.enabled=true; this.renderer.shadowMap.type=THREE.PCFSoftShadowMap; this.container.appendChild(this.renderer.domElement);
    this.controls=new THREE.OrbitControls(this.camera,this.renderer.domElement); this.controls.target.set(.75,0,.85); this.controls.enableDamping=true; this.controls.dampingFactor=.08; this.controls.update();
    this.scene.add(new THREE.HemisphereLight(0xe8f1ff,0x25231f,1.15));
    const key=new THREE.DirectionalLight(0xffffff,1.2); key.position.set(3,-2,5); key.castShadow=true; this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xfff3e5,.42); fill.position.set(-3,3,2); this.scene.add(fill);
    const grid=new THREE.GridHelper(10,50,0x566575,0x29333d); grid.position.z=.002; grid.rotation.x=Math.PI/2; this.scene.add(grid);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshStandardMaterial({color:0x151a20,roughness:.98})); floor.receiveShadow=true; this.scene.add(floor);
    this.axes=new THREE.AxesHelper(.45); this.axes.position.z=.006; this.scene.add(this.axes);
    this.robotHolder=new THREE.Group(); this.workcellGroup=new THREE.Group(); this.scene.add(this.robotHolder); this.scene.add(this.workcellGroup);
    this.tcpMarker=new THREE.Mesh(new THREE.SphereGeometry(.022,16,10),new THREE.MeshBasicMaterial({color:0x72b7ff})); this.scene.add(this.tcpMarker);
    this.sensorBeam=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x62d394})); this.sensorBeam.visible=false; this.scene.add(this.sensorBeam);
    this._resize=()=>{const rw=this.container.clientWidth,rh=this.container.clientHeight;if(!rw||!rh)return;this.camera.aspect=rw/rh;this.camera.updateProjectionMatrix();this.renderer.setSize(rw,rh)};
    window.addEventListener('resize',this._resize); if(window.ResizeObserver)new ResizeObserver(this._resize).observe(this.container);
  }

  setVariant(config){
    this.config=config; while(this.robotHolder.children.length)this.robotHolder.remove(this.robotHolder.children[0]);
    this.jointGroups=[]; this.angles=[0,0,0,0,0,0]; this.toolTip=null; this.vacuumIndicator=null; this._buildRobot(); this.setHome();
  }

  _mat(color,metal=.12,rough=.55){return new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough})}
  _mesh(geo,mat,parent){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
  _cylinderAlongAxis(radius,length,axis,mat,parent){const m=this._mesh(new THREE.CylinderGeometry(radius,radius,length,28),mat,parent);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.clone().normalize());return m}
  _beam(vec,radius,mat,parent){const len=vec.length();if(len<1e-5)return;const dir=vec.clone().normalize();const b=this._mesh(new THREE.CylinderGeometry(radius*.82,radius,len,24),mat,parent);b.position.copy(vec.clone().multiplyScalar(.5));b.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);const s=this._mesh(new THREE.BoxGeometry(radius*.92,radius*.68,len*.86),mat,parent);s.position.copy(vec.clone().multiplyScalar(.5));s.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir)}

  _makeAbbLabel(parent){
    const c=document.createElement('canvas');c.width=512;c.height=180;const x=c.getContext('2d');x.fillStyle='#d71920';x.font='900 112px Arial Black,Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('ABB',256,94);
    const t=new THREE.CanvasTexture(c),m=new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide,depthWrite:false});const p=this._mesh(new THREE.PlaneGeometry(.26,.09),m,parent);p.position.set(.10,-.215,.055);p.rotation.x=Math.PI/2;
  }

  _buildVacuumTool(parent,metal,dark){
    const tool=new THREE.Group();parent.add(tool);
    const adapter=this._cylinderAlongAxis(.045,.05,new THREE.Vector3(1,0,0),metal,tool);adapter.position.x=.085;
    const body=this._cylinderAlongAxis(.028,.065,new THREE.Vector3(1,0,0),metal,tool);body.position.x=.125;
    const hose=this._cylinderAlongAxis(.009,.07,new THREE.Vector3(0,0,1),dark,tool);hose.position.set(.11,.03,.04);
    const cupMat=this._mat(0x24282d,.04,.88);
    const cup=this._mesh(new THREE.CylinderGeometry(.022,.014,.022,24),cupMat,tool);cup.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(1,0,0));cup.position.x=.158;
    this.vacuumIndicator=this._mesh(new THREE.SphereGeometry(.010,12,8),new THREE.MeshBasicMaterial({color:0x66727e}),tool);this.vacuumIndicator.position.set(.115,-.032,.036);
    this.toolTip=new THREE.Object3D();this.toolTip.position.x=this.toolLength;parent.add(this.toolTip);
  }

  _buildRobot(){
    const body=this._mat(0xe7e8e4,.10,.50),body2=this._mat(0xd6d9d9,.12,.48),dark=this._mat(0x252a2f,.34,.38),cap=this._mat(0xc9ced1,.45,.28),black=this._mat(0x121417,.28,.48);
    const basePlate=this._mesh(new THREE.BoxGeometry(.58,.58,.075),dark,this.robotHolder);basePlate.position.z=.0375;
    const foot=this._mesh(new THREE.CylinderGeometry(.29,.33,.19,40),body,this.robotHolder);foot.rotation.x=Math.PI/2;foot.position.z=.165;
    const pedestal=this._mesh(new THREE.CylinderGeometry(.22,.27,.33,36),body,this.robotHolder);pedestal.rotation.x=Math.PI/2;pedestal.position.z=.33;
    const motor=this._mesh(new THREE.BoxGeometry(.30,.28,.23),dark,this.robotHolder);motor.position.set(-.23,0,.31);
    let parent=this.robotHolder;
    for(let i=0;i<6;i++){
      const off=new THREE.Vector3(...this.config.offsets[i]),anchor=new THREE.Group();anchor.position.copy(off);parent.add(anchor);const joint=new THREE.Group();anchor.add(joint);this.jointGroups.push(joint);
      const axis=this.axisLocal[i],jr=[.21,.205,.18,.135,.115,.095][i],jl=[.26,.34,.32,.25,.22,.16][i];this._cylinderAlongAxis(jr,jl,axis,i<3?body:dark,joint);this._cylinderAlongAxis(jr*.61,jl*1.04,axis,cap,joint);
      if(i<5){const next=new THREE.Vector3(...this.config.offsets[i+1]),radius=[.18,.145,.13,.11,.085][i];this._beam(next,radius,i===3?body2:body,joint);if(i===1||i===3){const cable=this._mesh(new THREE.CylinderGeometry(.018,.018,Math.max(.12,next.length()*.72),10),black,joint);cable.position.copy(next.clone().multiplyScalar(.5));cable.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),next.clone().normalize());cable.position.y+=.13}}
      else{const f=this._cylinderAlongAxis(.105,.065,new THREE.Vector3(1,0,0),cap,joint);f.position.x=.035;const r=this._cylinderAlongAxis(.075,.078,new THREE.Vector3(1,0,0),dark,joint);r.position.x=.07}
      parent=joint;
    }
    const shoulder=this._mesh(new THREE.BoxGeometry(.36,.42,.38),body,this.jointGroups[0]);shoulder.position.set(.08,0,.04);const elbow=this._mesh(new THREE.BoxGeometry(.38,.34,.28),body,this.jointGroups[2]);elbow.position.set(.02,0,.05);
    this._makeAbbLabel(this.jointGroups[0]);this._buildVacuumTool(this.jointGroups[5],cap,dark);this.setVacuumActive(this.vacuumActive);
  }

  _loadGLB(url){return new Promise((resolve,reject)=>{if(!THREE.GLTFLoader)return reject(new Error('GLTFLoader no disponible'));new THREE.GLTFLoader().load(url,g=>resolve(g.scene),undefined,reject)})}
  _modelRoot(scene){const r=new THREE.Group();const s=scene.clone(true);s.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});r.add(s);r.rotation.x=Math.PI/2;r.updateMatrixWorld(true);return r}
  _box(obj){obj.updateMatrixWorld(true);return new THREE.Box3().setFromObject(obj)}
  _placeOnFloor(obj,x,y,z=.015){let b=this._box(obj),c=b.getCenter(new THREE.Vector3());obj.position.x+=x-c.x;obj.position.y+=y-c.y;obj.updateMatrixWorld(true);b=this._box(obj);obj.position.z+=z-b.min.z;obj.updateMatrixWorld(true)}
  _makeLabel(text,color=0xffffff){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='rgba(10,14,18,.78)';x.fillRect(0,0,512,128);x.fillStyle=`#${color.toString(16).padStart(6,'0')}`;x.font='700 54px Segoe UI,Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,64);const tex=new THREE.CanvasTexture(c),mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});const sp=new THREE.Sprite(mat);sp.scale.set(.65,.16,1);return sp}

  async _loadWorkcell(){
    if(!THREE.GLTFLoader)return;
    try{
      const [pkgSrc,latSrc,stackSrc]=await Promise.all([this._loadGLB('paquete.glb'),this._loadGLB('lateral.glb'),this._loadGLB('laterales.glb')]);
      while(this.workcellGroup.children.length)this.workcellGroup.remove(this.workcellGroup.children[0]);
      const pkg=this._modelRoot(pkgSrc),latRef=this._modelRoot(latSrc),stackRef=this._modelRoot(stackSrc);
      const rawPkg=this._box(pkg).getSize(new THREE.Vector3()),rawWidth=Math.max(rawPkg.x,rawPkg.y);
      if(!Number.isFinite(rawWidth)||rawWidth<=0)throw new Error('paquete.glb no tiene dimensiones válidas');
      const scale=.85/rawWidth;this.cell.scale=scale;pkg.scale.setScalar(scale);latRef.scale.setScalar(scale);stackRef.scale.setScalar(scale);pkg.updateMatrixWorld(true);latRef.updateMatrixWorld(true);stackRef.updateMatrixWorld(true);
      this.workcellGroup.add(pkg);this._placeOnFloor(pkg,1.15,-.92,.02);this.cell.packageObj=pkg;this.cell.packageBox=this._box(pkg);
      const latSize=this._box(latRef).getSize(new THREE.Vector3()),stackSize=this._box(stackRef).getSize(new THREE.Vector3());
      const L=[latSize.x,latSize.y,latSize.z],S=[stackSize.x,stackSize.y,stackSize.z];let axis=2,best=Infinity;
      for(let i=0;i<3;i++){if(L[i]>.00001){const ratio=S[i]/L[i],score=Math.abs(ratio-4);if(ratio>1.5&&score<best){best=score;axis=i}}}
      const spacing=(S[axis]||L[axis]*4)/4,stackGroup=new THREE.Group();this.workcellGroup.add(stackGroup);this.cell.stackGroup=stackGroup;this.cell.pieces=[];
      for(let i=0;i<4;i++){
        const p=this._modelRoot(latSrc);p.scale.setScalar(scale);p.position.set(0,0,0);p.position[['x','y','z'][axis]]=(i-1.5)*spacing;stackGroup.add(p);p.userData.index=i;p.userData.removedFromStack=false;this.cell.pieces.push(p);
      }
      this._placeOnFloor(stackGroup,1.10,.92,.025);stackGroup.updateMatrixWorld(true);
      this.cell.pieces.forEach(p=>{p.userData.homePosition=p.position.clone();p.userData.homeQuaternion=p.quaternion.clone();p.userData.homeScale=p.scale.clone();const b=this._box(p),c=b.getCenter(new THREE.Vector3());p.userData.pickTarget=[c.x*1000,c.y*1000,(b.max.z+.012)*1000]});
      this.cell.pickTargets=this.cell.pieces.map(p=>p.userData.pickTarget.slice()).sort((a,b)=>b[2]-a[2]);
      const pb=this._box(pkg),pc=pb.getCenter(new THREE.Vector3());
      const labP=this._makeLabel('PAQUETE',0xffc58f);labP.position.set(pc.x,pc.y,pb.max.z+.22);this.workcellGroup.add(labP);
      const sb=this._box(stackGroup),sc=sb.getCenter(new THREE.Vector3());const labL=this._makeLabel('LATERALES',0xa8f0cf);labL.position.set(sc.x,sc.y,sb.max.z+.22);this.workcellGroup.add(labL);
      this.cell.ready=true;this._updateSensors(true);if(this.onCellReady)this.onCellReady(this.getCellTargets());
    }catch(err){console.warn('RobotLearn workcell:',err);this.cell.ready=false}
  }

  resetCell(){
    this.setVacuumActive(false);if(!this.cell.ready)return;
    this.cell.pieces.forEach(p=>{if(p.parent!==this.cell.stackGroup)this.cell.stackGroup.attach(p);p.position.copy(p.userData.homePosition);p.quaternion.copy(p.userData.homeQuaternion);p.scale.copy(p.userData.homeScale);p.userData.removedFromStack=false;p.visible=true});
    this.cell.held=null;this.cell.stackGroup.updateMatrixWorld(true);this._updateSensors(true);
  }

  _pieceContact(tcp){
    if(!this.cell.ready)return null;let best=null;
    for(const p of this.cell.pieces){if(p===this.cell.held)continue;const b=this._box(p),inside=tcp.x>=b.min.x-.025&&tcp.x<=b.max.x+.025&&tcp.y>=b.min.y-.025&&tcp.y<=b.max.y+.025,gap=tcp.z-b.max.z;if(inside&&gap>=-.018&&gap<.12&&(!best||gap<best.gap))best={piece:p,box:b,gap}}
    return best;
  }

  _releaseHeld(){if(!this.cell.held)return;const p=this.cell.held;this.workcellGroup.attach(p);p.userData.removedFromStack=true;this.cell.held=null}
  _tryPick(contact){if(!this.vacuumActive||this.cell.held||!contact||contact.gap>.028)return false;const p=contact.piece;this.toolTip.attach(p);p.userData.removedFromStack=true;this.cell.held=p;return true}

  _updateSensors(force=false){
    const tcp=this.getTCP(),contact=this._pieceContact(tcp);if(this.vacuumActive&&!this.cell.held)this._tryPick(contact);
    let laser=null,edge=false,height=null,pkgSeal=false;
    if(this.cell.ready&&this.cell.packageObj){const b=this._box(this.cell.packageObj);this.cell.packageBox=b;height=b.max.z*1000;const over=tcp.x>=b.min.x&&tcp.x<=b.max.x&&tcp.y>=b.min.y&&tcp.y<=b.max.y;if(over&&tcp.z>=b.max.z){laser=(tcp.z-b.max.z)*1000;const e=Math.min(Math.abs(tcp.x-b.min.x),Math.abs(b.max.x-tcp.x),Math.abs(tcp.y-b.min.y),Math.abs(b.max.y-tcp.y));edge=e<.055;pkgSeal=laser<25;this.sensorBeam.visible=true;this.sensorBeam.geometry.setFromPoints([tcp,new THREE.Vector3(tcp.x,tcp.y,b.max.z)])}else this.sensorBeam.visible=false}else this.sensorBeam.visible=false;
    const state={sobreLateral:!!contact,vacioOK:!!(this.vacuumActive&&(this.cell.held||(contact&&contact.gap<.025)||pkgSeal)),laserDistMM:Number.isFinite(laser)?laser:null,bordePaquete:edge,alturaPaqueteMM:Number.isFinite(height)?height:null,lateralesRestantes:this.cell.pieces.filter(p=>!p.userData.removedFromStack).length};
    const changed=force||JSON.stringify(state)!==JSON.stringify(this.sensorState);this.sensorState=state;if(changed&&this.onSensors)this.onSensors({...state});
  }

  getSensors(){return {...this.sensorState}}
  getCellTargets(){
    const fallback={picks:[[1100,920,500],[1100,920,470],[1100,920,440],[1100,920,410]],flanks:[[1150,-450,650],[1150,-1390,650],[1580,-920,650],[720,-920,650]],scan:[[950,-1150,900],[1350,-1150,900],[1350,-700,900],[950,-700,900]],packageTop:[1150,-920,850]};
    if(!this.cell.ready||!this.cell.packageObj)return fallback;
    const pb=this._box(this.cell.packageObj),c=pb.getCenter(new THREE.Vector3()),z=(pb.max.z+.08)*1000;
    const picks=this.cell.pieces.map(p=>p.userData.pickTarget.slice()).sort((a,b)=>b[2]-a[2]);
    const flanks=[[c.x,(pb.max.y+.05),pb.max.z+.10],[c.x,(pb.min.y-.05),pb.max.z+.10],[(pb.max.x+.05),c.y,pb.max.z+.10],[(pb.min.x-.05),c.y,pb.max.z+.10]].map(v=>v.map(n=>n*1000));
    const inset=.07,scan=[[pb.min.x+inset,pb.min.y+inset,pb.max.z+.18],[pb.max.x-inset,pb.min.y+inset,pb.max.z+.18],[pb.max.x-inset,pb.max.y-inset,pb.max.z+.18],[pb.min.x+inset,pb.max.y-inset,pb.max.z+.18]].map(v=>v.map(n=>n*1000));
    return {picks,flanks,scan,packageTop:[c.x*1000,c.y*1000,z]};
  }

  setVacuumActive(active){this.vacuumActive=!!active;if(!active)this._releaseHeld();if(this.vacuumIndicator)this.vacuumIndicator.material.color.setHex(this.vacuumActive?0x53e49d:0x66727e);this._updateSensors(true)}
  _applyAngle(i,a){if(!Number.isFinite(a))return;const[lo,hi]=this.config.limits[i];a=Math.max(lo,Math.min(hi,a));this.angles[i]=a;const g=this.jointGroups[i];if(!g)return;g.rotation.set(0,0,0);if(i===0)g.rotation.z=a;else if(i===1||i===2||i===4)g.rotation.y=a;else g.rotation.x=a;this.robotHolder.updateMatrixWorld(true);this._updateTCP()}
  setJointRad(i,a){this._applyAngle(i,a);this._changed()} setJointDeg(i,d){this.setJointRad(i,d*Math.PI/180)} getJointDeg(){return this.angles.map(a=>a*180/Math.PI)}
  setHome(){[0,20,-35,0,35,0].forEach((d,i)=>this._applyAngle(i,d*Math.PI/180));this._changed()}
  resetCamera(){this.camera.up.set(0,0,1);this.camera.position.set(3.7,-4.2,2.9);this.controls.target.set(.75,0,.85);this.controls.update()}
  getTCP(){if(!this.toolTip)return new THREE.Vector3();const p=new THREE.Vector3();this.toolTip.getWorldPosition(p);return p}
  getTCPmm(){const p=this.getTCP();return{x:p.x*1000,y:p.y*1000,z:p.z*1000}}
  _updateTCP(){const p=this.getTCP();this.tcpMarker.position.copy(p)}
  _changed(){this._updateTCP();this._updateSensors();if(this.onChange)this.onChange(this)}
  _clampAngles(arr){return arr.map((a,i)=>Number.isFinite(a)?Math.max(this.config.limits[i][0],Math.min(this.config.limits[i][1],a)):NaN)}

  solveIK(targetMM){
    if(!targetMM||targetMM.length<3||!targetMM.slice(0,3).every(Number.isFinite))throw new Error('Target cartesiano inválido');
    const target=new THREE.Vector3(targetMM[0]/1000,targetMM[1]/1000,targetMM[2]/1000),original=this.angles.slice();
    for(let iter=0;iter<100;iter++){
      const ee=this.getTCP();if(!Number.isFinite(ee.x+ee.y+ee.z))break;if(ee.distanceTo(target)<.003)break;
      for(let i=4;i>=0;i--){this.robotHolder.updateMatrixWorld(true);const jp=new THREE.Vector3();this.jointGroups[i].getWorldPosition(jp);const q=new THREE.Quaternion();this.jointGroups[i].getWorldQuaternion(q);const axis=this.axisLocal[i].clone().applyQuaternion(q).normalize();let v1=this.getTCP().sub(jp),v2=target.clone().sub(jp);v1.sub(axis.clone().multiplyScalar(v1.dot(axis)));v2.sub(axis.clone().multiplyScalar(v2.dot(axis)));if(v1.lengthSq()<1e-8||v2.lengthSq()<1e-8)continue;v1.normalize();v2.normalize();const cross=new THREE.Vector3().crossVectors(v1,v2);let d=Math.atan2(axis.dot(cross),Math.max(-1,Math.min(1,v1.dot(v2))));if(!Number.isFinite(d))continue;d=Math.max(-.20,Math.min(.20,d));this._applyAngle(i,this.angles[i]+d)}
    }
    const result=this.angles.slice(),error=this.getTCP().distanceTo(target);original.forEach((a,i)=>this._applyAngle(i,a));if(!result.every(Number.isFinite)||!Number.isFinite(error))throw new Error('La IK produjo un resultado inválido; pose restaurada');if(error>.13)throw new Error(`Target fuera de alcance o singularidad (${Math.round(error*1000)} mm de error)`);return result;
  }

  animateJoints(targetAngles,speedFactor=1){
    targetAngles=this._clampAngles(targetAngles);if(!targetAngles.every(Number.isFinite))return Promise.reject(new Error('Ángulos articulares inválidos'));
    const start=this.angles.slice();let seconds=.12;for(let i=0;i<6;i++)seconds=Math.max(seconds,Math.abs(targetAngles[i]-start[i])/(this.config.maxSpeed[i]*Math.max(.1,speedFactor)));seconds=Math.min(3.4,Math.max(.12,seconds));
    return new Promise(resolve=>{const t0=performance.now(),tick=now=>{const t=Math.min(1,(now-t0)/(seconds*1000)),e=t*t*(3-2*t);for(let i=0;i<6;i++)this._applyAngle(i,start[i]+(targetAngles[i]-start[i])*e);this._changed();if(t<1)requestAnimationFrame(tick);else resolve()};requestAnimationFrame(tick)})
  }
  async moveJ(targetMM,speedFactor=1){return this.animateJoints(this.solveIK(targetMM),speedFactor)}
  async moveL(targetMM,speedFactor=1){const s=this.getTCPmm(),e={x:targetMM[0],y:targetMM[1],z:targetMM[2]},dist=Math.hypot(e.x-s.x,e.y-s.y,e.z-s.z),steps=Math.max(8,Math.min(42,Math.ceil(dist/50)));for(let k=1;k<=steps;k++){const t=k/steps,p=[s.x+(e.x-s.x)*t,s.y+(e.y-s.y)*t,s.z+(e.z-s.z)*t];await this.animateJoints(this.solveIK(p),Math.max(1.8,speedFactor*3))}}
  _animate(){requestAnimationFrame(()=>this._animate());this.controls.update();this._updateTCP();this._updateSensors();this.renderer.render(this.scene,this.camera)}
};
