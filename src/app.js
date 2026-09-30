(() => {
  const $=s=>document.querySelector(s);
  const els={
    viewport:$('#viewport'),variant:$('#variantSelect'),editor:$('#editor'),examples:$('#exampleSelect'),lessonList:$('#lessonList'),lessonContent:$('#lessonContent'),progress:$('#progressText'),joints:$('#jointControls'),
    tcpX:$('#tcpX'),tcpY:$('#tcpY'),tcpZ:$('#tcpZ'),state:$('#robotState'),console:$('#console'),run:$('#runBtn'),step:$('#stepBtn'),stop:$('#stopBtn'),home:$('#homeBtn'),cam:$('#resetCamBtn'),resetCell:$('#resetCellBtn'),
    speed:$('#speedRange'),speedValue:$('#speedValue'),diPieza:$('#diPieza'),diPermiso:$('#diPermiso'),doVentosa:$('#doVentosa'),doOK:$('#doOK'),clear:$('#clearConsole'),error:$('#threeError'),rendererBadge:$('#rendererBadge'),
    tabCourse:$('#tabCourse'),tabExamples:$('#tabExamples'),courseView:$('#courseView'),examplesView:$('#examplesView'),exampleLibrary:$('#exampleLibrary'),exampleCount:$('#exampleCount'),
    ioSobre:$('#ioSobreLateral'),ioVacio:$('#ioVacioOK'),ioDist:$('#ioDistPaquete'),ioBorde:$('#ioBordePaquete'),
    tabAxes:$('#tabAxes'),tabControl:$('#tabControl'),axesPane:$('#axesPane'),controlPane:$('#controlPane'),jogMode:$('#jogMode'),vacuumToggle:$('#vacuumToggle'),controlHint:$('#controlHint'),
    ctlAir:$('#ctlAir'),ctlVacuum:$('#ctlVacuum'),ctlLateral:$('#ctlLateral'),ctlPackage:$('#ctlPackage'),ctlPackageInfo:$('#ctlPackageInfo'),indAir:$('#indAir'),indVacuum:$('#indVacuum'),indLateral:$('#indLateral'),indPackage:$('#indPackage')
  };
  const course=window.RobotLearnCourse,config=window.RobotLearnConfig;
  let robot=null,rapid=null,activeLesson=0,compiledSource='';
  const completed=new Set(JSON.parse(localStorage.getItem('robotlearn-completed')||'[]'));
  const outputs={doVentosa:0,doPinza:0,doOK:0};
  let jogRAF=null,lastJog=0,jogErrorLatched=false;

  function log(text,type=''){
    const time=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}),mark=type==='error'?'✖ ':type==='warn'?'⚠ ':type==='ok'?'✓ ':type==='tp'?'▸ ':'';
    els.console.textContent+=`[${time}] ${mark}${text}\n`;els.console.scrollTop=els.console.scrollHeight;
  }

  function indicator(el,on,edge=false){if(!el)return;el.classList.toggle('on',!!on);el.classList.toggle('edge',!!edge)}
  function updateAirUI(){
    const on=!!outputs.doVentosa;
    if(els.doVentosa){els.doVentosa.textContent=on?1:0;els.doVentosa.style.color=on?'#4ad295':'#98a6b5'}
    if(els.ctlAir)els.ctlAir.textContent=on?'ON':'OFF';indicator(els.indAir,on);
    if(els.vacuumToggle){els.vacuumToggle.textContent=on?'Aire ON':'Aire OFF';els.vacuumToggle.classList.toggle('on',on)}
  }

  const io={
    getDI(name){
      if(name==='diPieza')return els.diPieza.checked;if(name==='diPermiso')return els.diPermiso.checked;
      const s=robot&&robot.getSensors?robot.getSensors():{};
      if(name==='diSobreLateral')return !!s.sobreLateral;if(name==='diVacioOK')return !!s.vacioOK;if(name==='diBordePaquete')return !!s.bordePaquete;
      return false;
    },
    setDO(name,value){
      outputs[name]=value;
      if(name==='doVentosa'||name==='doPinza'){
        outputs.doVentosa=value;outputs.doPinza=value;updateAirUI();
        if(robot&&robot.setVacuumActive)robot.setVacuumActive(!!value);
      }
      if(name==='doOK'&&els.doOK){els.doOK.textContent=value;els.doOK.style.color=value?'#4ad295':'#98a6b5'}
      log(`${name} ← ${value}`,'ok');
    }
  };

  function updateTelemetry(){
    if(!robot)return;const p=robot.getTCPmm();if([p.x,p.y,p.z].every(Number.isFinite)){els.tcpX.textContent=p.x.toFixed(0);els.tcpY.textContent=p.y.toFixed(0);els.tcpZ.textContent=p.z.toFixed(0)}
    const degs=robot.getJointDeg();document.querySelectorAll('.joint').forEach((card,i)=>{const input=card.querySelector('input'),value=card.querySelector('.joint-value');if(Number.isFinite(degs[i])){if(document.activeElement!==input)input.value=degs[i].toFixed(1);value.textContent=`${degs[i].toFixed(1)}°`}});
  }

  function updateSensors(s={}){
    if(els.ioSobre)els.ioSobre.textContent=s.sobreLateral?1:0;if(els.ioVacio)els.ioVacio.textContent=s.vacioOK?1:0;
    if(els.ioDist)els.ioDist.textContent=Number.isFinite(s.laserDistMM)?Math.round(s.laserDistMM):'—';if(els.ioBorde)els.ioBorde.textContent=s.bordePaquete?1:0;
    if(els.ctlVacuum)els.ctlVacuum.textContent=s.vacioOK?'OK':'NO';indicator(els.indVacuum,s.vacioOK);
    if(els.ctlLateral)els.ctlLateral.textContent=s.sobreLateral?'SÍ':'NO';indicator(els.indLateral,s.sobreLateral);
    const pkg=Number.isFinite(s.laserDistMM);
    if(els.ctlPackage)els.ctlPackage.textContent=pkg?`${Math.round(s.laserDistMM)} mm`:'—';
    if(els.ctlPackageInfo){const h=Number.isFinite(s.alturaPaqueteMM)?`altura ${Math.round(s.alturaPaqueteMM)} mm`:'sin lectura';els.ctlPackageInfo.textContent=pkg?(s.bordePaquete?`${h} · BORDE`:`${h} · superficie`):'sin lectura'}
    indicator(els.indPackage,pkg,s.bordePaquete);updateAirUI();
  }

  function buildJointControls(){
    if(!robot)return;els.joints.innerHTML='';robot.config.limitsDeg.forEach(([lo,hi],i)=>{const card=document.createElement('div');card.className='joint';card.innerHTML=`<div class="joint-head"><strong>J${i+1}</strong><span class="joint-value">0°</span></div><input type="range" min="${lo}" max="${hi}" step="0.5" value="0"><div class="joint-head"><small>${lo}°</small><small>${hi}°</small></div>`;const input=card.querySelector('input');input.addEventListener('input',()=>{if(robot.setToolDownLock)robot.setToolDownLock(false);robot.setJointDeg(i,Number(input.value))});els.joints.appendChild(card)});updateTelemetry();
  }

  function setVariant(key){if(!robot)return;robot.setVariant(config.variants[key]);buildJointControls();log(`Robot: ${config.variants[key].label} · alcance ${config.variants[key].reach.toFixed(2)} m · payload ${config.variants[key].payload} kg`,'ok')}
  function codeFor(ex){const ctx=robot&&robot.getCellTargets?robot.getCellTargets():null;return typeof ex.code==='function'?ex.code(ctx):ex.code}
  function loadExample(key){
    const ex=course.examples[key];if(!ex)return;if(rapid&&rapid.running){rapid.stop();log('Deteniendo el ejemplo anterior antes de cargar el nuevo.','warn')}
    els.editor.value=codeFor(ex);compiledSource='';if(rapid)rapid.rewind();els.examples.value=key;log(`Ejemplo cargado: ${ex.title}`);
  }

  function initExamples(){
    els.examples.innerHTML='';els.exampleLibrary.innerHTML='';const entries=Object.entries(course.examples);els.exampleCount.textContent=entries.length;
    entries.forEach(([key,ex])=>{const o=document.createElement('option');o.value=key;o.textContent=ex.title;els.examples.appendChild(o);const b=document.createElement('button');b.className='example-card';b.innerHTML=`<strong>${ex.title}</strong><small>${ex.description||'Cargar en el Playground'}</small>`;b.onclick=()=>{loadExample(key);showExamples(false)};els.exampleLibrary.appendChild(b)});
    els.examples.addEventListener('change',()=>loadExample(els.examples.value));loadExample('hello');
  }

  function showExamples(show){els.examplesView.classList.toggle('hidden',!show);els.courseView.classList.toggle('hidden',show);els.tabExamples.classList.toggle('active',show);els.tabCourse.classList.toggle('active',!show)}
  function showMotionControl(show){els.controlPane.classList.toggle('hidden',!show);els.axesPane.classList.toggle('hidden',show);els.tabControl.classList.toggle('active',show);els.tabAxes.classList.toggle('active',!show)}
  function saveProgress(){localStorage.setItem('robotlearn-completed',JSON.stringify([...completed]));els.progress.textContent=`${completed.size} / ${course.lessons.length}`}
  function showLesson(i){
    activeLesson=i;document.querySelectorAll('.lesson-btn').forEach((b,j)=>b.classList.toggle('active',i===j));const lesson=course.lessons[i];els.lessonContent.innerHTML=lesson.html;
    if(lesson.example){const b=document.createElement('button');b.className='try';b.textContent='Cargar este ejemplo en el Playground';b.onclick=()=>loadExample(lesson.example);els.lessonContent.appendChild(b)}
    const done=document.createElement('button');done.className='try';done.textContent=completed.has(i)?'✓ Lección completada':'Marcar lección como completada';done.onclick=()=>{completed.add(i);saveProgress();renderLessons();showLesson(i)};els.lessonContent.appendChild(done);
  }
  function renderLessons(){els.lessonList.innerHTML='';course.lessons.forEach((lesson,i)=>{const b=document.createElement('button');b.className=`lesson-btn ${i===activeLesson?'active':''} ${completed.has(i)?'done':''}`;b.textContent=lesson.title;b.onclick=()=>showLesson(i);els.lessonList.appendChild(b)});saveProgress()}
  function ensureCompiled(reset=false){if(!rapid)return false;const src=els.editor.value;if(reset||src!==compiledSource){const commands=rapid.compile(src);compiledSource=src;if(reset)rapid.rewind();log(`Compilado: ${commands.length} instrucciones ejecutables`)}return true}
  async function runProgram(){if(!rapid)return;if(rapid.running){log('Todavía hay un movimiento en curso. Esperá o presioná Stop.','warn');return}if(!ensureCompiled(true))return;els.state.textContent='RUN';els.state.style.color='#4ad295';rapid.speedFactor=Number(els.speed.value);await rapid.run();els.state.textContent='Listo';els.state.style.color='';updateTelemetry()}
  async function stepProgram(){if(!rapid||rapid.running)return;if(!ensureCompiled(false))return;els.state.textContent='STEP';rapid.speedFactor=Number(els.speed.value);await rapid.step();els.state.textContent='Listo';updateTelemetry()}

  function resetLevers(){document.querySelectorAll('.jog-lever').forEach((el,i)=>{el.value=0;const out=$(`#leverValue${i}`);if(out)out.textContent='0%'})}
  function updateJogLabels(){
    const mode=els.jogMode.value,labels=mode==='j123'?['J1','J2','J3']:mode==='j456'?['J4','J5','J6']:['X','Y','Z'];
    labels.forEach((x,i)=>{const e=$(`#leverLabel${i}`);if(e)e.textContent=x});
    els.controlHint.textContent=mode==='linear'?'Palancas: X · Y · Z (IK, mm/s)':'Palancas: '+labels.join(' · ');
    resetLevers();if(robot&&robot.setToolDownLock)robot.setToolDownLock(mode==='linear');
  }

  function jogTick(now){
    const levers=[...document.querySelectorAll('.jog-lever')],vals=levers.map(x=>Number(x.value)/100);
    if(!vals.some(v=>Math.abs(v)>.001)){jogRAF=null;lastJog=0;return}
    if(!lastJog)lastJog=now;
    if(now-lastJog<32){jogRAF=requestAnimationFrame(jogTick);return}
    const dt=Math.min(.06,(now-lastJog)/1000);lastJog=now;
    try{
      if(!robot)throw new Error('Robot no disponible');
      const mode=els.jogMode.value;
      if(mode==='linear'){
        if(!robot.jogLinearDelta)throw new Error('El renderer actual no soporta jog lineal');
        const mmps=180;robot.jogLinearDelta(vals[0]*mmps*dt,vals[1]*mmps*dt,vals[2]*mmps*dt);
      }else{
        if(robot.setToolDownLock)robot.setToolDownLock(false);
        const base=mode==='j123'?0:3,degs=robot.getJointDeg(),dps=55;
        for(let i=0;i<3;i++)if(Math.abs(vals[i])>.001)robot.setJointDeg(base+i,degs[base+i]+vals[i]*dps*dt);
      }
      jogErrorLatched=false;updateTelemetry();
    }catch(err){
      if(!jogErrorLatched){log(`Jog: ${err.message}`,'warn');jogErrorLatched=true}resetLevers();jogRAF=null;lastJog=0;return;
    }
    jogRAF=requestAnimationFrame(jogTick);
  }
  function startJog(){if(!jogRAF)jogRAF=requestAnimationFrame(jogTick)}

  function bind(){
    els.variant.addEventListener('change',()=>setVariant(els.variant.value));els.home.addEventListener('click',()=>robot&&robot.setHome());els.cam.addEventListener('click',()=>robot&&robot.resetCamera());els.resetCell.addEventListener('click',()=>{if(robot&&robot.resetCell){robot.resetCell();log('Laterales repuestos en la pila.','ok')}});
    els.run.addEventListener('click',runProgram);els.step.addEventListener('click',stepProgram);els.stop.addEventListener('click',()=>{if(rapid)rapid.stop();els.state.textContent='STOP';els.state.style.color='#ff6b6b'});els.speed.addEventListener('input',()=>els.speedValue.textContent=`${Number(els.speed.value).toFixed(1)}×`);els.clear.addEventListener('click',()=>els.console.textContent='');els.editor.addEventListener('input',()=>compiledSource='');
    els.tabCourse.addEventListener('click',()=>showExamples(false));els.tabExamples.addEventListener('click',()=>showExamples(true));els.tabAxes.addEventListener('click',()=>showMotionControl(false));els.tabControl.addEventListener('click',()=>showMotionControl(true));
    els.jogMode.addEventListener('change',updateJogLabels);els.vacuumToggle.addEventListener('click',()=>io.setDO('doVentosa',outputs.doVentosa?0:1));
    document.querySelectorAll('.jog-lever').forEach((el,i)=>{
      el.addEventListener('input',()=>{const out=$(`#leverValue${i}`);if(out)out.textContent=`${Math.round(Number(el.value))}%`;startJog()});
      el.addEventListener('pointerdown',startJog);
    });
    const release=()=>resetLevers();window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',release);
  }

  try{
    const canUseThree=!!(window.THREE&&window.THREE.OrbitControls&&window.RobotLearnRobot),RendererClass=canUseThree?window.RobotLearnRobot:window.RobotLearnRobotLite;if(!RendererClass)throw new Error('No hay renderizador 3D disponible');
    robot=new RendererClass(els.viewport,config.variants[els.variant.value]);robot.onChange=updateTelemetry;robot.onSensors=updateSensors;robot.onCellReady=()=>{log('Celda cargada: paquete actualizado a 850 mm + pila real de 4 laterales.','ok');updateSensors(robot.getSensors());};rapid=new window.RobotLearnRapid(robot,io,log);buildJointControls();updateTelemetry();updateSensors(robot.getSensors?robot.getSensors():{});
    els.rendererBadge.textContent=canUseThree?'3D · Three.js':'3D · offline';els.rendererBadge.style.color=canUseThree?'#bfe0ff':'#a8f0cf';els.rendererBadge.style.borderColor=canUseThree?'#35536d':'#285b45';if(!canUseThree)log('Renderer Canvas offline: los GLB de la celda requieren Three.js/GLTFLoader.','warn');
  }catch(err){els.error.classList.remove('hidden');els.error.textContent=`No pude iniciar el 3D: ${err.message}`;els.rendererBadge.textContent='3D · error';els.rendererBadge.style.color='#ffaaaa';log(err.message,'error')}

  initExamples();renderLessons();showLesson(0);showExamples(false);showMotionControl(false);bind();updateJogLabels();updateAirUI();log('RobotLearn iniciado. Pila corregida, control manual y sensores activos.','ok');
})();
