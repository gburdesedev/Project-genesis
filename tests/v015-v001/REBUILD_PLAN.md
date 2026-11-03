# Project Genesis v0.15 V001 — reconstrucción incremental del Canvas existente

## Base canónica

Reutilizar el `index.html` de Project Genesis y sus componentes de PlayCanvas. El mercado existente (`genesis_market_v001.js`) ya importa `playcanvas` como módulo y usa la lógica `genesis_market_domain_v001.js`. **No sustituir la aplicación por la prueba HTML aislada** ni introducir otro sistema de cámara, movimiento, animaciones o interacciones.

## Único cambio de arquitectura

1. Cargar primero los pisos reales y crear sus colisiones; no habilitar spawn hasta que exista suelo transitable.
2. Cargar en segundo lugar los personajes (artesano, Ordan cuerpo+barba, comerciante V02, mercenario), usando solo archivos versionados en el repositorio.
3. Mantener progreso por archivo con bytes recibidos / tamaño real, sin `Promise.all` que bloquee el mundo completo. Timeout solo tras 120 segundos sin datos.
4. Activar las mecánicas existentes únicamente cuando los recursos imprescindibles estén listos.
5. Mantener decoraciones y recursos no esenciales fuera de V001.

## Estado de los prototipos

`tests/v015-v001/index.html` es un diagnóstico de descargas, y `tests/v015-v001/playcanvas-v001.html` es un prototipo aislado que **no representa el rebuild canónico**. No publicarlos como la versión jugable ni fusionarlos en main. El rebuild real debe modificar el flujo de arranque del Canvas anterior.

## Criterios de aceptación

- Misma cámara y controles del juego anterior.
- Suelo real, colisiones y aparición de cuatro personajes.
- GLB propios; sin referencias externas en tiempo de ejecución.
- Barra de progreso por archivo con bytes transferidos, carga y parseo diferenciados.
- Ningún reinicio de toda la escena al seleccionar Herrero.
- Prueba real en navegador antes de publicar en main.
