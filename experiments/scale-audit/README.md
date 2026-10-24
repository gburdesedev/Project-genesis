# Auditoría de escala — Canvas 63 × 63 (experimental)

Rama aislada. No cambia `index.html`, los GLB aprobados, ni el mundo principal.

## Evidencia actual
- Talleres jugables de `index.html`: piso 10.55 × 9.95 unidades, paredes laterales en X = ±5.34, colisión cerca de 11 × 10 unidades, puerta física de colisión con `DOOR_WIDTH=2.18`.
- Referencia dimensional anterior (UE, usada solo para comparar): planta rectangular 8 × 6 m, paredes 3.2 m, cumbrera 4.8 m, abertura principal 1.4 × 2.3 m.
- Modelos de personajes: jugador a escala de instancia 1, Ordan 1.07, mentor Curtidor 1.04. Estas escalas no permiten conocer alturas de los GLB por sí solas.
- Mapa preliminar `ciudad_63x63.html`: huellas dispares 12×12, 13×12 y 13×10 casillas. El zoom inicial no encuadra la aldea completa en móvil.
- Huellas antiguas de cinco talleres: 718 casillas; nuevas huellas experimentales: 240 casillas (cinco veces 8×6), 66.6 % menos superficie dibujada.

## Prueba en esta rama
Abrir `ciudad_63x63_escala.html` en servidor web estático:
- 63×63 casillas con cinco talleres rectangulares idénticos, 8×6 casillas cada uno.
- Hipótesis de diseño explícita: una casilla representa un metro. Esto todavía no constituye una escala validada de mundo 3D.
- Botones ALDEA (encuadre completo) y SEGUIR (cámara centrada en jugador), y zoom manual.
- La escena es un mapa 2D independiente de evaluación de proporciones; no se debe confundir con integración jugable del mapa original.
- Se comprobó que el script tiene sintaxis JavaScript válida y que las cinco huellas comparten dimensiones.


## Integración 3D preliminar
`index_village_trial.html` conserva el prototipo original y agrega terreno 63×63, dos calles, plaza, zona de mercado y tres fachadas volumétricas provisionales de 8×6. Amplía el límite de desplazamiento del jugador hasta ±31.2 unidades, sin cambiar las colisiones internas ni el código del tutorial de los dos talleres funcionales. No representa todavía cinco edificios terminados ni una reducción de los interiores existentes. Esta copia aún requiere prueba visual, de carga, FPS, navegación y cámara en navegador; no se debe presentar como validada ni fusionar con `main`.

## Pendiente antes de introducir la ciudad en `index.html`
1. Medir bounds *renderizados* de GLB externos: personajes, herramientas, estaciones y puerta. No aplicar factor global a ciegas.
2. Definir metros/casilla y preservar altura del jugador, velocidad en m/s y distancias/interacciones en unidades físicas.
3. Rehacer la distribución interior en una rama de prueba y verificar puerta, Ordan, fuelle, yunque, fragua, baúl, colisiones, cámara y tutorial del Curtidor.
4. Probar navegabilidad 63×63, recorrido entre talleres, rendimiento y encuadre real en PC/móvil.
5. Integrar cuando pase los controles anteriores; `main` no cambia sin validación.
