# Project Genesis — copia ejecutable independiente

Esta rama experimental deriva de `snapshot/backup-main-20261109`. No modifica `main` ni el snapshot original.

## Ejecutar el juego de forma independiente

En un equipo con Python 3 instalado:

```bash
python -m http.server 8080
```

Abrir http://localhost:8080/index.html .

**Importante:** no abrir `index.html` con `file://`. Los módulos JavaScript, PlayCanvas y los recursos 3D necesitan un origen HTTP válido.

## Publicación independiente

GitHub Pages publica un sitio por repositorio. Para obtener una URL separada y estable sin tocar la publicación de `main`, publicar una copia de esta rama en un repositorio de prueba distinto, con Pages configurado para ese repositorio.

## Diagnóstico pendiente

La prueba de GitHub Actions del snapshot cargó la selección de Herrero, pero quedó en 10/17 assets. Detectó un 404 de `tannerChest09` y esperó `benchReal`. No se ha verificado que estos recursos sean la causa única del problema. No reemplazar assets ni omitir errores de carga sin pruebas.

## Ramas protegidas por el flujo de trabajo

- `main`: juego público funcional según prueba del usuario.
- `snapshot/original-main-20261109`: copia intacta.
- `snapshot/backup-main-20261109`: copia intacta.
- `experiment/backup-standalone-20261109`: diagnóstico y cambios de prueba.
