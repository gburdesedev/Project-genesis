# Project Genesis — Integración UI aprobada · 2026-11-08

## Arte visual congelado
Los tres archivos originales se incorporaron **byte por byte**, sin recreación, sin pérdida y sin modificar su diseño:

| Pantalla | Archivo de ejecución | SHA-256 |
|---|---|---|
| Preparación | `assets/ui/approved/Preparacion_APROBADA_1672x941.png` | `dabe6157e8c4c26fb1785ae94b494cae4e073f7448ca460f65515880e650dd77` |
| Fabricaciones V07 | `assets/ui/approved/Fabricaciones_V07_APROBADA_1672x941.png` | `55464a0de649f538700101d110504fe2f66afbf875288af2e484dd875a4bcb7f` |
| Inventario V11 | `assets/ui/approved/Inventario_V11_APROBADO_1672x941.png` | `e2e70033efaa8a20a3ab8b3ea332228831bedfa6a6a99e8d442220e17408d2e9` |

## Runtime
- `genesis_ui_approved.js` y `.css`: overlays de interacción y datos reales sobre los PNG originales de 1672×941.
- `preparacion_control.js`: carga diferida de la nueva interfaz con fallback al menú anterior si falla.
- Inventario: familias, 20 casillas, selección, modelo/imagen dinámica y ficha de canales separada.
- Preparación: stock real, selección de materiales, cantidad de tanda y botón que conserva el minijuego existente.
- Fabricaciones: selección de recetas conocidas, materiales reales, disponibilidad y llamada a `onCraftRecipe` del motor actual.
- **Resultado de fabricación**: se mantiene la última pantalla funcional del motor, `renderItemCard(item)`, que recibe el objeto efectivamente fabricado. Su **arte visual no está aprobado**; no se reutiliza el concepto descartado que incluía Veneno y otros efectos ficticios.
- **Comparación**: queda en su implementación anterior; pendiente de arte definitivo.

## Validación y límites
- Playwright: tres fondos exactos por SHA-256, 16:9, navegación, 20 casillas, ficha, selección de receta, callback real de fabricación y capturas a 1600×900 / 1280×720.
- QA sobre fixture controlado; **no equivale a partida completa jugada en PlayCanvas**.
- Los cambios se trasladaron por archivos individuales, **sin merge masivo** de ramas experimentales.
- No se alteran los ORA originales aprobados ni la lógica procedural, inventario general, mercenario o guardado.
- La selección de familia y receta usa capas runtime sobre arte estático aprobado. Los cambios de estado no modifican el PNG original.
