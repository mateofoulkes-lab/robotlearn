window.RobotLearnRobot = class RobotLearnRobot {
  constructor(container, config) {
    if (!window.THREE) throw new Error('THREE no disponible');
    this.container = container;
    this.config = config;
    this.jointGroups = [];
    this.angles = [0,0,0,0,0,0];
    this.axisLocal = [
      new THREE.Vector3(0,0,1), new THREE.Vector3(0,1,0), new THREE.Vector3(0,1,0),
      new THREE.Vector3(1,0,0), new THREE.Vector3(0,1,0), new THREE.Vector3(1,0,0)
    ];
    this.onChange = null;
    this.vacuumActive = false;
    this.toolLength = 0.23;
    this._initScene();
    this.setVariant(config);
    this._animate();
  }

  _initScene(){
    const w = this.container.clientWidth || 700, h = this.container.clientHeight || 600;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x11161d);

    this.camera = new THREE.PerspectiveCamera(45, w/h, 0.01, 50);
    this.camera.up.set(0,0,1);
    this.camera.position.set(3.45,-3.65,2.55);

    this.renderer = new THREE.WebGLRenderer({antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(w,h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0.45,0,1.10);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .08;
    this.controls.update();

    this.scene.add(new THREE.HemisphereLight(0xe8f1ff,0x25231f,1.12));
    const key = new THREE.DirectionalLight(0xffffff,1.18);
    key.position.set(3,-2,5); key.castShadow=true; this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff3e5,.42);
    fill.position.set(-3,3,2); this.scene.add(fill);

    const grid = new THREE.GridHelper(8,40,0x566575,0x29333d);
    grid.position.z=.002;
    grid.rotation.x=Math.PI/2;
    this.scene.add(grid);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8,8),
      new THREE.MeshStandardMaterial({color:0x151a20,roughness:.98,metalness:0})
    );
    floor.receiveShadow=true;
    floor.position.z=0;
    this.scene.add(floor);

    this.axes = new THREE.AxesHelper(.45);
    this.axes.position.z=.006;
    this.scene.add(this.axes);

    this.robotHolder = new THREE.Group();
    this.scene.add(this.robotHolder);

    this.tcpMarker = new THREE.Mesh(
      new THREE.SphereGeometry(.027,18,12),
      new THREE.MeshBasicMaterial({color:0x72b7ff})
    );
    this.scene.add(this.tcpMarker);

    this._resize = () => {
      const rw=this.container.clientWidth, rh=this.container.clientHeight;
      if(!rw || !rh) return;
      this.camera.aspect=rw/rh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(rw,rh);
    };
    window.addEventListener('resize',this._resize);
    if(window.ResizeObserver) new ResizeObserver(this._resize).observe(this.container);
  }

  setVariant(config){
    this.config = config;
    while(this.robotHolder.children.length) this.robotHolder.remove(this.robotHolder.children[0]);
    this.jointGroups=[];
    this.angles=[0,0,0,0,0,0];
    this.toolTip=null;
    this.vacuumIndicator=null;
    this._buildRobot();
    this.setHome();
  }

  _mat(color,metal=.12,rough=.55){
    return new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough});
  }

  _mesh(geo,mat,parent){
    const m=new THREE.Mesh(geo,mat);
    m.castShadow=true;
    m.receiveShadow=true;
    parent.add(m);
    return m;
  }

  _cylinderAlongAxis(radius,length,axis,mat,parent){
    const m=this._mesh(new THREE.CylinderGeometry(radius,radius,length,28),mat,parent);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.clone().normalize());
    return m;
  }

  _beam(vec,radius,mat,parent){
    const len=vec.length();
    if(len<1e-5) return;
    const dir=vec.clone().normalize();
    const beam=this._mesh(new THREE.CylinderGeometry(radius*.82,radius,len,24),mat,parent);
    beam.position.copy(vec.clone().multiplyScalar(.5));
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
    const spine=this._mesh(new THREE.BoxGeometry(radius*.92,radius*.68,len*.86),mat,parent);
    spine.position.copy(vec.clone().multiplyScalar(.5));
    spine.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);
  }

  _makeAbbLabel(parent){
    const canvas=document.createElement('canvas');
    canvas.width=512; canvas.height=180;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#d71920';
    ctx.font='900 112px Arial Black, Arial, sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('ABB',256,94);
    const tex=new THREE.CanvasTexture(canvas);
    tex.needsUpdate=true;
    const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false});
    const p=this._mesh(new THREE.PlaneGeometry(.26,.09),mat,parent);
    p.position.set(.10,-.215,.055);
    p.rotation.x=Math.PI/2;
    return p;
  }

  _buildVacuumTool(parent,metal,dark){
    const tool=new THREE.Group();
    parent.add(tool);

    const adapter=this._cylinderAlongAxis(.075,.07,new THREE.Vector3(1,0,0),metal,tool);
    adapter.position.x=.10;

    const body=this._cylinderAlongAxis(.047,.12,new THREE.Vector3(1,0,0),metal,tool);
    body.position.x=.175;

    const hose=this._cylinderAlongAxis(.016,.11,new THREE.Vector3(0,0,1),dark,tool);
    hose.position.set(.155,.055,.055);

    const cupMat=this._mat(0x24282d,.05,.82);
    const cup=this._mesh(new THREE.CylinderGeometry(.070,.040,.050,28),cupMat,tool);
    cup.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(1,0,0));
    cup.position.x=.245;

    this.vacuumIndicator=this._mesh(
      new THREE.SphereGeometry(.018,16,10),
      new THREE.MeshBasicMaterial({color:0x66727e}),
      tool
    );
    this.vacuumIndicator.position.set(.165,-.055,.055);

    this.toolTip=new THREE.Object3D();
    this.toolTip.position.x=this.toolLength;
    parent.add(this.toolTip);
  }

  _buildRobot(){
    const body=this._mat(0xe7e8e4,.10,.50);
    const body2=this._mat(0xd6d9d9,.12,.48);
    const dark=this._mat(0x252a2f,.34,.38);
    const cap=this._mat(0xc9ced1,.45,.28);
    const black=this._mat(0x121417,.28,.48);

    const basePlate=this._mesh(new THREE.BoxGeometry(.58,.58,.075),dark,this.robotHolder);
    basePlate.position.z=.0375;
    const foot=this._mesh(new THREE.CylinderGeometry(.29,.33,.19,40),body,this.robotHolder);
    foot.rotation.x=Math.PI/2; foot.position.z=.165;
    const pedestal=this._mesh(new THREE.CylinderGeometry(.22,.27,.33,36),body,this.robotHolder);
    pedestal.rotation.x=Math.PI/2; pedestal.position.z=.33;
    const motor=this._mesh(new THREE.BoxGeometry(.30,.28,.23),dark,this.robotHolder);
    motor.position.set(-.23,0,.31);

    let parent=this.robotHolder;
    for(let i=0;i<6;i++){
      const off=new THREE.Vector3(...this.config.offsets[i]);
      const anchor=new THREE.Group();
      anchor.position.copy(off);
      parent.add(anchor);

      const joint=new THREE.Group();
      anchor.add(joint);
      this.jointGroups.push(joint);

      const axis=this.axisLocal[i];
      const jr=[.21,.205,.18,.135,.115,.095][i];
      const jl=[.26,.34,.32,.25,.22,.16][i];
      this._cylinderAlongAxis(jr,jl,axis,i<3?body:dark,joint);
      this._cylinderAlongAxis(jr*.61,jl*1.04,axis,cap,joint);

      if(i<5){
        const next=new THREE.Vector3(...this.config.offsets[i+1]);
        const radius=[.18,.145,.13,.11,.085][i];
        this._beam(next,radius,i===3?body2:body,joint);
        if(i===1 || i===3){
          const cable=this._mesh(
            new THREE.CylinderGeometry(.018,.018,Math.max(.12,next.length()*.72),10),
            black,
            joint
          );
          cable.position.copy(next.clone().multiplyScalar(.5));
          cable.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),next.clone().normalize());
          cable.position.y += .13;
        }
      } else {
        const flange=this._cylinderAlongAxis(.105,.065,new THREE.Vector3(1,0,0),cap,joint);
        flange.position.x=.035;
        const ring=this._cylinderAlongAxis(.075,.078,new THREE.Vector3(1,0,0),dark,joint);
        ring.position.x=.07;
      }
      parent=joint;
    }

    const shoulder=this._mesh(new THREE.BoxGeometry(.36,.42,.38),body,this.jointGroups[0]);
    shoulder.position.set(.08,0,.04);
    const elbow=this._mesh(new THREE.BoxGeometry(.38,.34,.28),body,this.jointGroups[2]);
    elbow.position.set(.02,0,.05);

    this._makeAbbLabel(this.jointGroups[0]);
    this._buildVacuumTool(this.jointGroups[5],cap,dark);
    this.setVacuumActive(this.vacuumActive);
  }

  setVacuumActive(active){
    this.vacuumActive=!!active;
    if(this.vacuumIndicator){
      this.vacuumIndicator.material.color.setHex(this.vacuumActive?0x53e49d:0x66727e);
    }
  }

  _applyAngle(i,a){
    if(!Number.isFinite(a)) return;
    const [lo,hi]=this.config.limits[i];
    a=Math.max(lo,Math.min(hi,a));
    this.angles[i]=a;
    const g=this.jointGroups[i];
    if(!g) return;
    g.rotation.set(0,0,0);
    if(i===0) g.rotation.z=a;
    else if(i===1 || i===2 || i===4) g.rotation.y=a;
    else g.rotation.x=a;
    this.robotHolder.updateMatrixWorld(true);
    this._updateTCP();
  }

  setJointRad(i,a){ this._applyAngle(i,a); this._changed(); }
  setJointDeg(i,d){ this.setJointRad(i,d*Math.PI/180); }
  getJointDeg(){ return this.angles.map(a=>a*180/Math.PI); }

  setHome(){
    const home=[0,20,-35,0,35,0];
    home.forEach((d,i)=>this._applyAngle(i,d*Math.PI/180));
    this._changed();
  }

  resetCamera(){
    this.camera.up.set(0,0,1);
    this.camera.position.set(3.45,-3.65,2.55);
    this.controls.target.set(.45,0,1.10);
    this.controls.update();
  }

  getTCP(){
    if(!this.toolTip) return new THREE.Vector3();
    const p=new THREE.Vector3();
    this.toolTip.getWorldPosition(p);
    return p;
  }

  getTCPmm(){
    const p=this.getTCP();
    return {x:p.x*1000,y:p.y*1000,z:p.z*1000};
  }

  _updateTCP(){
    const p=this.getTCP();
    this.tcpMarker.position.copy(p);
  }

  _changed(){
    this._updateTCP();
    if(this.onChange) this.onChange(this);
  }

  _clampAngles(arr){
    return arr.map((a,i)=>{
      if(!Number.isFinite(a)) return NaN;
      return Math.max(this.config.limits[i][0],Math.min(this.config.limits[i][1],a));
    });
  }

  solveIK(targetMM){
    if(!targetMM || targetMM.length<3 || !targetMM.slice(0,3).every(Number.isFinite)){
      throw new Error('Target cartesiano inválido');
    }

    const target=new THREE.Vector3(targetMM[0]/1000,targetMM[1]/1000,targetMM[2]/1000);
    const original=this.angles.slice();

    for(let iter=0;iter<95;iter++){
      const ee=this.getTCP();
      if(!Number.isFinite(ee.x+ee.y+ee.z)) break;
      if(ee.distanceTo(target)<.003) break;

      for(let i=4;i>=0;i--){
        this.robotHolder.updateMatrixWorld(true);
        const jp=new THREE.Vector3();
        this.jointGroups[i].getWorldPosition(jp);
        const q=new THREE.Quaternion();
        this.jointGroups[i].getWorldQuaternion(q);
        const axis=this.axisLocal[i].clone().applyQuaternion(q).normalize();
        let v1=this.getTCP().sub(jp), v2=target.clone().sub(jp);
        v1.sub(axis.clone().multiplyScalar(v1.dot(axis)));
        v2.sub(axis.clone().multiplyScalar(v2.dot(axis)));
        if(v1.lengthSq()<1e-8 || v2.lengthSq()<1e-8) continue;
        v1.normalize(); v2.normalize();
        const cross=new THREE.Vector3().crossVectors(v1,v2);
        let delta=Math.atan2(axis.dot(cross),Math.max(-1,Math.min(1,v1.dot(v2))));
        if(!Number.isFinite(delta)) continue;
        delta=Math.max(-.20,Math.min(.20,delta));
        this._applyAngle(i,this.angles[i]+delta);
      }
    }

    const result=this.angles.slice();
    const solvedTCP=this.getTCP();
    const error=solvedTCP.distanceTo(target);
    original.forEach((a,i)=>this._applyAngle(i,a));

    if(!result.every(Number.isFinite) || !Number.isFinite(error)){
      throw new Error('La IK produjo un resultado inválido; la pose anterior fue restaurada');
    }
    if(error>.12){
      throw new Error(`Target fuera de alcance o demasiado cerca de una singularidad (${Math.round(error*1000)} mm de error)`);
    }
    return result;
  }

  animateJoints(targetAngles,speedFactor=1){
    targetAngles=this._clampAngles(targetAngles);
    if(!targetAngles.every(Number.isFinite)){
      return Promise.reject(new Error('Movimiento cancelado: ángulos articulares inválidos'));
    }

    const start=this.angles.slice();
    let seconds=.12;
    for(let i=0;i<6;i++){
      seconds=Math.max(seconds,Math.abs(targetAngles[i]-start[i])/(this.config.maxSpeed[i]*Math.max(.1,speedFactor)));
    }
    seconds=Math.min(3.5,Math.max(.12,seconds));

    return new Promise(resolve=>{
      const t0=performance.now();
      const tick=now=>{
        const t=Math.min(1,(now-t0)/(seconds*1000));
        const e=t*t*(3-2*t);
        for(let i=0;i<6;i++) this._applyAngle(i,start[i]+(targetAngles[i]-start[i])*e);
        this._changed();
        if(t<1) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  async moveJ(targetMM,speedFactor=1){
    const solved=this.solveIK(targetMM);
    return this.animateJoints(solved,speedFactor);
  }

  async moveL(targetMM,speedFactor=1){
    const start=this.getTCPmm();
    const end={x:targetMM[0],y:targetMM[1],z:targetMM[2]};
    const dist=Math.hypot(end.x-start.x,end.y-start.y,end.z-start.z);
    const steps=Math.max(6,Math.min(30,Math.ceil(dist/65)));

    for(let s=1;s<=steps;s++){
      const t=s/steps;
      const p=[
        start.x+(end.x-start.x)*t,
        start.y+(end.y-start.y)*t,
        start.z+(end.z-start.z)*t
      ];
      const solved=this.solveIK(p);
      await this.animateJoints(solved,Math.max(2.2,speedFactor*4));
    }
  }

  _animate(){
    requestAnimationFrame(()=>this._animate());
    this.controls.update();
    this._updateTCP();
    this.renderer.render(this.scene,this.camera);
  }
};
