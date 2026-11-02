# Inventario del jugador — contrato de cabecera con Preparación V002 (2026-11-02)

**Decisión del autor:** adaptar la cabecera de Inventario a Preparación, sin modificar las 39 capas de Preparación ni los demás menús. El cuerpo del inventario limpio previamente aprobado se conserva sin reinterpretación.

## Fuente canónica de medidas y arte

Archivo de código: `preparacion_control.js`, `SKIN_LAYERS`.
Se usan sin modificar estos cuatro PNG:

| Pestaña | PNG fuente | x,y en artboard original | Dimensión original |
|---|---|---:|---:|
| Inventario | `assets/ui/preparacion/01_Capas/Pestanas/Pestana_Inventario.png` | 164,42 | 294x94 |
| Preparación | `assets/ui/preparacion/01_Capas/Pestanas/Pestana_Preparacion.png` | 458,42 | 320x94 |
| Fabricaciones | `assets/ui/preparacion/01_Capas/Pestanas/Pestana_Fabricaciones.png` | 778,42 | 328x94 |
| Comparación | `assets/ui/preparacion/01_Capas/Pestanas/Pestana_Comparacion.png` | 1106,42 | 298x94 |

Preparación mantiene un artboard de 1536x1024 dentro de un panorama de 1820.4444x1024 (16:9), con escalado uniforme.

## Adaptación exclusivamente en Inventario

`inventario_genesis_16x9.css` establece:
- Cuatro columnas de anchos relativos 294:320:328:298 en vez de cuatro columnas uniformes.
- Anchura agrupada del 68.115% del lienzo, compensando el panorama 1820.4444.
- Posición X inicial del 16.824%, equivalente al artboard de Preparación centrado en el panorama.
- Relación ancho/alto del conjunto 1240/94 para conservar geometría y no deformar ningún sprite.
- Imágenes PNG originales sin filtros que cambien el arte.

A una referencia de 1672x941, las pestañas pasan a medir aproximadamente: 270.0x86.3, 293.9x86.3, 301.3x86.3 y 273.7x86.3 píxeles. La franja superior se centra verticalmente en el renglón de cabecera del Inventario para **no tapar** los paneles existentes, que comienzan debajo.

## Límites

- No se modifica ningún archivo `assets/ui/preparacion/**`, ni `preparacion_control.js`.
- No se modifican los paneles, visor, datos LIVE, NGE, casillas, botones o lógica de inventario.
- El PNG maquetado de Inventario y su ORA se conservan como originales aprobados; no se sobrescriben.
- Esto es una **adaptación de montaje** propuesta en rama de prueba; queda pendiente la inspección visual en un navegador con los recursos efectivos y diferentes resoluciones.
- No copiar al arte las estadísticas, familias, escudo, textos de ejemplo ni el nombre del objeto; se cargan desde la partida.
