# Project Genesis V014.030 — Resultado de Fabricación, visor 3D con verificación

**Rama:** `experiment/v014030-created-result-live-asset-gate-20261109`  
**Origen:** `release/v014029-historic-crafting-result-20261108` @ `7c96baf76bbbf1e643d57bb6bb7d3ad93689a848`  
**Producción:** `main` intacta. No fusionar sin verificación visual humana.

## Aplicado en esta versión

- Nueva versión visible `v0.14.030 / 20261109.030` en título, encabezado y marca técnica.
- Se conserva el arte histórico del Resultado V014.029, sus materiales, rareza y los canales creados efectivamente por el motor NGE.
- `genesis_result_live_v014030.js` se conecta a `renderGenesisHistoricCreationResult(item)` y a `performCraft()` después del consumo real de materiales y `craftedItems.push(item)`.
- El visor 3D opcional sólo admite una exportación de `espada_hierro` aprobada expresamente como **GLB de juego con material V12B**, más permiso de distribución confirmada y el SHA-256 propio de la exportación. No acepta archivos GLB arbitrarios, modelos externos ni el hash del archivo original como prueba de la exportación.
- Antes de mostrar un modelo en vivo, el navegador verifica encabezado GLB 2.0, longitud y hash SHA-256 de los **bytes realmente descargados**. Si algo falla, la imagen Cycles HDRI EXR32 V175/V12B permanece visible sin sustituir la espada.
- Los datos de canales obtenidos se serializan directamente desde `item.channels`, sin crear intensidades, colores/canales no conseguidos o simulaciones.
- Pruebas de regresión de resultado y de las tres pantallas aprobadas conservadas.

## Bloqueos reales de integración

**El GLB final de la espada V175/V12B no está en la rama/repo público.** En `ProjectGenesisAssets2/genesis-equipment-assets`, el preset aprobado `presets/approved/Genesis_Espada_V03_Hierro_V175_V12B.json` valida el aspecto del material/render, no la exportación GLB final para el juego. Su fuente base es un GLB de Fab/Joan Lahoz y `assets/external/fab-medieval-sword/SOURCE.md` advierte que la licencia de redistribución no está confirmada. No copiar ese archivo a un repositorio público o a un artifact de Actions sin confirmar los derechos.

**Faltan los VFX 3D finales (GLB) aprobados y anclados a la hoja.** Las capturas de VFX procedurales en Assets2 son experimentales y no demuestran exportación de los 3 efectos GLB ni su colocación sobre el asset integrado. Esta versión *no* finge que están activos.

**Mercenario ML06 / V050** continúa aislado en su rama original. Sus capturas/QA sirven de referencia, pero la pantalla 4-T aún debe comprobarse con modelo 3D cargado `hero.loaded=true`, inventario real, escalas y cambio de equipo antes de integración. No fusionar directamente.

## Pruebas y criterios de publicación

Ejecutar `.github/workflows/v014030-created-result-live-gate.yml`, verificar capturas y logs; revisar que no se inventen canales, que no se cambie PNG original y que el visor fall-back sea honesto. Cuando exista GLB autorizado, crear en rama de assets y registrar una entrada explícita `window.GenesisApprovedRuntimeModels.espada_hierro` con los campos:

```js
{
  recipe: 'espada_hierro',
  status: 'approved',
  sourceSha256: 'e2228f078b2572768416c48c0e63c2d908f214e2c0625a2ab754c877a099112b',
  materialPreset: 'Genesis_Espada_V03_Hierro_V175_V12B',
  exportSha256: '<sha256 REAL de 64 hex del GLB exportado, DISTINTO al hash de fuente>',
  gameExportApproved: true,
  distributionRightsConfirmed: true,
  url: './assets/playcanvas/approved/equipment/<nombre_exacto>.glb'
}
```

**Ejemplo de contrato, no entrada funcional:** esos campos sólo deben establecerse tras verificar licencia, geometría/material aprobado y bytes finales. Al conectarlo, comprobar `data-genesis-model-state=live-glb` en navegador real; comprobar que dos fabricaciones distintas conservan canales diferentes. Adjuntar screenshots y comparar contra V12B. Integrar efectos GLB y luego paso real a inventario y mercenario en cambios independientes. Publicar a main **únicamente** tras aceptación del usuario y prueba E2E del juego.
