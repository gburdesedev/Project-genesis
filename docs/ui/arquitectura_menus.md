# Arquitectura de menús — Project Genesis (PlayCanvas)

## Navegación propuesta (no implementada todavía)
- Pestañas existentes en composición: **Inventario / Preparación / Fabricaciones / Comparación**.
- Un solo marco de 1536 × 1024 escalado a pantalla. Cambiar de pestaña no recrea inventario ni mezcla estado con presentación.
- Preparación reutiliza **las 39 capas originales**. Las otras vistas reutilizarán el lenguaje visual, pero deben tener piezas propias cuando su diseño lo requiera.
- Mercado y encargos funcionan desde las interacciones del mundo, no como una quinta pestaña sin aprobación.

## Responsabilidades
| Módulo | Datos que lee | Datos que cambia |
|---|---|---|
| Inventario | materias primas, preparados, objetos, oro | selección/equipamiento permitido |
| Preparación | materias primas, recetas de proceso, perfiles térmicos | insumos consumidos y materiales preparados entregados al 100% |
| Fabricaciones | recetas, materiales preparados, atributos/estado del personaje | materiales consumidos, objeto único creado, avance tutorial |
| Comparación | identificadores y propiedades de objetos | selección para comparar |
| Mercado | precios, oro, existencias | oro y bienes al confirmar compra |
| Encargos | pedido, plazo/estado, inventario | reserva/entrega y recompensa bajo validación |

## Invariantes
- **Fuente única** para inventario, oro, recetas y estado tutorial.
- Las operaciones comprueban existencias y se aplican **una sola vez**; cerrar un menú no duplica materiales.
- Ninguna creación legítima se descarta porque su rareza sea **Inútil**.
- Las dos primeras creaciones pertenecen al jugador y se conservan; la progresión comercial empieza después, según la continuación narrativa.
- Los materiales iniciales cubren lo aprobado para las dos primeras fabricaciones, sin imponer rendimientos mineral/lingote arbitrarios.
- La v0.11 publicada no se sobrescribe sin una prueba completa y autorización de integración.
