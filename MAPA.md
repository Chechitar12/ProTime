# Parcelas y mapa de incidencias

## Catálogo autorizado

El único catálogo está en `js/parcelas.js`:

| Parcela | Latitud | Longitud |
| --- | --- | --- |
| P61 | -8.520616 | -78.732651 |
| P62 | -8.550790804 | -78.65676825 |
| P64 · ubicación validada | -8.5456913 | -78.6505618 |
| P66 | -8.525856 | -78.736292 |
| P67 | -8.529746 | -78.724780 |
| P68 | -8.534171 | -78.729616 |
| P69 | -8.536455 | -78.734415 |
| P70 | -8.536848 | -78.718392 |
| P81 | -8.544882 | -78.648746 |
| P82 | -8.544967 | -78.649787 |
| P83 | -8.543854 | -78.650351 |
| P84 | -8.543507 | -78.651454 |
| P85 | -8.544138 | -78.647735 |
| P86 | -8.543204 | -78.646914 |

Se reconocen los códigos de la tabla y sus etiquetas correspondientes, como `P66` y `Parcela 66`. P64 utiliza exclusivamente la ubicación validada.

## Registro e integridad

- El formulario muestra la latitud y longitud de la parcela seleccionada y las actualiza al cambiar la selección.
- Se guarda una copia de las coordenadas en `ubicacion`, junto con `fuente`, `parcela` y `versionCatalogo`. `ubicacionEstado` indica `configurada` o `pendiente`.
- Una parcela desconocida se guarda con `ubicacion: null`, estado pendiente y un aviso visible; nunca usa las coordenadas de otra parcela.
- Solo los registros nuevos reciben coordenadas del catálogo. No hay migraciones, sustituciones ni llamadas GPS después de guardar. Cambiar el catálogo, abrir el mapa o editar un registro histórico no recalcula sus coordenadas. Los históricos sin coordenadas continúan pendientes.
- El mapa solo lee `ubicacion` del registro. Un registro histórico con GPS u otra coordenada válida se dibuja en esa posición original, incluso si difiere del catálogo nuevo.

El color del marcador corresponde a la duración que muestra en horas y minutos. Es verde por debajo de 50 h, amarillo desde 50 hasta menos de 100 h y rojo desde 100 h. El detalle muestra la duración y las horas-hombre afectadas por separado. La lista lateral permite elegir registros que comparten la misma posición.

## Mapa de calor

La capa de calor suma las horas de duración de incidencias próximas y usa los mismos rangos de color que los marcadores. Cada marcador se colorea según la duración de su propia incidencia.

El selector **Mapa de calor / Marcadores** permite cambiar de vista. Los puntos pequeños del calor y la lista lateral abren el detalle individual; la vista de marcadores conserva los puntos de colores anteriores. El dibujo acompaña el desplazamiento y zoom tanto en Google Maps como en OpenStreetMap, funciona con los registros locales sin conexión y se elimina al salir de la pantalla.

La capa se dibuja en canvas con `OverlayView` sobre Google Maps. No depende de la antigua `HeatmapLayer` de Google, retirada en mayo de 2026: [documentación de Google](https://developers.google.com/maps/deprecations#heatmap-layer-js-deprecation).

## Google Maps mediante variables de entorno

En `.env` (archivo local excluido de Git), completar:

```dotenv
GOOGLE_MAPS_API_KEY=tu_clave_de_google_maps
GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID
```

En GitHub, el dueño del repositorio debe crear el **repository secret** `GOOGLE_MAPS_API_KEY` en **Settings → Secrets and variables → Actions**. Opcionalmente, crear la **variable** `GOOGLE_MAPS_MAP_ID` con el ID de un mapa JavaScript propio; si no se define, se usa `DEMO_MAP_ID` para el piloto.

En Google Cloud se necesita habilitar **Maps JavaScript API** y la facturación para ese proyecto. Restringir la clave a Maps JavaScript API y a los sitios autorizados (restricciones de sitios web/HTTP referrers), por ejemplo `https://chechitar12.github.io/*` y, para desarrollo, `http://localhost:8000/*`. La clave de Maps JavaScript se usa en el navegador y es visible allí; las restricciones de dominio y API controlan su uso.

Después de cambiar `.env`, ejecutar `npm run build` y servir `dist/`. En GitHub, publicar los cambios y ejecutar el workflow **Publicar ProTime en GitHub Pages**. Guardar el secreto no dispara por sí solo un nuevo despliegue. El build incorpora la configuración y actualiza automáticamente la versión del caché de la PWA.

Con clave configurada se usa Google Maps y marcadores avanzados. Sin clave o si Google falla, se conserva el mapa de OpenStreetMap; sin internet, la cuadrícula permite seguir viendo los marcadores locales. Ningún proveedor cambia ni corrige las coordenadas guardadas. Los recursos de Google no se guardan en el caché offline de la PWA.

Documentación: [cargar Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [marcadores avanzados](https://developers.google.com/maps/documentation/javascript/advanced-markers/add-marker), [restricciones de claves](https://developers.google.com/maps/api-security-best-practices).
