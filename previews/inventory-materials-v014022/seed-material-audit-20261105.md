# Auditoría de semillas y materiales — Herrero V014.022 (6 nov 2026)

**Origen:** `index.html`, script `genesis-prototype-engines`, SHA del blob `e1e379046e6eab5929befe1fc83abad9dc6202a9`. El generador original `window.GenesisPrototypeEngines.generateSession('Herrero',{seed})` se ejecutó sin alterar su implementación. Se transformó el `Lingote de hierro` del stock inicial a `Mineral de hierro` usando la regla normal del baúl (`GenesisPreparation.rawStock`). Estos son **12 ensayos del generador**, no 12 partidas gráficas completas.

| Seed | Material secundario espada | Madera | Carbón vegetal | Mineral hierro |
|---|---|---|---:|---:|
| HER-10000001 | Cuero bovino curtido | Madera seca de roble | 2 | 6 |
| HER-10000002 | Cuero caprino curtido | Madera seca de roble | 2 | 6 |
| HER-10000003 | Cuero caprino curtido | Madera seca de roble | 2 | 6 |
| HER-10000004 | Hilo de lino | Madera seca de roble | 2 | 6 |
| HER-10000005 | Cuero bovino curtido | Madera seca de roble | 4 | 4 |
| HER-10000006 | Cuero caprino curtido | Madera seca de fresno | 2 | 6 |
| HER-10000007 | Cordel de cáñamo | Madera seca de fresno | 4 | 4 |
| HER-10000008 | Cuero caprino curtido | Madera seca de roble | 2 | 4 |
| HER-10000009 | Cordel de cáñamo | Madera seca de roble | 2 | 4 |
| HER-1000000A | Cuero bovino curtido | Madera seca de roble | 4 | 6 |
| HER-1000000B | Hilo de lino | Madera seca de fresno | 2 | 4 |
| HER-1000000C | Cuero caprino curtido | Madera seca de fresno | 2 | 4 |

## Contrato de inventario para cualquier semilla inicial del Herrero
1. Siempre habrá **mineral de hierro** (antes de refinar) y **carbón vegetal**.
2. La espada inicial selecciona **uno** de: cuero bovino curtido, cuero caprino curtido, cordel de cáñamo, hilo de lino.
3. La madera inicial selecciona **una** de: madera seca de roble o madera seca de fresno.
4. Por lo tanto, el total posible al abrir baúl es **8 nombres**: mineral, carbón, dos cueros, dos maderas, cordel y hilo. El lingote de hierro aparece luego de preparar mineral.
5. Tela de lino NO es material inicial de la receta de espada del Herrero; es parte de recetas del Curtidor.

## Cruce con UI real
Captura QA real de una partida (ejecución [42134277276](https://github.com/gburdesedev/Project-genesis/actions/runs/42134277276)): `Carbón vegetal ×4`, `Cuero caprino curtido ×4`, `Madera seca de roble ×2`, `Mineral de hierro ×4`. La pantalla abrió pero la captura PNG del inventario se detuvo por timeout del renderizador, así que no se ha obtenido todavía una captura completa por material.

## Estado de asociación de posters
`inventario_genesis_16x9.js` sólo tiene imágenes mapeadas para `Mineral de hierro` y `Lingote de hierro`. El carbón V011 tiene PNG aprobado existente en `assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_poster.png`; falta declararlo en el inventario. Los restantes seis materiales variables todavía necesitan rutas de posters aprobados y verificados (no sustituir por candidates).
