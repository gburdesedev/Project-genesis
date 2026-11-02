# Inventario del jugador — encabezado idéntico a Preparación
Fecha: 2026-11-02. Estado: corrección técnica en rama, QA visual pendiente.

## Decisión del autor
El encabezado del Inventario se adapta a las pestañas originales de Preparación.
NO modificar Preparación ni el resto de menús, ni redibujar arte.

## Fuente de verdad
- Originales en `assets/ui/preparacion/01_Capas/Pestanas/` y brillo `01_Capas/Efectos/`.
- Controles originales de Preparación en `preparacion_control.js` (SKIN_LAYERS).
- Inventario limpio aprobado: Biblioteca de ChatGPT `/Project Genesis/Art/03_UI/APROBADOS/Jugador/Inventario/INVENTARIO_BASE_LIMPIA_APROBADA_16x9.png`.
- Recortes y manifest: `Genesis_Inventario_Jugador_Kit_Recortes_y_Cabecera_Preparacion_20261102.zip` en la misma carpeta.

## Coordenadas de originales (lienzo Preparación 1536×1024)
| Pestaña | x | y | Ancho | Alto |
|---|---:|---:|---:|---:|
| Inventario | 164 | 42 | 294 | 94 |
| Preparación | 458 | 42 | 320 | 94 |
| Fabricaciones | 778 | 42 | 328 | 94 |
| Comparación | 1106 | 42 | 298 | 94 |

Escalado visual de botones en lienzo de referencia Inventario 1672×941: s=941/1024.
Pestañas de ~270.17, 294.06, 301.41, 273.85 px de ancho; altura común ~86.38 px.
Mantener cada PNG en su proporción natural, sin estirar.

## Cambio de código
Solo `inventario_genesis_16x9.css`: igualar tamaño y proporciones de las cuatro pestañas y usar los cuatro overlay PNG de hover originales. No se cambia el JS, los datos LIVE ni los otros menús.

## QA obligatorio antes de integrar
- Capturas reales en 16:9 comparadas contra Preparación.
- Verificar que el encabezado no se superpone a paneles y que todos los botones funcionan.
- Auditar que los 39 recortes del arte aplanado se usan como referencias **opacas**, no sprites con alfa falsa.
- Verificar que no aparecen valores/nombres/modelos de ejemplo y que la ficha se carga desde el juego.
- **No mergear al main sin QA visual.**
