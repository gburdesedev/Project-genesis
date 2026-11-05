# PROJECT GENESIS — RELEVAMIENTO DE PANTALLAS DEL INVENTARIO
Fecha: 4/11/2026 · Entrega: 9/11/2026 · Rama exclusiva de auditoría. **No modifica main**.

## Contrato
Separar **ARTE APROBADO**, **CÓDIGO INTEGRADO** y **VALIDACIÓN REAL dentro de PlayCanvas**. Un test con datos de prueba o una captura de concept no certifica jugabilidad.
Preservar el arte aprobado original 16:9; no rediseñar, aplastar a 3:2 ni modificar archivos maestros.

## Fuentes aprobadas / referencias
- Inventario: `00_INVENTARIO_MAESTRO_APROBADO_16x9.png` (1672×941; SHA256 c88defd5585c0edfb9ed1fca36ec8aa11d159b205b74ea4efe9818841b81a38c), ORA y `Genesis_Inventario_Aprobado_Manifest.json` en `/Project Genesis/Art/03_UI/APROBADOS/Jugador/Inventario/`.
- Preparación: originales en `assets/ui/preparacion/01_Capas/` (39 capas y sus estados).
- Fabricaciones: se referencia `Genesis_Fabricacion_Aprobada.ora`; verificar original exacto y sus componentes. Comparación/Ficha/Resultado: recuperar los originales aprobados y certificar su procedencia, no sustituir por CSS inventado.
- Mercenario: `Project_Genesis_Mercenario_Concept_Aprobado_V09.png` y especificación `Project_Genesis_Mercenario_Concept_V09_especificacion.md`. No mezclar con pestañas del jugador.

## Matriz de auditoría
| ID | Pantalla | Implementación encontrada | Qué falta para validarla |
|---|---|---|---|
| J01 | Inventario general | `inventario_genesis_16x9.js/css` en main; 20 casillas, familias, filtros, paginación, NGE, ficha. Test UI PASS. | Maestro 1:1 en juego, modelos 360 de creaciones, hover real en casillas; `materialArt` solo define posters de mineral y lingote, faltan recursos visuales de otros materiales aprobados. |
| J02 | Preparación | `preparacion_control.js`, control térmico y 39 capas. Test aislado PASS. | Ejecutar con Ordan en PlayCanvas real, contabilizar consumo, inventario y guardado. |
| J03 | Fabricaciones | `renderWorkspace('Fabricaciones')` lee catálogo, recetas reales, habilitación y `onCraftRecipe`; test aislado PASS. | Recuperar arte final, verificar 3D 360/VFX, 4 PT + indicador global, técnica/conocimiento según mecánica y fabricación de espada/escudo. |
| J04 | Comparación | `renderWorkspace('Comparacion')` compara dos cierres compatibles y canales reales; test aislado PASS. | Arte aprobado, diferencias con números/flechas, ausencias correctas, modelos reales, retorno sin perder estado. |
| J05 | Ficha del objeto | `sheetForItem` + `genInvDetails`, NGE y canales; test overlay aislado PASS. | Ficha artística exacta, objeto real, técnicas (+/− si existen), scroll, 360/VFX; actual overlay elimina `workspaceSheetTabs`. |
| J06 | Resultado de fabricación | `renderResultSkin` actual es **resultado de preparar lingotes**, no prueba del resultado de espada/escudo; `craft()` delega `onCraftRecipe` o `onCraft`. | Recuperar/validar pantalla original de cierre de objeto: rareza, Base+canales, NGE, técnicas aplicables, resultado registrado y paso a inventario. No certificada en main. |
| M01 | Inventario/equipamiento de mercenario | `mercenary_equipment_domain_v001.js` main; interfaz V04 en `feature/mercenary-equipment-runtime-v001` con QA real de equipamiento PASS pero no desplegada/certificada en main. | Comparar con concepto V09, equipar con IDs reales y persistencia, impedir reutilizar equipados, modelos con sockets de espada/escudo; probar completo en juego. |
| M02 | Ficha del mercenario | Overlay `sheet` experimental con callbacks | Datos del mercenario y ficha real, cerrar/volver, no placeholder. |
| M03 | Inventario propio del mercenario | Overlay `inventory`, callback `getMercInventoryHTML` o texto de respaldo | Inventario propio persistente, 2 anillos uno por mano, arma/escudo equipables y otras ranuras visibles/bloqueadas; separación del inventario general. |
| X01 | Expedición, regreso, recompensa | Dependencia obligatoria fuera de estas pantallas; circuito real no certificado | Salir equipado, bloquear durante salida, regresar con resultado, guardar y recuperar el equipo. |

## Reglas de funcionamiento aprobadas
- Pantallas J01–J04: cuatro pestañas visualmente idénticas a Preparación; 16:9 horizontal. J05/J06 son pantallas/estados asociados, no una pestaña inventada.
- Materiales: vista central fija, cantidad real. Creaciones: GLB 360 manual, hover ±45° dentro de casillas sin sobresalir. Sin assets ficticios ni giro erróneo.
- Ocho canales posibles: Base, Luz, Sombra, Fuego, Hielo, Naturaleza, Tierra, Rayo; mostrar solo existentes, Base primero y valores reales; escudos usan protección y espadas daño. Veneno usa Naturaleza. Historia NGE real. La geometría de espada no cambia por rareza.
- Mercenario V09: izquierda familias Espadas/Escudos y casillas; centro personaje 3D y anatomía con dos anillos; derecha comparación con iconos ornamentales, números, scroll independiente, inspección y botón equipar; ficha e inventario separados.

## Evidencia de GitHub Actions, fecha 4/11
- Main Run **41928917545**: PASS `functional_menus.cjs` y `inventario_16x9.cjs` (stock real de fixtures, transición térmica, creación de prueba, comparación, 20 slots y marcos 16:9 1920×1080/1280×720). PASS `approved_mineral.cjs` (GLB y hover).
- MISMO Run **41928917545** terminó FAILURE en `village_render.cjs`: esperaba `Sprint_Loop`, pero observó `Idle_Loop`. No certificar como juego completo estable.
- Pages Run **41928916970** SUCCESS, lo cual solo demuestra despliegue.
- Rama mercenario Run **41630425258**: PASS procedimiento con motor NGE y equipamiento de espada/escudo con IDs reales. Se registraron errores de assets 404 y `SCREENSHOT_DISABLED_FOR_HEADLESS_QA`; falta captura/fidelidad/entrada desde main.

## Prueba obligatoria de aceptación antes de publicar
1. Arrancar Herrero, pasar Ordan y abrir/cerrar las cuatro pestañas sin bloqueo de carga.
2. Inventario vacío = 20 casillas vacías, sin ítems fantasmas; adquirir materiales, filtro y páginas; cantidades/IDs preservados.
3. Preparación mineral→lingote con minijuego y consumo exactamente una vez.
4. Fabricar espada y escudo (según la progresión narrativa), ver **resultado de fabricación** con datos reales, conservar ambos objetos e inspeccionar fichas.
5. Comparar dos creaciones compatibles con ausencia de canales correcta y flechas/números. Inspeccionar 360 y VFX.
6. Mercenario real: escoger dos objetos persistidos, equipar espada+escudo, bloqueo de equipados y visualización en manos; ficha, inventario y retorno.
7. Enviar mercenario equipado a expedición; regresar con resolución y recompensa; persistencia tras recargar.
8. Capturar en navegador real TODAS las pantallas, en PC y teléfono horizontal; aprobar fidelidad al original, sin errores de consola, assets rotos, scroll roto ni GLBs fuera de casilla.

## Prioridades
P0: conectar J01/J02/J03/J06/J04/J05 con M01/X01 y corregir fallo de aldea, sin comprometer arte; completar el circuito fabricacion→equipamiento→expedición.
P1: certificar M02/M03, acabados visuales en 16:9 y optimización móvil; no confundir aprobado con publicado.

**Dictamen:** hay una base comprobada de menús y pruebas aisladas, pero TODAS las pantallas aún no están verificadas en una partida real de principio a fin. No modificar main sin QA, capturas y aprobación del autor.
