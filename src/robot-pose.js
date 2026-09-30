/* RobotLearn v6 — Cartesian pose lock + rigid vacuum tool.
   Loaded after robot.js and before app.js. */
(() => {
  const P = window.RobotLearnRobot && window.RobotLearnRobot.prototype;
  if (!P || !window.THREE) return;

  const baseLoadGLB = P._loadGLB;
  P._loadGLB = function(url){
    const sep = url.includes('?') ? '&' : '?';
    return baseLoadGLB.call(this, `${url}${sep}build=6`);
  };

  P._alignTool = function(){};

  P._buildVacuumTool = function(parent){
    const black = this._mat(0x08090a,.18,.50);
    const rubber = this._mat(0x030404,.02,.95);
    const axis = new THREE.Vector3(1,0,0);
    const tool = new THREE.Group();
    parent.add(tool);
    this.toolGroup = tool;
    this.vacuumIndicator = null;

    const mount = this._cylinderAlongAxis(.032,.055,axis,black,tool); mount.position.x=.080;
    const cap = this._cylinderAlongAxis(.026,.042,axis,black,tool); cap.position.x=.127;
    const stem = this._cylinderAlongAxis(.013,.205,axis,black,tool); stem.position.x=.245;
    const lower = this._cylinderAlongAxis(.021,.045,axis,black,tool); lower.position.x=.370;

    const frustum = (r1,r2,len,x) => {
      const m=this._mesh(new THREE.CylinderGeometry(r1,r2,len,28),rubber,tool);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);
      m.position.x=x;
      return m;
    };
    frustum(.027,.021,.020,.398);
    frustum(.032,.024,.020,.419);
    frustum(.037,.028,.020,.440);
    const lip=this._cylinderAlongAxis(.039,.012,axis,rubber,tool); lip.position.x=.456;

    this.toolLength=.463;
    this.toolTip=new THREE.Object3D();
    this.toolTip.position.set(this.toolLength,0,0);
    tool.add(this.toolTip);
  };

  P.getTCPQuaternion = function(){
    this.robotHolder.updateMatrixWorld(true);
    const q=new THREE.Quaternion();
    if(this.toolTip)this.toolTip.getWorldQuaternion(q);
    return q.normalize();
  };

  P._toolAxisWorld = function(){
    return new THREE.Vector3(1,0,0).applyQuaternion(this.getTCPQuaternion()).normalize();
  };

  P._pieceContact = function(tcp){
    if(!this.cell.ready)return null;
    const dir=this._toolAxisWorld();
    let best=null;
    for(const p of this.cell.pieces){
      if(p===this.cell.held||p.userData.removedFromStack)continue;
      this.raycaster.set(tcp,dir);
      this.raycaster.near=0;
      this.raycaster.far=.10;
      const hit=this.raycaster.intersectObject(p,true)[0];
      if(hit&&(!best||hit.distance<best.gap))best={piece:p,point:hit.point.clone(),gap:hit.distance};
    }
    return best;
  };

  P._packageReading = function(tcp){
    if(!this.cell.ready||!this.cell.packageObj)return null;
    const dir=this._toolAxisWorld();
    this.raycaster.set(tcp,dir);
    this.raycaster.near=0;
    this.raycaster.far=2;
    const hit=this.raycaster.intersectObject(this.cell.packageObj,true)[0];
    if(!hit)return null;
    const b=this._box(this.cell.packageObj);
    const e=Math.min(
      Math.abs(hit.point.x-b.min.x),Math.abs(b.max.x-hit.point.x),
      Math.abs(hit.point.y-b.min.y),Math.abs(b.max.y-hit.point.y)
    );
    return {distance:hit.distance,point:hit.point.clone(),edge:e<.050,box:b};
  };

  P._tryPick = function(contact){
    if(!this.vacuumActive||this.cell.held||!contact||contact.gap>.014)return false;
    const p=contact.piece;
    this.toolTip.attach(p);
    p.userData.removedFromStack=true;
    this.cell.held=p;
    return true;
  };

  P._quatError = function(target,current){
    const q=target.clone().multiply(current.clone().invert()).normalize();
    if(q.w<0){q.x*=-1;q.y*=-1;q.z*=-1;q.w*=-1;}
    const w=Math.max(-1,Math.min(1,q.w));
    const angle=2*Math.acos(w);
    const s=Math.sqrt(Math.max(0,1-w*w));
    if(angle<1e-8)return new THREE.Vector3();
    if(s<1e-6)return new THREE.Vector3(q.x,q.y,q.z).multiplyScalar(2);
    return new THREE.Vector3(q.x/s,q.y/s,q.z/s).multiplyScalar(angle);
  };

  P._solve6 = function(A,b){
    const n=6,m=A.map((r,i)=>r.slice().concat([b[i]]));
    for(let c=0;c<n;c++){
      let p=c;
      for(let r=c+1;r<n;r++)if(Math.abs(m[r][c])>Math.abs(m[p][c]))p=r;
      if(Math.abs(m[p][c])<1e-10)return null;
      if(p!==c){const t=m[c];m[c]=m[p];m[p]=t;}
      const d=m[c][c];
      for(let j=c;j<=n;j++)m[c][j]/=d;
      for(let r=0;r<n;r++)if(r!==c){
        const f=m[r][c];
        if(Math.abs(f)<1e-14)continue;
        for(let j=c;j<=n;j++)m[r][j]-=f*m[c][j];
      }
    }
    return m.map(r=>r[n]);
  };

  P.solveIKPose = function(targetMM,targetQuat){
    if(!targetMM||targetMM.length<3||!targetMM.slice(0,3).every(Number.isFinite))throw new Error('Target cartesiano inválido');
    const target=new THREE.Vector3(targetMM[0]/1000,targetMM[1]/1000,targetMM[2]/1000);
    const tq=(targetQuat||this.getTCPQuaternion()).clone().normalize();
    const original=this.angles.slice();
    const orientWeight=.38,lambda=.035;

    for(let iter=0;iter<52;iter++){
      this.robotHolder.updateMatrixWorld(true);
      const pos=this.getTCP(),cq=this.getTCPQuaternion();
      const ep=target.clone().sub(pos),er=this._quatError(tq,cq);
      if(ep.length()<.0006&&er.length()<.0035)break;

      const J=Array.from({length:6},()=>Array(6).fill(0));
      for(let i=0;i<6;i++){
        const jp=new THREE.Vector3();this.jointGroups[i].getWorldPosition(jp);
        const jq=new THREE.Quaternion();this.jointGroups[i].getWorldQuaternion(jq);
        const axis=this.axisLocal[i].clone().applyQuaternion(jq).normalize();
        const jv=new THREE.Vector3().crossVectors(axis,pos.clone().sub(jp));
        J[0][i]=jv.x;J[1][i]=jv.y;J[2][i]=jv.z;
        J[3][i]=axis.x*orientWeight;J[4][i]=axis.y*orientWeight;J[5][i]=axis.z*orientWeight;
      }

      const e=[ep.x,ep.y,ep.z,er.x*orientWeight,er.y*orientWeight,er.z*orientWeight];
      const A=Array.from({length:6},()=>Array(6).fill(0)),b=Array(6).fill(0);
      for(let r=0;r<6;r++){
        for(let c=0;c<6;c++){
          let s=0;for(let k=0;k<6;k++)s+=J[k][r]*J[k][c];
          A[r][c]=s+(r===c?lambda*lambda:0);
        }
        let sb=0;for(let k=0;k<6;k++)sb+=J[k][r]*e[k];b[r]=sb;
      }

      let dq=this._solve6(A,b);
      if(!dq)break;
      const max=Math.max(...dq.map(v=>Math.abs(v)));
      if(max>.10)dq=dq.map(v=>v*.10/max);
      for(let i=0;i<6;i++)this._applyAngle(i,this.angles[i]+dq[i]);
    }

    const result=this.angles.slice();
    const posErr=this.getTCP().distanceTo(target);
    const rotErr=this._quatError(tq,this.getTCPQuaternion()).length();
    original.forEach((a,i)=>this._applyAngle(i,a));

    if(!result.every(Number.isFinite)||!Number.isFinite(posErr+rotErr))throw new Error('La IK 6D produjo un resultado inválido; pose restaurada');
    if(posErr>.003||rotErr>.012)throw new Error(`IK 6D sin solución precisa (${(posErr*1000).toFixed(1)} mm, ${(rotErr*180/Math.PI).toFixed(1)}°)`);
    return result;
  };

  P.beginCartesianJog = function(){
    this.robotHolder.updateMatrixWorld(true);
    this.cartesianOrientation=this.getTCPQuaternion().clone();
    const p=this.getTCPmm();
    this.cartesianTarget=[p.x,p.y,p.z];
    return {position:this.cartesianTarget.slice(),orientation:this.cartesianOrientation.clone()};
  };

  P.endCartesianJog = function(){
    this.cartesianOrientation=null;
    this.cartesianTarget=null;
  };

  P.setToolDownLock = function(active){
    if(active){
      if(!this.cartesianOrientation)this.beginCartesianJog();
    }else this.endCartesianJog();
  };

  P.jogLinearDelta = function(dx,dy,dz){
    const now=this.getTCPmm();
    if(!this.cartesianOrientation||!this.cartesianTarget||Math.hypot(now.x-this.cartesianTarget[0],now.y-this.cartesianTarget[1],now.z-this.cartesianTarget[2])>8){
      this.beginCartesianJog();
    }
    const previous=this.cartesianTarget.slice();
    this.cartesianTarget[0]+=dx;this.cartesianTarget[1]+=dy;this.cartesianTarget[2]+=dz;
    try{
      const angles=this.solveIKPose(this.cartesianTarget,this.cartesianOrientation);
      angles.forEach((a,i)=>this._applyAngle(i,a));
      this._changed();
      return true;
    }catch(err){
      this.cartesianTarget=previous;
      throw err;
    }
  };

  const baseMoveJ=P.moveJ;
  const baseMoveL=P.moveL;

  P.moveJ = async function(targetMM,speedFactor=1){
    this.endCartesianJog();
    return baseMoveJ.call(this,targetMM,speedFactor);
  };

  P.moveL = async function(targetMM,speedFactor=1){
    if(!this.cell.held)return baseMoveL.call(this,targetMM,speedFactor);

    const s=this.getTCPmm();
    const e={x:targetMM[0],y:targetMM[1],z:targetMM[2]};
    const dist=Math.hypot(e.x-s.x,e.y-s.y,e.z-s.z);
    const targetQ=this.getTCPQuaternion().clone();
    const steps=Math.max(8,Math.min(180,Math.ceil(dist/8)));
    const totalMs=Math.max(120,dist/(Math.max(.15,speedFactor)*500)*1000);
    const waitMs=Math.max(0,totalMs/steps);

    for(let k=1;k<=steps;k++){
      const t=k/steps;
      const p=[s.x+(e.x-s.x)*t,s.y+(e.y-s.y)*t,s.z+(e.z-s.z)*t];
      const a=this.solveIKPose(p,targetQ);
      a.forEach((v,i)=>this._applyAngle(i,v));
      this._changed();
      if(waitMs>4)await new Promise(r=>setTimeout(r,waitMs));
      else await new Promise(r=>requestAnimationFrame(r));
    }
  };
})();