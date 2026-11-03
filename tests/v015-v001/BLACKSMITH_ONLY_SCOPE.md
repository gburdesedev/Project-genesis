# Project Genesis v0.15 V001 — Herrero exclusivamente

Decisión aprobada el 3 de noviembre de 2026.

## Única rama jugable

Reutilizar exclusivamente la ruta Herrero del Canvas anterior y la lógica de sus quests que efectivamente funcionaba. Mantener movimiento, cámara, interacción, inventario/preparación/fabricación y objetivos relacionados con Herrero cuando existan y estén validados. No inventar nuevas quests ni reescribir el motor de fabricación.

## Curtidor: prohibición de invocación y carga

En el arranque V001 no debe importarse, invocarse, instanciarse ni descargarse ningún componente específico del Curtidor: modelos, mentor, cofres, materiales, animaciones, lógica de quests, menús o inicializadores. No basta con ocultar sus elementos en pantalla: eliminar su participación en el grafo de arranque, incluso rutas diferidas, y verificar con el registro de red y ejecución que no haya solicitudes ni inicializaciones.

## Construcción del mundo

1. Piso y colisiones, antes de habilitar spawn.
2. Cuatro personajes: artesano, Ordan, comerciante, mercenario. Modelos únicamente locales.
3. Restaurar la rama Herrero y su secuencia de quests funcionales desde la versión histórica.
4. Reconstruir arquitectura y decoración por grupos posteriores, sin bloquear el arranque V001.

## Validación obligatoria

- Registro de solicitudes de red: cero assets específicos del Curtidor y cero GLB externos.
- Seleccionar Herrero no reinicia ni duplica descargas.
- Quests del Herrero reutilizadas y probadas una por una.
- Progreso por archivo en KiB descargados/tamaño total y estado de procesamiento.
- No integrar en main hasta probar la rama en navegador.

Los prototipos aislados en tests/v015-v001 NO sustituyen al Canvas existente. La implementación canónica debe adaptar el grafo de inicialización del juego anterior.
