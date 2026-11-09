# Project Genesis — Resultado dinámico V4.1 (EXPERIMENTAL)

Base: `main` commit `289ec75c9a2204527c13f6fab5f7fdab2a8fb3d7`, V014.028. 
**No modificar ni integrar a main sin inspección visual y aprobación del usuario.**

## Implementado
- `performCraft()` original persiste el objeto real y llama al adaptador **después** de `engine.fabricate` y `engine.present`, preservando navegación tutorial y botón `resultContinue`.
- `GenesisResultDynamic.normalize(item)` toma exclusivamente `item.channels`; transforma solo los alias mecánicos Daño/Protección en la representación UI Base, sin agregar canales no obtenidos.
- Primera espada (Nivel 1 Inútil): solo Base. Segunda: Base y 1–2 afinidades reales. No hay ocho filas fijas.
- Texto, rareza, valores de canal y subfilas activas provienen del registro; subfilas se muestran solo si la fabricación las trae explícitamente.
- Visor izquierdo preparado para el GLB **solo cuando** existe uno distribuible y aprobado dentro de `assets/playcanvas/approved/equipment/`.
- Poster de contingencia: `espada_v03_hierro_v175_v12b_cycles_hdri32.png` (render real Cycles/V175/V12B) sin sustituirlo por una espada genérica.
- El test usa **24 resultados reales** del motor NGE y 2 capturas Chromium aisladas en formato 16:9.

## Fuente de arte ORA recuperada
El paquete original `Genesis_Resultado_Simulacion_V4.zip` del sábado 7 de noviembre contiene ocho PNG extraídos de las ORA aprobadas.
Ruta prevista en esta rama (aún no disponible en este repositorio):
`assets/ui/resultado/oras/{01_Base,02_Luz,03_Sombra,04_Fuego,05_Hielo,06_Naturaleza,07_Tierra,08_Rayo}.png`.

Las ORA originales están conservadas en la biblioteca de Project Genesis. **En este commit los PNG no están incorporados al GitHub público.** Por eso, las capturas automáticas muestran filas de contingencia neutras y **la fidelidad visual V3.2 no está aprobada**.

## Bloqueo del GLB
El preset V12B y la referencia visual de Cycles son legítimos. El GLB original tiene licencia de tercero sin permiso de redistribución pública verificado; en el repo del juego está únicamente el PNG del render. No se declara un visor GLB de espada implementado ni se introduce otra espada.

## Verificación
- GitHub Actions: `42558924631` exitoso, pruebas de motor y navegador.
- Las capturas son de un harness aislado, **no prueban un recorrido completo de fabricación con WebGL en la aldea**.
- Pendientes: importar sin alterar los ocho PNG ORA, verificar la imagen sobre el juego real (no solo harness), resolver autorización/export de GLB, medir aspecto final y aprobación humana.
