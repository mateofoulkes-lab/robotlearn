window.RobotLearnCourse = (() => {
  const HOME='CONST jointtarget jHome := [[0,20,-35,0,35,0],[9E9,9E9,9E9,9E9,9E9,9E9]];';
  const rob=(name,p)=>`CONST robtarget ${name} := [[${p.map(n=>Math.round(n)).join(',')}],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];`;
  const fallback={picks:[[1100,920,500],[1100,920,470],[1100,920,440],[1100,920,410]],flanks:[[1150,-450,650],[1150,-1390,650],[1580,-920,650],[720,-920,650]],scan:[[950,-1150,900],[1350,-1150,900],[1350,-700,900],[950,-700,900]],packageTop:[1150,-920,850]};
  const C=ctx=>ctx||fallback;

  const examples={
    hello:{title:'01 · Hola mundo',description:'TPWrite y estructura mínima MODULE / PROC.',code:`MODULE Demo
  PROC main()
    TPWrite "Hola desde RobotLearn";
  ENDPROC
ENDMODULE`},

    joints:{title:'02 · MoveAbsJ y ejes',description:'Mové los seis ejes usando jointtarget.',code:`MODULE Demo
  ${HOME}
  CONST jointtarget jPose := [[35,45,-60,45,25,90],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    TPWrite "Voy por articulaciones";
    MoveAbsJ jPose,v500,fine,tool0;
    WaitTime 0.4;
    MoveAbsJ jHome,v500,fine,tool0;
  ENDPROC
ENDMODULE`},

    movej:{title:'03 · MoveJ entre puntos',description:'Movimiento articular entre dos robtargets.',code:`MODULE Demo
  ${HOME}
  CONST robtarget pA := [[1050,300,1350],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget pB := [[850,-450,1100],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ pA,v500,fine,tool0;
    MoveJ pB,v500,fine,tool0;
    MoveJ pA,v500,fine,tool0;
  ENDPROC
ENDMODULE`},

    movel:{title:'04 · MoveJ vs MoveL',description:'Compará trayectoria articular y trayectoria lineal.',code:`MODULE Demo
  ${HOME}
  CONST robtarget p1 := [[1100,-350,1250],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget p2 := [[1100,350,1250],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    TPWrite "Primero MoveJ";
    MoveJ p1,v500,fine,tool0;
    MoveJ p2,v500,fine,tool0;
    TPWrite "Ahora vuelvo lineal";
    MoveL p1,v250,fine,tool0;
  ENDPROC
ENDMODULE`},

    offs:{title:'05 · Aproximación con Offs()',description:'Aproximar, bajar lineal y retirarse.',code:`MODULE Demo
  ${HOME}
  CONST robtarget pPick := [[1050,250,700],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ Offs(pPick,0,0,250),v500,z50,tool0;
    MoveL pPick,v100,fine,tool0;
    WaitTime 0.3;
    MoveL Offs(pPick,0,0,250),v100,z20,tool0;
    MoveAbsJ jHome,v500,fine,tool0;
  ENDPROC
ENDMODULE`},

    io:{title:'06 · Sensor manual + ventosa',description:'WaitDI, SetDO y una entrada manual.',code:`MODULE Demo
  PROC main()
    TPWrite "Esperando pieza...";
    WaitDI diPieza,1;
    SetDO doVentosa,1;
    TPWrite "Ventosa activada";
    WaitTime 1;
    SetDO doVentosa,0;
  ENDPROC
ENDMODULE`},

    pickplace:{title:'07 · Pick & Place básico',description:'Secuencia completa de aproximación, vacío y depósito.',code:`MODULE Demo
  ${HOME}
  CONST robtarget pPick := [[1050,280,720],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget pPlace := [[850,-500,900],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    WaitDI diPieza,1;
    MoveJ Offs(pPick,0,0,250),v500,z50,tool0;
    MoveL pPick,v100,fine,tool0;
    SetDO doVentosa,1;
    WaitTime 0.3;
    MoveL Offs(pPick,0,0,250),v150,z20,tool0;
    MoveJ Offs(pPlace,0,0,250),v500,z50,tool0;
    MoveL pPlace,v100,fine,tool0;
    SetDO doVentosa,0;
    MoveL Offs(pPlace,0,0,250),v150,z20,tool0;
    SetDO doOK,1;
  ENDPROC
ENDMODULE`},

    speeds:{title:'08 · Distintas velocidades',description:'Misma ruta a v1000 y v100.',code:`MODULE Demo
  ${HOME}
  CONST robtarget pA := [[1000,-500,1100],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget pB := [[1000,500,1100],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ pA,v1000,fine,tool0;
    MoveJ pB,v1000,fine,tool0;
    MoveJ pA,v100,fine,tool0;
    MoveJ pB,v100,fine,tool0;
  ENDPROC
ENDMODULE`},

    heights:{title:'09 · Tres alturas con Offs()',description:'Entendé Z y aproximaciones escalonadas.',code:`MODULE Demo
  ${HOME}
  CONST robtarget pBase := [[850,0,900],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ Offs(pBase,0,0,500),v500,fine,tool0;
    MoveL Offs(pBase,0,0,250),v200,fine,tool0;
    MoveL pBase,v100,fine,tool0;
    MoveL Offs(pBase,0,0,250),v200,fine,tool0;
    MoveL Offs(pBase,0,0,500),v300,fine,tool0;
  ENDPROC
ENDMODULE`},

    lateralSweep:{title:'10 · Barrido lateral',description:'MoveL de izquierda a derecha varias veces.',code:`MODULE Demo
  ${HOME}
  CONST robtarget pIzq := [[900,-450,1000],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget pDer := [[900,450,1000],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ pIzq,v500,fine,tool0;
    MoveL pDer,v200,fine,tool0;
    MoveL pIzq,v200,fine,tool0;
    MoveL pDer,v200,fine,tool0;
  ENDPROC
ENDMODULE`},

    permission:{title:'11 · Esperar permiso externo',description:'Handshake simple mediante diPermiso.',code:`MODULE Demo
  ${HOME}
  CONST robtarget pTrabajo := [[1200,0,1150],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    TPWrite "Esperando permiso externo";
    WaitDI diPermiso,1;
    MoveJ pTrabajo,v500,fine,tool0;
    SetDO doOK,1;
  ENDPROC
ENDMODULE`},

    inspect:{title:'12 · Inspección en cuatro puntos',description:'Recorrido por cuatro posiciones.',code:`MODULE Demo
  ${HOME}
  CONST robtarget p1 := [[1200,-300,1150],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget p2 := [[1200,300,1150],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget p3 := [[950,300,900],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget p4 := [[950,-300,900],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ p1,v400,fine,tool0;
    MoveJ p2,v400,fine,tool0;
    MoveJ p3,v400,fine,tool0;
    MoveJ p4,v400,fine,tool0;
  ENDPROC
ENDMODULE`},

    vacuumCycle:{title:'13 · Ciclo de ventosa',description:'Bajar, generar vacío, levantar y soltar.',code:`MODULE Demo
  ${HOME}
  CONST robtarget pPick := [[1050,250,720],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ Offs(pPick,0,0,300),v500,z50,tool0;
    MoveL pPick,v80,fine,tool0;
    SetDO doVentosa,1;
    WaitTime 0.5;
    MoveL Offs(pPick,0,0,300),v120,fine,tool0;
    MoveL pPick,v80,fine,tool0;
    SetDO doVentosa,0;
    MoveL Offs(pPick,0,0,300),v120,fine,tool0;
  ENDPROC
ENDMODULE`},

    poseTour:{title:'14 · Tour de muñeca',description:'J4, J5 y J6 en varias configuraciones.',code:`MODULE Demo
  ${HOME}
  CONST jointtarget jA := [[0,25,-40,0,35,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST jointtarget jB := [[0,25,-40,90,35,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST jointtarget jC := [[0,25,-40,90,-45,120],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveAbsJ jA,v300,fine,tool0;
    MoveAbsJ jB,v300,fine,tool0;
    MoveAbsJ jC,v300,fine,tool0;
    MoveAbsJ jHome,v500,fine,tool0;
  ENDPROC
ENDMODULE`},

    cellApproach:{title:'15 · CELDA · Ir a la pila',description:'Usa la posición real calculada desde lateral.glb.',code:ctx=>{const c=C(ctx),p=c.picks[0];return `MODULE Demo
  ${HOME}
  ${rob('pLateral',p)}
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ Offs(pLateral,0,0,250),v500,z50,tool0;
    MoveL Offs(pLateral,0,0,80),v150,fine,tool0;
    TPWrite "Estoy sobre la pila";
  ENDPROC
ENDMODULE`;}},

    cellDetect:{title:'16 · CELDA · Detectar lateral',description:'Baja hasta activar diSobreLateral.',code:ctx=>{const c=C(ctx),p=c.picks[0];return `MODULE Demo
  ${HOME}
  ${rob('pLateral',p)}
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ Offs(pLateral,0,0,220),v500,z50,tool0;
    MoveL pLateral,v60,fine,tool0;
    WaitDI diSobreLateral,1;
    TPWrite "Sensor: lateral debajo de la ventosa";
  ENDPROC
ENDMODULE`;}},

    cellPick:{title:'17 · CELDA · Tomar un lateral',description:'diSobreLateral + vacío confirmado + elevación.',code:ctx=>{const c=C(ctx),p=c.picks[0];return `MODULE Demo
  ${HOME}
  ${rob('pLateral',p)}
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ Offs(pLateral,0,0,220),v500,z50,tool0;
    MoveL pLateral,v60,fine,tool0;
    WaitDI diSobreLateral,1;
    SetDO doVentosa,1;
    WaitDI diVacioOK,1;
    TPWrite "Vacio confirmado";
    MoveL Offs(pLateral,0,0,260),v100,fine,tool0;
  ENDPROC
ENDMODULE`;}},

    cellPlace:{title:'18 · CELDA · Lateral al primer flanco',description:'Pick real y depósito sobre un flanco del paquete.',code:ctx=>{const c=C(ctx),p=c.picks[0],q=c.flanks[0];return `MODULE Demo
  ${HOME}
  ${rob('pPick',p)}
  ${rob('pPlace',q)}
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ Offs(pPick,0,0,220),v500,z50,tool0;
    MoveL pPick,v60,fine,tool0;
    WaitDI diSobreLateral,1;
    SetDO doVentosa,1;
    WaitDI diVacioOK,1;
    MoveL Offs(pPick,0,0,260),v100,fine,tool0;
    MoveJ Offs(pPlace,0,0,220),v450,z50,tool0;
    MoveL pPlace,v80,fine,tool0;
    SetDO doVentosa,0;
    MoveL Offs(pPlace,0,0,220),v120,fine,tool0;
  ENDPROC
ENDMODULE`;}},

    cellScan:{title:'19 · CELDA · Escanear paquete',description:'Recorre cuatro puntos; mirá distancia y detección de borde.',code:ctx=>{const c=C(ctx),s=c.scan;return `MODULE Demo
  ${HOME}
  ${rob('pS1',s[0])}
  ${rob('pS2',s[1])}
  ${rob('pS3',s[2])}
  ${rob('pS4',s[3])}
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    TPWrite "Mira AI aiDistPaquete y DI diBordePaquete";
    MoveJ pS1,v350,fine,tool0;
    WaitTime 0.5;
    MoveL pS2,v100,fine,tool0;
    WaitTime 0.5;
    MoveL pS3,v100,fine,tool0;
    WaitTime 0.5;
    MoveL pS4,v100,fine,tool0;
  ENDPROC
ENDMODULE`;}},

    cellFour:{title:'20 · CELDA · Cuatro laterales',description:'Secuencia guiada: toma los 4 laterales y los distribuye en los 4 flancos.',code:ctx=>{const c=C(ctx),ps=c.picks,qs=c.flanks;let defs='',body='';for(let i=0;i<4;i++){defs+=`  ${rob(`pPick${i+1}`,ps[i]||ps[0])}\n  ${rob(`pPlace${i+1}`,qs[i]||qs[0])}\n`;body+=`    TPWrite "Lateral ${i+1}";\n    MoveJ Offs(pPick${i+1},0,0,220),v500,z50,tool0;\n    MoveL pPick${i+1},v60,fine,tool0;\n    WaitDI diSobreLateral,1;\n    SetDO doVentosa,1;\n    WaitDI diVacioOK,1;\n    MoveL Offs(pPick${i+1},0,0,260),v100,fine,tool0;\n    MoveJ Offs(pPlace${i+1},0,0,220),v450,z50,tool0;\n    MoveL pPlace${i+1},v80,fine,tool0;\n    SetDO doVentosa,0;\n    MoveL Offs(pPlace${i+1},0,0,220),v120,fine,tool0;\n`;}
      return `MODULE Demo
  ${HOME}
${defs}  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
${body}    TPWrite "Cuatro laterales procesados";
    SetDO doOK,1;
  ENDPROC
ENDMODULE`;}}
  };

  const lessons=[
    {title:'1. Qué estás programando',example:'hello',html:`<h2>1. Robot, IRC5 y RAPID</h2><p>El <strong>IRB 4600</strong> es el manipulador, el <strong>IRC5</strong> el controlador y <strong>RAPID</strong> el lenguaje.</p><div class="callout">RobotLearn es educativo: sirve para practicar lógica y cinemática, no para validar seguridad de una célula real.</div><h3>Primer comando</h3><pre>TPWrite "Hola";</pre>`},
    {title:'2. Las seis articulaciones',example:'joints',html:`<h2>2. J1 a J6</h2><p>J1 gira la base; J2 y J3 posicionan el brazo; J4, J5 y J6 forman la muñeca. Probá los sliders debajo del robot.</p><pre>MoveAbsJ jPose,v500,fine,tool0;</pre>`},
    {title:'3. MoveJ',example:'movej',html:`<h2>3. MoveJ</h2><p>Movimiento articular hacia un objetivo. El TCP no tiene obligación de viajar recto.</p><pre>MoveJ pA,v500,fine,tool0;</pre>`},
    {title:'4. MoveL',example:'movel',html:`<h2>4. MoveL</h2><p><code>MoveL</code> intenta mantener una trayectoria cartesiana recta.</p><pre>MoveL p1,v250,fine,tool0;</pre>`},
    {title:'5. robtarget y Offs()',example:'offs',html:`<h2>5. Posiciones y Offs()</h2><p><code>Offs(pPick,0,0,250)</code> crea un punto desplazado 250 mm en Z: perfecto para aproximaciones.</p>`},
    {title:'6. Entradas, salidas y vacío',example:'io',html:`<h2>6. I/O</h2><p><code>WaitDI</code> espera una entrada y <code>SetDO</code> cambia una salida. En la celda nueva también existen <code>diSobreLateral</code>, <code>diVacioOK</code> y <code>diBordePaquete</code>.</p>`},
    {title:'7. Celda de laterales',example:'cellPick',html:`<h2>7. Tu celda</h2><p><strong>paquete.glb</strong> se escala para medir 850 mm de ancho. Al otro lado del robot hay cuatro laterales individuales reconstruidos con la proporción de <strong>lateral.glb</strong> y la referencia de <strong>laterales.glb</strong>.</p><div class="callout">La ventosa puede agarrar un lateral cuando está sobre él y el vacío encuentra una superficie. El lateral queda unido a la herramienta hasta apagar <code>doVentosa</code>.</div>`},
    {title:'8. Biblioteca de ejemplos',example:'cellFour',html:`<h2>8. Ejemplos</h2><p>Ahora la biblioteca no está escondida en este texto: arriba de este panel tenés una pestaña <strong>Ejemplos</strong> con todos los programas cargables.</p><p>Hay ejemplos básicos, sensores y una primera secuencia guiada para procesar los cuatro laterales.</p><div class="callout">La rotación/orientación cartesiana completa de los laterales será el siguiente salto: por ahora el simulador resuelve posición XYZ y permite practicar la secuencia física de pick, vacío, transporte y depósito.</div>`}
  ];

  return {examples,lessons};
})();
