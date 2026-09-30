window.RobotLearnRapid = class RobotLearnRapid {
  constructor(robot, io, log){
    this.robot=robot;
    this.io=io;
    this.log=log || console.log;
    this.commands=[];
    this.pointer=0;
    this.running=false;
    this.stopRequested=false;
    this.speedFactor=1;
    this.runToken=0;
  }

  compile(source){
    if(this.running){
      this.stopRequested=true;
      this.runToken++;
      this.log('Cambio de programa solicitado: deteniendo la ejecución actual…','warn');
    }

    this.targets={};
    this.jointTargets={};
    const clean=source.replace(/!.*$/gm,'');

    const rt=/\b(?:CONST|PERS|VAR)\s+robtarget\s+(\w+)\s*:=\s*\[\s*\[([^\]]+)\]/gim;
    let m;
    while((m=rt.exec(clean))){
      const xyz=m[2].split(',').slice(0,3).map(Number);
      if(xyz.length===3 && xyz.every(Number.isFinite)) this.targets[m[1]]=xyz;
    }

    const jt=/\b(?:CONST|PERS|VAR)\s+jointtarget\s+(\w+)\s*:=\s*\[\s*\[([^\]]+)\]/gim;
    while((m=jt.exec(clean))){
      const a=m[2].split(',').slice(0,6).map(Number);
      if(a.length===6 && a.every(Number.isFinite)) this.jointTargets[m[1]]=a;
    }

    const body=clean
      .replace(/\b(?:CONST|PERS|VAR)\s+(?:robtarget|jointtarget|tooldata|wobjdata)[\s\S]*?;/gim,'')
      .split(/\r?\n/)
      .map((line,idx)=>({text:line.trim(),line:idx+1}))
      .filter(x=>x.text && !/^(MODULE|ENDMODULE|PROC\b|ENDPROC|LOCAL\b)/i.test(x.text));

    this.commands=[];
    for(const row of body){
      const s=row.text;
      if(/^MoveJ\b/i.test(s) || /^MoveL\b/i.test(s)){
        const mm=s.match(/^(MoveJ|MoveL)\s+(.+?),\s*(v\d+)/i);
        if(mm) this.commands.push({type:mm[1].toUpperCase(),target:mm[2].trim(),speed:mm[3],line:row.line,raw:s});
        else this.commands.push({type:'ERROR',message:'No pude interpretar el movimiento',line:row.line,raw:s});
      } else if(/^MoveAbsJ\b/i.test(s)){
        const mm=s.match(/^MoveAbsJ\s+(\w+)\s*,\s*(v\d+)/i);
        if(mm) this.commands.push({type:'MOVEABSJ',target:mm[1],speed:mm[2],line:row.line,raw:s});
        else this.commands.push({type:'ERROR',message:'No pude interpretar MoveAbsJ',line:row.line,raw:s});
      } else if(/^WaitTime\b/i.test(s)){
        const mm=s.match(/^WaitTime\s+([\d.]+)/i);
        if(mm) this.commands.push({type:'WAIT',seconds:Number(mm[1]),line:row.line,raw:s});
      } else if(/^WaitDI\b/i.test(s)){
        const mm=s.match(/^WaitDI\s+(\w+)\s*,\s*([01])/i);
        if(mm) this.commands.push({type:'WAITDI',name:mm[1],value:Number(mm[2]),line:row.line,raw:s});
      } else if(/^SetDO\b/i.test(s)){
        const mm=s.match(/^SetDO\s+(\w+)\s*,\s*([01])/i);
        if(mm) this.commands.push({type:'SETDO',name:mm[1],value:Number(mm[2]),line:row.line,raw:s});
      } else if(/^TPWrite\b/i.test(s)){
        const mm=s.match(/^TPWrite\s+"([\s\S]*?)"/i);
        if(mm) this.commands.push({type:'TPWRITE',text:mm[1],line:row.line,raw:s});
      } else {
        this.commands.push({type:'UNSUPPORTED',line:row.line,raw:s});
      }
    }

    this.pointer=0;
    return this.commands;
  }

  _speed(token){
    const n=Number(String(token||'v500').replace(/\D/g,'')) || 500;
    return Math.max(.2,Math.min(2.5,n/500))*this.speedFactor;
  }

  _resolveTarget(expr){
    expr=expr.trim();
    const off=expr.match(/^Offs\(\s*(\w+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/i);
    if(off){
      const b=this.targets[off[1]];
      if(!b) return null;
      const p=[b[0]+Number(off[2]),b[1]+Number(off[3]),b[2]+Number(off[4])];
      return p.every(Number.isFinite)?p:null;
    }
    return this.targets[expr] ? this.targets[expr].slice() : null;
  }

  async _wait(ms,token){
    const end=performance.now()+ms;
    while(performance.now()<end){
      if(this.stopRequested || token!==this.runToken) return false;
      await new Promise(r=>setTimeout(r,Math.max(1,Math.min(50,end-performance.now()))));
    }
    return true;
  }

  async execute(cmd,token=this.runToken){
    if(this.stopRequested || token!==this.runToken) return;
    this.log(`L${cmd.line}: ${cmd.raw}`,'command');

    switch(cmd.type){
      case 'MOVEJ': {
        const p=this._resolveTarget(cmd.target);
        if(!p) throw new Error(`robtarget '${cmd.target}' no encontrado o inválido`);
        await this.robot.moveJ(p,this._speed(cmd.speed));
        break;
      }
      case 'MOVEL': {
        const p=this._resolveTarget(cmd.target);
        if(!p) throw new Error(`robtarget '${cmd.target}' no encontrado o inválido`);
        await this.robot.moveL(p,this._speed(cmd.speed));
        break;
      }
      case 'MOVEABSJ': {
        const a=this.jointTargets[cmd.target];
        if(!a || !a.every(Number.isFinite)) throw new Error(`jointtarget '${cmd.target}' no encontrado o inválido`);
        await this.robot.animateJoints(a.map(x=>x*Math.PI/180),this._speed(cmd.speed));
        break;
      }
      case 'WAIT':
        await this._wait(cmd.seconds*1000/Math.max(.1,this.speedFactor),token);
        break;
      case 'WAITDI':
        this.log(`Esperando ${cmd.name} = ${cmd.value}…`,'wait');
        while(Number(!!this.io.getDI(cmd.name))!==cmd.value){
          if(this.stopRequested || token!==this.runToken) return;
          await new Promise(r=>setTimeout(r,100));
        }
        this.log(`${cmd.name} = ${cmd.value}. Continúo.`,'ok');
        break;
      case 'SETDO':
        this.io.setDO(cmd.name,cmd.value);
        break;
      case 'TPWRITE':
        this.log(`TP: ${cmd.text}`,'tp');
        break;
      case 'UNSUPPORTED':
        this.log(`Aún no implementado: ${cmd.raw}`,'warn');
        break;
      case 'ERROR':
        throw new Error(cmd.message);
    }
  }

  async run(){
    if(this.running){
      this.log('El simulador todavía está terminando la instrucción anterior. Usá Stop o esperá un instante.','warn');
      return;
    }

    const token=++this.runToken;
    this.running=true;
    this.stopRequested=false;
    try{
      while(this.pointer<this.commands.length && !this.stopRequested && token===this.runToken){
        const cmd=this.commands[this.pointer];
        await this.execute(cmd,token);
        if(this.stopRequested || token!==this.runToken) break;
        this.pointer++;
      }
      if(!this.stopRequested && token===this.runToken) this.log('Programa finalizado','ok');
    } catch(err){
      this.log(`ERROR: ${err.message}`,'error');
    } finally {
      if(token===this.runToken || this.stopRequested) this.running=false;
    }
  }

  async step(){
    if(this.running){
      this.log('Todavía hay una instrucción en ejecución.','warn');
      return;
    }
    if(this.pointer>=this.commands.length) return;

    const token=++this.runToken;
    this.running=true;
    this.stopRequested=false;
    try{
      await this.execute(this.commands[this.pointer],token);
      if(!this.stopRequested && token===this.runToken) this.pointer++;
    } catch(err){
      this.log(`ERROR: ${err.message}`,'error');
    } finally {
      this.running=false;
    }
  }

  stop(){
    if(!this.running){
      this.stopRequested=true;
      this.log('Ejecución detenida','warn');
      return;
    }
    this.stopRequested=true;
    this.runToken++;
    this.log('Stop solicitado: la instrucción de movimiento actual terminará y no se ejecutará la siguiente.','warn');
  }

  rewind(){ this.pointer=0; }
};
