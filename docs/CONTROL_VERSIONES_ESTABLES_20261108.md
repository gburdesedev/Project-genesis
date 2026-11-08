# Project Genesis — Control de integración y reversión, 08-11-2026

## Regla de publicación
Cada cambio funcional o visual se desarrolla, prueba y registra como una versión independiente: **sin agrupar parches ajenos ni reemplazar los originales**.

Cadena: main verificado → rama experiment/vNNN-cambio → pruebas automáticas y revisión de capturas → PR del único cambio → main después de aprobación → comprobar Pages y recorrido real. Si falla, se mantiene main y se vuelve al checkpoint previo. Ningún PR abierto equivale a una publicación.

## Puntos de retorno inmutables para esta campaña
- **Checkpoint base main:** `checkpoint/main-before-patches-20261108`, commit `381e1b5d1c0c686adc424ec0c0577984b86f692a`.
- **Checkpoint V014.032 candidato:** `checkpoint/v014032-integration-20261108`, commit `f43a27f01aae5b44ce2b1b0e8a3c77697dbbd7f8`. Base del PR #81, todavía no fusionado.
- **Checkpoint recuperación 3D combinada (NO aprobada):** `checkpoint/v014032-world-experimental-20261108`, commit `245a376603ea91223b4bf0c5cbe84313298ef65a`. Investigación PR #82 (borrador). No fusionar directamente: posee fallos en tests de mundo, rendimiento y recorridos.

Estos checkpoints preservan los commits originales. Evitar `force-push` y no modificarlos.

## Versiones independientes previstas
| Versión | Cambio **exclusivo** | Estado |
| --- | --- | --- |
| V014.032 | Corrección de bloqueo de recetas, versionado HUD y caché de pantallas aprobadas | PR #81, candidato; main no modificado |
| V014.033 | Activar 14 árboles (cuatro plaza), con LOD optimizado y colisión de troncos | Rama `experiment/v014033-arboles-20261108`, creada desde checkpoint V014.032; **sin activar todavía** |
| V014.034 | Activar fuente del delfín V011 HQ, ubicación y visibilidad comprobadas | Pendiente; partir de último commit aprobado |
| V014.035 | Montar mercader real V02 en mercado e interacción, sin sustituto de cubos | Pendiente; partir de último commit aprobado |
| V014.036 | Recuperar fachada/puertas de talleres restantes y Arcanista V027, sin bloquear Herrero | Pendiente; partir de último commit aprobado |
| V014.037 | Llegada cinematográfica V016: caminar a Ordan, letterbox, control habilitado al finalizar | Pendiente; contrato matemático aprobado, no prueba final en el juego |
| V014.038 | Acompañamiento cinematográfico de Ordan V014.026 al mercado, compra y retorno a escudos | Pendiente; contrato matemático aprobado, no prueba completa jugable |

Las versiones futuras se numeran consecutivamente **al comenzar cada parche**, y solo se consideran publicadas tras validación funcional. Si una versión no pasa, se corrige esa misma rama; **no avanzar a la siguiente ni cambiar main**.

## Gate mínimo antes de main
1. Sin errores de JavaScript, fallas de GLB ni cargas sin resolver; registrar pesos y fallos concretos de GitHub Actions.
2. Cargar selector → Herrero → intro → Ordan → puerta → taller, no solo renderizar la página.
3. Menús aprobados 16:9 intactos, sin regresar a inventarios o fabricación obsoletos.
4. Conservar los originales y recursos locales aprobados; conservar guardados compatibles.
5. Chrome/Edge y dispositivos móviles; evitar volver al reinicio de carga por exceso de recursos.
6. Capturas reales con Playwright/WebGL y PR con pruebas enlazadas. Aprobación visual del usuario para arte y juego completo.

## Cómo volver atrás
- Si el parche sigue en rama: volver al commit base del checkpoint; main permanece intacto.
- Si ya fue integrado: preferir **revertir el commit/PR de esa versión** en nueva rama, luego pasar el mismo gate; no hacer reset forzado en main.
- Después de revertir: comprobar que Pages quedó en la versión anterior y que las partidas existentes siguen cargando.

## Evidencia actual
- PR #81 abierto y **no fusionado**.
- PR #82 borrador y **no fusionado**. En sus tests se verificaron los 14 puntos de árboles y el mercader V02 cargado (`phase=ready`), pero el juego completo no superó el gate; no tratarlo como versión aprobada.
- El movimiento matemático V016 y el recorrido de Ordan V014.026 pasaron pruebas específicas, pero eso no valida la escena final.
