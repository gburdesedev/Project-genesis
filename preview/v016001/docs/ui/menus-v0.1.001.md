# Project Genesis · Menús v0.1.001

Primera maqueta navegable para revisar la composición de Inventario, Fabricación y Comparación con el marco y las pestañas de Preparación. Datos de ejemplo; no cambia la partida ni el menú jugable.

## Composición

| Pantalla | Izquierda | Centro | Derecha |
| --- | --- | --- | --- |
| Inventario | Materiales, filtros y creaciones | Visor y descripción de la selección | Cantidad, estado y acceso al proceso correspondiente |
| Fabricación | Fórmulas conocidas | Objeto de la familia y material preparado | Fórmula, existencias, faltantes y acción |
| Comparación | Fabricación A | Diferencias y fórmula compartida | Fabricación B |

Preparación mantiene su composición aprobada y su minijuego. Su pestaña en la maqueta explica la referencia y enlaza al juego; no intenta recrearla.

## Interacciones incluidas

Pestañas, selección de mineral o lingote, filtros de materiales, selección de familia y enlaces entre pantallas. Las acciones que consumen recursos permanecen inactivas en esta vista de diseño.

## Reglas para la integración posterior

- Un artboard de 1536×1024 escalado uniformemente a la pantalla.
- Marcos y navegación estables. Conservar la preparación original.
- Inventario: fuente real `playerInventory` y `craftedItems`, sin inventar rarezas de materiales.
- Fabricación: fórmula real del motor; no anticipar rareza ni modificar sus reglas.
- Comparación: dos objetos reales, sus propiedades y afinidades; sin estadísticas ilustrativas que puedan confundirse con reglas.
- Mantener PNG en móvil y modelos bajo presupuesto en PC según la política vigente.
- Integrar primero Inventario, revisar su lectura con el usuario y continuar con Fabricación y Comparación.

Los visores de espada y escudo están señalados como pendientes. No se presentan assets provisionales como aprobados.
