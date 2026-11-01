# INVENTARIO — Concepto aprobado y fijo · 16:9

**Estado:** CONCEPTO VISUAL APROBADO; no cambiar arte sin autorización expresa.

**Referencia maestra exacta:** `00_INVENTARIO_MAESTRO_APROBADO_16x9.png` (1672×941), preservada en la Biblioteca de ChatGPT: `/Project Genesis/Art/03_UI/Inventario/`.
**ORA:** `Genesis_Inventario_APROBADO_Editable.ora` en la misma carpeta.
**Paquete de recortes:** `Genesis_Inventario_FINAL_APROBADO_Paquete.zip` en la misma carpeta.

## Reglas inmutables de implementación
- Cuatro pestañas originales de Preparación: Inventario, Preparación, Fabricaciones y Comparación.
- Mismos marcos, bordes y ornamentaciones originales. No reinterpretar el arte.
- Eliminado el botón redundante `IR A FABRICACIONES` del pie; la pestaña superior cumple esa función.
- Secciones: familia a la izquierda, visor grande al centro, panel informativo a la derecha y hasta 20 casillas por página abajo.
- El inventario es LIVE: `ctx.inventory` para materiales y `ctx.getItems()` para creaciones individuales.
- Las familias dependen de los objetos de esa partida, sin categorías inventadas ni subramas de Materiales.
- Materiales: imagen estática en el visor central. Creaciones: visor 3D con rotación 360° y visuales de cada objeto fabricado.
- El panel derecho del objeto fabricado exhibe datos de cierre: rareza y canales con intensidades, y fragmento real de NGE cuando esté disponible.
- `CONSULTAR FICHA DEL OBJETO` solo para creaciones, abre la ficha del objeto seleccionado.
- Casillas vacías si el inventario de la partida está vacío. Nunca renderizar equipamiento, cantidades o técnicas ficticias.
- Prohibido mezclar armas con materiales bajo una familia.
- No incorporar fórmulas secretas, VT ni atributos MU.
- Reemplazo/modificación de arte solamente con autorización expresa del usuario.

## Límite del ORA
La captura aprobada es aplanada. Los recortes del paquete son literales y ayudan a reensamblar, pero pueden contener fondo/texto vecino. Para recursos ejecutables usar las capas originales bajo `assets/ui/preparacion/01_Capas`. No se considerarán sprites limpios hasta validar canales alfa y unión en todas las resoluciones.

## Integración
`inventario_genesis_16x9.js` y `inventario_genesis_16x9.css`; navegación inyectada por `preparacion_control.js`, manteniendo un único origen de datos. Tests: `tests/inventario_16x9.cjs`.
