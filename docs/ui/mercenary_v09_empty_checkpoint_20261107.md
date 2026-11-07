# Project Genesis — Mercenario V09 · plantilla vacía experimental

- **Arte canónico (no editar):** `assets/ui/mercenary/v09/Concept_V09_Original_INTACTO.png` (1671 × 941), copia exacta del candidato histórico identificado como Concept V09 (31-oct-2026).
- **Placa vacía existente:** `assets/ui/mercenary/v09/V09_Plantilla_Vacia_Referencia.png` (1670 × 942), variante del mismo lenguaje visual fechada 2-nov-2026. **No es idéntica píxel a píxel al concepto original**. No sustituye la aprobación del original.
- **Objetivo actual:** pantalla vacía, sin personajes ficticios, sin espadas inventadas, sin números ilustrativos, sin canales prefabricados. Mantener decoraciones. `preview_empty.html` muestra el estado vacío verificable.
- **Controles:** Espadas/Escudos, 20 huecos de inventario, 10 slots (casco, pechera, guantes, pantalón, botas, collar, espada, escudo, dos anillos), tres mercenarios, ficha, inventario, inspeccionar, equipar, cerrar.
- **Solo espada y escudo intercambiables**, los demás equipamientos bloqueados.
- **Modelo:** `model-viewer` del GLB real del juego mediante adaptador `opts.modelUrl` o actual ruta base. No se dibuja ni sustituye por imagen PNG. Si el GLB falla, el visor queda vacío, no se presenta un personaje ficticio.
- **Datos:** listas y canales se dibujan solamente si llegan de `opts.poolFirst`, `opts.poolSecond`, `opts.equippedFirst`, `opts.equippedSecond`, `opts.selectedFirst`, `opts.selectedSecond`; no se inventan números. Canales extraídos del arte original sin redibujar.
- **Estado:** fuente experimental, no aprobada visualmente por usuario, sin integración a `main`. Un test de Chromium aislado no equivale a partida end-to-end dentro de PlayCanvas ni confirma anclajes de la espada/escudo al rig.
- **Pendiente:** revisión visual captura real de GitHub Actions, conexión funcional definitiva a datos persistidos, animaciones y montaje GLB del mercenario en el juego y contraste final 1:1 contra maestro V09.
