# Preparación — Composición original de 39 capas

Este directorio contiene la composición gráfica aprobada del menú de **Preparación del Herrero** usada en Project Genesis v0.11 (PlayCanvas/WebGL).

## Estructura existente
```text
assets/ui/preparacion/
├── 01_Capas/
│   ├── Fondo/
│   ├── Pestanas/
│   ├── Paneles/
│   ├── Casillas/
│   ├── BotonPreparar/
│   └── Efectos/
├── composicion_39_capas.json
└── README.md
```

**39 PNG independientes**, no embebidos en HTML. **20 casillas** (10 básicos y 10 preparados), cuatro pestañas, visor, paneles y estados visuales de botones. Resolución de diseño: **1536 × 1024**. El manifiesto registra nombre, ruta, papel y rectángulo de cada capa, tal como los define `preparacion_control.js`.

Las imágenes se mantienen **en sus rutas originales** para no romper la versión publicada. Este archivo no supone que los otros menús ya estén implementados ni duplica imágenes.

## Separación acordada
- **Preparación**: materia prima → material preparado; controla lotes, temperatura, eficiencia y barra 0–100.
- **Inventario**: consulta de recursos básicos, preparados y objetos fabricados; las cantidades se obtienen del estado compartido, no se copian en cada menú.
- **Fabricaciones**: consulta de recetas, requisitos y creación de objetos auténticos y únicos, separada de la fundición.
- **Comparación**: diferencias entre dos creaciones, sin alterar ninguna.
- **Mercado/encargos**: transacciones en oro, reserva de inventario y entrega; un módulo separado del arte de preparación.

**Prohibido** asumir que 1 mineral = 1 lingote o fijar compras/precios de demo como canon. El rendimiento de Preparación se debe definir y validar antes de cambiar la economía.

## Próximo paso de implementación
Crear un contenedor de menú único con pestañas y control de navegación, reutilizar las imágenes existentes, mover gradualmente la lógica a módulos y validar cada etapa. Antes de mover archivos o reemplazar el `index.html`, probar visualmente en móvil y escritorio. Mantener `main` y su respaldo intactos.
