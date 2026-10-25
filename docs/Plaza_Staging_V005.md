# Project Genesis — Preparación de plaza WebGL V005

Estado: **RAMA DE PRUEBA / SIN INTEGRACIÓN AL JUEGO**  
Fecha: 2026-10-25  
Repositorio: `gburdesedev/Project-genesis`  
Rama: `integration/plaza-webgl-v005-candidate`  
Base jugable: `03ce43062f6ffa1979e9af302aeaede3428eb176` (FPS y tiempo medio por cuadro visibles).

## Alcance
- Plaza central medieval, mercado exterior y cinco fachadas de oficio.
- Camino de acceso a herrería, conexiones y transiciones de suelo.
- Colisiones transitables, controles de ratón/táctiles y FPS.
- Herrería interactiva; los demás talleres siguen decorativos/cerrados hasta tener implementación autorizada.

## Materiales disponibles sin integrar
- Adoquinado 4K V003, Arena 4K V003.
- Grava 4K V004, Tránsito intenso 4K V004.
- Másteres originales preservados en release privado:
  `genesis-playcanvas-pbr-road-masters-20261025`.
- Variantes candidatas 512, 1024 y 2048 en Actions run `40209311120`.
- No se eligió aún una resolución final; requiere inspección WebGL y perfiles de FPS.

## Restricciones
- `ciudad_63x63.html` es una maqueta independiente en Canvas 2D, no una escena PlayCanvas 3D integrada.
- La huella 63×63 no está aprobada como dimensión definitiva. Se debe evaluar una disposición más compacta manteniendo proporciones del personaje y edificios.
- No importar los mapas 4K originales directamente a todas las superficies del juego.
- No sobrescribir geometría, cámaras ni interacciones de la rama principal.
- No incorporar a escena candidatos que no cuenten con aprobación expresa de Gabriel.

## Puertas de calidad antes de integrar
1. Aprobación artística individual del material/asset.
2. Prueba de UV, tiling, normal OpenGL, ORM, mipmaps y compresión.
3. Pruebas de colisión de suelo, paredes, puertas, estaciones y caminos.
4. Ruta funcional entrada → plaza → mercado → herrería.
5. Tutorial completo y cámara (pointer lock, Escape y móvil) sin regresiones.
6. Medidas de FPS y memoria con dispositivo/resolución identificados.
7. Versión jugable identificable distinta a v0.11, con commit y evidencias.

Esta rama solo establece el punto de integración seguro. No altera `main` ni publica nuevas versiones jugables.
