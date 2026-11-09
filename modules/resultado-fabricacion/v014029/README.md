# Project Genesis — Resultado de Fabricación V014.029

**Estado de aprobación:** MODIFICACIÓN VISUAL FINAL APROBADA (V014.029). **NINGUNA versión del juego fue aprobada** por esta decisión.

El renderizador y los estilos son independientes y NO se cargan ni se ejecutan desde el juego estable. Esta rama parte de `main` en `010be3f6206c0e340a4fe5c5cc42f7d088c62b81` y NO modifica el `index.html` original.

## Archivos del módulo

- `resultado-fabricacion-v014029.js`: render HTML puro, sin boot del juego, sin consumos de materiales, eventos, guardados, fetch ni efectos sobre inventario.
- `resultado-fabricacion-v014029.css`: CSS extraído literalmente del diseño aprobado, ahora sin etiqueta `<style>`.
- `test-v014029.cjs`: prueba aislada Node para contrato de entrada/salida, canales variables, CSS e integridad del juego estable.

## Contrato de integración futuro (OPT-IN y con respaldo)

En una **rama experimental nueva** creada desde la versión que demuestre funcionar, copiar esta carpeta sin alterar los archivos originales. Sólo después, activar estas referencias en esa rama:

```html
<link rel="stylesheet" href="./modules/resultado-fabricacion/v014029/resultado-fabricacion-v014029.css">
<script src="./modules/resultado-fabricacion/v014029/resultado-fabricacion-v014029.js"></script>
```

En el script donde viven las funciones del motor (por ejemplo, junto a `performCraft`), definir un adaptador que solo pasa valores reales del juego:

```javascript
function renderResultadoV014029(item) {
  const renderer = window.GenesisCraftResultV014029;
  if (!renderer) return renderItemCard(item); // Safe fallback, menu original intacto
  return renderer.render(item, {
    recipes: window.GenesisPrototypeEngines.recipes,
    itemVisual, formulaWeightBreakdown, recipeKind, metricForChannel,
    itemAssetMarkup, AFFINITY_VISUAL, esc
  });
}
```

Recién en el punto de presentación del objeto fabricado, después de `craftedItems.push(item)`, sustituir únicamente la llamada a `renderItemCard(item)` por `renderResultadoV014029(item)`. NO alterar ni duplicar `consumeFormula`, la fabricación, inventario, la misión ni el manejador original de `resultContinue`. Mantener una bandera o fallback para volver al diseño estable.

## Fidelidad y límites

- Conserva estructura original: identidad y materiales a la izquierda, espada aprobada V03/V175/V12B al centro, valores reales de los canales a la derecha.
- El visual aprobado usa el render PNG V175/V12B Cycles HDRI32 suministrado por `itemAssetMarkup`. No confundirlo con visor GLB en vivo.
- La apariencia depende de que se cargue el CSS y el objeto real entregado por la lógica de fabricación; no trae objetos ni estadísticas inventadas.
- La URL de los recursos debe ser relativa al **origen funcional de la copia del juego**, no a un CDN de previsualización improvisado.
- Las diferencias de `main` no están aprobadas automáticamente: sólo queda aprobado este módulo visual para integrar y probar.

## Validación y decisión

Prueba estática local si el entorno está disponible: `node modules/resultado-fabricacion/v014029/test-v014029.cjs`.

Antes de publicar: probar el arranque real, fabricar una espada, mostrar la placa, cerrar con Continuar, comprobar inventario/canales, repetir segunda fabricación y comparar, sin regresión en Preparación ni Mercenario. Inspeccionar capturas reales. Si no funciona, revertir exclusivamente la integración experimental.

**Importante:** no fusionar este módulo automáticamente a `main`; su incorporación final requiere una versión anfitriona funcional y aceptación explícita.
