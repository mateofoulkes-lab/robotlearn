# RobotLearn

Curso autocontenido + playground RAPID + simulador 3D educativo para la familia **ABB IRB 4600 / IRC5 (M2004)**.

> RobotLearn no es RobotStudio ni un ABB Virtual Controller y no debe usarse para validar seguridad ni puesta en marcha de una célula real. El objetivo es aprender RAPID, visualizar cinemática y experimentar sin tocar producción.

## Qué tiene la primera versión

- Curso integrado con lecciones y ejemplos cargables.
- Robot 3D procedural de 6 ejes.
- Variantes seleccionables:
  - IRB 4600-60/2.05
  - IRB 4600-45/2.05
  - IRB 4600-40/2.55
  - IRB 4600-20/2.50
- Límites articulares y velocidades máximas según documentación del IRB 4600.
- Jog manual de J1 a J6.
- Telemetría XYZ del TCP.
- Editor RAPID.
- Ejecución completa y paso a paso.
- Consola tipo pendant.
- Entradas y salidas digitales simuladas.
- Soporte inicial para:
  - `TPWrite`
  - `MoveJ`
  - `MoveL`
  - `MoveAbsJ`
  - `Offs()`
  - `WaitTime`
  - `WaitDI`
  - `SetDO`

## Cinemática

El simulador no usa un brazo genérico. Las longitudes y offsets se basan en la documentación pública del IRB 4600 y en descripciones URDF de ROS-Industrial. Para la variante 60/2.05, por ejemplo, la cadena utilizada es:

```text
J1: z = 0.495 m
J2: x = 0.175 m
J3: z = 0.900 m
J4: z = 0.175 m
J5: x = 0.960 m
J6: x = 0.135 m
```

La variante 40/2.55 usa brazo de 1.095 m y antebrazo de 1.270 m; la 20/2.50 usa 1.095 m, 1.2305 m y muñeca de 0.085 m.

Fuentes de referencia:

- ABB Product Specification — IRB 4600 on IRC5, documento 3HAC032885.
- ROS-Industrial / URDF dataset para la topología de la cadena y offsets articulares.

No se incluyen ni redistribuyen modelos CAD oficiales de ABB. La geometría visual actual es procedural.

## Ejecutar

La opción ideal es publicarlo con **GitHub Pages** y abrirlo desde cualquier navegador. No necesita backend.

En esta primera versión Three.js y OrbitControls se cargan desde jsDelivr. El siguiente paso para funcionamiento 100% offline es vendorizar esas dependencias dentro del repositorio.

## Estructura

```text
index.html
styles.css
src/
  config.js   # variantes, límites, velocidades y geometría cinemática
  robot.js    # escena 3D, FK/IK, jogging y animación
  rapid.js    # parser/ejecutor RAPID educativo
  course.js   # lecciones y ejemplos
  app.js      # interfaz y coordinación
```

## Roadmap

- Parser de `VAR`, `PERS`, `CONST` numéricos y booleanos.
- `IF / ELSE / ENDIF`.
- `FOR`, `WHILE`.
- `PROC`, llamadas de procedimientos y `FUNC`.
- `fine`, `z10`, `z50` con blending visible.
- Tool/TCP editable.
- WorkObjects.
- Orientación completa de `robtarget`.
- Configuraciones de brazo/muñeca y singularidades.
- Trayectoria visible y envolvente de trabajo.
- Detección de colisiones educativa.
- Breakpoints y resaltado de línea en ejecución.
- Handshake robot ↔ PLC.
- Más ejemplos y desafíos autocorregibles.
- Dependencias locales para modo completamente offline.

## Filosofía

Cada concepto del curso debería poder **leerlo, modificarlo, ejecutarlo y verlo** en la misma pantalla.
