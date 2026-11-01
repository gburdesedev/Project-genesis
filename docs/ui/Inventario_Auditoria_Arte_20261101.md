# Project Genesis — Inventario General: auditoría del arte aprobado (2026-11-01)

Estado: **AUDITADO; integración visual pendiente**. No equivale a implementación final ni a validación LIVE.

## Fuentes de verdad
- Biblioteca del usuario: `/Project Genesis/Art/03_UI/Inventario/00_INVENTARIO_MAESTRO_APROBADO_16x9.png`, 1672 × 941.
- `Genesis_Inventario_Aprobado_Manifest.json`: coordenadas de regiones, ornamentaciones y controles.
- `Genesis_Inventario_APROBADO_Editable.ora` y `Genesis_Inventario_FINAL_APROBADO_Paquete.zip`.
- El árbol contiene el arte **de Preparación** en `assets/ui/preparacion/01_Capas/`; reutilizarlo sin reinterpretarlo.

## Confirmaciones sobre el código
- PR #17, merge commit `d57bab312c8bec4aa7d91b886c34e5b4e4859fdf`.
- `inventario_genesis_16x9.js`: material real desde `ctx.inventory`; creaciones individuales desde `ctx.getItems()`; filtro, páginas de 20, selección; ficha con `nav.sheetForItem`; poster para dos materiales.
- `inventario_genesis_16x9.css`: reutiliza fondos, pestañas, casillas y botón de Preparación, pero combina marcos con CSS y barras de canales textuales.
- `preparacion_control.js`: delega el visor de creaciones a `ctx.renderAsset(item)`. El código del inventario no garantiza que el retorno sea GLB 360°.
- `tests/inventario_16x9.cjs`: hace capturas de prueba con datos ficticios **solo dentro del test**. El mock de espada devuelve texto en un div, no un GLB. No usar su captura para afirmar que el visor real está validado.

## Comparación visual de la referencia y captura del PR #17
Capturas del workflow `Inventory 16:9 visual preview`, run `41263778854`, artifact `inventory-16x9-browser-captures` (PR #17, SHA `def3d0f78ed20b741181c8c69632096ae7c5c748`).

Diferencias verificadas:
1. El logo «PROJECT GENESIS» del extremo izquierdo de la cabecera no aparece en la captura del test.
2. Proporciones y ornamentaciones de la cabecera y paneles no son una reproducción 1:1 del master.
3. Las barras de canales se presentan como filas planas de texto, no como las ornamentaciones de Resultado de Fabricación.
4. Los iconos de familia son glifos tipográficos, no sprites del arte aprobado.
5. La captura de espada muestra texto en el visor y no un GLB **porque el test entrega ese mock**; no prueba el estado real de una partida.
6. La ficha reutiliza `sheetForItem`; no valida aún que incluya 3D real, barras y controles de técnicas del arte aprobado.
7. El nombre aparece en el visor, pero la ficha lateral del test no lo repite como campo «Nombre».

## Auditoría de recortes
Se inspeccionaron **45 imágenes** de `data/ornamentos_extraidos` dentro del ORA maestro. **45/45 tienen alfa 255 en toda el área**. No son capas transparentes genuinas: conservan fondo y posibles píxeles vecinos. Se prohíbe integrarlas como sprites alpha limpios o afirmar que son recursos de producción.

`Genesis_Inventario_LIVE_Arte_Aprobado.zip` contiene una plantilla visible con el botón «IR A FABRICACIONES» integrado y elementos estáticos; esa plantilla no puede adoptarse sin intervención porque contradice la decisión aprobada de eliminar dicho botón.

## Contrato de implementación pendiente
- Conservación absoluta del master; resolver ornamentaciones desde fuentes originales transparentes o composición no destructiva con PNG de Preparación.
- Integrar logo aprobado y cabecera con coordenadas del manifiesto.
- Paneles: mismos bordes, rombos, líneas y casillas del master; escalado uniforme 16:9.
- Asegurar GLB 360° en partida real; materiales fijos. Si falta modelo real, registrar la ausencia.
- Canales: solo existentes, Base primero, resto en orden de fabricación; sin cifras inventadas. Barras/icónicos y técnicas de la ficha aprobada; scroll interior.
- NGE/ficha: datos cerrados del objeto, mayor espacio narrativo, botón «Cerrar», sin exposición de fórmulas internas.
- No mezclar inventario general con mercenario.
- Agregar tests que verifiquen recursos cargados, alfa, proporciones respecto al manifiesto y 360° con objeto real; conservar tests de los otros menús.

## CI y límites de las pruebas previas
- El workflow independiente de Inventario del PR #17 terminó en éxito.
- El workflow general `Responsive game UI` del mismo PR falló en `tests/village_render.cjs`, después de pasar `tests/inventario_16x9.cjs`. Es un fallo de integración general a investigar por separado; no atribuirlo automáticamente al Inventario.
- Esta auditoría es **solo lectura** y no modifica la UI en producción. Ningún cambio de arte aprobado ha sido publicado.
