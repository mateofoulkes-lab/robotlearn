/* Dependency-free 3D fallback for corporate/offline environments.
   Implements the same public API used by RobotLearnRapid. */
window.RobotLearnRobotLite = class RobotLearnRobotLite {
  constructor(container, config) {
    this.container = container;
    this.config = config;
    this.angles = [0,0,0,0,0,0];
    this.onChange = null;
    this.yaw = -0.72;
    this.pitch = 0.34;
    this.distance = 4.25;
    this.target = [0.35,0,1.15];
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'lite-canvas';
    this.canvas.style.width='100%'; this.canvas.style.height='100%'; this.canvas.style.display='block';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this._bindCamera();
    this._resize();
    if(window.ResizeObserver) new ResizeObserver(()=>this._resize()).observe(container);
    window.addEventListener('resize',()=>this._resize());
    this.setHome();
    this._animate();
  }

  setVariant(config){ this.config=config; this.angles=[0,0,0,0,0,0]; this.setHome(); }
  setHome(){ [0,20,-35,0,35,0].forEach((d,i)=>this._applyAngle(i,d*Math.PI/180)); this._changed(); }
  resetCamera(){ this.yaw=-0.72; this.pitch=.34; this.distance=4.25; this.target=[.35,0,1.15]; }
  getJointDeg(){ return this.angles.map(a=>a*180/Math.PI); }
  setJointDeg(i,d){ this.setJointRad(i,d*Math.PI/180); }
  setJointRad(i,a){ this._applyAngle(i,a); this._changed(); }
  _applyAngle(i,a){ const [lo,hi]=this.config.limits[i]; this.angles[i]=Math.max(lo,Math.min(hi,a)); }
  _changed(){ if(this.onChange) this.onChange(this); }

  // ----- tiny matrix library -----
  _I(){ return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
  _mul(a,b){
    const r=new Array(16).fill(0);
    for(let row=0;row<4;row++) for(let col=0;col<4;col++) for(let k=0;k<4;k++) r[row*4+col]+=a[row*4+k]*b[k*4+col];
    return r;
  }
  _T(x,y,z){ return [1,0,0,x, 0,1,0,y, 0,0,1,z, 0,0,0,1]; }
  _Rx(a){ const c=Math.cos(a),s=Math.sin(a); return [1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1]; }
  _Ry(a){ const c=Math.cos(a),s=Math.sin(a); return [c,0,s,0, 0,1,0,0, -s,0,c,0, 0,0,0,1]; }
  _Rz(a){ const c=Math.cos(a),s=Math.sin(a); return [c,-s,0,0, s,c,0,0, 0,0,1,0, 0,0,0,1]; }
  _rot(i,a){ return i===0?this._Rz(a):(i===1||i===2||i===4?this._Ry(a):this._Rx(a)); }
  _point(m,p=[0,0,0]){ return [m[0]*p[0]+m[1]*p[1]+m[2]*p[2]+m[3],m[4]*p[0]+m[5]*p[1]+m[6]*p[2]+m[7],m[8]*p[0]+m[9]*p[1]+m[10]*p[2]+m[11]]; }
  _axisWorld(m,i){
    const a=i===0?[0,0,1]:(i===1||i===2||i===4?[0,1,0]:[1,0,0]);
    return [m[0]*a[0]+m[1]*a[1]+m[2]*a[2],m[4]*a[0]+m[5]*a[1]+m[6]*a[2],m[8]*a[0]+m[9]*a[1]+m[10]*a[2]];
  }
  _fk(){
    let m=this._I(); const joints=[]; const frames=[];
    for(let i=0;i<6;i++){
      const o=this.config.offsets[i]; m=this._mul(m,this._T(o[0],o[1],o[2]));
      joints.push(this._point(m));
      m=this._mul(m,this._rot(i,this.angles[i]));
      frames.push(m.slice());
    }
    return {joints,frames,tcp:this._point(m)};
  }
  getTCP(){ return this._fk().tcp; }
  getTCPmm(){ const p=this.getTCP(); return {x:p[0]*1000,y:p[1]*1000,z:p[2]*1000}; }

  // CCD inverse kinematics (position only, educational)
  solveIK(targetMM){
    const target=[targetMM[0]/1000,targetMM[1]/1000,targetMM[2]/1000];
    const original=this.angles.slice();
    const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
    const len=a=>Math.hypot(a[0],a[1],a[2]);
    const norm=a=>{const l=len(a)||1;return[a[0]/l,a[1]/l,a[2]/l]};
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    for(let iter=0;iter<90;iter++){
      let fk=this._fk(); if(len(sub(fk.tcp,target))<.003) break;
      for(let i=4;i>=0;i--){
        fk=this._fk(); const jp=fk.joints[i], axis=norm(this._axisWorld(fk.frames[i],i));
        let v1=sub(fk.tcp,jp),v2=sub(target,jp);
        v1=sub(v1,axis.map(x=>x*dot(v1,axis))); v2=sub(v2,axis.map(x=>x*dot(v2,axis)));
        if(len(v1)<1e-6||len(v2)<1e-6) continue;
        v1=norm(v1);v2=norm(v2);
        let delta=Math.atan2(dot(axis,cross(v1,v2)),Math.max(-1,Math.min(1,dot(v1,v2))));
        delta=Math.max(-.20,Math.min(.20,delta)); this._applyAngle(i,this.angles[i]+delta);
      }
    }
    const result=this.angles.slice(); this.angles=original; return result;
  }
  animateJoints(targetAngles,speedFactor=1){
    targetAngles=targetAngles.map((a,i)=>Math.max(this.config.limits[i][0],Math.min(this.config.limits[i][1],a)));
    const start=this.angles.slice(); let seconds=.12;
    for(let i=0;i<6;i++) seconds=Math.max(seconds,Math.abs(targetAngles[i]-start[i])/(this.config.maxSpeed[i]*Math.max(.1,speedFactor)));
    seconds=Math.min(3.2,Math.max(.12,seconds));
    return new Promise(resolve=>{const t0=performance.now();const tick=now=>{const t=Math.min(1,(now-t0)/(seconds*1000)),e=t*t*(3-2*t);for(let i=0;i<6;i++)this._applyAngle(i,start[i]+(targetAngles[i]-start[i])*e);this._changed();if(t<1)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
  }
  async moveJ(targetMM,speedFactor=1){ return this.animateJoints(this.solveIK(targetMM),speedFactor); }
  async moveL(targetMM,speedFactor=1){
    const s=this.getTCPmm(), e={x:targetMM[0],y:targetMM[1],z:targetMM[2]}; const dist=Math.hypot(e.x-s.x,e.y-s.y,e.z-s.z); const steps=Math.max(8,Math.min(36,Math.ceil(dist/55)));
    for(let k=1;k<=steps;k++){const t=k/steps,p=[s.x+(e.x-s.x)*t,s.y+(e.y-s.y)*t,s.z+(e.z-s.z)*t];await this.animateJoints(this.solveIK(p),Math.max(1.8,speedFactor*3));}
  }

  // ----- camera + canvas renderer -----
  _resize(){ const r=this.container.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.max(2,Math.floor(r.width*dpr));this.canvas.height=Math.max(2,Math.floor(r.height*dpr));this.ctx.setTransform(dpr,0,0,dpr,0,0);this.w=r.width;this.h=r.height; }
  _cameraBasis(){
    const cp=Math.cos(this.pitch),sp=Math.sin(this.pitch),cy=Math.cos(this.yaw),sy=Math.sin(this.yaw);
    const pos=[this.target[0]+this.distance*cp*cy,this.target[1]+this.distance*cp*sy,this.target[2]+this.distance*sp];
    const f=this._n([this.target[0]-pos[0],this.target[1]-pos[1],this.target[2]-pos[2]]), up0=[0,0,1];
    let right=this._n(this._cross(f,up0)); let up=this._cross(right,f); return {pos,f,right,up};
  }
  _n(a){const l=Math.hypot(...a)||1;return a.map(x=>x/l)} _cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]} _dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
  _project(p){ const c=this._cameraBasis(),v=[p[0]-c.pos[0],p[1]-c.pos[1],p[2]-c.pos[2]],z=this._dot(v,c.f); if(z<.05)return null; const scale=Math.min(this.w,this.h)*1.15/z; return [this.w/2+this._dot(v,c.right)*scale,this.h/2-this._dot(v,c.up)*scale,z]; }
  _line3(a,b,color,width){const A=this._project(a),B=this._project(b);if(!A||!B)return;const ctx=this.ctx;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke();}
  _joint3(p,r,color){const P=this._project(p);if(!P)return;const rr=Math.max(4,r*Math.min(this.w,this.h)/P[2]);const g=this.ctx.createRadialGradient(P[0]-rr*.3,P[1]-rr*.3,2,P[0],P[1],rr);g.addColorStop(0,'#ffb078');g.addColorStop(.45,color);g.addColorStop(1,'#7a2d09');this.ctx.fillStyle=g;this.ctx.beginPath();this.ctx.arc(P[0],P[1],rr,0,Math.PI*2);this.ctx.fill();this.ctx.strokeStyle='#2a180f';this.ctx.lineWidth=1.5;this.ctx.stroke();}
  _drawGrid(){
    for(let i=-4;i<=4;i+=.5){const major=Math.abs(i-Math.round(i))<.01;this._line3([i,-4,0],[i,4,0],major?'#34414d':'#222b33',major?1.1:.6);this._line3([-4,i,0],[4,i,0],major?'#34414d':'#222b33',major?1.1:.6);}
    this._line3([0,0,0],[.55,0,0],'#ff6b6b',2);this._line3([0,0,0],[0,.55,0],'#62d394',2);this._line3([0,0,0],[0,0,.55],'#72b7ff',2);
  }
  _render(){
    if(!this.ctx||!this.w||!this.h)return;const ctx=this.ctx;ctx.clearRect(0,0,this.w,this.h);
    const bg=ctx.createLinearGradient(0,0,0,this.h);bg.addColorStop(0,'#1a222c');bg.addColorStop(1,'#0e1217');ctx.fillStyle=bg;ctx.fillRect(0,0,this.w,this.h);this._drawGrid();
    const fk=this._fk(); const pts=[[0,0,0],[0,0,.18],...fk.joints];
    // industrial pedestal
    this._line3([0,0,.04],[0,0,.48],'#f26a21',42); this._joint3([0,0,.18],.18,'#f26a21');
    // links, dark under-stroke + orange body for depth
    for(let i=0;i<fk.joints.length-1;i++){const a=fk.joints[i],b=fk.joints[i+1],w=[34,28,25,21,17][i]||16;this._line3(a,b,'#11161b',w+8);this._line3(a,b,'#f26a21',w);}
    fk.joints.forEach((p,i)=>this._joint3(p,[.18,.17,.15,.115,.10,.082][i],'#f26a21'));
    const tcp=fk.tcp;this._joint3(tcp,.045,'#72b7ff');
    // flange/tool0 short axis
    const f6=fk.frames[5],x=[f6[0],f6[4],f6[8]],tip=[tcp[0]+x[0]*.12,tcp[1]+x[1]*.12,tcp[2]+x[2]*.12];this._line3(tcp,tip,'#d9e0e7',12);
    const P=this._project(tcp);if(P){ctx.fillStyle='#9dccff';ctx.font='11px Segoe UI,Arial';ctx.fillText('TCP',P[0]+10,P[1]-8);}
    // model label
    ctx.fillStyle='rgba(255,255,255,.62)';ctx.font='12px Segoe UI,Arial';ctx.fillText(this.config.label,14,this.h-16);
    ctx.fillStyle='rgba(255,184,125,.72)';ctx.fillText('Canvas 3D · sin dependencias externas',14,22);
  }
  _bindCamera(){
    let dragging=false,lastX=0,lastY=0;
    this.canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;this.canvas.setPointerCapture(e.pointerId)});
    this.canvas.addEventListener('pointermove',e=>{if(!dragging)return;this.yaw-=(e.clientX-lastX)*.008;this.pitch=Math.max(-.15,Math.min(1.15,this.pitch+(e.clientY-lastY)*.006));lastX=e.clientX;lastY=e.clientY;});
    this.canvas.addEventListener('pointerup',()=>dragging=false);
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=Math.max(2.1,Math.min(8,this.distance*(1+Math.sign(e.deltaY)*.09)));},{passive:false});
  }
  _animate(){ requestAnimationFrame(()=>this._animate()); this._render(); }
};
