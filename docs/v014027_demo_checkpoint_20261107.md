# Project Genesis — Punto de control de la demo V014.027
**Fecha:** 2026-11-07 (Argentina)  
**Estado:** rama experimental, NO aprobada ni publicada a main.

## Base inmutable
- Código y assets de referencia: `experiment/v014026-ordan-walk-bind-20261106`, commit `9bcd21bfb0a311f5601b35167f73393ba9fb0ebf`.
- Ensayo de Ordan, primera espada, segunda espada, diálogo, cinemática Walk_Loop y mercado: Actions #42323384522 **SUCCESS**, alcanzó paso 12; no demuestra el final.
- Main al comienzo del ensayo: `28a99685858993c097564135c872820e64bc8145`. No mezclar con main ni alterar los originales sin revisión.

## Prueba funcional objetivo
Reproducir el recorrido real del Herrero, sin forzar `tutorialStep`, `px/pz`, inventario, semillas, colisiones, motor ni teleport:
1. Selección de Herrero, carga estable, pasos 0–9 y acceso al taller.
2. Fabrica Espada I y Espada II; comparación, Ordan y cinemática guiada hacia mercader.
3. Compra exactamente las necesidades reales de dos escudos de la semilla.
4. Vuelve físicamente por los puntos del camino original de Ordan, con teclas WASD reales, evitando tratar al mercader como objetivo de la estación.
5. Fabrica Escudo I y Escudo II en la fragua real, verifica cuatro objetos y comparación.
6. Selecciona guerrero de los tres candidatos, equipa una espada y un escudo realmente fabricados en su inventario 16:9.
7. Abre dossier del guerrero, inicia expedición, observa su salida y regreso.
8. Recoge muestra, verifica bloqueo de conocimiento, consulta Ordan, identifica muestra.
9. Fabrica Espada III usando la muestra, comprueba quinto objeto, llega a pantalla visible `CICLO COMPLETADO`.

## Hallazgos registrados
- La prueba pura de 1.024 semillas (Actions #42241090604 y core V014.027) pasa lógica de espadas, compras, escudos, NGE y slots de mercenario; **NO** es garantía del navegador.
- Primera prueba extendida V014.027 Actions #42364656797: FAILED en paso 12. El helper E2E regresó `marketMerchant` aunque el objetivo era `craft` y abrió el menú de compra, no fabricación. Ese fallo es específico del procedimiento de navegación de prueba. Se resolvió a nivel del helper aceptando únicamente el interactuable correcto y añadiendo retorno físico por ruta.
- La fuente del juego sí contiene pasos 14–24 y botones originales para mercenario, misión, muestra, tercera espada y cierre. Su funcionamiento conjunto debe verificarse en navegador.
- Se preservan animaciones y GLB existentes. El renderer de la prueba CI reduce sólo resolución/sombras durante test por SwiftShader; no cambia escena/colisiones.
- En rama separada `experiment/v014027-inventory-viewer-fit-20261107`: corrección mínima de encuadre del póster fallback de materiales, aprobada por test real de inventario original 16:9 Actions #42364780450, **sin fusionar**. La prueba de inventario emplea fixtures para las creaciones y por sí sola no certifica render GLB final.

## Ramas y resultados
- `experiment/v014027-demo-full-e2e-20261107`: pruebas reales `tests/v014027_demo_full_e2e.cjs`, workflow `.github/workflows/v014027-demo-full-e2e.yml`, evidencia `previews/v014027-demo-full-e2e/`.
- `experiment/v014027-inventory-viewer-fit-20261107`: ajuste del fallback, UI real aprobada #42364780450.
- **Criterio de aprobado:** captura real final con 5 creaciones y UI `CICLO COMPLETADO`, sin recarga ni errores, efectos no bloqueantes y validación visual del usuario. Ninguna rama se fusiona a main automáticamente.
