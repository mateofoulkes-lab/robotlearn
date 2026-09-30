window.RobotLearnCourse = (() => {
  const HOME=`CONST jointtarget jHome := [[0,20,-35,0,35,0],[9E9,9E9,9E9,9E9,9E9,9E9]];`;

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
  ${HOME}
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
  ${HOME}
  CONST robtarget pA := [[1050,300,1350],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget pB := [[850,-450,1100],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ pA,v500,fine,tool0;
    MoveJ pB,v500,fine,tool0;
    MoveJ pA,v500,fine,tool0;
  ENDPROC
ENDMODULE`
    },

    movel: {
      title:'04 · MoveJ vs MoveL',
      code:`MODULE Demo
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
ENDMODULE`
    },

    offs: {
      title:'05 · Aproximación con Offs()',
      code:`MODULE Demo
  ${HOME}
  CONST robtarget pPick := [[1050,250,700],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    TPWrite "Voy al punto de aproximacion";
    MoveJ Offs(pPick,0,0,250),v500,z50,tool0;
    TPWrite "Bajo lineal";
    MoveL pPick,v100,fine,tool0;
    WaitTime 0.3;
    MoveL Offs(pPick,0,0,250),v100,z20,tool0;
    MoveAbsJ jHome,v500,fine,tool0;
  ENDPROC
ENDMODULE`
    },

    io: {
      title:'06 · Sensor + ventosa',
      code:`MODULE Demo
  PROC main()
    TPWrite "Esperando pieza...";
    WaitDI diPieza,1;
    SetDO doVentosa,1;
    TPWrite "Ventosa activada";
    WaitTime 1;
    SetDO doVentosa,0;
  ENDPROC
ENDMODULE`
    },

    pickplace: {
      title:'07 · Pick & Place con ventosa',
      code:`MODULE Demo
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
    TPWrite "Ciclo terminado";
  ENDPROC
ENDMODULE`
    },

    speeds: {
      title:'08 · Misma ruta, distintas velocidades',
      code:`MODULE Demo
  ${HOME}
  CONST robtarget pA := [[1000,-500,1100],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget pB := [[1000,500,1100],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    TPWrite "Rapido";
    MoveJ pA,v1000,fine,tool0;
    MoveJ pB,v1000,fine,tool0;
    TPWrite "Lento";
    MoveJ pA,v100,fine,tool0;
    MoveJ pB,v100,fine,tool0;
  ENDPROC
ENDMODULE`
    },

    heights: {
      title:'09 · Tres alturas con Offs()',
      code:`MODULE Demo
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
ENDMODULE`
    },

    lateral: {
      title:'10 · Barrido lateral',
      code:`MODULE Demo
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
ENDMODULE`
    },

    permission: {
      title:'11 · Esperar permiso de ciclo',
      code:`MODULE Demo
  ${HOME}
  CONST robtarget pTrabajo := [[1200,0,1150],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    TPWrite "Esperando permiso externo";
    WaitDI diPermiso,1;
    TPWrite "Permiso recibido";
    MoveJ pTrabajo,v500,fine,tool0;
    SetDO doOK,1;
  ENDPROC
ENDMODULE`
    },

    inspect: {
      title:'12 · Inspección en cuatro puntos',
      code:`MODULE Demo
  ${HOME}
  CONST robtarget p1 := [[1200,-300,1150],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget p2 := [[1200,300,1150],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget p3 := [[950,300,900],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  CONST robtarget p4 := [[950,-300,900],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    TPWrite "Punto 1";
    MoveJ p1,v400,fine,tool0;
    WaitTime 0.2;
    TPWrite "Punto 2";
    MoveJ p2,v400,fine,tool0;
    WaitTime 0.2;
    TPWrite "Punto 3";
    MoveJ p3,v400,fine,tool0;
    WaitTime 0.2;
    TPWrite "Punto 4";
    MoveJ p4,v400,fine,tool0;
  ENDPROC
ENDMODULE`
    },

    vacuumCycle: {
      title:'13 · Ciclo completo de ventosa',
      code:`MODULE Demo
  ${HOME}
  CONST robtarget pPick := [[1050,250,720],[1,0,0,0],[0,0,0,0],[9E9,9E9,9E9,9E9,9E9,9E9]];
  PROC main()
    MoveAbsJ jHome,v500,fine,tool0;
    MoveJ Offs(pPick,0,0,300),v500,z50,tool0;
    MoveL pPick,v80,fine,tool0;
    SetDO doVentosa,1;
    WaitTime 0.5;
    MoveL Offs(pPick,0,0,300),v120,fine,tool0;
    WaitTime 0.5;
    MoveL pPick,v80,fine,tool0;
    SetDO doVentosa,0;
    MoveL Offs(pPick,0,0,300),v120,fine,tool0;
  ENDPROC
ENDMODULE`
    },

    poseTour: {
      title:'14 · Tour de muñeca',
      code:`MODULE Demo
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
ENDMODULE`
    }
  };

  const lessons = [
    {title:'1. Qué estás programando',example:'hello',html:`<h2>1. Robot, IRC5 y RAPID</h2><p>El <strong>IRB 4600</strong> es el manipulador. El <strong>IRC5</strong> es el controlador. <strong>RobotWare</strong> es el software del controlador y <strong>RAPID</strong> es el lenguaje.</p><div class="callout">RobotLearn imita conceptos y cinemática para aprender. No reemplaza el controlador virtual oficial de ABB.</div><h3>Primer comando</h3><pre>TPWrite "Hola";</pre><p>Escribe texto en el pendant/consola. Cargá el ejemplo y ejecutalo.</p>`},
    {title:'2. Las seis articulaciones',example:'joints',html:`<h2>2. J1 a J6</h2><p>El IRB 4600 tiene seis ejes. J1 gira la base; J2 y J3 posicionan el brazo; J4, J5 y J6 forman la muñeca.</p><p>Probá los sliders debajo del robot. Los límites del simulador corresponden a los rangos documentados del IRB 4600.</p><h3>MoveAbsJ</h3><pre>MoveAbsJ jPose,v500,fine,tool0;</pre><p>Es la forma más directa de ver qué significan los ángulos de cada eje.</p>`},
    {title:'3. MoveJ',example:'movej',html:`<h2>3. MoveJ</h2><p><code>MoveJ</code> manda al robot a una posición buscando un movimiento eficiente de las articulaciones. El TCP no tiene obligación de viajar en línea recta.</p><pre>MoveJ pA,v500,fine,tool0;</pre><ul><li><code>pA</code>: destino.</li><li><code>v500</code>: velocidad.</li><li><code>fine</code>: llegar exactamente.</li><li><code>tool0</code>: herramienta activa para el ejemplo.</li></ul>`},
    {title:'4. MoveL',example:'movel',html:`<h2>4. MoveL</h2><p><code>MoveL</code> intenta mantener al TCP sobre una trayectoria cartesiana recta.</p><pre>MoveL p1,v250,fine,tool0;</pre><p>Ejecutá el ejemplo y observá la diferencia visual entre el desplazamiento articular y el lineal.</p>`},
    {title:'5. robtarget y Offs()',example:'offs',html:`<h2>5. Posiciones y Offs()</h2><p>Un <code>robtarget</code> contiene posición, orientación, configuración y datos de ejes externos. En esta primera versión usamos X/Y/Z para la IK educativa.</p><pre>Offs(pPick,0,0,250)</pre><p>Significa “el mismo punto, desplazado 250 mm en Z”. El ejemplo ahora parte siempre desde Home para que sea repetible y seguro de probar.</p>`},
    {title:'6. Entradas, salidas y ventosa',example:'io',html:`<h2>6. I/O + ventosa</h2><p>El modelo tiene ahora una herramienta de vacío. La salida simulada <code>doVentosa</code> enciende y apaga el indicador de la ventosa.</p><pre>WaitDI diPieza,1;
SetDO doVentosa,1;</pre><p>Ejecutá con <strong>diPieza apagada</strong>. El programa espera. Activala y vas a ver continuar el ciclo.</p>`},
    {title:'7. Pick & Place',example:'pickplace',html:`<h2>7. Primer ciclo de manipulación</h2><p>Acá juntamos sensor, aproximación, MoveL, ventosa, retirada y depósito.</p><div class="callout">Patrón típico: aproximar → entrar lineal → tomar → salir lineal → trasladar → depositar.</div><p>Marcá <strong>diPieza</strong> y ejecutá el ejemplo.</p>`},
    {title:'8. Biblioteca de ejemplos',example:'speeds',html:`<h2>8. Seguí rompiendo cosas… pero acá 😄</h2><p>El selector del Playground ya incluye <strong>14 ejemplos</strong>: velocidades, alturas con Offs, barrido lateral, permisos externos, inspección, ciclo de ventosa y movimientos de muñeca.</p><p>La idea es seguir creciendo esta biblioteca hasta cubrir prácticamente todo el RAPID que te cruces en una célula real.</p><div class="callout">Si una pose no puede resolverse, RobotLearn ahora la rechaza y restaura el estado anterior en vez de contaminar los ejes con valores inválidos.</div>`}
  ];

  return {examples,lessons};
})();
