# ProTime como PWA

La lógica de la aplicación y el almacenamiento local no cambian. El manifiesto permite instalarla y el service worker guarda los archivos de la interfaz para abrirla sin conexión después de una primera carga completa. Los mapas y las funciones que dependan de servicios externos siguen necesitando conexión.

## Probar en la computadora

Desde la carpeta del proyecto:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Abrir http://localhost:8000. En las herramientas de desarrollo del navegador, revisar Application > Manifest y Service Workers. Recargar una vez que el worker esté activo para comprobar la carga sin conexión.

## Instalar en móviles

Publicar los archivos de la aplicación en un alojamiento con HTTPS (también funciona bajo una subcarpeta). Una dirección HTTP con la IP de la computadora no habilita la PWA en el teléfono.

- Android: abrir la URL HTTPS en Chrome y elegir Instalar aplicación o Añadir a pantalla de inicio en el menú.
- iPhone/iPad: abrir la URL HTTPS en Safari, pulsar Compartir y Añadir a pantalla de inicio.

## Actualizaciones

Al modificar archivos de la aplicación, incrementar la versión de `CACHE_NAME` en `sw.js` (por ejemplo, de `v1` a `v2`). Si se agregan archivos necesarios para iniciar, agregarlos también a `APP_FILES`. La actualización se activa al cerrar las pestañas y ventanas existentes de la aplicación y volver a abrirla. Se conservan los datos de localStorage.

El caché incluye únicamente los archivos enumerados en `sw.js`. Los documentos y carpetas locales que ya existían en el directorio no forman parte de la PWA.
