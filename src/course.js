window.RobotLearnCourse = (() => {
  const examples = {
    hello: {
      title:'01 · Hola mundo',
      code:`MODULE Demo
  PROC main()
    TPWrite "Hola desde RobotLearn";
  ENDPROC
ENDMODULE`
    },
    joints: {
      title:'02 · MoveAbsJ y ejes',
      code:`MODULE Demo
  CONST jointtarget jHome := [[0,20,-35,0,35,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST jointtarget jPose := [[35,45,-60,45,25,90],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    TPWrite "Voy por articulaciones";
    MoveAbsJ jPose,v500,fine,tool0;
    WaitTime 0.4;
    MoveAbsJ jHome,v500,fine,tool0;
  ENDPROC
ENDMODULE`
    },
    movej: {
      title:'03 · MoveJ entre puntos',
      code:`MODULE Demo
  CONST robtarget pA := [[1050,300,1350],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget pB := [[850,-450,1100],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveJ pA,v500,fine,tool0;
    MoveJ pB,v500,fine,tool0;
    MoveJ pA,v500,fine,tool0;
  ENDPROC
ENDMODULE`
    },
    movel: {
      title:'04 · MoveJ vs MoveL',
      code:`MODULE Demo
  CONST robtarget p1 := [[1100,-350,1250],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget p2 := [[1100,350,1250],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    TPWrite "Primero MoveJ";
    MoveJ p1,v500,fine,tool0;
    MoveJ p2,v500,fine,tool0;
    TPWrite "Ahora vuelvo lineal";
    MoveL p1,v250,fine,tool0;
  ENDPROC
ENDMODULE`
    },
    offs: {
      title:'05 · Aproximación con Offs()',
      code:`MODULE Demo
  CONST robtarget pPick := [[1050,250,700],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveJ Offs(pPick,0,0,250),v500,z50,tool0;
    MoveL pPick,v100,fine,tool0;
    WaitTime 0.3;
    MoveL Offs(pPick,0,0,250),v100,z20,tool0;
  ENDPROC
ENDMODULE`
    },
    io: {
      title:'06 · Esperar sensor + salida',
      code:`MODULE Demo
  PROC main()
    TPWrite "Esperando pieza...";
    WaitDI diPieza,1;
    SetDO doPinza,1;
    TPWrite "Pieza agarrada";
    WaitTime 1;
    SetDO doPinza,0;
  ENDPROC
ENDMODULE`
    },
    pickplace: {
      title:'07 · Pick & Place',
      code:`MODULE Demo
  CONST robtarget pPick := [[1050,280,720],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget pPlace := [[850,-500,900],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    WaitDI diPieza,1;
    MoveJ Offs(pPick,0,0,250),v500,z50,tool0;
    MoveL pPick,v100,fine,tool0;
    SetDO doPinza,1;
    WaitTime 0.3;
    MoveL Offs(pPick,0,0,250),v150,z20,tool0;
    MoveJ Offs(pPlace,0,0,250),v500,z50,tool0;
    MoveL pPlace,v100,fine,tool0;
    SetDO doPinza,0;
    MoveL Offs(pPlace,0,0,250),v150,z20,tool0;
    SetDO doOK,1;
    TPWrite "Ciclo terminado";
  ENDPROC
ENDMODULE`
    }
  };

  const lessons = [
    {title:'1. Qué estás programando',example:'hello',html:`<h2>1. Robot, IRC5 y RAPID</h2><p>El <strong>IRB 4600</strong> es el manipulador. El <strong>IRC5</strong> es el controlador. <strong>RobotWare</strong> es el software del controlador y <strong>RAPID</strong> es el lenguaje.</p><div class="callout">RobotLearn imita conceptos y cinemática para aprender. No reemplaza el controlador virtual oficial de ABB.</div><h3>Primer comando</h3><pre>TPWrite "Hola";</pre><p>Escribe texto en el pendant/consola. Cargá el ejemplo y ejecutalo.</p>`},
    {title:'2. Las seis articulaciones',example:'joints',html:`<h2>2. J1 a J6</h2><p>El IRB 4600 tiene seis ejes. J1 gira la base; J2 y J3 posicionan el brazo; J4, J5 y J6 forman la muñeca.</p><p>Probá los sliders debajo del robot. Los límites del simulador corresponden a los rangos documentados del IRB 4600.</p><h3>MoveAbsJ</h3><pre>MoveAbsJ jPose,v500,fine,tool0;</pre><p>Es la forma más directa de ver qué significan los ángulos de cada eje.</p>`},
    {title:'3. MoveJ',example:'movej',html:`<h2>3. MoveJ</h2><p><code>MoveJ</code> manda al robot a una posición buscando un movimiento eficiente de las articulaciones. El TCP no tiene obligación de viajar en línea recta.</p><pre>MoveJ pA,v500,fine,tool0;</pre><ul><li><code>pA</code>: destino.</li><li><code>v500</code>: velocidad.</li><li><code>fine</code>: llegar exactamente.</li><li><code>tool0</code>: herramienta.</li></ul>`},
    {title:'4. MoveL',example:'movel',html:`<h2>4. MoveL</h2><p><code>MoveL</code> intenta mantener al TCP sobre una trayectoria cartesiana recta.</p><pre>MoveL p1,v250,fine,tool0;</pre><p>Ejecutá el ejemplo y observá la diferencia visual entre el desplazamiento articular y el lineal.</p>`},
    {title:'5. robtarget y Offs()',example:'offs',html:`<h2>5. Posiciones y Offs()</h2><p>Un <code>robtarget</code> contiene posición, orientación, configuración y datos de ejes externos. En esta primera versión usamos X/Y/Z para la IK educativa.</p><pre>Offs(pPick,0,0,250)</pre><p>Significa “el mismo punto, desplazado 250 mm en Z”. Es ideal para aproximación y retirada.</p>`},
    {title:'6. Entradas y salidas',example:'io',html:`<h2>6. I/O</h2><p>Los robots industriales viven hablando con sensores, PLC, válvulas y otras máquinas.</p><pre>WaitDI diPieza,1;
SetDO doPinza,1;</pre><p>Ejecutá el ejemplo con <strong>diPieza apagada</strong>. El programa quedará esperando. Luego activala en el panel I/O.</p>`},
    {title:'7. Pick & Place',example:'pickplace',html:`<h2>7. Primer ciclo</h2><p>Acá juntamos sensor, aproximación, MoveL, pinza, retirada y depósito.</p><div class="callout">Este patrón —aproximar → entrar lineal → actuar → salir lineal— aparece constantemente en automatización real.</div><p>Marcá <strong>diPieza</strong> y ejecutá el ejemplo.</p>`},
    {title:'8. Próximamente',example:null,html:`<h2>8. Siguiente nivel</h2><p>La arquitectura ya está preparada para crecer. Próximos bloques:</p><ul><li><code>IF / ELSE</code></li><li><code>FOR</code> y <code>WHILE</code></li><li>variables <code>VAR / PERS / CONST</code></li><li>procedimientos y funciones</li><li>zonas <code>z10/z50</code></li><li>Tool/TCP y WorkObject</li><li>orientación completa de robtargets</li><li>breakpoints y ejecución por línea</li><li>colisiones y envolvente de trabajo</li><li>handshake robot ↔ PLC</li></ul><p>La meta es que el curso y el simulador sean la misma cosa: leer, tocar, ejecutar y ver.</p>`}
  ];

  return {examples,lessons};
})();
