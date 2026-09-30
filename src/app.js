(() => {
  const $ = s => document.querySelector(s);
  const els = {
    viewport:$('#viewport'), variant:$('#variantSelect'), editor:$('#editor'), examples:$('#exampleSelect'),
    lessonList:$('#lessonList'), lessonContent:$('#lessonContent'), progress:$('#progressText'), joints:$('#jointControls'),
    tcpX:$('#tcpX'),tcpY:$('#tcpY'),tcpZ:$('#tcpZ'),state:$('#robotState'), console:$('#console'),
    run:$('#runBtn'),step:$('#stepBtn'),stop:$('#stopBtn'),home:$('#homeBtn'),cam:$('#resetCamBtn'),
    speed:$('#speedRange'),speedValue:$('#speedValue'),diPieza:$('#diPieza'),diPermiso:$('#diPermiso'),
    doPinza:$('#doPinza'),doOK:$('#doOK'),clear:$('#clearConsole'),error:$('#threeError']
  };

  const course=window.RobotLearnCourse;
  const config=window.RobotLearnConfig;
  let robot=null, rapid=null, activeLesson=0, compiledSource='';
  const completed=new Set(JSON.parse(localStorage.getItem('robotlearn-completed')||'[]'));

  function log(text,type=''){
    const time=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const mark=type==='error'?'✖ ':type==='warn'?'⚠ ':type==='ok'?'✓ ':type==='tp'?'▸ ':'';
    els.console.textContent += `[${time}] ${mark}${text}\n`;
    els.console.scrollTop=els.console.scrollHeight;
  }

  const outputs={doPinza:0,doOK:0};
  const io={
    getDI(name){ if(name==='diPieza') return els.diPieza.checked; if(name==='diPermiso') return els.diPermiso.checked; return false; },
    setDO(name,value){ outputs[name]=value; const el=name==='doPinza'?els.doPinza:name==='doOK'?els.doOK:null; if(el){el.textContent=value;el.style.color=value?'#4ad295':'#98a6b5';} log(`${name} ← ${value}`,'ok'); }
  };

  function updateTelemetry(){
    if(!robot) return; const p=robot.getTCPmm(); els.tcpX.textContent=p.x.toFixed(0);els.tcpY.textContent=p.y.toFixed(0);els.tcpZ.textContent=p.z.toFixed(0);
    const degs=robot.getJointDeg(); document.querySelectorAll('.joint').forEach((card,i)=>{
      const input=card.querySelector('input'), value=card.querySelector('.joint-value'); if(document.activeElement!==input) input.value=degs[i].toFixed(1); value.textContent=`${degs[i].toFixed(1)}°`;
    });
  }

  function buildJointControls(){
    if(!robot) return; els.joints.innerHTML='';
    robot.config.limitsDeg.forEach(([lo,hi],i)=>{
      const card=document.createElement('div');card.className='joint';
      card.innerHTML=`<div class="joint-head"><strong>J${i+1}</strong><span class="joint-value">0°</span></div><input type="range" min="${lo}" max="${hi}" step="0.5" value="0"><div class="joint-head"><small>${lo}°</small><small>${hi}°</small></div>`;
      const input=card.querySelector('input'); input.addEventListener('input',()=>robot.setJointDeg(i,Number(input.value))); els.joints.appendChild(card);
    }); updateTelemetry();
  }

  function setVariant(key){
    if(!robot) return; robot.setVariant(config.variants[key]); buildJointControls();
    log(`Robot: ${config.variants[key].label} · alcance ${config.variants[key].reach.toFixed(2)} m · payload ${config.variants[key].payload} kg`,'ok');
  }

  function loadExample(key){
    const ex=course.examples[key]; if(!ex) return; els.editor.value=ex.code; compiledSource=''; log(`Ejemplo cargado: ${ex.title}`);
  }

  function initExamples(){
    Object.entries(course.examples).forEach(([key,ex])=>{ const o=document.createElement('option');o.value=key;o.textContent=ex.title;els.examples.appendChild(o); });
    els.examples.addEventListener('change',()=>loadExample(els.examples.value)); loadExample('hello');
  }

  function saveProgress(){ localStorage.setItem('robotlearn-completed',JSON.stringify([...completed])); els.progress.textContent=`${completed.size} / ${course.lessons.length}`; }

  function showLesson(i){
    activeLesson=i; document.querySelectorAll('.lesson-btn').forEach((b,j)=>b.classList.toggle('active',i===j));
    const lesson=course.lessons[i]; els.lessonContent.innerHTML=lesson.html;
    if(lesson.example){
      const btn=document.createElement('button');btn.className='try';btn.textContent='Cargar este ejemplo en el Playground';btn.onclick=()=>{els.examples.value=lesson.example;loadExample(lesson.example);};els.lessonContent.appendChild(btn);
    }
    const done=document.createElement('button');done.className='try';done.textContent=completed.has(i)?'✓ Lección completada':'Marcar lección como completada';
    done.onclick=()=>{completed.add(i);saveProgress();renderLessons();showLesson(i);}; els.lessonContent.appendChild(done);
  }

  function renderLessons(){
    els.lessonList.innerHTML='';course.lessons.forEach((lesson,i)=>{const b=document.createElement('button');b.className=`lesson-btn ${i===activeLesson?'active':''} ${completed.has(i)?'done':''}`;b.textContent=lesson.title;b.onclick=()=>showLesson(i);els.lessonList.appendChild(b);});saveProgress();
  }

  function ensureCompiled(reset=false){
    if(!rapid) return false; const src=els.editor.value;
    if(reset || src!==compiledSource){ const commands=rapid.compile(src); compiledSource=src; if(reset) rapid.rewind(); log(`Compilado: ${commands.length} instrucciones ejecutables`); }
    return true;
  }

  async function runProgram(){
    if(!ensureCompiled(true)) return; els.state.textContent='RUN'; els.state.style.color='#4ad295'; rapid.speedFactor=Number(els.speed.value); await rapid.run(); els.state.textContent='Listo';els.state.style.color='';
  }
  async function stepProgram(){
    if(!ensureCompiled(false)) return; els.state.textContent='STEP'; rapid.speedFactor=Number(els.speed.value); await rapid.step(); els.state.textContent='Listo';
  }

  function bind(){
    els.variant.addEventListener('change',()=>setVariant(els.variant.value));
    els.home.addEventListener('click',()=>robot&&robot.setHome());els.cam.addEventListener('click',()=>robot&&robot.resetCamera());
    els.run.addEventListener('click',runProgram);els.step.addEventListener('click',stepProgram);els.stop.addEventListener('click',()=>{if(rapid)rapid.stop();els.state.textContent='STOP';els.state.style.color='#ff6b6b';});
    els.speed.addEventListener('input',()=>els.speedValue.textContent=`${Number(els.speed.value).toFixed(1)}×`);
    els.clear.addEventListener('click',()=>els.console.textContent='');
    els.editor.addEventListener('input',()=>compiledSource='');
  }

  try{
    robot=new window.RobotLearnRobot(els.viewport,config.variants[els.variant.value]); robot.onChange=updateTelemetry;
    rapid=new window.RobotLearnRapid(robot,io,log); buildJointControls(); updateTelemetry();
  }catch(err){ els.error.classList.remove('hidden'); els.error.textContent=`No pude iniciar el 3D: ${err.message}`; log(err.message,'error'); }

  initExamples();renderLessons();showLesson(0);bind();
  log('RobotLearn iniciado. El simulador usa cinemática IRB 4600 y un parser RAPID educativo.','ok');
})();
